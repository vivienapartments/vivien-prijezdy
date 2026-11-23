import type { GuideLang } from './types';

export type DoporuceniTexty = {
  nadVas: string;
  nadBlizci: string;
  otazka: string;
  veta1: string;
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
  cs: {
    nadVas: 'Váš další pobyt',
    nadBlizci: 'Pro vaše blízké',
    otazka: 'Kolik ušetří oni, tolik získáte vy',
    veta1:
      'Přátelé mají u nás 5 % na první pobyt. Stejnou částku vám pak připíšeme na váš další pobyt.',
    tlacitko: 'Poslat odkaz',
    zkopirovano: 'Odkaz je zkopírovaný.',
    zprava:
      'Ahoj, posílám tip na apartmány VIVIEN v centru Českých Budějovic. Přes tenhle odkaz máš na první pobyt slevu 5 %:',
    poptavkaNadpis: 'Rádi vás u nás přivítáme',
    poptavkaStitek: 'Přicházíte na doporučení',
    poptavkaUvod:
      'Na první pobyt u nás máte slevu 5 %. Vyberte termín a my vám obvykle do hodiny pošleme cenu. Odpovídáme od 8 do 20 hodin.',
    poptavkaNadpisApartmany: 'Který apartmán vás láká?',
    poptavkaNadpisOdeslano: 'Děkujeme, těšíme se na vás.',
  },
  en: {
    nadVas: 'Your next stay',
    nadBlizci: 'For people close to you',
    otazka: 'They save, you gain the same',
    veta1:
      'Your friends get 5% off their first stay with us. We then add the same amount to your next stay.',
    tlacitko: 'Send the link',
    zkopirovano: 'The link has been copied.',
    zprava:
      'Hi, here is a tip: VIVIEN Apartments in the centre of České Budějovice. With this link you get 5% off your first stay:',
    poptavkaNadpis: 'We look forward to welcoming you',
    poptavkaStitek: 'You come recommended',
    poptavkaUvod:
      'You get 5% off your first stay with us. Choose your dates and we will usually send you the price within an hour. We reply between 8 am and 8 pm.',
    poptavkaNadpisApartmany: 'Which apartment appeals to you?',
    poptavkaNadpisOdeslano: 'Thank you, we look forward to having you.',
  },
  de: {
    nadVas: 'Ihr nächster Aufenthalt',
    nadBlizci: 'Für Ihre Liebsten',
    otazka: 'Was sie sparen, bekommen Sie auch',
    veta1:
      'Ihre Freunde erhalten 5 % auf den ersten Aufenthalt bei uns. Den gleichen Betrag schreiben wir Ihnen für Ihren nächsten Aufenthalt gut.',
    tlacitko: 'Link senden',
    zkopirovano: 'Der Link wurde kopiert.',
    zprava:
      'Hallo, ein Tipp für dich: die VIVIEN Apartments im Zentrum von České Budějovice. Mit diesem Link bekommst du beim ersten Aufenthalt 5 % Rabatt:',
    poptavkaNadpis: 'Wir freuen uns, Sie bei uns zu begrüßen',
    poptavkaStitek: 'Auf Empfehlung',
    poptavkaUvod:
      'Für Ihren ersten Aufenthalt bei uns erhalten Sie 5 % Rabatt. Wählen Sie den Termin, und wir senden Ihnen in der Regel innerhalb einer Stunde den Preis. Wir antworten von 8 bis 20 Uhr.',
    poptavkaNadpisApartmany: 'Welches Apartment spricht Sie an?',
    poptavkaNadpisOdeslano: 'Vielen Dank, wir freuen uns auf Sie.',
  },
  pl: {
    nadVas: 'Wasz kolejny pobyt',
    nadBlizci: 'Dla Waszych bliskich',
    otazka: 'Ta sama kwota dla bliskich i dla Was',
    veta1:
      'Wasi bliscy mają u nas 5 % zniżki na pierwszy pobyt. Tę samą kwotę dopiszemy Wam do kolejnego pobytu.',
    tlacitko: 'Wyślij link',
    zkopirovano: 'Link został skopiowany.',
    zprava:
      'Cześć, mam dla Ciebie polecenie: apartamenty VIVIEN w centrum Czeskich Budziejowic. Z tym linkiem masz na pierwszy pobyt zniżkę 5 %:',
    poptavkaNadpis: 'Chętnie Was u nas przywitamy',
    poptavkaStitek: 'Z polecenia',
    poptavkaUvod:
      'Na pierwszy pobyt u nas macie zniżkę 5 %. Wybierzcie termin, a zwykle w ciągu godziny wyślemy Wam cenę. Odpowiadamy od 8 do 20.',
    poptavkaNadpisApartmany: 'Który apartament Wam się podoba?',
    poptavkaNadpisOdeslano: 'Dziękujemy, czekamy na Was.',
  },
  uk: {
    nadVas: 'Ваше наступне перебування',
    nadBlizci: 'Для ваших близьких',
    otazka: 'Скільки заощадять вони, стільки отримаєте ви',
    veta1:
      'Ваші друзі мають у нас 5 % знижки на перше перебування. Таку саму суму ми зарахуємо вам на наступне перебування.',
    tlacitko: 'Надіслати посилання',
    zkopirovano: 'Посилання скопійовано.',
    zprava:
      'Привіт, раджу апартаменти VIVIEN у центрі Чеських Будейовиць. За цим посиланням маєш знижку 5 % на перше перебування:',
    poptavkaNadpis: 'Будемо раді вітати вас у нас',
    poptavkaStitek: 'За рекомендацією',
    poptavkaUvod:
      'На перше перебування у нас маєте знижку 5 %. Оберіть дати, і ми зазвичай протягом години надішлемо вам ціну. Відповідаємо з 8 до 20 години.',
    poptavkaNadpisApartmany: 'Які апартаменти вам до вподоби?',
    poptavkaNadpisOdeslano: 'Дякуємо, чекаємо на вас.',
  },
  'zh-Hant': {
    nadVas: '您的下次入住',
    nadBlizci: '給您的親友',
    otazka: '他們省多少，您就得多少',
    veta1:
      '您的親友首次入住可享 5% 折扣。我們會將相同金額存入您的帳戶，供您下次入住使用。',
    tlacitko: '傳送連結',
    zkopirovano: '連結已複製。',
    zprava:
      '嗨，推薦你 České Budějovice 市中心的 VIVIEN 公寓。透過這個連結，首次入住可享 5% 折扣：',
    poptavkaNadpis: '期待歡迎您的到來',
    poptavkaStitek: '經親友推薦',
    poptavkaUvod:
      '首次入住可享 5% 折扣。請選擇日期，我們通常會在一小時內傳送價格給您。回覆時間為 8:00 至 20:00。',
    poptavkaNadpisApartmany: '哪一間最吸引您？',
    poptavkaNadpisOdeslano: '謝謝，期待您的到來。',
  },
  es: {
    nadVas: 'Su próxima estancia',
    nadBlizci: 'Para sus seres queridos',
    otazka: 'El mismo ahorro, también para ustedes',
    veta1:
      'Quien venga de su parte tiene un 5 % de descuento en su primera estancia. La misma cantidad se la abonamos para su próxima estancia.',
    tlacitko: 'Enviar enlace',
    zkopirovano: 'El enlace se ha copiado.',
    zprava:
      'Hola, te paso una recomendación: los apartamentos VIVIEN en el centro de České Budějovice. Con este enlace tienes un 5 % de descuento en tu primera estancia:',
    poptavkaNadpis: 'Nos alegrará darles la bienvenida',
    poptavkaStitek: 'Llegan por recomendación',
    poptavkaUvod:
      'En su primera estancia tienen un 5 % de descuento. Elijan las fechas y normalmente en una hora les enviaremos el precio. Respondemos de 8 a 20 h.',
    poptavkaNadpisApartmany: '¿Qué apartamento les atrae?',
    poptavkaNadpisOdeslano: 'Gracias, les esperamos con ilusión.',
  },
  fr: {
    nadVas: 'Votre prochain séjour',
    nadBlizci: 'Pour vos proches',
    otazka: 'Autant pour vos proches que pour vous',
    veta1:
      'Vos proches bénéficient de 5 % sur leur premier séjour. Nous vous créditons le même montant pour votre prochain séjour.',
    tlacitko: 'Envoyer le lien',
    zkopirovano: 'Le lien a été copié.',
    zprava:
      'Bonjour, je te recommande les appartements VIVIEN au centre de České Budějovice. Avec ce lien, tu as 5 % de réduction sur ton premier séjour :',
    poptavkaNadpis: 'Nous serons ravis de vous accueillir',
    poptavkaStitek: 'Sur recommandation',
    poptavkaUvod:
      'Pour votre premier séjour chez nous, vous avez 5 % de réduction. Choisissez vos dates et nous vous enverrons en général le prix dans l’heure. Nous répondons de 8 h à 20 h.',
    poptavkaNadpisApartmany: 'Quel appartement vous tente ?',
    poptavkaNadpisOdeslano: 'Merci, au plaisir de vous accueillir.',
  },
  it: {
    nadVas: 'Il vostro prossimo soggiorno',
    nadBlizci: 'Per le persone a voi care',
    otazka: 'Quanto risparmiano loro, tanto guadagnate voi',
    veta1:
      'Le persone a voi care hanno il 5 % di sconto sul primo soggiorno. Lo stesso importo ve lo accreditiamo per il vostro prossimo soggiorno.',
    tlacitko: 'Invia il link',
    zkopirovano: 'Il link è stato copiato.',
    zprava:
      'Ciao, ti consiglio gli appartamenti VIVIEN nel centro di České Budějovice. Con questo link hai il 5 % di sconto sul primo soggiorno:',
    poptavkaNadpis: 'Saremo felici di accogliervi',
    poptavkaStitek: 'Su consiglio di chi ci conosce',
    poptavkaUvod:
      'Per il primo soggiorno da noi avete lo sconto del 5 %. Scegliete le date e di solito entro un’ora vi invieremo il prezzo. Rispondiamo dalle 8 alle 20.',
    poptavkaNadpisApartmany: 'Quale appartamento vi attira?',
    poptavkaNadpisOdeslano: 'Grazie, vi aspettiamo.',
  },
  pt: {
    nadVas: 'A vossa próxima estadia',
    nadBlizci: 'Para as pessoas próximas',
    otazka: 'A mesma poupança, também para vocês',
    veta1:
      'As pessoas próximas têm 5 % de desconto na primeira estadia. O mesmo valor fica creditado para a vossa próxima estadia.',
    tlacitko: 'Enviar ligação',
    zkopirovano: 'A ligação foi copiada.',
    zprava:
      'Olá, deixo-te uma sugestão: os apartamentos VIVIEN no centro de České Budějovice. Com esta ligação tens 5 % de desconto na primeira estadia:',
    poptavkaNadpis: 'Será um prazer receber-vos',
    poptavkaStitek: 'Por recomendação',
    poptavkaUvod:
      'Na primeira estadia connosco têm 5 % de desconto. Escolham as datas e normalmente, dentro de uma hora, enviamos o preço. Respondemos das 8h às 20h.',
    poptavkaNadpisApartmany: 'Que apartamento vos atrai?',
    poptavkaNadpisOdeslano: 'Agradecemos, esperamos por vós.',
  },
  sv: {
    nadVas: 'Er nästa vistelse',
    nadBlizci: 'För era nära och kära',
    otazka: 'Det de sparar får ni också',
    veta1:
      'Era vänner får 5 % rabatt på första vistelsen hos oss. Samma belopp får ni sedan till er nästa vistelse.',
    tlacitko: 'Skicka länken',
    zkopirovano: 'Länken är kopierad.',
    zprava:
      'Hej, ett tips: VIVIEN Apartments i centrala České Budějovice. Med den här länken får du 5 % rabatt på första vistelsen:',
    poptavkaNadpis: 'Varmt välkomna till oss',
    poptavkaStitek: 'Rekommenderad av en vän',
    poptavkaUvod:
      'På första vistelsen hos oss får ni 5 % rabatt. Välj datum så skickar vi vanligtvis priset inom en timme. Vi svarar mellan 8 och 20.',
    poptavkaNadpisApartmany: 'Vilken lägenhet lockar er?',
    poptavkaNadpisOdeslano: 'Tack, vi ser fram emot att ha er här.',
  },
  hu: {
    nadVas: 'Az Önök következő tartózkodása',
    nadBlizci: 'Az Önökhöz közel állóknak',
    otazka: 'Amennyit ők megtakarítanak, annyit kapnak Önök',
    veta1:
      'Ismerőseik az első tartózkodásra 5 % kedvezményt kapnak. Ugyanekkora összeget jóváírunk Önöknek a következő szállásukra.',
    tlacitko: 'Link küldése',
    zkopirovano: 'A linket kimásoltuk.',
    zprava:
      'Szia, ajánlom a VIVIEN apartmanokat České Budějovice központjában. Ezzel a linkkel az első tartózkodásra 5 % kedvezményt kapsz:',
    poptavkaNadpis: 'Örömmel köszöntjük Önöket',
    poptavkaStitek: 'Ajánlás alapján',
    poptavkaUvod:
      'Az első tartózkodásra nálunk 5 % kedvezmény jár. Válasszanak időpontot, és általában egy órán belül elküldjük az árat. 8 és 20 óra között válaszolunk.',
    poptavkaNadpisApartmany: 'Melyik apartman tetszik Önöknek?',
    poptavkaNadpisOdeslano: 'Köszönjük, várjuk Önöket.',
  },
  da: {
    nadVas: 'Jeres næste ophold',
    nadBlizci: 'Til jeres nærmeste',
    otazka: 'Det, de sparer, får I også',
    veta1:
      'Jeres venner får 5 % rabat på første ophold hos os. Samme beløb får I derefter til jeres næste ophold.',
    tlacitko: 'Send linket',
    zkopirovano: 'Linket er kopieret.',
    zprava:
      'Hej, et tip: VIVIEN Apartments i centrum af České Budějovice. Med dette link får du 5 % rabat på dit første ophold:',
    poptavkaNadpis: 'Vi glæder os til at byde jer velkommen',
    poptavkaStitek: 'Anbefalet af en ven',
    poptavkaUvod:
      'På jeres første ophold hos os får I 5 % rabat. Vælg datoer, så sender vi normalt prisen inden for en time. Vi svarer mellem kl. 8 og 20.',
    poptavkaNadpisApartmany: 'Hvilken lejlighed frister jer?',
    poptavkaNadpisOdeslano: 'Tak, vi glæder os til at se jer.',
  },
  fi: {
    nadVas: 'Your next stay',
    nadBlizci: 'For people close to you',
    otazka: 'They save, you gain the same',
    veta1:
      'Your friends get 5% off their first stay with us. We then add the same amount to your next stay.',
    tlacitko: 'Send the link',
    zkopirovano: 'The link has been copied.',
    zprava:
      'Hi, here is a tip: VIVIEN Apartments in the centre of České Budějovice. With this link you get 5% off your first stay:',
    poptavkaNadpis: 'We look forward to welcoming you',
    poptavkaStitek: 'You come recommended',
    poptavkaUvod:
      'You get 5% off your first stay with us. Choose your dates and we will usually send you the price within an hour. We reply between 8 am and 8 pm.',
    poptavkaNadpisApartmany: 'Which apartment appeals to you?',
    poptavkaNadpisOdeslano: 'Thank you, we look forward to having you.',
  },
} as Record<GuideLang, DoporuceniTexty>;

export function doporuceniTexty(lang: GuideLang): DoporuceniTexty {
  return MAPA[lang] || MAPA.en;
}

export const DOPORUCENI_TEXT_KEYS = [
  'nadVas',
  'nadBlizci',
  'otazka',
  'veta1',
  'tlacitko',
  'zkopirovano',
  'zprava',
  'poptavkaNadpis',
  'poptavkaStitek',
  'poptavkaUvod',
  'poptavkaNadpisApartmany',
  'poptavkaNadpisOdeslano',
] as const;
