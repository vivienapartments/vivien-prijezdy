import { chybejiciKroky, type ChybejiciKrok } from './vstup-pruvodce';

export type FazeId = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type FazeTon = 'cervena' | 'oranzova' | 'zelena' | 'seda';

export type FazeHosta = {
  id: FazeId;
  text: string;
  ton: FazeTon;
};

const NAZEV: Record<ChybejiciKrok, string> = {
  cas: 'čas',
  zpusob: 'způsob příjezdu',
  pravidla: 'pravidla',
};

export type FazeVstup = {
  stav: string;
  otevrenoPocet: number | null;
  cas: string | null;
  zpusob: 'auto' | 'pesky' | null;
  telefonBrana: string | null;
  spz: string | null;
  spzPujcene: boolean;
  souhlas: boolean;
  naMiste: boolean;
  /** Hodina předání, třeba 15:42. Prázdné, když předáno není. */
  predano: string;
  odjezd: string | null;
  dnes: string;
  /** Hodina převzetí, třeba 10:15. Když je vyplněná, host už odjel i v den odjezdu. */
  prevzato?: string;
};

/** Jen aktuální krok. Pozdější štítky se neukazují, dokud host v té fázi není. */
export function fazeHosta(v: FazeVstup): FazeHosta {
  if (v.stav === 'zruseno') return { id: 7, text: 'Zrušeno', ton: 'seda' };
  if (v.prevzato) return { id: 7, text: `Odjel ${v.prevzato}`, ton: 'seda' };
  if (v.odjezd && v.dnes && v.odjezd < v.dnes) return { id: 7, text: 'Odjel', ton: 'seda' };
  if (v.predano) return { id: 6, text: `Předáno ${v.predano}`, ton: 'zelena' };
  if (v.naMiste) return { id: 5, text: 'Host je na místě', ton: 'zelena' };
  if (v.stav === 'bez_checkinu') return { id: 1, text: 'Čeká na check-in', ton: 'cervena' };

  const otevren = (v.otevrenoPocet ?? 0) > 0;
  if (!otevren) return { id: 2, text: 'Check-in hotový · průvodce neotevřen', ton: 'cervena' };

  const chybi = chybejiciKroky({
    cas: v.cas,
    zpusob: v.zpusob,
    telefonBrana: v.telefonBrana,
    spz: v.spz,
    spzPujcene: v.spzPujcene,
    souhlas: v.souhlas,
  });
  if (chybi.length) {
    return {
      id: 3,
      text: `Průvodce otevřen · chybí: ${chybi.map((krok) => NAZEV[krok]).join(', ')}`,
      ton: 'oranzova',
    };
  }

  const jak = v.zpusob === 'auto' ? 'autem' : v.zpusob === 'pesky' ? 'pěšky' : '';
  const kusy = ['Průvodce rozbalen'];
  if (v.cas) kusy.push(`příjezd kolem ${v.cas}`);
  if (jak) kusy.push(jak);
  return { id: 4, text: kusy.join(' · '), ton: 'zelena' };
}
