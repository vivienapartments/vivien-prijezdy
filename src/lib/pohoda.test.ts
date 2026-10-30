import { describe, expect, it } from 'vitest';
import { casVPraze } from './brana';
import { prazdnaRezervace, type ProcessStore, type RezervaceRecord } from './store';
import { prazdnyOdjezdBeh } from './odjezd';
import { upozorniOdjezdy } from './odjezd-upozorneni';
import {
  hosteProPohodu,
  textPohody,
  textPushPohody,
  ukazatPohodu,
  ZPRAVA_POHODA,
} from './pohoda';
import { zpravyMenu } from './whatsapp-zprava';
import { GUIDE_LANGS } from './types';

function host(partial: Partial<RezervaceRecord>): RezervaceRecord {
  const zaklad = prazdnaRezervace(partial.rezervace || '1', '2026-10-16T08:00:00.000Z');
  return { ...zaklad, ...partial };
}

function pamet(list: RezervaceRecord[]) {
  const map = new Map(list.map((r) => [r.rezervace, r]));
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

describe('pohoda', () => {
  it('má text ve všech jazycích a bez telefonu', () => {
    for (const lang of GUIDE_LANGS) {
      expect(ZPRAVA_POHODA[lang]).not.toContain('+420');
      expect(ZPRAVA_POHODA[lang]).toContain('Nikol');
      expect(textPohody(lang)).toBe(ZPRAVA_POHODA[lang]);
    }
    expect(textPohody(null)).toBe(ZPRAVA_POHODA.en);
    expect(ZPRAVA_POHODA.cs).toContain('zda je u vás všechno v pořádku');
    expect(ZPRAVA_POHODA.cs).toContain('neváhejte nám napsat');
    expect(ZPRAVA_POHODA.cs).not.toMatch(/\bVás\b|\bVám\b/);
  });

  it('do seznamu patří jen včerejší předaní, kteří dnes neodjíždějí', () => {
    const dnes = '2026-10-16';
    const list = [
      host({ rezervace: 'ok', apartman: 'V2', prijezd: '2026-10-15', odjezd: '2026-10-18', predano: 'ano' }),
      host({ rezervace: 'dnes-odjezd', apartman: 'V1', prijezd: '2026-10-15', odjezd: dnes, predano: 'ano' }),
      host({ rezervace: 'bez-predani', apartman: 'V3', prijezd: '2026-10-15', odjezd: '2026-10-18', predano: null }),
      host({ rezervace: 'dnes-prijezd', apartman: 'V4', prijezd: dnes, odjezd: '2026-10-18', predano: 'ano' }),
      host({ rezervace: 'zruseno', apartman: 'V5', prijezd: '2026-10-15', odjezd: '2026-10-18', predano: 'ano', stav: 'zruseno' }),
    ];
    expect(hosteProPohodu(list, dnes).map((r) => r.rezervace)).toEqual(['ok']);
  });

  it('v 11:00 pošle push jen jednou a jen když je komu psát', async () => {
    const now = casVPraze('2026-10-16', 11, 5);
    const prazdno = pamet([host({ rezervace: '1', prijezd: '2026-10-14', predano: 'ano', odjezd: '2026-10-20' })]);
    const nic: string[] = [];
    await upozorniOdjezdy(prazdno.store, now, async (_s, text) => {
      nic.push(text);
      return 'push';
    });
    expect(nic).toEqual([]);
    expect(prazdno.beh().pohoda).toBe('2026-10-16');

    const { store, beh } = pamet([
      host({ rezervace: '1', apartman: 'V1', jmeno: 'Jan Novák', prijezd: '2026-10-15', odjezd: '2026-10-18', predano: 'ano' }),
      host({ rezervace: '2', apartman: 'V3', jmeno: 'Eva Malá', prijezd: '2026-10-15', odjezd: '2026-10-19', predano: 'ano' }),
      host({ rezervace: '3', apartman: 'V2', prijezd: '2026-10-15', odjezd: '2026-10-16', predano: 'ano' }),
    ]);
    const texty: string[] = [];
    const posli = async (_s: ProcessStore, text: string) => {
      texty.push(text);
      return 'push' as const;
    };
    await upozorniOdjezdy(store, now, posli);
    await upozorniOdjezdy(store, now, posli);
    expect(texty).toEqual([textPushPohody(2)]);
    expect(texty[0]).toBe('Pošlete 2 hostům dotaz, jestli je vše v pořádku.');
    expect(beh().pohoda).toBe('2026-10-16');
  });

  it('před 11:00 nic neposílá', async () => {
    const now = casVPraze('2026-10-16', 10, 50);
    const { store, beh } = pamet([
      host({ rezervace: '1', prijezd: '2026-10-15', odjezd: '2026-10-18', predano: 'ano' }),
    ]);
    const texty: string[] = [];
    await upozorniOdjezdy(store, now, async (_s, text) => {
      texty.push(text);
      return 'push';
    });
    expect(texty).toEqual([]);
    expect(beh().pohoda).toBeNull();
  });

  it('v menu je po předání a ne u zrušených', () => {
    expect(
      ukazatPohodu({
        stav: 'odeslano',
        predano: '2026-10-15T14:00:00Z',
        prijezd: '2026-10-15',
        odjezd: '2026-10-18',
        dnes: '2026-10-16',
      }),
    ).toBe(true);
    expect(
      ukazatPohodu({
        stav: 'zruseno',
        predano: '2026-10-15T14:00:00Z',
        prijezd: '2026-10-15',
        odjezd: '2026-10-18',
        dnes: '2026-10-16',
      }),
    ).toBe(false);

    const menu = zpravyMenu({
      stav: 'odeslano',
      lang: 'cs',
      pruvodce: null,
      otevrenoPocet: 1,
      casPrijezdu: '15:00',
      prijezd: '2026-10-15',
      dnes: '2026-10-16',
      predano: '2026-10-15T14:00:00Z',
      odjezd: '2026-10-18',
    });
    const polozka = menu.find((z) => z.id === 'pohoda');
    expect(polozka?.nazev).toBe('Je vše v pořádku?');
    expect(polozka?.text).toBe(ZPRAVA_POHODA.cs);
    expect(polozka?.vychozi).toBe(true);
  });

  it('den před odjezdem předvybere Dotaz na odjezd', () => {
    const menu = zpravyMenu({
      stav: 'odeslano',
      lang: 'cs',
      pruvodce: null,
      otevrenoPocet: 1,
      casPrijezdu: '15:00',
      prijezd: '2026-10-14',
      dnes: '2026-10-16',
      predano: '2026-10-14T14:00:00Z',
      odjezd: '2026-10-17',
      casOdjezdu: null,
    });
    expect(menu.find((z) => z.id === 'odjezd')?.vychozi).toBe(true);
    expect(menu.find((z) => z.id === 'pohoda')?.vychozi).toBe(false);
  });
});
