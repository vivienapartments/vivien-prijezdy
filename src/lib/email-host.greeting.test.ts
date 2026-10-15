import { describe, expect, it } from 'vitest';
import { buildGuestEmail, EMAIL_STARA_CS, greetingLine, skladbaEmailu } from './email-host';
import { cleanGuestFirstName, parseVivienData } from './vivien-data';

describe('greetingLine', () => {
  it('čech v 5. pádu, slovenština v 1. pádu, cizí jméno bez oslovení', () => {
    expect(greetingLine('cs', 'Petr', 'CZE')).toBe('Dobrý den, Petře,');
    expect(greetingLine('cs', 'Jana', 'CZE')).toBe('Dobrý den, Jano,');
    expect(greetingLine('cs', 'Marie', 'CZE')).toBe('Dobrý den, Marie,');
    expect(greetingLine('cs', 'Tomáš', 'CZE')).toBe('Dobrý den, Tomáši,');
    expect(greetingLine('cs', 'Jiří', 'CZE')).toBe('Dobrý den, Jiří,');
    expect(greetingLine('cs', 'Eva', 'CZE')).toBe('Dobrý den, Evo,');
    expect(greetingLine('cs', 'Anna', 'CZE')).toBe('Dobrý den, Anno,');
    expect(greetingLine('cs', 'Lucie', 'CZE')).toBe('Dobrý den, Lucie,');
    expect(greetingLine('cs', 'Kateřina', 'CZE')).toBe('Dobrý den, Kateřino,');
    expect(greetingLine('cs', 'Martin', 'CZE')).toBe('Dobrý den, Martine,');
    expect(greetingLine('cs', 'Lukáš', 'CZE')).toBe('Dobrý den, Lukáši,');
    expect(greetingLine('cs', 'Jan', 'CZE')).toBe('Dobrý den, Jane,');
    expect(greetingLine('cs', 'John', 'CZE')).toBe('Dobrý den,');
    expect(greetingLine('cs', 'Sophie', 'CZE')).toBe('Dobrý den,');
    expect(greetingLine('cs', 'Hans', 'CZE')).toBe('Dobrý den,');
    expect(greetingLine('cs', 'Anna-Marie', 'CZE')).toBe('Dobrý den,');
    expect(greetingLine('cs', 'Peter', 'SVK')).toBe('Dobrý den, Peter,');
    expect(greetingLine('cs', 'Zuzana', 'SVK')).toBe('Dobrý den, Zuzana,');
    expect(greetingLine('cs', 'Marie', null)).toBe('Dobrý den,');
    expect(greetingLine('de', 'Hans')).toBe('Guten Tag Hans,');
    expect(greetingLine('sv', 'Erik', 'SWE')).toBe('Hej Erik,');
    expect(greetingLine('hu', 'Anna', 'HUN')).toBe('Jó napot Anna,');
  });

  it('bez jména neutrální pozdrav', () => {
    expect(greetingLine('cs', null)).toBe('Dobrý den,');
    expect(greetingLine('de', '')).toBe('Guten Tag,');
    expect(greetingLine('sv', null)).toBe('Hej,');
    expect(greetingLine('hu', null)).toBe('Jó napot,');
  });
});

describe('GUEST_NAME z BH šablony', () => {
  it('parsuje GUEST_NAME', () => {
    const r = parseVivienData(`VIVIEN-DATA v1
REZERVACE: 1
APARTMAN: Jemná harmonie
PRIJEZD: 1.11.2026
ODJEZD: 3.11.2026
EMAIL: a@b.cz
NARODNOST: DEU
OSLOVENI: Sehr geehrter Herr Doppler
GUEST_NAME: Hans
ACCESS_PIN: 1234
KONEC`);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.jmeno).toBe('Hans');
    expect(greetingLine(r.data.jazyk, r.data.jmeno)).toBe('Guten Tag Hans,');
  });

  it('čas příjezdu je nad zlatým tlačítkem', () => {
    const { html, text, subject } = buildGuestEmail({
      lang: 'cs',
      apt: 'V1',
      prijezd: '2026-11-01',
      odjezd: '2026-11-03',
      noci: 2,
      osob: 2,
      osloveni: null,
      jmeno: 'Marie',
      guideUrl: 'http://127.0.0.1:3000/x',
      intendedTo: 'host@example.com',
    });
    expect(skladbaEmailu()).toBe('nova');
    const box = html.indexOf('Nejdůležitější: ve vašem průvodci čekají vstupní PINy');
    const tlacitko = html.indexOf('background:#c9a84c;border-radius:28px');
    const pobyt = html.indexOf('Váš pobyt');
    expect(box).toBeGreaterThan(-1);
    expect(tlacitko).toBeGreaterThan(box);
    expect(pobyt).toBeGreaterThan(tlacitko);
    expect(html).toContain('bgcolor="#f6cfc6"');
    expect(html).toContain('background-color:#f6cfc6');
    expect(html).toContain('background-image:none');
    expect(html).toContain('border:2px solid #c4554c');
    expect(html).not.toContain('linear-gradient');
    expect(html).toContain('border-radius:14px');
    expect(html).toContain('color:#1c1210');
    expect(html).toContain('white-space:nowrap');
    expect(html).toContain('display:block');
    expect(html).toContain('+420&nbsp;604&nbsp;692&nbsp;573');
    expect(html).toContain('+420&nbsp;702&nbsp;153&nbsp;573');
    expect(html).toContain('posíláme vám průvodce příjezdem');
    expect(html).toContain('VIVIEN je malý rodinný dům');
    expect(html).toContain('Check-in je od');
    expect(html).not.toContain('Napsat SMS');
    expect(html).not.toContain('Otevřete ho tlačítkem níže.');
    expect(html).toContain('Nikol a rodina VIVIEN');
    expect(text).toContain('Nejdůležitější: ve vašem průvodci čekají vstupní PINy');
    expect(text).toContain('posíláme vám průvodce příjezdem');
    expect(text).not.toContain('Wi-Fi a kódy');
    expect(EMAIL_STARA_CS.uvod).toContain('připravili jsme pro vás krátkého průvodce');
    expect(EMAIL_STARA_CS.box).toContain('Nejdůležitější je, abyste nám napsali');
    expect(EMAIL_STARA_CS.podTlacitkem).toBe('Otevřete ho tlačítkem níže.');
    const predmet = 'DŮLEŽITÉ · Váš průvodce příjezdem, bez něj nezaparkujete ani nevejdete';
    expect(subject === predmet || subject === `[TEST] ${predmet}`).toBe(true);
    expect(html).toContain(`<title>${predmet}</title>`);
  });

  it('odmítne nevyplněný merge field', () => {
    expect(cleanGuestFirstName('(GUEST_NAME)')).toBeNull();
    expect(cleanGuestFirstName('GUEST_NAME')).toBeNull();
  });
});
