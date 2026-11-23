/**
 * Vyřízení poptávky: blokace, lhůty, texty hostovi, Telegram připomínky.
 */
import { aptRecord } from './guide-data';
import { formatKc } from './kalendar-texty';
import { formatRozsahPoptavky } from './poptavka-texty';
import type { PoptavkaKanal, PoptavkaZaznam } from './poptavka';
import type { AptId, GuideLang } from './types';
import { odkazSmsPodekovani } from './podekovani';
import { odkazWhatsApp } from './whatsapp-zprava';

export type PoptavkaStav =
  | 'nova'
  | 'predbezne'
  | 'ceka_na_hosta'
  | 'potvrzeno'
  | 'hotovo'
  | 'nejde'
  | 'neozval_se';

export const POPTAVKA_STAVY_BLOKUJI: ReadonlySet<PoptavkaStav> = new Set([
  'nova',
  'predbezne',
  'ceka_na_hosta',
  'potvrzeno',
]);

export const POPTAVKA_CHECKIN_HODINA = 14;

const STAVY: ReadonlySet<string> = new Set([
  'nova',
  'predbezne',
  'ceka_na_hosta',
  'potvrzeno',
  'hotovo',
  'nejde',
  'neozval_se',
]);

export function nactiPoptavkaStav(raw: unknown): PoptavkaStav {
  if (typeof raw === 'string' && STAVY.has(raw)) return raw as PoptavkaStav;
  return 'nova';
}

export function jeZkouskaPoptavky(z: Pick<PoptavkaZaznam, 'rezervace' | 'zkouska'>): boolean {
  if (z.zkouska === true) return true;
  return Boolean(z.rezervace && /^TEST/i.test(z.rezervace));
}

export function stitekStavu(stav: PoptavkaStav): string {
  switch (stav) {
    case 'predbezne':
    case 'nova':
      return 'Předběžně';
    case 'ceka_na_hosta':
      return 'Čeká na hosta';
    case 'potvrzeno':
      return 'Potvrzeno';
    case 'hotovo':
      return 'Hotovo';
    case 'nejde':
      return 'Nejde';
    case 'neozval_se':
      return 'Neozval se';
    default:
      return stav;
  }
}

/** Hodina v Europe/Prague (0–23). */
export function hodinaPraha(now = new Date()): number {
  const cast = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Prague',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  return Number(cast.find((p) => p.type === 'hour')?.value || '0');
}

export function jeNocPraha(now = new Date()): boolean {
  const h = hodinaPraha(now);
  return h >= 20 || h < 8;
}

function ymdPraha(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function pridejHodin(iso: string, hodin: number): Date {
  return new Date(new Date(iso).getTime() + hodin * 3600000);
}

function naDesetRanoDalsiDen(d: Date): Date {
  const ymd = ymdPraha(d);
  const candidate = new Date(d.getTime());
  // Posouvej po 15 min, dokud není další kalendářní den 10:00 v Praze.
  for (let i = 0; i < 96; i++) {
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 15);
    if (ymdPraha(candidate) > ymd && hodinaPraha(candidate) === 10) {
      const min = Number(
        new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/Prague',
          minute: '2-digit',
        })
          .formatToParts(candidate)
          .find((p) => p.type === 'minute')?.value || '0',
      );
      if (min === 0) return candidate;
    }
  }
  return candidate;
}

/**
 * Lhůta po POTVRDIT: dnes/zítra 2 h · do 7 dní 12 h · do 30 dní 24 h · později 48 h.
 * Mezi 20–8 posun na 10:00 dalšího dne (ne u dnes/zítra). Nikdy po check-inu 14:00 v den příjezdu.
 */
export function spocitejLhutu(
  prijezdYmd: string,
  now = new Date(),
  checkinHodina = POPTAVKA_CHECKIN_HODINA,
): string {
  const dnes = ymdPraha(now);
  const zitraDate = new Date(now.getTime() + 86400000);
  const zitra = ymdPraha(zitraDate);
  const dny =
    (Date.parse(`${prijezdYmd}T12:00:00Z`) - Date.parse(`${dnes}T12:00:00Z`)) / 86400000;

  let hodin = 48;
  if (prijezdYmd === dnes || prijezdYmd === zitra) hodin = 2;
  else if (dny <= 7) hodin = 12;
  else if (dny <= 30) hodin = 24;

  let lhuta = pridejHodin(now.toISOString(), hodin);
  const blizky = prijezdYmd === dnes || prijezdYmd === zitra;
  if (!blizky && jeNocPraha(lhuta)) {
    lhuta = naDesetRanoDalsiDen(lhuta);
  }

  const [py, pm, pd] = prijezdYmd.split('-').map(Number);
  const checkin = new Date(Date.UTC(py, pm - 1, pd, checkinHodina - 1, 0, 0));
  // Najdi okamžik check-inu v Praze.
  for (let i = 0; i < 48; i++) {
    if (ymdPraha(checkin) === prijezdYmd && hodinaPraha(checkin) === checkinHodina) break;
    checkin.setUTCMinutes(checkin.getUTCMinutes() + 30);
  }
  if (lhuta.getTime() > checkin.getTime()) lhuta = checkin;

  return lhuta.toISOString();
}

export function formatLhutaProHosta(iso: string, lang: GuideLang): string {
  const d = new Date(iso);
  const locale =
    lang === 'cs'
      ? 'cs-CZ'
      : lang === 'de'
        ? 'de-DE'
        : lang === 'pl'
          ? 'pl-PL'
          : lang === 'uk'
            ? 'uk-UA'
            : lang === 'zh-Hant'
              ? 'zh-Hant'
              : lang === 'sv'
                ? 'sv-SE'
                : lang === 'es'
                  ? 'es-ES'
                  : lang === 'fr'
                    ? 'fr-FR'
                    : lang === 'it'
                      ? 'it-IT'
                      : lang === 'pt'
                        ? 'pt-PT'
                        : lang === 'hu'
                          ? 'hu-HU'
                          : lang === 'da'
                            ? 'da-DK'
                            : lang === 'fi'
                              ? 'fi-FI'
                              : 'en-GB';
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'Europe/Prague',
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(d);
}

type Sablona = { potvrzeni: string; lhuta: string };

const POTVRDIT: Record<GuideLang, Sablona> = {
  cs: {
    potvrzeni:
      'Dobrý den {jmeno}, potvrzujeme váš pobyt {termin} v apartmánu {apartman}. Cena {cena}{sleva}. Před příjezdem vám pošleme příjezdového průvodce. Těšíme se na vás. Nikol, VIVIEN Apartments',
    lhuta: 'Napište nám prosím do {lhuta}, že termín platí, ať ho pro vás držíme.',
  },
  en: {
    potvrzeni:
      'Hello {jmeno}, we confirm your stay {termin} in the {apartman} apartment. Price {cena}{sleva}. Before your arrival we will send you our arrival guide. We look forward to welcoming you. Nikol, VIVIEN Apartments',
    lhuta: 'Please reply by {lhuta} to confirm the dates, so we can keep them for you.',
  },
  de: {
    potvrzeni:
      'Guten Tag {jmeno}, wir bestätigen Ihren Aufenthalt {termin} im Apartment {apartman}. Preis {cena}{sleva}. Vor Ihrer Anreise senden wir Ihnen unseren Anreiseguide. Wir freuen uns auf Sie. Nikol, VIVIEN Apartments',
    lhuta: 'Bitte bestätigen Sie uns den Termin bis {lhuta}, damit wir ihn für Sie freihalten.',
  },
  pl: {
    potvrzeni:
      'Dzień dobry {jmeno}, potwierdzamy Wasz pobyt {termin} w apartamencie {apartman}. Cena {cena}{sleva}. Przed przyjazdem wyślemy Wam przewodnik przyjazdu. Czekamy na Was. Nikol, VIVIEN Apartments',
    lhuta: 'Prosimy o odpowiedź do {lhuta}, że termin aktualny, abyśmy mogli go dla Was zatrzymać.',
  },
  uk: {
    potvrzeni:
      'Добрий день, {jmeno}, підтверджуємо ваше перебування {termin} в апартаментах {apartman}. Ціна {cena}{sleva}. Перед приїздом надішлемо вам путівник для заїзду. Чекаємо на вас. Nikol, VIVIEN Apartments',
    lhuta: 'Будь ласка, підтвердьте дати до {lhuta}, щоб ми могли їх для вас утримати.',
  },
  'zh-Hant': {
    potvrzeni:
      '{jmeno} 您好，我們確認您 {termin} 入住 {apartman} 公寓。價格 {cena}{sleva}。入住前我們會寄給您入住指南。期待您的到來。Nikol，VIVIEN Apartments',
    lhuta: '請於 {lhuta} 前回覆確認日期，以便我們為您保留。',
  },
  es: {
    potvrzeni:
      'Hola {jmeno}, confirmamos su estancia {termin} en el apartamento {apartman}. Precio {cena}{sleva}. Antes de su llegada les enviaremos nuestra guía de llegada. Les esperamos. Nikol, VIVIEN Apartments',
    lhuta: 'Por favor, confírmennos las fechas antes de {lhuta} para que podamos reservarlas para ustedes.',
  },
  fr: {
    potvrzeni:
      'Bonjour {jmeno}, nous confirmons votre séjour {termin} dans l’appartement {apartman}. Prix {cena}{sleva}. Avant votre arrivée, nous vous enverrons notre guide d’arrivée. Au plaisir de vous accueillir. Nikol, VIVIEN Apartments',
    lhuta: 'Merci de nous confirmer les dates avant {lhuta} afin que nous puissions les garder pour vous.',
  },
  it: {
    potvrzeni:
      'Buongiorno {jmeno}, confermiamo il vostro soggiorno {termin} nell’appartamento {apartman}. Prezzo {cena}{sleva}. Prima dell’arrivo vi invieremo la nostra guida all’arrivo. Vi aspettiamo. Nikol, VIVIEN Apartments',
    lhuta: 'Per favore confermateci le date entro {lhuta}, così possiamo tenerle per voi.',
  },
  pt: {
    potvrzeni:
      'Olá {jmeno}, confirmamos a vossa estadia {termin} no apartamento {apartman}. Preço {cena}{sleva}. Antes da chegada enviaremos o nosso guia de chegada. Esperamos por vocês. Nikol, VIVIEN Apartments',
    lhuta: 'Por favor, confirmem as datas até {lhuta} para as podermos guardar para vocês.',
  },
  sv: {
    potvrzeni:
      'Hej {jmeno}, vi bekräftar er vistelse {termin} i lägenheten {apartman}. Pris {cena}{sleva}. Före ankomsten skickar vi vår ankomstguide. Varmt välkomna. Nikol, VIVIEN Apartments',
    lhuta: 'Bekräfta gärna datumen senast {lhuta} så håller vi dem åt er.',
  },
  hu: {
    potvrzeni:
      'Jó napot, {jmeno}! Visszaigazoljuk a tartózkodásukat {termin} a(z) {apartman} apartmanban. Ár: {cena}{sleva}. Érkezés előtt elküldjük az érkezési útmutatót. Várjuk Önöket. Nikol, VIVIEN Apartments',
    lhuta: 'Kérjük, {lhuta}-ig erősítsék meg az időpontot, hogy fenntarthassuk Önöknek.',
  },
  da: {
    potvrzeni:
      'Hej {jmeno}, vi bekræfter jeres ophold {termin} i lejligheden {apartman}. Pris {cena}{sleva}. Før ankomst sender vi jer vores ankomstguide. Vi glæder os til at se jer. Nikol, VIVIEN Apartments',
    lhuta: 'Bekræft venligst datoerne senest {lhuta}, så holder vi dem til jer.',
  },
  fi: {
    potvrzeni:
      'Hello {jmeno}, we confirm your stay {termin} in the {apartman} apartment. Price {cena}{sleva}. Before your arrival we will send you our arrival guide. We look forward to welcoming you. Nikol, VIVIEN Apartments',
    lhuta: 'Please reply by {lhuta} to confirm the dates, so we can keep them for you.',
  },
};

const SLEVA: Record<GuideLang, string> = {
  cs: ' (se slevou 5 %)',
  en: ' (with 5% off)',
  de: ' (mit 5 % Rabatt)',
  pl: ' (ze zniżką 5 %)',
  uk: ' (зі знижкою 5 %)',
  'zh-Hant': '（已含 5% 折扣）',
  es: ' (con 5 % de descuento)',
  fr: ' (avec 5 % de réduction)',
  it: ' (con sconto del 5 %)',
  pt: ' (com 5 % de desconto)',
  sv: ' (med 5 % rabatt)',
  hu: ' (5 % kedvezménnyel)',
  da: ' (med 5 % rabat)',
  fi: ' (5 % alennuksella)',
};

const NEJDE: Record<GuideLang, string> = {
  cs: 'Dobrý den {jmeno}, děkujeme za poptávku. Termín {termin} už bohužel nemáme volný. Můžeme vám nabídnout: {navrh}. Napište nám prosím, jestli vám to vyhovuje. Nikol, VIVIEN Apartments',
  en: 'Hello {jmeno}, thank you for your enquiry. The dates {termin} are no longer available. We can offer: {navrh}. Please let us know if that works for you. Nikol, VIVIEN Apartments',
  de: 'Guten Tag {jmeno}, danke für Ihre Anfrage. Der Termin {termin} ist leider nicht mehr frei. Wir können Ihnen anbieten: {navrh}. Schreiben Sie uns bitte, ob Ihnen das passt. Nikol, VIVIEN Apartments',
  pl: 'Dzień dobry {jmeno}, dziękujemy za zapytanie. Termin {termin} jest już niestety zajęty. Możemy zaproponować: {navrh}. Napiszcie nam proszę, czy Wam to odpowiada. Nikol, VIVIEN Apartments',
  uk: 'Добрий день, {jmeno}, дякуємо за запит. Термін {termin}, на жаль, уже зайнятий. Можемо запропонувати: {navrh}. Напишіть нам, будь ласка, чи вам це підходить. Nikol, VIVIEN Apartments',
  'zh-Hant':
    '{jmeno} 您好，感謝您的詢問。{termin} 的日期已滿。我們可提供：{navrh}。請告訴我們是否適合您。Nikol，VIVIEN Apartments',
  es: 'Hola {jmeno}, gracias por su consulta. Las fechas {termin} ya no están libres. Podemos ofrecerles: {navrh}. Escríbannos si les conviene. Nikol, VIVIEN Apartments',
  fr: 'Bonjour {jmeno}, merci pour votre demande. Les dates {termin} ne sont plus libres. Nous pouvons vous proposer : {navrh}. Dites-nous si cela vous convient. Nikol, VIVIEN Apartments',
  it: 'Buongiorno {jmeno}, grazie per la richiesta. Le date {termin} non sono più libere. Possiamo proporvi: {navrh}. Scriveteci se va bene. Nikol, VIVIEN Apartments',
  pt: 'Olá {jmeno}, agradecemos o vosso pedido. As datas {termin} já não estão livres. Podemos oferecer: {navrh}. Digam-nos se vos serve. Nikol, VIVIEN Apartments',
  sv: 'Hej {jmeno}, tack för förfrågan. Datumet {termin} är tyvärr inte ledigt längre. Vi kan erbjuda: {navrh}. Skriv gärna om det passar er. Nikol, VIVIEN Apartments',
  hu: 'Jó napot, {jmeno}! Köszönjük a megkeresést. A(z) {termin} időpont sajnos már foglalt. Ezt tudjuk ajánlani: {navrh}. Írják meg, kérjük, megfelel-e. Nikol, VIVIEN Apartments',
  da: 'Hej {jmeno}, tak for henvendelsen. Terminen {termin} er desværre ikke ledig længere. Vi kan tilbyde: {navrh}. Skriv gerne, om det passer jer. Nikol, VIVIEN Apartments',
  fi: 'Hello {jmeno}, thank you for your enquiry. The dates {termin} are no longer available. We can offer: {navrh}. Please let us know if that works for you. Nikol, VIVIEN Apartments',
};

function krestni(jmeno: string): string {
  const casti = jmeno.trim().split(/\s+/).filter(Boolean);
  return casti[0] || jmeno.trim() || 'host';
}

function dopln(s: string, mapa: Record<string, string>): string {
  return s.replace(/\{(\w+)\}/g, (_, k: string) => mapa[k] ?? '');
}

export function textPotvrditHostovi(
  z: PoptavkaZaznam,
  opts: { cenaKc: number | null; seSlevou: boolean; lhutaIso: string },
): string {
  const lang = z.jazyk || 'cs';
  const s = POTVRDIT[lang] || POTVRDIT.en;
  const apt = z.blokApt || z.apartmany[0];
  const apartman = apt ? aptRecord(apt).nazev.cs : '—';
  const termin = formatRozsahPoptavky(z.prijezd, z.odjezd, lang);
  const cena = opts.cenaKc != null ? formatKc(opts.cenaKc) : '—';
  const sleva = opts.seSlevou ? SLEVA[lang] || SLEVA.en : '';
  const lhuta = formatLhutaProHosta(opts.lhutaIso, lang);
  const mapa = {
    jmeno: krestni(z.jmeno),
    termin,
    apartman,
    cena,
    sleva,
    lhuta,
  };
  const telo = dopln(s.potvrzeni, mapa);
  const vetaLhuta = dopln(s.lhuta, mapa);
  // Věta s lhůtou před podpisem Nikol.
  if (/Nikol[,，]?\s*VIVIEN Apartments\s*$/i.test(telo)) {
    return telo.replace(/Nikol[,，]?\s*VIVIEN Apartments\s*$/i, `${vetaLhuta} Nikol, VIVIEN Apartments`);
  }
  return `${telo} ${vetaLhuta}`;
}

export function textNejdeHostovi(z: PoptavkaZaznam, navrh: string): string {
  const lang = z.jazyk || 'cs';
  const s = NEJDE[lang] || NEJDE.en;
  return dopln(s, {
    jmeno: krestni(z.jmeno),
    termin: formatRozsahPoptavky(z.prijezd, z.odjezd, lang),
    navrh: navrh.trim() || '—',
  });
}

export function odkazZpravyHostovi(
  z: PoptavkaZaznam,
  text: string,
  ios = false,
): { href: string; kanal: PoptavkaKanal } {
  const tel = (z.telefon || '').replace(/\D/g, '');
  const kanal: PoptavkaKanal =
    z.kanal === 'sms' ? 'sms' : z.kanal === 'whatsapp' || z.kanal === 'formular' || !z.kanal ? 'whatsapp' : 'whatsapp';
  if (z.kanal === 'sms') {
    return { href: odkazSmsPodekovani(tel.startsWith('+') ? z.telefon : `+${tel}`, text, ios), kanal: 'sms' };
  }
  return { href: odkazWhatsApp(tel, text), kanal: 'whatsapp' };
}

export function textPripominkyNova(z: PoptavkaZaznam): string {
  const apt = z.blokApt || z.apartmany[0];
  const apartman = apt ? aptRecord(apt).nazev.cs : z.libovolnyApartman ? 'libovolný' : '—';
  const termin = formatRozsahPoptavky(z.prijezd, z.odjezd, 'cs');
  return `Nová poptávka čeká: ${z.jmeno}, ${termin}, ${apartman}`;
}

export function textPripominkyBh(z: PoptavkaZaznam): string {
  const apt = z.blokApt || z.apartmany[0];
  const apartman = apt ? aptRecord(apt).nazev.cs : '—';
  const termin = formatRozsahPoptavky(z.prijezd, z.odjezd, 'cs');
  return `Zapiš rezervaci do Better Hotelu: ${z.jmeno}, ${termin}, ${apartman}`;
}

export function textNeozvalSe(z: PoptavkaZaznam): string {
  const apt = z.blokApt || z.apartmany[0];
  const apartman = apt ? aptRecord(apt).nazev.cs : '—';
  const termin = formatRozsahPoptavky(z.prijezd, z.odjezd, 'cs');
  return `${z.jmeno} se neozval, termín ${termin} ${apartman} uvolněn.`;
}

export type PripominkaRozhodnuti =
  | { poslat: false; duvod: string }
  | { poslat: true; text: string; druh: 'nova' | 'bh' };

/** Rozhodne, jestli teď poslat připomínku (volá se z cronu ~2 min). */
export function rozhodniPripominku(
  z: PoptavkaZaznam,
  now = new Date(),
): PripominkaRozhodnuti {
  if (jeZkouskaPoptavky(z)) return { poslat: false, duvod: 'zkouska' };
  const stav = nactiPoptavkaStav(z.stav);
  let druh: 'nova' | 'bh' | null = null;
  if (stav === 'nova' || stav === 'predbezne') druh = 'nova';
  else if (stav === 'potvrzeno') druh = 'bh';
  if (!druh) return { poslat: false, duvod: 'stav' };

  const last = z.pripominkaPosledni ? Date.parse(z.pripominkaPosledni) : 0;
  const minMs = 2 * 60 * 1000 - 5000;
  if (last && now.getTime() - last < minMs) return { poslat: false, duvod: 'interval' };

  if (jeNocPraha(now)) {
    const nocni = z.pripominkaNocniPocet || 0;
    if (nocni >= 2) return { poslat: false, duvod: 'noc' };
    // Druhá noční až po 30 min.
    if (nocni === 1 && last && now.getTime() - last < 30 * 60 * 1000 - 5000) {
      return { poslat: false, duvod: 'noc30' };
    }
  }

  return {
    poslat: true,
    text: druh === 'bh' ? textPripominkyBh(z) : textPripominkyNova(z),
    druh,
  };
}

export function poOdeslaniPripominky(z: PoptavkaZaznam, now = new Date()): PoptavkaZaznam {
  const noc = jeNocPraha(now);
  return {
    ...z,
    pripominkaPosledni: now.toISOString(),
    pripominkaNocniPocet: noc ? (z.pripominkaNocniPocet || 0) + 1 : 0,
  };
}

/** Po 8:00 reset nočního počítadla. */
export function resetNocniPokudRano(z: PoptavkaZaznam, now = new Date()): PoptavkaZaznam {
  if (!jeNocPraha(now) && (z.pripominkaNocniPocet || 0) > 0) {
    return { ...z, pripominkaNocniPocet: 0 };
  }
  return z;
}

export function blokujeObsazenost(z: PoptavkaZaznam): z is PoptavkaZaznam & { blokApt: AptId } {
  const stav = nactiPoptavkaStav(z.stav);
  return Boolean(z.blokApt && POPTAVKA_STAVY_BLOKUJI.has(stav));
}
