import { describe, expect, it } from 'vitest';
import { GUIDE_LANGS } from './types';
import {
  formatDatumPoptavky,
  formatRozsahPoptavky,
  poptavkaTexty,
  type PoptavkaTexty,
} from './poptavka-texty';
import { POPTAVKA_VERNOST_LANGS } from './poptavka-texty-vernost';

const KLICE: (keyof PoptavkaTexty)[] = [
  'nadpis',
  'uvod',
  'firmaRadek',
  'sleva',
  'cenaPozdeji',
  'krokTermin',
  'krokZpusob',
  'krokApartmany',
  'krokKontakt',
  'prijezd',
  'odjezd',
  'dale',
  'zpet',
  'zpusobDoporucit',
  'zpusobDoporucitPopis',
  'zpusobVybrat',
  'zpusobVybratPopis',
  'zpusobPruvodce',
  'zpusobPruvodcePopis',
  'nadpisPruvodce',
  'pruvodceVybrat',
  'pruvodceZnovu',
  'zkouskaBanner',
  'vyberteApartmany',
  'galerieKomplet',
  'kvizOtazka',
  'kvizAtmosfery',
  'vybratTento',
  'zrusitVyber',
  'zavritGalerie',
  'zpetNaVysledek',
  'jmeno',
  'telefon',
  'doprava',
  'auto',
  'pesky',
  'nevim',
  'poznamka',
  'odeslat',
  'neboOdeslatPres',
  'whatsapp',
  'sms',
  'dekujeme',
  'dekujemeVolejte',
  'nadpisZpusob',
  'nadpisApartmany',
  'nadpisKontakt',
  'nadpisOdeslano',
  'malyKrok',
  'malyPosledni',
  'zavolat',
  'zaloha',
  'chybaTermin',
  'chybaKontakt',
  'chybaApartman',
  'chybaObecna',
  'chybaBlok',
  'chybaTelefon',
];

describe('poptavkaTexty', () => {
  it('u věrnosti má všechny jazyky neprázdné povinné klíče', () => {
    expect(POPTAVKA_VERNOST_LANGS).toHaveLength(GUIDE_LANGS.length);
    for (const lang of POPTAVKA_VERNOST_LANGS) {
      const t = poptavkaTexty(lang, 'vernost');
      for (const k of KLICE) {
        if (k === 'sleva' || k === 'cenaPozdeji' || k === 'doprava' || k === 'auto' || k === 'pesky' || k === 'nevim') {
          continue;
        }
        expect(String(t[k] || '').trim().length, `${lang}.${k}`).toBeGreaterThan(0);
      }
      expect(t.kvizOtazka.trim().length).toBeGreaterThan(0);
      expect(t.dekujemeVolejte.trim().length).toBeGreaterThan(0);
      expect(t.nadpisZpusob.trim().length).toBeGreaterThan(0);
      expect(t.nadpisApartmany.trim().length).toBeGreaterThan(0);
      expect(t.nadpisKontakt.trim().length).toBeGreaterThan(0);
      expect(t.nadpisOdeslano.trim().length).toBeGreaterThan(0);
      expect(t.malyKrok).toContain('{n}');
      expect(t.malyPosledni.trim().length).toBeGreaterThan(0);
      expect(t.dekujeme.startsWith('Děkujeme.')).toBe(false);
      expect(t.nadpis).not.toBe(poptavkaTexty(lang === 'cs' ? 'cs' : 'en', 'obecna').nadpis);
    }
    expect(poptavkaTexty('pt', 'vernost').nadpis).toBe('Será um prazer voltar a ver-vos');
    expect(poptavkaTexty('cs', 'vernost').nadpisOdeslano).toBe('Děkujeme, že se k nám vracíte.');
  });

  it('obecná / firma drží staré CS a EN', () => {
    expect(poptavkaTexty('cs', 'obecna').nadpis).toBe('Další pobyt u nás');
    expect(poptavkaTexty('cs', 'firma').sleva).toContain('5');
    expect(poptavkaTexty('en', 'doporucitel').nadpis).toBe('We look forward to welcoming you');
    expect(poptavkaTexty('en', 'doporucitel').sleva).toBe('');
    expect(poptavkaTexty('en', 'obecna').dekujemeVolejte).toBe('');
  });

  it('formátuje datum podle jazyka', () => {
    expect(formatDatumPoptavky('2026-12-12', 'cs')).toMatch(/12/);
    expect(formatDatumPoptavky('2026-12-12', 'cs')).toContain('2026');
  });

  it('zkracuje rozsah termínu (cs)', () => {
    expect(formatRozsahPoptavky('2026-11-23', '2026-11-28', 'cs')).toBe('23.–28. 11. 2026');
    expect(formatRozsahPoptavky('2026-11-30', '2026-12-02', 'cs')).toBe('30. 11. – 2. 12. 2026');
    expect(formatRozsahPoptavky('2026-12-30', '2027-01-02', 'cs')).toBe(
      '30. 12. 2026 – 2. 1. 2027',
    );
  });

  it('rozsah termínu v jiném jazyku přes formatRange se zkratkou měsíce', () => {
    const en = formatRozsahPoptavky('2026-12-10', '2026-12-12', 'en');
    expect(en).toMatch(/10\s*[–-]\s*12 Dec 2026/);
    expect(en).not.toMatch(/\d+\/\d+\/\d+/);
    const de = formatRozsahPoptavky('2026-11-23', '2026-11-28', 'de');
    expect(de).toMatch(/23/);
    expect(de).toMatch(/28/);
    expect(de).toContain('2026');
    expect(de.toLowerCase()).toMatch(/nov|dez/);
  });

  it('GUIDE_LANGS pokrývá věrnostní mapu', () => {
    for (const lang of GUIDE_LANGS) {
      expect(poptavkaTexty(lang, 'vernost').nadpis.length).toBeGreaterThan(0);
    }
  });
});
