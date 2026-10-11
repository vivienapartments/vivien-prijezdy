import { describe, expect, it } from 'vitest';
import { resetOtevreniPamat, zpracujBeacon } from './otevreni';
import { prazdnaRezervace, type ProcessStore, type RezervaceRecord } from './store';
import { createToken } from './token';

const SECRET = 'test-secret-at-least-32-bytes-long!!';

function pamet(rec: RezervaceRecord | null) {
  let aktualni = rec;
  const zapisy: RezervaceRecord[] = [];
  const store = {
    async getRezervace() {
      return aktualni;
    },
    async setRezervace(_id: string, record: RezervaceRecord) {
      aktualni = record;
      zapisy.push(record);
    },
  } as ProcessStore;
  return { store, zapisy, aktualni: () => aktualni };
}

describe('otevření průvodce', () => {
  it('beacon s neplatným tokenem nic neuloží', async () => {
    resetOtevreniPamat();
    const { store, zapisy } = pamet(prazdnaRezervace('R-1001', '2099-01-01T00:00:00.000Z'));
    const vysledek = await zpracujBeacon({
      token: 'tohle-neni-token',
      ua: 'Mozilla/5.0',
      majitel: false,
      store,
      secret: SECRET,
      now: new Date('2099-01-01T10:00:00.000Z'),
    });
    expect(vysledek).toBe('neplatny');
    expect(zapisy).toHaveLength(0);
  });

  it('otevření majitelem se nepočítá', async () => {
    resetOtevreniPamat();
    const token = createToken({ r: 'R-1001', a: 'V1', d: '2099-12-31', l: 'cs' }, SECRET);
    const { store, zapisy } = pamet(prazdnaRezervace('R-1001', '2099-01-01T00:00:00.000Z'));
    const vysledek = await zpracujBeacon({
      token,
      ua: 'Mozilla/5.0',
      majitel: true,
      store,
      secret: SECRET,
      now: new Date('2099-01-01T10:00:00.000Z'),
    });
    expect(vysledek).toBe('majitel');
    expect(zapisy).toHaveLength(0);
  });

  it('robot se nepočítá', async () => {
    resetOtevreniPamat();
    const token = createToken({ r: 'R-1001', a: 'V1', d: '2099-12-31', l: 'cs' }, SECRET);
    const { store, zapisy } = pamet(prazdnaRezervace('R-1001', '2099-01-01T00:00:00.000Z'));
    const vysledek = await zpracujBeacon({
      token,
      ua: 'WhatsApp/2.23.20',
      majitel: false,
      store,
      secret: SECRET,
      now: new Date('2099-01-01T10:00:00.000Z'),
    });
    expect(vysledek).toBe('robot');
    expect(zapisy).toHaveLength(0);
  });

  it('počítání a časy fungují, druhý zápis v minutě ne', async () => {
    resetOtevreniPamat();
    const token = createToken({ r: 'R-1001', a: 'V1', d: '2099-12-31', l: 'cs' }, SECRET);
    const { store, aktualni } = pamet({
      ...prazdnaRezervace('R-1001', '2099-01-01T00:00:00.000Z'),
      otevrenoPocet: 0,
    });
    const prvni = new Date('2099-01-01T10:00:00.000Z');
    expect(
      await zpracujBeacon({
        token,
        ua: 'Mozilla/5.0',
        majitel: false,
        store,
        secret: SECRET,
        now: prvni,
      }),
    ).toBe('zapsano');
    expect(aktualni()?.otevrenoPocet).toBe(1);
    expect(aktualni()?.otevrenoPoprve).toBe(prvni.toISOString());
    expect(aktualni()?.otevrenoNaposled).toBe(prvni.toISOString());

    const brzy = new Date('2099-01-01T10:00:20.000Z');
    expect(
      await zpracujBeacon({
        token,
        ua: 'Mozilla/5.0',
        majitel: false,
        store,
        secret: SECRET,
        now: brzy,
      }),
    ).toBe('brzy');
    expect(aktualni()?.otevrenoPocet).toBe(1);

    const druhe = new Date('2099-01-01T10:02:00.000Z');
    expect(
      await zpracujBeacon({
        token,
        ua: 'Mozilla/5.0',
        majitel: false,
        store,
        secret: SECRET,
        now: druhe,
      }),
    ).toBe('zapsano');
    expect(aktualni()?.otevrenoPocet).toBe(2);
    expect(aktualni()?.otevrenoPoprve).toBe(prvni.toISOString());
    expect(aktualni()?.otevrenoNaposled).toBe(druhe.toISOString());
  });
});
