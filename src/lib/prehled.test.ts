import { describe, expect, it } from 'vitest';
import {
  dotazPredOdeslanimZnovu,
  nabidnoutOdeslani,
  radekZRezervace,
  seradRadky,
  souhrnDne,
  textOtevreni,
  textPoplatku,
  type PrehledRadek,
} from './prehled';
import { prazdnaRezervace } from './store';
import { textZpravy } from './whatsapp-zprava';

describe('tlačítka v přehledu', () => {
  it('u zrušené rezervace skryje odeslání', () => {
    expect(nabidnoutOdeslani('zruseno')).toBe(false);
    expect(dotazPredOdeslanimZnovu('zruseno')).toBeNull();
  });

  it('u odeslaného průvodce se před opakováním zeptá', () => {
    const dotaz = 'Host už průvodce dostal. Opravdu poslat znovu?';
    expect(nabidnoutOdeslani('odeslano')).toBe(true);
    expect(nabidnoutOdeslani('odeslano_s_vyhradou')).toBe(true);
    expect(dotazPredOdeslanimZnovu('odeslano')).toBe(dotaz);
    expect(dotazPredOdeslanimZnovu('odeslano_s_vyhradou')).toBe(dotaz);
  });

  it('česká zpráva na WhatsApp je schválené znění', () => {
    expect(textZpravy('cs')).toBe(
      'Dobrý den, posíláme průvodce k vašemu příjezdu. Napište nám prosím čas příjezdu, ať na nás nemusíte čekat.',
    );
  });

  it('poplatek ukáže částku, ne, nebo neznámo', () => {
    expect(textPoplatku('ano', 2, 2)).toBe('Poplatek: 200 Kč (2 noci × 2 osoby)');
    expect(textPoplatku('ne', 2, 2)).toBe('Poplatek: ne');
    expect(textPoplatku('neznamo', null, null)).toBe('Poplatek: neznámo');
  });

  it('otevření má tři stavy', () => {
    expect(textOtevreni(3, '2026-10-10T12:32:00.000Z').text).toBe('Otevřel 10. 10. 14:32 (3×)');
    expect(textOtevreni(3, '2026-10-10T12:32:00.000Z').ton).toBe('ano');
    expect(textOtevreni(0, null)).toEqual({ text: 'Zatím neotevřel', ton: 'ne' });
    expect(textOtevreni(null, null)).toEqual({ text: 'Nevíme', ton: 'nevim' });
  });

  it('kdo už odjel, je dole, nejbližší příjezd nahoře', () => {
    const now = new Date('2026-10-11T08:00:00.000Z');
    const radek = (id: string, prijezd: string, odjezd: string): PrehledRadek =>
      radekZRezervace({
        ...prazdnaRezervace(id, '2026-10-01T00:00:00.000Z'),
        prijezd,
        odjezd,
        otevrenoPocet: 0,
      });
    const serazeno = seradRadky(
      [radek('c', '2026-10-09', '2026-10-10'), radek('b', '2026-10-13', '2026-10-15'), radek('a', '2026-10-11', '2026-10-12')],
      now,
    );
    expect(serazeno.map((r) => r.rezervace)).toEqual(['a', 'b', 'c']);
  });

  it('souhrn dne seřadí hosty podle času příjezdu', () => {
    const a = radekZRezervace({
      ...prazdnaRezervace('a', '2026-10-01T00:00:00.000Z'),
      prijezd: '2026-10-11',
      odjezd: '2026-10-12',
      jmeno: 'Pozdě',
      casPrijezdu: '18:00',
      otevrenoPocet: 1,
      stav: 'odeslano',
    });
    const b = radekZRezervace({
      ...prazdnaRezervace('b', '2026-10-01T00:00:00.000Z'),
      prijezd: '2026-10-11',
      odjezd: '2026-10-12',
      jmeno: 'Dřív',
      casPrijezdu: '11:00',
      otevrenoPocet: 0,
      stav: 'neodeslano',
    });
    const s = souhrnDne([a, b], '2026-10-11');
    expect(s.pocet).toBe(2);
    expect(s.otevrelo).toBe(1);
    expect(s.neodeslano).toBe(1);
    expect(s.plan.map((h) => h.jmeno)).toEqual(['Dřív', 'Pozdě']);
  });

  it('u neodeslané rezervace se neptá a odeslání nabídne', () => {
    expect(nabidnoutOdeslani('neodeslano')).toBe(true);
    expect(nabidnoutOdeslani('vraceno')).toBe(true);
    expect(nabidnoutOdeslani('bez_checkinu')).toBe(true);
    expect(dotazPredOdeslanimZnovu('neodeslano')).toBeNull();
  });
});
