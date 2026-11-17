import { describe, expect, it } from 'vitest';
import {
  jeRanniZadaniOdjezdu,
  jeTichyRezimOdjezdu,
  odjezdDoDvouHodin,
  odlozitPushCasuOdjezdu,
  polePoCasuOdjezdu,
  textPrijatiCasuOdjezdu,
  textPotvrzeniOdjezduOsobne,
} from './odjezd-potvrzeni';

/** Praha = UTC+1 v zimě. */
function praha(ymd: string, h: number, m: number): Date {
  const utcH = h - 1;
  return new Date(`${ymd}T${String(utcH).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`);
}

describe('odjezd-potvrzeni', () => {
  it('tichý režim 21:30–6:45', () => {
    expect(jeTichyRezimOdjezdu(praha('2026-11-18', 21, 29))).toBe(false);
    expect(jeTichyRezimOdjezdu(praha('2026-11-18', 21, 30))).toBe(true);
    expect(jeTichyRezimOdjezdu(praha('2026-11-18', 23, 0))).toBe(true);
    expect(jeTichyRezimOdjezdu(praha('2026-11-18', 6, 44))).toBe(true);
    expect(jeTichyRezimOdjezdu(praha('2026-11-18', 6, 45))).toBe(false);
    expect(jeTichyRezimOdjezdu(praha('2026-11-18', 12, 0))).toBe(false);
  });

  it('ranní hláška = tichý režim', () => {
    expect(jeRanniZadaniOdjezdu(praha('2026-11-18', 6, 0))).toBe(true);
    expect(jeRanniZadaniOdjezdu(praha('2026-11-18', 22, 0))).toBe(true);
    expect(jeRanniZadaniOdjezdu(praha('2026-11-18', 18, 0))).toBe(false);
  });

  it('do 2 hodin neodkládá push', () => {
    const now = praha('2026-11-18', 6, 0);
    const rec = { odjezd: '2026-11-18', casOdjezdu: '07:30' };
    expect(odjezdDoDvouHodin(rec, now)).toBe(true);
    expect(odlozitPushCasuOdjezdu(rec, now)).toBe(false);
  });

  it('v noci bez blízkého odjezdu odloží push', () => {
    const now = praha('2026-11-17', 22, 0);
    const rec = { odjezd: '2026-11-18', casOdjezdu: '10:00' };
    expect(odlozitPushCasuOdjezdu(rec, now)).toBe(true);
  });

  it('ranní a denní text', () => {
    expect(textPrijatiCasuOdjezdu('10:00', praha('2026-11-18', 6, 0), 'cs')).toContain('Až budeme vzhůru');
    expect(textPrijatiCasuOdjezdu('10:00', praha('2026-11-18', 18, 0), 'cs')).toContain('co nejdříve');
    expect(textPrijatiCasuOdjezdu('10:00', praha('2026-11-18', 18, 0), 'pl')).toContain('przyjęliśmy');
  });

  it('schválený text po Osobně', () => {
    expect(textPotvrzeniOdjezduOsobne('10:00', 'cs')).toBe(
      'V 10:00 s vámi počítáme. Přijdeme se osobně rozloučit.',
    );
    expect(textPotvrzeniOdjezduOsobne('10:00', 'pl')).toBe(
      'O 10:00 liczymy na Was. Przyjdziemy się osobiście pożegnać.',
    );
  });

  it('změna času resetuje potvrzení', () => {
    const p = polePoCasuOdjezdu('11:00', '10:00', praha('2026-11-18', 12, 0));
    expect(p.potvrzeniOdjezdu).toBeNull();
    expect(p.zpravaOdjezdPrijatiPrectena).toBeNull();
    expect(p.casOdjezduZapsanKdy).toBeTruthy();
  });
});
