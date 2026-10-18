import { describe, expect, it } from 'vitest';
import { prazdnaRezervace } from './store';
import {
  normalizujTextZavad,
  overTokenZavad,
  potvrdZavady,
  stavZavadText,
  textEmailuZavad,
  vytvorTokenZavad,
} from './zavady-predani';

describe('zavady-predani', () => {
  it('normalizuje text a odmítne prázdný', () => {
    expect(normalizujTextZavad('  okraj  ')).toBe('okraj');
    expect(normalizujTextZavad('   ')).toBeNull();
  });

  it('token jde ověřit a cizí podpis neprojde', () => {
    process.env.PRUVODCE_TOKEN_SECRET = 'x'.repeat(32);
    const token = vytvorTokenZavad('120260001', '2026-10-18T12:00:00.000Z');
    expect(overTokenZavad(token)).toEqual({
      ok: true,
      rezervace: '120260001',
      odeslanoKdy: '2026-10-18T12:00:00.000Z',
    });
    expect(overTokenZavad(token.slice(0, -2) + 'aa')).toEqual({ ok: false });
  });

  it('e-mail má schválené znění A', () => {
    expect(textEmailuZavad('cs', 'Škrábanec na stole')).toBe(
      'Dobrý den, při předání apartmánu jsme zapsali:\n\nŠkrábanec na stole\n\nPotvrďte prosím tlačítkem níže.',
    );
  });

  it('potvrzení zapíše čas jen jednou', () => {
    const odeslano = '2026-10-18T12:00:00.000Z';
    const zaklad = {
      ...prazdnaRezervace('1', odeslano),
      zavadyPredani: { text: 'Skvrna', odeslanoKdy: odeslano, potvrzenoKdy: null },
    };
    const ted = new Date('2026-10-18T12:05:00.000Z');
    const po = potvrdZavady(zaklad, odeslano, ted);
    expect(po?.zavadyPredani?.potvrzenoKdy).toBe(ted.toISOString());
    expect(po?.historie.some((h) => h.co === 'Host potvrdil závady z předání')).toBe(true);
    expect(stavZavadText(po?.zavadyPredani)).toBe('Závady potvrzeny');

    const znovu = potvrdZavady(po!, odeslano, new Date('2026-10-18T13:00:00.000Z'));
    expect(znovu?.zavadyPredani?.potvrzenoKdy).toBe(ted.toISOString());
    expect(stavZavadText({ text: 'x', odeslanoKdy: odeslano, potvrzenoKdy: null })).toBe(
      'Závady · čeká na potvrzení',
    );
  });
});
