import type { GuideLang } from './types';
import type { ChybejiciKrok } from './vstup-pruvodce';
import { fazeHosta } from './faze-hosta';
import { PRIPLATEK_KC, PRIPLATEK_OD } from './constants';
import { casZMinut, priplatekProCas } from './priplatek-prijezd';

type JazykZpravy = 'cs' | 'en' | 'de' | 'pl' | 'uk' | 'zh-Hant' | 'sv' | 'hu';
type ZdrojZpravy = 'booking' | 'airbnb' | 'prima' | 'jiny';

function textVJazyce(tabulka: Record<JazykZpravy, string>, lang: GuideLang | null): string {
  if (lang && lang in tabulka) return tabulka[lang as JazykZpravy];
  return tabulka.en;
}

/** Podpis pod každou zprávou. Čeština, angličtina a němčina jsou dané. */
const PODPIS: Record<JazykZpravy, string> = {
  cs: 'Nikol a rodina VIVIEN',
  en: 'Nikol and the VIVIEN family',
  de: 'Nikol und Familie VIVIEN',
  pl: 'Nikol i rodzina VIVIEN',
  uk: 'Nikol і родина VIVIEN',
  'zh-Hant': 'Nikol 與 VIVIEN 家人',
  sv: 'Nikol och familjen VIVIEN',
  hu: "Nikol és a VIVIEN család",
};

/**
 * Text, pak prázdný řádek, případně odkaz, pak prázdný řádek a podpis.
 * Odkaz z políčka na check-in se sem nedává.
 */
function sestav(text: string, odkaz: string | null, lang: GuideLang | null): string {
  const dily = [text.trim()];
  if (odkaz) dily.push(odkaz);
  dily.push(textVJazyce(PODPIS, lang));
  return dily.join('\n\n');
}

/** Booking, Airbnb, přímá, jinak záložní věta. */
export function druhZdroje(raw: string | null | undefined): ZdrojZpravy {
  const s = (raw || '').trim();
  if (!s) return 'jiny';
  const n = s.toLowerCase();
  if (n.includes('airbnb')) return 'airbnb';
  if (n.includes('booking')) return 'booking';
  if (n.includes('prim') || n.includes('přím') || n.includes('direct') || n === 'web' || n.includes('vivien')) {
    return 'prima';
  }
  return 'jiny';
}

const CHECKIN_UVOD: Record<JazykZpravy, string> = {
  cs: 'Dobrý den, ještě nemáte vyplněný online check-in. Bez něj vám nemůžeme poslat průvodce k příjezdu, a bez průvodce se u nás neubytujete ani nezaparkujete.',
  en: 'Hello, you have not completed the online check-in yet. Without it we cannot send you the arrival guide, and without the guide you cannot stay with us or park.',
  de: 'Guten Tag, Ihr Online-Check-in ist noch nicht ausgefüllt. Ohne ihn können wir Ihnen den Leitfaden zur Anreise nicht schicken, und ohne den Leitfaden können Sie bei uns weder übernachten noch parken.',
  pl: 'Dzień dobry, nie macie jeszcze wypełnionego online check-inu. Bez niego nie możemy wysłać przewodnika do przyjazdu, a bez przewodnika nie zakwaterujecie się u nas ani nie zaparkujecie.',
  uk: 'Добрий день, ви ще не заповнили онлайн-реєстрацію. Без неї ми не можемо надіслати путівник до приїзду, а без путівника ви не заселитеся і не припаркуєтесь.',
  'zh-Hant': '您好，您還沒有完成線上入住登記。沒有它，我們無法寄上抵達指南，沒有指南就無法入住，也無法停車。',
  sv: 'Hej, ni har inte fyllt i online-incheckningen ännu. Utan den kan vi inte skicka ankomstguiden, och utan guiden kan ni varken bo hos oss eller parkera.',
  hu: "Jó napot, az online bejelentkezést még nem töltötték ki. Enélkül nem tudjuk elküldeni az érkezési útmutatót, útmutató nélkül pedig nem tudnak nálunk megszállni és parkolni.",
};

const CHECKIN_KONEC: Record<JazykZpravy, string> = {
  cs: 'Děkujeme a těšíme se na setkání.',
  en: 'Thank you, and we look forward to seeing you.',
  de: 'Vielen Dank, wir freuen uns auf Sie.',
  pl: 'Dziękujemy i do zobaczenia.',
  uk: 'Дякуємо і до зустрічі.',
  'zh-Hant': '謝謝，期待與您見面。',
  sv: 'Tack, vi ser fram emot att träffas.',
  hu: "Köszönjük, várjuk önöket.",
};

const CHECKIN_ODKAZ: Record<ZdrojZpravy, Record<JazykZpravy, string>> = {
  booking: {
    cs: 'Odkaz najdete ve zprávách na Booking.com.',
    en: 'You will find the link in your messages on Booking.com.',
    de: 'Den Link finden Sie in den Nachrichten auf Booking.com.',
    pl: 'Link znajdziecie w wiadomościach na Booking.com.',
    uk: 'Посилання є у повідомленнях на Booking.com.',
    'zh-Hant': '連結在 Booking.com 的訊息裡。',
    sv: 'Länken finns i era meddelanden på Booking.com.',
    hu: "A linket a Booking.com üzenetei között találják.",
  },
  airbnb: {
    cs: 'Odkaz najdete ve zprávách na Airbnb.',
    en: 'You will find the link in your messages on Airbnb.',
    de: 'Den Link finden Sie in den Nachrichten auf Airbnb.',
    pl: 'Link znajdziecie w wiadomościach na Airbnb.',
    uk: 'Посилання є у повідомленнях на Airbnb.',
    'zh-Hant': '連結在 Airbnb 的訊息裡。',
    sv: 'Länken finns i era meddelanden på Airbnb.',
    hu: "A linket az Airbnb üzenetei között találják.",
  },
  prima: {
    cs: 'Odkaz najdete v e-mailu s potvrzením rezervace.',
    en: 'You will find the link in your booking confirmation email.',
    de: 'Den Link finden Sie in der E-Mail mit der Buchungsbestätigung.',
    pl: 'Link znajdziecie w e-mailu z potwierdzeniem rezerwacji.',
    uk: 'Посилання є в листі з підтвердженням бронювання.',
    'zh-Hant': '連結在預訂確認信裡。',
    sv: 'Länken finns i mejlet med bokningsbekräftelsen.',
    hu: "A linket a foglalás visszaigazoló e-mailjében találják.",
  },
  jiny: {
    cs: 'Odkaz najdete ve zprávách od webu, kde jste rezervovali.',
    en: 'You will find the link in the messages from the website where you booked.',
    de: 'Den Link finden Sie in den Nachrichten von der Website, auf der Sie gebucht haben.',
    pl: 'Link znajdziecie w wiadomościach ze strony, na której rezerwowaliście.',
    uk: 'Посилання є у повідомленнях із сайту, де ви бронювали.',
    'zh-Hant': '連結在您預訂的那個網站的訊息裡。',
    sv: 'Länken finns i meddelandena från sidan där ni bokade.',
    hu: "A linket annak az oldalnak az üzenetei között találják, ahol foglaltak.",
  },
};

const ODKAZ_NIZE: Record<JazykZpravy, string> = {
  cs: 'Odkaz posíláme níže.',
  en: 'We are sending the link below.',
  de: 'Den Link senden wir unten.',
  pl: 'Link wysyłamy poniżej.',
  uk: 'Посилання надсилаємо нижче.',
  'zh-Hant': '連結我們放在下面。',
  sv: 'Länken skickar vi nedan.',
  hu: 'A linket alább küldjük.',
};

const NEOTEVREL: Record<JazykZpravy, string> = {
  cs: 'Dobrý den, ve vašem průvodci k příjezdu čekají vstupní PINy do domu a apartmánu. Abyste se k nim dostali, otevřete průvodce, vyberte čas a způsob příjezdu a potvrďte pravidla. Děkujeme a těšíme se na setkání.',
  en: 'Hello, your entry PIN codes for the house and the apartment are waiting in your arrival guide. To reach them, open the guide, choose the time and how you arrive, and confirm the rules. Thank you, and we look forward to seeing you.',
  de: 'Guten Tag, in Ihrem Anreiseleitfaden warten die Eingangs-PIN-Codes für das Haus und das Apartment. Um zu ihnen zu kommen, öffnen Sie den Leitfaden, wählen Sie die Zeit und die Art der Anreise und bestätigen Sie die Regeln. Vielen Dank, wir freuen uns auf Sie.',
  pl: 'Dzień dobry, w Waszym przewodniku do przyjazdu czekają kody PIN do domu i apartamentu. Żeby do nich dojść, otwórzcie przewodnik, wybierzcie godzinę i sposób przyjazdu i potwierdźcie zasady. Dziękujemy i do zobaczenia.',
  uk: 'Добрий день, у вашому путівнику до приїзду чекають вхідні PIN-коди до будинку й апартаментів. Щоб дістатися до них, відкрийте путівник, виберіть час і спосіб приїзду та підтвердьте правила. Дякуємо і до зустрічі.',
  'zh-Hant': '您好，您的抵達指南裡有房屋和公寓的入口 PIN 碼。要看到它們，請打開指南，選擇抵達時間和方式，並確認規則。謝謝，期待與您見面。',
  sv: 'Hej, i er ankomstguide väntar PIN-koderna till huset och lägenheten. För att komma till dem, öppna guiden, välj tid och sätt att komma, och bekräfta reglerna. Tack, vi ser fram emot att träffas.',
  hu: 'Jó napot, az érkezési útmutatóban ott várnak a ház és az apartman belépő PIN-kódjai. Hogy elérjék őket, nyissák meg az útmutatót, válasszák ki az időt és az érkezés módját, és erősítsék meg a szabályokat. Köszönjük, várjuk önöket.',
};

const BRANA: Record<JazykZpravy, string> = {
  cs: 'Dobrý den, v průvodci doplňte telefon pro bránu a SPZ. Bez registrace v bráně nezaparkujete. Děkujeme a těšíme se na setkání.',
  en: 'Hello, in the guide add the phone for the gate and the licence plate. Without registration at the gate you cannot park. Thank you, and we look forward to seeing you.',
  de: 'Guten Tag, ergänzen Sie im Leitfaden das Telefon für das Tor und das Kennzeichen. Ohne Anmeldung am Tor können Sie nicht parken. Vielen Dank, wir freuen uns auf Sie.',
  pl: 'Dzień dobry, w przewodniku dopiszcie telefon do bramy i tablicę. Bez rejestracji w bramie nie zaparkujecie. Dziękujemy i do zobaczenia.',
  uk: 'Добрий день, у путівнику допишіть телефон для брами і номер авто. Без реєстрації на брамі ви не припаркуєтесь. Дякуємо і до зустрічі.',
  'zh-Hant': '您好，請在指南裡補上大門用的電話和車牌。沒有在大門登記就無法停車。謝謝，期待與您見面。',
  sv: 'Hej, fyll i guiden telefonen till grinden och registreringsnumret. Utan registrering vid grinden kan ni inte parkera. Tack, vi ser fram emot att träffas.',
  hu: 'Jó napot, az útmutatóban írják be a kapuhoz való telefont és a rendszámot. Kapuregisztráció nélkül nem tudnak parkolni. Köszönjük, várjuk önöket.',
};

const FRAZE_KROKU: Record<'cas' | 'zpusob' | 'pravidla', Record<JazykZpravy, string>> = {
  cas: {
    cs: 'vyberte čas příjezdu',
    en: 'choose the arrival time',
    de: 'die Ankunftszeit wählen',
    pl: 'wybierzcie godzinę przyjazdu',
    uk: 'виберіть час приїзду',
    'zh-Hant': '選擇抵達時間',
    sv: 'välja ankomsttiden',
    hu: 'válasszák ki az érkezés idejét',
  },
  zpusob: {
    cs: 'vyberte, jak přijedete',
    en: 'choose how you arrive',
    de: 'wählen, wie Sie anreisen',
    pl: 'wybierzcie, jak przyjedziecie',
    uk: 'виберіть, як приїдете',
    'zh-Hant': '選擇抵達方式',
    sv: 'välja hur ni kommer',
    hu: 'válasszák ki, hogyan érkeznek',
  },
  pravidla: {
    cs: 'potvrďte pravidla',
    en: 'confirm the rules',
    de: 'die Regeln bestätigen',
    pl: 'potwierdźcie zasady',
    uk: 'підтвердьте правила',
    'zh-Hant': '確認規則',
    sv: 'bekräfta reglerna',
    hu: 'erősítsék meg a szabályokat',
  },
};

const SPOJKA: Record<JazykZpravy, string> = {
  cs: 'a',
  en: 'and',
  de: 'und',
  pl: 'i',
  uk: 'і',
  'zh-Hant': '、',
  sv: 'och',
  hu: 'és',
};

function spojKroky(lang: GuideLang | null, chybi: ChybejiciKrok[]): string {
  const jazyk: JazykZpravy = lang && lang in SPOJKA ? (lang as JazykZpravy) : 'en';
  const casti = (chybi.length ? chybi : (['cas', 'zpusob', 'pravidla'] as ChybejiciKrok[])).map((krok) => FRAZE_KROKU[krok][jazyk]);
  if (casti.length <= 1) return casti[0] || '';
  if (jazyk === 'zh-Hant') return casti.join(SPOJKA[jazyk]);
  return `${casti.slice(0, -1).join(', ')} ${SPOJKA[jazyk]} ${casti[casti.length - 1]}`;
}

const UPOMINKA: Record<JazykZpravy, string> = {
  cs: 'Ve vašem průvodci čekají vstupní PINy do domu a apartmánu. Abyste se k nim dostali, ještě {kroky}. Zabere to minutu.',
  en: 'Your entry PIN codes for the house and the apartment are waiting in your guide. To reach them, you still need to {kroky}. It takes a minute.',
  de: 'In Ihrem Leitfaden warten die Eingangs-PIN-Codes für das Haus und das Apartment. Um zu ihnen zu kommen, müssen Sie noch {kroky}. Das dauert eine Minute.',
  pl: 'W Waszej instrukcji czekają kody PIN do domu i apartamentu. Żeby do nich dojść, jeszcze {kroky}. Zajmie to minutę.',
  uk: 'У вашому гіді чекають вхідні PIN-коди до будинку й апартаментів. Щоб дістатися до них, ще {kroky}. Це займе хвилину.',
  'zh-Hant': '您的指南裡有房屋和公寓的入口 PIN 碼。要看到它們，請再 {kroky}。大約一分鐘。',
  sv: 'I er guide väntar PIN-koderna till huset och lägenheten. För att komma till dem behöver ni fortfarande {kroky}. Det tar en minut.',
  hu: 'Az útmutatóban ott várnak a ház és az apartman belépő PIN-kódjai. Hogy elérjék őket, még {kroky}. Egy perc.',
};

const NEROZBALEN: Record<JazykZpravy, string> = {
  cs: 'Dobrý den, abyste se dostali ke svým vstupním PINům, v průvodci k příjezdu ještě {kroky}. Zabere to minutu. Děkujeme a těšíme se na setkání.',
  en: 'Hello, to reach your entry PIN codes, in the arrival guide you still need to {kroky}. It takes a minute. Thank you, and we look forward to seeing you.',
  de: 'Guten Tag, um zu Ihren Eingangs-PIN-Codes zu kommen, müssen Sie im Anreiseleitfaden noch {kroky}. Das dauert eine Minute. Vielen Dank, wir freuen uns auf Sie.',
  pl: 'Dzień dobry, żebyście doszli do swoich kodów PIN, w przewodniku do przyjazdu jeszcze {kroky}. Zajmie to minutę. Dziękujemy i do zobaczenia.',
  uk: 'Добрий день, щоб дістатися до своїх вхідних PIN-кодів, у путівнику до приїзду ще {kroky}. Це займе хвилину. Дякуємо і до зустрічі.',
  'zh-Hant': '您好，要看到您的入口 PIN 碼，請在抵達指南裡再 {kroky}。大約一分鐘。謝謝，期待與您見面。',
  sv: 'Hej, för att komma till era PIN-koder behöver ni i ankomstguiden fortfarande {kroky}. Det tar en minut. Tack, vi ser fram emot att träffas.',
  hu: 'Jó napot, hogy elérjék a belépő PIN-kódjaikat, az érkezési útmutatóban még {kroky}. Egy perc. Köszönjük, várjuk önöket.',
};

const DEN_NEROZBALEN: Record<JazykZpravy, string> = {
  cs: 'Dobrý den, dnes se na vás těšíme. Abyste se dostali ke svým vstupním PINům, v průvodci ještě {kroky}. Zabere to minutu. Děkujeme.',
  en: 'Hello, we are looking forward to seeing you today. To reach your entry PIN codes, in the guide you still need to {kroky}. It takes a minute. Thank you.',
  de: 'Guten Tag, wir freuen uns heute auf Sie. Um zu Ihren Eingangs-PIN-Codes zu kommen, müssen Sie im Leitfaden noch {kroky}. Das dauert eine Minute. Vielen Dank.',
  pl: 'Dzień dobry, cieszymy się, że dziś przyjedziecie. Żebyście doszli do swoich kodów PIN, w przewodniku jeszcze {kroky}. Zajmie to minutę. Dziękujemy.',
  uk: 'Добрий день, сьогодні на вас чекаємо. Щоб дістатися до своїх вхідних PIN-кодів, у путівнику ще {kroky}. Це займе хвилину. Дякуємо.',
  'zh-Hant': '您好，今天期待您的到來。要看到您的入口 PIN 碼，請在指南裡再 {kroky}。大約一分鐘。謝謝。',
  sv: 'Hej, vi ser fram emot att träffa er i dag. För att komma till era PIN-koder behöver ni i guiden fortfarande {kroky}. Det tar en minut. Tack.',
  hu: 'Jó napot, ma várjuk önöket. Hogy elérjék a belépő PIN-kódjaikat, az útmutatóban még {kroky}. Egy perc. Köszönjük.',
};

const DEN_CAS: Record<JazykZpravy, string> = {
  cs: 'Dobrý den, dnes se na vás těšíme. Počítáme s vámi kolem {čas}. Asi čtvrt hodiny předem nám napište, že budete na místě, a budeme vás čekat. Na domluvený čas čekáme 10 minut. Kdyby se čas změnil, opravte ho v průvodci nebo nám napište.',
  en: 'Hello, we are looking forward to seeing you today. We are expecting you around {čas}. About a quarter of an hour beforehand, write to us that you will be there, and we will be waiting for you. We wait 10 minutes past the agreed time. If the time changes, correct it in the guide or write to us.',
  de: 'Guten Tag, wir freuen uns heute auf Sie. Wir rechnen mit Ihnen gegen {čas}. Etwa eine Viertelstunde vorher schreiben Sie uns, dass Sie da sein werden, und wir warten auf Sie. Auf die vereinbarte Zeit warten wir 10 Minuten. Wenn sich die Zeit ändert, korrigieren Sie sie im Leitfaden oder schreiben Sie uns.',
  pl: 'Dzień dobry, cieszymy się, że dziś przyjedziecie. Spodziewamy się Was około {čas}. Około kwadransa wcześniej napiszcie, że będziecie na miejscu, a będziemy na Was czekać. Na umówioną godzinę czekamy 10 minut. Gdyby godzina się zmieniła, poprawcie ją w przewodniku albo napiszcie nam.',
  uk: 'Добрий день, сьогодні на вас чекаємо. Розраховуємо на вас близько {čas}. Приблизно за чверть години напишіть, що будете на місці, і ми вас чекатимемо. На домовлений час чекаємо 10 хвилин. Якщо час зміниться, виправте його в путівнику або напишіть нам.',
  'zh-Hant': '您好，今天期待您的到來。我們預計您大約 {čas} 到。請在大約一刻鐘前寫說您會到，我們會等您。約定時間我們等 10 分鐘。如果時間有變，請在指南裡改，或寫訊息給我們。',
  sv: 'Hej, vi ser fram emot att träffa er i dag. Vi räknar med er omkring {čas}. Ungefär en kvart i förväg skriver ni att ni kommer att vara på plats, så väntar vi på er. Vi väntar 10 minuter efter den avtalade tiden. Om tiden ändras, rätta den i guiden eller skriv till oss.',
  hu: 'Jó napot, ma várjuk önöket. Körülbelül {čas} körül számítunk önökre. Negyedórával előtte írják meg, hogy ott lesznek, és mi várunk önökre. A megbeszélt időpontra 10 percet várunk. Ha az időpont változik, javítsák ki az útmutatóban, vagy írjanak nekünk.',
};

const odHodina = casZMinut(PRIPLATEK_OD);
const kcKrok = String(PRIPLATEK_KC);

const DEN_PRIPLATEK: Record<JazykZpravy, string> = {
  cs: `Příjezd po ${odHodina} je za příplatek ${kcKrok}\u00A0Kč za každou započatou půlhodinu podle skutečného času, teď by to bylo {částka}\u00A0Kč, platí se na místě.`,
  en: `Arrival after ${odHodina} is a surcharge of ${kcKrok}\u00A0Kč for each half-hour started, based on the actual time of arrival. Right now that would be {částka}\u00A0Kč, paid on the spot.`,
  de: `Eine Anreise nach ${odHodina} kostet einen Zuschlag von ${kcKrok}\u00A0Kč für jede angefangene halbe Stunde nach der tatsächlichen Ankunftszeit. Jetzt wären das {částka}\u00A0Kč, zahlbar vor Ort.`,
  pl: `Przyjazd po ${odHodina} jest za dopłatą ${kcKrok}\u00A0Kč za każdą rozpoczętą półgodzinę według rzeczywistej godziny przyjazdu. Teraz byłoby to {částka}\u00A0Kč, płatne na miejscu.`,
  uk: `Приїзд після ${odHodina} з доплатою ${kcKrok}\u00A0Kč за кожні розпочаті пів години за фактичним часом приїзду. Зараз це було б {částka}\u00A0Kč, сплачується на місці.`,
  'zh-Hant': `${odHodina} 後抵達按實際抵達時間，每開始計算的半小時加價 ${kcKrok}\u00A0Kč。現在是 {částka}\u00A0Kč，在現場支付。`,
  sv: `Ankomst efter ${odHodina} kostar ett tillägg på ${kcKrok}\u00A0Kč för varje påbörjad halvtimme efter den verkliga ankomsten. Just nu skulle det bli {částka}\u00A0Kč, och det betalas på plats.`,
  hu: `A ${odHodina} utáni érkezés pótdíja ${kcKrok}\u00A0Kč minden megkezdett félóráért, a tényleges érkezési idő szerint. Most ez {částka}\u00A0Kč lenne, a helyszínen fizetendő.`,
};

export type DruhZpravy = 'checkin' | 'neotevrel' | 'nerozbalen' | 'denNerozbalen' | 'denCas' | 'brana';

export type ZpravaMenu = { id: DruhZpravy; nazev: string; text: string; vychozi: boolean };

const PORADI: DruhZpravy[] = ['checkin', 'neotevrel', 'nerozbalen', 'denNerozbalen', 'denCas', 'brana'];

const NAZEV: Record<DruhZpravy, string> = {
  checkin: 'Vyplňte check-in',
  neotevrel: 'Neotevřel průvodce',
  nerozbalen: 'Průvodce nerozbalen',
  denNerozbalen: 'Den příjezdu, průvodce nerozbalen',
  denCas: 'Den příjezdu, čas známe',
  brana: 'Chybí údaje k bráně',
};

function vetaCheckinu(lang: GuideLang | null, zdroj: string | null | undefined, sOdkazem = false): string {
  const druh = druhZdroje(zdroj);
  const uvod = textVJazyce(CHECKIN_UVOD, lang);
  const odkaz = sOdkazem ? textVJazyce(ODKAZ_NIZE, lang) : textVJazyce(CHECKIN_ODKAZ[druh], lang);
  const konec = textVJazyce(CHECKIN_KONEC, lang);
  return `${uvod} ${odkaz} ${konec}`;
}

export function textZpravy(lang: GuideLang | null): string {
  return textVJazyce(NEOTEVREL, lang);
}

export function textCheckinu(lang: GuideLang | null, zdroj?: string | null, sOdkazem = false): string {
  return vetaCheckinu(lang, zdroj, sOdkazem);
}

export function textNerozbalen(lang: GuideLang | null, chybi: ChybejiciKrok[]): string {
  return textVJazyce(NEROZBALEN, lang).replaceAll('{kroky}', spojKroky(lang, chybi));
}

export function textBrany(lang: GuideLang | null): string {
  return textVJazyce(BRANA, lang);
}

export function textDneNerozbalen(lang: GuideLang | null, chybi: ChybejiciKrok[]): string {
  return textVJazyce(DEN_NEROZBALEN, lang).replaceAll('{kroky}', spojKroky(lang, chybi));
}

export function textUpominky(lang: GuideLang | null, chybi: ChybejiciKrok[]): string {
  const veta = textVJazyce(UPOMINKA, lang).replaceAll('{kroky}', spojKroky(lang, chybi));
  return veta;
}

export function textDneSCasem(lang: GuideLang | null, cas: string | null): string {
  const cisty = cas && /^([01]\d|2[0-3]):[0-5]\d$/.test(cas) ? cas : '';
  const zaklad = textVJazyce(DEN_CAS, lang).replaceAll('{čas}', cisty);
  const kc = cisty ? priplatekProCas(cisty) : null;
  if (!kc) return zaklad;
  const veta = textVJazyce(DEN_PRIPLATEK, lang).replaceAll('{částka}', String(kc));
  return `${zaklad} ${veta}`;
}

export function zpravaCheckinu(lang: GuideLang | null, zdroj?: string | null, url?: string | null): string {
  const ma = Boolean(url && /^https:\/\//i.test(url));
  return sestav(vetaCheckinu(lang, zdroj, ma), ma ? url!.trim() : null, lang);
}

export function zpravaHostovi(lang: GuideLang | null, odkaz: string | null): string {
  return sestav(textZpravy(lang), odkaz, lang);
}

export function zpravaNerozbalen(lang: GuideLang | null, chybi: ChybejiciKrok[], odkaz: string | null): string {
  return sestav(textNerozbalen(lang, chybi), odkaz, lang);
}

export function zpravaBrany(lang: GuideLang | null): string {
  return sestav(textBrany(lang), null, lang);
}

export function zpravaDneNerozbalen(lang: GuideLang | null, chybi: ChybejiciKrok[], odkaz: string | null): string {
  return sestav(textDneNerozbalen(lang, chybi), odkaz, lang);
}

export function zpravaDneSCasem(lang: GuideLang | null, cas: string | null, odkaz: string | null): string {
  return sestav(textDneSCasem(lang, cas), odkaz, lang);
}

/** Která zpráva sedí na fázi hosta. Řádky menu se kvůli tomu neprohazují. */
export function hlavniZprava(opts: {
  stav: string;
  otevrenoPocet: number | null;
  casPrijezdu: string | null;
  prijezd: string | null;
  dnes: string;
  chybi?: ChybejiciKrok[];
  branaChybi?: boolean;
  zpusob?: 'auto' | 'pesky' | null;
  souhlas?: boolean;
  naMiste?: boolean;
  predano?: string;
  odjezd?: string | null;
}): DruhZpravy {
  const chybi = opts.chybi ?? ['cas', 'zpusob', 'pravidla'];
  const faze = fazeHosta({
    stav: opts.stav,
    otevrenoPocet: opts.otevrenoPocet,
    cas: opts.casPrijezdu,
    zpusob: opts.zpusob ?? (chybi.includes('zpusob') ? null : 'pesky'),
    telefonBrana: null,
    spz: null,
    spzPujcene: false,
    souhlas: opts.souhlas ?? !chybi.includes('pravidla'),
    naMiste: Boolean(opts.naMiste),
    predano: opts.predano || '',
    odjezd: opts.odjezd ?? null,
    dnes: opts.dnes,
  });
  if (faze.id === 1) return 'checkin';
  if (faze.id === 2) return 'neotevrel';
  if (faze.id === 3) return 'nerozbalen';
  return 'denCas';
}

export function zpravyMenu(opts: {
  stav: string;
  lang: GuideLang | null;
  zdroj?: string | null;
  pruvodce: string | null;
  checkinUrl?: string | null;
  otevrenoPocet: number | null;
  casPrijezdu: string | null;
  prijezd: string | null;
  dnes: string;
  chybi?: ChybejiciKrok[];
  branaChybi?: boolean;
  zpusob?: 'auto' | 'pesky' | null;
  souhlas?: boolean;
  naMiste?: boolean;
  predano?: string;
  odjezd?: string | null;
}): ZpravaMenu[] {
  const chybi = opts.chybi ?? ['cas', 'zpusob', 'pravidla'];
  const texty: Record<DruhZpravy, string> = {
    checkin: zpravaCheckinu(opts.lang, opts.zdroj, opts.checkinUrl),
    neotevrel: zpravaHostovi(opts.lang, opts.pruvodce),
    nerozbalen: zpravaNerozbalen(opts.lang, chybi, opts.pruvodce),
    denNerozbalen: zpravaDneNerozbalen(opts.lang, chybi, opts.pruvodce),
    denCas: zpravaDneSCasem(opts.lang, opts.casPrijezdu, opts.pruvodce),
    brana: zpravaBrany(opts.lang),
  };
  const hlavni = hlavniZprava(opts);
  return PORADI.map((id) => ({ id, nazev: NAZEV[id], text: texty[id], vychozi: id === hlavni }));
}

export function odkazWhatsApp(wa: string, zprava: string): string {
  return `https://wa.me/${wa}?text=${encodeURIComponent(zprava)}`;
}

/** Android podle User-Agent prohlížeče. iPhone a počítač sem nepatří. */
export function jeAndroid(userAgent: string): boolean {
  return /Android/i.test(userAgent);
}

/**
 * V přehledu na Androidu míří odkaz rovnou na WhatsApp Business.
 * Jinde zůstane wa.me. Text zprávy se nemění, jen se zakóduje do adresy.
 */
export function odkazWhatsAppPrehled(wa: string, zprava: string, userAgent: string): string {
  const web = odkazWhatsApp(wa, zprava);
  if (!jeAndroid(userAgent)) return web;
  const phone = wa.replace(/\D/g, '');
  const text = encodeURIComponent(zprava);
  const fallback = encodeURIComponent(web);
  return `intent://send/?phone=${phone}&text=${text}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;S.browser_fallback_url=${fallback};end`;
}
