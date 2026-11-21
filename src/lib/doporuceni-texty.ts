import type { GuideLang } from './types';

export type DoporuceniTexty = {
  nadVas: string;
  nadBlizci: string;
  otazka: string;
  veta1: string;
  veta2: string;
  tlacitko: string;
  zkopirovano: string;
  zprava: string;
  poptavkaNadpis: string;
  poptavkaStitek: string;
  poptavkaUvod: string;
  poptavkaNadpisApartmany: string;
  poptavkaNadpisOdeslano: string;
};

const MAPA: Record<GuideLang, DoporuceniTexty> = {
  "cs": {
    "nadVas": "Váš další pobyt",
    "nadBlizci": "Pro vaše blízké",
    "otazka": "Znáte někoho, komu by se u nás líbilo?",
    "veta1": "Pošlete odkaz. Na první pobyt od nás dostanou slevu 5 %.",
    "veta2": "Až přijedou, připíšeme vám 5 % z ceny jejich pobytu jako kredit na vaše další ubytování.",
    "tlacitko": "Poslat odkaz",
    "zkopirovano": "Odkaz je zkopírovaný.",
    "zprava": "Ahoj, posílám tip na apartmány VIVIEN v centru Českých Budějovic. Přes tenhle odkaz máš na první pobyt slevu 5 %:",
    "poptavkaNadpis": "Rádi vás u nás přivítáme",
    "poptavkaStitek": "Přicházíte na doporučení",
    "poptavkaUvod": "Na první pobyt u nás máte slevu 5 %. Vyberte termín a my vám obvykle do hodiny pošleme cenu. Odpovídáme od 8 do 20 hodin.",
    "poptavkaNadpisApartmany": "Který apartmán vás láká?",
    "poptavkaNadpisOdeslano": "Děkujeme, těšíme se na vás."
  },
  "en": {
    "nadVas": "Your next stay",
    "nadBlizci": "For people close to you",
    "otazka": "Know someone who would love it here?",
    "veta1": "Send them the link. They get 5% off their first stay with us.",
    "veta2": "Once they have stayed, we will add 5% of the price of their stay as credit for your next stay.",
    "tlacitko": "Send the link",
    "zkopirovano": "The link has been copied.",
    "zprava": "Hi, here is a tip: VIVIEN Apartments in the centre of České Budějovice. With this link you get 5% off your first stay:",
    "poptavkaNadpis": "We look forward to welcoming you",
    "poptavkaStitek": "You come recommended",
    "poptavkaUvod": "You get 5% off your first stay with us. Choose your dates and we will usually send you the price within an hour. We reply between 8 am and 8 pm.",
    "poptavkaNadpisApartmany": "Which apartment appeals to you?",
    "poptavkaNadpisOdeslano": "Thank you, we look forward to having you."
  },
  "de": {
    "nadVas": "Ihr nächster Aufenthalt",
    "nadBlizci": "Für Ihre Liebsten",
    "otazka": "Wer aus Ihrem Umfeld würde sich bei uns wohlfühlen?",
    "veta1": "Senden Sie den Link. Für den ersten Aufenthalt gibt es von uns 5 % Rabatt.",
    "veta2": "Nach diesem Aufenthalt schreiben wir Ihnen 5 % des Preises als Guthaben für Ihren nächsten Aufenthalt gut.",
    "tlacitko": "Link senden",
    "zkopirovano": "Der Link wurde kopiert.",
    "zprava": "Hallo, ein Tipp für dich: die VIVIEN Apartments im Zentrum von České Budějovice. Mit diesem Link bekommst du beim ersten Aufenthalt 5 % Rabatt:",
    "poptavkaNadpis": "Wir freuen uns, Sie bei uns zu begrüßen",
    "poptavkaStitek": "Auf Empfehlung",
    "poptavkaUvod": "Für Ihren ersten Aufenthalt bei uns erhalten Sie 5 % Rabatt. Wählen Sie den Termin, und wir senden Ihnen in der Regel innerhalb einer Stunde den Preis. Wir antworten von 8 bis 20 Uhr.",
    "poptavkaNadpisApartmany": "Welches Apartment spricht Sie an?",
    "poptavkaNadpisOdeslano": "Vielen Dank, wir freuen uns auf Sie."
  },
  "pl": {
    "nadVas": "Wasz kolejny pobyt",
    "nadBlizci": "Dla Waszych bliskich",
    "otazka": "Znacie kogoś, komu by się u nas podobało?",
    "veta1": "Wyślijcie link. Na pierwszy pobyt dostaną od nas zniżkę 5 %.",
    "veta2": "Gdy przyjadą, dopiszemy Wam 5 % ceny ich pobytu jako kredyt na Wasz kolejny nocleg.",
    "tlacitko": "Wyślij link",
    "zkopirovano": "Link został skopiowany.",
    "zprava": "Cześć, mam dla Ciebie polecenie: apartamenty VIVIEN w centrum Czeskich Budziejowic. Z tym linkiem masz na pierwszy pobyt zniżkę 5 %:",
    "poptavkaNadpis": "Chętnie Was u nas przywitamy",
    "poptavkaStitek": "Z polecenia",
    "poptavkaUvod": "Na pierwszy pobyt u nas macie zniżkę 5 %. Wybierzcie termin, a zwykle w ciągu godziny wyślemy Wam cenę. Odpowiadamy od 8 do 20.",
    "poptavkaNadpisApartmany": "Który apartament Wam się podoba?",
    "poptavkaNadpisOdeslano": "Dziękujemy, czekamy na Was."
  },
  "uk": {
    "nadVas": "Ваше наступне перебування",
    "nadBlizci": "Для ваших близьких",
    "otazka": "Знаєте когось, кому б у нас сподобалося?",
    "veta1": "Надішліть посилання. На перше перебування вони отримають від нас знижку 5 %.",
    "veta2": "Коли вони приїдуть, ми зарахуємо вам 5 % від вартості їхнього перебування як кредит на ваше наступне проживання.",
    "tlacitko": "Надіслати посилання",
    "zkopirovano": "Посилання скопійовано.",
    "zprava": "Привіт, раджу апартаменти VIVIEN у центрі Чеських Будейовиць. За цим посиланням маєш знижку 5 % на перше перебування:",
    "poptavkaNadpis": "Будемо раді вітати вас у нас",
    "poptavkaStitek": "За рекомендацією",
    "poptavkaUvod": "На перше перебування у нас маєте знижку 5 %. Оберіть дати, і ми зазвичай протягом години надішлемо вам ціну. Відповідаємо з 8 до 20 години.",
    "poptavkaNadpisApartmany": "Які апартаменти вам до вподоби?",
    "poptavkaNadpisOdeslano": "Дякуємо, чекаємо на вас."
  },
  "zh-Hant": {
    "nadVas": "您的下次入住",
    "nadBlizci": "給您的親友",
    "otazka": "認識會喜歡這裡的朋友嗎？",
    "veta1": "把連結傳給他們，首次入住可享 5% 折扣。",
    "veta2": "他們入住後，我們會將其住宿費用的 5% 作為抵用金，供您下次入住使用。",
    "tlacitko": "傳送連結",
    "zkopirovano": "連結已複製。",
    "zprava": "嗨，推薦你 České Budějovice 市中心的 VIVIEN 公寓。透過這個連結，首次入住可享 5% 折扣：",
    "poptavkaNadpis": "期待歡迎您的到來",
    "poptavkaStitek": "經親友推薦",
    "poptavkaUvod": "首次入住可享 5% 折扣。請選擇日期，我們通常會在一小時內傳送價格給您。回覆時間為 8:00 至 20:00。",
    "poptavkaNadpisApartmany": "哪一間最吸引您？",
    "poptavkaNadpisOdeslano": "謝謝，期待您的到來。"
  },
  "es": {
    "nadVas": "Su próxima estancia",
    "nadBlizci": "Para sus seres queridos",
    "otazka": "¿Conocen a alguien a quien le encantaría alojarse aquí?",
    "veta1": "Envíenle el enlace. En su primera estancia tendrá un 5 % de descuento.",
    "veta2": "Cuando se haya alojado con nosotros, les abonaremos el 5 % del precio de su estancia como crédito para su próximo alojamiento.",
    "tlacitko": "Enviar enlace",
    "zkopirovano": "El enlace se ha copiado.",
    "zprava": "Hola, te paso una recomendación: los apartamentos VIVIEN en el centro de České Budějovice. Con este enlace tienes un 5 % de descuento en tu primera estancia:",
    "poptavkaNadpis": "Nos alegrará darles la bienvenida",
    "poptavkaStitek": "Llegan por recomendación",
    "poptavkaUvod": "En su primera estancia tienen un 5 % de descuento. Elijan las fechas y normalmente en una hora les enviaremos el precio. Respondemos de 8 a 20 h.",
    "poptavkaNadpisApartmany": "¿Qué apartamento les atrae?",
    "poptavkaNadpisOdeslano": "Gracias, les esperamos con ilusión."
  },
  "fr": {
    "nadVas": "Votre prochain séjour",
    "nadBlizci": "Pour vos proches",
    "otazka": "Vous connaissez quelqu’un qui se plairait chez nous ?",
    "veta1": "Envoyez-lui le lien. Pour son premier séjour, nous lui offrons 5 % de réduction.",
    "veta2": "Après son séjour, nous vous créditerons 5 % du prix de son séjour pour votre prochain séjour.",
    "tlacitko": "Envoyer le lien",
    "zkopirovano": "Le lien a été copié.",
    "zprava": "Bonjour, je te recommande les appartements VIVIEN au centre de České Budějovice. Avec ce lien, tu as 5 % de réduction sur ton premier séjour :",
    "poptavkaNadpis": "Nous serons ravis de vous accueillir",
    "poptavkaStitek": "Sur recommandation",
    "poptavkaUvod": "Pour votre premier séjour chez nous, vous avez 5 % de réduction. Choisissez vos dates et nous vous enverrons en général le prix dans l’heure. Nous répondons de 8 h à 20 h.",
    "poptavkaNadpisApartmany": "Quel appartement vous tente ?",
    "poptavkaNadpisOdeslano": "Merci, au plaisir de vous accueillir."
  },
  "it": {
    "nadVas": "Il vostro prossimo soggiorno",
    "nadBlizci": "Per le persone a voi care",
    "otazka": "Conoscete qualcuno a cui piacerebbe stare da noi?",
    "veta1": "Inviate il link: per il primo soggiorno riceverà da noi uno sconto del 5 %.",
    "veta2": "Dopo il suo soggiorno vi accrediteremo il 5 % del prezzo come credito per il vostro prossimo soggiorno.",
    "tlacitko": "Invia il link",
    "zkopirovano": "Il link è stato copiato.",
    "zprava": "Ciao, ti consiglio gli appartamenti VIVIEN nel centro di České Budějovice. Con questo link hai il 5 % di sconto sul primo soggiorno:",
    "poptavkaNadpis": "Saremo felici di accogliervi",
    "poptavkaStitek": "Su consiglio di chi ci conosce",
    "poptavkaUvod": "Per il primo soggiorno da noi avete lo sconto del 5 %. Scegliete le date e di solito entro un’ora vi invieremo il prezzo. Rispondiamo dalle 8 alle 20.",
    "poptavkaNadpisApartmany": "Quale appartamento vi attira?",
    "poptavkaNadpisOdeslano": "Grazie, vi aspettiamo."
  },
  "pt": {
    "nadVas": "A vossa próxima estadia",
    "nadBlizci": "Para as pessoas próximas",
    "otazka": "Conhecem alguém que gostaria de ficar connosco?",
    "veta1": "Enviem-lhe a ligação. Na primeira estadia terá 5 % de desconto.",
    "veta2": "Depois da estadia, creditamos-vos 5 % do preço como crédito para o vosso próximo alojamento.",
    "tlacitko": "Enviar ligação",
    "zkopirovano": "A ligação foi copiada.",
    "zprava": "Olá, deixo-te uma sugestão: os apartamentos VIVIEN no centro de České Budějovice. Com esta ligação tens 5 % de desconto na primeira estadia:",
    "poptavkaNadpis": "Será um prazer receber-vos",
    "poptavkaStitek": "Por recomendação",
    "poptavkaUvod": "Na primeira estadia connosco têm 5 % de desconto. Escolham as datas e normalmente, dentro de uma hora, enviamos o preço. Respondemos das 8h às 20h.",
    "poptavkaNadpisApartmany": "Que apartamento vos atrai?",
    "poptavkaNadpisOdeslano": "Agradecemos, esperamos por vós."
  },
  "sv": {
    "nadVas": "Er nästa vistelse",
    "nadBlizci": "För era nära och kära",
    "otazka": "Känner ni någon som skulle trivas hos oss?",
    "veta1": "Skicka länken. På första vistelsen får de 5 % rabatt av oss.",
    "veta2": "När de har bott hos oss får ni 5 % av priset för deras vistelse som tillgodohavande till er nästa vistelse.",
    "tlacitko": "Skicka länken",
    "zkopirovano": "Länken är kopierad.",
    "zprava": "Hej, ett tips: VIVIEN Apartments i centrala České Budějovice. Med den här länken får du 5 % rabatt på första vistelsen:",
    "poptavkaNadpis": "Varmt välkomna till oss",
    "poptavkaStitek": "Rekommenderad av en vän",
    "poptavkaUvod": "På första vistelsen hos oss får ni 5 % rabatt. Välj datum så skickar vi vanligtvis priset inom en timme. Vi svarar mellan 8 och 20.",
    "poptavkaNadpisApartmany": "Vilken lägenhet lockar er?",
    "poptavkaNadpisOdeslano": "Tack, vi ser fram emot att ha er här."
  },
  "hu": {
    "nadVas": "Az Önök következő tartózkodása",
    "nadBlizci": "Az Önökhöz közel állóknak",
    "otazka": "Ismernek valakit, akinek tetszene nálunk?",
    "veta1": "Küldjék el neki a linket. Az első tartózkodásra 5 % kedvezményt kap tőlünk.",
    "veta2": "Miután nálunk járt, a tartózkodása árának 5 %-át jóváírjuk Önöknek a következő szállásukra.",
    "tlacitko": "Link küldése",
    "zkopirovano": "A linket kimásoltuk.",
    "zprava": "Szia, ajánlom a VIVIEN apartmanokat České Budějovice központjában. Ezzel a linkkel az első tartózkodásra 5 % kedvezményt kapsz:",
    "poptavkaNadpis": "Örömmel köszöntjük Önöket",
    "poptavkaStitek": "Ajánlás alapján",
    "poptavkaUvod": "Az első tartózkodásra nálunk 5 % kedvezmény jár. Válasszanak időpontot, és általában egy órán belül elküldjük az árat. 8 és 20 óra között válaszolunk.",
    "poptavkaNadpisApartmany": "Melyik apartman tetszik Önöknek?",
    "poptavkaNadpisOdeslano": "Köszönjük, várjuk Önöket."
  },
  "da": {
    "nadVas": "Jeres næste ophold",
    "nadBlizci": "Til jeres nærmeste",
    "otazka": "Kender I nogen, der ville trives hos os?",
    "veta1": "Send linket. På første ophold får de 5 % rabat fra os.",
    "veta2": "Når de har boet hos os, får I 5 % af prisen for deres ophold som tilgodehavende til jeres næste ophold.",
    "tlacitko": "Send linket",
    "zkopirovano": "Linket er kopieret.",
    "zprava": "Hej, et tip: VIVIEN Apartments i centrum af České Budějovice. Med dette link får du 5 % rabat på dit første ophold:",
    "poptavkaNadpis": "Vi glæder os til at byde jer velkommen",
    "poptavkaStitek": "Anbefalet af en ven",
    "poptavkaUvod": "På jeres første ophold hos os får I 5 % rabat. Vælg datoer, så sender vi normalt prisen inden for en time. Vi svarer mellem kl. 8 og 20.",
    "poptavkaNadpisApartmany": "Hvilken lejlighed frister jer?",
    "poptavkaNadpisOdeslano": "Tak, vi glæder os til at se jer."
  }
} as Record<
  GuideLang,
  DoporuceniTexty
>;

export function doporuceniTexty(lang: GuideLang): DoporuceniTexty {
  return MAPA[lang] || MAPA.en;
}

export const DOPORUCENI_TEXT_KEYS = ["nadVas","nadBlizci","otazka","veta1","veta2","tlacitko","zkopirovano","zprava","poptavkaNadpis","poptavkaStitek","poptavkaUvod","poptavkaNadpisApartmany","poptavkaNadpisOdeslano"] as const;
