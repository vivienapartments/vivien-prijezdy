import { createHmac, timingSafeEqual } from 'crypto';
import type { GuideLang } from './types';
import type { RezervaceRecord } from './store';

export type KdoZavad = 'miluska' | 'nikol' | 'pravoslav';

export type ZavadyPredani = {
  text: string;
  /** Kdy se zápis uložil. U starších záznamů může chybět. */
  kdy: string;
  kdo: KdoZavad;
  /** null = uloženo, e-mail ještě neodešel. */
  odeslanoKdy: string | null;
  potvrzenoKdy: string | null;
};

export type ZavadyPoOdjezdu = {
  text: string;
  kdy: string;
  kdo: KdoZavad;
  odeslanoKdy: string | null;
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

function nactiKdo(raw: unknown): KdoZavad {
  return raw === 'miluska' || raw === 'nikol' || raw === 'pravoslav' ? raw : 'pravoslav';
}

export function nactiZavady(raw: unknown): ZavadyPredani | null {
  if (!raw || typeof raw !== 'object') return null;
  const z = raw as Record<string, unknown>;
  if (typeof z.text !== 'string' || !z.text.trim()) return null;
  const odeslanoKdy =
    typeof z.odeslanoKdy === 'string' && z.odeslanoKdy ? z.odeslanoKdy : null;
  const kdy =
    typeof z.kdy === 'string' && z.kdy
      ? z.kdy
      : odeslanoKdy || '';
  if (!kdy && !odeslanoKdy) return null;
  return {
    text: z.text.trim().slice(0, MAX_TEXT),
    kdy: kdy || odeslanoKdy || '',
    kdo: nactiKdo(z.kdo),
    odeslanoKdy,
    potvrzenoKdy: typeof z.potvrzenoKdy === 'string' && z.potvrzenoKdy ? z.potvrzenoKdy : null,
  };
}

export function nactiZavadyPoOdjezdu(raw: unknown): ZavadyPoOdjezdu | null {
  if (!raw || typeof raw !== 'object') return null;
  const z = raw as Record<string, unknown>;
  if (typeof z.text !== 'string' || !z.text.trim()) return null;
  if (typeof z.kdy !== 'string' || !z.kdy) return null;
  return {
    text: z.text.trim().slice(0, MAX_TEXT),
    kdy: z.kdy,
    kdo: nactiKdo(z.kdo),
    odeslanoKdy: typeof z.odeslanoKdy === 'string' && z.odeslanoKdy ? z.odeslanoKdy : null,
  };
}

export function jeKdoZavad(v: unknown): KdoZavad | null {
  return v === 'miluska' || v === 'nikol' || v === 'pravoslav' ? v : null;
}

export function maZavadyTrvale(rec: {
  zavadyPredani?: unknown;
  zavadyPoOdjezdu?: unknown;
}): boolean {
  return Boolean(rec.zavadyPredani || rec.zavadyPoOdjezdu);
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
  const skryta = SKRYTA_ZAVADA[jazykZavad(lang)];
  const mapa: Record<GuideLang, string> = {
    cs: `Dobrý den, při předání apartmánu jsme zapsali:\n\n${zavady}\n\n${skryta}\n\nPotvrďte prosím tlačítkem níže.`,
    en: `Hello, at the apartment handover we noted:\n\n${zavady}\n\n${skryta}\n\nPlease confirm with the button below.`,
    de: `Guten Tag, bei der Übergabe des Apartments haben wir notiert:\n\n${zavady}\n\n${skryta}\n\nBitte bestätigen Sie mit der Schaltfläche unten.`,
    pl: `Dzień dobry, przy przekazaniu apartamentu zapisaliśmy:\n\n${zavady}\n\n${skryta}\n\nPotwierdźcie proszę przyciskiem poniżej.`,
    uk: `Добрий день, під час передачі апартаментів ми записали:\n\n${zavady}\n\n${skryta}\n\nПідтвердіть будь ласка кнопкою нижче.`,
    'zh-Hant': `您好，交接公寓時我們記下了：\n\n${zavady}\n\n${skryta}\n\n請用下方按鈕確認。`,
    sv: `Hej, vid överlämningen av lägenheten skrev vi ner:\n\n${zavady}\n\n${skryta}\n\nBekräfta gärna med knappen nedan.`,
    es: `Hola, en la entrega del apartamento anotamos:\n\n${zavady}\n\n${skryta}\n\nConfirmen con el botón de abajo, por favor.`,
    fr: `Bonjour, lors de la remise de l'appartement nous avons noté :\n\n${zavady}\n\n${skryta}\n\nMerci de confirmer avec le bouton ci-dessous.`,
    it: `Buongiorno, alla consegna dell'appartamento abbiamo annotato:\n\n${zavady}\n\n${skryta}\n\nConfermate con il pulsante qui sotto.`,
    hu: `Jó napot, az apartman átadásakor ezt jegyeztük fel:\n\n${zavady}\n\n${skryta}\n\nKérjük, erősítsék meg az alábbi gombbal.`,
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
  if (z.odeslanoKdy) return 'Závady · čeká na potvrzení';
  return 'Závady · neodesláno';
}

export function stavZavadPoOdjezdu(z: ZavadyPoOdjezdu | null | undefined): string | null {
  if (!z) return null;
  if (z.odeslanoKdy) return 'Závady po odjezdu · odesláno';
  return 'Závady po odjezdu · neodesláno';
}

export function jmenoKdoZavad(kdo: KdoZavad): string {
  if (kdo === 'miluska') return 'Miluška';
  if (kdo === 'nikol') return 'Nikol';
  return 'Pravoslav';
}

export function potvrdZavady(rec: RezervaceRecord, odeslanoKdy: string, now = new Date()): RezervaceRecord | null {
  const z = rec.zavadyPredani;
  if (!z || !z.odeslanoKdy || z.odeslanoKdy !== odeslanoKdy) return null;
  if (z.potvrzenoKdy) return rec;
  const cas = now.toISOString();
  return {
    ...rec,
    zavadyPredani: { ...z, potvrzenoKdy: cas },
    historie: [...rec.historie, { cas, co: 'Host potvrdil závady z předání' }].slice(-40),
  };
}

/** Věta o skrytých závadách (schváleno majitelem). E-mail „Zápis z předání“ i stránka /zavady/[token]. */
export const SKRYTA_ZAVADA: Record<GuideLang, string> = {
  cs: "Zápis zachycuje stav, který byl vidět při předání. Neznamená, že se později nemůže objevit další skrytá závada, a nevylučuje, že ji budeme řešit.",
  en: "This record shows the condition that was visible at handover. It does not mean that another hidden defect cannot appear later, and it does not rule out that we will deal with it.",
  de: "Dieser Vermerk zeigt den Zustand, der bei der Übergabe sichtbar war. Er bedeutet nicht, dass später kein weiterer verborgener Mangel auftreten kann, und schließt nicht aus, dass wir uns darum kümmern.",
  pl: "Zapis pokazuje stan widoczny przy przekazaniu. Nie oznacza, że później nie może pojawić się kolejna ukryta usterka, i nie wyklucza, że będziemy się nią zajmować.",
  uk: "Запис фіксує стан, який було видно під час передачі. Він не означає, що згодом не може з’явитися інший прихований дефект, і не виключає, що ми будемо його вирішувати.",
  'zh-Hant': "此紀錄僅呈現交接時可見的狀況。這並不表示之後不會出現其他隱藏的瑕疵，也不排除我們會另行處理。",
  sv: "Anteckningen visar skicket som syntes vid överlämningen. Den betyder inte att ingen annan dold brist kan dyka upp senare, och utesluter inte att vi kommer att hantera den.",
  es: "Esta anotación recoge el estado visible en la entrega. No significa que más adelante no pueda aparecer otro defecto oculto, ni excluye que lo tratemos.",
  fr: "Ce relevé décrit l’état visible lors de la remise. Il ne signifie pas qu’un autre défaut caché ne puisse pas apparaître plus tard et n’exclut pas que nous nous en occupions.",
  it: "Questa nota riporta lo stato visibile alla consegna. Non significa che più avanti non possa emergere un altro difetto nascosto e non esclude che ce ne occuperemo.",
  hu: "A feljegyzés az átadáskor látható állapotot rögzíti. Nem jelenti azt, hogy később nem derülhet ki újabb rejtett hiba, és nem zárja ki, hogy foglalkozunk vele.",
};

/** Prompt 49 · předmět e-mailu hostovi, který odjel. */
export const PREDMET_PO_ODJEZDU: Record<GuideLang, string> = {
  cs: "VIVIEN · Zápis po odjezdu",
  en: "VIVIEN · Notes after your departure",
  de: "VIVIEN · Vermerk nach Ihrer Abreise",
  pl: "VIVIEN · Zapis po wyjeździe",
  uk: "VIVIEN · Запис після виїзду",
  'zh-Hant': "VIVIEN · 退房後紀錄",
  sv: "VIVIEN · Anteckning efter avresa",
  es: "VIVIEN · Anotación tras su salida",
  fr: "VIVIEN · Relevé après votre départ",
  it: "VIVIEN · Nota dopo la partenza",
  hu: "VIVIEN · Feljegyzés távozás után",
};

/** Prompt 49 · úvod e-mailu po odjezdu (schváleno). */
export const UVOD_PO_ODJEZDU: Record<GuideLang, string> = {
  cs: "Dobrý den, při úklidu po vašem odjezdu jsme v apartmánu zjistili:",
  en: "Hello, when cleaning after your departure we found the following in the apartment:",
  de: "Guten Tag, bei der Reinigung nach Ihrer Abreise haben wir im Apartment Folgendes festgestellt:",
  pl: "Dzień dobry, podczas sprzątania po Waszym wyjeździe stwierdziliśmy w apartamencie:",
  uk: "Добрий день, під час прибирання після вашого виїзду ми виявили в апартаментах:",
  'zh-Hant': "您好，在您退房後清潔時，我們在公寓中發現：",
  sv: "Hej, vid städningen efter er avresa upptäckte vi följande i lägenheten:",
  es: "Hola, al limpiar después de su salida encontramos en el apartamento lo siguiente:",
  fr: "Bonjour, lors du ménage après votre départ, nous avons constaté dans l’appartement :",
  it: "Buongiorno, durante le pulizie dopo la vostra partenza abbiamo riscontrato nell’appartamento:",
  hu: "Jó napot, a távozásuk utáni takarításkor az apartmanban a következőt találtuk:",
};

/** Prompt 49 · prosba o odpověď. */
export const PROSBA_PO_ODJEZDU: Record<GuideLang, string> = {
  cs: "Napište nám prosím odpovědí na tento e-mail, jak k tomu došlo.",
  en: "Please reply to this e-mail and let us know how it happened.",
  de: "Bitte antworten Sie auf diese E-Mail und teilen Sie uns mit, wie es dazu kam.",
  pl: "Prosimy o odpowiedź na tego e-maila i informację, jak do tego doszło.",
  uk: "Будь ласка, дайте відповідь на цей лист і напишіть, як це сталося.",
  'zh-Hant': "請直接回覆此郵件，告訴我們事情經過。",
  sv: "Svara gärna på detta e-postmeddelande och berätta hur det hände.",
  es: "Por favor, respondan a este correo y cuéntennos cómo ocurrió.",
  fr: "Merci de répondre à cet e-mail pour nous dire comment cela s’est produit.",
  it: "Vi preghiamo di rispondere a questa e-mail e di dirci come è successo.",
  hu: "Kérjük, válaszoljanak erre az e-mailre, és írják meg, hogyan történt.",
};

/** Prompt 49 · věta o skrytých závadách po odjezdu (schváleno). */
export const SKRYTA_PO_ODJEZDU: Record<GuideLang, string> = {
  cs: "Zápis nevylučuje, že se později objeví další skrytá závada, kterou budeme také řešit.",
  en: "This record does not rule out that another hidden defect may appear later, which we will also deal with.",
  de: "Dieser Vermerk schließt nicht aus, dass später ein weiterer verborgener Mangel auftritt, um den wir uns ebenfalls kümmern werden.",
  pl: "Zapis nie wyklucza, że później pojawi się kolejna ukryta usterka, którą również będziemy rozwiązywać.",
  uk: "Запис не виключає, що згодом з’явиться інший прихований дефект, який ми також будемо вирішувати.",
  'zh-Hant': "此紀錄不排除之後發現其他隱藏瑕疵，我們也會一併處理。",
  sv: "Anteckningen utesluter inte att ytterligare en dold brist kan visa sig senare, som vi då också kommer att hantera.",
  es: "Esta anotación no excluye que más adelante aparezca otro defecto oculto, que también trataremos.",
  fr: "Ce relevé n’exclut pas qu’un autre défaut caché apparaisse plus tard, dont nous nous occuperons également.",
  it: "Questa nota non esclude che più avanti emerga un altro difetto nascosto, di cui ci occuperemo ugualmente.",
  hu: "A feljegyzés nem zárja ki, hogy később újabb rejtett hiba derül ki, amellyel szintén foglalkozni fogunk.",
};

/** Podpis e-mailů se závadami. */
export const PODPIS_ZAVADY: Record<GuideLang, string> = {
  cs: "Nikol a rodina VIVIEN",
  en: "Nikol and the VIVIEN family",
  de: "Nikol und Familie VIVIEN",
  pl: "Nikol i rodzina VIVIEN",
  uk: "Nikol і родина VIVIEN",
  'zh-Hant': "Nikol 與 VIVIEN 家族",
  sv: "Nikol och familjen VIVIEN",
  es: "Nikol y la familia VIVIEN",
  fr: "Nikol et la famille VIVIEN",
  it: "Nikol e la famiglia VIVIEN",
  hu: "Nikol és a VIVIEN család",
};

/** Texty stránky /zavady/[token] v jazyce hosta (rec.jazyk). */
export const STRANKA_ZAVAD: Record<GuideLang, { nadpis: string; potvrzeno: string; neplatny: string; zmizel: string; odesilam: string; chyba: string }> = {
  cs: {
    nadpis: "Zápis z předání",
    potvrzeno: "Děkujeme. Zápis je potvrzený.",
    neplatny: "Tento odkaz neplatí.",
    zmizel: "Zápis z předání tu už není.",
    odesilam: "Odesílám…",
    chyba: "Potvrzení se nepodařilo.",
  },
  en: {
    nadpis: "Handover notes",
    potvrzeno: "Thank you. The record is confirmed.",
    neplatny: "This link is not valid.",
    zmizel: "The handover record is no longer here.",
    odesilam: "Sending…",
    chyba: "The confirmation did not go through.",
  },
  de: {
    nadpis: "Notiz zur Übergabe",
    potvrzeno: "Danke. Der Vermerk ist bestätigt.",
    neplatny: "Dieser Link ist nicht gültig.",
    zmizel: "Der Übergabevermerk ist nicht mehr verfügbar.",
    odesilam: "Wird gesendet…",
    chyba: "Die Bestätigung hat nicht funktioniert.",
  },
  pl: {
    nadpis: "Zapis z przekazania",
    potvrzeno: "Dziękujemy. Zapis został potwierdzony.",
    neplatny: "Ten link jest nieważny.",
    zmizel: "Zapisu z przekazania już tu nie ma.",
    odesilam: "Wysyłanie…",
    chyba: "Potwierdzenie się nie powiodło.",
  },
  uk: {
    nadpis: "Запис з передачі",
    potvrzeno: "Дякуємо. Запис підтверджено.",
    neplatny: "Це посилання недійсне.",
    zmizel: "Запису з передачі тут уже немає.",
    odesilam: "Надсилаємо…",
    chyba: "Підтвердження не вдалося.",
  },
  'zh-Hant': {
    nadpis: "交接紀錄",
    potvrzeno: "謝謝，紀錄已確認。",
    neplatny: "此連結無效。",
    zmizel: "交接紀錄已不在此處。",
    odesilam: "傳送中…",
    chyba: "確認未成功。",
  },
  sv: {
    nadpis: "Anteckning från överlämningen",
    potvrzeno: "Tack. Anteckningen är bekräftad.",
    neplatny: "Länken är inte giltig.",
    zmizel: "Anteckningen från överlämningen finns inte längre här.",
    odesilam: "Skickar…",
    chyba: "Bekräftelsen gick inte igenom.",
  },
  es: {
    nadpis: "Anotación de la entrega",
    potvrzeno: "Gracias. La anotación está confirmada.",
    neplatny: "Este enlace no es válido.",
    zmizel: "La anotación de la entrega ya no está aquí.",
    odesilam: "Enviando…",
    chyba: "No se pudo confirmar.",
  },
  fr: {
    nadpis: "Note de remise",
    potvrzeno: "Merci. Le relevé est confirmé.",
    neplatny: "Ce lien n’est pas valide.",
    zmizel: "Le relevé de remise n’est plus disponible.",
    odesilam: "Envoi…",
    chyba: "La confirmation n’a pas abouti.",
  },
  it: {
    nadpis: "Nota di consegna",
    potvrzeno: "Grazie. La nota è confermata.",
    neplatny: "Questo link non è valido.",
    zmizel: "La nota di consegna non è più disponibile.",
    odesilam: "Invio…",
    chyba: "La conferma non è riuscita.",
  },
  hu: {
    nadpis: "Átadási feljegyzés",
    potvrzeno: "Köszönjük. A feljegyzés megerősítve.",
    neplatny: "Ez a link nem érvényes.",
    zmizel: "Az átadási feljegyzés már nem érhető el.",
    odesilam: "Küldés…",
    chyba: "A megerősítés nem sikerült.",
  },
};

export function jazykZavad(lang: GuideLang | null | undefined): GuideLang {
  return lang && lang in SKRYTA_ZAVADA ? lang : 'en';
}

/** Prompt 49 · celý e-mail hostovi, který odjel (posílá jen majitel tlačítkem s potvrzením). */
export function textEmailuPoOdjezdu(lang: GuideLang | null | undefined, text: string): string {
  const k = jazykZavad(lang);
  return `${UVOD_PO_ODJEZDU[k]}\n\n${text.trim()}\n\n${PROSBA_PO_ODJEZDU[k]}\n${SKRYTA_PO_ODJEZDU[k]}\n\n${PODPIS_ZAVADY[k]}`;
}

export function predmetEmailuPoOdjezdu(lang: GuideLang | null | undefined): string {
  return PREDMET_PO_ODJEZDU[jazykZavad(lang)];
}
