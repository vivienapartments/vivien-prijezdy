import { describe, expect, it } from 'vitest';
import {
  dotazPredOdeslanimZnovu,
  nabidnoutOdeslani,
  radekZRezervace,
  seradRadky,
  souhrnDne,
  telefonyPrehledu,
  textOtevreni,
  textPoplatku,
  type PrehledRadek,
} from './prehled';
import { prazdnaRezervace } from './store';
import { hlavniZprava, textCasu, textCheckinu, textDne, textZpravy } from './whatsapp-zprava';

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
    expect(textCheckinu('cs')).toBe(
      'Dobrý den, děkujeme za rezervaci. Prosím vyplňte si online check-in, odkaz najdete v e-mailu s potvrzením rezervace. Hned potom vám pošleme průvodce se vstupem a parkováním.',
    );
    expect(textCheckinu('en')).toContain('booking confirmation email');
    expect(textCheckinu('de')).toContain('Leitfaden');
    expect(textCheckinu('de')).not.toContain('Wegweiser');
    expect(textCasu('cs')).toBe(
      'Dobrý den, děkujeme. Napište nám prosím ještě, v kolik zhruba dorazíte, ať na nás nemusíte čekat.',
    );
    expect(textDne('cs')).toBe(
      'Dobrý den, dnes se na vás těšíme. Napište nám prosím asi 15 minut před příjezdem, ať jsme na místě. Průvodce s parkováním máte tady',
    );
  });

  it('nahoře v menu je zpráva podle stavu', () => {
    expect(
      hlavniZprava({ stav: 'bez_checkinu', otevrenoPocet: 0, casPrijezdu: null, prijezd: '2026-10-11', dnes: '2026-10-11' }),
    ).toBe('checkin');
    expect(
      hlavniZprava({ stav: 'odeslano', otevrenoPocet: 0, casPrijezdu: null, prijezd: '2026-10-11', dnes: '2026-10-11' }),
    ).toBe('neotevrel');
    expect(
      hlavniZprava({ stav: 'odeslano', otevrenoPocet: 2, casPrijezdu: null, prijezd: '2026-10-12', dnes: '2026-10-11' }),
    ).toBe('cas');
    expect(
      hlavniZprava({ stav: 'odeslano', otevrenoPocet: 2, casPrijezdu: '16:30', prijezd: '2026-10-11', dnes: '2026-10-11' }),
    ).toBe('den');
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
    expect(nabidnoutOdeslani('bez_checkinu')).toBe(false);
    expect(dotazPredOdeslanimZnovu('neodeslano')).toBeNull();
  });

  it('stejné číslo z check-inu a z rezervace ukáže jednou', () => {
    const rec = {
      ...prazdnaRezervace('1', '2026-10-01T00:00:00.000Z'),
      telefon: '+420777123456',
      telefonWa: '420777123456',
      telefonRezervace: '+420777123456',
      telefonRezervaceWa: '420777123456',
    };
    const t = telefonyPrehledu(rec);
    expect(t.text).toBe('+420 777 123 456');
    expect(t.jinyText).toBeNull();
  });

  it('jiné číslo z rezervace zůstane pod hlavním', () => {
    const rec = {
      ...prazdnaRezervace('1', '2026-10-01T00:00:00.000Z'),
      telefon: '+420777111222',
      telefonWa: '420777111222',
      telefonRezervace: '+420777123456',
      telefonRezervaceWa: '420777123456',
    };
    const t = telefonyPrehledu(rec);
    expect(t.text).toBe('+420 777 111 222');
    expect(t.jinyText).toBe('+420 777 123 456');
    expect(t.jinyWa).toBe('420777123456');
  });
});
