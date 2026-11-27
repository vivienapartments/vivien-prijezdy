import { describe, expect, it } from 'vitest';
import {
  htmlPodekovaniEmail,
  odkazPoptavkaVernost,
  PREDMET_PODEKOVANI,
  textPodekovaniEmail,
  tlacitkoPodekovani,
} from './podekovani-email';
import { GUIDE_LANGS } from './types';

describe('podekovani-email', () => {
  it('zkouškový odkaz neudělá poptávku s falešným tokenem zkouska', () => {
    expect(odkazPoptavkaVernost('https://vivien-prijezdy-six.vercel.app/zkouska/po-odjezdu')).toBe(
      'https://vivien-prijezdy-six.vercel.app/poptavka?zkouska=1',
    );
    expect(odkazPoptavkaVernost('https://vivien-prijezdy-six.vercel.app/klub?k=test-x')).toBe(
      'https://vivien-prijezdy-six.vercel.app/poptavka?zkouska=1',
    );
  });

  it('má předmět a tlačítko ve všech 13 jazycích', () => {
    for (const lang of GUIDE_LANGS) {
      expect(PREDMET_PODEKOVANI[lang]).toMatch(/^VIVIEN/);
      expect(tlacitkoPodekovani(lang).length).toBeGreaterThan(3);
    }
    expect(PREDMET_PODEKOVANI.en).toBe('VIVIEN · Thank you for your visit');
    expect(PREDMET_PODEKOVANI.fi).toBe('VIVIEN · Kiitos vierailustanne');
  });

  it('český HTML má hlavičku, podpis, tři klikací řádky a bez starého CTA', () => {
    const html = htmlPodekovaniEmail('cs', 'https://vivien-prijezdy-six.vercel.app/abc');
    expect(html).toContain('hlavicka-po-odjezdu.jpg');
    expect(html).not.toContain('va-logo-192.png');
    expect(html).not.toContain('zahrada-po-odjezdu.jpg');
    expect(html).toContain('Děkujeme za návštěvu');
    expect(html).toContain('Nikol a rodina VIVIEN');
    expect(html).toContain('Jako poděkování jsme pro vás připravili 3\u00a0výhody:');
    expect(html).not.toContain('Využít výhody');
    expect(html).toContain('Rezervovat ›');
    expect(html).toContain('Poslat ›');
    expect(html).toContain('Přidat ›');
    expect(html).toContain('/poptavka?t=');
    expect(html).toContain('doporucit=1');
    expect(html).toContain('plocha=1');
    expect(html).toContain('5&nbsp;%');
    expect(html).toContain('https://vivien-prijezdy-six.vercel.app/email/hlavicka-po-odjezdu.jpg');
    expect(html).toContain('https://vivien-prijezdy-six.vercel.app/email/ikona-kalendar.png');
    expect(html).toContain('alt=""');
    expect(html).toContain('ikona-hovor.png');
    expect(html).toContain('tel:+420702153573');
    expect(html).toContain('tel:+420604692573');
    expect(html).toContain('text-align:center');
    expect(html).toContain('#c9a84c');
    expect(html).toContain('color:#1a1510');
    expect(html).not.toContain('127.0.0.1');
    expect(html).not.toContain('localhost');
    expect(html).not.toContain('Zkouška Preview');
  });

  it('prostý text obsahuje odkazy na výhody', () => {
    const text = textPodekovaniEmail('cs', 'https://priklad.cz/t');
    expect(text).toContain('https://priklad.cz/t');
    expect(text).toContain('doporucit=1');
    expect(text).toContain('plocha=1');
    expect(text).not.toContain('Využít výhody');
    expect(text).toContain('Nechcete od nás další e-maily? Stačí odpovědět NE.');
  });

  it('HTML má větu o odhlášení na konci', () => {
    const html = htmlPodekovaniEmail('cs', 'https://vivien-prijezdy-six.vercel.app/abc');
    expect(html).toContain('Nechcete od nás další e-maily? Stačí odpovědět NE.');
    expect(html).toContain('color:#8a7f72');
  });

  it('s klubem má řádek VIVIEN Club místo velké kartičky', () => {
    const html = htmlPodekovaniEmail(
      'cs',
      'https://vivien-prijezdy-six.vercel.app/abc',
      undefined,
      undefined,
      undefined,
      undefined,
      {
        odkazKarty: 'https://vivien-prijezdy-six.vercel.app/klub?k=ukazka-host-po',
        jmeno: 'Jana Nováková',
        urovenId: 'staly',
        urovenNazev: 'Věrný host',
        slevaPct: 6,
        urovenNova: true,
        dalsiNazev: 'Bronzový host',
        dalsiPct: 7,
        chybiKc: 6400,
        pruhPct: 60,
      },
    );
    expect(html).not.toContain('karticka-staly.png');
    expect(html).not.toContain('Otevřít moji kartu');
    expect(html).toContain('VIVIEN Club');
    expect(html).toContain('vaše karta a výhody');
    expect(html).toContain('Věrný host');
    expect(html).toContain('Váš pobyt jsme započítali');
    expect(html).toContain('Tímto pobytem máte úroveň');
    expect(html).toContain('/klub?k=ukazka-host-po');
    expect(html).not.toContain('Jako poděkování jsme pro vás připravili 3');
  });

  it('stříbrná karta z podkladu se jménem a Prohlédnout kartu', () => {
    const html = htmlPodekovaniEmail(
      'cs',
      'https://vivien-prijezdy-six.vercel.app/abc',
      undefined,
      undefined,
      undefined,
      undefined,
      {
        odkazKarty: 'https://vivien-prijezdy-six.vercel.app/klub?k=ukazka-host-po',
        jmeno: 'Anna Šťastná',
        urovenId: 'host',
        urovenNazev: 'Náš host',
        slevaPct: 5,
        booking: true,
        kartaReprezentacni: true,
        textPodKartou: 'Pro hosty máme nový VIVIEN Club. Klepněte na kartu a uvidíte své výhody.',
        navrhKarty: 1,
      },
    );
    expect(html).toContain('karticka-stribrny-web-blank.png');
    expect(html).toContain('Anna Šťastná');
    expect(html).toContain('Vaše osobní karta VIVIEN Clubu');
    expect(html).toContain('Prohlédnout kartu');
    expect(html).toContain('Zjistit více');
    expect(html).toContain('Pro hosty máme nový VIVIEN Club');
    expect(html).toContain('/klub?k=ukazka-host-po');
    // Karta i řádek s logem (ať je jasné klepnutí).
    expect(html).toContain('vaše karta a výhody');
    expect(html).toContain('va-logo-192.png');
  });

  it('zlatá karta bere zlatý podklad', () => {
    const html = htmlPodekovaniEmail(
      'cs',
      'https://vivien-prijezdy-six.vercel.app/abc',
      undefined,
      undefined,
      undefined,
      undefined,
      {
        odkazKarty: 'https://vivien-prijezdy-six.vercel.app/klub?k=ukazka-host-po',
        jmeno: 'Anna Šťastná',
        urovenId: 'host',
        urovenNazev: 'Náš host',
        slevaPct: 5,
        booking: true,
        kartaReprezentacni: true,
        kartaBarva: 'zlata',
      },
    );
    expect(html).toContain('karticka-zlaty-web-blank.png');
    expect(html).toContain('Anna Šťastná');
    expect(html).toContain('Prohlédnout kartu');
  });
});
