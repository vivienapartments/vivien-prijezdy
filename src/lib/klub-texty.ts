/**
 * Texty stránky /klub (karta klienta). 13 jazyků, vykání.
 */

import { t } from './i18n';
import type { GuideLang } from './types';

type T = Record<GuideLang, string>;

function L(cs: string, en: string, rest: Partial<T> = {}): T {
  return {
    cs,
    en,
    de: rest.de || en,
    pl: rest.pl || en,
    uk: rest.uk || en,
    'zh-Hant': rest['zh-Hant'] || en,
    es: rest.es || en,
    fr: rest.fr || en,
    it: rest.it || en,
    pt: rest.pt || en,
    sv: rest.sv || en,
    hu: rest.hu || en,
    da: rest.da || en,
    fi: rest.fi || en,
  };
}

const KLUB = L('VIVIEN Klub', 'VIVIEN Club', {
  de: 'VIVIEN Club',
  pl: 'VIVIEN Club',
  uk: 'VIVIEN Club',
  'zh-Hant': 'VIVIEN Club',
  es: 'VIVIEN Club',
  fr: 'VIVIEN Club',
  it: 'VIVIEN Club',
  pt: 'VIVIEN Club',
  sv: 'VIVIEN Club',
  hu: 'VIVIEN Club',
  da: 'VIVIEN Club',
  fi: 'VIVIEN Club',
});

const SLEVA = L(
  'Vaše sleva na přímé rezervace: {pct} %',
  'Your discount on direct bookings: {pct} %',
  {
    de: 'Ihr Rabatt auf Direktbuchungen: {pct} %',
    pl: 'Wasz rabat na bezpośrednie rezerwacje: {pct} %',
    uk: 'Ваша знижка на прямі бронювання: {pct} %',
    'zh-Hant': '您的直接預訂折扣：{pct} %',
    es: 'Su descuento en reservas directas: {pct} %',
    fr: 'Votre réduction sur les réservations directes : {pct} %',
    it: 'Il vostro sconto sulle prenotazioni dirette: {pct} %',
    pt: 'O vosso desconto em reservas diretas: {pct} %',
    sv: 'Er rabatt på direkta bokningar: {pct} %',
    hu: 'Az Ön kedvezménye közvetlen foglalásokra: {pct} %',
    da: 'Jeres rabat på direkte bookinger: {pct} %',
    fi: 'Alennuksenne suoriin varauksiin: {pct} %',
  },
);

const DOP_POPIS = L(
  'Doporučitel · doporučujete VIVIEN přátelům a známým.',
  'Referrer · you recommend VIVIEN to friends and colleagues.',
  {
    de: 'Empfehler · Sie empfehlen VIVIEN Freunden und Bekannten.',
    pl: 'Polecający · polecacie VIVIEN przyjaciołom i znajomym.',
    uk: 'Рекомендатель · рекомендуєте VIVIEN друзям і знайомим.',
    'zh-Hant': '推薦人 · 您向親友推薦 VIVIEN。',
    es: 'Recomendador · recomienda VIVIEN a amigos y conocidos.',
    fr: 'Parrain · vous recommandez VIVIEN à vos proches.',
    it: 'Segnalatore · consigliate VIVIEN ad amici e conoscenti.',
    pt: 'Recomendador · recomenda a VIVIEN a amigos e conhecidos.',
    sv: 'Rekommendatör · ni rekommenderar VIVIEN till vänner.',
    hu: 'Ajánló · VIVIEN-t ajánlja barátoknak és ismerősöknek.',
    da: 'Anbefaler · I anbefaler VIVIEN til venner og bekendte.',
    fi: 'Suosittelija · suosittelette VIVIENiä ystäville.',
  },
);

const UTRATA = L('Útrata u nás: {kc}', 'Spent with us: {kc}', {
  de: 'Ausgaben bei uns: {kc}',
  pl: 'Wydatki u nas: {kc}',
  uk: 'Витрати у нас: {kc}',
  'zh-Hant': '您在我們這裡的消費：{kc}',
  es: 'Gasto con nosotros: {kc}',
  fr: 'Dépenses chez nous : {kc}',
  it: 'Spesa da noi: {kc}',
  pt: 'Gasto connosco: {kc}',
  sv: 'Utgifter hos oss: {kc}',
  hu: 'Nálunk költött összeg: {kc}',
  da: 'Forbrug hos os: {kc}',
  fi: 'Kulutuksenne meillä: {kc}',
});

const DO_UROVNE = L(
  'Do úrovně {nazev} ({pct} %) chybí {kc}',
  '{kc} left to reach {nazev} ({pct} %)',
  {
    de: 'Bis Stufe {nazev} ({pct} %) fehlen {kc}',
    pl: 'Do poziomu {nazev} ({pct} %) brakuje {kc}',
    uk: 'До рівня {nazev} ({pct} %) бракує {kc}',
    'zh-Hant': '距離等級 {nazev}（{pct} %）還差 {kc}',
    es: 'Para el nivel {nazev} ({pct} %) faltan {kc}',
    fr: 'Il manque {kc} pour le niveau {nazev} ({pct} %)',
    it: 'Mancano {kc} per il livello {nazev} ({pct} %)',
    pt: 'Faltam {kc} para o nível {nazev} ({pct} %)',
    sv: '{kc} kvar till nivån {nazev} ({pct} %)',
    hu: 'A(z) {nazev} szinthez ({pct} %) még {kc} hiányzik',
    da: '{kc} mangler til niveauet {nazev} ({pct} %)',
    fi: 'Tasoon {nazev} ({pct} %) puuttuu {kc}',
  },
);

const NEJVYSSI = L('Nejvyšší úroveň', 'Highest level', {
  de: 'Höchste Stufe',
  pl: 'Najwyższy poziom',
  uk: 'Найвищий рівень',
  'zh-Hant': '最高等級',
  es: 'Nivel más alto',
  fr: 'Niveau le plus élevé',
  it: 'Livello più alto',
  pt: 'Nível mais alto',
  sv: 'Högsta nivå',
  hu: 'Legmagasabb szint',
  da: 'Højeste niveau',
  fi: 'Korkein taso',
});

const NADCH = L('Nadcházející pobyt', 'Upcoming stay', {
  de: 'Bevorstehender Aufenthalt',
  pl: 'Nadchodzący pobyt',
  uk: 'Найближче перебування',
  'zh-Hant': '即將到來的住宿',
  es: 'Próxima estancia',
  fr: 'Séjour à venir',
  it: 'Soggiorno in arrivo',
  pt: 'Próxima estadia',
  sv: 'Kommande vistelse',
  hu: 'Közelgő tartózkodás',
  da: 'Kommende ophold',
  fi: 'Tuleva majoitus',
});

const PRAVE_BYDLI = L('Právě u nás bydlíte', 'You are staying with us', {
  de: 'Sie wohnen gerade bei uns',
  pl: 'Właśnie u nas mieszkacie',
  uk: 'Саме зараз ви в нас',
  'zh-Hant': '您目前正在入住',
  es: 'Ahora se alojan con nosotros',
  fr: 'Vous séjournez chez nous',
  it: 'State soggiornando da noi',
  pt: 'Está a ficar connosco',
  sv: 'Ni bor hos oss just nu',
  hu: 'Éppen nálunk tartózkodik',
  da: 'I bor hos os lige nu',
  fi: 'Olette juuri majoittumassa meillä',
});

const NADCH_F = L('Nadcházející pobyty', 'Upcoming stays', {
  de: 'Bevorstehende Aufenthalte',
  pl: 'Nadchodzące pobyty',
  uk: 'Найближчі перебування',
  'zh-Hant': '即將到來的住宿',
  es: 'Próximas estancias',
  fr: 'Séjours à venir',
  it: 'Soggiorni in arrivo',
  pt: 'Próximas estadias',
  sv: 'Kommande vistelser',
  hu: 'Közelgő tartózkodások',
  da: 'Kommende ophold',
  fi: 'Tulevat majoitukset',
});

const MUJ_PRUVODCE = L('Můj průvodce', 'My guide', {
  de: 'Mein Führer',
  pl: 'Mój przewodnik',
  uk: 'Мій путівник',
  'zh-Hant': '我的指南',
  es: 'Mi guía',
  fr: 'Mon guide',
  it: 'La mia guida',
  pt: 'O meu guia',
  sv: 'Min guide',
  hu: 'Az útmutatóm',
  da: 'Min guide',
  fi: 'Oppaanne',
});

const MOJE_POBYTY = L('Moje pobyty', 'My stays', {
  de: 'Meine Aufenthalte',
  pl: 'Moje pobyty',
  uk: 'Мої перебування',
  'zh-Hant': '我的住宿',
  es: 'Mis estancias',
  fr: 'Mes séjours',
  it: 'I miei soggiorni',
  pt: 'As minhas estadias',
  sv: 'Mina vistelser',
  hu: 'Tartózkodásaim',
  da: 'Mine ophold',
  fi: 'Majoituksenne',
});

const OBJ_POBYTY = L('Objednané pobyty', 'Booked stays', {
  de: 'Gebuchte Aufenthalte',
  pl: 'Zamówione pobyty',
  uk: 'Замовлені перебування',
  'zh-Hant': '已預訂住宿',
  es: 'Estancias encargadas',
  fr: 'Séjours commandés',
  it: 'Soggiorni ordinati',
  pt: 'Estadias encomendadas',
  sv: 'Beställda vistelser',
  hu: 'Megrendelt tartózkodások',
  da: 'Bestilte ophold',
  fi: 'Tilatut majoitukset',
});

const FAKT = L('Fakturační údaje', 'Billing details', {
  de: 'Rechnungsdaten',
  pl: 'Dane do faktury',
  uk: 'Платіжні дані',
  'zh-Hant': '帳單資料',
  es: 'Datos de facturación',
  fr: 'Coordonnées de facturation',
  it: 'Dati di fatturazione',
  pt: 'Dados de faturação',
  sv: 'Faktureringsuppgifter',
  hu: 'Számlázási adatok',
  da: 'Faktureringsoplysninger',
  fi: 'Laskutustiedot',
});

const FAKT_POZN = L(
  'Fakturu vám pošleme po každém pobytu.',
  'We will send you an invoice after each stay.',
  {
    de: 'Die Rechnung senden wir Ihnen nach jedem Aufenthalt.',
    pl: 'Fakturę wyślemy po każdym pobycie.',
    uk: 'Рахунок надішлемо після кожного перебування.',
    'zh-Hant': '每次住宿後我們會寄上發票。',
    es: 'Le enviaremos la factura después de cada estancia.',
    fr: 'Nous vous enverrons la facture après chaque séjour.',
    it: 'Vi invieremo la fattura dopo ogni soggiorno.',
    pt: 'Enviaremos a fatura após cada estadia.',
    sv: 'Vi skickar fakturan efter varje vistelse.',
    hu: 'A számlát minden tartózkodás után elküldjük.',
    da: 'Vi sender fakturaen efter hvert ophold.',
    fi: 'Lähetämme laskun jokaisen majoituksen jälkeen.',
  },
);

const DOPORUCENI = L('Doporučení', 'Referrals', {
  de: 'Empfehlungen',
  pl: 'Polecenia',
  uk: 'Рекомендації',
  'zh-Hant': '推薦',
  es: 'Recomendaciones',
  fr: 'Parrainages',
  it: 'Segnalazioni',
  pt: 'Recomendações',
  sv: 'Rekommendationer',
  hu: 'Ajánlások',
  da: 'Anbefalinger',
  fi: 'Suosittelut',
});

const MOJE_DOP = L('Moje doporučení', 'My referrals', {
  de: 'Meine Empfehlungen',
  pl: 'Moje polecenia',
  uk: 'Мої рекомендації',
  'zh-Hant': '我的推薦',
  es: 'Mis recomendaciones',
  fr: 'Mes parrainages',
  it: 'Le mie segnalazioni',
  pt: 'As minhas recomendações',
  sv: 'Mina rekommendationer',
  hu: 'Ajánlásaim',
  da: 'Mine anbefalinger',
  fi: 'Suositteluni',
});

const PRATELE_PRIJELI = L('přátelé přijeli', 'friends stayed', {
  de: 'Freunde waren da',
  pl: 'przyjaciele przyjechali',
  uk: 'друзі приїхали',
  'zh-Hant': '好友已入住',
  es: 'amigos se alojaron',
  fr: 'amis sont venus',
  it: 'amici sono arrivati',
  pt: 'amigos ficaram',
  sv: 'vänner bodde här',
  hu: 'barátok érkeztek',
  da: 'venner boede her',
  fi: 'ystäviä majoittui',
});

const VAS_KREDIT = L('váš kredit', 'your credit', {
  de: 'Ihr Guthaben',
  pl: 'Wasze konto',
  uk: 'ваш кредит',
  'zh-Hant': '您的點數',
  es: 'su crédito',
  fr: 'votre crédit',
  it: 'il vostro credito',
  pt: 'o vosso crédito',
  sv: 'er kredit',
  hu: 'az Ön kredite',
  da: 'jeres kredit',
  fi: 'krediittinne',
});

const MUJ_ODKAZ = L('Můj odkaz', 'My link', {
  de: 'Mein Link',
  pl: 'Mój link',
  uk: 'Моє посилання',
  'zh-Hant': '我的連結',
  es: 'Mi enlace',
  fr: 'Mon lien',
  it: 'Il mio link',
  pt: 'O meu link',
  sv: 'Min länk',
  hu: 'Az ajánlólinkem',
  da: 'Mit link',
  fi: 'Linkkinne',
});

const POSLAT_EMAIL = L('Poslat e-mailem', 'Send by e-mail', {
  de: 'Per E-Mail senden',
  pl: 'Wyślij e-mailem',
  uk: 'Надіслати е-поштою',
  'zh-Hant': '用電子郵件傳送',
  es: 'Enviar por correo',
  fr: 'Envoyer par e-mail',
  it: 'Invia per e-mail',
  pt: 'Enviar por e-mail',
  sv: 'Skicka via e-post',
  hu: 'Küldés e-mailben',
  da: 'Send pr. e-mail',
  fi: 'Lähetä sähköpostilla',
});

const POSLAT_WA = L('Poslat přes WhatsApp', 'Send via WhatsApp', {
  de: 'Per WhatsApp senden',
  pl: 'Wyślij przez WhatsApp',
  uk: 'Надіслати через WhatsApp',
  'zh-Hant': '透過 WhatsApp 傳送',
  es: 'Enviar por WhatsApp',
  fr: 'Envoyer via WhatsApp',
  it: 'Invia via WhatsApp',
  pt: 'Enviar pelo WhatsApp',
  sv: 'Skicka via WhatsApp',
  hu: 'Küldés WhatsAppon',
  da: 'Send via WhatsApp',
  fi: 'Lähetä WhatsAppilla',
});

const KOPIE = L('Kopírovat odkaz', 'Copy link', {
  de: 'Link kopieren',
  pl: 'Kopiuj link',
  uk: 'Скопіювати посилання',
  'zh-Hant': '複製連結',
  es: 'Copiar enlace',
  fr: 'Copier le lien',
  it: 'Copia link',
  pt: 'Copiar link',
  sv: 'Kopiera länk',
  hu: 'Link másolása',
  da: 'Kopiér link',
  fi: 'Kopioi linkki',
});

const PRATELE = L('Přátelé', 'Friends', {
  de: 'Freunde',
  pl: 'Przyjaciele',
  uk: 'Друзі',
  'zh-Hant': '好友',
  es: 'Amigos',
  fr: 'Amis',
  it: 'Amici',
  pt: 'Amigos',
  sv: 'Vänner',
  hu: 'Barátok',
  da: 'Venner',
  fi: 'Ystävät',
});

const KREDIT = L('Kredit', 'Credit', {
  de: 'Guthaben',
  pl: 'Konto',
  uk: 'Кредит',
  'zh-Hant': '點數',
  es: 'Crédito',
  fr: 'Crédit',
  it: 'Credito',
  pt: 'Crédito',
  sv: 'Kredit',
  hu: 'Kredit',
  da: 'Kredit',
  fi: 'Krediitti',
});

const CEKA = L('čeká', 'pending', {
  de: 'wartet',
  pl: 'czeka',
  uk: 'очікує',
  'zh-Hant': '待入帳',
  es: 'en espera',
  fr: 'en attente',
  it: 'in attesa',
  pt: 'a aguardar',
  sv: 'väntar',
  hu: 'vár',
  da: 'venter',
  fi: 'odottaa',
});

const K_VYPLATE = L('k výplatě', 'to pay out', {
  de: 'zur Auszahlung',
  pl: 'do wypłaty',
  uk: 'до виплати',
  'zh-Hant': '可提領',
  es: 'a pagar',
  fr: 'à verser',
  it: 'da pagare',
  pt: 'a pagar',
  sv: 'att betala ut',
  hu: 'kifizetésre',
  da: 'til udbetaling',
  fi: 'maksettavaksi',
});

const VYPLACENO = L('vyplaceno', 'paid out', {
  de: 'ausgezahlt',
  pl: 'wypłacono',
  uk: 'виплачено',
  'zh-Hant': '已提領',
  es: 'pagado',
  fr: 'versé',
  it: 'pagato',
  pt: 'pago',
  sv: 'utbetalt',
  hu: 'kifizetve',
  da: 'udbetalt',
  fi: 'maksettu',
});

const POZADAT = L('Požádat o výplatu', 'Request payout', {
  de: 'Auszahlung anfordern',
  pl: 'Poproś o wypłatę',
  uk: 'Попросити виплату',
  'zh-Hant': '申請提領',
  es: 'Pedir el pago',
  fr: 'Demander le versement',
  it: 'Chiedere il pagamento',
  pt: 'Pedir o pagamento',
  sv: 'Begär utbetalning',
  hu: 'Kifizetés kérése',
  da: 'Anmod om udbetaling',
  fi: 'Pyydä maksua',
});

const REZERVOVAT = L('Rezervovat pobyt', 'Book a stay', {
  de: 'Aufenthalt buchen',
  pl: 'Zarezerwuj pobyt',
  uk: 'Забронювати перебування',
  'zh-Hant': '預訂住宿',
  es: 'Reservar estancia',
  fr: 'Réserver un séjour',
  it: 'Prenota un soggiorno',
  pt: 'Reservar estadia',
  sv: 'Boka vistelse',
  hu: 'Tartózkodás foglalása',
  da: 'Book ophold',
  fi: 'Varaa majoitus',
});

const DOPORUCIT = L('Doporučit přátelům', 'Recommend to friends', {
  de: 'Freunden empfehlen',
  pl: 'Poleć przyjaciołom',
  uk: 'Рекомендувати друзям',
  'zh-Hant': '推薦給好友',
  es: 'Recomendar a amigos',
  fr: 'Recommander à des amis',
  it: 'Consiglia ad amici',
  pt: 'Recomendar a amigos',
  sv: 'Rekommendera till vänner',
  hu: 'Ajánlás barátoknak',
  da: 'Anbefal til venner',
  fi: 'Suosittele ystäville',
});

const OBJEDNAT = L('Objednat pobyt pro kolegu', 'Book a stay for a colleague', {
  de: 'Aufenthalt für Kollegen buchen',
  pl: 'Zamów pobyt dla kolegi',
  uk: 'Замовити перебування для колеги',
  'zh-Hant': '為同事預訂住宿',
  es: 'Encargar estancia para un colega',
  fr: 'Commander un séjour pour un collègue',
  it: 'Ordina un soggiorno per un collega',
  pt: 'Encomendar estadia para um colega',
  sv: 'Beställ vistelse för en kollega',
  hu: 'Tartózkodás rendelése kollégának',
  da: 'Bestil ophold til en kollega',
  fi: 'Tilaa majoitus kollegalle',
});

const DOPORUCIT_KRATKE = L('Doporučit', 'Recommend', {
  de: 'Empfehlen',
  pl: 'Poleć',
  uk: 'Рекомендувати',
  'zh-Hant': '推薦',
  es: 'Recomendar',
  fr: 'Recommander',
  it: 'Consiglia',
  pt: 'Recomendar',
  sv: 'Rekommendera',
  hu: 'Ajánlás',
  da: 'Anbefal',
  fi: 'Suosittele',
});

const PRAZDNE_POBYTY = L(
  'Zatím tu nemáte žádný pobyt. Až si rezervujete, uvidíte ho tady.',
  'You have no stays here yet. When you book, it will show up here.',
  {
    de: 'Sie haben hier noch keinen Aufenthalt. Nach der Buchung erscheint er hier.',
    pl: 'Nie macie tu jeszcze żadnego pobytu. Po rezerwacji zobaczycie go tutaj.',
    uk: 'Тут ще немає перебування. Після бронювання воно з’явиться тут.',
    'zh-Hant': '您還沒有住宿紀錄。預訂後會顯示在這裡。',
    es: 'Aún no tiene ninguna estancia aquí. Cuando reserve, la verá aquí.',
    fr: 'Vous n’avez encore aucun séjour ici. Après réservation, il apparaîtra ici.',
    it: 'Non avete ancora soggiorni qui. Dopo la prenotazione li vedrete qui.',
    pt: 'Ainda não tem nenhuma estadia aqui. Depois de reservar, aparece aqui.',
    sv: 'Ni har inga vistelser här ännu. Efter bokning syns de här.',
    hu: 'Itt még nincs tartózkodása. Foglalás után itt jelenik meg.',
    da: 'I har endnu ingen ophold her. Efter booking vises det her.',
    fi: 'Teillä ei ole vielä majoituksia täällä. Varauksen jälkeen ne näkyvät tässä.',
  },
);

const PRAZDNE_PRATELE = L(
  'Zatím tu nejsou žádní přátelé. Pošlete svůj odkaz a uvidíte je tady.',
  'No friends here yet. Share your link and they will appear here.',
  {
    de: 'Noch keine Freunde hier. Teilen Sie Ihren Link, dann erscheinen sie hier.',
    pl: 'Nie ma tu jeszcze przyjaciół. Wyślijcie link, a pojawią się tutaj.',
    uk: 'Друзів поки немає. Надішліть посилання — і вони з’являться тут.',
    'zh-Hant': '還沒有好友。分享您的連結後，他們會出現在這裡。',
    es: 'Aún no hay amigos aquí. Envíe su enlace y aparecerán aquí.',
    fr: 'Pas encore d’amis ici. Envoyez votre lien et ils apparaîtront ici.',
    it: 'Non ci sono ancora amici. Inviate il link e li vedrete qui.',
    pt: 'Ainda não há amigos aqui. Envie o link e eles aparecem aqui.',
    sv: 'Inga vänner här ännu. Dela er länk så syns de här.',
    hu: 'Itt még nincsenek barátok. Küldje el a linket, és itt jelennek meg.',
    da: 'Ingen venner her endnu. Del jeres link, så vises de her.',
    fi: 'Ystäviä ei ole vielä. Jakakaa linkki, niin he näkyvät tässä.',
  },
);

const PRAZDNE_KREDIT = L(
  'Kredit zatím nemáte. Přijede-li někdo přes váš odkaz, uvidíte ho tady.',
  'You have no credit yet. When someone arrives via your link, it will show here.',
  {
    de: 'Noch kein Guthaben. Kommt jemand über Ihren Link, erscheint es hier.',
    pl: 'Nie macie jeszcze konta. Gdy ktoś przyjedzie z Waszego linku, zobaczycie je tutaj.',
    uk: 'Кредиту поки немає. Коли хтось приїде за вашим посиланням, він з’явиться тут.',
    'zh-Hant': '您還沒有點數。有人透過您的連結入住後，會顯示在這裡。',
    es: 'Aún no tiene crédito. Cuando alguien llegue con su enlace, lo verá aquí.',
    fr: 'Pas encore de crédit. Quand quelqu’un viendra via votre lien, il apparaîtra ici.',
    it: 'Non avete ancora credito. Quando qualcuno arriverà dal vostro link, lo vedrete qui.',
    pt: 'Ainda não tem crédito. Quando alguém chegar pelo vosso link, aparece aqui.',
    sv: 'Ingen kredit ännu. När någon kommer via er länk syns den här.',
    hu: 'Még nincs kreditje. Ha valaki az Ön linkjén keresztül érkezik, itt jelenik meg.',
    da: 'Ingen kredit endnu. Når nogen kommer via jeres link, vises den her.',
    fi: 'Krediittiä ei ole vielä. Kun joku saapuu linkillänne, se näkyy tässä.',
  },
);

const ZADNA_KARTA = L(
  'Tuto kartu se nepodařilo otevřít.',
  'This card could not be opened.',
  {
    de: 'Diese Karte ließ sich nicht öffnen.',
    pl: 'Nie udało się otworzyć tej karty.',
    uk: 'Цю картку не вдалося відкрити.',
    'zh-Hant': '無法開啟此卡片。',
    es: 'No se pudo abrir esta tarjeta.',
    fr: 'Cette carte n’a pas pu être ouverte.',
    it: 'Non è stato possibile aprire questa scheda.',
    pt: 'Não foi possível abrir este cartão.',
    sv: 'Det gick inte att öppna det här kortet.',
    hu: 'Ezt a kártyát nem sikerült megnyitni.',
    da: 'Dette kort kunne ikke åbnes.',
    fi: 'Tätä korttia ei voitu avata.',
  },
);

const ZKopieOK = L('Odkaz je ve schránce.', 'Link copied.', {
  de: 'Link kopiert.',
  pl: 'Link skopiowany.',
  uk: 'Посилання скопійовано.',
  'zh-Hant': '已複製連結。',
  es: 'Enlace copiado.',
  fr: 'Lien copié.',
  it: 'Link copiato.',
  pt: 'Link copiado.',
  sv: 'Länken kopierad.',
  hu: 'Link másolva.',
  da: 'Link kopieret.',
  fi: 'Linkki kopioitu.',
});

const VYPLATA_OK = L(
  'Žádost o výplatu bereme na vědomí. Ozveme se vám.',
  'We have noted your payout request. We will get back to you.',
  {
    de: 'Ihre Auszahlungsanfrage haben wir notiert. Wir melden uns.',
    pl: 'Odnotowaliśmy prośbę o wypłatę. Odezwamy się.',
    uk: 'Запит на виплату прийнято. Ми з вами зв’яжемося.',
    'zh-Hant': '我們已記下您的提領申請，會再與您聯絡。',
    es: 'Hemos anotado su solicitud de pago. Nos pondremos en contacto.',
    fr: 'Nous avons noté votre demande de versement. Nous vous recontacterons.',
    it: 'Abbiamo preso nota della richiesta di pagamento. Vi ricontatteremo.',
    pt: 'Registámos o pedido de pagamento. Entraremos em contacto.',
    sv: 'Vi har noterat er utbetalningsbegäran. Vi hör av oss.',
    hu: 'A kifizetési kérelmet rögzítettük. Jelentkezünk.',
    da: 'Vi har noteret jeres udbetalingsanmodning. Vi vender tilbage.',
    fi: 'Maksopyyntönne on kirjattu. Palaamme asiaan.',
  },
);

function fill(tpl: string, map: Record<string, string>): string {
  let s = tpl;
  for (const [k, v] of Object.entries(map)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

export function klubTexty(lang: GuideLang) {
  return {
    klub: t(KLUB, lang),
    sleva: (pct: number) => fill(t(SLEVA, lang), { pct: String(pct) }),
    dopPopis: t(DOP_POPIS, lang),
    utrata: (kc: string) => fill(t(UTRATA, lang), { kc }),
    doUrovne: (nazev: string, pct: number, kc: string) =>
      fill(t(DO_UROVNE, lang), { nazev, pct: String(pct), kc }),
    nejvyssi: t(NEJVYSSI, lang),
    nadchazejici: t(NADCH, lang),
    nadchazejiciFirma: t(NADCH_F, lang),
    praveBydli: t(PRAVE_BYDLI, lang),
    mujPruvodce: t(MUJ_PRUVODCE, lang),
    mojePobyty: t(MOJE_POBYTY, lang),
    objednanePobyty: t(OBJ_POBYTY, lang),
    fakturace: t(FAKT, lang),
    fakturacePozn: t(FAKT_POZN, lang),
    doporuceni: t(DOPORUCENI, lang),
    mojeDoporuceni: t(MOJE_DOP, lang),
    pratelePrijeli: t(PRATELE_PRIJELI, lang),
    vasKredit: t(VAS_KREDIT, lang),
    mujOdkaz: t(MUJ_ODKAZ, lang),
    poslatEmail: t(POSLAT_EMAIL, lang),
    poslatWa: t(POSLAT_WA, lang),
    kopirovat: t(KOPIE, lang),
    pratele: t(PRATELE, lang),
    kredit: t(KREDIT, lang),
    ceka: t(CEKA, lang),
    kVyplate: t(K_VYPLATE, lang),
    vyplaceno: t(VYPLACENO, lang),
    pozadat: t(POZADAT, lang),
    rezervovat: t(REZERVOVAT, lang),
    doporucit: t(DOPORUCIT, lang),
    objednat: t(OBJEDNAT, lang),
    doporucitKratke: t(DOPORUCIT_KRATKE, lang),
    prazdnePobyty: t(PRAZDNE_POBYTY, lang),
    prazdnePratele: t(PRAZDNE_PRATELE, lang),
    prazdneKredit: t(PRAZDNE_KREDIT, lang),
    zadnaKarta: t(ZADNA_KARTA, lang),
    kopieOk: t(ZKopieOK, lang),
    vyplataOk: t(VYPLATA_OK, lang),
  };
}

export type KlubTexty = ReturnType<typeof klubTexty>;
