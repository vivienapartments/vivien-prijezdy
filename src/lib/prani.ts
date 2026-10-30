/**
 * Přání hosta (prompt 57A): stavy, validace, limity. UI až 57B/57C.
 */
import { casVPraze, posunDen } from './brana';
import { popisHosta } from './upozorneni';
import type { ProcessStore, RezervaceRecord } from './store';
import { upozorniMajitele } from './upozorneni';

export type AutorPrani = 'host' | 'vivien';
export type StavVlaknaPrani = 'nove' | 'precteno' | 'vyrizeno';
export type StavHostaPrani = 'odeslano' | 'vyrizeno';
export type KdoPrani = 'pravoslav' | 'nikol';

export type ZpravaPrani = {
  id: string;
  vlakno: string;
  autor: AutorPrani;
  /** Nikol / Pravoslav u odpovědi VIVIEN. */
  jmeno?: string;
  text: string;
  cas: string;
  upraveno?: string;
  smazano?: string;
};

export type VlaknoPrani = {
  id: string;
  rezervace: string;
  zalozeno: string;
  stav: StavVlaknaPrani;
  posledniHost: string | null;
  precteno: string | null;
  prectenoKdo?: string;
  vyrizeno: string | null;
  vyrizenoKdo?: string;
  posledniOdpoved: string | null;
};

export type PraniTtl = { odjezd: string | null; persist: boolean };

export type DuvodPrani = 'okno' | 'limit' | 'zamceno' | 'text' | 'token' | 'nenalezeno' | 'zruseno';

const MAX_TEXT = 1000;
const LIMIT_OKNO_MIN = 6;
const LIMIT_OKNO_MS = 10 * 60_000;
const LIMIT_POBYT = 30;

export function jmenoZKdo(kdo: KdoPrani): string {
  return kdo === 'nikol' ? 'Nikol' : 'Pravoslav';
}

export function jeKdoPrani(v: unknown): KdoPrani | null {
  return v === 'pravoslav' || v === 'nikol' ? v : null;
}

/** Ořez, 1–1000 znaků, bez řídicích znaků a HTML značek. */
export function validujTextPrani(raw: unknown): { ok: true; text: string } | { ok: false; duvod: 'text' } {
  if (typeof raw !== 'string') return { ok: false, duvod: 'text' };
  let t = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  t = t.replace(/<[^>]*>/g, '');
  if (t.length < 1 || t.length > MAX_TEXT) return { ok: false, duvod: 'text' };
  return { ok: true, text: t };
}

/** Od předání do 19:00 (Praha) dne před odjezdem. */
export function muzeHostPsat(
  opts: { predano: string | null | undefined; odjezd: string | null | undefined },
  now = new Date(),
): boolean {
  if (!opts.predano || !opts.odjezd || !/^\d{4}-\d{2}-\d{2}$/.test(opts.odjezd)) return false;
  const konec = casVPraze(posunDen(opts.odjezd, -1), 19, 0);
  return now.getTime() < konec.getTime();
}

export function maOtevrenaVlakna(vlakna: VlaknoPrani[]): boolean {
  return vlakna.some((v) => v.stav === 'nove' || v.stav === 'precteno');
}

export function stavProHosta(stav: StavVlaknaPrani): StavHostaPrani {
  return stav === 'vyrizeno' ? 'vyrizeno' : 'odeslano';
}

export function zpravyVlakna(zpravy: ZpravaPrani[], vlaknoId: string): ZpravaPrani[] {
  return zpravy.filter((z) => z.vlakno === vlaknoId);
}

/** Úprava/smazání jen vlastní zprávy, dokud vlákno není přečtené/vyřízené a po ní není odpověď VIVIEN. */
export function muzeHostUpravit(
  zprava: ZpravaPrani,
  vlakno: VlaknoPrani | null | undefined,
  zpravy: ZpravaPrani[],
): boolean {
  if (!vlakno || zprava.autor !== 'host' || zprava.smazano) return false;
  if (vlakno.stav === 'precteno' || vlakno.stav === 'vyrizeno') return false;
  const casZ = Date.parse(zprava.cas);
  if (!Number.isFinite(casZ)) return false;
  return !zpravyVlakna(zpravy, zprava.vlakno).some(
    (z) => z.autor === 'vivien' && !z.smazano && Date.parse(z.cas) >= casZ,
  );
}

export function limitHostaPrekrocen(zpravy: ZpravaPrani[], now = new Date()): boolean {
  const host = zpravy.filter((z) => z.autor === 'host' && !z.smazano);
  if (host.length >= LIMIT_POBYT) return true;
  const od = now.getTime() - LIMIT_OKNO_MS;
  const vOkne = host.filter((z) => Date.parse(z.cas) >= od).length;
  return vOkne >= LIMIT_OKNO_MIN;
}

export function ttlZRezervace(rec: Pick<RezervaceRecord, 'odjezd' | 'zavadyPredani' | 'zavadyPoOdjezdu'>): PraniTtl {
  return {
    odjezd: rec.odjezd,
    persist: Boolean(rec.zavadyPredani || rec.zavadyPoOdjezdu),
  };
}

export function najdiZpravu(zpravy: ZpravaPrani[], id: string): ZpravaPrani | null {
  return zpravy.find((z) => z.id === id) || null;
}

export function noveVlaknoPoHostu(
  existujici: VlaknoPrani | null,
  opts: { id: string; rezervace: string; cas: string },
): VlaknoPrani {
  if (existujici) {
    return {
      ...existujici,
      stav: 'nove',
      posledniHost: opts.cas,
    };
  }
  return {
    id: opts.id,
    rezervace: opts.rezervace,
    zalozeno: opts.cas,
    stav: 'nove',
    posledniHost: opts.cas,
    precteno: null,
    vyrizeno: null,
    posledniOdpoved: null,
  };
}

export function vlaknoPrecteno(vlakno: VlaknoPrani, cas: string, kdo: KdoPrani): VlaknoPrani {
  return { ...vlakno, stav: 'precteno', precteno: cas, prectenoKdo: kdo };
}

export function vlaknoVyrizeno(vlakno: VlaknoPrani, cas: string, kdo: KdoPrani): VlaknoPrani {
  return { ...vlakno, stav: 'vyrizeno', vyrizeno: cas, vyrizenoKdo: kdo };
}

export function vlaknoOtevrit(vlakno: VlaknoPrani): VlaknoPrani {
  return { ...vlakno, stav: 'precteno' };
}

export function vlaknoPoOdpovedi(vlakno: VlaknoPrani, cas: string): VlaknoPrani {
  return { ...vlakno, posledniOdpoved: cas };
}

export type VlaknoProHosta = {
  id: string;
  stav: StavHostaPrani;
  zalozeno: string;
  zpravy: {
    id: string;
    autor: AutorPrani;
    jmeno?: string;
    text: string;
    cas: string;
    upraveno?: string;
    muzeUpravit: boolean;
  }[];
};

export function sestavProHosta(
  vlakna: VlaknoPrani[],
  zpravy: ZpravaPrani[],
  muzePsat: boolean,
): { vlakna: VlaknoProHosta[]; muzePsat: boolean } {
  const viditelna: VlaknoProHosta[] = [];
  for (const v of vlakna) {
    const zs = zpravyVlakna(zpravy, v.id).filter((z) => !z.smazano && (z.autor === 'host' || z.autor === 'vivien'));
    if (!zs.some((z) => z.autor === 'host')) continue;
    viditelna.push({
      id: v.id,
      stav: stavProHosta(v.stav),
      zalozeno: v.zalozeno,
      zpravy: zs.map((z) => ({
        id: z.id,
        autor: z.autor,
        jmeno: z.autor === 'vivien' ? z.jmeno : undefined,
        text: z.text,
        cas: z.cas,
        upraveno: z.upraveno,
        muzeUpravit: muzePsat && muzeHostUpravit(z, v, zpravy),
      })),
    });
  }
  return { vlakna: viditelna, muzePsat };
}

function pridejHistorii(rec: RezervaceRecord, co: string): RezervaceRecord {
  const cas = new Date().toISOString();
  return {
    ...rec,
    historie: [...rec.historie, { cas, co }].slice(-40),
  };
}

export async function hostNactiPrani(
  store: ProcessStore,
  rec: RezervaceRecord,
  now = new Date(),
): Promise<{ ok: true; data: ReturnType<typeof sestavProHosta> }> {
  const { vlakna, zpravy } = await store.listPrani(rec.rezervace);
  return {
    ok: true,
    data: sestavProHosta(Object.values(vlakna), zpravy, muzeHostPsat(rec, now)),
  };
}

export async function hostNapisPrani(
  store: ProcessStore,
  rec: RezervaceRecord,
  opts: { id: string; vlakno?: string | null; text: string },
  now = new Date(),
  posli: typeof upozorniMajitele = upozorniMajitele,
): Promise<
  | { ok: true; uz?: boolean; vlakno: string }
  | { ok: false; duvod: DuvodPrani }
> {
  if (rec.stav === 'zruseno') return { ok: false, duvod: 'zruseno' };
  if (!muzeHostPsat(rec, now)) return { ok: false, duvod: 'okno' };
  const valid = validujTextPrani(opts.text);
  if (!valid.ok) return valid;
  const id = (opts.id || '').trim();
  if (!id || id.length > 80) return { ok: false, duvod: 'text' };

  const { vlakna, zpravy } = await store.listPrani(rec.rezervace);
  if (najdiZpravu(zpravy, id)) return { ok: true, uz: true, vlakno: najdiZpravu(zpravy, id)!.vlakno };

  if (limitHostaPrekrocen(zpravy, now)) return { ok: false, duvod: 'limit' };

  const cas = now.toISOString();
  let vlaknoId = (opts.vlakno || '').trim();
  let existujici: VlaknoPrani | null = null;
  let noveVlakno = false;

  if (vlaknoId) {
    existujici = vlakna[vlaknoId] || null;
    if (!existujici) return { ok: false, duvod: 'nenalezeno' };
  } else {
    vlaknoId = id;
    noveVlakno = true;
  }

  const vlakno = noveVlaknoPoHostu(existujici, { id: vlaknoId, rezervace: rec.rezervace, cas });
  const zprava: ZpravaPrani = {
    id,
    vlakno: vlaknoId,
    autor: 'host',
    text: valid.text,
    cas,
  };

  await store.pridejZpravuPrani(rec.rezervace, zprava, vlakno, ttlZRezervace(rec));

  if (noveVlakno) {
    await store.setRezervace(rec.rezervace, pridejHistorii(rec, 'Přání hosta'));
  }

  const uvod = `${popisHosta(rec)} · přání: ${valid.text.slice(0, 60)}`;
  try {
    await posli(store, uvod, `/prehled#${rec.rezervace}?prani=${vlaknoId}`);
  } catch {
    /* uložení má přednost */
  }

  return { ok: true, vlakno: vlaknoId };
}

export async function hostUpravPrani(
  store: ProcessStore,
  rec: RezervaceRecord,
  opts: { id: string; text: string },
  now = new Date(),
): Promise<{ ok: true } | { ok: false; duvod: DuvodPrani }> {
  if (rec.stav === 'zruseno') return { ok: false, duvod: 'zruseno' };
  if (!muzeHostPsat(rec, now)) return { ok: false, duvod: 'okno' };
  const valid = validujTextPrani(opts.text);
  if (!valid.ok) return valid;
  const { vlakna, zpravy } = await store.listPrani(rec.rezervace);
  const zprava = najdiZpravu(zpravy, opts.id);
  if (!zprava || zprava.autor !== 'host') return { ok: false, duvod: 'nenalezeno' };
  const vlakno = vlakna[zprava.vlakno];
  if (!muzeHostUpravit(zprava, vlakno, zpravy)) return { ok: false, duvod: 'zamceno' };
  await store.upravZpravuPrani(
    rec.rezervace,
    opts.id,
    { text: valid.text, upraveno: now.toISOString() },
    ttlZRezervace(rec),
  );
  return { ok: true };
}

export async function hostSmazPrani(
  store: ProcessStore,
  rec: RezervaceRecord,
  opts: { id: string },
  now = new Date(),
): Promise<{ ok: true; zrusenoVlakno?: boolean } | { ok: false; duvod: DuvodPrani }> {
  if (rec.stav === 'zruseno') return { ok: false, duvod: 'zruseno' };
  if (!muzeHostPsat(rec, now)) return { ok: false, duvod: 'okno' };
  const { vlakna, zpravy } = await store.listPrani(rec.rezervace);
  const zprava = najdiZpravu(zpravy, opts.id);
  if (!zprava || zprava.autor !== 'host') return { ok: false, duvod: 'nenalezeno' };
  const vlakno = vlakna[zprava.vlakno];
  if (!muzeHostUpravit(zprava, vlakno, zpravy)) return { ok: false, duvod: 'zamceno' };

  const cas = now.toISOString();
  await store.upravZpravuPrani(rec.rezervace, opts.id, { text: '', smazano: cas }, ttlZRezervace(rec));

  const ostatniHost = zpravy.filter(
    (z) => z.vlakno === zprava.vlakno && z.autor === 'host' && z.id !== zprava.id && !z.smazano,
  );
  if (ostatniHost.length === 0 && vlakno) {
    await store.smazVlaknoPrani(rec.rezervace, vlakno.id, ttlZRezervace(rec));
    return { ok: true, zrusenoVlakno: true };
  }
  return { ok: true };
}

export async function adminOdpovedPrani(
  store: ProcessStore,
  rec: RezervaceRecord,
  opts: { vlakno: string; id: string; text: string; kdo: KdoPrani },
  now = new Date(),
): Promise<{ ok: true; uz?: boolean } | { ok: false; duvod: DuvodPrani }> {
  const valid = validujTextPrani(opts.text);
  if (!valid.ok) return valid;
  const id = (opts.id || '').trim();
  if (!id) return { ok: false, duvod: 'text' };
  const { vlakna, zpravy } = await store.listPrani(rec.rezervace);
  const vlakno = vlakna[opts.vlakno];
  if (!vlakno) return { ok: false, duvod: 'nenalezeno' };
  if (najdiZpravu(zpravy, id)) return { ok: true, uz: true };

  const cas = now.toISOString();
  const zprava: ZpravaPrani = {
    id,
    vlakno: opts.vlakno,
    autor: 'vivien',
    jmeno: jmenoZKdo(opts.kdo),
    text: valid.text,
    cas,
  };
  await store.pridejZpravuPrani(rec.rezervace, zprava, vlaknoPoOdpovedi(vlakno, cas), ttlZRezervace(rec));
  return { ok: true };
}

export async function adminPrectenoPrani(
  store: ProcessStore,
  rec: RezervaceRecord,
  opts: { vlakno: string; kdo: KdoPrani },
  now = new Date(),
): Promise<{ ok: true } | { ok: false; duvod: DuvodPrani }> {
  const { vlakna } = await store.listPrani(rec.rezervace);
  const vlakno = vlakna[opts.vlakno];
  if (!vlakno) return { ok: false, duvod: 'nenalezeno' };
  await store.nastavVlaknoPrani(rec.rezervace, vlaknoPrecteno(vlakno, now.toISOString(), opts.kdo), ttlZRezervace(rec));
  return { ok: true };
}

export async function adminVyrizenoPrani(
  store: ProcessStore,
  rec: RezervaceRecord,
  opts: { vlakno: string; kdo: KdoPrani },
  now = new Date(),
): Promise<{ ok: true } | { ok: false; duvod: DuvodPrani }> {
  const { vlakna } = await store.listPrani(rec.rezervace);
  const vlakno = vlakna[opts.vlakno];
  if (!vlakno) return { ok: false, duvod: 'nenalezeno' };
  await store.nastavVlaknoPrani(rec.rezervace, vlaknoVyrizeno(vlakno, now.toISOString(), opts.kdo), ttlZRezervace(rec));
  await store.setRezervace(rec.rezervace, pridejHistorii(rec, `Přání vyřízeno (${jmenoZKdo(opts.kdo)})`));
  return { ok: true };
}

export async function adminOtevritPrani(
  store: ProcessStore,
  rec: RezervaceRecord,
  opts: { vlakno: string; kdo: KdoPrani },
): Promise<{ ok: true } | { ok: false; duvod: DuvodPrani }> {
  const { vlakna } = await store.listPrani(rec.rezervace);
  const vlakno = vlakna[opts.vlakno];
  if (!vlakno) return { ok: false, duvod: 'nenalezeno' };
  await store.nastavVlaknoPrani(rec.rezervace, vlaknoOtevrit(vlakno), ttlZRezervace(rec));
  void opts.kdo;
  return { ok: true };
}

export function nactiZpravuPrani(raw: unknown): ZpravaPrani | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.vlakno !== 'string') return null;
  if (r.autor !== 'host' && r.autor !== 'vivien') return null;
  if (typeof r.text !== 'string' || typeof r.cas !== 'string') return null;
  return {
    id: r.id,
    vlakno: r.vlakno,
    autor: r.autor,
    jmeno: typeof r.jmeno === 'string' ? r.jmeno : undefined,
    text: r.text,
    cas: r.cas,
    upraveno: typeof r.upraveno === 'string' ? r.upraveno : undefined,
    smazano: typeof r.smazano === 'string' ? r.smazano : undefined,
  };
}

export function nactiVlaknoPrani(raw: unknown): VlaknoPrani | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.rezervace !== 'string' || typeof r.zalozeno !== 'string') return null;
  if (r.stav !== 'nove' && r.stav !== 'precteno' && r.stav !== 'vyrizeno') return null;
  return {
    id: r.id,
    rezervace: r.rezervace,
    zalozeno: r.zalozeno,
    stav: r.stav,
    posledniHost: typeof r.posledniHost === 'string' ? r.posledniHost : null,
    precteno: typeof r.precteno === 'string' ? r.precteno : null,
    prectenoKdo: typeof r.prectenoKdo === 'string' ? r.prectenoKdo : undefined,
    vyrizeno: typeof r.vyrizeno === 'string' ? r.vyrizeno : null,
    vyrizenoKdo: typeof r.vyrizenoKdo === 'string' ? r.vyrizenoKdo : undefined,
    posledniOdpoved: typeof r.posledniOdpoved === 'string' ? r.posledniOdpoved : null,
  };
}
