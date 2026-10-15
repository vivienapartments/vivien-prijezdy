import type { NavrhPole, OdkudNavrh, RezervaceRecord, RucniPole, RucniZnacka } from './store';
import { textTelefonu } from './telefon';

export type { NavrhPole, OdkudNavrh, RucniPole, RucniZnacka };

/** Pole, která po „Opravit a odeslat“ automat nesmí přepsat, i u starších řádků. */
const STARA_OCHRANA = new Set<RucniPole>([
  'emailHosta',
  'apartman',
  'prijezd',
  'odjezd',
  'noci',
  'osob',
  'jazyk',
  'accessPin',
]);

const DOPROVOD: Partial<Record<RucniPole, (keyof RezervaceRecord)[]>> = {
  telefon: ['telefonWa', 'telefonPuvodni'],
  telefonRezervace: ['telefonRezervaceWa', 'telefonRezervacePuvodni'],
  jmeno: ['krestni'],
};

const VSECHNA: RucniPole[] = [
  'telefon',
  'telefonRezervace',
  'casPrijezdu',
  'checkinUrl',
  'jmeno',
  'emailHosta',
  'apartman',
  'prijezd',
  'odjezd',
  'noci',
  'osob',
  'jazyk',
  'predano',
  'priplatekRucni',
  'zaplaceno',
  'poplatekVybral',
  'accessPin',
];

export function jeRucniPole(klic: string): klic is RucniPole {
  return (VSECHNA as string[]).includes(klic);
}

function staraOprava(rec: RezervaceRecord): boolean {
  return rec.historie.some((h) => h.co.startsWith('Údaje opraveny') || h.co.startsWith('Opraveno a odesláno'));
}

/** Majitel tohle pole uložil. Automat ho nesmí přepsat. */
export function maRucni(rec: RezervaceRecord | null | undefined, pole: RucniPole): boolean {
  if (!rec) return false;
  if (rec.rucniZnacky?.some((z) => z.pole === pole)) return true;
  return STARA_OCHRANA.has(pole) && staraOprava(rec);
}

export function oznacRucni(rec: RezervaceRecord, pole: RucniPole[], cas: string): RucniZnacka[] {
  const bez = (rec.rucniZnacky || []).filter((z) => !pole.includes(z.pole));
  return [...bez, ...pole.map((p) => ({ pole: p, cas }))];
}

export function bezNavrhu(rec: RezervaceRecord, pole: RucniPole[]): NavrhPole[] {
  return (rec.navrhy || []).filter((n) => !pole.includes(n.pole));
}

/**
 * Z dat, která chce zapsat automat, vyhodí pole zamčená majitelem.
 * Jinou hodnotu schová jako návrh. Majitelovu hodnotu nechá být.
 */
export function vynechRucni(
  prev: RezervaceRecord | null | undefined,
  data: Partial<RezervaceRecord>,
  od: OdkudNavrh,
): Partial<RezervaceRecord> {
  if (!prev) return data;
  const out: Partial<RezervaceRecord> = { ...data };
  let navrhy = [...(prev.navrhy || [])];
  let zmena = false;
  for (const klic of Object.keys(out) as (keyof RezervaceRecord)[]) {
    if (!jeRucniPole(klic) || !maRucni(prev, klic)) continue;
    const nove = out[klic];
    const stare = prev[klic];
    delete out[klic];
    for (const d of DOPROVOD[klic] || []) delete out[d];
    const text = nove == null ? '' : String(nove);
    const puvodni = stare == null ? '' : String(stare);
    if (text && text !== puvodni) {
      const stejny = navrhy.some((n) => n.pole === klic && n.od === od && n.hodnota === text);
      if (!stejny) {
        navrhy = navrhy.filter((n) => n.pole !== klic);
        navrhy.push({ pole: klic, od, hodnota: text });
        zmena = true;
      }
    }
  }
  if (zmena) out.navrhy = navrhy;
  return out;
}

/** Uložení z přehledu. Pole je od teď zamčené a starý návrh zmizí. */
export function zapisMajitele(
  rec: RezervaceRecord,
  pole: RucniPole | RucniPole[],
  patch: Partial<RezervaceRecord>,
  co: string,
): RezervaceRecord {
  const cas = new Date().toISOString();
  const seznam = Array.isArray(pole) ? pole : [pole];
  return {
    ...rec,
    ...patch,
    rucniZnacky: oznacRucni(rec, seznam, cas),
    navrhy: bezNavrhu(rec, seznam),
    posledniPokus: cas,
    historie: co ? [...rec.historie, { cas, co }].slice(-40) : rec.historie,
  };
}

export function vetaNavrhu(n: NavrhPole): string {
  if (n.pole === 'casPrijezdu') {
    const cas = n.hodnota === 'po20' ? 'po 20:00' : n.hodnota;
    return n.od === 'host' ? `Host zadal ${cas}` : `Jiný čas: ${cas}`;
  }
  if (n.pole === 'telefon' || n.pole === 'telefonRezervace') {
    const kdo =
      n.od === 'host' ? 'Host' : n.od === 'rezervace' ? 'Rezervace' : n.od === 'potvrzeni' ? 'Potvrzení' : 'Check-in';
    return `${kdo} uvádí jiné číslo: ${textTelefonu(n.hodnota)}`;
  }
  const kdo = n.od === 'host' ? 'Host' : n.od === 'rezervace' ? 'Rezervace' : n.od === 'potvrzeni' ? 'Potvrzení' : 'Check-in';
  return `${kdo} uvádí jinou hodnotu: ${n.hodnota}`;
}

/** Majitel tlačítkem převezme návrh. Pak je to zase jeho hodnota. */
export function prevzitNavrh(rec: RezervaceRecord, pole: RucniPole): RezervaceRecord | null {
  const n = (rec.navrhy || []).find((x) => x.pole === pole);
  if (!n) return null;
  const patch: Partial<RezervaceRecord> = {};
  if (pole === 'osob' || pole === 'noci') {
    const cislo = Number(n.hodnota);
    if (!Number.isFinite(cislo)) return null;
    patch[pole] = cislo;
  } else if (pole === 'casPrijezdu') {
    patch.casPrijezdu = n.hodnota === 'po20' || /^\d{2}:\d{2}$/.test(n.hodnota) ? n.hodnota : null;
    patch.casZadalHost = false;
  } else if (pole === 'predano') {
    patch.predano = n.hodnota || null;
  } else if (pole === 'zaplaceno') {
    patch.zaplaceno = n.hodnota || null;
  } else if (pole === 'poplatekVybral') {
    patch.poplatekVybral = n.hodnota === 'ja' || n.hodnota === 'nikol' ? n.hodnota : null;
  } else if (pole === 'telefon') {
    patch.telefon = n.hodnota;
  } else if (pole === 'telefonRezervace') {
    patch.telefonRezervace = n.hodnota;
  } else if (pole === 'jmeno') {
    patch.jmeno = n.hodnota;
  } else if (pole === 'emailHosta') {
    patch.emailHosta = n.hodnota;
  } else if (pole === 'apartman') {
    patch.apartman = n.hodnota as RezervaceRecord['apartman'];
  } else if (pole === 'prijezd') {
    patch.prijezd = n.hodnota;
  } else if (pole === 'odjezd') {
    patch.odjezd = n.hodnota;
  } else if (pole === 'jazyk') {
    patch.jazyk = n.hodnota as RezervaceRecord['jazyk'];
  } else if (pole === 'checkinUrl') {
    patch.checkinUrl = n.hodnota;
  } else if (pole === 'accessPin') {
    patch.accessPin = n.hodnota;
  }
  return zapisMajitele(rec, pole, patch, `Převzato. ${vetaNavrhu(n)}`);
}

/**
 * Starší řádky ruční telefon do historie nepsaly, takže ho z ní nejde vrátit.
 * Vrátí jen pole, u kterých historie má ruční zápis a aktuální hodnota je jiná.
 */
export function coVratitZHistorie(rec: RezervaceRecord): { pole: RucniPole; hodnota: string }[] {
  const out: { pole: RucniPole; hodnota: string }[] = [];
  for (const h of rec.historie) {
    const cas = h.co.match(/^Čas příjezdu .+ → (\d{2}:\d{2}|po 20:00|žádný)$/);
    if (!cas) continue;
    const pozdeji = rec.historie.some(
      (d) => d.cas > h.cas && (d.co.startsWith('Doplněno z check-inu') || d.co.includes('Host zadal')),
    );
    if (!pozdeji) continue;
    const hodnota = cas[1] === 'po 20:00' ? 'po20' : cas[1] === 'žádný' ? '' : cas[1];
    if ((rec.casPrijezdu || '') !== hodnota) out.push({ pole: 'casPrijezdu', hodnota });
  }
  const tel = rec.historie.filter((h) => h.co.startsWith('Telefon ') && h.co.includes(' → '));
  const posledni = tel[tel.length - 1];
  if (posledni) {
    const cil = posledni.co.split(' → ').pop()?.trim() || '';
    const pozdeji = rec.historie.some(
      (d) => d.cas > posledni.cas && d.co.startsWith('Doplněno z check-inu') && d.co.includes('telefon'),
    );
    if (pozdeji && cil && textTelefonu(rec.telefon || '') !== cil && textTelefonu(rec.telefonRezervace || '') !== cil) {
      out.push({ pole: 'telefon', hodnota: cil });
    }
  }
  return out;
}
