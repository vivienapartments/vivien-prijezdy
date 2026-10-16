import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Dnesek } from '@/app/prehled/Dnesek';
import { ukazkovaBrana, casVPraze } from './brana';
import { dnesVPraze } from './prehled';
import {
  hostZRezervace,
  klicUklidu,
  oznacUklid,
  sestavDnesek,
  textRano,
  textUklizeno,
  textZmenyPoradi,
  vratUklid,
  type HostDne,
} from './dnesek';
import { upozorniDnes } from './dnesek-upozorneni';
import { ukazkoveRadky } from './prehled-ukazka';
import { prazdnaRezervace, type ProcessStore, type RezervaceRecord } from './store';
import { upozorniOdjezdy } from './odjezd-upozorneni';
import { nactiOdjezdBeh, prazdnyOdjezdBeh } from './odjezd';

const DEN = '2026-10-16';

function host(cast: Partial<HostDne> & { rezervace: string }): HostDne {
  return {
    apartman: 'V1',
    jmeno: 'Jan Novák',
    prijezd: null,
    odjezd: null,
    casPrijezdu: null,
    casOdjezdu: null,
    stav: 'odeslano',
    zpusob: 'auto',
    brana: 'registrovat',
    faze: 'Čeká na příjezd',
    dluh: '',
    uklizenoKdy: null,
    uklizenoKdo: null,
    ...cast,
  };
}

function rec(cast: Partial<RezervaceRecord> & { rezervace: string }): RezervaceRecord {
  return {
    ...prazdnaRezervace(cast.rezervace, '2026-10-15T00:00:00.000Z'),
    apartman: 'V1',
    jmeno: 'Jan Novák',
    ...cast,
  };
}

function pamet(zaznamy: RezervaceRecord[]) {
  const map = new Map(zaznamy.map((r) => [r.rezervace, r]));
  let beh = prazdnyOdjezdBeh();
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

describe('dnešek', () => {
  it('seřadí úklid a označí první apartmán s dnešním příjezdem', () => {
    const pohled = sestavDnesek(
      [
        host({ rezervace: '1', apartman: 'V1', odjezd: DEN, jmeno: 'Karel' }),
        host({ rezervace: '2', apartman: 'V2', odjezd: DEN, jmeno: 'Tomáš' }),
        host({
          rezervace: '4',
          apartman: 'V4',
          odjezd: DEN,
          casOdjezdu: '09:30',
          jmeno: 'Klára',
          dluh: '200 Kč (poplatek z pobytu)',
        }),
        host({ rezervace: '5', apartman: 'V4', prijezd: DEN, casPrijezdu: '13:00', jmeno: 'Petr' }),
        host({ rezervace: '6', apartman: 'V2', prijezd: DEN, casPrijezdu: null, jmeno: 'Eva' }),
      ],
      DEN,
    );
    expect(pohled.uklid.map((r) => r.apartman)).toEqual(['V4', 'V2', 'V1']);
    expect(pohled.uklid.map((r) => r.prvni)).toEqual([true, false, false]);
    expect(pohled.uklid[0].uvolni).toBe('uvolní v 9:30');
    expect(pohled.uklid[0].dalsi).toBe('další host v 13:00');
    expect(pohled.uklid[1].dalsi).toBe('další host dnes, čas neznámý');
    expect(pohled.uklid[1].uvolni).toBe('odjezd do 10:00');
    expect(pohled.uklid[2].dalsi).toBe('dnes nikdo nepřijede');
    expect(textRano(pohled)).toBe(
      'Dnes: 3 odjezdy, 2 příjezdy, 1 nedoplatek. Uklidit první V4 (host v 13:00), pak V2.',
    );
  });

  it('neznámý čas prvního úklidu a prázdný den nemají druhou větu navíc', () => {
    const jenNeznamy = sestavDnesek(
      [
        host({ rezervace: '2', apartman: 'V2', odjezd: DEN }),
        host({ rezervace: '6', apartman: 'V2', prijezd: DEN, casPrijezdu: 'po20' }),
      ],
      DEN,
    );
    expect(jenNeznamy.uklid[0].prvni).toBe(true);
    expect(textRano(jenNeznamy)).toBe('Dnes: 1 odjezd, 1 příjezd. Uklidit první V2 (čas neznámý).');

    const nikdo = sestavDnesek([host({ rezervace: '9', apartman: 'V3', prijezd: '2026-10-20' })], DEN);
    expect(nikdo.uklid).toEqual([]);
    expect(nikdo.odjezdy).toEqual([]);
    expect(nikdo.prijezdy).toEqual([]);
  });

  it('ráno pošle jedno upozornění a nedoplatky jsou v něm', async () => {
    const odjezd = rec({
      rezervace: '4',
      apartman: 'V4',
      jmeno: 'Klára Benešová',
      odjezd: DEN,
      casOdjezdu: '09:30',
      poplatek: 'ano',
      noci: 2,
      osob: 2,
    });
    const druhy = rec({ rezervace: '2', apartman: 'V2', jmeno: 'Tomáš Beneš', odjezd: DEN });
    const treti = rec({ rezervace: '1', apartman: 'V1', jmeno: 'Karel Dvořák', odjezd: DEN });
    const prijezd = rec({
      rezervace: '5',
      apartman: 'V4',
      jmeno: 'Petr Svoboda',
      prijezd: DEN,
      casPrijezdu: '13:00',
    });
    const dalsi = rec({ rezervace: '6', apartman: 'V2', jmeno: 'Eva', prijezd: DEN });
    const { store } = pamet([odjezd, druhy, treti, prijezd, dalsi]);
    const volani: { text: string; url: string }[] = [];
    const posli = async (_s: ProcessStore, text: string, url: string) => {
      volani.push({ text, url });
      return 'push' as const;
    };

    await upozorniDnes(store, casVPraze(DEN, 7, 29), posli);
    await upozorniOdjezdy(store, casVPraze(DEN, 7, 29), posli);
    expect(volani).toEqual([]);

    await upozorniOdjezdy(store, casVPraze(DEN, 7, 30), posli);
    await upozorniDnes(store, casVPraze(DEN, 7, 30), posli);
    expect(volani).toEqual([
      {
        text: 'Dnes: 3 odjezdy, 2 příjezdy, 1 nedoplatek. Uklidit první V4 (host v 13:00), pak V2.',
        url: '/prehled?zalozka=dnes',
      },
    ]);

    await upozorniDnes(store, casVPraze(DEN, 8, 5), posli);
    await upozorniOdjezdy(store, casVPraze(DEN, 8, 5), posli);
    expect(volani).toHaveLength(1);
  });

  it('změnu pořadí pošle jednou a jen když první apartmán není uklizený', async () => {
    const v4 = rec({ rezervace: '4', apartman: 'V4', odjezd: DEN, casOdjezdu: '09:30', jmeno: 'Klára' });
    const v2 = rec({ rezervace: '2', apartman: 'V2', odjezd: DEN, jmeno: 'Tomáš' });
    const naV4 = rec({ rezervace: '5', apartman: 'V4', prijezd: DEN, casPrijezdu: '13:00', jmeno: 'Petr' });
    const naV2 = rec({ rezervace: '6', apartman: 'V2', prijezd: DEN, casPrijezdu: '16:00', jmeno: 'Eva' });
    const { store, beh } = pamet([v4, v2, naV4, naV2]);
    const texty: string[] = [];
    const posli = async (_s: ProcessStore, text: string) => {
      texty.push(text);
      return 'push' as const;
    };
    const rano = casVPraze(DEN, 7, 30);
    await upozorniDnes(store, rano, posli);
    expect(texty).toHaveLength(1);
    await upozorniDnes(store, rano, posli);
    expect(texty).toHaveLength(1);

    naV2.casPrijezdu = '12:30';
    await upozorniDnes(store, casVPraze(DEN, 11, 0), posli);
    expect(texty[1]).toBe('Pořadí úklidu se změnilo: V2 první (host v 12:30).');
    await upozorniDnes(store, casVPraze(DEN, 11, 2), posli);
    expect(texty).toHaveLength(2);

    v4.uklizenoKdy = '2026-10-16T08:00:00.000Z';
    v4.uklizenoKdo = 'pravoslav';
    naV4.casPrijezdu = '11:00';
    await upozorniDnes(store, casVPraze(DEN, 11, 10), posli);
    expect(texty).toHaveLength(2);
    expect(beh().uklid).toBe(klicUklidu(DEN, sestavDnesek([v4, v2, naV4, naV2].map(hostZRezervace), DEN)));
  });

  it('když se push nepodaří, zkusí to znovu', async () => {
    const { store } = pamet([
      rec({ rezervace: '4', apartman: 'V4', odjezd: DEN }),
      rec({ rezervace: '5', apartman: 'V4', prijezd: DEN, casPrijezdu: '13:00' }),
    ]);
    let pokus = 0;
    const texty: string[] = [];
    await upozorniDnes(store, casVPraze(DEN, 7, 30), async (_s, text) => {
      pokus += 1;
      if (pokus === 1) return 'nic';
      texty.push(text);
      return 'push';
    });
    expect(texty).toEqual([]);
    await upozorniDnes(store, casVPraze(DEN, 7, 32), async (_s, text) => {
      texty.push(text);
      return 'push';
    });
    expect(texty).toHaveLength(1);
    expect(texty[0].startsWith('Dnes: 1 odjezd, 1 příjezd.')).toBe(true);
  });

  it('úklid jde označit a vrátit', () => {
    const zaklad = rec({ rezervace: '4', apartman: 'V4' });
    const hotovo = oznacUklid(zaklad, 'nikol', new Date('2026-10-16T06:10:00.000Z'));
    expect(hotovo.uklizenoKdo).toBe('nikol');
    expect(hotovo.historie.at(-1)?.co).toBe('Úklid označila Nikol');
    expect(textUklizeno(hotovo.uklizenoKdy || '', 'nikol')).toBe('Uklizeno 8:10 · Nikol');
    const zpet = vratUklid(hotovo, new Date('2026-10-16T07:00:00.000Z'));
    expect(zpet.uklizenoKdy).toBeNull();
    expect(zpet.uklizenoKdo).toBeNull();
    expect(zpet.historie.at(-1)?.co).toBe('Úklid vrácen');
    expect(textZmenyPoradi(sestavDnesek([hostZRezervace(hotovo), host({ rezervace: '5', apartman: 'V4', prijezd: DEN, casPrijezdu: '13:00' })], DEN))).toBeNull();
  });

  it('stránka dneška neukáže PIN, telefon ani heslo', () => {
    const tajny = rec({
      rezervace: '8',
      apartman: 'V3',
      jmeno: 'Jan Novák',
      odjezd: DEN,
      accessPin: '1234',
      telefon: '+420777000999',
      emailHosta: 'tajne@example.com',
      telefonBrana: '+420777000998',
    });
    expect(JSON.stringify(hostZRezervace(tajny))).not.toContain('1234');
    expect(JSON.stringify(hostZRezervace(tajny))).not.toContain('777');
    expect(JSON.stringify(hostZRezervace(tajny))).not.toContain('@');

    const html = renderToStaticMarkup(
      createElement(Dnesek, { radky: ukazkoveRadky(), dnes: dnesVPraze(), ukazka: true, brana: ukazkovaBrana() }),
    );
    expect(html).toContain('Uklidit první');
    expect(html).toContain('Uklizeno 8:10 · Nikol');
    expect(html).toContain('Vrátit');
    expect(html).toContain('ph-dnesek__neznamy');
    expect(html.match(/Uklidit první/g)?.length).toBe(1);
    expect(html).not.toContain('0000');
    expect(html).not.toContain('1234');
    expect(html).not.toContain('777');
    expect(html).not.toContain('@');
    expect(html).not.toContain('PIN');
    expect(html).not.toContain('tel:');
    expect(html).not.toContain('heslo');
    expect(nactiOdjezdBeh({ vecer: DEN, uklid: 'spatne' }).uklid).toBeNull();
  });
});
