import { nightsBetween } from './dates';
import {
  hostZRezervace,
  jmenoUklidu,
  sestavDnesek,
  type KdoUklidil,
  type UklidRadek,
} from './dnesek';
import { jeHodina, zobrazCas } from './odjezd';
import type { RezervaceRecord } from './store';

export type UklidEmailStav = 'muze' | 'odeslano' | 'bez_emailu' | 'skryt';

export type UklidKarta = {
  apartman: string;
  rezervace: string;
  poradi: number | null;
  poradiStitek: string;
  odjezdText: string;
  dalsiText: string;
  poznamka: string | null;
  uklizeno: boolean;
  uklizenoKdy: string | null;
  uklizenoText: string | null;
  muzeUklidit: boolean;
  dalsiRezervace: string | null;
  emailHostovi: {
    stav: UklidEmailStav;
    odeslanoText: string | null;
  };
};

export type UklidDenOdpoved = {
  den: string;
  karty: UklidKarta[];
  pocetKUklidu: number;
};

const ZAKAZANA = [
  'pin',
  'accessPin',
  'email',
  'emailHosta',
  'telefon',
  'telefonWa',
  'telefonBrana',
  'jmeno',
  'krestni',
  'historie',
  'prani',
  'platba',
  'platby',
  'wifi',
  'kod',
  'zprava',
  'whatsapp',
] as const;

export function uzPoslanPripravenoEmail(rec: RezervaceRecord | null | undefined): boolean {
  if (!rec) return false;
  return rec.historie.some((h) => /E-mailem:\s*Apartmán je připravený/i.test(h.co));
}

export function casPrahaKratky(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Prague',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(t));
  const hod = parts.find((p) => p.type === 'hour')?.value || '';
  const min = parts.find((p) => p.type === 'minute')?.value || '';
  if (!hod || !min) return '';
  return zobrazCas(`${hod}:${min}`);
}

function sklonOsob(n: number | null): string | null {
  if (n == null || !Number.isFinite(n) || n < 1) return null;
  if (n === 1) return '1 osoba';
  if (n >= 2 && n <= 4) return `${n} osoby`;
  return `${n} osob`;
}

function sklonNoci(n: number | null): string | null {
  if (n == null || !Number.isFinite(n) || n < 1) return null;
  if (n === 1) return '1 noc';
  if (n >= 2 && n <= 4) return `${n} noci`;
  return `${n} nocí`;
}

export function textOdjezduUklid(r: UklidRadek): string {
  if (r.prevzato) {
    const m = r.casOdjezduText.match(/převzato\s+(.+)/i);
    if (m) return `převzato ${m[1]} ✓`;
    return 'převzato ✓';
  }
  if (jeHodina(r.casOdjezduText) || /^\d{1,2}:\d{2}$/.test(r.casOdjezduText)) {
    return `kolem ${zobrazCas(r.casOdjezduText)} · ještě nepřevzato`;
  }
  if (r.casOdjezduText === 'čas neznámý') {
    return 'čas neznámý · ještě nepřevzato';
  }
  return `${r.casOdjezduText} · ještě nepřevzato`;
}

function textDalsiho(
  r: UklidRadek,
  dalsi: RezervaceRecord | null,
  den: string,
): string {
  if (!r.maPrijezd || !dalsi) return 'dnes nikdo nepřijede';
  const cas =
    dalsi.casPrijezdu && jeHodina(dalsi.casPrijezdu)
      ? zobrazCas(dalsi.casPrijezdu)
      : r.prijezdCas && jeHodina(r.prijezdCas)
        ? zobrazCas(r.prijezdCas)
        : null;
  const casti = [cas ? `dnes ${cas}` : 'dnes, čas neznámý'];
  const osob = sklonOsob(dalsi.osob);
  if (osob) casti.push(osob);
  const noci =
    sklonNoci(dalsi.noci) ||
    (dalsi.prijezd && dalsi.odjezd ? sklonNoci(nightsBetween(dalsi.prijezd, dalsi.odjezd)) : null);
  if (noci) casti.push(noci);
  void den;
  return casti.join(' · ');
}

function emailStav(
  uklizeno: boolean,
  dalsi: RezervaceRecord | null,
  den: string,
): { stav: UklidEmailStav; odeslanoText: string | null } {
  if (!uklizeno || !dalsi || dalsi.prijezd !== den || dalsi.predano) {
    return { stav: 'skryt', odeslanoText: null };
  }
  if (uzPoslanPripravenoEmail(dalsi)) {
    const hit = dalsi.historie.find((h) => /E-mailem:\s*Apartmán je připravený/i.test(h.co));
    const cas = hit ? casPrahaKratky(hit.cas) : '';
    return {
      stav: 'odeslano',
      odeslanoText: cas ? `E-mail odeslán ${cas} ✓` : 'E-mail odeslán ✓',
    };
  }
  const email = (dalsi.emailHosta || '').trim();
  if (!email) return { stav: 'bez_emailu', odeslanoText: null };
  return { stav: 'muze', odeslanoText: null };
}

function poradiStitek(r: UklidRadek, indexAktivni: number): string {
  if (r.uklizenoKdy) {
    const cas = casPrahaKratky(r.uklizenoKdy);
    return cas ? `Uklizeno ${cas}` : 'Uklizeno';
  }
  if (r.prvni || indexAktivni === 0) return 'Uklidit první';
  return `${indexAktivni + 1}. v pořadí`;
}

/** Složí karty úklidu. Jedno načtení seznamu, žádná citlivá pole. */
export function sestavUklidDen(
  zaznamy: RezervaceRecord[],
  den: string,
  now = new Date(),
): UklidDenOdpoved {
  const podleId = new Map(zaznamy.map((r) => [r.rezervace, r]));
  const pohled = sestavDnesek(zaznamy.map(hostZRezervace), den, now);
  const aktivniIndexy = new Map<string, number>();
  let ai = 0;
  for (const r of pohled.uklid) {
    if (!r.uklizenoKdy) {
      aktivniIndexy.set(r.rezervace, ai);
      ai += 1;
    }
  }

  const karty: UklidKarta[] = pohled.uklid.map((r) => {
    const dalsi = r.dalsiRezervace ? podleId.get(r.dalsiRezervace) || null : null;
    const odjezd = podleId.get(r.rezervace) || null;
    const poznamka = (dalsi?.poznamkaUklid || '').trim() || null;
    const uklizeno = Boolean(r.uklizenoKdy);
    const kdo = (r.uklizenoKdo || odjezd?.uklizenoKdo || null) as KdoUklidil | null;
    const ix = aktivniIndexy.get(r.rezervace);
    const email = emailStav(uklizeno, dalsi, den);
    const prevzato = Boolean(r.prevzato || odjezd?.prevzatoKdy);
    const casUklidu = r.uklizenoKdy ? casPrahaKratky(r.uklizenoKdy) : '';
    return {
      apartman: r.apartman,
      rezervace: r.rezervace,
      poradi: ix ?? null,
      poradiStitek: poradiStitek(r, ix ?? 0),
      odjezdText: textOdjezduUklid(r),
      dalsiText: textDalsiho(r, dalsi, den),
      poznamka,
      uklizeno,
      uklizenoKdy: r.uklizenoKdy,
      uklizenoText:
        r.uklizenoKdy && kdo
          ? casUklidu
            ? `Uklizeno ${casUklidu} · ${jmenoUklidu(kdo)}`
            : `Uklizeno · ${jmenoUklidu(kdo)}`
          : null,
      muzeUklidit: !uklizeno && prevzato,
      dalsiRezervace: r.dalsiRezervace,
      emailHostovi: email,
    };
  });

  return {
    den,
    karty,
    pocetKUklidu: karty.filter((k) => !k.uklizeno).length,
  };
}

/** Test: odpověď nesmí obsahovat zakázaná pole. */
export function obsahujeZakazanaPole(data: unknown): string[] {
  const json = JSON.stringify(data);
  const nalezena: string[] = [];
  for (const k of ZAKAZANA) {
    if (new RegExp(`"${k}"\\s*:`, 'i').test(json)) nalezena.push(k);
  }
  return nalezena;
}

export function textRanoUklid(karty: UklidKarta[]): string | null {
  const apt = karty.filter((k) => !k.uklizeno).map((k) => k.apartman);
  if (!apt.length) return null;
  return `Dnes uklidit: ${apt.join(', ')}`;
}
