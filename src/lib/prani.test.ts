import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { casVPraze, posunDen } from './brana';
import {
  adminOdpovedPrani,
  adminPrectenoPrani,
  adminVyrizenoPrani,
  hostNactiPrani,
  hostNapisPrani,
  hostSmazPrani,
  hostUpravPrani,
  muzeHostPsat,
  validujTextPrani,
} from './prani';
import { FileProcessStore, prazdnaRezervace, type RezervaceRecord } from './store';
import { createToken, verifyToken } from './token';

const SECRET = 'x'.repeat(32);
const dirs: string[] = [];

afterEach(() => {
  for (const d of dirs.splice(0)) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

function tmpStore(): FileProcessStore {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prani-'));
  dirs.push(dir);
  return new FileProcessStore(path.join(dir, 'store.json'));
}

function hostRec(patch: Partial<RezervaceRecord> = {}): RezervaceRecord {
  const predano = '2026-10-20T14:00:00.000Z';
  return {
    ...prazdnaRezervace('120260999', predano),
    apartman: 'V3',
    jmeno: 'Jan Novák',
    prijezd: '2026-10-20',
    odjezd: '2026-10-25',
    stav: 'odeslano',
    predano,
    ...patch,
  };
}

describe('validace a okno psaní', () => {
  it('text s HTML a řídicími znaky očiští, prázdný a příliš dlouhý odmítne', () => {
    expect(validujTextPrani('  Ahoj <b>světe</b>  ').ok).toBe(true);
    expect(validujTextPrani('').ok).toBe(false);
    expect(validujTextPrani('x'.repeat(1001)).ok).toBe(false);
  });

  it('zápis den před odjezdem v 18:59 projde, v 19:01 je odmítnut', () => {
    const rec = hostRec({ odjezd: '2026-10-25' });
    const denPred = posunDen('2026-10-25', -1);
    expect(muzeHostPsat(rec, casVPraze(denPred, 18, 59))).toBe(true);
    expect(muzeHostPsat(rec, casVPraze(denPred, 19, 1))).toBe(false);
    expect(muzeHostPsat({ ...rec, predano: null }, casVPraze(denPred, 12, 0))).toBe(false);
  });
});

describe('přání hosta a admin (FileProcessStore)', () => {
  it('1: host napíše → vlákno nove, historie, upozornění; listRezervace nevrací prani', async () => {
    const store = tmpStore();
    const rec = hostRec();
    await store.setRezervace(rec.rezervace, rec);
    const posli = vi.fn(async () => 'push' as const);
    const now = casVPraze('2026-10-21', 10, 0);
    const vysledek = await hostNapisPrani(
      store,
      rec,
      { id: 'msg-1', text: 'Mohli bychom dostat ještě dva ručníky?' },
      now,
      posli,
    );
    expect(vysledek.ok).toBe(true);
    if (!vysledek.ok) return;
    const { vlakna, zpravy } = await store.listPrani(rec.rezervace);
    expect(Object.values(vlakna)[0]?.stav).toBe('nove');
    expect(zpravy).toHaveLength(1);
    expect(posli).toHaveBeenCalledOnce();
    expect(String(posli.mock.calls[0][1])).toContain('přání:');
    expect(String(posli.mock.calls[0][2])).toContain('?prani=');
    const aktualni = await store.getRezervace(rec.rezervace);
    expect(aktualni?.historie.some((h) => h.co === 'Přání hosta')).toBe(true);
    const list = await store.listRezervace();
    expect(list.every((e) => e.id.startsWith('prani:') === false)).toBe(true);
    expect(list.some((e) => e.id === rec.rezervace)).toBe(true);
  });

  it('2: stejné id podruhé nic nepřidá', async () => {
    const store = tmpStore();
    const rec = hostRec();
    await store.setRezervace(rec.rezervace, rec);
    const now = casVPraze('2026-10-21', 10, 0);
    const posli = vi.fn(async () => 'nic' as const);
    await hostNapisPrani(store, rec, { id: 'msg-1', text: 'Ručníky' }, now, posli);
    const znovu = await hostNapisPrani(store, rec, { id: 'msg-1', text: 'Ručníky' }, now, posli);
    expect(znovu).toEqual({ ok: true, uz: true, vlakno: 'msg-1' });
    expect((await store.listPrani(rec.rezervace)).zpravy).toHaveLength(1);
  });

  it('4–5: přečtení a odpověď; host nevidí precteno', async () => {
    const store = tmpStore();
    const rec = hostRec();
    await store.setRezervace(rec.rezervace, rec);
    const now = casVPraze('2026-10-21', 10, 0);
    await hostNapisPrani(store, rec, { id: 'msg-1', text: 'Ručníky prosím' }, now, async () => 'nic');
    await adminPrectenoPrani(store, rec, { vlakno: 'msg-1', kdo: 'nikol' }, now);
    expect((await store.listPrani(rec.rezervace)).vlakna['msg-1']?.stav).toBe('precteno');
    await adminOdpovedPrani(
      store,
      rec,
      { vlakno: 'msg-1', id: 'odp-1', text: 'Ano, doneseme.', kdo: 'nikol' },
      now,
    );
    expect((await store.listPrani(rec.rezervace)).vlakna['msg-1']?.stav).toBe('precteno');
    const nacti = await hostNactiPrani(store, rec, now);
    expect(nacti.data.vlakna[0]?.stav).toBe('odeslano');
    expect(JSON.stringify(nacti.data)).not.toContain('precteno');
    expect(nacti.data.vlakna[0]?.zpravy.some((z) => z.jmeno === 'Nikol')).toBe(true);
  });

  it('6: host znovu napíše do přečteného → nove', async () => {
    const store = tmpStore();
    const rec = hostRec();
    await store.setRezervace(rec.rezervace, rec);
    const now = casVPraze('2026-10-21', 10, 0);
    await hostNapisPrani(store, rec, { id: 'msg-1', text: 'První' }, now, async () => 'nic');
    await adminPrectenoPrani(store, rec, { vlakno: 'msg-1', kdo: 'pravoslav' }, now);
    await hostNapisPrani(store, rec, { id: 'msg-2', vlakno: 'msg-1', text: 'Ještě jedno' }, now, async () => 'nic');
    expect((await store.listPrani(rec.rezervace)).vlakna['msg-1']?.stav).toBe('nove');
  });

  it('7–8: dvě vlákna; zpráva do vyřízeného znovu otevře', async () => {
    const store = tmpStore();
    const rec = hostRec();
    await store.setRezervace(rec.rezervace, rec);
    const now = casVPraze('2026-10-21', 10, 0);
    await hostNapisPrani(store, rec, { id: 'a1', text: 'Ručníky' }, now, async () => 'nic');
    await hostNapisPrani(store, rec, { id: 'b1', text: 'Klimatizace' }, now, async () => 'nic');
    await adminVyrizenoPrani(store, rec, { vlakno: 'a1', kdo: 'nikol' }, now);
    expect((await store.listPrani(rec.rezervace)).vlakna['b1']?.stav).toBe('nove');
    await hostNapisPrani(store, rec, { id: 'a2', vlakno: 'a1', text: 'Ještě ručník' }, now, async () => 'nic');
    expect((await store.listPrani(rec.rezervace)).vlakna['a1']?.stav).toBe('nove');
  });

  it('9: cizí vlákno → nenalezeno', async () => {
    const store = tmpStore();
    const rec = hostRec();
    await store.setRezervace(rec.rezervace, rec);
    const now = casVPraze('2026-10-21', 10, 0);
    const vysledek = await hostNapisPrani(
      store,
      rec,
      { id: 'x', vlakno: 'cizi', text: 'Ahoj' },
      now,
      async () => 'nic',
    );
    expect(vysledek).toEqual({ ok: false, duvod: 'nenalezeno' });
  });

  it('11: zrušená rezervace odmítne zápis', async () => {
    const store = tmpStore();
    const rec = hostRec({ stav: 'zruseno' });
    await store.setRezervace(rec.rezervace, rec);
    const vysledek = await hostNapisPrani(
      store,
      rec,
      { id: 'x', text: 'Ahoj' },
      casVPraze('2026-10-21', 10, 0),
      async () => 'nic',
    );
    expect(vysledek).toEqual({ ok: false, duvod: 'zruseno' });
  });

  it('12: 7. zpráva za 10 min → limit', async () => {
    const store = tmpStore();
    const rec = hostRec();
    await store.setRezervace(rec.rezervace, rec);
    const now = casVPraze('2026-10-21', 10, 0);
    for (let i = 0; i < 6; i += 1) {
      await hostNapisPrani(store, rec, { id: `m${i}`, text: `Zpráva ${i}` }, now, async () => 'nic');
    }
    const sedma = await hostNapisPrani(store, rec, { id: 'm6', text: 'Sedmá' }, now, async () => 'nic');
    expect(sedma).toEqual({ ok: false, duvod: 'limit' });
  });

  it('13: HTML v textu se odstraní', async () => {
    const store = tmpStore();
    const rec = hostRec();
    await store.setRezervace(rec.rezervace, rec);
    await hostNapisPrani(
      store,
      rec,
      { id: 'h1', text: 'Prosím <script>x</script> ručníky' },
      casVPraze('2026-10-21', 10, 0),
      async () => 'nic',
    );
    const text = (await store.listPrani(rec.rezervace)).zpravy[0]?.text || '';
    expect(text).toContain('ručníky');
    expect(text).not.toContain('<script>');
  });

  it('14: host a admin současně → obě zprávy', async () => {
    const store = tmpStore();
    const rec = hostRec();
    await store.setRezervace(rec.rezervace, rec);
    const now = casVPraze('2026-10-21', 10, 0);
    await hostNapisPrani(store, rec, { id: 'h1', text: 'Host' }, now, async () => 'nic');
    await Promise.all([
      hostNapisPrani(store, rec, { id: 'h2', vlakno: 'h1', text: 'Host 2' }, now, async () => 'nic'),
      adminOdpovedPrani(store, rec, { vlakno: 'h1', id: 'a1', text: 'Admin', kdo: 'pravoslav' }, now),
    ]);
    expect((await store.listPrani(rec.rezervace)).zpravy).toHaveLength(3);
  });

  it('15: přepsání karty nepřepíše přání', async () => {
    const store = tmpStore();
    const rec = hostRec();
    await store.setRezervace(rec.rezervace, rec);
    const now = casVPraze('2026-10-21', 10, 0);
    await hostNapisPrani(store, rec, { id: 'h1', text: 'Zůstane' }, now, async () => 'nic');
    await store.setRezervace(rec.rezervace, { ...rec, jmeno: 'Jiný Host' });
    expect((await store.listPrani(rec.rezervace)).zpravy[0]?.text).toBe('Zůstane');
  });

  it('úprava před přečtením projde, po přečtení / odpovědi zamčeno; smazání zruší vlákno', async () => {
    const store = tmpStore();
    const rec = hostRec();
    await store.setRezervace(rec.rezervace, rec);
    const now = casVPraze('2026-10-21', 10, 0);
    await hostNapisPrani(store, rec, { id: 'h1', text: 'Původní' }, now, async () => 'nic');
    expect(await hostUpravPrani(store, rec, { id: 'h1', text: 'Upravené' }, now)).toEqual({ ok: true });
    expect((await store.listPrani(rec.rezervace)).zpravy[0]?.text).toBe('Upravené');
    expect((await store.listPrani(rec.rezervace)).zpravy[0]?.upraveno).toBeTruthy();

    await adminPrectenoPrani(store, rec, { vlakno: 'h1', kdo: 'nikol' }, now);
    expect(await hostUpravPrani(store, rec, { id: 'h1', text: 'Znovu' }, now)).toEqual({
      ok: false,
      duvod: 'zamceno',
    });

    const store2 = tmpStore();
    const rec2 = hostRec({ rezervace: '120260998' });
    await store2.setRezervace(rec2.rezervace, rec2);
    await hostNapisPrani(store2, rec2, { id: 's1', text: 'Smazat' }, now, async () => 'nic');
    await adminOdpovedPrani(
      store2,
      rec2,
      { vlakno: 's1', id: 'o1', text: 'Ok', kdo: 'nikol' },
      now,
    );
    expect(await hostSmazPrani(store2, rec2, { id: 's1' }, now)).toEqual({ ok: false, duvod: 'zamceno' });

    const store3 = tmpStore();
    const rec3 = hostRec({ rezervace: '120260997' });
    await store3.setRezervace(rec3.rezervace, rec3);
    await hostNapisPrani(store3, rec3, { id: 'd1', text: 'Zrušit' }, now, async () => 'nic');
    expect(await hostSmazPrani(store3, rec3, { id: 'd1' }, now)).toEqual({
      ok: true,
      zrusenoVlakno: true,
    });
    const po = await store3.listPrani(rec3.rezervace);
    expect(po.vlakna['d1']).toBeUndefined();
    expect((await store3.listOtevrenaPrani()).some((p) => p.rezervace === rec3.rezervace)).toBe(false);
    const nacti = await hostNactiPrani(store3, rec3, now);
    expect(nacti.data.vlakna).toHaveLength(0);
  });

  it('token: ověření bere rezervaci z tokenu', () => {
    process.env.PRUVODCE_TOKEN_SECRET = SECRET;
    const token = createToken({ r: '120260999', a: 'V3', d: '2099-12-31', l: 'cs', i: '1111' }, SECRET);
    const v = verifyToken(token, SECRET);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.payload.r).toBe('120260999');
  });
});
