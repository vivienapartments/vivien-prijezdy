import { describe, expect, it } from 'vitest';
import { GUIDE_LANGS } from './types';
import { formatDatumPoptavky, poptavkaTexty, type PoptavkaTexty } from './poptavka-texty';
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
  'vyberteApartmany',
  'galerieKomplet',
  'kvizOtazka',
  'kvizAtmosfery',
  'vybratTento',
  'zrusitVyber',
  'zavritGalerie',
  'jmeno',
  'telefon',
  'doprava',
  'auto',
  'pesky',
  'nevim',
  'poznamka',
  'odeslat',
  'whatsapp',
  'sms',
  'dekujeme',
  'dekujemeSpecha',
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
];

describe('poptavkaTexty', () => {
  it('u věrnosti má všech 13 jazyků neprázdné povinné klíče', () => {
    expect(POPTAVKA_VERNOST_LANGS).toHaveLength(13);
    for (const lang of POPTAVKA_VERNOST_LANGS) {
      const t = poptavkaTexty(lang, 'vernost');
      for (const k of KLICE) {
        if (k === 'sleva' || k === 'cenaPozdeji' || k === 'doprava' || k === 'auto' || k === 'pesky' || k === 'nevim') {
          continue;
        }
        expect(String(t[k] || '').trim().length, `${lang}.${k}`).toBeGreaterThan(0);
      }
      expect(t.kvizOtazka.trim().length).toBeGreaterThan(0);
      expect(t.dekujemeSpecha.trim().length).toBeGreaterThan(0);
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
    expect(poptavkaTexty('en', 'doporucitel').kvizOtazka).toBe('');
    expect(poptavkaTexty('en', 'obecna').dekujemeSpecha).toBe('');
  });

  it('formátuje datum podle jazyka', () => {
    expect(formatDatumPoptavky('2026-12-12', 'cs')).toMatch(/12/);
    expect(formatDatumPoptavky('2026-12-12', 'cs')).toContain('2026');
  });

  it('GUIDE_LANGS pokrývá věrnostní mapu', () => {
    for (const lang of GUIDE_LANGS) {
      expect(poptavkaTexty(lang, 'vernost').nadpis.length).toBeGreaterThan(0);
    }
  });
});
