import { describe, expect, it } from 'vitest';
import { fazeHosta, type FazeVstup } from './faze-hosta';

function zaklad(pres: Partial<FazeVstup> = {}): FazeVstup {
  return {
    stav: 'odeslano',
    otevrenoPocet: 0,
    cas: null,
    zpusob: null,
    telefonBrana: null,
    spz: null,
    spzPujcene: false,
    souhlas: false,
    naMiste: false,
    predano: '',
    odjezd: '2026-10-18',
    dnes: '2026-10-15',
    ...pres,
  };
}

describe('fáze hosta', () => {
  it('má sedm kroků a host bez check-inu nevidí pravidla', () => {
    const ceka = fazeHosta(zaklad({ stav: 'bez_checkinu', souhlas: false }));
    expect(ceka).toEqual({ id: 1, text: 'Čeká na check-in', ton: 'cervena' });
    expect(ceka.text).not.toContain('pravidla');

    expect(fazeHosta(zaklad()).text).toBe('Check-in hotový · průvodce neotevřen');

    const otevren = fazeHosta(zaklad({ otevrenoPocet: 2, cas: '16:30' }));
    expect(otevren.id).toBe(3);
    expect(otevren.ton).toBe('oranzova');
    expect(otevren.text).toBe('Průvodce otevřen · chybí: způsob příjezdu, pravidla');

    expect(
      fazeHosta(
        zaklad({ otevrenoPocet: 1, cas: '18:00', zpusob: 'pesky', souhlas: true }),
      ).text,
    ).toBe('Průvodce rozbalen · příjezd kolem 18:00 · pěšky');

    expect(fazeHosta(zaklad({ naMiste: true, stav: 'bez_checkinu' })).text).toBe('Host je na místě');
    expect(fazeHosta(zaklad({ predano: '15:42', stav: 'bez_checkinu' })).text).toBe('Předáno 15:42');
    expect(fazeHosta(zaklad({ odjezd: '2026-10-14', predano: '15:42' })).text).toBe('Odjel');
  });
});
