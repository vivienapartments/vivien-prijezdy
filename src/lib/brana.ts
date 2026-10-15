import type { AptId } from './types';
import { telefonProBranu } from './vstup-pruvodce';

/** Konec platnosti je den odjezdu v tuto hodinu, pražský čas. */
export const BRANA_KONEC_HODINA = 16;
export const BRANA_KONEC_MINUTA = 0;
/** Registrace nejdřív tolik dní před příjezdem. */
export const BRANA_OKNO_DNI = 7;
export const BRANA_ZACATEK = '0001010000';
export const BRANA_OD = 150;
export const BRANA_DO = 169;

export const BRANA_POZICE: number[] = Array.from({ length: BRANA_DO - BRANA_OD + 1 }, (_, i) => BRANA_OD + i);

const ROZSAH: Record<AptId, readonly number[]> = {
  V1: [150, 151, 152, 153],
  V2: [154, 155, 156, 157],
  V3: [158, 159, 160, 161],
  V4: [162, 163, 164, 165],
  V5: [166, 167, 168, 169],
};

export type BranaKtery = 'hlavni' | 'druhy';

export type BranaSnimek = {
  telefon: string | null;
  konec: string | null;
  stav: 'prazdna' | 'plati';
  rezervace: string | null;
  rucni: boolean;
  ktery: BranaKtery | null;
};

export type BranaSlot = {
  pozice: number;
  telefon: string | null;
  konec: string | null;
  stav: 'prazdna' | 'ceka' | 'plati';
  rezervace: string | null;
  rucni: boolean;
  ktery: BranaKtery | null;
  cekaOd: string | null;
  predchozi: BranaSnimek | null;
};

export function prazdnySlot(pozice: number): BranaSlot {
  return {
    pozice,
    telefon: null,
    konec: null,
    stav: 'prazdna',
    rezervace: null,
    rucni: false,
    ktery: null,
    cekaOd: null,
    predchozi: null,
  };
}

export function prazdnaBrana(): BranaSlot[] {
  return BRANA_POZICE.map(prazdnySlot);
}

/** Stav z tabulky 15. 10. 2026. Čísla v ní nebyla, jen platnost. */
export function vychoziBrana(): BranaSlot[] {
  const davno = casVPraze('2026-10-14', 16, 0).toISOString();
  const sloty = BRANA_POZICE.map((pozice) => ({
    ...prazdnySlot(pozice),
    konec: davno,
    stav: 'plati' as const,
    rucni: true,
  }));
  const obsazena = (pozice: number, ymd: string, hodina: number, minuta: number) => {
    const i = sloty.findIndex((s) => s.pozice === pozice);
    sloty[i] = { ...sloty[i], konec: casVPraze(ymd, hodina, minuta).toISOString(), stav: 'plati', rucni: true };
  };
  obsazena(153, '2026-10-26', 16, 0);
  obsazena(168, '2026-10-16', 14, 0);
  return sloty;
}

export type BranaDokument = { sloty: BranaSlot[]; potvrzeno: string | null };

export function nactiDokument(raw: unknown): BranaDokument {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const d = raw as { sloty?: unknown; potvrzeno?: unknown };
    return {
      sloty: nactiBranu(d.sloty),
      potvrzeno: typeof d.potvrzeno === 'string' && d.potvrzeno ? d.potvrzeno : null,
    };
  }
  return { sloty: nactiBranu(raw), potvrzeno: null };
}

export function ukazkovaBrana(now = new Date()): BranaSlot[] {
  const sloty = prazdnaBrana();
  const konec = konecZOdjezdu(posunDen(denPraha(now), 2));
  sloty[0] = {
    ...sloty[0],
    telefon: '+420777111222',
    konec,
    stav: 'plati',
    rezervace: '9001',
    ktery: 'hlavni',
  };
  return sloty;
}

export function apartmanPozice(pozice: number): AptId | null {
  for (const apt of Object.keys(ROZSAH) as AptId[]) {
    if (ROZSAH[apt].includes(pozice)) return apt;
  }
  return null;
}

function jeSnimek(raw: unknown): raw is BranaSnimek {
  if (!raw || typeof raw !== 'object') return false;
  const s = raw as BranaSnimek;
  return s.stav === 'prazdna' || s.stav === 'plati';
}

export function nactiBranu(raw: unknown): BranaSlot[] {
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'sloty' in raw) {
    return nactiBranu((raw as { sloty: unknown }).sloty);
  }
  const mapa = new Map<number, BranaSlot>();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const r = item as Partial<BranaSlot>;
      const pozice = typeof r.pozice === 'number' ? r.pozice : 0;
      if (pozice < BRANA_OD || pozice > BRANA_DO) continue;
      const stav = r.stav === 'ceka' || r.stav === 'plati' || r.stav === 'prazdna' ? r.stav : 'prazdna';
      mapa.set(pozice, {
        pozice,
        telefon: typeof r.telefon === 'string' && r.telefon ? r.telefon : null,
        konec: typeof r.konec === 'string' && r.konec ? r.konec : null,
        stav,
        rezervace: typeof r.rezervace === 'string' && r.rezervace ? r.rezervace : null,
        rucni: r.rucni === true,
        ktery: r.ktery === 'hlavni' || r.ktery === 'druhy' ? r.ktery : null,
        cekaOd: typeof r.cekaOd === 'string' && r.cekaOd ? r.cekaOd : null,
        predchozi: jeSnimek(r.predchozi) ? r.predchozi : null,
      });
    }
  }
  return BRANA_POZICE.map((pozice) => mapa.get(pozice) || prazdnySlot(pozice));
}

export function denPraha(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function hodinaPraha(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Prague',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  return Number(parts.find((p) => p.type === 'hour')?.value || '0');
}

export function posunDen(ymd: string, dny: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + dny));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Den a hodina v Praze jako okamžik. */
export function casVPraze(ymd: string, hodina: number, minuta: number): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  const odhad = new Date(Date.UTC(y, m - 1, d, hodina, minuta, 0));
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Prague',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = Object.fromEntries(fmt.formatToParts(odhad).map((p) => [p.type, p.value]));
  const jakoby = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  return new Date(odhad.getTime() - (jakoby - odhad.getTime()));
}

export function konecZOdjezdu(odjezd: string | null): string | null {
  if (!odjezd || !/^\d{4}-\d{2}-\d{2}$/.test(odjezd)) return null;
  return casVPraze(odjezd, BRANA_KONEC_HODINA, BRANA_KONEC_MINUTA).toISOString();
}

export function konecPrikaz(iso: string): string | null {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Prague',
    hourCycle: 'h23',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(dt);
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  if (!v.year || !v.month || !v.day || !v.hour || !v.minute) return null;
  return `${v.year}${v.month}${v.day}${v.hour}${v.minute}`;
}

export function denKonce(iso: string | null): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  return denPraha(dt);
}

export function textDne(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) return ymd;
  return `${Number(d)}. ${Number(m)}.`;
}

export function textKonce(iso: string | null): string {
  const prikaz = iso ? konecPrikaz(iso) : null;
  if (!prikaz || prikaz.length !== 10) return '';
  const den = Number(prikaz.slice(4, 6));
  const mesic = Number(prikaz.slice(2, 4));
  return `${den}. ${mesic}. ${prikaz.slice(6, 8)}:${prikaz.slice(8, 10)}`;
}

/** Číslo do příkazu brány. Bez jisté předvolby nic. */
export function telefonNa00(raw: string | null | undefined): string | null {
  const tel = telefonProBranu(raw || '');
  if (!tel.ok) return null;
  return `00${tel.ulozeny.slice(1)}`;
}

export function slozPrikaz(heslo: string, pozice: number, telefon00: string, konec: string): string | null {
  if (!heslo || /\s/.test(heslo)) return null;
  if (pozice < BRANA_OD || pozice > BRANA_DO) return null;
  if (!/^00\d{8,15}$/.test(telefon00)) return null;
  if (!/^\d{10}$/.test(konec)) return null;
  return `${heslo}A${pozice}#${telefon00}#${BRANA_ZACATEK}#${konec}#`;
}

export function jeIos(ua: string): boolean {
  return /iPhone|iPad|iPod/i.test(ua);
}

/** Odkaz otevře SMS. Mřížka je schovaná, ať se zpráva neusekne. */
export function smsOdkaz(cislo: string, text: string, ios: boolean): string {
  const cil = cislo.replace(/[^\d+]/g, '');
  const body = encodeURIComponent(text);
  return ios ? `sms:${cil}&body=${body}` : `sms:${cil}?body=${body}`;
}

export function jeVolna(slot: BranaSlot, now: Date): boolean {
  if (!slot.telefon && slot.stav === 'prazdna') return true;
  if (!slot.konec) return false;
  const cas = new Date(slot.konec).getTime();
  if (Number.isNaN(cas)) return false;
  return cas <= now.getTime();
}

export function vyberPozici(sloty: BranaSlot[], apt: AptId | null, now: Date): number | null {
  const poradi = apt ? [...ROZSAH[apt], ...BRANA_POZICE.filter((p) => !ROZSAH[apt].includes(p))] : [...BRANA_POZICE];
  for (const pozice of poradi) {
    const slot = sloty.find((s) => s.pozice === pozice);
    if (slot && jeVolna(slot, now)) return pozice;
  }
  return null;
}

export function registraceOd(prijezd: string): string {
  return posunDen(prijezd, -BRANA_OKNO_DNI);
}

export function smiRegistrovat(prijezd: string | null, now: Date): boolean {
  if (!prijezd || !/^\d{4}-\d{2}-\d{2}$/.test(prijezd)) return false;
  return denPraha(now) >= registraceOd(prijezd);
}

export function textObsazeno(sloty: BranaSlot[], now: Date): string {
  const obsazene = sloty
    .filter((s) => !jeVolna(s, now))
    .sort((a, b) => (a.konec || '9999').localeCompare(b.konec || '9999'));
  const kusy = obsazene.slice(0, 5).map((s) => {
    const kdy = textKonce(s.konec);
    return kdy ? `${s.pozice} (${kdy})` : String(s.pozice);
  });
  return `Všechny pozice jsou obsazené. Nejdřív vyprší ${kusy.join(', ')}.`;
}

export type HostProBranu = {
  rezervace: string;
  apartman: AptId | null;
  prijezd: string | null;
  odjezd: string | null;
  zpusob: 'auto' | 'pesky' | null;
  telefonBrana: string | null;
  branaRegistrovano: string | null;
  zruseno: boolean;
};

export type ParkovaniAkce = 'nic' | 'registrovat' | 'potvrdit' | 'upravit' | 'brzy';

export type ParkovaniStav = {
  text: string;
  ton: 'seda' | 'cervena' | 'oranzova' | 'zelena';
  akce: ParkovaniAkce;
  pozice: number | null;
  tlacitko: string | null;
  neaktivni: boolean;
  zrusit: boolean;
  druhe: boolean;
};

function sedy(text: string): ParkovaniStav {
  return { text, ton: 'seda', akce: 'nic', pozice: null, tlacitko: null, neaktivni: false, zrusit: false, druhe: false };
}

function hlavniSlot(sloty: BranaSlot[], id: string, now: Date): BranaSlot | null {
  const sve = sloty.filter((s) => s.rezervace === id && s.ktery !== 'druhy' && !jeVolna(s, now));
  return sve.find((s) => s.ktery === 'hlavni') || sve[0] || null;
}

function sediKonec(slot: BranaSlot, odjezd: string | null): boolean {
  const chci = konecZOdjezdu(odjezd);
  if (!slot.konec || !chci) return false;
  return konecPrikaz(slot.konec) === konecPrikaz(chci);
}

function sediTelefon(slot: BranaSlot, telefon: string | null): boolean {
  const a = telefonNa00(slot.telefon);
  const b = telefonNa00(telefon);
  return Boolean(a && b && a === b);
}

export function stavParkovani(host: HostProBranu, sloty: BranaSlot[], now: Date): ParkovaniStav {
  const slot = hlavniSlot(sloty, host.rezervace, now);
  if (host.zpusob === 'pesky' && !slot) return sedy('Parkování: nechce (pěšky)');
  if (host.zpusob !== 'auto' && !slot) return sedy('Parkování: host ještě nevybral');
  if (host.zruseno && !slot) return sedy('Parkování: rezervace je zrušená');

  const telefonOk = Boolean(telefonNa00(host.telefonBrana));
  if (!telefonOk) {
    return {
      text: slot ? `Parkování: chybí telefon pro bránu · pozice ${slot.pozice}` : 'Parkování: chybí telefon pro bránu',
      ton: 'cervena',
      akce: 'nic',
      pozice: slot?.pozice ?? null,
      tlacitko: null,
      neaktivni: false,
      zrusit: Boolean(slot),
      druhe: false,
    };
  }

  if (slot) {
    const sedi = sediTelefon(slot, host.telefonBrana) && sediKonec(slot, host.odjezd);
    if (!sedi) {
      return {
        text: `Parkování: číslo nebo odjezd se změnily · pozice ${slot.pozice}`,
        ton: 'oranzova',
        akce: 'upravit',
        pozice: slot.pozice,
        tlacitko: 'Upravit v bráně',
        neaktivni: false,
        zrusit: true,
        druhe: false,
      };
    }
    if (slot.stav === 'ceka') {
      return {
        text: `Parkování: čeká na potvrzení brány · pozice ${slot.pozice}`,
        ton: 'oranzova',
        akce: 'potvrdit',
        pozice: slot.pozice,
        tlacitko: 'Brána potvrdila',
        neaktivni: false,
        zrusit: true,
        druhe: true,
      };
    }
    return {
      text: `Parkování: má místo · pozice ${slot.pozice} · do ${textKonce(slot.konec)}`,
      ton: 'zelena',
      akce: 'nic',
      pozice: slot.pozice,
      tlacitko: null,
      neaktivni: false,
      zrusit: true,
      druhe: true,
    };
  }

  if (host.branaRegistrovano) {
    return {
      text: 'Parkování: má místo',
      ton: 'zelena',
      akce: 'nic',
      pozice: null,
      tlacitko: null,
      neaktivni: false,
      zrusit: false,
      druhe: false,
    };
  }

  if (!smiRegistrovat(host.prijezd, now)) {
    const od = host.prijezd ? textDne(registraceOd(host.prijezd)) : '';
    return {
      text: `Parkování: registrovat od ${od}`,
      ton: 'seda',
      akce: 'brzy',
      pozice: null,
      tlacitko: 'Registrovat v bráně',
      neaktivni: true,
      zrusit: false,
      druhe: false,
    };
  }

  if (!konecZOdjezdu(host.odjezd)) {
    return {
      text: 'Parkování: chybí den odjezdu',
      ton: 'cervena',
      akce: 'nic',
      pozice: null,
      tlacitko: null,
      neaktivni: false,
      zrusit: false,
      druhe: false,
    };
  }

  if (vyberPozici(sloty, host.apartman, now) == null) {
    return {
      text: textObsazeno(sloty, now),
      ton: 'cervena',
      akce: 'nic',
      pozice: null,
      tlacitko: null,
      neaktivni: false,
      zrusit: false,
      druhe: false,
    };
  }

  return {
    text: 'Parkování: zaregistrovat',
    ton: 'oranzova',
    akce: 'registrovat',
    pozice: null,
    tlacitko: 'Registrovat v bráně',
    neaktivni: false,
    zrusit: false,
    druhe: false,
  };
}

export function snimekSlotu(slot: BranaSlot): BranaSnimek {
  return {
    telefon: slot.telefon,
    konec: slot.konec,
    stav: slot.stav === 'plati' ? 'plati' : 'prazdna',
    rezervace: slot.rezervace,
    rucni: slot.rucni,
    ktery: slot.ktery,
  };
}

export function uplatniSnimek(slot: BranaSlot, snimek: BranaSnimek): BranaSlot {
  return {
    ...prazdnySlot(slot.pozice),
    telefon: snimek.telefon,
    konec: snimek.konec,
    stav: snimek.stav,
    rezervace: snimek.rezervace,
    rucni: snimek.rucni,
    ktery: snimek.ktery,
  };
}

/** Číslo už drží jiná platná pozice. */
export function poziceSCislem(sloty: BranaSlot[], telefon: string, krome: number | null, now: Date): number | null {
  const cil = telefonNa00(telefon);
  if (!cil) return null;
  const nasel = sloty.find((s) => s.pozice !== krome && !jeVolna(s, now) && telefonNa00(s.telefon) === cil);
  return nasel ? nasel.pozice : null;
}
