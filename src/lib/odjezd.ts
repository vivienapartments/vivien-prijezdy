import { casVPraze, denPraha, hodinaPraha, posunDen } from './brana';
import { CHECKOUT, HODINA_RAMCEKU_ODJEZDU, ODJEZD_KROK_MIN, ODJEZD_OD, PREDSTIH_ODJEZDU_MIN } from './constants';
import { castkaPoplatku, type PoplatekStav } from './poplatek';
import { priplatekProCas, soucetVyjezdu } from './priplatek-prijezd';
import type { OdjezdBeh, RezervaceRecord } from './store';
import type { AptId, GuideLang } from './types';

function popis(rec: Pick<RezervaceRecord, 'apartman' | 'jmeno' | 'rezervace'>): string {
  const casti = (rec.jmeno || '').trim().split(/\s+/).filter(Boolean);
  const prijmeni = casti.length ? casti[casti.length - 1] : rec.rezervace;
  return `${rec.apartman || 'Apartmán'} ${prijmeni}`;
}

export type DruhDluhu = 'poplatek' | 'prijezd' | 'cesta' | 'drive' | 'pozde';
export type PolozkaDluhu = { druh: DruhDluhu; kc: number };

export type VstupDluhu = {
  zaplaceno: string | null;
  stav: string;
  poplatek: PoplatekStav;
  noci: number | null;
  osob: number | null;
  priplatekRucni: number | null;
  casPrijezdu: string | null;
  naMiste: string | null;
  predano: string | null;
  vyjezdy: { castka: number }[];
  /** Potvrzený příplatek za dřívější příjezd. Bez potvrzení se nepřičte. */
  priplatekDrive?: number | null;
  /** Potvrzený příplatek za pozdější odjezd. */
  priplatekPozde?: number | null;
};

const PORADI_APT: Record<string, number> = { V1: 1, V2: 2, V3: 3, V4: 4, V5: 5 };

const NAZEV: Record<GuideLang, Record<DruhDluhu, string>> = {
  cs: { poplatek: 'poplatek z pobytu', prijezd: 'pozdní příjezd', cesta: 'opakovaná cesta', drive: 'dřívější příjezd', pozde: 'pozdější odjezd' },
  en: { poplatek: 'city tax', prijezd: 'late arrival', cesta: 'extra trip', drive: 'earlier arrival', pozde: 'later departure' },
  de: { poplatek: 'Ortstaxe', prijezd: 'späte Anreise', cesta: 'weitere Fahrt', drive: 'frühere Anreise', pozde: 'spätere Abreise' },
  pl: { poplatek: 'opłata miejscowa', prijezd: 'późny przyjazd', cesta: 'kolejny dojazd', drive: 'wcześniejszy przyjazd', pozde: 'późniejszy wyjazd' },
  uk: { poplatek: 'міський збір', prijezd: 'пізній приїзд', cesta: 'повторна поїздка', drive: 'ранній приїзд', pozde: 'пізніший виїзд' },
  'zh-Hant': { poplatek: '城市稅', prijezd: '較晚抵達', cesta: '再次接送', drive: '提早入住', pozde: '延遲退房' },
  es: { poplatek: 'tasa municipal', prijezd: 'llegada tardía', cesta: 'viaje extra', drive: 'llegada anticipada', pozde: 'salida más tarde' },
  fr: { poplatek: 'taxe de séjour', prijezd: 'arrivée tardive', cesta: 'trajet supplémentaire', drive: 'arrivée plus tôt', pozde: 'départ plus tard' },
  it: { poplatek: 'tassa di soggiorno', prijezd: 'arrivo tardivo', cesta: 'corsa in più', drive: 'arrivo anticipato', pozde: 'partenza posticipata' },
  sv: { poplatek: 'stadsskatt', prijezd: 'sen ankomst', cesta: 'extra resa', drive: 'tidigare ankomst', pozde: 'senare avresa' },
  hu: { poplatek: 'idegenforgalmi adó', prijezd: 'késői érkezés', cesta: 'ismételt út', drive: 'korábbi érkezés', pozde: 'későbbi távozás' },
};

function jazyk(lang: GuideLang | null): GuideLang {
  if (lang && lang in NAZEV) return lang;
  return 'en';
}

function mena(lang: GuideLang): string {
  return lang === 'cs' ? 'Kč' : 'CZK';
}

function castka(kc: number, lang: GuideLang): string {
  return `${kc}\u00A0${mena(lang)}`;
}

export function jeHodina(cas: string | null | undefined): cas is string {
  return Boolean(cas && /^([01]\d|2[0-3]):[0-5]\d$/.test(cas));
}

function minuty(cas: string): number {
  const [h, m] = cas.split(':').map(Number);
  return h * 60 + m;
}

/** 09:30 se hostovi i majiteli ukáže jako 9:30. 10:00 zůstane. */
export function zobrazCas(cas: string): string {
  return cas.replace(/^0/, '');
}

export function slotsOdjezdu(): string[] {
  const od = minuty(ODJEZD_OD);
  const dokud = minuty(CHECKOUT);
  const ven: string[] = [];
  for (let m = od; m <= dokud; m += ODJEZD_KROK_MIN) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    ven.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return ven;
}

export function jeSlotOdjezdu(cas: string): boolean {
  return slotsOdjezdu().includes(cas);
}

function casZIso(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Prague',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(t));
  const hod = parts.find((p) => p.type === 'hour')?.value || '';
  const min = parts.find((p) => p.type === 'minute')?.value || '';
  const cas = `${hod}:${min}`;
  return jeHodina(cas) ? cas : null;
}

/** Po Zaplaceno je dluh pryč. Jinak poplatek, pozdní příjezd a cesty. */
export function polozkyDluhu(v: VstupDluhu): PolozkaDluhu[] {
  if (v.zaplaceno || v.stav === 'zruseno') return [];
  const ven: PolozkaDluhu[] = [];
  if (v.poplatek === 'ano') {
    const kc = castkaPoplatku(v.noci, v.osob);
    if (kc) ven.push({ druh: 'poplatek', kc });
  }
  if (typeof v.priplatekRucni === 'number' && v.priplatekRucni > 0) {
    ven.push({ druh: 'prijezd', kc: Math.round(v.priplatekRucni) });
  } else {
    const zdroj = casZIso(v.naMiste) || casZIso(v.predano) || (jeHodina(v.casPrijezdu) ? v.casPrijezdu : null);
    const kc = zdroj ? priplatekProCas(zdroj) : null;
    if (kc) ven.push({ druh: 'prijezd', kc });
  }
  const cesta = soucetVyjezdu(v.vyjezdy || []);
  if (cesta > 0) ven.push({ druh: 'cesta', kc: cesta });
  if (typeof v.priplatekDrive === 'number' && v.priplatekDrive > 0) ven.push({ druh: 'drive', kc: Math.round(v.priplatekDrive) });
  if (typeof v.priplatekPozde === 'number' && v.priplatekPozde > 0) ven.push({ druh: 'pozde', kc: Math.round(v.priplatekPozde) });
  return ven;
}

export function polozkyZRezervace(rec: RezervaceRecord): PolozkaDluhu[] {
  return polozkyDluhu({
    zaplaceno: rec.zaplaceno,
    stav: rec.stav,
    poplatek: rec.poplatek,
    noci: rec.noci,
    osob: rec.osob,
    priplatekRucni: rec.priplatekRucni,
    casPrijezdu: rec.casPrijezdu,
    naMiste: rec.naMiste,
    predano: rec.predano,
    vyjezdy: rec.vyjezdy || [],
    priplatekDrive: rec.zadostPrijezd?.stav === 'potvrzeno' ? rec.zadostPrijezd.kc : null,
    priplatekPozde: rec.zadostOdjezd?.stav === 'potvrzeno' ? rec.zadostOdjezd.kc : null,
  });
}

export function soucetDluhu(polozky: PolozkaDluhu[]): number {
  return polozky.reduce((s, p) => s + p.kc, 0);
}

/** Pro majitele. I jedna položka má částku v závorce. */
export function textRozpisu(polozky: PolozkaDluhu[]): string {
  if (!polozky.length) return '';
  const lang: GuideLang = 'cs';
  const soucet = soucetDluhu(polozky);
  const vnitrni = polozky
    .map((p) => `${NAZEV.cs[p.druh]}${polozky.length > 1 ? ` ${castka(p.kc, lang)}` : ''}`)
    .join(', ');
  return `${castka(soucet, lang)} (${vnitrni})`;
}

function vetaDluhu(lang: GuideLang, polozky: PolozkaDluhu[]): string {
  if (!polozky.length) return '';
  const j = jazyk(lang);
  const soucet = soucetDluhu(polozky);
  const vnitrni =
    polozky.length === 1
      ? NAZEV[j][polozky[0].druh]
      : polozky.map((p) => `${NAZEV[j][p.druh]} ${castka(p.kc, j)}`).join(', ');
  const sablony: Record<GuideLang, string> = {
    cs: `Při převzetí apartmánu vyrovnáme ještě ${castka(soucet, j)} (${vnitrni}).`,
    en: `When we take over the apartment, we will settle the remaining ${castka(soucet, j)} (${vnitrni}).`,
    de: `Bei der Übergabe des Apartments begleichen wir noch ${castka(soucet, j)} (${vnitrni}).`,
    pl: `Przy odbiorze apartamentu rozliczymy jeszcze ${castka(soucet, j)} (${vnitrni}).`,
    uk: `Під час приймання апартаментів розрахуємо ще ${castka(soucet, j)} (${vnitrni}).`,
    'zh-Hant': `交接公寓時，我們會一併結清剩下的 ${castka(soucet, j)}（${vnitrni}）。`,
    es: `Al recoger el apartamento saldaremos todavía ${castka(soucet, j)} (${vnitrni}).`,
    fr: `À la reprise de l'appartement, nous réglerons encore ${castka(soucet, j)} (${vnitrni}).`,
    it: `Al ritiro dell'appartamento salderemo ancora ${castka(soucet, j)} (${vnitrni}).`,
    sv: `När vi tar över lägenheten gör vi upp de återstående ${castka(soucet, j)} (${vnitrni}).`,
    hu: `A lakás átvételekor rendezzük a fennmaradó ${castka(soucet, j)} összeget (${vnitrni}).`,
  };
  return sablony[j];
}

const ODSTAVEC: Record<GuideLang, { a: string; b: string; odkaz: string; podpis: string }> = {
  cs: {
    a: `Dobrý den, zítra vás čeká odjezd. Napište nám, v kolik budete odjíždět, ať se s vámi můžeme osobně rozloučit a převzít apartmán. Standardní odjezd je do ${CHECKOUT}.`,
    b: 'Pokud máte před odjezdem jakékoli přání, stačí nám napsat. Moc se těšíme na naše poslední setkání.',
    odkaz: 'Čas můžete zadat i tady: {odkaz}',
    podpis: 'Nikol a rodina VIVIEN',
  },
  en: {
    a: `Hello, tomorrow is your departure day. Let us know what time you will be leaving so we can say goodbye in person and take over the apartment. Standard check-out is by ${CHECKOUT}.`,
    b: 'If you have any request before you leave, just write to us. We are looking forward to seeing you one last time.',
    odkaz: 'You can also enter the time here: {odkaz}',
    podpis: 'Nikol and the VIVIEN family',
  },
  de: {
    a: `Guten Tag, morgen ist Ihr Abreisetag. Schreiben Sie uns, um wie viel Uhr Sie abfahren, damit wir uns persönlich verabschieden und das Apartment übernehmen können. Die übliche Abreise ist bis ${CHECKOUT}.`,
    b: 'Wenn Sie vor der Abreise einen Wunsch haben, schreiben Sie uns. Wir freuen uns auf unser letztes Treffen.',
    odkaz: 'Die Uhrzeit können Sie auch hier eintragen: {odkaz}',
    podpis: 'Nikol und Familie VIVIEN',
  },
  pl: {
    a: `Dzień dobry, jutro czeka was wyjazd. Napiszcie, o której wyjeżdżacie, żebyśmy mogli pożegnać się osobiście i odebrać apartament. Zwykły wyjazd jest do ${CHECKOUT}.`,
    b: 'Jeśli macie przed wyjazdem jakieś życzenie, napiszcie do nas. Cieszymy się na nasze ostatnie spotkanie.',
    odkaz: 'Godzinę możecie podać też tutaj: {odkaz}',
    podpis: 'Nikol i rodzina VIVIEN',
  },
  uk: {
    a: `Добрий день, завтра у вас виїзд. Напишіть, о котрій виїжджаєте, щоб ми могли особисто попрощатися і прийняти апартаменти. Звичайний виїзд до ${CHECKOUT}.`,
    b: 'Якщо перед виїздом маєте якесь прохання, напишіть нам. Дуже чекаємо на нашу останню зустріч.',
    odkaz: 'Час можна вказати і тут: {odkaz}',
    podpis: 'Nikol і родина VIVIEN',
  },
  'zh-Hant': {
    a: `您好，明天是您的退房日。請告訴我們離開的時間，我們好當面道別並交接公寓。一般退房時間是 ${CHECKOUT} 前。`,
    b: '離開前如果有任何需要，寫給我們即可。我們很期待最後一次見面。',
    odkaz: '也可以在這裡填寫時間：{odkaz}',
    podpis: 'Nikol 與 VIVIEN 家人',
  },
  es: {
    a: `Hola, mañana es el día de su salida. Escríbannos a qué hora se van, para despedirnos en persona y recoger el apartamento. La salida habitual es hasta las ${CHECKOUT}.`,
    b: 'Si tienen algún deseo antes de irse, escríbannos. Nos alegra verles una última vez.',
    odkaz: 'También pueden indicar la hora aquí: {odkaz}',
    podpis: 'Nikol y la familia VIVIEN',
  },
  fr: {
    a: `Bonjour, demain est le jour de votre départ. Écrivez-nous à quelle heure vous partez, pour que nous puissions vous dire au revoir en personne et reprendre l'appartement. Le départ habituel est jusqu'à ${CHECKOUT}.`,
    b: 'Si vous avez un souhait avant le départ, écrivez-nous. Nous nous réjouissons de cette dernière rencontre.',
    odkaz: 'Vous pouvez aussi indiquer l\'heure ici : {odkaz}',
    podpis: 'Nikol et la famille VIVIEN',
  },
  it: {
    a: `Buongiorno, domani è il giorno della partenza. Scriveteci a che ora partite, così possiamo salutarvi di persona e ritirare l'appartamento. La partenza abituale è entro le ${CHECKOUT}.`,
    b: 'Se avete un desiderio prima della partenza, scriveteci. Non vediamo l\'ora di questo ultimo incontro.',
    odkaz: 'Potete indicare l\'orario anche qui: {odkaz}',
    podpis: 'Nikol e la famiglia VIVIEN',
  },
  sv: {
    a: `Hej, i morgon är det avresedag. Skriv till oss vilken tid ni åker, så att vi kan ta farväl personligen och ta över lägenheten. Vanlig avresa är senast ${CHECKOUT}.`,
    b: 'Om ni har ett önskemål före avresan, skriv till oss. Vi ser fram emot vårt sista möte.',
    odkaz: 'Ni kan också fylla i tiden här: {odkaz}',
    podpis: 'Nikol och familjen VIVIEN',
  },
  hu: {
    a: `Jó napot, holnap az elutazás napja. Írják meg, hánykor indulnak, hogy személyesen elköszönhessünk és átvegyük a lakást. A szokásos elutazás ${CHECKOUT}-ig tart.`,
    b: 'Ha elutazás előtt van bármilyen kérésük, írjanak nekünk. Nagyon várjuk az utolsó találkozást.',
    odkaz: 'Az időpontot itt is megadhatják: {odkaz}',
    podpis: 'Nikol és a VIVIEN család',
  },
};

export function zpravaOdjezdu(lang: GuideLang | null, polozky: PolozkaDluhu[], odkaz: string | null): string {
  const j = jazyk(lang);
  const t = ODSTAVEC[j];
  const dluh = vetaDluhu(j, polozky);
  const prvni = dluh ? `${t.a} ${dluh}` : t.a;
  const dily = [prvni, t.b];
  if (odkaz) dily.push(t.odkaz.replace('{odkaz}', odkaz));
  dily.push(t.podpis);
  return dily.join('\n\n');
}

export const PREDMET_ODJEZDU: Record<GuideLang, string> = {
  cs: 'VIVIEN · Váš odjezd {datum}',
  en: 'VIVIEN · Your departure {datum}',
  de: 'VIVIEN · Ihre Abreise {datum}',
  pl: 'VIVIEN · Wasz wyjazd {datum}',
  uk: 'VIVIEN · Ваш виїзд {datum}',
  'zh-Hant': 'VIVIEN · 您的退房 {datum}',
  es: 'VIVIEN · Su salida {datum}',
  fr: 'VIVIEN · Votre départ {datum}',
  it: 'VIVIEN · La vostra partenza {datum}',
  sv: 'VIVIEN · Er avresa {datum}',
  hu: 'VIVIEN · Az elutazásuk {datum}',
};

export function ukazatDotazOdjezdu(opts: {
  stav?: string;
  odjezd?: string | null;
  dnes: string;
  casOdjezdu?: string | null;
}): boolean {
  if (opts.stav === 'zruseno') return false;
  if (!opts.odjezd) return false;
  if (jeHodina(opts.casOdjezdu)) return false;
  const denPred = posunDen(opts.odjezd, -1);
  return opts.dnes === opts.odjezd || opts.dnes === denPred;
}

export function ukazatCasNaKarte(odjezd: string | null, dnes: string): boolean {
  if (!odjezd) return false;
  return dnes === odjezd || dnes === posunDen(odjezd, -1);
}

export function ukazatRamecekOdjezdu(odjezd: string | null, now = new Date()): boolean {
  if (!odjezd) return false;
  const dnes = denPraha(now);
  if (dnes > odjezd) return false;
  if (dnes === odjezd) return true;
  return dnes === posunDen(odjezd, -1) && hodinaPraha(now) >= HODINA_RAMCEKU_ODJEZDU;
}

export const TEXT_ODJEZDU: Record<
  GuideLang,
  { nadpisZitra: string; nadpisDnes: string; poznamka: string; ulozit: string; zmenit: string; radek: string }
> = {
  cs: {
    nadpisZitra: 'V kolik zítra odjíždíte?',
    nadpisDnes: 'V kolik dnes odjíždíte?',
    poznamka: 'Pozdější čas jen po domluvě.',
    ulozit: 'Uložit',
    zmenit: 'změnit',
    radek: 'Odjezd',
  },
  en: {
    nadpisZitra: 'What time are you leaving tomorrow?',
    nadpisDnes: 'What time are you leaving today?',
    poznamka: 'A later time only by agreement.',
    ulozit: 'Save',
    zmenit: 'change',
    radek: 'Departure',
  },
  de: {
    nadpisZitra: 'Um wie viel Uhr reisen Sie morgen ab?',
    nadpisDnes: 'Um wie viel Uhr reisen Sie heute ab?',
    poznamka: 'Eine spätere Zeit nur nach Absprache.',
    ulozit: 'Speichern',
    zmenit: 'ändern',
    radek: 'Abreise',
  },
  pl: {
    nadpisZitra: 'O której jutro wyjeżdżacie?',
    nadpisDnes: 'O której dziś wyjeżdżacie?',
    poznamka: 'Późniejsza godzina tylko po uzgodnieniu.',
    ulozit: 'Zapisz',
    zmenit: 'zmień',
    radek: 'Wyjazd',
  },
  uk: {
    nadpisZitra: 'О котрій завтра виїжджаєте?',
    nadpisDnes: 'О котрій сьогодні виїжджаєте?',
    poznamka: 'Пізніший час лише за домовленістю.',
    ulozit: 'Зберегти',
    zmenit: 'змінити',
    radek: 'Виїзд',
  },
  'zh-Hant': {
    nadpisZitra: '明天幾點離開？',
    nadpisDnes: '今天幾點離開？',
    poznamka: '更晚的時間需要先說好。',
    ulozit: '儲存',
    zmenit: '更改',
    radek: '退房',
  },
  es: {
    nadpisZitra: '¿A qué hora se van mañana?',
    nadpisDnes: '¿A qué hora se van hoy?',
    poznamka: 'Una hora más tarde solo con acuerdo.',
    ulozit: 'Guardar',
    zmenit: 'cambiar',
    radek: 'Salida',
  },
  fr: {
    nadpisZitra: 'À quelle heure partez-vous demain ?',
    nadpisDnes: 'À quelle heure partez-vous aujourd\'hui ?',
    poznamka: 'Une heure plus tardive seulement après accord.',
    ulozit: 'Enregistrer',
    zmenit: 'modifier',
    radek: 'Départ',
  },
  it: {
    nadpisZitra: 'A che ora partite domani?',
    nadpisDnes: 'A che ora partite oggi?',
    poznamka: 'Un orario più tardi solo su accordo.',
    ulozit: 'Salva',
    zmenit: 'cambia',
    radek: 'Partenza',
  },
  sv: {
    nadpisZitra: 'Vilken tid åker ni i morgon?',
    nadpisDnes: 'Vilken tid åker ni i dag?',
    poznamka: 'En senare tid bara efter överenskommelse.',
    ulozit: 'Spara',
    zmenit: 'ändra',
    radek: 'Avresa',
  },
  hu: {
    nadpisZitra: 'Hánykor utaznak el holnap?',
    nadpisDnes: 'Hánykor utaznak el ma?',
    poznamka: 'Későbbi időpont csak megbeszélés után.',
    ulozit: 'Mentés',
    zmenit: 'módosít',
    radek: 'Elutazás',
  },
};

function sklon(n: number, jeden: string, dva: string, pet: string): string {
  if (n === 1) return `1 ${jeden}`;
  if (n >= 2 && n <= 4) return `${n} ${dva}`;
  return `${n} ${pet}`;
}

export function textVecer(pocet: number): string {
  return `Zítra odjíždí ${sklon(pocet, 'host', 'hosté', 'hostů')}. Pošlete dotaz na odjezd.`;
}

export function textPripominky(pocet: number): string {
  const komu = pocet === 1 ? '1 hostu' : `${pocet} hostům`;
  return `${komu} jste ještě neposlali dotaz na odjezd.`;
}

export function textPulHodiny(rec: Pick<RezervaceRecord, 'apartman' | 'jmeno' | 'rezervace' | 'casOdjezdu'>, polozky: PolozkaDluhu[]): string {
  const cas = jeHodina(rec.casOdjezdu) ? zobrazCas(rec.casOdjezdu) : '';
  const zaklad = `${popis(rec)} odjíždí v ${cas} (za půl hodiny)`;
  const dluh = textRozpisu(polozky);
  return dluh ? `${zaklad}, dluží ${dluh}` : zaklad;
}

export function textHostUlozil(rec: Pick<RezervaceRecord, 'apartman' | 'jmeno' | 'rezervace'>, cas: string): string {
  return `${popis(rec)} odjede v ${zobrazCas(cas)}`;
}

export function textSouhrnu(radky: { rec: Pick<RezervaceRecord, 'apartman' | 'jmeno' | 'rezervace'>; polozky: PolozkaDluhu[] }[]): string {
  const kusy = radky.map((r) => `${popis(r.rec)} ${textRozpisu(r.polozky)}`);
  return `Dnes odjíždí a dluží: ${kusy.join(' · ')}`;
}

export function seradOdjezdy<T extends { apartman: AptId | null; jmeno?: string | null }>(radky: T[]): T[] {
  return [...radky].sort((a, b) => {
    const pa = a.apartman ? PORADI_APT[a.apartman] ?? 9 : 9;
    const pb = b.apartman ? PORADI_APT[b.apartman] ?? 9 : 9;
    if (pa !== pb) return pa - pb;
    return (a.jmeno || '').localeCompare(b.jmeno || '', 'cs');
  });
}

function odjizdi(rec: RezervaceRecord, den: string): boolean {
  return rec.stav !== 'zruseno' && rec.odjezd === den;
}

export function hosteNaDen(list: RezervaceRecord[], den: string): RezervaceRecord[] {
  return seradOdjezdy(list.filter((r) => odjizdi(r, den)));
}

export function chybiDotaz(rec: RezervaceRecord): boolean {
  return !jeHodina(rec.casOdjezdu) && !rec.odjezdDotaz;
}

export function klicOdjezdu(rec: Pick<RezervaceRecord, 'odjezd' | 'casOdjezdu'>): string | null {
  if (!rec.odjezd || !jeHodina(rec.casOdjezdu)) return null;
  return `${rec.odjezd} ${rec.casOdjezdu}`;
}

export function maUpozornitPul(rec: RezervaceRecord, now = new Date()): boolean {
  if (rec.stav === 'zruseno') return false;
  const klic = klicOdjezdu(rec);
  if (!klic || !rec.odjezd || !jeHodina(rec.casOdjezdu)) return false;
  if (rec.odjezdPushPul === klic) return false;
  const [hodina, minuta] = rec.casOdjezdu.split(':').map(Number);
  const odjezd = casVPraze(rec.odjezd, hodina, minuta);
  const od = new Date(odjezd.getTime() - PREDSTIH_ODJEZDU_MIN * 60_000);
  return now >= od && now < odjezd;
}

export function prazdnyOdjezdBeh(): OdjezdBeh {
  return { vecer: null, pripominka: null, rano: null, uklid: null };
}

export function nactiOdjezdBeh(raw: unknown): OdjezdBeh {
  const b = raw && typeof raw === 'object' ? (raw as OdjezdBeh) : prazdnyOdjezdBeh();
  const den = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const uklid =
    typeof b.uklid === 'string' && /^\d{4}-\d{2}-\d{2}:(?:V[1-5](?:,V[1-5])*)?$/.test(b.uklid) ? b.uklid : null;
  return { vecer: den(b.vecer), pripominka: den(b.pripominka), rano: den(b.rano), uklid };
}

