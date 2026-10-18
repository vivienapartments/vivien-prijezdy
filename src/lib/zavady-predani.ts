import { createHmac, timingSafeEqual } from 'crypto';
import type { GuideLang } from './types';
import type { RezervaceRecord } from './store';

export type ZavadyPredani = {
  text: string;
  odeslanoKdy: string;
  potvrzenoKdy: string | null;
};

const MAX_TEXT = 2000;

function secret(): string {
  const s = process.env.PRUVODCE_TOKEN_SECRET?.trim();
  if (!s || s.length < 32) throw new Error('PRUVODCE_TOKEN_SECRET missing or too short');
  return s;
}

function baseUrl(): string {
  return (process.env.PRUVODCE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
}

export function nactiZavady(raw: unknown): ZavadyPredani | null {
  if (!raw || typeof raw !== 'object') return null;
  const z = raw as Record<string, unknown>;
  if (typeof z.text !== 'string' || !z.text.trim()) return null;
  if (typeof z.odeslanoKdy !== 'string' || !z.odeslanoKdy) return null;
  return {
    text: z.text.trim().slice(0, MAX_TEXT),
    odeslanoKdy: z.odeslanoKdy,
    potvrzenoKdy: typeof z.potvrzenoKdy === 'string' && z.potvrzenoKdy ? z.potvrzenoKdy : null,
  };
}

export function normalizujTextZavad(text: string): string | null {
  const t = text.replace(/\r\n/g, '\n').trim().slice(0, MAX_TEXT);
  return t || null;
}

export function vytvorTokenZavad(rezervace: string, odeslanoKdy: string, sec = secret()): string {
  const json = JSON.stringify({ r: String(rezervace), t: odeslanoKdy });
  const payload = Buffer.from(json, 'utf8').toString('base64url');
  const sig = createHmac('sha256', sec).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function overTokenZavad(
  token: string,
  sec = secret(),
): { ok: true; rezervace: string; odeslanoKdy: string } | { ok: false } {
  const casti = token.split('.');
  if (casti.length !== 2 || !casti[0] || !casti[1]) return { ok: false };
  const [payload, sig] = casti;
  const ocekavano = createHmac('sha256', sec).update(payload).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(ocekavano);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  } catch {
    return { ok: false };
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      r?: unknown;
      t?: unknown;
    };
    if (typeof data.r !== 'string' || !data.r.trim()) return { ok: false };
    if (typeof data.t !== 'string' || !data.t) return { ok: false };
    return { ok: true, rezervace: data.r.trim(), odeslanoKdy: data.t };
  } catch {
    return { ok: false };
  }
}

export function odkazPotvrzeniZavad(rezervace: string, odeslanoKdy: string): string {
  return `${baseUrl()}/zavady/${vytvorTokenZavad(rezervace, odeslanoKdy)}`;
}

/** Schválené znění A e-mailu hostovi. */
export function textEmailuZavad(lang: GuideLang | null | undefined, text: string): string {
  const zavady = text.trim();
  const mapa: Record<GuideLang, string> = {
    cs: `Dobrý den, při předání apartmánu jsme zapsali:\n\n${zavady}\n\nPotvrďte prosím tlačítkem níže.`,
    en: `Hello, at the apartment handover we noted:\n\n${zavady}\n\nPlease confirm with the button below.`,
    de: `Guten Tag, bei der Übergabe des Apartments haben wir notiert:\n\n${zavady}\n\nBitte bestätigen Sie mit der Schaltfläche unten.`,
    pl: `Dzień dobry, przy przekazaniu apartamentu zapisaliśmy:\n\n${zavady}\n\nPotwierdźcie proszę przyciskiem poniżej.`,
    uk: `Добрий день, під час передачі апартаментів ми записали:\n\n${zavady}\n\nПідтвердіть будь ласка кнопкою нижче.`,
    'zh-Hant': `您好，交接公寓時我們記下了：\n\n${zavady}\n\n請用下方按鈕確認。`,
    sv: `Hej, vid överlämningen av lägenheten skrev vi ner:\n\n${zavady}\n\nBekräfta gärna med knappen nedan.`,
    es: `Hola, en la entrega del apartamento anotamos:\n\n${zavady}\n\nConfirmen con el botón de abajo, por favor.`,
    fr: `Bonjour, lors de la remise de l'appartement nous avons noté :\n\n${zavady}\n\nMerci de confirmer avec le bouton ci-dessous.`,
    it: `Buongiorno, alla consegna dell'appartamento abbiamo annotato:\n\n${zavady}\n\nConfermate con il pulsante qui sotto.`,
    hu: `Jó napot, az apartman átadásakor ezt jegyeztük fel:\n\n${zavady}\n\nKérjük, erősítsék meg az alábbi gombbal.`,
  };
  const klic = lang && lang in mapa ? lang : 'en';
  return mapa[klic as GuideLang] || mapa.en;
}

export function predmetEmailuZavad(lang: GuideLang | null | undefined): string {
  const mapa: Record<GuideLang, string> = {
    cs: 'VIVIEN · Zápis z předání',
    en: 'VIVIEN · Handover notes',
    de: 'VIVIEN · Notiz zur Übergabe',
    pl: 'VIVIEN · Zapis z przekazania',
    uk: 'VIVIEN · Запис з передачі',
    'zh-Hant': 'VIVIEN · 交接紀錄',
    sv: 'VIVIEN · Anteckning från överlämningen',
    es: 'VIVIEN · Anotación de la entrega',
    fr: 'VIVIEN · Note de remise',
    it: 'VIVIEN · Nota di consegna',
    hu: 'VIVIEN · Átadási feljegyzés',
  };
  const klic = lang && lang in mapa ? lang : 'en';
  return mapa[klic as GuideLang] || mapa.en;
}

export function tlacitkoPotvrditZavady(lang: GuideLang | null | undefined): string {
  const mapa: Record<GuideLang, string> = {
    cs: 'Potvrdit',
    en: 'Confirm',
    de: 'Bestätigen',
    pl: 'Potwierdź',
    uk: 'Підтвердити',
    'zh-Hant': '確認',
    sv: 'Bekräfta',
    es: 'Confirmar',
    fr: 'Confirmer',
    it: 'Conferma',
    hu: 'Megerősítés',
  };
  const klic = lang && lang in mapa ? lang : 'en';
  return mapa[klic as GuideLang] || mapa.en;
}

export function stavZavadText(z: ZavadyPredani | null | undefined): string | null {
  if (!z) return null;
  if (z.potvrzenoKdy) return 'Závady potvrzeny';
  return 'Závady · čeká na potvrzení';
}

export function potvrdZavady(rec: RezervaceRecord, odeslanoKdy: string, now = new Date()): RezervaceRecord | null {
  const z = rec.zavadyPredani;
  if (!z || z.odeslanoKdy !== odeslanoKdy) return null;
  if (z.potvrzenoKdy) return rec;
  const cas = now.toISOString();
  return {
    ...rec,
    zavadyPredani: { ...z, potvrzenoKdy: cas },
    historie: [...rec.historie, { cas, co: 'Host potvrdil závady z předání' }].slice(-40),
  };
}
