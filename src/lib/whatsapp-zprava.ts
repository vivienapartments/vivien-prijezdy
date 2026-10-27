import { posunDen } from './brana';
import { odkazPripraveno, textPripraveno, vetaOdjezduNavic } from './okno-pobytu';
import { ukazatDotazOdjezdu, zpravaOdjezdu, type PolozkaDluhu } from './odjezd';
import { textPohody, ukazatPohodu } from './pohoda';
import type { GuideLang } from './types';
import type { ChybejiciKrok } from './vstup-pruvodce';
import { fazeHosta } from './faze-hosta';
import { PRIPLATEK_KC, PRIPLATEK_OD } from './constants';
import { casZMinut, priplatekProCas } from './priplatek-prijezd';

type JazykZpravy = 'cs' | 'en' | 'de' | 'pl' | 'uk' | 'zh-Hant' | 'sv' | 'hu' | 'es' | 'fr' | 'it';
type ZdrojZpravy = 'booking' | 'airbnb' | 'prima' | 'jiny';

function textVJazyce(tabulka: Record<JazykZpravy, string>, lang: GuideLang | null): string {
  if (lang && lang in tabulka) return tabulka[lang as JazykZpravy];
  return tabulka.en;
}

function textHosta(tabulka: Record<GuideLang, string>, lang: GuideLang | null): string {
  if (lang && lang in tabulka) return tabulka[lang];
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
  es: 'Nikol y la familia VIVIEN',
  hu: "Nikol és a VIVIEN család",
  fr: "Nikol et la famille VIVIEN",
  it: "Nikol e la famiglia VIVIEN",
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

const CHECKIN_UVOD: Record<GuideLang, string> = {
  cs: 'Dobrý den, ještě nemáte vyplněný online check-in. Hned po něm vám pošleme průvodce k příjezdu se vstupními PINy do domu a apartmánu. Bez check-inu se u nás neubytujete ani nezaparkujete.',
  en: 'Hello, you have not completed the online check-in yet. Right after it we will send you the arrival guide with your entry PIN codes for the house and the apartment. Without the check-in you cannot stay with us or park.',
  de: 'Guten Tag, Ihr Online-Check-in ist noch nicht ausgefüllt. Gleich danach schicken wir Ihnen den Leitfaden zur Anreise mit den PIN-Codes für das Haus und das Apartment. Ohne den Check-in übernachten Sie bei uns nicht und parken nicht.',
  pl: 'Dzień dobry, nie macie jeszcze wypełnionego online check-inu. Zaraz po nim wyślemy przewodnik do przyjazdu z kodami PIN do domu i apartamentu. Bez check-inu nie zakwaterujecie się u nas ani nie zaparkujecie.',
  uk: 'Добрий день, ви ще не заповнили онлайн-реєстрацію. Одразу після неї надішлемо путівник до приїзду з PIN-кодами до будинку й апартаменту. Без реєстрації ви не заселитеся і не припаркуєтесь.',
  'zh-Hant': '您好，您還沒有完成線上入住登記。完成後我們立刻寄上抵達指南，裡面有房子和公寓的進入 PIN 碼。沒有入住登記就無法入住，也無法停車。',
  es: 'Hola, todavía no han rellenado el check-in en línea. Justo después les enviaremos la guía de llegada con los códigos PIN de entrada a la casa y al apartamento. Sin el check-in no se alojan ni aparcan.',
  fr: "Bonjour, vous n'avez pas encore rempli le check-in en ligne. Juste après, nous vous enverrons le guide d'arrivée avec les codes PIN d'entrée de la maison et de l'appartement. Sans le check-in, vous ne pouvez ni loger chez nous ni vous garer.",
  it: "Buongiorno, non avete ancora compilato il check-in online. Subito dopo vi invieremo la guida all'arrivo con i codici PIN di ingresso per la casa e l'appartamento. Senza il check-in non potete alloggiare da noi né parcheggiare.",
  sv: 'Hej, ni har inte fyllt i online-incheckningen ännu. Direkt efter den skickar vi ankomstguiden med PIN-koderna till huset och lägenheten. Utan incheckningen kan ni varken bo hos oss eller parkera.',
  hu: 'Jó napot, az online bejelentkezést még nem töltötték ki. Rögtön utána elküldjük az érkezési útmutatót a ház és az apartman belépő PIN-kódjaival. Bejelentkezés nélkül nem tudnak nálunk megszállni és parkolni.',
};

const CHECKIN_CHVILKA: Record<GuideLang, string> = {
  cs: 'Vyplnění zabere jen chvilku.',
  en: 'It only takes a moment.',
  de: 'Das Ausfüllen dauert nur einen Moment.',
  pl: 'Wypełnienie zajmuje tylko chwilę.',
  uk: 'Заповнення займе лише хвилину.',
  'zh-Hant': '填寫只需要一下子。',
  es: 'Rellenarlo lleva solo un momento.',
  fr: "Le remplissage ne prend qu'un instant.",
  it: 'La compilazione richiede solo un momento.',
  sv: 'Det tar bara en stund.',
  hu: 'A kitöltés csak egy pillanat.',
};

const CHECKIN_TADY: Record<GuideLang, string> = {
  cs: 'Vyplnění zabere jen chvilku, odkaz je tady:',
  en: 'It only takes a moment, here is the link:',
  de: 'Das Ausfüllen dauert nur einen Moment, der Link ist hier:',
  pl: 'Wypełnienie zajmuje tylko chwilę, link jest tutaj:',
  uk: 'Заповнення займе лише хвилину, посилання ось тут:',
  'zh-Hant': '填寫只需要一下子，連結在這裡：',
  es: 'Rellenarlo lleva solo un momento, el enlace está aquí:',
  fr: "Le remplissage ne prend qu'un instant, le lien est ici:",
  it: 'La compilazione richiede solo un momento, il link è qui:',
  sv: 'Det tar bara en stund, länken finns här:',
  hu: 'A kitöltés csak egy pillanat, a link itt van:',
};

const CHECKIN_KONEC: Record<GuideLang, string> = {
  cs: 'Děkujeme a moc se na vás těšíme.',
  en: 'Thank you, we are very much looking forward to seeing you.',
  de: 'Vielen Dank, wir freuen uns sehr auf Sie.',
  pl: 'Dziękujemy i bardzo czekamy na spotkanie.',
  uk: 'Дякуємо і дуже чекаємо на зустріч.',
  'zh-Hant': '謝謝，我們非常期待見到您。',
  es: 'Gracias, nos alegramos mucho de verles.',
  fr: 'Merci, nous avons très hâte de vous voir.',
  it: "Grazie, non vediamo l'ora di vedervi.",
  sv: 'Tack, vi ser mycket fram emot att träffa er.',
  hu: 'Köszönjük, nagyon várjuk önöket.',
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
    es: 'El enlace está en sus mensajes de Booking.com.',
    hu: "A linket a Booking.com üzenetei között találják.",
    fr: "Vous trouverez le lien dans vos messages sur Booking.com.",
    it: "Il link lo trovate nei messaggi su Booking.com.",
  },
  airbnb: {
    cs: 'Odkaz najdete ve zprávách na Airbnb.',
    en: 'You will find the link in your messages on Airbnb.',
    de: 'Den Link finden Sie in den Nachrichten auf Airbnb.',
    pl: 'Link znajdziecie w wiadomościach na Airbnb.',
    uk: 'Посилання є у повідомленнях на Airbnb.',
    'zh-Hant': '連結在 Airbnb 的訊息裡。',
    sv: 'Länken finns i era meddelanden på Airbnb.',
    es: 'El enlace está en sus mensajes de Airbnb.',
    hu: "A linket az Airbnb üzenetei között találják.",
    fr: "Vous trouverez le lien dans vos messages sur Airbnb.",
    it: "Il link lo trovate nei messaggi su Airbnb.",
  },
  prima: {
    cs: 'Odkaz najdete v e-mailu s potvrzením rezervace.',
    en: 'You will find the link in your booking confirmation email.',
    de: 'Den Link finden Sie in der E-Mail mit der Buchungsbestätigung.',
    pl: 'Link znajdziecie w e-mailu z potwierdzeniem rezerwacji.',
    uk: 'Посилання є в листі з підтвердженням бронювання.',
    'zh-Hant': '連結在預訂確認信裡。',
    sv: 'Länken finns i mejlet med bokningsbekräftelsen.',
    es: 'El enlace está en el correo de confirmación de la reserva.',
    hu: "A linket a foglalás visszaigazoló e-mailjében találják.",
    fr: "Vous trouverez le lien dans l’e-mail de confirmation de votre réservation.",
    it: "Il link lo trovate nell’e-mail di conferma della prenotazione.",
  },
  jiny: {
    cs: 'Odkaz najdete ve zprávách od webu, kde jste rezervovali.',
    en: 'You will find the link in the messages from the website where you booked.',
    de: 'Den Link finden Sie in den Nachrichten von der Website, auf der Sie gebucht haben.',
    pl: 'Link znajdziecie w wiadomościach ze strony, na której rezerwowaliście.',
    uk: 'Посилання є у повідомленнях із сайту, де ви бронювали.',
    'zh-Hant': '連結在您預訂的那個網站的訊息裡。',
    sv: 'Länken finns i meddelandena från sidan där ni bokade.',
    es: 'El enlace está en los mensajes de la página donde reservaron.',
    hu: "A linket annak az oldalnak az üzenetei között találják, ahol foglaltak.",
    fr: "Vous trouverez le lien dans les messages du site où vous avez réservé.",
    it: "Il link lo trovate nei messaggi del sito dove avete prenotato.",
  },
};

const CHECKIN_ODKAZ_FR_IT: Partial<Record<GuideLang, Record<ZdrojZpravy, string>>> = {
  fr: {
    booking: 'Vous trouverez le lien dans vos messages sur Booking.com.',
    airbnb: 'Vous trouverez le lien dans vos messages sur Airbnb.',
    prima: "Vous trouverez le lien dans l'e-mail de confirmation de la réservation.",
    jiny: 'Vous trouverez le lien dans les messages du site où vous avez réservé.',
  },
  it: {
    booking: 'Il link è nei messaggi su Booking.com.',
    airbnb: 'Il link è nei messaggi su Airbnb.',
    prima: "Il link è nell'e-mail di conferma della prenotazione.",
    jiny: 'Il link è nei messaggi del sito dove avete prenotato.',
  },
};

const NEOTEVREL: Record<JazykZpravy, string> = {
  cs: 'Dobrý den, ve vašem průvodci k příjezdu čekají vstupní PINy do domu a apartmánu. Abyste se k nim dostali, otevřete průvodce, vyberte čas a způsob příjezdu a potvrďte pravidla. Děkujeme a těšíme se na setkání.',
  en: 'Hello, your entry PIN codes for the house and the apartment are waiting in your arrival guide. To reach them, open the guide, choose the time and how you arrive, and confirm the rules. Thank you, and we look forward to seeing you.',
  de: 'Guten Tag, in Ihrem Anreiseleitfaden warten die Eingangs-PIN-Codes für das Haus und das Apartment. Um zu ihnen zu kommen, öffnen Sie den Leitfaden, wählen Sie die Zeit und die Art der Anreise und bestätigen Sie die Regeln. Vielen Dank, wir freuen uns auf Sie.',
  pl: 'Dzień dobry, w Waszym przewodniku do przyjazdu czekają kody PIN do domu i apartamentu. Żeby do nich dojść, otwórzcie przewodnik, wybierzcie godzinę i sposób przyjazdu i potwierdźcie zasady. Dziękujemy i do zobaczenia.',
  uk: 'Добрий день, у вашому путівнику до приїзду чекають вхідні PIN-коди до будинку й апартаментів. Щоб дістатися до них, відкрийте путівник, виберіть час і спосіб приїзду та підтвердьте правила. Дякуємо і до зустрічі.',
  'zh-Hant': '您好，您的抵達指南裡有房屋和公寓的入口 PIN 碼。要看到它們，請打開指南，選擇抵達時間和方式，並確認規則。謝謝，期待與您見面。',
  sv: 'Hej, i er ankomstguide väntar PIN-koderna till huset och lägenheten. För att komma till dem, öppna guiden, välj tid och sätt att komma, och bekräfta reglerna. Tack, vi ser fram emot att träffas.',
  es: 'Hola, en su guía de llegada esperan los códigos PIN de la casa y del apartamento. Para llegar a ellos, abran la guía, elijan la hora y cómo llegan, y confirmen las reglas. Gracias, nos alegramos de verles.',
  hu: 'Jó napot, az érkezési útmutatóban ott várnak a ház és az apartman belépő PIN-kódjai. Hogy elérjék őket, nyissák meg az útmutatót, válasszák ki az időt és az érkezés módját, és erősítsék meg a szabályokat. Köszönjük, várjuk önöket.',
  fr: "Bonjour, vos codes PIN d’entrée pour la maison et l’appartement vous attendent dans votre guide d’arrivée. Pour y accéder, ouvrez le guide, choisissez l’heure et le mode d’arrivée, et confirmez les règles. Merci, nous nous réjouissons de vous voir.",
  it: "Buongiorno, i vostri codici PIN di ingresso per la casa e l’appartamento vi aspettano nella guida all’arrivo. Per vederli, aprite la guida, scegliete l’orario e il modo di arrivo e confermate le regole. Grazie, vi aspettiamo.",
};

const BRANA: Record<JazykZpravy, string> = {
  cs: 'Dobrý den, v průvodci doplňte telefon pro bránu a SPZ. Bez registrace v bráně nezaparkujete. Děkujeme a těšíme se na setkání.',
  en: 'Hello, in the guide add the phone for the gate and the licence plate. Without registration at the gate you cannot park. Thank you, and we look forward to seeing you.',
  de: 'Guten Tag, ergänzen Sie im Leitfaden das Telefon für das Tor und das Kennzeichen. Ohne Anmeldung am Tor können Sie nicht parken. Vielen Dank, wir freuen uns auf Sie.',
  pl: 'Dzień dobry, w przewodniku dopiszcie telefon do bramy i tablicę. Bez rejestracji w bramie nie zaparkujecie. Dziękujemy i do zobaczenia.',
  uk: 'Добрий день, у путівнику допишіть телефон для брами і номер авто. Без реєстрації на брамі ви не припаркуєтесь. Дякуємо і до зустрічі.',
  'zh-Hant': '您好，請在指南裡補上大門用的電話和車牌。沒有在大門登記就無法停車。謝謝，期待與您見面。',
  sv: 'Hej, fyll i guiden telefonen till grinden och registreringsnumret. Utan registrering vid grinden kan ni inte parkera. Tack, vi ser fram emot att träffas.',
  es: 'Hola, en la guía pongan el teléfono de la barrera y la matrícula. Sin el registro en la barrera no pueden aparcar. Gracias, nos alegramos de verles.',
  hu: 'Jó napot, az útmutatóban írják be a kapuhoz való telefont és a rendszámot. Kapuregisztráció nélkül nem tudnak parkolni. Köszönjük, várjuk önöket.',
  fr: "Bonjour, dans le guide, indiquez le téléphone pour le portail et la plaque d’immatriculation. Sans enregistrement au portail, vous ne pourrez pas vous garer. Merci, nous nous réjouissons de vous voir.",
  it: "Buongiorno, nella guida inserite il telefono per il cancello e la targa. Senza registrazione al cancello non potete parcheggiare. Grazie, vi aspettiamo.",
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
    es: 'elijan la hora de llegada',
    hu: 'válasszák ki az érkezés idejét',
    fr: "choisir l’heure d’arrivée",
    it: "scegliere l’orario di arrivo",
  },
  zpusob: {
    cs: 'vyberte, jak přijedete',
    en: 'choose how you arrive',
    de: 'wählen, wie Sie anreisen',
    pl: 'wybierzcie, jak przyjedziecie',
    uk: 'виберіть, як приїдете',
    'zh-Hant': '選擇抵達方式',
    sv: 'välja hur ni kommer',
    es: 'elijan cómo llegan',
    hu: 'válasszák ki, hogyan érkeznek',
    fr: "choisir le mode d’arrivée",
    it: "scegliere come arrivate",
  },
  pravidla: {
    cs: 'potvrďte pravidla',
    en: 'confirm the rules',
    de: 'die Regeln bestätigen',
    pl: 'potwierdźcie zasady',
    uk: 'підтвердьте правила',
    'zh-Hant': '確認規則',
    sv: 'bekräfta reglerna',
    es: 'confirmen las reglas',
    hu: 'erősítsék meg a szabályokat',
    fr: "confirmer les règles",
    it: "confermare le regole",
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
  es: 'y',
  hu: 'és',
  fr: "et",
  it: "e",
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
  es: 'En su guía esperan los códigos PIN de la casa y del apartamento. Para llegar a ellos, todavía tienen que {kroky}. Lleva un minuto.',
  hu: 'Az útmutatóban ott várnak a ház és az apartman belépő PIN-kódjai. Hogy elérjék őket, még {kroky}. Egy perc.',
  fr: "Vos codes PIN d’entrée pour la maison et l’appartement vous attendent dans votre guide. Pour y accéder, il vous reste à {kroky}. Cela prend une minute.",
  it: "I vostri codici PIN di ingresso per la casa e l’appartamento vi aspettano nella guida. Per vederli dovete ancora {kroky}. Ci vuole un minuto.",
};

const NEROZBALEN: Record<JazykZpravy, string> = {
  cs: 'Dobrý den, abyste se dostali ke svým vstupním PINům, v průvodci k příjezdu ještě {kroky}. Zabere to minutu. Děkujeme a těšíme se na setkání.',
  en: 'Hello, to reach your entry PIN codes, in the arrival guide you still need to {kroky}. It takes a minute. Thank you, and we look forward to seeing you.',
  de: 'Guten Tag, um zu Ihren Eingangs-PIN-Codes zu kommen, müssen Sie im Anreiseleitfaden noch {kroky}. Das dauert eine Minute. Vielen Dank, wir freuen uns auf Sie.',
  pl: 'Dzień dobry, żebyście doszli do swoich kodów PIN, w przewodniku do przyjazdu jeszcze {kroky}. Zajmie to minutę. Dziękujemy i do zobaczenia.',
  uk: 'Добрий день, щоб дістатися до своїх вхідних PIN-кодів, у путівнику до приїзду ще {kroky}. Це займе хвилину. Дякуємо і до зустрічі.',
  'zh-Hant': '您好，要看到您的入口 PIN 碼，請在抵達指南裡再 {kroky}。大約一分鐘。謝謝，期待與您見面。',
  sv: 'Hej, för att komma till era PIN-koder behöver ni i ankomstguiden fortfarande {kroky}. Det tar en minut. Tack, vi ser fram emot att träffas.',
  es: 'Hola, para llegar a sus códigos PIN, en la guía de llegada todavía tienen que {kroky}. Lleva un minuto. Gracias, nos alegramos de verles.',
  hu: 'Jó napot, hogy elérjék a belépő PIN-kódjaikat, az érkezési útmutatóban még {kroky}. Egy perc. Köszönjük, várjuk önöket.',
  fr: "Bonjour, pour accéder à vos codes PIN d’entrée, il vous reste à {kroky} dans le guide d’arrivée. Cela prend une minute. Merci, nous nous réjouissons de vous voir.",
  it: "Buongiorno, per vedere i vostri codici PIN di ingresso, nella guida all’arrivo dovete ancora {kroky}. Ci vuole un minuto. Grazie, vi aspettiamo.",
};

const DEN_NEROZBALEN: Record<JazykZpravy, string> = {
  cs: 'Dobrý den, dnes se na vás těšíme. Abyste se dostali ke svým vstupním PINům, v průvodci ještě {kroky}. Zabere to minutu. Děkujeme.',
  en: 'Hello, we are looking forward to seeing you today. To reach your entry PIN codes, in the guide you still need to {kroky}. It takes a minute. Thank you.',
  de: 'Guten Tag, wir freuen uns heute auf Sie. Um zu Ihren Eingangs-PIN-Codes zu kommen, müssen Sie im Leitfaden noch {kroky}. Das dauert eine Minute. Vielen Dank.',
  pl: 'Dzień dobry, cieszymy się, że dziś przyjedziecie. Żebyście doszli do swoich kodów PIN, w przewodniku jeszcze {kroky}. Zajmie to minutę. Dziękujemy.',
  uk: 'Добрий день, сьогодні на вас чекаємо. Щоб дістатися до своїх вхідних PIN-кодів, у путівнику ще {kroky}. Це займе хвилину. Дякуємо.',
  'zh-Hant': '您好，今天期待您的到來。要看到您的入口 PIN 碼，請在指南裡再 {kroky}。大約一分鐘。謝謝。',
  sv: 'Hej, vi ser fram emot att träffa er i dag. För att komma till era PIN-koder behöver ni i guiden fortfarande {kroky}. Det tar en minut. Tack.',
  es: 'Hola, hoy nos alegramos de verles. Para llegar a sus códigos PIN, en la guía todavía tienen que {kroky}. Lleva un minuto. Gracias.',
  hu: 'Jó napot, ma várjuk önöket. Hogy elérjék a belépő PIN-kódjaikat, az útmutatóban még {kroky}. Egy perc. Köszönjük.',
  fr: "Bonjour, nous nous réjouissons de vous accueillir aujourd’hui. Pour accéder à vos codes PIN d’entrée, il vous reste à {kroky} dans le guide. Cela prend une minute. Merci.",
  it: "Buongiorno, oggi vi aspettiamo. Per vedere i vostri codici PIN di ingresso, nella guida dovete ancora {kroky}. Ci vuole un minuto. Grazie.",
};

const DEN_CAS: Record<JazykZpravy, string> = {
  cs: 'Dobrý den, dnes se na vás těšíme. Počítáme s vámi kolem {čas}. Asi čtvrt hodiny předem nám napište, že budete na místě, a budeme vás čekat. Na domluvený čas čekáme 10 minut. Kdyby se čas změnil, opravte ho v průvodci nebo nám napište.',
  en: 'Hello, we are looking forward to seeing you today. We are expecting you around {čas}. About a quarter of an hour beforehand, write to us that you will be there, and we will be waiting for you. We wait 10 minutes past the agreed time. If the time changes, correct it in the guide or write to us.',
  de: 'Guten Tag, wir freuen uns heute auf Sie. Wir rechnen mit Ihnen gegen {čas}. Etwa eine Viertelstunde vorher schreiben Sie uns, dass Sie da sein werden, und wir warten auf Sie. Auf die vereinbarte Zeit warten wir 10 Minuten. Wenn sich die Zeit ändert, korrigieren Sie sie im Leitfaden oder schreiben Sie uns.',
  pl: 'Dzień dobry, cieszymy się, że dziś przyjedziecie. Spodziewamy się Was około {čas}. Około kwadransa wcześniej napiszcie, że będziecie na miejscu, a będziemy na Was czekać. Na umówioną godzinę czekamy 10 minut. Gdyby godzina się zmieniła, poprawcie ją w przewodniku albo napiszcie nam.',
  uk: 'Добрий день, сьогодні на вас чекаємо. Розраховуємо на вас близько {čas}. Приблизно за чверть години напишіть, що будете на місці, і ми вас чекатимемо. На домовлений час чекаємо 10 хвилин. Якщо час зміниться, виправте його в путівнику або напишіть нам.',
  'zh-Hant': '您好，今天期待您的到來。我們預計您大約 {čas} 到。請在大約一刻鐘前寫說您會到，我們會等您。約定時間我們等 10 分鐘。如果時間有變，請在指南裡改，或寫訊息給我們。',
  sv: 'Hej, vi ser fram emot att träffa er i dag. Vi räknar med er omkring {čas}. Ungefär en kvart i förväg skriver ni att ni kommer att vara på plats, så väntar vi på er. Vi väntar 10 minuter efter den avtalade tiden. Om tiden ändras, rätta den i guiden eller skriv till oss.',
  es: 'Hola, hoy nos alegramos de verles. Les esperamos alrededor de las {čas}. Un cuarto de hora antes escríbannos que ya van a estar, y esperamos nosotros. Esperamos 10 minutos a partir de la hora acordada. Si la hora cambia, corríjanla en la guía o escríbannos.',
  hu: 'Jó napot, ma várjuk önöket. Körülbelül {čas} körül számítunk önökre. Negyedórával előtte írják meg, hogy ott lesznek, és mi várunk önökre. A megbeszélt időpontra 10 percet várunk. Ha az időpont változik, javítsák ki az útmutatóban, vagy írjanak nekünk.',
  fr: "Bonjour, nous nous réjouissons de vous accueillir aujourd’hui. Nous vous attendons vers {čas}. Environ un quart d’heure avant, écrivez-nous que vous serez là, et nous vous attendrons. Nous attendons 10 minutes après l’heure convenue. Si l’heure change, corrigez-la dans le guide ou écrivez-nous.",
  it: "Buongiorno, oggi vi aspettiamo. Vi attendiamo verso le {čas}. Circa un quarto d’ora prima scriveteci che state arrivando e vi aspetteremo. Aspettiamo 10 minuti oltre l’orario concordato. Se l’orario cambia, correggetelo nella guida o scriveteci.",
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
  es: `La llegada después de las ${odHodina} lleva un suplemento de ${kcKrok}\u00A0Kč por cada media hora empezada, según la hora real. Ahora serían {částka}\u00A0Kč, se paga en el momento.`,
  hu: `A ${odHodina} utáni érkezés pótdíja ${kcKrok}\u00A0Kč minden megkezdett félóráért, a tényleges érkezési idő szerint. Most ez {částka}\u00A0Kč lenne, a helyszínen fizetendő.`,
  fr: `Une arrivée après ${odHodina} entraîne un supplément de ${kcKrok}\u00A0Kč par demi-heure commencée, selon l’heure d’arrivée réelle. Actuellement, cela ferait {částka}\u00A0Kč, à payer sur place.`,
  it: `L’arrivo dopo le ${odHodina} comporta un supplemento di ${kcKrok}\u00A0Kč per ogni mezz’ora iniziata, in base all’orario di arrivo effettivo. Al momento sarebbero {částka}\u00A0Kč, da pagare sul posto.`,
};

const TELEFON = '+420\u00A0604\u00A0692\u00A0573';

const NEDOJEZD: Record<GuideLang, string> = {
  cs: `Dobrý den, stále od vás nemáme čas příjezdu a na naše zprávy nereagujete. Pokud se nám neozvete a do 20:00 nedorazíte, budeme rezervaci považovat za nedojezd (no-show) a pobyt propadá. Napište nám hned, v kolik dorazíte, na ${TELEFON}. Děkujeme.`,
  en: `Hello, we still do not have your arrival time, and you are not answering our messages. If you do not contact us and you do not arrive by 20:00, we will treat the booking as a no-show and the stay is forfeited. Write to us now with the time you will arrive, at ${TELEFON}. Thank you.`,
  de: `Guten Tag, wir haben von Ihnen noch keine Ankunftszeit, und Sie antworten nicht auf unsere Nachrichten. Wenn Sie sich nicht melden und bis 20:00 nicht ankommen, behandeln wir die Buchung als Nichtanreise (No-Show) und der Aufenthalt verfällt. Schreiben Sie uns sofort, um wie viel Uhr Sie ankommen, an ${TELEFON}. Danke.`,
  pl: `Dzień dobry, nadal nie mamy od Was godziny przyjazdu i nie odpowiadacie na nasze wiadomości. Jeśli się nie odezwiecie i nie dojedziecie do 20:00, uznamy rezerwację za niedojazd (no-show), a pobyt przepada. Napiszcie od razu, o której dojedziecie, na ${TELEFON}. Dziękujemy.`,
  uk: `Добрий день, ми досі не маємо від вас часу приїзду, і ви не відповідаєте на наші повідомлення. Якщо ви не напишете і не приїдете до 20:00, ми вважатимемо бронювання неприбуттям (no-show), і проживання анулюється. Напишіть нам одразу, о котрій приїдете, на ${TELEFON}. Дякуємо.`,
  'zh-Hant': `您好，我們仍未收到您的抵達時間，您也沒有回覆我們的訊息。如果您不與我們聯繫，而且在 20:00 前沒有抵達，我們會把這筆預訂視為未入住（no-show），住宿即失效。請立刻寫下您幾點到，傳給 ${TELEFON}。謝謝。`,
  es: `Hola, seguimos sin tener su hora de llegada y no responden a nuestros mensajes. Si no nos escriben y no llegan antes de las 20:00, tomaremos la reserva como no presentado (no-show) y la estancia se pierde. Escríbannos ahora a qué hora llegan, al ${TELEFON}. Gracias.`,
  fr: `Bonjour, nous n'avons toujours pas votre heure d'arrivée et vous ne répondez pas à nos messages. Si vous ne nous contactez pas et si vous n'arrivez pas avant 20:00, nous considérerons la réservation comme un no-show et le séjour est perdu. Écrivez-nous tout de suite à quelle heure vous arrivez, au ${TELEFON}. Merci.`,
  it: `Buongiorno, non abbiamo ancora l'orario di arrivo e non rispondete ai nostri messaggi. Se non ci scrivete e non arrivate entro le 20:00, considereremo la prenotazione come mancato arrivo (no-show) e il soggiorno decade. Scriveteci subito a che ora arrivate, al ${TELEFON}. Grazie.`,
  sv: `Hej, vi har fortfarande ingen ankomsttid från er, och ni svarar inte på våra meddelanden. Om ni inte hör av er och inte kommer före 20:00, räknar vi bokningen som utebliven ankomst (no-show) och vistelsen förfaller. Skriv till oss genast vilken tid ni kommer, till ${TELEFON}. Tack.`,
  hu: `Jó napot, még mindig nincs meg az érkezés ideje, és nem válaszolnak az üzeneteinkre. Ha nem jelentkeznek, és 20:00-ig nem érkeznek meg, a foglalást meg nem érkezésnek (no-show) vesszük, és a tartózkodás elvész. Írják meg azonnal, hánykor érkeznek, a ${TELEFON} számra. Köszönjük.`,
};

const PODPIS_HOST: Record<GuideLang, string> = {
  ...PODPIS,
  fr: 'Nikol et la famille VIVIEN',
  it: 'Nikol e la famiglia VIVIEN',
};

export type DruhZpravy =
  | 'checkin'
  | 'neotevrel'
  | 'nerozbalen'
  | 'denNerozbalen'
  | 'denCas'
  | 'brana'
  | 'nedojezd'
  | 'odjezd'
  | 'pohoda'
  | 'pripraveno';

export type ZpravaMenu = { id: DruhZpravy; nazev: string; text: string; vychozi: boolean; vystraha: boolean };

const PORADI: DruhZpravy[] = [
  'checkin',
  'neotevrel',
  'nerozbalen',
  'denNerozbalen',
  'denCas',
  'brana',
  'nedojezd',
  'odjezd',
  'pohoda',
  'pripraveno',
];

const NAZEV: Record<DruhZpravy, string> = {
  checkin: 'Vyplňte check-in',
  neotevrel: 'Neotevřel průvodce',
  nerozbalen: 'Průvodce nerozbalen',
  denNerozbalen: 'Den příjezdu, průvodce nerozbalen',
  denCas: 'Den příjezdu, čas známe',
  brana: 'Chybí údaje k bráně',
  nedojezd: 'Poslední výzva (nedojezd)',
  odjezd: 'Dotaz na odjezd',
  pohoda: 'Je vše v pořádku?',
  pripraveno: 'Apartmán je připravený',
};

function vetaCheckinu(lang: GuideLang | null, zdroj: string | null | undefined, sOdkazem = false): string {
  const uvod = textHosta(CHECKIN_UVOD, lang);
  const konec = textHosta(CHECKIN_KONEC, lang);
  if (sOdkazem) return `${uvod} ${textHosta(CHECKIN_TADY, lang)}\n\n${konec}`;
  const druh = druhZdroje(zdroj);
  const odkaz = (lang && CHECKIN_ODKAZ_FR_IT[lang]?.[druh]) || textVJazyce(CHECKIN_ODKAZ[druh], lang);
  return `${uvod} ${textHosta(CHECKIN_CHVILKA, lang)}\n\n${odkaz}\n\n${konec}`;
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
  if (!ma) return sestav(vetaCheckinu(lang, zdroj, false), null, lang);
  const telo = `${textHosta(CHECKIN_UVOD, lang)} ${textHosta(CHECKIN_TADY, lang)}\n\n${url!.trim()}\n\n${textHosta(CHECKIN_KONEC, lang)}`;
  return sestav(telo, null, lang);
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

export function zpravaNedojezdu(lang: GuideLang | null): string {
  const text = lang && NEDOJEZD[lang] ? NEDOJEZD[lang] : NEDOJEZD.en;
  const podpis = lang && PODPIS_HOST[lang] ? PODPIS_HOST[lang] : PODPIS_HOST.en;
  return `${text}\n\n${podpis}`;
}

/** Jen den příjezdu a den před ním, když chybí čas nebo host nereaguje. Po předání už ne. */
export function ukazatNedojezd(opts: {
  stav: string;
  otevrenoPocet: number | null;
  casPrijezdu: string | null;
  prijezd: string | null;
  dnes: string;
  chybi?: string[];
  predano?: string;
  naMiste?: boolean;
}): boolean {
  if (opts.stav === 'zruseno' || opts.predano || opts.naMiste) return false;
  if (!opts.prijezd || !opts.dnes) return false;
  if (opts.dnes !== opts.prijezd && opts.dnes !== posunDen(opts.prijezd, -1)) return false;
  const maCas = Boolean(opts.casPrijezdu && /^([01]\d|2[0-3]):[0-5]\d$/.test(opts.casPrijezdu));
  const nereaguje =
    opts.otevrenoPocet == null ||
    opts.otevrenoPocet === 0 ||
    Boolean(opts.chybi && opts.chybi.length > 0) ||
    opts.stav === 'bez_checkinu' ||
    opts.stav === 'neodeslano';
  return !maCas || nereaguje;
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
  casOdjezdu?: string | null;
  dluh?: PolozkaDluhu[];
  pripraveno?: boolean;
}): ZpravaMenu[] {
  const chybi = opts.chybi ?? ['cas', 'zpusob', 'pravidla'];
  const texty: Record<DruhZpravy, string> = {
    checkin: zpravaCheckinu(opts.lang, opts.zdroj, opts.checkinUrl),
    neotevrel: zpravaHostovi(opts.lang, opts.pruvodce),
    nerozbalen: zpravaNerozbalen(opts.lang, chybi, opts.pruvodce),
    denNerozbalen: zpravaDneNerozbalen(opts.lang, chybi, opts.pruvodce),
    denCas: zpravaDneSCasem(opts.lang, opts.casPrijezdu, opts.pruvodce),
    brana: zpravaBrany(opts.lang),
    nedojezd: zpravaNedojezdu(opts.lang),
    odjezd: `${zpravaOdjezdu(opts.lang, opts.dluh || [], opts.pruvodce)}\n\n${vetaOdjezduNavic(opts.lang)}${opts.pruvodce ? `\n${opts.pruvodce.split('#')[0]}#pozdejsi` : ''}`,
    pohoda: textPohody(opts.lang),
    pripraveno: textPripraveno(opts.lang, opts.pruvodce ? odkazPripraveno(opts.pruvodce) : ''),
  };
  const videt = PORADI.filter((id) => {
    if (id === 'nedojezd') return ukazatNedojezd({ ...opts, chybi });
    if (id === 'pripraveno') return opts.pripraveno === true;
    if (id === 'pohoda') {
      return ukazatPohodu({
        stav: opts.stav,
        predano: opts.predano,
        prijezd: opts.prijezd,
        odjezd: opts.odjezd,
        dnes: opts.dnes,
      });
    }
    if (id === 'odjezd') {
      return ukazatDotazOdjezdu({
        stav: opts.stav,
        odjezd: opts.odjezd,
        dnes: opts.dnes,
        casOdjezdu: opts.casOdjezdu,
      });
    }
    return true;
  });
  const vychozi = vychoziZprava(opts, videt);
  return videt.map((id) => ({
    id,
    nazev: NAZEV[id],
    text: texty[id],
    vychozi: id === vychozi,
    vystraha: id === 'nedojezd',
  }));
}

/** Po předání: den po příjezdu pohoda, den před odjezdem odjezd, jinak nic. Předtím podle fáze. */
export function vychoziZprava(
  opts: Parameters<typeof zpravyMenu>[0],
  videt: DruhZpravy[],
): DruhZpravy | null {
  if (opts.predano) {
    const denPo = Boolean(opts.prijezd && opts.dnes === posunDen(opts.prijezd, 1));
    const denPred = Boolean(opts.odjezd && opts.dnes === posunDen(opts.odjezd, -1));
    if (denPo && videt.includes('pohoda')) return 'pohoda';
    if (denPred && videt.includes('odjezd')) return 'odjezd';
    return null;
  }
  const hlavni = hlavniZprava(opts);
  return videt.includes(hlavni) ? hlavni : null;
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
