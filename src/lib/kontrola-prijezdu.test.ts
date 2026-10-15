import { describe, expect, it } from 'vitest';
import { prazdnaRezervace } from './store';
import { checkinVivien, kdoPredal, kdoZadalCas, radkyKontroly, vznikText, whatsappDuvod } from './kontrola-prijezdu';

function host(id: string, prijezd: string) {
  const rec = prazdnaRezervace(id, '2026-10-15T08:00:00.000Z');
  rec.prijezd = prijezd;
  rec.odjezd = '2026-10-18';
  rec.jmeno = 'Eva Novák';
  rec.apartman = 'V1';
  rec.noci = 3;
  rec.osob = 2;
  return rec;
}

describe('kontrola příjezdů', () => {
  it('nechá jen 14., 15. a 16. října', () => {
    const radky = radkyKontroly([
      host('1', '2026-10-13'),
      host('2', '2026-10-14'),
      host('3', '2026-10-16'),
      host('4', '2026-10-17'),
    ]);
    expect(radky.map((r) => r.rezervace)).toEqual(['2', '3']);
  });

  it('rozliší předání od majitele a od migrace', () => {
    const migrace = host('1', '2026-10-14');
    migrace.predano = '2026-10-14T13:42:00.000Z';
    migrace.historie = [{ cas: migrace.predano, co: 'Předáno, host už bydlel' }];
    const majitel = host('2', '2026-10-15');
    majitel.predano = '2026-10-15T14:05:00.000Z';
    majitel.historie = [{ cas: majitel.predano, co: 'Předáno' }];
    const nic = host('3', '2026-10-16');
    expect(kdoPredal(migrace)).toBe('migrace, host už bydlel');
    expect(kdoPredal(majitel)).toBe('majitel');
    expect(kdoPredal(nic)).toBe('ne');
  });

  it('řekne, kdo zadal čas', () => {
    const odHosta = host('1', '2026-10-15');
    odHosta.casPrijezdu = '18:30';
    odHosta.casZadalHost = true;
    const odMajitele = host('2', '2026-10-15');
    odMajitele.casPrijezdu = '16:00';
    odMajitele.rucniZnacky = [{ pole: 'casPrijezdu', cas: '2026-10-15T10:00:00.000Z' }];
    expect(kdoZadalCas(odHosta)).toBe('host');
    expect(kdoZadalCas(odMajitele)).toBe('majitel');
  });

  it('řekne, jestli check-in přišel a jestli je odkaz', () => {
    const ceka = host('1', '2026-10-15');
    ceka.stav = 'bez_checkinu';
    const dosel = host('2', '2026-10-15');
    dosel.stav = 'odeslano';
    dosel.checkinUrl = 'https://checkin.example/x';
    dosel.historie = [{ cas: '2026-10-14T09:00:00.000Z', co: 'Průvodce odeslán' }];
    expect(checkinVivien(ceka)).toBe('nepřišel');
    const r = radkyKontroly([dosel])[0];
    expect(r.checkin).toBe('přišel, zpracován');
    expect(r.odkaz).toBe('je');
    expect(r).not.toHaveProperty('emailHosta');
    expect(r).not.toHaveProperty('accessPin');
  });

  it('vezme datum vzniku z posledního zdroje v historii', () => {
    const rec = host('1', '2026-10-15');
    rec.vytvoreno = '2026-10-06';
    rec.historie = [
      { cas: '2026-10-06T08:00:00.000Z', co: 'Nová rezervace, čeká na check-in' },
      { cas: '2026-10-07T08:00:00.000Z', co: 'Doplněno z check-inu: vytvořeno. Průvodce odeslán' },
    ];
    expect(vznikText(rec)).toBe('6. 10. 2026, check-in VIVIEN-DATA');
  });

  it('u čísla bez předvolby řekne, proč není WhatsApp', () => {
    const rec = host('1', '2026-10-15');
    rec.telefon = '34 612 345 678';
    rec.telefonWa = null;
    rec.narodnost = null;
    rec.telefonRezervace = '+420777111222';
    rec.telefonRezervaceWa = '420777111222';
    const r = radkyKontroly([rec])[0];
    expect(whatsappDuvod(rec.telefon, rec.telefonWa, rec.narodnost)).toBe('ne, chybí předvolba');
    expect(r.whatsapp).toBe('ne, chybí předvolba');
    expect(r.whatsappDruhe).toBe('ano');
    expect(whatsappDuvod(null, null, null)).toBe('číslo není');
  });

  it('ukáže jen poslední tři věty historie', () => {
    const rec = host('1', '2026-10-14');
    rec.historie = [1, 2, 3, 4].map((n) => ({
      cas: `2026-10-14T0${n}:00:00.000Z`,
      co: `krok ${n}`,
    }));
    const r = radkyKontroly([rec])[0];
    expect(r.historie.map((h) => h.endsWith('krok 4') || h.endsWith('krok 3') || h.endsWith('krok 2'))).toEqual([
      true,
      true,
      true,
    ]);
    expect(r.historie.some((h) => h.includes('krok 1'))).toBe(false);
  });
});
