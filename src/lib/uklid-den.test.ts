import { describe, expect, it } from 'vitest';
import { hostZRezervace, sestavDnesek } from './dnesek';
import { prazdnaRezervace, type RezervaceRecord } from './store';
import { obsahujeZakazanaPole, sestavUklidDen, textOdjezduUklid, uzPoslanPripravenoEmail } from './uklid-den';
import { zarizeniProRoli } from './upozorneni';

function host(id: string, patch: Partial<RezervaceRecord>): RezervaceRecord {
  return {
    ...prazdnaRezervace(id, '2026-10-30T08:00:00.000Z'),
    ...patch,
  };
}

describe('uklid den', () => {
  it('řadí jako sestavDnesek a neobsahuje zakázaná pole', () => {
    const den = '2026-10-31';
    const odjezdV2 = host('1', {
      apartman: 'V2',
      odjezd: den,
      prijezd: '2026-10-29',
      casOdjezdu: '10:00',
      prevzatoKdy: '2026-10-31T07:40:00.000Z',
      jmeno: 'Tajný Host',
      emailHosta: 'tajny@example.com',
      telefon: '+420777',
      accessPin: '1234',
    });
    const prijezdV2 = host('2', {
      apartman: 'V2',
      prijezd: den,
      odjezd: '2026-11-02',
      casPrijezdu: '13:00',
      osob: 2,
      noci: 2,
      jmeno: 'Další Host',
      emailHosta: 'dalsi@example.com',
      poznamkaUklid: 'postýlka',
    });
    const odjezdV5 = host('3', {
      apartman: 'V5',
      odjezd: den,
      prijezd: '2026-10-28',
      casOdjezdu: '10:30',
      jmeno: 'Jiný',
      emailHosta: 'jiny@example.com',
      accessPin: '9999',
    });
    const list = [odjezdV2, prijezdV2, odjezdV5];
    const pohled = sestavDnesek(list.map(hostZRezervace), den, new Date('2026-10-31T08:00:00.000Z'));
    const uklid = sestavUklidDen(list, den, new Date('2026-10-31T08:00:00.000Z'));
    expect(uklid.karty.map((k) => k.apartman)).toEqual(pohled.uklid.map((r) => r.apartman));
    expect(obsahujeZakazanaPole(uklid)).toEqual([]);
    expect(JSON.stringify(uklid)).not.toMatch(/Tajný|Další Host|tajny@|1234|\+420777/);
    const v2 = uklid.karty.find((k) => k.apartman === 'V2');
    expect(v2?.poznamka).toBe('postýlka');
    expect(v2?.muzeUklidit).toBe(true);
    expect(v2?.odjezdText).toMatch(/převzato/);
    const v5 = uklid.karty.find((k) => k.apartman === 'V5');
    expect(v5?.muzeUklidit).toBe(false);
    expect(v5?.odjezdText).toMatch(/ještě nepřevzato/);
  });

  it('zamkne Uklizeno před převzetím', () => {
    const den = '2026-10-31';
    const odjezd = host('1', {
      apartman: 'V1',
      odjezd: den,
      prijezd: '2026-10-29',
      casOdjezdu: '09:00',
    });
    const uklid = sestavUklidDen([odjezd], den, new Date('2026-10-31T08:00:00.000Z'));
    expect(uklid.karty[0].muzeUklidit).toBe(false);
  });

  it('pozná odeslaný e-mail připraveno', () => {
    const rec = host('1', {
      historie: [{ cas: '2026-10-31T09:20:00.000Z', co: 'E-mailem: Apartmán je připravený (Miluška)' }],
    });
    expect(uzPoslanPripravenoEmail(rec)).toBe(true);
    expect(uzPoslanPripravenoEmail(host('2', {}))).toBe(false);
  });

  it('formátuje odjezd', () => {
    expect(
      textOdjezduUklid({
        rezervace: '1',
        apartman: 'V1',
        jmeno: 'X',
        casOdjezduText: 'převzato 9:40',
        nedoplatek: null,
        uvolni: '',
        dalsi: '',
        dalsiJmeno: null,
        dalsiRezervace: null,
        prijezdCas: null,
        maPrijezd: false,
        prvni: true,
        nestihneSeDo: null,
        uklizenoKdy: null,
        uklizenoKdo: null,
        prevzato: true,
      }),
    ).toBe('převzato 9:40 ✓');
  });
});

describe('role push', () => {
  it('oddělí majitele a úklid, stará bez role = majitel', () => {
    const list = [
      { endpoint: 'a', p256dh: '1', auth: '1', nazev: 'Pravoslav', cas: 'x' },
      { endpoint: 'b', p256dh: '1', auth: '1', nazev: 'Miluška', cas: 'x', role: 'uklid' as const },
      { endpoint: 'c', p256dh: '1', auth: '1', nazev: 'Nikol', cas: 'x', role: 'majitel' as const },
    ];
    expect(zarizeniProRoli(list, 'majitel').map((z) => z.nazev)).toEqual(['Pravoslav', 'Nikol']);
    expect(zarizeniProRoli(list, 'uklid').map((z) => z.nazev)).toEqual(['Miluška']);
  });
});
