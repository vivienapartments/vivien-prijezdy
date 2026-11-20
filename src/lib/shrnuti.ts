import { aptRecord } from './guide-data';
import { jeHodina, zobrazCas } from './odjezd';
import { PREDMET_SHRNUTI, SHRNUTI_AUTO, SHRNUTI_PESKY } from './shrnuti-texty';
import type { RezervaceRecord } from './store';
import { textTelefonu } from './telefon';
import type { AptId, GuideLang } from './types';
import { GUIDE_LANGS } from './types';

/** Denní připomínka majiteli (Praha). */
export const HODINA_SHRNUTI_RANO = 9;

export type ShrnutiKanal = 'whatsapp' | 'sms' | 'email' | 'neposilat';

export type ShrnutiVstup = Pick<
  RezervaceRecord,
  | 'stav'
  | 'nedojezdKdy'
  | 'predano'
  | 'prijezd'
  | 'checkinNeniPotreba'
  | 'casPrijezdu'
  | 'zpusobPrijezdu'
  | 'souhlasPravidel'
  | 'zadostPrijezd'
  | 'zadostPozdniPrijezd'
  | 'telefonBrana'
  | 'branaRegistrovano'
  | 'apartman'
  | 'shrnutiKdy'
  | 'shrnutiOtisk'
  | 'jazyk'
>;

function langOk(lang?: GuideLang | null): GuideLang {
  return lang && GUIDE_LANGS.includes(lang) ? lang : 'en';
}

/** Otisk: čas | způsob | telefon k bráně. */
export function otiskShrnuti(
  rec: Pick<RezervaceRecord, 'casPrijezdu' | 'zpusobPrijezdu' | 'telefonBrana'>,
): string {
  const cas = jeHodina(rec.casPrijezdu) ? rec.casPrijezdu : '';
  const zpusob = rec.zpusobPrijezdu === 'auto' || rec.zpusobPrijezdu === 'pesky' ? rec.zpusobPrijezdu : '';
  const tel = (rec.telefonBrana || '').trim();
  return `${cas}|${zpusob}|${tel}`;
}

/**
 * Host má vše k shrnutí.
 * SPZ není podmínka. Autem: telefon k bráně + brána zapsaná.
 */
export function jeKomplet(rec: ShrnutiVstup, dnes: string): boolean {
  if (rec.stav === 'zruseno' || rec.nedojezdKdy || rec.predano) return false;
  if (!rec.prijezd || rec.prijezd < dnes) return false;
  if (rec.stav === 'bez_checkinu' && rec.checkinNeniPotreba !== true) return false;
  if (!jeHodina(rec.casPrijezdu)) return false;
  if (rec.zpusobPrijezdu !== 'auto' && rec.zpusobPrijezdu !== 'pesky') return false;
  if (!rec.souhlasPravidel) return false;
  if (rec.zadostPrijezd?.stav === 'ceka' || rec.zadostPozdniPrijezd?.stav === 'ceka') return false;
  if (rec.zpusobPrijezdu === 'auto') {
    if (!(rec.telefonBrana || '').trim()) return false;
    if (!rec.branaRegistrovano) return false;
  }
  return true;
}

/** Čeká na odeslání (včetně změny po odeslání). */
export function cekaShrnuti(rec: ShrnutiVstup, dnes: string): boolean {
  if (!jeKomplet(rec, dnes)) return false;
  if (!rec.shrnutiKdy) return true;
  return otiskShrnuti(rec) !== (rec.shrnutiOtisk || '');
}

export function zmenaPoShrnuti(rec: ShrnutiVstup, dnes: string): boolean {
  return Boolean(rec.shrnutiKdy) && cekaShrnuti(rec, dnes);
}

function staniApartmanu(apartman: string | null | undefined): string {
  if (!apartman) return '';
  try {
    return String(aptRecord(apartman as AptId).stani);
  } catch {
    return '';
  }
}

/** Tělo zprávy bez odkazu. */
export function textShrnutiZaklad(
  rec: Pick<
    RezervaceRecord,
    'casPrijezdu' | 'zpusobPrijezdu' | 'telefonBrana' | 'apartman' | 'jazyk'
  >,
  lang?: GuideLang | null,
): string {
  const l = langOk(lang || rec.jazyk);
  const cas = jeHodina(rec.casPrijezdu) ? zobrazCas(rec.casPrijezdu) : '';
  if (rec.zpusobPrijezdu === 'auto') {
    const telefon = rec.telefonBrana ? textTelefonu(rec.telefonBrana) : '';
    const stani = staniApartmanu(rec.apartman);
    return SHRNUTI_AUTO[l]
      .replaceAll('{cas}', cas)
      .replaceAll('{telefon}', telefon)
      .replaceAll('{stani}', stani);
  }
  return SHRNUTI_PESKY[l].replaceAll('{cas}', cas);
}

/** Zpráva pro WhatsApp / SMS / e-mail (s odkazem na průvodce). */
export function textShrnuti(
  rec: Pick<
    RezervaceRecord,
    'casPrijezdu' | 'zpusobPrijezdu' | 'telefonBrana' | 'apartman' | 'jazyk'
  >,
  lang: GuideLang | null,
  odkaz: string | null,
): string {
  const zaklad = textShrnutiZaklad(rec, lang);
  const url = (odkaz || '').trim();
  if (!url) return zaklad;
  return `${zaklad}\n\n${url}`;
}

export function predmetShrnuti(lang: GuideLang | null): string {
  return PREDMET_SHRNUTI[langOk(lang)];
}

export function stitekShrnutiKanalu(kanal: ShrnutiKanal | null | undefined): string {
  if (kanal === 'whatsapp') return 'WhatsApp';
  if (kanal === 'sms') return 'SMS';
  if (kanal === 'email') return 'E-mail';
  if (kanal === 'neposilat') return 'neposláno';
  return '';
}

export function seradShrnuti<T extends { prijezd: string | null; apartman: string | null; jmeno?: string | null }>(
  radky: T[],
): T[] {
  return [...radky].sort((a, b) => {
    const da = a.prijezd || '';
    const db = b.prijezd || '';
    if (da !== db) return da.localeCompare(db);
    const pa = a.apartman || '';
    const pb = b.apartman || '';
    if (pa !== pb) return pa.localeCompare(pb, 'cs');
    return (a.jmeno || '').localeCompare(b.jmeno || '', 'cs');
  });
}

export function hosteProShrnuti<
  T extends ShrnutiVstup & { prijezd: string | null; apartman: string | null; jmeno?: string | null },
>(list: T[], dnes: string): T[] {
  return seradShrnuti(list.filter((r) => jeKomplet(r, dnes)));
}

export function hosteCekajiciShrnuti<
  T extends ShrnutiVstup & { prijezd: string | null; apartman: string | null; jmeno?: string | null },
>(list: T[], dnes: string): T[] {
  return seradShrnuti(list.filter((r) => cekaShrnuti(r, dnes)));
}

/** Hotové = komplet a už nečeká (odesláno / ručně / neposílat). */
export function hosteHotoveShrnuti<
  T extends ShrnutiVstup & { prijezd: string | null; apartman: string | null; jmeno?: string | null },
>(list: T[], dnes: string): T[] {
  return seradShrnuti(list.filter((r) => jeKomplet(r, dnes) && !cekaShrnuti(r, dnes)));
}

/** SMS odkaz: iPhone &body=, Android ?body=. */
export function odkazSmsShrnuti(telefon: string, text: string, ios: boolean): string {
  const cil = telefon.replace(/[^\d+]/g, '');
  const body = encodeURIComponent(text);
  return ios ? `sms:${cil}&body=${body}` : `sms:${cil}?body=${body}`;
}

export function textPushShrnutiNove(host: string, apartman: string | null): string {
  const apt = apartman || '—';
  return `${host} (${apt}) má vše vyplněno, pošlete shrnutí.`;
}

export function textPushShrnutiRano(seznam: string): string {
  return `Čeká shrnutí: ${seznam}`;
}

export function seznamShrnutiProTelegram(
  hoste: { jmeno?: string | null; apartman: string | null }[],
): string {
  return hoste
    .map((h) => `${(h.jmeno || 'Host').trim()} ${h.apartman || ''}`.trim())
    .filter(Boolean)
    .join(', ');
}

/** Nadpis ve Zprávách od nás. */
export const SHRNUTI_NADPIS: Record<GuideLang, string> = {
  cs: 'Vše je připravené',
  en: 'Everything is ready',
  de: 'Alles ist vorbereitet',
  pl: 'Wszystko gotowe',
  uk: 'Усе готово',
  'zh-Hant': '一切已準備就緒',
  sv: 'Allt är förberett',
  es: 'Todo está preparado',
  fr: 'Tout est prêt',
  it: 'È tutto pronto',
  pt: 'Está tudo preparado',
  hu: 'Minden elő van készítve',
  da: 'Alt er klar',
};

export const SHRNUTI_SBALENA: Record<GuideLang, string> = {
  cs: 'Shrnutí po vyplnění',
  en: 'Summary after filling in',
  de: 'Zusammenfassung nach dem Ausfüllen',
  pl: 'Podsumowanie po wypełnieniu',
  uk: 'Підсумок після заповнення',
  'zh-Hant': '填寫後摘要',
  sv: 'Sammanfattning efter ifyllning',
  es: 'Resumen tras rellenar',
  fr: 'Résumé après remplissage',
  it: 'Riepilogo dopo la compilazione',
  pt: 'Resumo após o preenchimento',
  hu: 'Összefoglaló a kitöltés után',
  da: 'Opsummering efter udfyldning',
};
