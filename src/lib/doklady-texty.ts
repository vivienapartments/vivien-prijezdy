/**
 * Prompt 56 · doklady k předání (texty připravil Claude, schválil majitel 30. 10.).
 * Dvě verze: CR = host s národností CZE (bez zmínky o cizinecké policii), CIZINEC = ostatní.
 * Zpráva se neposílá sama, majitel ji posílá po upozornění 30 minut před příjezdem.
 */
import type { GuideLang } from './types';

/** Zpráva „Doklady k předání“, host z ČR. */
export const DOKLADY_ZPRAVA_CR: Record<GuideLang, string> = {
  cs: "Dobrý den, za chvíli se uvidíme. Připravte si prosím k předání občanský průkaz nebo pas všech hostů. Údaje ze zákona zapisujeme do evidence ubytovaných a odvádíme s nimi městu poplatek z pobytu. Děkujeme.",
  en: "Hello, we will see you shortly. Please have the ID cards or passports of all guests ready for the handover. By law we record the details in the guest register and pay the local tourist fee to the city with them. Thank you.",
  de: "Guten Tag, wir sehen uns gleich. Bitte halten Sie für die Übergabe den Personalausweis oder Reisepass aller Gäste bereit. Gesetzlich tragen wir die Angaben in das Gästeverzeichnis ein und führen damit die Kurtaxe an die Stadt ab. Danke.",
  pl: "Dzień dobry, za chwilę się zobaczymy. Prosimy przygotować do przekazania dowody osobiste lub paszporty wszystkich gości. Zgodnie z prawem wpisujemy dane do ewidencji gości i odprowadzamy z nimi do miasta opłatę miejscową. Dziękujemy.",
  uk: "Добрий день, незабаром побачимося. Будь ласка, підготуйте до передачі посвідчення особи або паспорти всіх гостей. За законом ми вносимо дані до реєстру гостей і сплачуємо з ними місту туристичний збір. Дякуємо.",
  'zh-Hant': "您好，我們很快就會見面。交付公寓時，請準備好所有住客的身分證或護照。依法我們須將資料登記於住客名冊，並據此向市政府繳納住宿稅。謝謝。",
  sv: "Hej, vi ses snart. Ha gärna id-kort eller pass för alla gäster redo vid överlämningen. Enligt lag för vi in uppgifterna i gästregistret och betalar med dem turistavgiften till staden. Tack.",
  es: "Hola, nos vemos en un momento. Tengan preparados para la entrega el documento de identidad o el pasaporte de todos los huéspedes. Por ley anotamos los datos en el registro de huéspedes y con ellos pagamos al ayuntamiento la tasa turística. Gracias.",
  fr: "Bonjour, nous nous voyons dans un instant. Merci de préparer pour la remise la carte d’identité ou le passeport de tous les voyageurs. La loi nous oblige à inscrire ces données au registre des hôtes et à verser avec elles la taxe de séjour à la ville. Merci.",
  it: "Buongiorno, ci vediamo tra poco. Per la consegna tenete pronti la carta d’identità o il passaporto di tutti gli ospiti. Per legge registriamo i dati nel registro degli ospiti e con essi versiamo al comune l’imposta di soggiorno. Grazie.",
  hu: "Jó napot, hamarosan találkozunk. Kérjük, az átadáshoz készítsék elő minden vendég személyi igazolványát vagy útlevelét. Törvény szerint az adatokat bejegyezzük a vendégnyilvántartásba, és ezek alapján fizetjük be a városnak az idegenforgalmi adót. Köszönjük.",
};

/** Zpráva „Doklady k předání“, cizinec (národnost jiná než CZE nebo neznámá a jazyk není čeština). */
export const DOKLADY_ZPRAVA_CIZINEC: Record<GuideLang, string> = {
  cs: "Dobrý den, za chvíli se uvidíme. Připravte si prosím k předání občanský průkaz nebo pas všech hostů. Údaje ze zákona zapisujeme do evidence ubytovaných, odvádíme s nimi městu poplatek z pobytu a u cizinců je hlásíme cizinecké policii. Děkujeme.",
  en: "Hello, we will see you shortly. Please have the ID cards or passports of all guests ready for the handover. By law we record the details in the guest register, pay the local tourist fee to the city with them and, for foreign guests, report them to the foreign police. Thank you.",
  de: "Guten Tag, wir sehen uns gleich. Bitte halten Sie für die Übergabe den Personalausweis oder Reisepass aller Gäste bereit. Gesetzlich tragen wir die Angaben in das Gästeverzeichnis ein, führen damit die Kurtaxe an die Stadt ab und melden ausländische Gäste der Fremdenpolizei. Danke.",
  pl: "Dzień dobry, za chwilę się zobaczymy. Prosimy przygotować do przekazania dowody osobiste lub paszporty wszystkich gości. Zgodnie z prawem wpisujemy dane do ewidencji gości, odprowadzamy z nimi do miasta opłatę miejscową, a cudzoziemców zgłaszamy policji ds. cudzoziemców. Dziękujemy.",
  uk: "Добрий день, незабаром побачимося. Будь ласка, підготуйте до передачі посвідчення особи або паспорти всіх гостей. За законом ми вносимо дані до реєстру гостей, сплачуємо з ними місту туристичний збір, а іноземців повідомляємо поліції у справах іноземців. Дякуємо.",
  'zh-Hant': "您好，我們很快就會見面。交付公寓時，請準備好所有住客的身分證或護照。依法我們須將資料登記於住客名冊、據此向市政府繳納住宿稅，並向外國人警察通報外籍住客。謝謝。",
  sv: "Hej, vi ses snart. Ha gärna id-kort eller pass för alla gäster redo vid överlämningen. Enligt lag för vi in uppgifterna i gästregistret, betalar med dem turistavgiften till staden och anmäler utländska gäster till utlänningspolisen. Tack.",
  es: "Hola, nos vemos en un momento. Tengan preparados para la entrega el documento de identidad o el pasaporte de todos los huéspedes. Por ley anotamos los datos en el registro de huéspedes, con ellos pagamos al ayuntamiento la tasa turística y comunicamos a los huéspedes extranjeros a la policía de extranjería. Gracias.",
  fr: "Bonjour, nous nous voyons dans un instant. Merci de préparer pour la remise la carte d’identité ou le passeport de tous les voyageurs. La loi nous oblige à inscrire ces données au registre des hôtes, à verser avec elles la taxe de séjour à la ville et à déclarer les voyageurs étrangers à la police des étrangers. Merci.",
  it: "Buongiorno, ci vediamo tra poco. Per la consegna tenete pronti la carta d’identità o il passaporto di tutti gli ospiti. Per legge registriamo i dati nel registro degli ospiti, con essi versiamo al comune l’imposta di soggiorno e comunichiamo gli ospiti stranieri alla polizia per gli stranieri. Grazie.",
  hu: "Jó napot, hamarosan találkozunk. Kérjük, az átadáshoz készítsék elő minden vendég személyi igazolványát vagy útlevelét. Törvény szerint az adatokat bejegyezzük a vendégnyilvántartásba, ezek alapján fizetjük be a városnak az idegenforgalmi adót, a külföldi vendégeket pedig bejelentjük az idegenrendészetnek. Köszönjük.",
};

/** Nadpis rámečku v průvodci (zobrazí se po uložení času příjezdu, do předání). */
export const DOKLADY_PRUVODCE_NADPIS: Record<GuideLang, string> = {
  cs: "Připravte si prosím doklady",
  en: "Please have your ID ready",
  de: "Bitte Ausweise bereithalten",
  pl: "Prosimy przygotować dokumenty",
  uk: "Будь ласка, підготуйте документи",
  'zh-Hant': "請準備好證件",
  sv: "Ha gärna id-handlingar redo",
  es: "Tengan preparados sus documentos",
  fr: "Merci de préparer vos papiers d’identité",
  it: "Tenete pronti i documenti",
  hu: "Kérjük, készítsék elő az igazolványokat",
};

/** Text rámečku v průvodci, host z ČR. */
export const DOKLADY_PRUVODCE_CR: Record<GuideLang, string> = {
  cs: "Při předání apartmánu zkontrolujeme občanský průkaz nebo pas všech hostů. Údaje ze zákona zapisujeme do evidence ubytovaných a odvádíme s nimi městu poplatek z pobytu. Děkujeme, předání tak bude rychlé.",
  en: "At the handover we check the ID card or passport of all guests. By law we record the details in the guest register and pay the local tourist fee to the city with them. Thank you, this keeps the handover quick.",
  de: "Bei der Übergabe prüfen wir den Personalausweis oder Reisepass aller Gäste. Gesetzlich tragen wir die Angaben in das Gästeverzeichnis ein und führen damit die Kurtaxe an die Stadt ab. Danke, so geht die Übergabe schnell.",
  pl: "Przy przekazaniu apartamentu sprawdzimy dowody osobiste lub paszporty wszystkich gości. Zgodnie z prawem wpisujemy dane do ewidencji gości i odprowadzamy z nimi do miasta opłatę miejscową. Dziękujemy, dzięki temu przekazanie będzie szybkie.",
  uk: "Під час передачі апартаментів ми перевіримо посвідчення особи або паспорти всіх гостей. За законом ми вносимо дані до реєстру гостей і сплачуємо з ними місту туристичний збір. Дякуємо, так передача буде швидкою.",
  'zh-Hant': "交付公寓時，我們會查驗所有住客的身分證或護照。依法我們須將資料登記於住客名冊，並據此向市政府繳納住宿稅。謝謝，這樣交付會很快。",
  sv: "Vid överlämningen kontrollerar vi id-kort eller pass för alla gäster. Enligt lag för vi in uppgifterna i gästregistret och betalar med dem turistavgiften till staden. Tack, då går överlämningen snabbt.",
  es: "En la entrega comprobaremos el documento de identidad o el pasaporte de todos los huéspedes. Por ley anotamos los datos en el registro de huéspedes y con ellos pagamos al ayuntamiento la tasa turística. Gracias, así la entrega será rápida.",
  fr: "Lors de la remise, nous vérifions la carte d’identité ou le passeport de tous les voyageurs. La loi nous oblige à inscrire ces données au registre des hôtes et à verser avec elles la taxe de séjour à la ville. Merci, la remise sera ainsi rapide.",
  it: "Alla consegna controlliamo la carta d’identità o il passaporto di tutti gli ospiti. Per legge registriamo i dati nel registro degli ospiti e con essi versiamo al comune l’imposta di soggiorno. Grazie, così la consegna sarà rapida.",
  hu: "Az apartman átadásakor ellenőrizzük minden vendég személyi igazolványát vagy útlevelét. Törvény szerint az adatokat bejegyezzük a vendégnyilvántartásba, és ezek alapján fizetjük be a városnak az idegenforgalmi adót. Köszönjük, így gyors lesz az átadás.",
};

/** Text rámečku v průvodci, cizinec. */
export const DOKLADY_PRUVODCE_CIZINEC: Record<GuideLang, string> = {
  cs: "Při předání apartmánu zkontrolujeme občanský průkaz nebo pas všech hostů. Údaje ze zákona zapisujeme do evidence ubytovaných, odvádíme s nimi městu poplatek z pobytu a u cizinců je hlásíme cizinecké policii. Děkujeme, předání tak bude rychlé.",
  en: "At the handover we check the ID card or passport of all guests. By law we record the details in the guest register, pay the local tourist fee to the city with them and, for foreign guests, report them to the foreign police. Thank you, this keeps the handover quick.",
  de: "Bei der Übergabe prüfen wir den Personalausweis oder Reisepass aller Gäste. Gesetzlich tragen wir die Angaben in das Gästeverzeichnis ein, führen damit die Kurtaxe an die Stadt ab und melden ausländische Gäste der Fremdenpolizei. Danke, so geht die Übergabe schnell.",
  pl: "Przy przekazaniu apartamentu sprawdzimy dowody osobiste lub paszporty wszystkich gości. Zgodnie z prawem wpisujemy dane do ewidencji gości, odprowadzamy z nimi do miasta opłatę miejscową, a cudzoziemców zgłaszamy policji ds. cudzoziemców. Dziękujemy, dzięki temu przekazanie będzie szybkie.",
  uk: "Під час передачі апартаментів ми перевіримо посвідчення особи або паспорти всіх гостей. За законом ми вносимо дані до реєстру гостей, сплачуємо з ними місту туристичний збір, а іноземців повідомляємо поліції у справах іноземців. Дякуємо, так передача буде швидкою.",
  'zh-Hant': "交付公寓時，我們會查驗所有住客的身分證或護照。依法我們須將資料登記於住客名冊、據此向市政府繳納住宿稅，並向外國人警察通報外籍住客。謝謝，這樣交付會很快。",
  sv: "Vid överlämningen kontrollerar vi id-kort eller pass för alla gäster. Enligt lag för vi in uppgifterna i gästregistret, betalar med dem turistavgiften till staden och anmäler utländska gäster till utlänningspolisen. Tack, då går överlämningen snabbt.",
  es: "En la entrega comprobaremos el documento de identidad o el pasaporte de todos los huéspedes. Por ley anotamos los datos en el registro de huéspedes, con ellos pagamos al ayuntamiento la tasa turística y comunicamos a los huéspedes extranjeros a la policía de extranjería. Gracias, así la entrega será rápida.",
  fr: "Lors de la remise, nous vérifions la carte d’identité ou le passeport de tous les voyageurs. La loi nous oblige à inscrire ces données au registre des hôtes, à verser avec elles la taxe de séjour à la ville et à déclarer les voyageurs étrangers à la police des étrangers. Merci, la remise sera ainsi rapide.",
  it: "Alla consegna controlliamo la carta d’identità o il passaporto di tutti gli ospiti. Per legge registriamo i dati nel registro degli ospiti, con essi versiamo al comune l’imposta di soggiorno e comunichiamo gli ospiti stranieri alla polizia per gli stranieri. Grazie, così la consegna sarà rapida.",
  hu: "Az apartman átadásakor ellenőrizzük minden vendég személyi igazolványát vagy útlevelét. Törvény szerint az adatokat bejegyezzük a vendégnyilvántartásba, ezek alapján fizetjük be a városnak az idegenforgalmi adót, a külföldi vendégeket pedig bejelentjük az idegenrendészetnek. Köszönjük, így gyors lesz az átadás.",
};

export type DokladyVerze = 'CR' | 'CIZINEC';

/** CR při národnosti CZE. Bez národnosti jen u češtiny průvodce. */
export function jeDokladyCr(
  narodnost: string | null | undefined,
  lang: GuideLang | null | undefined,
): boolean {
  const n = (narodnost || '').trim().toUpperCase();
  if (n === 'CZE') return true;
  if (n) return false;
  return lang === 'cs';
}

export function textyDokladu(
  narodnost: string | null | undefined,
  lang: GuideLang | null | undefined,
): {
  verze: DokladyVerze;
  zprava: string;
  nadpis: string;
  pruvodce: string;
} {
  const cr = jeDokladyCr(narodnost, lang);
  const l: GuideLang = lang && lang in DOKLADY_ZPRAVA_CR ? lang : 'en';
  return {
    verze: cr ? 'CR' : 'CIZINEC',
    zprava: cr ? DOKLADY_ZPRAVA_CR[l] : DOKLADY_ZPRAVA_CIZINEC[l],
    nadpis: DOKLADY_PRUVODCE_NADPIS[l],
    pruvodce: cr ? DOKLADY_PRUVODCE_CR[l] : DOKLADY_PRUVODCE_CIZINEC[l],
  };
}

/** Rámeček po uložení času, do předání. V náhledu i bez času. */
export function ukazatDokladyRamecek(opts: {
  cas: string | null | undefined;
  predano: boolean;
  demo?: boolean;
}): boolean {
  if (opts.predano) return false;
  if (opts.demo) return true;
  return Boolean(opts.cas);
}
