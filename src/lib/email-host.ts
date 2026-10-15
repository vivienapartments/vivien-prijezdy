import nodemailer from 'nodemailer';
import apartmanyJson from '@/data/apartmany.json';
import { ceskyVokativ, narodnostKod } from './osloveni';
import type { GuideSecrets } from './secrets';
import { GUIDE_LANGS, type AptId, type GuideLang, type LText } from './types';
import type { ChybejiciKrok } from './vstup-pruvodce';
import { odkazSekce, tlacitkoEmailu, vetaEmailu } from './okno-pobytu';
import { textUpominky } from './whatsapp-zprava';

export type GuestEmailInput = {
  lang: GuideLang;
  apt: AptId;
  prijezd: string;
  odjezd: string;
  noci: number | null;
  osob: number | null;
  osloveni: string | null;
  /** Křestní jméno z BH (GUEST_NAME). */
  jmeno?: string | null;
  /** Národnost z BH, třeba CZE nebo SVK. Bez ní se české jméno neskloňuje. */
  narodnost?: string | null;
  guideUrl: string;
  intendedTo: string;
  secrets?: GuideSecrets;
  /** src loga v HTML (cid:… při odeslání, https při náhledu) */
  logoSrc?: string;
  /** src podpisu (vodorovné logo VA / VIVIEN) */
  podpisSrc?: string;
};

/** Veřejné logo na ostrém webu (náhled HTML). */
export const LOGO_PUBLIC_URL = 'https://vivienapartments.cz/images/logo-96.png';
export const LOGO_CID = 'vivien-logo';
/** Podpis: PNG 400 px (2×) s průhledným pozadím, v HTML na 180 px. */
export const PODPIS_CID = 'vivien-podpis';
export const PODPIS_WIDTH = 180;

type AptRow = { id: AptId; nazev: { cs: string; en: string } };

const apartmany = (apartmanyJson as { apartmany: AptRow[] }).apartmany;

function t(map: LText, lang: GuideLang): string {
  return (map[lang] || '').trim() || (map.en || '').trim() || (map.cs || '').trim();
}

function fmtYmd(ymd: string, lang: GuideLang): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  if (lang === 'cs') return `${d}. ${m}. ${y}`;
  if (lang === 'de') return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Pozdrav z křestního jména (GUEST_NAME).
 * OSLOVENI (pane/paní/Herr) nepoužíváme: BH občas splete rod.
 * Čeština: vždy čárka po „Dobrý den“. CZE jen 5. pád ze slovníku, jinak bez jména.
 * SVK: jméno v 1. pádu. Ostatní jazyky beze změny.
 * Bez jména → neutrální „Dobrý den,“ / „Guten Tag,“.
 */
export function greetingLine(
  lang: GuideLang,
  jmeno: string | null | undefined,
  narodnost?: string | null,
): string {
  const generic = t(
    {
      cs: 'Dobrý den,',
      en: 'Hello,',
      de: 'Guten Tag,',
      pl: 'Dzień dobry,',
      uk: 'Добрий день,',
      'zh-Hant': '您好，',
      sv: 'Hej,',
      es: 'Hola,',
      hu: "Jó napot,",
    },
    lang,
  );
  const name = (jmeno || '').trim();
  if (lang === 'cs') {
    if (!name) return 'Dobrý den,';
    const kod = narodnostKod(narodnost);
    if (kod === 'SVK') return `Dobrý den, ${name},`;
    if (kod !== 'CZE') return 'Dobrý den,';
    const vok = ceskyVokativ(name);
    if (!vok) return 'Dobrý den,';
    return `Dobrý den, ${vok},`;
  }
  if (!name) return generic;
  const prefix = generic.replace(/[,，]\s*$/u, '');
  if (lang === 'zh-Hant') return `${prefix}${name}，`;
  return `${prefix} ${name},`;
}

const subjectL: LText = {
  cs: 'DŮLEŽITÉ · Váš průvodce příjezdem, bez něj nezaparkujete ani nevejdete',
  en: "IMPORTANT · Your arrival guide, without it you can't park or get in",
  de: 'WICHTIG · Ihr Anreiseleitfaden, ohne ihn können Sie weder parken noch hinein',
  pl: 'WAŻNE · Wasza instrukcja przyjazdu, bez niej nie zaparkujecie ani nie wejdziecie',
  uk: 'ВАЖЛИВО · Ваш гід приїзду, без нього ви не припаркуєтесь і не зайдете',
  'zh-Hant': '重要 · 您的抵達指南，沒有它無法停車也無法進門',
  sv: 'VIKTIGT · Er ankomstguide, utan den kan ni varken parkera eller komma in',
  es: 'IMPORTANTE · Su guía de llegada, sin ella no pueden aparcar ni entrar',
  hu: "FONTOS · Az érkezési útmutató, enélkül nem tudnak parkolni és bejutni",
};

/** Předměty průvodce ve všech jazycích. Podle nich poznáme odpověď hosta. */
export function predmetyPruvodce(): string[] {
  const out = new Set<string>();
  for (const lang of GUIDE_LANGS) {
    const s = t(subjectL, lang);
    if (s) out.add(s);
  }
  return [...out];
}

/** Co průvodce je (cesta + zásadní info). */
const introBodyL: LText = {
  // CS: po oslovení s čárkou malé písmeno (pravopis dopisu)
  cs: 'připravili jsme pro vás krátkého průvodce příjezdem. Otevřete průvodce a vyplňte, v kolik dorazíte. Pak se vám ukáže cesta k nám, parkování i brána. Vstupní kódy se v něm zobrazí, až vám apartmán osobně předáme. Ať víte, kam jet a co dělat po příjezdu.',
  en: 'We prepared a short arrival guide for you. Open the guide and fill in what time you will arrive. Then you will see the way to us, parking and the gate. The entry codes will appear in it only after we hand the apartment over to you in person. So you know where to go and what to do after arrival.',
  de: 'wir haben für Sie einen kurzen Anreiseleitfaden vorbereitet. Öffnen Sie den Leitfaden und tragen Sie ein, um wie viel Uhr Sie ankommen. Dann sehen Sie den Weg zu uns, das Parken und das Tor. Die Eingangscodes erscheinen darin erst, wenn wir Ihnen das Apartment persönlich übergeben. Damit Sie wissen, wohin Sie fahren und was nach der Ankunft zu tun ist.',
  pl: 'przygotowaliśmy dla Was krótką instrukcję przyjazdu. Otwórzcie przewodnik i wpiszcie, o której dojedziecie. Potem zobaczy się droga do nas, parking i brama. Kody wejścia pojawią się w nim, gdy apartament przekażemy osobiście. Żebyście wiedzieli, dokąd jechać i co robić po przyjeździe.',
  uk: 'ми підготували для вас короткий гід приїзду. Відкрийте гід і вкажіть, о котрій приїдете. Тоді з’явиться шлях до нас, паркування і брама. Вхідні коди з’являться в ньому, коли апартаменти передамо особисто. Щоб ви знали, куди їхати і що робити після прибуття.',
  'zh-Hant': '我們為您準備了一份簡短的抵達指南。請打開指南並填上您幾點到。之後會看到前往我們這裡的路線、停車和大門。進門密碼會在我們當面把公寓交給您之後才顯示。讓您知道怎麼來、抵達後該做什麼。',
  sv: 'vi har förberett en kort ankomstguide. Öppna guiden och fyll i vilken tid ni kommer. Sedan visas vägen till oss, parkeringen och grinden. Ingångskoderna visas där först när vi lämnar över lägenheten personligen. Så att ni vet vart ni ska och vad ni gör efter ankomsten.',
  es: 'les hemos preparado una guía breve de llegada. Abran la guía y pongan a qué hora llegan. Después verán el camino hasta nosotros, el aparcamiento y la barrera. Los códigos de entrada aparecen en ella solo cuando les entregamos el apartamento en persona. Así saben adónde ir y qué hacer al llegar.',
  hu: 'készítettünk egy rövid érkezési útmutatót. Nyissák meg az útmutatót, és írják be, hánykor érkeznek. Utána megjelenik az út hozzánk, a parkolás és a kapu. A belépési kódok akkor jelennek meg benne, amikor az apartmant személyesen átadjuk. Hogy tudják, hova menjenek, és mit csináljanak az érkezés után.',
};

/** Nad tlačítkem. Čas příjezdu, ať host nečeká před domem. */
const casPrijezduL: LText = {
  cs: 'Nejdůležitější je, abyste nám napsali, v kolik dorazíte. Apartmán vám předáme osobně a nebudete na nás čekat. Stačí SMS nebo WhatsApp na +420 604 692 573.',
  en: 'The most important thing is that you write to us with the time you will arrive. We hand the apartment over in person and you will not be waiting for us. An SMS or WhatsApp to +420 604 692 573 is enough.',
  de: 'Das Wichtigste ist, dass Sie uns schreiben, um wie viel Uhr Sie ankommen. Wir übergeben das Apartment persönlich und Sie warten nicht auf uns. Eine SMS oder WhatsApp an +420 604 692 573 genügt.',
  pl: 'Najważniejsze jest, żebyście napisali, o której dojedziecie. Apartament przekażemy osobiście i nie będziecie na nas czekać. Wystarczy SMS albo WhatsApp na +420 604 692 573.',
  uk: 'Найважливіше, щоб ви написали, о котрій приїдете. Апартаменти передамо особисто, і вам не доведеться на нас чекати. Досить SMS або WhatsApp на +420 604 692 573.',
  'zh-Hant': '最重要的是請告訴我們您幾點到。公寓由我們當面交接，您不必等我們。傳簡訊或 WhatsApp 到 +420 604 692 573 即可。',
  sv: 'Det viktigaste är att ni skriver till oss vilken tid ni kommer. Lägenheten lämnar vi över personligen och ni behöver inte vänta på oss. Det räcker med sms eller WhatsApp till +420 604 692 573.',
  es: 'Lo más importante es que nos escriban a qué hora llegan. El apartamento se lo entregamos en persona y no tendrán que esperarnos. Basta un SMS o un WhatsApp al +420 604 692 573.',
  hu: "A legfontosabb, hogy írják meg, hánykor érkeznek. Az apartmant személyesen adjuk át, és nem kell ránk várniuk. Elég egy SMS vagy WhatsApp a +420 604 692 573 számra.",
};

const casSmsL: LText = {
  cs: 'Napsat SMS',
  en: 'Send an SMS',
  de: 'SMS schreiben',
  pl: 'Napisz SMS',
  uk: 'Написати SMS',
  'zh-Hant': '傳送簡訊',
  sv: 'Skicka sms',
  es: 'Escribir un SMS',
  hu: "SMS küldése",
};

const casWhatsappL: LText = {
  cs: 'Napsat na WhatsApp',
  en: 'Message on WhatsApp',
  de: 'Auf WhatsApp schreiben',
  pl: 'Napisz na WhatsApp',
  uk: 'Написати у WhatsApp',
  'zh-Hant': '用 WhatsApp 傳訊',
  sv: 'Skriv på WhatsApp',
  es: 'Escribir por WhatsApp',
  hu: "Írás WhatsAppon",
};

/**
 * Kterou skladbu mail posílá. 'nova' je návrh z 14. 10. 2026.
 * 'stara' je věta, která hostům chodí dnes. Texty staré verze zůstávají níž.
 */
export function skladbaEmailu(): 'nova' | 'stara' {
  return 'nova';
}

/** Hned po oslovení. Nová verze. */
const uvodNovaL: LText = {
  cs: 'posíláme vám průvodce příjezdem. Je jen pro váš apartmán a najdete v něm cestu k nám, parkování i bránu.',
  en: 'we are sending you the arrival guide. It is only for your apartment, and in it you will find the way to us, parking and the gate.',
  de: 'wir schicken Ihnen den Anreiseleitfaden. Er gilt nur für Ihr Apartment, und darin finden Sie den Weg zu uns, das Parken und das Tor.',
  pl: 'wysyłamy Wam instrukcję przyjazdu. Jest tylko dla Waszego apartamentu i znajdziecie w niej drogę do nas, parking i bramę.',
  uk: 'надсилаємо вам гід приїзду. Він лише для ваших апартаментів, і в ньому знайдете шлях до нас, паркування і браму.',
  'zh-Hant': '我們寄上抵達指南。這份指南只給您的公寓，裡面有來我們這裡的路、停車和大門。',
  sv: 'vi skickar er ankomstguiden. Den gäller bara er lägenhet, och där finns vägen till oss, parkeringen och grinden.',
  es: 'les enviamos la guía de llegada. Es solo para su apartamento, y en ella está el camino hasta nosotros, el aparcamiento y la barrera.',
  hu: 'elküldjük az érkezési útmutatót. Csak az önök apartmanjához szól, és benne megtalálják az utat hozzánk, a parkolást és a kaput.',
};

/** Výrazný tučný box. Tlačítka SMS a WhatsApp v něm nejsou. */
const duleziteNovaL: LText = {
  cs: 'Nejdůležitější: ve vašem průvodci čekají vstupní PINy do domu a apartmánu. Abyste se k nim dostali, otevřete průvodce, vyberte čas a způsob příjezdu a potvrďte pravidla. Zabere to minutu.',
  en: 'The most important thing: your entry PIN codes for the house and the apartment are waiting in your guide. To reach them, open the guide, choose the time and how you arrive, and confirm the rules. It takes a minute.',
  de: 'Das Wichtigste: In Ihrem Leitfaden warten die Eingangs-PIN-Codes für das Haus und das Apartment. Um zu ihnen zu kommen, öffnen Sie den Leitfaden, wählen Sie die Zeit und die Art der Anreise und bestätigen Sie die Regeln. Das dauert eine Minute.',
  pl: 'Najważniejsze: w Waszej instrukcji czekają kody PIN do domu i apartamentu. Żeby do nich dojść, otwórzcie instrukcję, wybierzcie godzinę i sposób przyjazdu i potwierdźcie zasady. Zajmie to minutę.',
  uk: 'Найважливіше: у вашому гіді чекають вхідні PIN-коди до будинку й апартаментів. Щоб дістатися до них, відкрийте гід, виберіть час і спосіб приїзду та підтвердьте правила. Це займе хвилину.',
  'zh-Hant': '最重要的是：您的指南裡有房屋和公寓的入口 PIN 碼。要看到它們，請打開指南，選擇抵達時間和方式，並確認規則。大約一分鐘。',
  sv: 'Det viktigaste: i er guide väntar PIN-koderna till huset och lägenheten. För att komma till dem, öppna guiden, välj tid och sätt att komma, och bekräfta reglerna. Det tar en minut.',
  es: 'Lo más importante es que en su guía esperan los códigos PIN de la casa y del apartamento. Para llegar a ellos, abran la guía, elijan la hora y cómo llegan, y confirmen las reglas. Lleva un minuto.',
  hu: 'A legfontosabb: az útmutatóban ott várnak a ház és az apartman belépő PIN-kódjai. Hogy elérjék őket, nyissák meg az útmutatót, válasszák ki az időt és az érkezés módját, és erősítsék meg a szabályokat. Egy perc.',
};

const dumNovaL: LText = {
  cs: 'VIVIEN je malý rodinný dům a o hosty se staráme sami, bez recepce a cizích lidí. Apartmán vám předáme osobně, všechno ukážeme a pak dostanete PINy. Když víme, kdy přijedete, čekáme my na vás.',
  en: 'VIVIEN is a small family house and we look after the guests ourselves, with no reception and no outside staff. We hand the apartment over in person, show you everything, and then you get the PIN codes. When we know when you are arriving, we are the ones waiting for you.',
  de: 'VIVIEN ist ein kleines Familienhaus, und wir kümmern uns selbst um die Gäste, ohne Rezeption und ohne fremde Leute. Das Apartment übergeben wir persönlich, zeigen Ihnen alles, und dann bekommen Sie die PIN-Codes. Wenn wir wissen, wann Sie ankommen, warten wir auf Sie.',
  pl: 'VIVIEN to mały rodzinny dom i o gości dbamy sami, bez recepcji i obcych ludzi. Apartament przekażemy osobiście, wszystko pokażemy, a potem dostaniecie kody PIN. Kiedy wiemy, o której przyjedziecie, czekamy my na Was.',
  uk: 'VIVIEN є маленьким сімейним будинком, і про гостей дбаємо самі, без рецепції і без чужих людей. Апартаменти передамо особисто, все покажемо, і тоді ви отримаєте PIN-коди. Коли знаємо, о котрій приїдете, чекаємо ми на вас.',
  'zh-Hant': 'VIVIEN 是一棟小型家族住宅，客人由我們自己照顧，沒有櫃檯，也沒有外人。公寓由我們當面交接，帶您看過一切，然後您會拿到 PIN 碼。我們知道您幾點到，就由我們等候。',
  sv: 'VIVIEN är ett litet familjehus och vi tar hand om gästerna själva, utan reception och utan utomstående. Lägenheten lämnar vi över personligen, visar er allt, och sedan får ni PIN-koderna. När vi vet när ni kommer är det vi som väntar på er.',
  es: 'VIVIEN es una casa familiar pequeña y de los huéspedes nos ocupamos nosotros, sin recepción y sin personal de fuera. El apartamento se lo entregamos en persona, se lo enseñamos todo y después reciben los códigos PIN. Cuando sabemos a qué hora llegan, esperamos nosotros.',
  hu: 'A VIVIEN egy kis családi ház, a vendégekről mi magunk gondoskodunk, recepció és idegenek nélkül. Az apartmant személyesen adjuk át, mindent megmutatunk, és utána megkapják a PIN-kódokat. Ha tudjuk, mikor érkeznek, mi várunk önökre.',
};

const checkinNovaL: LText = {
  cs: 'Check-in je od 14:00 do 20:00. Pozdější příjezd je za příplatek.',
  en: 'Check-in is from 14:00 to 20:00. A later arrival has a surcharge.',
  de: 'Check-in ist von 14:00 bis 20:00. Eine spätere Ankunft kostet einen Zuschlag.',
  pl: 'Check-in jest od 14:00 do 20:00. Późniejszy przyjazd jest za dopłatą.',
  uk: 'Заселення є з 14:00 до 20:00. Пізніший приїзд є за доплату.',
  'zh-Hant': '入住時間是 14:00 到 20:00。較晚抵達需加付費用。',
  sv: 'Incheckning är från 14:00 till 20:00. En senare ankomst har ett tillägg.',
  es: 'El check-in es de 14:00 a 20:00. Una llegada más tarde lleva suplemento.',
  hu: 'A bejelentkezés 14:00-tól 20:00-ig tart. A későbbi érkezés felár ellenében lehetséges.',
};

/** CTA nápověda (v HTML tučně). Jen stará verze mailu. */
const introOpenL: LText = {
  cs: 'Otevřete ho tlačítkem níže.',
  en: 'Open it with the button below.',
  de: 'Öffnen Sie ihn über die Schaltfläche unten.',
  pl: 'Otwórzcie ją przyciskiem poniżej.',
  uk: 'Відкрийте його кнопкою нижче.',
  'zh-Hant': '請用下方按鈕開啟。',
  sv: 'Öppna den med knappen nedan.',
  es: 'Ábranla con el botón de abajo.',
  hu: "Nyissák meg az alábbi gombbal.",
};

/** Staré české věty. Ať jdou vrátit, i když se skládá nová verze. */
export const EMAIL_STARA_CS = {
  uvod: introBodyL.cs,
  box: casPrijezduL.cs,
  podTlacitkem: introOpenL.cs,
};

const stayL: LText = {
  cs: 'Váš pobyt',
  en: 'Your stay',
  de: 'Ihr Aufenthalt',
  pl: 'Wasz pobyt',
  uk: 'Ваше перебування',
  'zh-Hant': '您的住宿',
  sv: 'Er vistelse',
  es: 'Su estancia',
  hu: "A tartózkodásuk",
};

const datesL: LText = {
  cs: 'Termín',
  en: 'Dates',
  de: 'Zeitraum',
  pl: 'Termin',
  uk: 'Термін',
  'zh-Hant': '日期',
  sv: 'Datum',
  es: 'Fechas',
  hu: "Dátumok",
};

const nightsL: LText = {
  cs: 'Počet nocí',
  en: 'Nights',
  de: 'Nächte',
  pl: 'Liczba nocy',
  uk: 'Кількість ночей',
  'zh-Hant': '晚數',
  sv: 'Nätter',
  es: 'Noches',
  hu: "Éjszakák",
};

const guestsL: LText = {
  cs: 'Počet osob',
  en: 'Guests',
  de: 'Personen',
  pl: 'Liczba osób',
  uk: 'Кількість осіб',
  'zh-Hant': '人數',
  sv: 'Personer',
  es: 'Huéspedes',
  hu: "Vendégek",
};

const openGuideL: LText = {
  cs: 'Otevřít průvodce',
  en: 'Open the guide',
  de: 'Leitfaden öffnen',
  pl: 'Otwórz instrukcję',
  uk: 'Відкрити гід',
  'zh-Hant': '開啟指南',
  sv: 'Öppna guiden',
  es: 'Abrir la guía',
  hu: "Útmutató megnyitása",
};

/** Problém: nejdřív majitel, pak Nikol (číslo v podpisu). */
const helpL: LText = {
  cs: 'Kdyby cokoli nefungovalo, volejte na +420 604 692 573. V případě, že se nedovoláte, zavolejte Nikol.',
  en: 'If anything does not work, call +420 604 692 573. If you cannot get through, call Nikol.',
  de: 'Wenn etwas nicht funktioniert, rufen Sie +420 604 692 573 an. Wenn Sie uns nicht erreichen, rufen Sie Nikol an.',
  pl: 'Gdyby cokolwiek nie działało, zadzwońcie na +420 604 692 573. Jeśli się nie dodzwonicie, zadzwońcie do Nikol.',
  uk: 'Якщо щось не працює, телефонуйте на +420 604 692 573. Якщо не додзвонитеся, зателефонуйте Nikol.',
  'zh-Hant': '如果有任何問題，請撥 +420 604 692 573。若打不通，請打給 Nikol。',
  sv: 'Om något inte fungerar, ring +420 604 692 573. Om ni inte kommer fram, ring Nikol.',
  es: 'Si algo no funciona, llamen al +420 604 692 573. Si no contestamos, llamen a Nikol.',
  hu: "Ha valami nem működik, hívják a +420 604 692 573 számot. Ha nem érik el, hívják Nikolt.",
};

const familyL: LText = {
  cs: 'Nikol a rodina VIVIEN',
  en: 'Nikol & the VIVIEN family',
  de: 'Nikol und Familie VIVIEN',
  pl: 'Nikol i rodzina VIVIEN',
  uk: 'Nikol і родина VIVIEN',
  'zh-Hant': 'Nikol 與 VIVIEN 全家',
  sv: 'Nikol och familjen VIVIEN',
  es: 'Nikol y la familia VIVIEN',
  hu: "Nikol és a VIVIEN család",
};

const closingL: LText = {
  cs: 'S pozdravem',
  en: 'Kind regards',
  de: 'Mit freundlichen Grüßen',
  pl: 'Z pozdrowieniami',
  uk: 'З повагою',
  'zh-Hant': '此致',
  sv: 'Med vänlig hälsning',
  es: 'Un saludo',
  hu: "Üdvözlettel",
};

/** Úplně na konci mailu: odkaz na veřejný web ({{WEB}} = URL podle jazyka). */
const webTipL: LText = {
  cs: 'Další tipy na pobyt najdete na {{WEB}}. Kam na jídlo, kam na výlet, co se děje ve městě a poznávací hra po Budějovicích.',
  en: 'More tips for your stay are on {{WEB}}. Where to eat, where to go for a day out, what is on in town, and the Budweis discovery game.',
  de: 'Weitere Tipps für Ihren Aufenthalt finden Sie auf {{WEB}}. Wohin zum Essen, wohin auf einen Ausflug, was in der Stadt läuft, und das Budweiser Entdeckungsspiel.',
  pl: 'Kolejne wskazówki na pobyt znajdziecie na {{WEB}}. Gdzie zjeść, gdzie na wycieczkę, co się dzieje w mieście i gra odkrywcza po Budziejowicach.',
  uk: 'Інші поради на перебування знайдете на {{WEB}}. Куди на їжу, куди на виїзд, що відбувається в місті та пізнавальна гра Будейовицями.',
  'zh-Hant': '更多住宿提示請見 {{WEB}}。去哪吃飯、去哪一日遊、城裡近期活動，以及布杰約維采探索遊戲。',
  sv: 'Fler tips för vistelsen finns på {{WEB}}. Vart ni kan äta, vart ni kan åka på utflykt, vad som händer i staden och upptäcktsspelet i Budějovice.',
  es: 'Más ideas para la estancia están en {{WEB}}. Dónde comer, adónde ir de excursión, qué hay en la ciudad y el juego para conocer Budějovice.',
  hu: "További tippek a tartózkodáshoz a {{WEB}} oldalon vannak. Hol egyenek, hova menjenek kirándulni, mi történik a városban, és a felfedező játék Budějovicében.",
};

const psApartmanyL: LText = {
  cs: 'P.S. Máme pět apartmánů, každý s jinou atmosférou. Spousta hostů o tom neví. Až budete plánovat další pobyt, můžete si vybrat podle nálady. {{QUIZ}}',
  en: 'P.S. We have five apartments, each with a different atmosphere. Many guests do not know that. When you plan another stay, you can choose by mood. {{QUIZ}}',
  de: 'P.S. Wir haben fünf Apartments, jedes mit einer anderen Atmosphäre. Viele Gäste wissen das nicht. Wenn Sie den nächsten Aufenthalt planen, können Sie nach Stimmung wählen. {{QUIZ}}',
  pl: 'P.S. Mamy pięć apartamentów, każdy z inną atmosferą. Wielu gości o tym nie wie. Gdy będziecie planować kolejny pobyt, możecie wybrać według nastroju. {{QUIZ}}',
  uk: 'P.S. У нас пʼять апартаментів, кожен зі своєю атмосферою. Багато гостей про це не знають. Коли плануватимете наступне перебування, можете обрати за настроєм. {{QUIZ}}',
  'zh-Hant': 'P.S. 我們有五間公寓，各有不同氛圍。很多客人不知道這件事。下次規劃住宿時，可以依心情挑選。{{QUIZ}}',
  sv: 'P.S. Vi har fem lägenheter, var och en med sin egen stämning. Många gäster vet inte det. När ni planerar nästa vistelse kan ni välja efter humör. {{QUIZ}}',
  es: 'P.D. Tenemos cinco apartamentos, cada uno con un ambiente distinto. Muchos huéspedes no lo saben. Cuando planeen otra estancia, pueden elegir según el ánimo. {{QUIZ}}',
  hu: "U.i. Öt apartmanunk van, mindegyik más hangulatú. Sok vendég nem tudja ezt. Amikor a következő tartózkodást tervezik, hangulat szerint választhatnak. {{QUIZ}}",
};

const psCtaL: LText = {
  cs: 'Který apartmán by vám seděl?',
  en: 'Which apartment would suit you?',
  de: 'Welches Apartment würde zu Ihnen passen?',
  pl: 'Który apartament by Wam pasował?',
  uk: 'Які апартаменти вам підійдуть?',
  'zh-Hant': '哪間公寓適合您？',
  sv: 'Vilken lägenhet skulle passa er?',
  es: '¿Qué apartamento les vendría bien?',
  hu: "Melyik apartman illene önökhöz?",
};

function publicSiteUrl(lang: GuideLang): string {
  const base = 'https://vivienapartments.cz';
  if (lang === 'cs') return `${base}/`;
  if (lang === 'zh-Hant') return `${base}/zh/`;
  if (lang === 'sv' || lang === 'hu') return `${base}/en/`;
  if (lang === 'en' || lang === 'de' || lang === 'pl' || lang === 'uk' || lang === 'es' || lang === 'fr' || lang === 'it') {
    return `${base}/${lang}/`;
  }
  return `${base}/`;
}

function quizUrl(lang: GuideLang): string {
  const base = publicSiteUrl(lang).replace(/\/$/, '');
  return `${base}/discover-your-atmosphere`;
}

function webTipPlain(lang: GuideLang): string {
  return t(webTipL, lang).replace(/\{\{WEB\}\}/g, publicSiteUrl(lang).replace(/\/$/, ''));
}

function webTipHtml(lang: GuideLang): string {
  const url = publicSiteUrl(lang);
  const label = url.replace(/^https:\/\//, '').replace(/\/$/, '');
  const [before = '', after = ''] = t(webTipL, lang).split('{{WEB}}');
  return `${escapeHtml(before)}<a href="${escapeAttr(url)}" style="color:#e8d5a3;text-decoration:underline;font-weight:700;">${escapeHtml(label)}</a>${escapeHtml(after)}`;
}

function psApartmanyPlain(lang: GuideLang): string {
  return t(psApartmanyL, lang).replace(/\{\{QUIZ\}\}/g, `${t(psCtaL, lang)} (${quizUrl(lang)})`);
}

function psApartmanyHtml(lang: GuideLang): string {
  const href = quizUrl(lang);
  const cta = t(psCtaL, lang);
  const [before = '', after = ''] = t(psApartmanyL, lang).split('{{QUIZ}}');
  return `${escapeHtml(before)}<a href="${escapeAttr(href)}" style="color:#e8d5a3;text-decoration:underline;font-weight:700;">${escapeHtml(cta)}</a>${escapeHtml(after)}`;
}

function aptRow(id: AptId): AptRow {
  return apartmany.find((a) => a.id === id) ?? apartmany[0];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

/**
 * Číslo na vlastním řádku. Mezery jsou &nbsp; a řádek se neláme.
 * Vlastní řádek je poslední řádek kusu textu nad ním, takže se mezery neroztáhnou.
 */
function telAnchor(display: string, bold: boolean): string {
  const digits = display.replace(/\D/g, '');
  const shown = display.trim().replace(/ /g, '&nbsp;');
  const weight = bold ? 'font-weight:700;' : '';
  return `<a href="tel:+${digits}" style="display:block;color:#e8d5a3;text-decoration:underline;text-underline-offset:0.12em;${weight}white-space:nowrap;">${shown}</a>`;
}

function withPhones(text: string): string {
  return escapeHtml(text).replace(/\+420 \d{3} \d{3} \d{3}(\.)?/g, (_m, dot: string | undefined) => {
    const number = _m.replace(/\.$/, '');
    const anchor = telAnchor(number, true);
    return dot ? anchor.replace('</a>', '.</a>') : anchor;
  });
}

function withTimes(escaped: string): string {
  return escaped.replace(/\d{1,2}:\d{2}/g, (m) => `<span style="white-space:nowrap;">${m}</span>`);
}

function msgButton(href: string, label: string, serif: string): string {
  return `<a href="${escapeAttr(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:8px 14px;border:1px solid #c9a84c;border-radius:999px;color:#f5efe3;font-family:${serif};font-size:14px;line-height:1.2;text-decoration:none;white-space:nowrap;">${escapeHtml(label)}</a>`;
}

/** Zlaté kulaté tlačítko. Jediný schválený vzhled. */
function ctaHtml(opts: { href: string; label: string; serif: string }): string {
  const href = escapeAttr(opts.href);
  const label = escapeHtml(opts.label);
  const f = opts.serif;

  return `<table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;"><tr>
    <td align="center" style="background:#c9a84c;border-radius:28px;text-align:center;">
      <a href="${href}" style="display:inline-block;padding:12px 22px;font-family:${f};font-size:15px;line-height:1.25;color:#1c1712;text-decoration:none;font-weight:400;border-radius:28px;text-align:center;white-space:nowrap;">${label}</a>
    </td>
  </tr></table>`;
}

export function buildGuestEmail(input: GuestEmailInput): { subject: string; html: string; text: string } {
  const lang = input.lang;
  const apt = aptRow(input.apt);
  const greeting = greetingLine(lang, input.jmeno, input.narodnost);
  const nociLabel = input.noci == null ? 'XXX' : String(input.noci);
  const osobLabel = input.osob == null ? 'XXX' : String(input.osob);
  const term = `${fmtYmd(input.prijezd, lang)} – ${fmtYmd(input.odjezd, lang)}`.replace('–', '-');

  const testMode = (process.env.TEST_REZIM ?? '1') !== '0';
  const subjectBase = t(subjectL, lang);
  const subject = testMode ? `[TEST] ${subjectBase}` : subjectBase;
  const logoSrc = input.logoSrc || LOGO_PUBLIC_URL;
  const podpisSrc = input.podpisSrc || '';
  const serif = "Georgia,'Times New Roman',serif";
  const sazba =
    'text-align:justify;text-justify:inter-word;hyphens:auto;-webkit-hyphens:auto;-ms-hyphens:auto;';

  const nameCs = apt.nazev.cs;
  const nameEn = apt.nazev.en;
  const nameHtml =
    lang === 'cs'
      ? `<div style="font-family:${serif};font-size:22px;line-height:1.35;color:#f5efe3;">${escapeHtml(nameCs)}</div>
         <div style="font-family:${serif};font-size:18px;line-height:1.35;color:#c9a84c;margin-top:4px;">${escapeHtml(nameEn)}</div>`
      : `<div style="font-family:${serif};font-size:22px;line-height:1.35;color:#f5efe3;">${escapeHtml(nameEn)}</div>`;

  const nameText = lang === 'cs' ? `${nameCs}\n${nameEn}` : nameEn;
  const cta = ctaHtml({
    href: input.guideUrl,
    label: t(openGuideL, lang),
    serif,
  });
  const oknoOdkaz = odkazSekce(input.guideUrl);
  const oknoRadek = `<tr><td lang="${escapeAttr(lang)}" style="padding:0 0 22px;font-family:${serif};font-size:16px;line-height:1.55;color:#e8dfc8;${sazba}">${escapeHtml(vetaEmailu(lang))}<div style="padding-top:14px;text-align:center;">${ctaHtml({ href: oknoOdkaz, label: tlacitkoEmailu(lang), serif })}</div></td></tr>`;

  const pobyt = `<tr>
                  <td style="padding:0 0 22px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#2a221c;border-radius:8px;">
                      <tr>
                        <td style="padding:16px 16px 14px;font-family:${serif};font-size:16px;line-height:1.5;color:#e8dfc8;">
                          <div style="margin:0 0 10px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#c9a84c;font-weight:700;">
                            ${escapeHtml(t(stayL, lang))}
                          </div>
                          <div style="margin:0 0 14px;">${nameHtml}</div>
                          <div style="margin:0 0 8px;"><span style="color:#c9a84c;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(t(datesL, lang))}</span><br/><strong style="color:#f5efe3;">${escapeHtml(term)}</strong></div>
                          <div style="margin:0 0 8px;"><span style="color:#c9a84c;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(t(nightsL, lang))}</span><br/><strong style="color:#f5efe3;">${escapeHtml(nociLabel)}</strong></div>
                          <div style="margin:0;"><span style="color:#c9a84c;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(t(guestsL, lang))}</span><br/><strong style="color:#f5efe3;">${escapeHtml(osobLabel)}</strong></div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`;

  const telo =
    skladbaEmailu() === 'stara'
      ? `<tr><td style="padding:0 0 22px;font-family:${serif};font-size:17px;line-height:1.55;color:#e8dfc8;">
                  <div lang="${escapeAttr(lang)}" style="${sazba}">${escapeHtml(t(introBodyL, lang))}</div>
                  <div style="padding-top:26px;"><strong style="color:#f5efe3;font-weight:700;">${escapeHtml(t(introOpenL, lang))}</strong></div>
                </td></tr>
                ${pobyt}
                <tr>
                  <td style="padding:0 0 18px;">
                    <div lang="${escapeAttr(lang)}" style="padding:12px 14px;background:#2a221c;border:1px solid #c9a84c;border-radius:8px;font-family:${serif};font-size:16px;line-height:1.5;color:#f5efe3;${sazba}">
                      ${withPhones(t(casPrijezduL, lang))}
                      <div style="padding-top:12px;text-align:left;">
                        ${msgButton('sms:+420604692573', t(casSmsL, lang), serif)}
                        ${msgButton('https://wa.me/420604692573', t(casWhatsappL, lang), serif)}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:8px 0 22px;">
                    ${cta}
                  </td>
                </tr>
                ${oknoRadek}`
      : `<tr><td style="padding:0 0 18px;font-family:${serif};font-size:17px;line-height:1.55;color:#e8dfc8;">
                  <div lang="${escapeAttr(lang)}" style="${sazba}">${escapeHtml(t(uvodNovaL, lang))}</div>
                </td></tr>
                <tr>
                  <td style="padding:0 0 18px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-radius:14px;overflow:hidden;">
                      <tr>
                        <td lang="${escapeAttr(lang)}" bgcolor="#f6cfc6" style="background-color:#f6cfc6;background-image:none;border:2px solid #c4554c;border-radius:14px;padding:14px 16px;font-family:${serif};font-size:17px;line-height:1.45;color:#1c1210;font-weight:700;text-align:left;color-scheme:light;">
                          <span style="color:#1c1210;">${escapeHtml(t(duleziteNovaL, lang))}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:4px 0 22px;">
                    ${cta}
                  </td>
                </tr>
                ${oknoRadek}
                <tr><td lang="${escapeAttr(lang)}" style="padding:0 0 16px;font-family:${serif};font-size:17px;line-height:1.55;color:#e8dfc8;${sazba}">${escapeHtml(t(dumNovaL, lang))}</td></tr>
                <tr><td lang="${escapeAttr(lang)}" style="padding:0 0 22px;font-family:${serif};font-size:17px;line-height:1.55;color:#e8dfc8;${sazba}">${withTimes(escapeHtml(t(checkinNovaL, lang)))}</td></tr>
                ${pobyt}`;

  const html = `<!DOCTYPE html>
<html lang="${escapeAttr(lang)}" style="background:#1c1712;">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${escapeHtml(subjectBase)}</title>
  <style>
    td[bgcolor="#f6cfc6"] {
      background-color: #f6cfc6 !important;
      background-image: none !important;
      color: #1c1210 !important;
    }
    td[bgcolor="#f6cfc6"] span {
      color: #1c1210 !important;
      background: none !important;
    }
    @media (prefers-color-scheme: dark) {
      td[bgcolor="#f6cfc6"] {
        background-color: #f6cfc6 !important;
        background-image: none !important;
        color: #1c1210 !important;
      }
      td[bgcolor="#f6cfc6"] span {
        color: #1c1210 !important;
        background: none !important;
      }
    }
    [data-ogsc] td[bgcolor="#f6cfc6"], [data-ogsc] td[bgcolor="#f6cfc6"] span {
      color: #1c1210 !important;
    }
    [data-ogsb] td[bgcolor="#f6cfc6"] {
      background-color: #f6cfc6 !important;
      background-image: none !important;
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#1c1712;color:#e8dfc8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#1c1712;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#241e18;border:1px solid #3d342a;border-radius:10px;">
          <tr>
            <td style="padding:28px 28px 8px;font-family:${serif};font-size:17px;line-height:1.55;color:#e8dfc8;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding:0 0 22px;">
                    <img src="${escapeAttr(logoSrc)}" width="96" height="96" alt="VIVIEN Apartments" style="display:block;width:96px;height:auto;border:0;" />
                  </td>
                </tr>
                <tr><td style="padding:0 0 16px;font-family:${serif};font-size:20px;line-height:1.4;color:#f5efe3;">${escapeHtml(greeting)}</td></tr>
                ${telo}
                <tr>
                  <td lang="${escapeAttr(lang)}" style="padding:18px 0 0;border-top:1px solid #3d342a;font-family:${serif};font-size:15px;line-height:1.55;color:#cbbba8;${sazba}">
                    ${withPhones(t(helpL, lang))}
                  </td>
                </tr>
                <tr>
                  <td style="padding:22px 0 0;font-family:${serif};font-size:15px;line-height:1.55;color:#cbbba8;">
                    <div style="margin:0 0 4px;">${escapeHtml(t(closingL, lang))}</div>
                    <div style="margin:0 0 2px;font-size:17px;color:#f5efe3;"><strong>${escapeHtml(t(familyL, lang))}</strong></div>
                    <div style="margin:0 0 14px;">${telAnchor('+420 702 153 573', false)}</div>
                    ${
                      podpisSrc
                        ? `<img src="${escapeAttr(podpisSrc)}" width="${PODPIS_WIDTH}" alt="VIVIEN Apartments" style="display:block;width:${PODPIS_WIDTH}px;max-width:100%;height:auto;border:0;" />`
                        : ''
                    }
                  </td>
                </tr>
                <tr>
                  <td lang="${escapeAttr(lang)}" style="padding:22px 0 0;border-top:1px solid #3d342a;font-family:${serif};font-size:14px;line-height:1.55;color:#cbbba8;${sazba}">
                    ${webTipHtml(lang)}
                  </td>
                </tr>
                <tr>
                  <td lang="${escapeAttr(lang)}" style="padding:16px 0 0;font-family:${serif};font-size:14px;line-height:1.55;color:#cbbba8;${sazba}">
                    ${psApartmanyHtml(lang)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="height:24px;line-height:24px;font-size:0;background:#241e18;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text =
    skladbaEmailu() === 'stara'
      ? [
          greeting,
          '',
          t(introBodyL, lang),
          t(introOpenL, lang),
          '',
          t(stayL, lang),
          nameText,
          '',
          `${t(datesL, lang)}: ${term}`,
          `${t(nightsL, lang)}: ${nociLabel}`,
          `${t(guestsL, lang)}: ${osobLabel}`,
          '',
          t(casPrijezduL, lang),
          '',
          `${t(openGuideL, lang)}: ${input.guideUrl}`,
          '',
          vetaEmailu(lang),
          `${tlacitkoEmailu(lang)}: ${odkazSekce(input.guideUrl)}`,
          '',
          t(helpL, lang),
          '',
          t(closingL, lang),
          t(familyL, lang),
          '+420 702 153 573',
          '',
          webTipPlain(lang),
          '',
          psApartmanyPlain(lang),
        ].join('\n')
      : [
          greeting,
          '',
          t(uvodNovaL, lang),
          '',
          t(duleziteNovaL, lang),
          '',
          `${t(openGuideL, lang)}: ${input.guideUrl}`,
          '',
          vetaEmailu(lang),
          `${tlacitkoEmailu(lang)}: ${odkazSekce(input.guideUrl)}`,
          '',
          t(dumNovaL, lang),
          '',
          t(checkinNovaL, lang),
          '',
          t(stayL, lang),
          nameText,
          '',
          `${t(datesL, lang)}: ${term}`,
          `${t(nightsL, lang)}: ${nociLabel}`,
          `${t(guestsL, lang)}: ${osobLabel}`,
          '',
          t(helpL, lang),
          '',
          t(closingL, lang),
          t(familyL, lang),
          '+420 702 153 573',
          '',
          webTipPlain(lang),
          '',
          psApartmanyPlain(lang),
        ].join('\n');

  return { subject, html, text };
}

export async function sendGuestEmail(opts: {
  input: GuestEmailInput;
  toOverride?: string;
}): Promise<{ to: string; messageId?: string }> {
  const path = await import('path');
  const testMode = (process.env.TEST_REZIM ?? '1') !== '0';
  const majitel = process.env.MAJITEL_EMAIL?.trim();
  if (!majitel) throw new Error('MAJITEL_EMAIL chybí');

  const intended = opts.input.intendedTo;
  const to = testMode || opts.toOverride ? majitel : intended;
  const built = buildGuestEmail({
    ...opts.input,
    logoSrc: `cid:${LOGO_CID}`,
    podpisSrc: `cid:${PODPIS_CID}`,
  });

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_HESLO?.trim();
  if (!user || !pass || pass.startsWith('SEM_NAPIS')) {
    throw new Error('SMTP_USER / SMTP_HESLO nejsou vyplněné');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.seznam.cz',
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  const fs = await import('fs');
  const logoPath = path.join(process.cwd(), 'assets', 'email', 'logo.png');
  const podpisPath = path.join(process.cwd(), 'assets', 'email', 'logo-podpis.png');
  if (!fs.existsSync(logoPath) || !fs.existsSync(podpisPath)) {
    throw new Error(
      `Chybí e-mailové logo v serverless balíčku (${logoPath} / ${podpisPath})`,
    );
  }

  const info = await transporter.sendMail({
    from: `VIVIEN Apartments <${user}>`,
    to,
    bcc: testMode ? undefined : majitel,
    subject: built.subject,
    text: built.text,
    html: built.html,
    attachments: [
      {
        filename: 'logo.png',
        content: fs.readFileSync(logoPath),
        cid: LOGO_CID,
        contentDisposition: 'inline',
      },
      {
        filename: 'logo-podpis.png',
        content: fs.readFileSync(podpisPath),
        cid: PODPIS_CID,
        contentDisposition: 'inline',
      },
    ],
  });

  return { to, messageId: info.messageId };
}

const upominkaPredmetL: LText = {
  cs: 'Vaše vstupní PINy na vás čekají',
  en: 'Your entry PIN codes are waiting for you',
  de: 'Ihre Eingangs-PIN-Codes warten auf Sie',
  pl: 'Wasze kody PIN do wejścia na was czekają',
  uk: 'Ваші вхідні PIN-коди на вас чекають',
  'zh-Hant': '您的入口 PIN 碼在等您',
  sv: 'Era PIN-koder för entrén väntar på er',
  es: 'Sus códigos PIN de entrada les esperan',
  hu: 'A belépő PIN-kódjaik várják önöket',
};

/** Upomínka den předem. Sama se neposílá, dokud na to není samostatný běh. */
export function buildUpominkaEmail(input: {
  lang: GuideLang;
  jmeno: string | null;
  guideUrl: string;
  chybi: ChybejiciKrok[];
}): { subject: string; text: string; html: string } {
  const testMode = (process.env.TEST_REZIM ?? '1') !== '0';
  const predmet = t(upominkaPredmetL, input.lang);
  const subject = testMode ? `[TEST] ${predmet}` : predmet;
  const uvod = greetingLine(input.lang, input.jmeno, null);
  const telo = textUpominky(input.lang, input.chybi);
  const podpis = t(familyL, input.lang);
  const oknoOdkaz = odkazSekce(input.guideUrl);
  const text = `${uvod}\n\n${telo}\n\n${vetaEmailu(input.lang)}\n${tlacitkoEmailu(input.lang)}: ${oknoOdkaz}\n\n${input.guideUrl}\n\n${podpis}`;
  const html = `<div style="font-family:Georgia,'Times New Roman',serif;color:#1c1210;line-height:1.45;">
<p>${escapeHtml(uvod)}</p>
<p style="background:#f6cfc6;border:2px solid #c4554c;border-radius:14px;padding:14px 16px;font-weight:700;">${escapeHtml(telo)}</p>
<p>${escapeHtml(vetaEmailu(input.lang))}</p>
<p><a href="${escapeAttr(oknoOdkaz)}">${escapeHtml(tlacitkoEmailu(input.lang))}</a></p>
<p><a href="${escapeAttr(input.guideUrl)}">${escapeHtml(input.guideUrl)}</a></p>
<p>${escapeHtml(podpis)}</p>
</div>`;
  return { subject, text, html };
}
