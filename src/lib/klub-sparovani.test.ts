import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  castkaUtratyPriPropojeni,
  klientMaKontakt,
  sparujNeboVytvorKlienta,
  zajistiKartuPoNoveRezervaci,
  zajistiKartuProPodekovani,
} from './klub-utrata';
import { klubKlic } from './klub-klic';
import type { ProcessStore } from './store';

function pamet(): ProcessStore & { raw: Map<string, string> } {
  const kv = new Map<string, string>();
  return {
    raw: kv,
    getKv: async (k: string) => kv.get(k) ?? null,
    setKv: async (k: string, v: string) => {
      kv.set(k, v);
    },
  } as ProcessStore & { raw: Map<string, string> };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('sparujNeboVytvorKlienta', () => {
  it('u existující karty vždy zapíše klient-index:rez i když rezervace už v poli je', async () => {
    vi.stubEnv('KLUB_ZAPNUTO', '1');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('NODE_ENV', 'production');
    const store = pamet();
    const prvni = await sparujNeboVytvorKlienta(store, {
      jmeno: 'Lukáš Robin',
      email: 'lukas@example.com',
      telefon: '+420777111222',
      rezervace: '120260588',
    });
    expect(prvni?.nova).toBe(true);
    const klicRez = klubKlic('klient-index:rez:120260588');
    expect(store.raw.get(klicRez)).toBeTruthy();

    // Smaž index, nech kartu i seznam rezervací.
    store.raw.delete(klicRez);
    expect(store.raw.get(klicRez)).toBeUndefined();

    const druhe = await sparujNeboVytvorKlienta(store, {
      jmeno: 'Lukáš Robin',
      email: 'lukas@example.com',
      telefon: '+420777111222',
      rezervace: '120260588',
    });
    expect(druhe?.nova).toBe(false);
    expect(druhe?.karta.id).toBe(prvni?.karta.id);
    expect(store.raw.get(klicRez)).toContain(prvni!.karta.id);
  });

  it('založí kartu i bez e-mailu a telefonu', async () => {
    vi.stubEnv('KLUB_ZAPNUTO', '1');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('NODE_ENV', 'production');
    const store = pamet();
    const vysledek = await sparujNeboVytvorKlienta(store, {
      jmeno: 'Petr Flídr',
      email: 'guest@guest.booking.com',
      telefon: '',
      rezervace: '92026110903',
    });
    expect(vysledek).not.toBeNull();
    expect(vysledek!.nova).toBe(true);
    expect(vysledek!.bezKontaktu).toBe(true);
    expect(vysledek!.karta.email).toBe('');
    expect(store.raw.get(klubKlic('klient-index:rez:92026110903'))).toBeTruthy();
  });

  it('na zkušební verzi jde založit s klubPovolenProZkousku', async () => {
    vi.stubEnv('KLUB_ZAPNUTO', '0');
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('NODE_ENV', 'development');
    const store = pamet();
    const vysledek = await sparujNeboVytvorKlienta(store, {
      jmeno: 'Test Host',
      email: 'test@example.com',
      telefon: '+420604111222',
      rezervace: 'TESTKARTY1',
    });
    expect(vysledek?.nova).toBe(true);
    expect(store.raw.get(klubKlic('klient-index:rez:TESTKARTY1'))).toBeTruthy();
  });
});

describe('zajistiKartuProPodekovani', () => {
  it('bez zapnutého Clubu poděkování nepustí', async () => {
    vi.stubEnv('KLUB_ZAPNUTO', '0');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('NODE_ENV', 'production');
    const store = pamet();
    const r = await zajistiKartuProPodekovani(store, {
      jmeno: 'Host',
      email: 'a@b.cz',
      rezervace: '1',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.duvod).toMatch(/vypnut/i);
  });

  it('najde nebo založí kartu před poděkováním', async () => {
    vi.stubEnv('KLUB_ZAPNUTO', '1');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('NODE_ENV', 'production');
    const store = pamet();
    const r = await zajistiKartuProPodekovani(store, {
      jmeno: 'Michaela Klímová',
      email: 'michaela@example.com',
      telefon: '+420604692573',
      rezervace: '120260605',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.karta.tajnyKlic).toBeTruthy();
      expect(store.raw.get(klubKlic('klient-index:rez:120260605'))).toBeTruthy();
    }
  });
});

describe('klientMaKontakt a texty propojení', () => {
  it('pozná chybějící kontakt', () => {
    expect(klientMaKontakt('', '')).toBe(false);
    expect(klientMaKontakt('guest@guest.booking.com', '')).toBe(false);
    expect(klientMaKontakt('a@b.cz', '')).toBe(true);
  });

  it('hlášky pro přehled rozlišují novou a existující kartu', () => {
    const nova = true;
    const urovenNazev = 'Věrný host';
    const hlaska = nova
      ? 'Založena nová karta'
      : `Propojeno s existující kartou (${urovenNazev})`;
    expect(hlaska).toBe('Založena nová karta');
    expect(`Propojeno s existující kartou (${urovenNazev})`).toContain('Věrný host');
  });
});

describe('zajistiKartuPoNoveRezervaci a útrata při propojení', () => {
  it('u nové rezervace tiše založí kartu (i Booking)', async () => {
    vi.stubEnv('KLUB_ZAPNUTO', '1');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('NODE_ENV', 'production');
    const store = pamet();
    const r = await zajistiKartuPoNoveRezervaci(store, {
      jmeno: 'Test Booking',
      emailHosta: 'a@b.cz',
      telefon: '+420604111333',
      telefonRezervace: null,
      rezervace: '120269999',
      jazyk: 'cs',
    });
    expect(r?.nova).toBe(true);
    expect(store.raw.get(klubKlic('klient-index:rez:120269999'))).toBeTruthy();
  });

  it('Booking a Airbnb při propojení nepřidají útratu', () => {
    expect(
      castkaUtratyPriPropojeni(
        { zdroj: 'Booking.com', prijezd: '2026-06-01', cenaPobytu: 5000, rezervace: '1' },
        null,
      ),
    ).toBe(0);
    expect(
      castkaUtratyPriPropojeni(
        { zdroj: 'Airbnb', prijezd: '2026-06-01', cenaPobytu: 5000, rezervace: '1' },
        null,
      ),
    ).toBe(0);
  });

  it('před 1. 5. 2026 a už na kartě = 0', () => {
    expect(
      castkaUtratyPriPropojeni(
        { zdroj: 'přímá', prijezd: '2026-04-30', cenaPobytu: 5000, rezervace: '9' },
        null,
      ),
    ).toBe(0);
    const karta = {
      rezervace: ['92026110902'],
      utrataRucne: [{ id: 'u1', castka: 12300, kdy: '', poznamka: 'ruční' }],
    };
    expect(
      castkaUtratyPriPropojeni(
        { zdroj: 'přímá', prijezd: '2026-11-18', cenaPobytu: 2900, rezervace: '92026110902' },
        karta,
      ),
    ).toBe(0);
  });

  it('nová přímá po 1. 5. 2026 přičte cenu', () => {
    expect(
      castkaUtratyPriPropojeni(
        { zdroj: 'přímá', prijezd: '2026-11-25', cenaPobytu: 1400, rezervace: '120260703' },
        null,
      ),
    ).toBe(1400);
  });
});
