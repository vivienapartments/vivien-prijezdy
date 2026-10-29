import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { gardenCodeForApt } from './access-codes';
import { createToken, verifyToken } from './token';
import { FileProcessStore, prazdnaRezervace } from './store';
import { najdiPrekryv, noveCisloRucni, vytvorRucniRezervaci } from './rezervace-rucne';

function tmpStore(): FileProcessStore {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vivien-rucne-'));
  return new FileProcessStore(path.join(dir, 'store.json'));
}

describe('ruční rezervace', () => {
  it('vygeneruje číslo, uloží PIN do tokenu a zahradu V2/V3 = PIN', async () => {
    const store = tmpStore();
    const vysledek = await vytvorRucniRezervaci(store, {
      jmeno: 'Petr Svoboda',
      telefon: '+420604692573',
      email: 'petr@example.com',
      apartman: 'V2',
      prijezd: '2026-11-01',
      odjezd: '2026-11-03',
      osob: 2,
      pin: '4321',
      jazyk: 'cs',
    });
    expect(vysledek.ok).toBe(true);
    if (!vysledek.ok) return;
    expect(vysledek.rezervace).toMatch(/^9\d{10,}$/);
    const rec = await store.getRezervace(vysledek.rezervace);
    expect(rec?.accessPin).toBe('4321');
    expect(rec?.stitek).toBe('rucne');
    expect(rec?.zdroj).toBe('přímá');
    expect(rec?.stav).toBe('bez_checkinu');
    expect(gardenCodeForApt('V2', rec?.accessPin)).toBe('4321');
    expect(gardenCodeForApt('V3', '9999')).toBe('9999');

    process.env.PRUVODCE_TOKEN_SECRET = 'x'.repeat(32);
    const token = createToken({
      r: vysledek.rezervace,
      a: 'V2',
      d: '2026-11-03',
      l: 'cs',
      i: rec!.accessPin!,
    });
    const over = verifyToken(token, process.env.PRUVODCE_TOKEN_SECRET, new Date('2026-11-01T12:00:00Z'));
    expect(over.ok && over.payload.i).toBe('4321');
  });

  it('při překryvu varuje a bez potvrzení neuloží', async () => {
    const store = tmpStore();
    await store.setRezervace(
      '1001',
      {
        ...prazdnaRezervace('1001', '2026-01-01T00:00:00.000Z'),
        jmeno: 'Jan Novák',
        apartman: 'V3',
        prijezd: '2026-11-01',
        odjezd: '2026-11-05',
        stav: 'odeslano',
      },
    );
    const prekryv = najdiPrekryv(await store.listRezervace(), 'V3', '2026-11-02', '2026-11-04');
    expect(prekryv?.jmeno).toContain('Novák');

    const prvni = await vytvorRucniRezervaci(store, {
      jmeno: 'Eva',
      apartman: 'V3',
      prijezd: '2026-11-02',
      odjezd: '2026-11-04',
      osob: 1,
      pin: '1111',
    });
    expect(prvni.ok).toBe(false);
    if (prvni.ok) return;
    expect(prvni.error).toContain('V3 je v tomto termínu obsazený');
    expect(prvni.prekryv?.apartman).toBe('V3');

    const druha = await vytvorRucniRezervaci(
      store,
      {
        jmeno: 'Eva',
        apartman: 'V3',
        prijezd: '2026-11-02',
        odjezd: '2026-11-04',
        osob: 1,
        pin: '1111',
      },
      { potvrdPrekryv: true },
    );
    expect(druha.ok).toBe(true);
  });

  it('nic neodejde samo – stav bez_checkinu', async () => {
    const store = tmpStore();
    const v = await vytvorRucniRezervaci(store, {
      apartman: 'V1',
      prijezd: '2026-12-01',
      odjezd: '2026-12-02',
      osob: 1,
      pin: '2222',
    });
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    const rec = await store.getRezervace(v.rezervace);
    expect(rec?.stav).toBe('bez_checkinu');
    expect(rec?.historie.some((h) => /odeslán/i.test(h.co))).toBe(false);
  });

  it('pořadí čísel roste', async () => {
    const store = tmpStore();
    const a = await noveCisloRucni(store, new Date('2026-10-29T12:00:00Z'));
    await store.setRezervace(a, prazdnaRezervace(a, '2026-10-29T12:00:00.000Z'));
    const b = await noveCisloRucni(store, new Date('2026-10-29T12:00:00Z'));
    expect(Number(b)).toBeGreaterThan(Number(a));
  });
});
