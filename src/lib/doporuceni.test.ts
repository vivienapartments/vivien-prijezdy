import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DOPORUCENI_TEXT_KEYS,
  doporuceniTexty,
} from './doporuceni-texty';
import { doporuceniKlic, jeZkouskaDoporuceni } from './doporuceni-klic';
import {
  generujKod,
  jistyTelefon,
  KOD_ABECEDA,
  listOtevrenaDoporuceni,
  najdiNeboVytvorOsobu,
  nactiOsobuPodleKodu,
  normalizujKod,
  spojOsoby,
  vytvorDoporuceni,
  zkusSparovatRezervaci,
} from './doporuceni';
import { jeRelayEmail } from './staly-host';
import { FileProcessStore, prazdnaRezervace } from './store';
import { GUIDE_LANGS } from './types';

function storeTmp(): FileProcessStore {
  const dir = mkdtempSync(path.join(tmpdir(), 'doporuceni-'));
  return new FileProcessStore(path.join(dir, 'store.json'));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('doporuceniKlic', () => {
  it('na preview přidá test:', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(jeZkouskaDoporuceni()).toBe(true);
    expect(doporuceniKlic('osoba:abc')).toBe('test:osoba:abc');
    expect(doporuceniKlic('od:xyz')).toBe('test:od:xyz');
    expect(doporuceniKlic('test:od:xyz')).toBe('test:od:xyz');
    expect(doporuceniKlic('rez:1')).toBe('rez:1');
  });

  it('mimo preview nechá klíč', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(doporuceniKlic('osoba:abc')).toBe('osoba:abc');
  });
});

describe('generujKod', () => {
  it('má 6 znaků bez 0 o 1 l i', () => {
    for (let i = 0; i < 80; i += 1) {
      const kod = generujKod(6);
      expect(kod).toHaveLength(6);
      expect(kod).toMatch(/^[23456789abcdefghjkmnpqrstuvwxyz]+$/);
      expect(kod).not.toMatch(/[01oli]/);
      for (const ch of kod) expect(KOD_ABECEDA).toContain(ch);
    }
  });

  it('normalizujKod smaže cizí znaky', () => {
    expect(normalizujKod(' Ab-C! ')).toBe('abc');
  });
});

describe('doporuceni texty', () => {
  it('všech 13 jazyků má všechny klíče', () => {
    for (const lang of GUIDE_LANGS) {
      const t = doporuceniTexty(lang);
      for (const k of DOPORUCENI_TEXT_KEYS) {
        expect(String(t[k] || '').trim().length, `${lang}.${k}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('jeRelayEmail', () => {
  it('pozná booking a airbnb', () => {
    expect(jeRelayEmail('x@guest.booking.com')).toBe(true);
    expect(jeRelayEmail('x@guest.airbnb.com')).toBe(true);
    expect(jeRelayEmail('x@m.airbnb.com')).toBe(true);
    expect(jeRelayEmail('x@guest.expedia.com')).toBe(true);
    expect(jeRelayEmail('host@gmail.com')).toBe(false);
  });
});

describe('osoba a párování', () => {
  it('stejný telefon = stejná osoba a kód', async () => {
    const store = storeTmp();
    const a = await najdiNeboVytvorOsobu(store, {
      rezervaceId: '100',
      jmeno: 'Martin',
      telefon: '+420604111222',
      email: 'a@guest.booking.com',
    });
    const b = await najdiNeboVytvorOsobu(store, {
      rezervaceId: '101',
      jmeno: 'Martin Novak',
      telefon: '+420 604 111 222',
    });
    expect(a.id).toBe(b.id);
    expect(a.kod).toBe(b.kod);
    expect(b.rezervace).toEqual(expect.arrayContaining(['100', '101']));
    const podleKodu = await nactiOsobuPodleKodu(store, a.kod);
    expect(podleKodu?.id).toBe(a.id);
  });

  it('relay e-mail nespojí osoby', async () => {
    const store = storeTmp();
    const a = await najdiNeboVytvorOsobu(store, {
      rezervaceId: '200',
      jmeno: 'A',
      email: 'x@guest.booking.com',
    });
    const b = await najdiNeboVytvorOsobu(store, {
      rezervaceId: '201',
      jmeno: 'B',
      email: 'x@guest.booking.com',
    });
    expect(a.id).not.toBe(b.id);
  });

  it('ne-relay e-mail spojí osoby', async () => {
    const store = storeTmp();
    const a = await najdiNeboVytvorOsobu(store, {
      rezervaceId: '210',
      email: 'host@example.com',
    });
    const b = await najdiNeboVytvorOsobu(store, {
      rezervaceId: '211',
      email: 'Host@example.com',
    });
    expect(a.id).toBe(b.id);
  });

  it('sám sobě zamítne', async () => {
    const store = storeTmp();
    const osoba = await najdiNeboVytvorOsobu(store, {
      rezervaceId: '300',
      jmeno: 'Martin',
      telefon: '+420604333444',
    });
    const d = await vytvorDoporuceni(store, {
      kod: osoba.kod,
      poptavkaId: 'p1',
      jmeno: 'Martin',
      telefon: '+420604333444',
      prijezd: '2026-12-01',
      odjezd: '2026-12-03',
    });
    expect(d.doporuceni.stav).toBe('zamitnuto');
    expect(d.slevaPct).toBeNull();
    expect(d.telegramPoznamka).toMatch(/zamítnuto/i);
  });

  it('párování: 1 shoda → sparovano, 0 a 2+ nic', async () => {
    const store = storeTmp();
    const dop = await najdiNeboVytvorOsobu(store, {
      rezervaceId: '400',
      jmeno: 'Doporučitel',
      telefon: '+420777111222',
    });
    await vytvorDoporuceni(store, {
      kod: dop.kod,
      poptavkaId: 'p2',
      jmeno: 'Nový',
      telefon: '+420604555666',
      prijezd: '2026-12-10',
      odjezd: '2026-12-12',
    });
    await vytvorDoporuceni(store, {
      kod: dop.kod,
      poptavkaId: 'p3',
      jmeno: 'Jiný',
      telefon: '+420604555666',
      prijezd: '2026-12-20',
      odjezd: '2026-12-22',
    });

    const nic = prazdnaRezervace('500', new Date().toISOString());
    nic.telefon = '+420111222333';
    await store.setRezervace('500', nic);
    expect((await zkusSparovatRezervaci(store, nic)).ok).toBe(false);

    // dvě otevřená se stejným telefonem → více shod
    const dve = prazdnaRezervace('501', new Date().toISOString());
    dve.telefon = '+420604555666';
    dve.jmeno = 'Nový';
    await store.setRezervace('501', dve);
    const vice = await zkusSparovatRezervaci(store, dve);
    expect(vice.ok).toBe(false);
    if (!vice.ok) expect(vice.duvod).toBe('vice');

    // smažeme druhé doporučení přes zamítnutí nového s jednou shodou
    const otevrena = await listOtevrenaDoporuceni(store, { dnu: 60 });
    expect(otevrena.length).toBe(2);

    // jen jedno doporučení
    const store2 = storeTmp();
    const dop2 = await najdiNeboVytvorOsobu(store2, {
      rezervaceId: '600',
      telefon: '+420777999888',
      jmeno: 'D',
    });
    await vytvorDoporuceni(store2, {
      kod: dop2.kod,
      poptavkaId: 'p4',
      jmeno: 'Host',
      telefon: '+420604777888',
      prijezd: '2026-12-01',
      odjezd: '2026-12-02',
    });
    const rec = prazdnaRezervace('601', new Date().toISOString());
    rec.telefon = '+420604777888';
    rec.jmeno = 'Host';
    await store2.setRezervace('601', rec);
    const ok = await zkusSparovatRezervaci(store2, rec);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.doporuceni.stav).toBe('sparovano');
      const ulozeno = await store2.getRezervace('601');
      expect(ulozeno?.doporucenoOd).toBe(dop2.id);
    }
  });

  it('spojení osob: oba kódy vedou na stejnou', async () => {
    const store = storeTmp();
    const a = await najdiNeboVytvorOsobu(store, { rezervaceId: '700', telefon: '+420601000001', jmeno: 'A' });
    const b = await najdiNeboVytvorOsobu(store, { rezervaceId: '701', telefon: '+420601000002', jmeno: 'B' });
    const kodA = a.kod;
    const kodB = b.kod;
    const sloucená = await spojOsoby(store, a.id, b.id);
    expect(sloucená?.id).toBeTruthy();
    expect((await nactiOsobuPodleKodu(store, kodA))?.id).toBe(sloucená!.id);
    expect((await nactiOsobuPodleKodu(store, kodB))?.id).toBe(sloucená!.id);
  });

  it('jistyTelefon odmítne nejisté', () => {
    expect(jistyTelefon('+420604692573')).toBe('+420604692573');
    expect(jistyTelefon('123')).toBeNull();
  });
});
