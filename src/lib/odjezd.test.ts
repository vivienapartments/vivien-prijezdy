import fs from 'fs';
import os from 'os';
import path from 'path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Guide } from '@/components/Guide';
import { kodyProHosta } from './kody-pruvodce';
import { casVPraze, denPraha } from './brana';
import type { GuideSecrets } from './secrets';
import { zapisMajitele } from './rucni-pole';
import { FileProcessStore, prazdnaRezervace, type ProcessStore, type RezervaceRecord } from './store';
import { createToken } from './token';
import { ulozVstupHosta } from './vstup-ulozit';
import { upozorniOdjezdy } from './odjezd-upozorneni';
import {
  castkaPozdejsihoOdjezdu,
  hosteNaDen,
  jeSlotOdjezdu,
  polozkyDluhu,
  polozkyZRezervace,
  seradOdjezdy,
  textPulHodiny,
  textSouhrnu,
  textVecer,
  ukazatRamecekOdjezdu,
  zpravaOdjezdu,
} from './odjezd';
import { zpravyMenu } from './whatsapp-zprava';

const SECRET = 'test-secret-at-least-32-bytes-long!!';
process.env.PRUVODCE_TOKEN_SECRET = SECRET;

const secrets: GuideSecrets = {
  WIFI_HESLO_V1: 'DOPLNIT',
  WIFI_HESLO_V2: 'DOPLNIT',
  WIFI_HESLO_V3: 'DOPLNIT',
  WIFI_HESLO_V4: 'DOPLNIT',
  WIFI_HESLO_V5: 'DOPLNIT',
  WIFI_HESLO_ZAHRADA: 'DOPLNIT',
  BRANA_TELEFON: '+420604692573',
};

function host(cast: Partial<RezervaceRecord> & { rezervace: string }): RezervaceRecord {
  return { ...prazdnaRezervace(cast.rezervace, '2026-10-15T00:00:00.000Z'), apartman: 'V1', jmeno: 'Jan Novák', ...cast };
}

function pamet(zaznamy: RezervaceRecord[]) {
  const map = new Map(zaznamy.map((r) => [r.rezervace, r]));
  let beh = { vecer: null as string | null, pripominka: null as string | null, rano: null as string | null };
  const store = {
    listRezervace: async () => [...map.entries()].map(([id, record]) => ({ id, record })),
    getRezervace: async (id: string) => map.get(id) ?? null,
    setRezervace: async (id: string, record: RezervaceRecord) => {
      map.set(id, record);
    },
    getOdjezdBeh: async () => beh,
    setOdjezdBeh: async (dalsi: typeof beh) => {
      beh = dalsi;
    },
  } as unknown as ProcessStore;
  return { store, beh: () => beh };
}

function rovne(text: string): string {
  return text.replaceAll('\u00A0', ' ');
}

describe('odjezd', () => {
  it('v 18:00 pošle dotaz jen jednou a jen když někdo zítra odjíždí', async () => {
    const now = casVPraze('2026-10-16', 18, 5);
    const prazdno = pamet([host({ rezervace: '1', odjezd: '2026-10-20' })]);
    const nic: string[] = [];
    await upozorniOdjezdy(prazdno.store, now, async (_s, text) => {
      nic.push(text);
      return 'push';
    });
    expect(nic).toEqual([]);

    const { store } = pamet([
      host({ rezervace: '1', apartman: 'V1', odjezd: '2026-10-17' }),
      host({ rezervace: '2', apartman: 'V3', jmeno: 'Eva Malá', odjezd: '2026-10-17' }),
      host({ rezervace: '3', apartman: 'V2', odjezd: '2026-10-17', stav: 'zruseno' }),
    ]);
    const texty: string[] = [];
    const posli = async (_s: ProcessStore, text: string) => {
      texty.push(text);
      return 'push' as const;
    };
    await upozorniOdjezdy(store, now, posli);
    await upozorniOdjezdy(store, now, posli);
    expect(texty).toEqual([textVecer(2)]);
    expect(texty[0]).toBe('Zítra odjíždí 2 hosté. Pošlete dotaz na odjezd.');
  });

  it('když push ani e-mail neberou, zkusí to příště', async () => {
    const now = casVPraze('2026-10-16', 18, 5);
    const { store } = pamet([host({ rezervace: '1', odjezd: '2026-10-17' })]);
    let pokus = 0;
    const posli = async () => {
      pokus += 1;
      return pokus === 1 ? ('nic' as const) : ('email' as const);
    };
    expect(await upozorniOdjezdy(store, now, posli)).toBe(0);
    expect(await upozorniOdjezdy(store, now, posli)).toBe(1);
  });

  it('řadí odjezdy od V1 po V5', () => {
    const serazene = seradOdjezdy([
      host({ rezervace: '3', apartman: 'V3' }),
      host({ rezervace: '5', apartman: 'V5' }),
      host({ rezervace: '0', apartman: null }),
      host({ rezervace: '1', apartman: 'V1' }),
      host({ rezervace: '2', apartman: 'V2' }),
    ]);
    expect(hosteNaDen(serazene, '2026-10-17').map((r) => r.apartman)).toEqual([]);
    const naDen = serazene.map((r) => ({ ...r, odjezd: '2026-10-17' }));
    expect(hosteNaDen(naDen, '2026-10-17').map((r) => r.apartman)).toEqual(['V1', 'V2', 'V3', 'V5', null]);
  });

  it('ruční čas odjezdu host v průvodci nepřepíše', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'odjezd-'));
    const store = new FileProcessStore(path.join(dir, 'store.json'));
    const id = '120260036';
    const zaklad = host({
      rezervace: id,
      apartman: 'V3',
      jmeno: 'Jan Novák',
      prijezd: '2026-10-16',
      odjezd: '2026-10-17',
      jazyk: 'cs',
      casOdjezdu: '10:00',
    });
    await store.setRezervace(id, zapisMajitele(zaklad, 'casOdjezdu', { casOdjezdu: '10:00' }, 'Čas odjezdu'));
    const token = createToken({ r: id, a: 'V3', p: '2026-10-16', d: '2026-10-17', l: 'cs' }, SECRET);
    const vysledek = await ulozVstupHosta(store, token, { akce: 'odjezd', cas: '09:30' });
    expect(vysledek.ok).toBe(true);
    const rec = await store.getRezervace(id);
    expect(rec?.casOdjezdu).toBe('10:00');
    expect(rec?.historie.some((h) => h.co.includes('ruční čas zůstal'))).toBe(true);
  });

  it('věta o nedoplatku je ve zprávě jen když dluh je', () => {
    const bez = rovne(zpravaOdjezdu('cs', [], 'https://example.com/pruvodce'));
    expect(bez).not.toContain('vyrovnáme');
    expect(bez).toContain('Standardní odjezd je do 10:00.');
    expect(bez).toContain('Čas můžete zadat i tady: https://example.com/pruvodce');
    expect(bez.endsWith('Nikol a rodina VIVIEN')).toBe(true);

    const jeden = rovne(zpravaOdjezdu('cs', [{ druh: 'poplatek', kc: 400 }], null));
    expect(jeden).toContain('vyrovnáme ještě 400 Kč (poplatek z pobytu).');
    expect(jeden).not.toContain('https://');

    const vic = rovne(
      zpravaOdjezdu(
        'cs',
        [
          { druh: 'poplatek', kc: 400 },
          { druh: 'prijezd', kc: 300 },
        ],
        null,
      ),
    );
    expect(vic).toContain('vyrovnáme ještě 700 Kč (poplatek z pobytu 400 Kč, pozdní příjezd 300 Kč).');

    const en = rovne(zpravaOdjezdu('en', [{ druh: 'poplatek', kc: 400 }], null));
    expect(en).toContain('When we take over the apartment, we will settle the remaining 400 CZK (city tax).');
    expect(en).toContain('Standard check-out is by 10:00.');
  });

  it('text souhrnu sečte druhy a samostatný push v 8:00 už neodejde', async () => {
    const now = casVPraze('2026-10-16', 8, 5);
    const dluh = host({
      rezervace: '2',
      apartman: 'V2',
      jmeno: 'Petr Kovář',
      odjezd: '2026-10-16',
      poplatek: 'ano',
      noci: 4,
      osob: 2,
      priplatekRucni: 200,
      vyjezdy: [{ id: 'a', kdy: '2026-10-16T06:00:00.000Z', castka: 100 }],
    });
    const polozky = polozkyDluhu(dluh);
    expect(polozky.map((p) => p.kc)).toEqual([400, 200, 100]);
    expect(rovne(textSouhrnu([{ rec: dluh, polozky }]))).toContain(
      'V2 Kovář 700 Kč (poplatek z pobytu 400 Kč, pozdní příjezd 200 Kč, opakovaná cesta 100 Kč)',
    );

    const { store } = pamet([dluh, host({ rezervace: '9', odjezd: '2026-10-16', poplatek: 'ne' })]);
    const texty: string[] = [];
    await upozorniOdjezdy(store, now, async (_s, text) => {
      texty.push(text);
      return 'push';
    });
    expect(texty).toEqual([]);

    const zaplaceno = { ...dluh, rezervace: '3', zaplaceno: '2026-10-16T07:00:00.000Z' };
    const po = pamet([zaplaceno]);
    const potom: string[] = [];
    await upozorniOdjezdy(po.store, now, async (_s, text) => {
      potom.push(text);
      return 'push';
    });
    expect(potom).toEqual([]);
    expect(polozkyDluhu(zaplaceno)).toEqual([]);
  });

  it('půl hodiny před odjezdem řekne i dluh a hostovi samo nic neodejde', async () => {
    const now = casVPraze('2026-10-16', 9, 5);
    const rec = host({
      rezervace: '4',
      apartman: 'V3',
      jmeno: 'Jan Novák',
      odjezd: '2026-10-16',
      casOdjezdu: '09:30',
      poplatek: 'ano',
      noci: 2,
      osob: 4,
    });
    expect(rovne(textPulHodiny(rec, polozkyDluhu(rec)))).toBe(
      'V3 Novák odjíždí v 9:30 (za půl hodiny), dluží 400 Kč (poplatek z pobytu)',
    );
    const { store } = pamet([rec]);
    const volani: { text: string; url: string }[] = [];
    await upozorniOdjezdy(store, now, async (_s, text, url) => {
      volani.push({ text, url });
      return 'push';
    });
    expect(volani.every((v) => v.url.startsWith('/prehled'))).toBe(true);
    expect(volani.some((v) => v.url === '/prehled#4' && v.text.includes('za půl hodiny'))).toBe(true);
    expect(volani.some((v) => v.text.includes('@'))).toBe(false);
    await upozorniOdjezdy(store, now, async () => {
      throw new Error('podruhé už ne');
    });
  });

  it('dotaz na odjezd není předvolený a po známém čase zmizí', () => {
    const menu = zpravyMenu({
      stav: 'odeslano',
      lang: 'cs',
      pruvodce: 'https://example.com/x',
      otevrenoPocet: 1,
      casPrijezdu: '16:00',
      prijezd: '2026-10-15',
      dnes: '2026-10-16',
      odjezd: '2026-10-17',
      casOdjezdu: null,
      dluh: [{ druh: 'poplatek', kc: 400 }],
    });
    const dotaz = menu.find((z) => z.id === 'odjezd');
    expect(dotaz?.vychozi).toBe(false);
    expect(dotaz?.nazev).toBe('Dotaz na odjezd');
    expect(rovne(dotaz?.text || '')).toContain('400 Kč');

    const seCasem = zpravyMenu({
      stav: 'odeslano',
      lang: 'cs',
      pruvodce: null,
      otevrenoPocet: 1,
      casPrijezdu: '16:00',
      prijezd: '2026-10-15',
      dnes: '2026-10-16',
      odjezd: '2026-10-17',
      casOdjezdu: '09:30',
    });
    expect(seCasem.some((z) => z.id === 'odjezd')).toBe(false);
  });

  it('ruční čas po 10:00 napočítá příplatek za pozdější odjezd', () => {
    expect(castkaPozdejsihoOdjezdu({ casOdjezdu: '10:00', zadostOdjezd: null })).toBeNull();
    expect(castkaPozdejsihoOdjezdu({ casOdjezdu: '10:30', zadostOdjezd: null })).toBe(75);
    expect(castkaPozdejsihoOdjezdu({ casOdjezdu: '11:00', zadostOdjezd: null })).toBe(150);
    const rec = host({ rezervace: '77', casOdjezdu: '10:30' });
    expect(polozkyZRezervace(rec).some((p) => p.druh === 'pozde' && p.kc === 75)).toBe(true);
  });

  it('rámeček je nad PINy den před odjezdem od poledne a po uložení se sbalí', () => {
    expect(ukazatRamecekOdjezdu('2026-10-17', casVPraze('2026-10-16', 11, 59))).toBe(false);
    expect(ukazatRamecekOdjezdu('2026-10-17', casVPraze('2026-10-16', 12, 0))).toBe(true);
    expect(ukazatRamecekOdjezdu('2026-10-17', casVPraze('2026-10-14', 15, 0))).toBe(false);
    expect(ukazatRamecekOdjezdu('2026-10-17', casVPraze('2026-10-14', 15, 0), true)).toBe(true);
    expect(jeSlotOdjezdu('10:00')).toBe(true);
    expect(jeSlotOdjezdu('10:30')).toBe(false);
    const dnes = denPraha(new Date());
    const html = renderToStaticMarkup(
      createElement(Guide, {
        apt: 'V1',
        lang: 'cs',
        secrets,
        stay: { noci: 2, osob: 2 },
        kody: kodyProHosta(true, 'V1', '1234', 'cs'),
        odjezd: { den: dnes, cas: null, rucni: false },
      }),
    );
    const ramecek = html.indexOf('V kolik dnes odjíždíte?');
    const piny = html.indexOf('id="vase-piny"');
    expect(ramecek).toBeGreaterThan(-1);
    expect(piny).toBeGreaterThan(ramecek);
    const slozeny = renderToStaticMarkup(
      createElement(Guide, {
        apt: 'V1',
        lang: 'cs',
        secrets,
        stay: { noci: 2, osob: 2 },
        kody: kodyProHosta(true, 'V1', '1234', 'cs'),
        odjezd: { den: dnes, cas: '09:30', rucni: false },
      }),
    );
    expect(slozeny).toContain('Odjezd 9:30');
    expect(slozeny).toContain('změnit');
  });
});
