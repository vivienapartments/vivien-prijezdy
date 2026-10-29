import { describe, expect, it } from 'vitest';
import {
  dotazPredOdeslanimZnovu,
  nabidnoutOdeslani,
  textTlacitkaOdeslani,
  poplatekKratky,
  cekajiciUkon,
  poplatekNahled,
  radekZRezervace,
  seradRadky,
  souhrnDne,
  telefonyPrehledu,
  terminKratky,
  textAutomatNebezi,
  textOtevreni,
  textPoplatku,
  rozpisPlateb,
  textVybranehoPoplatku,
  vetaChyby,
  type PrehledRadek,
} from './prehled';
import { normalizujCasPrijezdu } from './cas-prijezdu';
import { prazdnaRezervace } from './store';
import { GUIDE_LANGS } from './types';
import {
  druhZdroje,
  hlavniZprava,
  textCheckinu,
  textBrany,
  textDneNerozbalen,
  textDneSCasem,
  textNerozbalen,
  textZpravy,
  zpravaCheckinu,
  zpravaDneNerozbalen,
  zpravaDneSCasem,
  zpravaHostovi,
  zpravaNerozbalen,
  zpravyMenu,
  ukazatNedojezd,
  zpravaNedojezdu,
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

  it('tlačítko odeslání rozlišuje první a opakované poslání', () => {
    expect(textTlacitkaOdeslani('neodeslano')).toBe('Poslat průvodce');
    expect(textTlacitkaOdeslani('vraceno')).toBe('Poslat průvodce');
    expect(textTlacitkaOdeslani('odeslano')).toBe('Poslat průvodce znovu');
    expect(textTlacitkaOdeslani('odeslano_s_vyhradou')).toBe('Poslat průvodce znovu');
  });

  it('česká zpráva na WhatsApp je schválené znění', () => {
    expect(textZpravy('cs')).toBe(
      'Dobrý den, ve vašem průvodci k příjezdu čekají vstupní PINy do domu a apartmánu. Abyste se k nim dostali, otevřete průvodce, vyberte čas a způsob příjezdu a potvrďte pravidla. Děkujeme a těšíme se na setkání.',
    );
    expect(textCheckinu('cs', 'Booking')).toBe(
      'Dobrý den, ještě nemáte vyplněný online check-in. Hned po něm vám pošleme průvodce k příjezdu se vstupními PINy do domu a apartmánu. Bez check-inu se u nás neubytujete ani nezaparkujete. Vyplnění zabere jen chvilku.\n\nOdkaz najdete ve zprávách na Booking.com.\n\nDěkujeme a moc se na vás těšíme.',
    );
    expect(textCheckinu('cs', 'Booking')).not.toContain('odkaz je tady:');
    expect(textCheckinu('cs', 'Airbnb')).toContain('ve zprávách na Airbnb.');
    expect(textCheckinu('cs', 'přímá')).toContain('v e-mailu s potvrzením rezervace.');
    expect(textCheckinu('cs', 'Expedia')).toContain('ve zprávách od webu, kde jste rezervovali.');
    expect(textCheckinu('de', 'Booking')).toContain('Leitfaden');
    expect(textCheckinu('de', 'Booking')).not.toContain('Wegweiser');
    expect(textCheckinu('de', 'Booking').toLowerCase()).not.toContain('bitte');
    expect(textCheckinu('en', 'Booking').toLowerCase()).not.toContain('please');
    expect(textNerozbalen('cs', ['cas'])).toBe(
      'Dobrý den, abyste se dostali ke svým vstupním PINům, v průvodci k příjezdu ještě vyberte čas příjezdu. Zabere to minutu. Děkujeme a těšíme se na setkání.',
    );
    expect(textNerozbalen('cs', ['cas'])).not.toContain('potvrďte pravidla');
    expect(textNerozbalen('cs', ['zpusob', 'pravidla'])).toContain('vyberte, jak přijedete a potvrďte pravidla');
    expect(textNerozbalen('cs', ['zpusob', 'pravidla'])).not.toContain('vyberte čas příjezdu');
    expect(textBrany('cs')).toBe(
      'Dobrý den, v průvodci doplňte telefon pro bránu a SPZ. Bez registrace v bráně nezaparkujete. Děkujeme a těšíme se na setkání.',
    );
    expect(textDneNerozbalen('cs', ['cas', 'pravidla'])).toBe(
      'Dobrý den, dnes se na vás těšíme. Abyste se dostali ke svým vstupním PINům, v průvodci ještě vyberte čas příjezdu a potvrďte pravidla. Zabere to minutu. Děkujeme.',
    );
    expect(textDneSCasem('cs', '16:30')).toBe(
      'Dobrý den, dnes se na vás těšíme. Počítáme s vámi kolem 16:30. Asi čtvrt hodiny předem nám napište, že budete na místě, a budeme vás čekat. Na domluvený čas čekáme 10 minut. Kdyby se čas změnil, opravte ho v průvodci nebo nám napište.',
    );
    expect(textDneSCasem('cs', '21:00')).toContain('teď by to bylo 200\u00A0Kč');
    expect(textDneSCasem('cs', '21:00')).toContain('100\u00A0Kč za každou započatou půlhodinu');
  });

  it('krátký termín a poplatek do sbaleného řádku', () => {
    expect(terminKratky('2026-10-12', '2026-10-14')).toBe('12.–14.10.');
    expect(terminKratky('2026-10-30', '2026-11-02')).toBe('30.10.–2.11.');
    expect(terminKratky('2026-10-12', null)).toBe('12.10.');
    expect(poplatekKratky('ano', 2, 2)).toBe('Poplatek 200 Kč');
    expect(poplatekKratky('ne', 2, 2)).toBe('Poplatek ne');
    expect(cekajiciUkon({ predano: true, naMiste: true, denPrijezdu: true, parkovani: 'registrovat' })).toBeNull();
    expect(cekajiciUkon({ predano: false, naMiste: true, denPrijezdu: true, parkovani: 'potvrdit' })).toBe('predani');
    expect(cekajiciUkon({ predano: false, naMiste: false, denPrijezdu: true, parkovani: 'potvrdit' })).toBe('odpoved');
    expect(cekajiciUkon({ predano: false, naMiste: false, denPrijezdu: true, parkovani: 'registrovat' })).toBe('registrace');
    expect(cekajiciUkon({ predano: false, naMiste: false, denPrijezdu: true, parkovani: 'nic' })).toBe('namiste');
    expect(cekajiciUkon({ predano: false, naMiste: false, denPrijezdu: false, parkovani: 'nic' })).toBeNull();
    const bez = poplatekNahled({ poplatek: 'ne', noci: 2, osob: 2, cas: '21:10', vyjezdy: [{ castka: 300 }], zaplaceno: false });
    expect(bez.text).toBe('Poplatek ne');
    expect(bez.rozpis).toBeNull();
    const rozpis = poplatekNahled({
      poplatek: 'ano',
      noci: 2,
      osob: 2,
      cas: '21:10',
      vyjezdy: [{ castka: 300 }],
      zaplaceno: false,
    });
    expect(rozpis.text).toBe('Poplatek 800 Kč');
    expect(rozpis.rozpis).toBe(
      '2 osoby × 2 noci × 50 Kč = 200 Kč · pozdní příjezd 21:10 = 300 Kč · opakovaný výjezd 300 Kč',
    );
    expect(rozpis.stav).toBe('nevybráno');
    expect(
      poplatekNahled({ poplatek: 'ano', noci: 2, osob: 2, cas: '16:30', vyjezdy: [], zaplaceno: true }).stav,
    ).toBe('zaplaceno');
    const vecer = rozpisPlateb({
      poplatek: 'ano',
      noci: 2,
      osob: 2,
      cas: '21:00',
      vyjezdy: [{ castka: 300 }],
    });
    expect(vecer.radky.map((radek) => `${radek.nazev} ${radek.text}`)).toEqual([
      'Městský poplatek 200\u00A0Kč',
      'Příplatek za čas 200\u00A0Kč',
      'Další příjezd 300\u00A0Kč',
    ]);
    expect(vecer.soucet).toBe(700);
    expect(vecer.uplny).toBe(true);
    const rano = rozpisPlateb({ poplatek: 'ano', noci: 2, osob: 2, cas: '16:30', vyjezdy: [] });
    expect(rano.soucet).toBe(200);
    expect(rano.radky[1]?.text).toBe('0\u00A0Kč');
    const domluva = rozpisPlateb({ poplatek: 'ano', noci: 2, osob: 2, cas: 'po23', vyjezdy: [] });
    expect(domluva.uplny).toBe(false);
    expect(domluva.radky[1]?.text).toBe('po domluvě');
    expect(domluva.soucet).toBe(200);
    const skutecny = rozpisPlateb({
      poplatek: 'ano',
      noci: 2,
      osob: 2,
      cas: '21:00',
      skutecny: '21:45',
      vyjezdy: [],
    });
    expect(skutecny.radky[1]?.text).toBe('400\u00A0Kč');
    expect(skutecny.radky[1]?.dovetek).toBe('odhad 200\u00A0Kč');
    expect(skutecny.soucet).toBe(600);
    const rucni = rozpisPlateb({
      poplatek: 'ano',
      noci: 2,
      osob: 2,
      cas: '21:00',
      skutecny: '21:45',
      rucni: 50,
      vyjezdy: [],
    });
    expect(rucni.radky[1]?.text).toBe('50\u00A0Kč');
    expect(rucni.soucet).toBe(250);
    expect(rucni.navrhKc).toBe(400);
    expect(vetaChyby({ stav: 'neodeslano', telefonNejisty: false, jinyTelefonNejisty: false })).toBe(
      'Průvodce se neodeslal.',
    );
    expect(textVybranehoPoplatku('2026-10-13T13:50:00.000Z', 'ja')).toContain('Poplatek vybral já');
    expect(textVybranehoPoplatku('2026-10-13T13:50:00.000Z', 'nikol')).toContain('Poplatek vybrala Nikol');
    expect(vetaChyby({ stav: 'odeslano', telefonNejisty: true, jinyTelefonNejisty: false })).toBe(
      'Ověřte předvolbu.',
    );
    expect(vetaChyby({ stav: 'odeslano', telefonNejisty: false, jinyTelefonNejisty: false })).toBeNull();
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
      hlavniZprava({ stav: 'odeslano', otevrenoPocet: 2, casPrijezdu: null, prijezd: '2026-10-12', dnes: '2026-10-11', chybi: ['cas', 'zpusob', 'pravidla'] }),
    ).toBe('nerozbalen');
    expect(
      hlavniZprava({
        stav: 'odeslano',
        otevrenoPocet: 2,
        casPrijezdu: '16:30',
        prijezd: '2026-10-11',
        dnes: '2026-10-11',
        chybi: [],
      }),
    ).toBe('denCas');
    expect(
      hlavniZprava({ stav: 'odeslano', otevrenoPocet: 2, casPrijezdu: null, prijezd: '2026-10-11', dnes: '2026-10-11', chybi: ['cas'] }),
    ).toBe('nerozbalen');
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
    expect(bez.map((z) => z.id)).toEqual(['checkin', 'neotevrel', 'nerozbalen', 'denNerozbalen', 'denCas', 'brana', 'nedojezd']);
    expect(bez.find((z) => z.id === 'nedojezd')?.vychozi).toBe(false);
    expect(bez.find((z) => z.id === 'nedojezd')?.vystraha).toBe(true);
    expect(bez.find((z) => z.id === 'denNerozbalen')?.text).toBe(
      `${textDneNerozbalen('cs', ['cas', 'zpusob', 'pravidla'])}\n\n${odkaz}\n\nNikol a rodina VIVIEN`,
    );

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
    expect(sCasem.map((z) => z.id)).toEqual(['checkin', 'neotevrel', 'nerozbalen', 'denNerozbalen', 'denCas', 'brana', 'nedojezd']);
    expect(sCasem.find((z) => z.vychozi)?.id).not.toBe('nedojezd');
    const textSeCasem = sCasem.find((z) => z.id === 'denCas')?.text || '';
    expect(textSeCasem).toBe(`${textDneSCasem('cs', '16:30')}\n\n${odkaz}\n\nNikol a rodina VIVIEN`);
    expect(textSeCasem).toContain('16:30');
    expect(textSeCasem).not.toContain('4:30');
    expect(zpravaDneSCasem('en', '16:30', odkaz)).toContain('around 16:30');
  });

  it('poslední výzva je jen den předem a v den příjezdu, a nikdy není předvybraná', () => {
    const text = zpravaNedojezdu('cs');
    expect(text).toContain('nedojezd (no-show)');
    expect(text).toContain('+420\u00A0604\u00A0692\u00A0573');
    expect(text.endsWith('Nikol a rodina VIVIEN')).toBe(true);
    expect(zpravaNedojezdu('de')).toContain('Nichtanreise (No-Show)');
    expect(zpravaNedojezdu('es')).toContain('no presentado (no-show)');
    expect(zpravaNedojezdu('en')).toContain('no-show');
    const zaklad = {
      stav: 'odeslano',
      otevrenoPocet: 2,
      chybi: ['cas'] as string[],
      predano: '',
      naMiste: false,
    };
    expect(ukazatNedojezd({ ...zaklad, casPrijezdu: null, prijezd: '2026-10-15', dnes: '2026-10-15' })).toBe(true);
    expect(ukazatNedojezd({ ...zaklad, casPrijezdu: null, prijezd: '2026-10-15', dnes: '2026-10-14' })).toBe(true);
    expect(ukazatNedojezd({ ...zaklad, casPrijezdu: null, prijezd: '2026-10-15', dnes: '2026-10-12' })).toBe(false);
    expect(
      ukazatNedojezd({
        ...zaklad,
        chybi: [],
        otevrenoPocet: 2,
        casPrijezdu: '16:30',
        prijezd: '2026-10-15',
        dnes: '2026-10-15',
      }),
    ).toBe(false);
    expect(
      ukazatNedojezd({
        ...zaklad,
        chybi: [],
        otevrenoPocet: 0,
        casPrijezdu: '16:30',
        prijezd: '2026-10-15',
        dnes: '2026-10-15',
      }),
    ).toBe(true);
    expect(
      ukazatNedojezd({ ...zaklad, casPrijezdu: null, prijezd: '2026-10-15', dnes: '2026-10-15', predano: '17:03' }),
    ).toBe(false);
    const menu = zpravyMenu({
      stav: 'odeslano',
      lang: 'cs',
      pruvodce: null,
      otevrenoPocet: 2,
      casPrijezdu: '16:30',
      prijezd: '2026-10-15',
      dnes: '2026-10-15',
      chybi: [],
    });
    expect(menu.some((z) => z.id === 'nedojezd')).toBe(false);
    expect(menu.some((z) => z.vychozi && z.id === 'nedojezd')).toBe(false);
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
    expect(sOdkazem.find((z) => z.vychozi)?.text).toContain('na Airbnb.');
    expect(sOdkazem.find((z) => z.vychozi)?.text).not.toContain('https://');
    const url = 'https://checkin.example.com/formular/120260541';
    const sFormularem = zpravaCheckinu('cs', 'Booking', url);
    expect(sFormularem).toContain('odkaz je tady:');
    expect(sFormularem).not.toContain('Odkaz posíláme níže.');
    expect(sFormularem).not.toContain('Booking.com');
    expect(sFormularem).toContain(`\n\n${url}\n\nDěkujeme a moc se na vás těšíme.\n\nNikol a rodina VIVIEN`);
  });

  it('podpis je pod odkazem a u zprávy bez odkazu hned pod textem', () => {
    const odkaz = 'https://pruvodce.example/host';
    const pruvodce = zpravaHostovi('cs', odkaz);
    const cas = zpravaNerozbalen('cs', ['cas'], null);
    const den = zpravaDneNerozbalen('cs', ['cas'], odkaz);
    expect(pruvodce).toBe(`${textZpravy('cs')}\n\n${odkaz}\n\nNikol a rodina VIVIEN`);
    expect(den.indexOf(odkaz)).toBeLessThan(den.indexOf('Nikol a rodina VIVIEN'));
    expect(cas).toBe(`${textNerozbalen('cs', ['cas'])}\n\nNikol a rodina VIVIEN`);
    expect(cas).not.toContain('potvrďte pravidla');
    expect(cas).not.toContain('https://');
    expect(zpravaHostovi('en', odkaz)).toContain('Nikol and the VIVIEN family');
    expect(zpravaHostovi('de', odkaz)).toContain('Nikol und Familie VIVIEN');
    expect(zpravaHostovi('de', null).toLowerCase()).not.toContain('bitte');
  });

  it('poplatek ukáže částku, v ceně, nebo otazník', () => {
    expect(textPoplatku('ano', 2, 2)).toBe('Poplatek: 200 Kč (2 noci × 2 osoby)');
    expect(textPoplatku('ne', 2, 2)).toBe('Poplatek: 200 Kč, v ceně');
    expect(textPoplatku('neznamo', 2, 2)).toBe('Poplatek: 200 Kč ?');
    expect(textPoplatku('neznamo', null, null)).toBe('Poplatek: ?');
  });

  it('otevření má tři stavy', () => {
    expect(textOtevreni(3, '2026-10-10T12:32:00.000Z').text).toBe('Otevřel 10. 10. 14:32 (3×)');
    expect(textOtevreni(3, '2026-10-10T12:32:00.000Z').ton).toBe('ano');
    expect(textOtevreni(0, null)).toEqual({ text: 'Zatím neotevřel', ton: 'ne' });
    expect(textOtevreni(null, null)).toEqual({ text: 'Nevíme', ton: 'nevim' });
  });

  it('otevřený průvodce bez času je samostatný stav', () => {
    const otevrel = radekZRezervace({
      ...prazdnaRezervace('1', '2026-10-01T00:00:00.000Z'),
      otevrenoPocet: 1,
      casPrijezdu: null,
    });
    const neotevrel = radekZRezervace({
      ...prazdnaRezervace('2', '2026-10-01T00:00:00.000Z'),
      otevrenoPocet: 0,
      casPrijezdu: null,
    });
    expect(otevrel.rozbalenText).toBe('Průvodce nerozbalen · chybí: čas, způsob příjezdu, pravidla');
    expect(otevrel.rozbalen).toBe(false);
    expect(neotevrel.rozbalenText).toBe(otevrel.rozbalenText);
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

  it('v rámci dne řadí podle času příjezdu, pak apartmánu', () => {
    const now = new Date('2026-10-11T08:00:00.000Z');
    const radek = (
      id: string,
      apartman: 'V1' | 'V2' | 'V5',
      cas: string | null,
      predano?: string | null,
    ): PrehledRadek =>
      radekZRezervace({
        ...prazdnaRezervace(id, '2026-10-01T00:00:00.000Z'),
        prijezd: '2026-10-11',
        odjezd: '2026-10-12',
        apartman,
        casPrijezdu: cas,
        predano: predano ?? null,
        otevrenoPocet: 0,
      });
    const serazeno = seradRadky(
      [radek('c', 'V1', '18:00'), radek('b', 'V5', '11:00'), radek('a', 'V2', '11:00'), radek('d', 'V1', null)],
      now,
    );
    expect(serazeno.map((r) => r.rezervace)).toEqual(['a', 'b', 'c', 'd']);

    const poPredani = seradRadky(
      [
        radek('a', 'V2', '11:00', '2026-10-11T09:00:00.000Z'),
        radek('b', 'V5', '12:00'),
        radek('c', 'V1', '18:00'),
      ],
      now,
    );
    expect(poPredani.map((r) => r.rezervace)).toEqual(['b', 'c', 'a']);
  });

  it('varování Automatu po 15 minutách ticha', () => {
    const now = new Date('2026-10-11T12:00:00.000Z');
    expect(textAutomatNebezi('2026-10-11T11:50:00.000Z', now)).toBeNull();
    expect(textAutomatNebezi('2026-10-11T11:44:00.000Z', now)).toMatch(/^Automat neběží od /);
    expect(textAutomatNebezi(null, now)).toMatch(/^Automat neběží/);
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

  it('číslo bez předvolby se v přehledu doplní podle země', () => {
    const t = telefonyPrehledu({
      ...prazdnaRezervace('1', '2026-10-01T00:00:00.000Z'),
      narodnost: 'DEU',
      telefon: '1701234567',
      telefonWa: null,
    });
    expect(t.text).toBe('+49 1701234567');
    expect(t.wa).toBe('491701234567');
    expect(t.nejisty).toBe(false);
  });
});
