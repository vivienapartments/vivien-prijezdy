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
import { normalizujCasPrijezdu } from './cas-prijezdu';
import { prazdnaRezervace } from './store';
import { GUIDE_LANGS } from './types';
import {
  druhZdroje,
  hlavniZprava,
  textCasu,
  textCheckinu,
  textDne,
  textDneSCasem,
  textZpravy,
  zpravaCasu,
  zpravaCheckinu,
  zpravaDne,
  zpravaDneSCasem,
  zpravaHostovi,
  zpravyMenu,
  odkazWhatsApp,
  odkazWhatsAppPrehled,
} from './whatsapp-zprava';

describe('tlačítka v přehledu', () => {
  it('na Androidu otevře WhatsApp Business, jinde wa.me', () => {
    const zprava = zpravaHostovi(
      'cs',
      'https://vivien-prijezdy-six.vercel.app/ukazka',
    );
    const android =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
    const iphone =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    const pocitac =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const web = odkazWhatsApp('420777111222', zprava);
    const odkaz = odkazWhatsAppPrehled('420777111222', zprava, android);

    expect(odkaz).toContain('package=com.whatsapp.w4b');
    expect(odkaz.startsWith('intent://send/?phone=420777111222&text=')).toBe(true);
    const text = odkaz.slice(odkaz.indexOf('text=') + 5, odkaz.indexOf('#Intent'));
    expect(decodeURIComponent(text)).toBe(zprava);
    expect(zprava).toContain('Děkujeme a těšíme se na setkání.');
    expect(zprava).toContain('https://vivien-prijezdy-six.vercel.app/ukazka');
    expect(zprava).toContain('Nikol a rodina VIVIEN');
    const fallback = odkaz.slice(odkaz.indexOf('S.browser_fallback_url=') + 'S.browser_fallback_url='.length, odkaz.lastIndexOf(';end'));
    expect(decodeURIComponent(fallback)).toBe(web);
    expect(web.startsWith('https://wa.me/420777111222?text=')).toBe(true);

    expect(odkazWhatsAppPrehled('420777111222', zprava, iphone)).toBe(web);
    expect(odkazWhatsAppPrehled('420777111222', zprava, pocitac)).toBe(web);
    expect(odkazWhatsAppPrehled('420777111222', zprava, '')).toBe(web);
  });

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
      'Dobrý den, abyste se u nás mohli ubytovat a zaparkovat, přečtěte si průvodce k příjezdu a pošlete nám podle něj potřebné údaje. Děkujeme a těšíme se na setkání.',
    );
    expect(textCheckinu('cs', 'Booking')).toBe(
      'Dobrý den, ještě nemáte vyplněný online check-in. Bez něj vám nemůžeme poslat průvodce k příjezdu, a bez průvodce se u nás neubytujete ani nezaparkujete. Odkaz najdete ve zprávách na Booking.com. Děkujeme a těšíme se na setkání.',
    );
    expect(textCheckinu('cs', 'Airbnb')).toContain('ve zprávách na Airbnb.');
    expect(textCheckinu('cs', 'přímá')).toContain('v e-mailu s potvrzením rezervace.');
    expect(textCheckinu('cs', 'Expedia')).toContain('ve zprávách od webu, kde jste rezervovali.');
    expect(textCheckinu('de', 'Booking')).toContain('Leitfaden');
    expect(textCheckinu('de', 'Booking')).not.toContain('Wegweiser');
    expect(textCheckinu('de', 'Booking').toLowerCase()).not.toContain('bitte');
    expect(textCheckinu('en', 'Booking').toLowerCase()).not.toContain('please');
    expect(textCasu('cs')).toBe(
      'Dobrý den, napište nám, v kolik zhruba dorazíte. Apartmán předáváme osobně, a bez času příjezdu se nepotkáme. Děkujeme a těšíme se na setkání.',
    );
    expect(textDne('cs')).toBe(
      'Dobrý den, dnes se na vás těšíme. V kolik zhruba dorazíte? Potřebujeme to vědět, abychom vám mohli apartmán osobně předat.',
    );
    expect(textDneSCasem('cs', '16:30')).toBe(
      'Dobrý den, dnes se na vás těšíme. Počítáme s vámi kolem 16:30, platí to? Kdyby se čas změnil, napište nám prosím hned. Asi 15 minut před příjezdem se nám prosím ozvěte, ať jsme na místě.',
    );
  });

  it('čas příjezdu bere 1630 i 18:00', () => {
    expect(normalizujCasPrijezdu('1630')).toEqual({ ok: true, cas: '16:30' });
    expect(normalizujCasPrijezdu('1800')).toEqual({ ok: true, cas: '18:00' });
    expect(normalizujCasPrijezdu('930')).toEqual({ ok: true, cas: '09:30' });
    expect(normalizujCasPrijezdu('16:30')).toEqual({ ok: true, cas: '16:30' });
    expect(normalizujCasPrijezdu('9.05')).toEqual({ ok: true, cas: '09:05' });
    expect(normalizujCasPrijezdu('')).toEqual({ ok: true, cas: null });
    expect(normalizujCasPrijezdu('1660').ok).toBe(false);
    expect(normalizujCasPrijezdu('2500').ok).toBe(false);
  });

  it('čas příjezdu se doplní ve všech jazycích', () => {
    for (const lang of GUIDE_LANGS) {
      const text = textDneSCasem(lang, '16:30');
      expect(text).toContain('16:30');
      expect(text).not.toContain('{čas}');
      expect(text).not.toContain('{час}');
    }
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
    ).toBe('denCas');
    expect(
      hlavniZprava({ stav: 'odeslano', otevrenoPocet: 2, casPrijezdu: null, prijezd: '2026-10-11', dnes: '2026-10-11' }),
    ).toBe('denBez');
  });

  it('den příjezdu má dvě verze podle políčka času', () => {
    const odkaz = 'https://pruvodce.example/host';
    const bez = zpravyMenu({
      stav: 'odeslano',
      lang: 'cs',
      zdroj: 'Booking',
      pruvodce: odkaz,
      otevrenoPocet: 2,
      casPrijezdu: null,
      prijezd: '2026-10-11',
      dnes: '2026-10-11',
    });
    expect(bez.map((z) => z.id)).toEqual(['denBez', 'checkin', 'neotevrel', 'cas', 'denCas']);
    expect(bez[0]?.text).toBe(`${textDne('cs')}\n\n${odkaz}\n\nNikol a rodina VIVIEN`);

    const sCasem = zpravyMenu({
      stav: 'odeslano',
      lang: 'cs',
      zdroj: 'Booking',
      pruvodce: odkaz,
      otevrenoPocet: 2,
      casPrijezdu: '16:30',
      prijezd: '2026-10-11',
      dnes: '2026-10-11',
    });
    expect(sCasem[0]?.id).toBe('denCas');
    expect(sCasem.map((z) => z.id)).toContain('denBez');
    expect(sCasem[0]?.text).toBe(`${textDneSCasem('cs', '16:30')}\n\n${odkaz}\n\nNikol a rodina VIVIEN`);
    expect(sCasem[0]?.text).toContain('16:30');
    expect(sCasem[0]?.text).not.toContain('4:30');
    expect(zpravaDneSCasem('en', '16:30', odkaz)).toContain('around 16:30');
  });

  it('check-in se řídí zdrojem a odkaz z políčka do zprávy nedá', () => {
    expect(druhZdroje('Booking.com')).toBe('booking');
    expect(druhZdroje('Airbnb')).toBe('airbnb');
    expect(druhZdroje('přímá')).toBe('prima');
    expect(druhZdroje('')).toBe('jiny');
    const booking = zpravaCheckinu('cs', 'Booking');
    expect(booking).toContain('na Booking.com.');
    expect(booking.endsWith('Nikol a rodina VIVIEN')).toBe(true);
    expect(booking).not.toContain('https://');
    expect(booking).not.toContain('prosím');
    const sOdkazem = zpravyMenu({
      stav: 'bez_checkinu',
      lang: 'cs',
      zdroj: 'Airbnb',
      pruvodce: 'https://pruvodce.example/host',
      otevrenoPocet: 0,
      casPrijezdu: null,
      prijezd: '2026-10-11',
      dnes: '2026-10-11',
    });
    expect(sOdkazem[0]?.text).toContain('na Airbnb.');
    expect(sOdkazem[0]?.text).not.toContain('https://');
  });

  it('podpis je pod odkazem a u zprávy bez odkazu hned pod textem', () => {
    const odkaz = 'https://pruvodce.example/host';
    const pruvodce = zpravaHostovi('cs', odkaz);
    const cas = zpravaCasu('cs');
    const den = zpravaDne('cs', odkaz);
    expect(pruvodce).toBe(`${textZpravy('cs')}\n\n${odkaz}\n\nNikol a rodina VIVIEN`);
    expect(den.indexOf(odkaz)).toBeLessThan(den.indexOf('Nikol a rodina VIVIEN'));
    expect(cas).toBe(`${textCasu('cs')}\n\nNikol a rodina VIVIEN`);
    expect(cas).not.toContain('https://');
    expect(zpravaHostovi('en', odkaz)).toContain('Nikol and the VIVIEN family');
    expect(zpravaHostovi('de', odkaz)).toContain('Nikol und Familie VIVIEN');
    expect(zpravaHostovi('de', null).toLowerCase()).not.toContain('bitte');
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
