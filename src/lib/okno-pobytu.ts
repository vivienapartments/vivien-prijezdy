import {
  MEZERA_PO_ODJEZDU_MIN,
  MEZERA_PRED_PRIJEZDEM_MIN,
  OBJEDNAT_POKUSU,
  ODJEZD_KDYZ_CAS_NEZNAMY,
  ODJEZD_NEJPOZDEJI,
  ODJEZD_STANDARD,
  OKNO_KC,
  PRIJEZD_NEJDRIV,
  PRIJEZD_STANDARD,
  PRIPRAVENO_PRED_MIN,
  UKLID_MIN,
} from './constants';
import { maRucni } from './rucni-pole';
import type { RezervaceRecord, ZadostOkna } from './store';
import { GUIDE_LANGS, type GuideLang } from './types';

export type HostOkna = {
  rezervace: string;
  apartman: string | null;
  prijezd: string | null;
  odjezd: string | null;
  stav: string;
  casOdjezdu: string | null;
  casPrijezdu: string | null;
  uklizenoKdy: string | null;
  predano: string | null;
  jmeno: string | null;
  zadostPrijezd: ZadostOkna | null;
};

type Vety = {
  cekaPrijezd: string;
  cekaOdjezd: string;
  cekaPripraveny: string;
  cekaUklid: string;
  potvrzenoPrijezd: string;
  potvrzenoOdjezd: string;
  kratcePrijezd: string;
  kratceOdjezd: string;
  nelzePrijezd: string;
  nelzeOdjezd: string;
  zeleny: string;
  pozadat: string;
  sekce: string;
  cenik: string;
  emailVeta: string;
  emailTlacitko: string;
  odjezdNabidka: string;
  pripravenoUvod: string;
  tlacitkoDrive: string;
  tesime: string;
  podpis: string;
  popisekDrive: string;
  popisekOdjezd: string;
  nesedi: string;
  zatim: string;
  blok: string;
  odeslat: string;
  zrusit: string;
  stavCeka: string;
  stavPotvrzeno: string;
  stavNelze: string;
  predmet: string;
};

const VETY: Record<GuideLang, Vety> = {
  cs: {
    cekaPrijezd: 'Žádost o dřívější příjezd ve {cas} jsme dostali. Potvrdíme vám ji co nejdřív.',
    cekaOdjezd: 'Žádost o pozdější odjezd ve {cas} jsme dostali. Potvrdíme vám ji co nejdřív.',
    cekaPripraveny: 'Dřívější příjezd ve {cas} jsme dostali. Potvrdíme vám ho, jakmile bude apartmán připravený.',
    cekaUklid: 'Žádost máme. Potvrdíme vám ji v den příjezdu, jakmile bude apartmán uklizený.',
    potvrzenoPrijezd: 'Hotovo, těšíme se na vás ve {cas}. Příplatek {kc} Kč vyrovnáme při předání.',
    potvrzenoOdjezd: 'Hotovo, odjezd ve {cas} platí. Příplatek {kc} Kč vyrovnáme při převzetí apartmánu.',
    kratcePrijezd: 'Dřívější příjezd ve {cas} potvrzen',
    kratceOdjezd: 'Pozdější odjezd ve {cas} potvrzen',
    nelzePrijezd: 'Tentokrát to bohužel nejde. Těšíme se na vás od 14:00.',
    nelzeOdjezd: 'Tentokrát to bohužel nejde. Apartmán uvolněte do 10:00.',
    zeleny: 'Váš apartmán je už připravený. Pokud chcete přijet dřív, vyberte si čas. Za každou půlhodinu před 14:00 účtujeme 75 Kč.',
    pozadat: 'Požádat',
    sekce: 'Dřívější příjezd a pozdější odjezd',
    cenik: 'Za každou započatou půlhodinu účtujeme 75 Kč. Příjezd je možný nejdřív v 11:00, odjezd nejpozději ve 14:00. Platí to až po našem potvrzení.',
    emailVeta: 'Chcete přijet dřív nebo odjet později? Objednejte si to rovnou tady. Za každou půlhodinu účtujeme 75 Kč.',
    emailTlacitko: 'Chci přijet dřív / odjet později',
    odjezdNabidka: 'Chcete odjet později? Vyberte si čas v průvodci. Za každou půlhodinu po 10:00 účtujeme 75 Kč, nejpozději do 14:00.',
    pripravenoUvod: 'Dobrý den, váš apartmán je už uklizený a připravený. Pokud chcete přijet dřív, vyberte si čas tady. Za každou půlhodinu před 14:00 účtujeme 75 Kč.',
    tlacitkoDrive: 'Chci přijet dřív',
    tesime: 'Moc se na vás těšíme.',
    podpis: 'Nikol a rodina VIVIEN',
    popisekDrive: '{cas} · dřívější příjezd +{kc} Kč (potvrdíme)',
    popisekOdjezd: '{cas} · pozdější odjezd +{kc} Kč (potvrdíme)',
    nesedi: 'Číslo rezervace nebo příjmení nesedí.',
    zatim: 'Vaši rezervaci zatím nevidíme. Zkuste to prosím za pár minut, nebo nám napište na',
    blok: 'Zkuste to prosím za hodinu.',
    odeslat: 'Odeslat žádost',
    zrusit: 'Zrušit žádost',
    stavCeka: 'Čekáme na potvrzení',
    stavPotvrzeno: 'Potvrzeno',
    stavNelze: 'Nelze',
    predmet: 'VIVIEN · Apartmán je připravený',
  },
  en: {
    cekaPrijezd: 'We have your request for an earlier arrival at {cas}. We will confirm it as soon as we can.',
    cekaOdjezd: 'We have your request for a later departure at {cas}. We will confirm it as soon as we can.',
    cekaPripraveny: 'We have your earlier arrival at {cas}. We will confirm it once the apartment is ready.',
    cekaUklid: 'We have your request. We will confirm it on arrival day, once the apartment is cleaned.',
    potvrzenoPrijezd: 'Done, we look forward to seeing you at {cas}. We will settle the {kc} Kč surcharge at handover.',
    potvrzenoOdjezd: 'Done, departure at {cas} is confirmed. We will settle the {kc} Kč surcharge when we take over the apartment.',
    kratcePrijezd: 'Earlier arrival at {cas} confirmed',
    kratceOdjezd: 'Later departure at {cas} confirmed',
    nelzePrijezd: 'This time it is not possible. We look forward to seeing you from 14:00.',
    nelzeOdjezd: 'This time it is not possible. Please leave the apartment by 10:00.',
    zeleny: 'Your apartment is already ready. If you would like to arrive earlier, choose a time. We charge 75 Kč for every half hour before 14:00.',
    pozadat: 'Request',
    sekce: 'Earlier arrival and later departure',
    cenik: 'We charge 75 Kč for every started half hour. Arrival is possible from 11:00 at the earliest, departure until 14:00 at the latest. It applies only after we confirm it.',
    emailVeta: 'Would you like to arrive earlier or leave later? Order it here. We charge 75 Kč for every half hour.',
    emailTlacitko: 'I want to arrive earlier / leave later',
    odjezdNabidka: 'Would you like to leave later? Choose a time in the guide. We charge 75 Kč for every half hour after 10:00, until 14:00 at the latest.',
    pripravenoUvod: 'Hello, your apartment is already cleaned and ready. If you would like to arrive earlier, choose a time here. We charge 75 Kč for every half hour before 14:00.',
    tlacitkoDrive: 'I want to arrive earlier',
    tesime: 'We look forward to seeing you.',
    podpis: 'Nikol and the VIVIEN family',
    popisekDrive: '{cas} · earlier arrival +{kc} Kč (we will confirm)',
    popisekOdjezd: '{cas} · later departure +{kc} Kč (we will confirm)',
    nesedi: 'The reservation number or the surname does not match.',
    zatim: 'We cannot see your reservation yet. Please try again in a few minutes, or write to us at',
    blok: 'Please try again in an hour.',
    odeslat: 'Send request',
    zrusit: 'Cancel request',
    stavCeka: 'Waiting for confirmation',
    stavPotvrzeno: 'Confirmed',
    stavNelze: 'Not possible',
    predmet: 'VIVIEN · The apartment is ready',
  },
  de: {
    cekaPrijezd: 'Wir haben Ihre Bitte um eine frühere Anreise um {cas}. Wir bestätigen sie so bald wie möglich.',
    cekaOdjezd: 'Wir haben Ihre Bitte um eine spätere Abreise um {cas}. Wir bestätigen sie so bald wie möglich.',
    cekaPripraveny: 'Ihre frühere Anreise um {cas} haben wir. Wir bestätigen sie, sobald das Apartment bereit ist.',
    cekaUklid: 'Wir haben Ihre Bitte. Wir bestätigen sie am Anreisetag, sobald das Apartment gereinigt ist.',
    potvrzenoPrijezd: 'Erledigt, wir freuen uns auf Sie um {cas}. Den Zuschlag von {kc} Kč rechnen wir bei der Übergabe ab.',
    potvrzenoOdjezd: 'Erledigt, die Abreise um {cas} gilt. Den Zuschlag von {kc} Kč rechnen wir bei der Rücknahme des Apartments ab.',
    kratcePrijezd: 'Frühere Anreise um {cas} bestätigt',
    kratceOdjezd: 'Spätere Abreise um {cas} bestätigt',
    nelzePrijezd: 'Diesmal geht es leider nicht. Wir freuen uns auf Sie ab 14:00.',
    nelzeOdjezd: 'Diesmal geht es leider nicht. Bitte geben Sie das Apartment bis 10:00 frei.',
    zeleny: 'Ihr Apartment ist schon bereit. Wenn Sie früher anreisen möchten, wählen Sie eine Zeit. Für jede halbe Stunde vor 14:00 berechnen wir 75 Kč.',
    pozadat: 'Anfragen',
    sekce: 'Frühere Anreise und spätere Abreise',
    cenik: 'Für jede angefangene halbe Stunde berechnen wir 75 Kč. Anreise frühestens um 11:00, Abreise spätestens um 14:00. Es gilt erst nach unserer Bestätigung.',
    emailVeta: 'Möchten Sie früher anreisen oder später abreisen? Bestellen Sie es direkt hier. Für jede halbe Stunde berechnen wir 75 Kč.',
    emailTlacitko: 'Ich möchte früher anreisen / später abreisen',
    odjezdNabidka: 'Möchten Sie später abreisen? Wählen Sie eine Zeit im Guide. Für jede halbe Stunde nach 10:00 berechnen wir 75 Kč, spätestens bis 14:00.',
    pripravenoUvod: 'Guten Tag, Ihr Apartment ist schon gereinigt und bereit. Wenn Sie früher anreisen möchten, wählen Sie hier eine Zeit. Für jede halbe Stunde vor 14:00 berechnen wir 75 Kč.',
    tlacitkoDrive: 'Ich möchte früher anreisen',
    tesime: 'Wir freuen uns auf Sie.',
    podpis: 'Nikol und die Familie VIVIEN',
    popisekDrive: '{cas} · frühere Anreise +{kc} Kč (wir bestätigen)',
    popisekOdjezd: '{cas} · spätere Abreise +{kc} Kč (wir bestätigen)',
    nesedi: 'Reservierungsnummer oder Nachname stimmt nicht.',
    zatim: 'Ihre Reservierung sehen wir noch nicht. Versuchen Sie es bitte in ein paar Minuten, oder schreiben Sie uns an',
    blok: 'Versuchen Sie es bitte in einer Stunde.',
    odeslat: 'Anfrage senden',
    zrusit: 'Anfrage zurücknehmen',
    stavCeka: 'Wir warten auf die Bestätigung',
    stavPotvrzeno: 'Bestätigt',
    stavNelze: 'Geht nicht',
    predmet: 'VIVIEN · Das Apartment ist bereit',
  },
  pl: {
    cekaPrijezd: 'Mamy prośbę o wcześniejszy przyjazd o {cas}. Potwierdzimy ją jak najszybciej.',
    cekaOdjezd: 'Mamy prośbę o późniejszy wyjazd o {cas}. Potwierdzimy ją jak najszybciej.',
    cekaPripraveny: 'Wcześniejszy przyjazd o {cas} mamy. Potwierdzimy go, gdy apartament będzie gotowy.',
    cekaUklid: 'Mamy prośbę. Potwierdzimy ją w dniu przyjazdu, gdy apartament będzie posprzątany.',
    potvrzenoPrijezd: 'Gotowe, czekamy na Was o {cas}. Dopłatę {kc} Kč rozliczymy przy przekazaniu.',
    potvrzenoOdjezd: 'Gotowe, wyjazd o {cas} jest potwierdzony. Dopłatę {kc} Kč rozliczymy przy odbiorze apartamentu.',
    kratcePrijezd: 'Wcześniejszy przyjazd o {cas} potwierdzony',
    kratceOdjezd: 'Późniejszy wyjazd o {cas} potwierdzony',
    nelzePrijezd: 'Tym razem się nie da. Czekamy na Was od 14:00.',
    nelzeOdjezd: 'Tym razem się nie da. Apartament prosimy zwolnić do 10:00.',
    zeleny: 'Apartament jest już gotowy. Jeśli chcecie przyjechać wcześniej, wybierzcie godzinę. Za każde pół godziny przed 14:00 liczymy 75 Kč.',
    pozadat: 'Poprosić',
    sekce: 'Wcześniejszy przyjazd i późniejszy wyjazd',
    cenik: 'Za każde rozpoczęte pół godziny liczymy 75 Kč. Przyjazd najwcześniej o 11:00, wyjazd najpóźniej o 14:00. Obowiązuje to dopiero po naszym potwierdzeniu.',
    emailVeta: 'Chcecie przyjechać wcześniej albo wyjechać później? Zamówcie to od razu tutaj. Za każde pół godziny liczymy 75 Kč.',
    emailTlacitko: 'Chcę przyjechać wcześniej / wyjechać później',
    odjezdNabidka: 'Chcecie wyjechać później? Wybierzcie godzinę w przewodniku. Za każde pół godziny po 10:00 liczymy 75 Kč, najpóźniej do 14:00.',
    pripravenoUvod: 'Dzień dobry, apartament jest już posprzątany i gotowy. Jeśli chcecie przyjechać wcześniej, wybierzcie godzinę tutaj. Za każde pół godziny przed 14:00 liczymy 75 Kč.',
    tlacitkoDrive: 'Chcę przyjechać wcześniej',
    tesime: 'Czekamy na Was.',
    podpis: 'Nikol i rodzina VIVIEN',
    popisekDrive: '{cas} · wcześniejszy przyjazd +{kc} Kč (potwierdzimy)',
    popisekOdjezd: '{cas} · późniejszy wyjazd +{kc} Kč (potwierdzimy)',
    nesedi: 'Numer rezerwacji albo nazwisko się nie zgadza.',
    zatim: 'Nie widzimy jeszcze rezerwacji. Spróbujcie za kilka minut albo napiszcie do nas na',
    blok: 'Spróbujcie proszę za godzinę.',
    odeslat: 'Wyślij prośbę',
    zrusit: 'Anuluj prośbę',
    stavCeka: 'Czekamy na potwierdzenie',
    stavPotvrzeno: 'Potwierdzone',
    stavNelze: 'Nie da się',
    predmet: 'VIVIEN · Apartament jest gotowy',
  },
  uk: {
    cekaPrijezd: 'Ми отримали прохання про ранній приїзд о {cas}. Підтвердимо його якнайшвидше.',
    cekaOdjezd: 'Ми отримали прохання про пізніший виїзд о {cas}. Підтвердимо його якнайшвидше.',
    cekaPripraveny: 'Ранній приїзд о {cas} ми отримали. Підтвердимо його, щойно апартаменти будуть готові.',
    cekaUklid: 'Прохання маємо. Підтвердимо його в день приїзду, щойно апартаменти приберуть.',
    potvrzenoPrijezd: 'Готово, чекаємо на вас о {cas}. Доплату {kc} Kč розрахуємо під час передачі.',
    potvrzenoOdjezd: 'Готово, виїзд о {cas} підтверджено. Доплату {kc} Kč розрахуємо під час приймання апартаментів.',
    kratcePrijezd: 'Ранній приїзд о {cas} підтверджено',
    kratceOdjezd: 'Пізніший виїзд о {cas} підтверджено',
    nelzePrijezd: 'Цього разу не вийде. Чекаємо на вас від 14:00.',
    nelzeOdjezd: 'Цього разу не вийде. Звільніть апартаменти до 10:00.',
    zeleny: 'Ваші апартаменти вже готові. Якщо хочете приїхати раніше, оберіть час. За кожні пів години до 14:00 беремо 75 Kč.',
    pozadat: 'Попросити',
    sekce: 'Ранній приїзд і пізніший виїзд',
    cenik: 'За кожні розпочаті пів години беремо 75 Kč. Приїзд найраніше об 11:00, виїзд найпізніше о 14:00. Це діє лише після нашого підтвердження.',
    emailVeta: 'Хочете приїхати раніше або виїхати пізніше? Замовте це одразу тут. За кожні пів години беремо 75 Kč.',
    emailTlacitko: 'Хочу приїхати раніше / виїхати пізніше',
    odjezdNabidka: 'Хочете виїхати пізніше? Оберіть час у путівнику. За кожні пів години після 10:00 беремо 75 Kč, найпізніше до 14:00.',
    pripravenoUvod: 'Добрий день, ваші апартаменти вже прибрані і готові. Якщо хочете приїхати раніше, оберіть час тут. За кожні пів години до 14:00 беремо 75 Kč.',
    tlacitkoDrive: 'Хочу приїхати раніше',
    tesime: 'Дуже на вас чекаємо.',
    podpis: 'Ніколь і родина VIVIEN',
    popisekDrive: '{cas} · ранній приїзд +{kc} Kč (підтвердимо)',
    popisekOdjezd: '{cas} · пізніший виїзд +{kc} Kč (підтвердимо)',
    nesedi: 'Номер бронювання або прізвище не збігається.',
    zatim: 'Ваше бронювання ми ще не бачимо. Спробуйте за кілька хвилин або напишіть нам на',
    blok: 'Спробуйте, будь ласка, за годину.',
    odeslat: 'Надіслати прохання',
    zrusit: 'Скасувати прохання',
    stavCeka: 'Чекаємо на підтвердження',
    stavPotvrzeno: 'Підтверджено',
    stavNelze: 'Не вийде',
    predmet: 'VIVIEN · Апартаменти готові',
  },
  'zh-Hant': {
    cekaPrijezd: '我們已收到您 {cas} 提早入住的申請。我們會盡快確認。',
    cekaOdjezd: '我們已收到您 {cas} 延遲退房的申請。我們會盡快確認。',
    cekaPripraveny: '我們已收到您 {cas} 的提早入住。公寓準備好後就會確認。',
    cekaUklid: '申請已收到。入住當天、公寓打掃完成後我們會確認。',
    potvrzenoPrijezd: '好了，我們 {cas} 等您。加價 {kc} Kč 在交接時結清。',
    potvrzenoOdjezd: '好了，{cas} 退房已確認。加價 {kc} Kč 在收回公寓時結清。',
    kratcePrijezd: '{cas} 提早入住已確認',
    kratceOdjezd: '{cas} 延遲退房已確認',
    nelzePrijezd: '這次沒辦法。我們 14:00 起等您。',
    nelzeOdjezd: '這次沒辦法。請在 10:00 前騰出公寓。',
    zeleny: '您的公寓已經準備好。若想提早入住，請選時間。14:00 前每半小時收費 75 Kč。',
    pozadat: '提出申請',
    sekce: '提早入住與延遲退房',
    cenik: '每開始半小時收費 75 Kč。最早 11:00 入住，最晚 14:00 退房。經我們確認後才生效。',
    emailVeta: '想提早入住或延遲退房嗎？請在這裡直接預約。每半小時收費 75 Kč。',
    emailTlacitko: '我要提早入住 / 延遲退房',
    odjezdNabidka: '想延遲退房嗎？請在指南裡選時間。10:00 後每半小時收費 75 Kč，最晚到 14:00。',
    pripravenoUvod: '您好，您的公寓已經打掃好、可以入住。若想提早來，請在這裡選時間。14:00 前每半小時收費 75 Kč。',
    tlacitkoDrive: '我要提早入住',
    tesime: '我們很期待見到您。',
    podpis: 'Nikol 與 VIVIEN 全家',
    popisekDrive: '{cas} · 提早入住 +{kc} Kč（我們會確認）',
    popisekOdjezd: '{cas} · 延遲退房 +{kc} Kč（我們會確認）',
    nesedi: '預訂編號或姓氏不符。',
    zatim: '我們還沒看到您的預訂。請過幾分鐘再試，或寫信到',
    blok: '請一小時後再試。',
    odeslat: '送出申請',
    zrusit: '取消申請',
    stavCeka: '等待確認',
    stavPotvrzeno: '已確認',
    stavNelze: '無法安排',
    predmet: 'VIVIEN · 公寓已準備好',
  },
  es: {
    cekaPrijezd: 'Tenemos su solicitud de llegada anticipada a las {cas}. La confirmaremos lo antes posible.',
    cekaOdjezd: 'Tenemos su solicitud de salida más tarde a las {cas}. La confirmaremos lo antes posible.',
    cekaPripraveny: 'Tenemos su llegada anticipada a las {cas}. La confirmaremos en cuanto el apartamento esté listo.',
    cekaUklid: 'Tenemos la solicitud. La confirmaremos el día de la llegada, en cuanto el apartamento esté limpio.',
    potvrzenoPrijezd: 'Listo, los esperamos a las {cas}. El suplemento de {kc} Kč lo saldamos en la entrega.',
    potvrzenoOdjezd: 'Listo, la salida a las {cas} queda confirmada. El suplemento de {kc} Kč lo saldamos al recoger el apartamento.',
    kratcePrijezd: 'Llegada anticipada a las {cas} confirmada',
    kratceOdjezd: 'Salida más tarde a las {cas} confirmada',
    nelzePrijezd: 'Esta vez no es posible. Los esperamos a partir de las 14:00.',
    nelzeOdjezd: 'Esta vez no es posible. Dejen el apartamento libre antes de las 10:00.',
    zeleny: 'Su apartamento ya está listo. Si quieren llegar antes, elijan una hora. Cobramos 75 Kč por cada media hora antes de las 14:00.',
    pozadat: 'Solicitar',
    sekce: 'Llegada anticipada y salida más tarde',
    cenik: 'Cobramos 75 Kč por cada media hora empezada. La llegada es como muy pronto a las 11:00 y la salida como muy tarde a las 14:00. Vale solo después de nuestra confirmación.',
    emailVeta: '¿Quieren llegar antes o salir más tarde? Pídanlo aquí mismo. Cobramos 75 Kč por cada media hora.',
    emailTlacitko: 'Quiero llegar antes / salir más tarde',
    odjezdNabidka: '¿Quieren salir más tarde? Elijan una hora en la guía. Cobramos 75 Kč por cada media hora después de las 10:00, como muy tarde hasta las 14:00.',
    pripravenoUvod: 'Buenos días, su apartamento ya está limpio y listo. Si quieren llegar antes, elijan una hora aquí. Cobramos 75 Kč por cada media hora antes de las 14:00.',
    tlacitkoDrive: 'Quiero llegar antes',
    tesime: 'Los esperamos con muchas ganas.',
    podpis: 'Nikol y la familia VIVIEN',
    popisekDrive: '{cas} · llegada anticipada +{kc} Kč (lo confirmaremos)',
    popisekOdjezd: '{cas} · salida más tarde +{kc} Kč (lo confirmaremos)',
    nesedi: 'El número de reserva o el apellido no coincide.',
    zatim: 'Todavía no vemos su reserva. Inténtelo en unos minutos o escríbanos al',
    blok: 'Inténtelo de nuevo dentro de una hora.',
    odeslat: 'Enviar solicitud',
    zrusit: 'Cancelar solicitud',
    stavCeka: 'Esperamos la confirmación',
    stavPotvrzeno: 'Confirmado',
    stavNelze: 'No es posible',
    predmet: 'VIVIEN · El apartamento está listo',
  },
  fr: {
    cekaPrijezd: 'Nous avons votre demande d’arrivée plus tôt à {cas}. Nous la confirmerons dès que possible.',
    cekaOdjezd: 'Nous avons votre demande de départ plus tard à {cas}. Nous la confirmerons dès que possible.',
    cekaPripraveny: 'Nous avons votre arrivée plus tôt à {cas}. Nous la confirmerons dès que l’appartement sera prêt.',
    cekaUklid: 'Nous avons la demande. Nous la confirmerons le jour de l’arrivée, dès que l’appartement sera nettoyé.',
    potvrzenoPrijezd: 'C’est noté, nous vous attendons à {cas}. Nous réglerons le supplément de {kc} Kč à la remise des clés.',
    potvrzenoOdjezd: 'C’est noté, le départ à {cas} est confirmé. Nous réglerons le supplément de {kc} Kč à la reprise de l’appartement.',
    kratcePrijezd: 'Arrivée plus tôt à {cas} confirmée',
    kratceOdjezd: 'Départ plus tard à {cas} confirmé',
    nelzePrijezd: 'Cette fois, ce n’est pas possible. Nous vous attendons à partir de 14:00.',
    nelzeOdjezd: 'Cette fois, ce n’est pas possible. Libérez l’appartement avant 10:00.',
    zeleny: 'Votre appartement est déjà prêt. Si vous voulez arriver plus tôt, choisissez une heure. Nous comptons 75 Kč pour chaque demi-heure avant 14:00.',
    pozadat: 'Demander',
    sekce: 'Arrivée plus tôt et départ plus tard',
    cenik: 'Nous comptons 75 Kč pour chaque demi-heure commencée. Arrivée au plus tôt à 11:00, départ au plus tard à 14:00. Cela vaut seulement après notre confirmation.',
    emailVeta: 'Vous voulez arriver plus tôt ou partir plus tard ? Commandez-le ici. Nous comptons 75 Kč pour chaque demi-heure.',
    emailTlacitko: 'Je veux arriver plus tôt / partir plus tard',
    odjezdNabidka: 'Vous voulez partir plus tard ? Choisissez une heure dans le guide. Nous comptons 75 Kč pour chaque demi-heure après 10:00, au plus tard jusqu’à 14:00.',
    pripravenoUvod: 'Bonjour, votre appartement est déjà nettoyé et prêt. Si vous voulez arriver plus tôt, choisissez une heure ici. Nous comptons 75 Kč pour chaque demi-heure avant 14:00.',
    tlacitkoDrive: 'Je veux arriver plus tôt',
    tesime: 'Nous avons hâte de vous accueillir.',
    podpis: 'Nikol et la famille VIVIEN',
    popisekDrive: '{cas} · arrivée plus tôt +{kc} Kč (nous confirmerons)',
    popisekOdjezd: '{cas} · départ plus tard +{kc} Kč (nous confirmerons)',
    nesedi: 'Le numéro de réservation ou le nom ne correspond pas.',
    zatim: 'Nous ne voyons pas encore votre réservation. Réessayez dans quelques minutes, ou écrivez-nous au',
    blok: 'Réessayez dans une heure.',
    odeslat: 'Envoyer la demande',
    zrusit: 'Annuler la demande',
    stavCeka: 'En attente de confirmation',
    stavPotvrzeno: 'Confirmé',
    stavNelze: 'Pas possible',
    predmet: 'VIVIEN · L’appartement est prêt',
  },
  it: {
    cekaPrijezd: 'Abbiamo la richiesta di arrivo anticipato alle {cas}. La confermeremo al più presto.',
    cekaOdjezd: 'Abbiamo la richiesta di partenza posticipata alle {cas}. La confermeremo al più presto.',
    cekaPripraveny: 'Abbiamo l’arrivo anticipato alle {cas}. Lo confermeremo appena l’appartamento è pronto.',
    cekaUklid: 'Abbiamo la richiesta. La confermeremo il giorno dell’arrivo, appena l’appartamento è pulito.',
    potvrzenoPrijezd: 'Fatto, vi aspettiamo alle {cas}. Il supplemento di {kc} Kč lo saldiamo alla consegna.',
    potvrzenoOdjezd: 'Fatto, la partenza alle {cas} è confermata. Il supplemento di {kc} Kč lo saldiamo al ritiro dell’appartamento.',
    kratcePrijezd: 'Arrivo anticipato alle {cas} confermato',
    kratceOdjezd: 'Partenza posticipata alle {cas} confermata',
    nelzePrijezd: 'Questa volta non è possibile. Vi aspettiamo dalle 14:00.',
    nelzeOdjezd: 'Questa volta non è possibile. Liberate l’appartamento entro le 10:00.',
    zeleny: 'L’appartamento è già pronto. Se volete arrivare prima, scegliete un orario. Per ogni mezz’ora prima delle 14:00 contiamo 75 Kč.',
    pozadat: 'Richiedere',
    sekce: 'Arrivo anticipato e partenza posticipata',
    cenik: 'Contiamo 75 Kč per ogni mezz’ora iniziata. Arrivo al più presto alle 11:00, partenza al più tardi alle 14:00. Vale solo dopo la nostra conferma.',
    emailVeta: 'Volete arrivare prima o partire più tardi? Ordinate qui. Contiamo 75 Kč per ogni mezz’ora.',
    emailTlacitko: 'Voglio arrivare prima / partire più tardi',
    odjezdNabidka: 'Volete partire più tardi? Scegliete un orario nella guida. Contiamo 75 Kč per ogni mezz’ora dopo le 10:00, al più tardi fino alle 14:00.',
    pripravenoUvod: 'Buongiorno, l’appartamento è già pulito e pronto. Se volete arrivare prima, scegliete un orario qui. Per ogni mezz’ora prima delle 14:00 contiamo 75 Kč.',
    tlacitkoDrive: 'Voglio arrivare prima',
    tesime: 'Vi aspettiamo volentieri.',
    podpis: 'Nikol e la famiglia VIVIEN',
    popisekDrive: '{cas} · arrivo anticipato +{kc} Kč (confermeremo)',
    popisekOdjezd: '{cas} · partenza posticipata +{kc} Kč (confermeremo)',
    nesedi: 'Il numero di prenotazione o il cognome non coincide.',
    zatim: 'Non vediamo ancora la prenotazione. Riprovate tra qualche minuto, oppure scriveteci al',
    blok: 'Riprovate tra un’ora.',
    odeslat: 'Invia richiesta',
    zrusit: 'Annulla richiesta',
    stavCeka: 'In attesa di conferma',
    stavPotvrzeno: 'Confermato',
    stavNelze: 'Non è possibile',
    predmet: 'VIVIEN · L’appartamento è pronto',
  },
  sv: {
    cekaPrijezd: 'Vi har er förfrågan om tidigare ankomst kl. {cas}. Vi bekräftar den så snart vi kan.',
    cekaOdjezd: 'Vi har er förfrågan om senare avresa kl. {cas}. Vi bekräftar den så snart vi kan.',
    cekaPripraveny: 'Vi har er tidigare ankomst kl. {cas}. Vi bekräftar den när lägenheten är klar.',
    cekaUklid: 'Vi har förfrågan. Vi bekräftar den på ankomstdagen, när lägenheten är städad.',
    potvrzenoPrijezd: 'Klart, vi ser fram emot er kl. {cas}. Tillägget på {kc} Kč gör vi upp vid överlämningen.',
    potvrzenoOdjezd: 'Klart, avresa kl. {cas} gäller. Tillägget på {kc} Kč gör vi upp när vi tar emot lägenheten.',
    kratcePrijezd: 'Tidigare ankomst kl. {cas} bekräftad',
    kratceOdjezd: 'Senare avresa kl. {cas} bekräftad',
    nelzePrijezd: 'Den här gången går det inte. Vi ser fram emot er från 14:00.',
    nelzeOdjezd: 'Den här gången går det inte. Lämna lägenheten senast 10:00.',
    zeleny: 'Er lägenhet är redan klar. Om ni vill komma tidigare, välj en tid. Vi tar 75 Kč för varje halvtimme före 14:00.',
    pozadat: 'Begär',
    sekce: 'Tidigare ankomst och senare avresa',
    cenik: 'Vi tar 75 Kč för varje påbörjad halvtimme. Ankomst tidigast 11:00, avresa senast 14:00. Det gäller först efter vår bekräftelse.',
    emailVeta: 'Vill ni komma tidigare eller åka senare? Beställ det här. Vi tar 75 Kč för varje halvtimme.',
    emailTlacitko: 'Jag vill komma tidigare / åka senare',
    odjezdNabidka: 'Vill ni åka senare? Välj en tid i guiden. Vi tar 75 Kč för varje halvtimme efter 10:00, senast till 14:00.',
    pripravenoUvod: 'Hej, er lägenhet är redan städad och klar. Om ni vill komma tidigare, välj en tid här. Vi tar 75 Kč för varje halvtimme före 14:00.',
    tlacitkoDrive: 'Jag vill komma tidigare',
    tesime: 'Vi ser fram emot er.',
    podpis: 'Nikol och familjen VIVIEN',
    popisekDrive: '{cas} · tidigare ankomst +{kc} Kč (vi bekräftar)',
    popisekOdjezd: '{cas} · senare avresa +{kc} Kč (vi bekräftar)',
    nesedi: 'Bokningsnumret eller efternamnet stämmer inte.',
    zatim: 'Vi ser inte bokningen ännu. Försök igen om några minuter, eller skriv till oss på',
    blok: 'Försök igen om en timme.',
    odeslat: 'Skicka förfrågan',
    zrusit: 'Avbryt förfrågan',
    stavCeka: 'Väntar på bekräftelse',
    stavPotvrzeno: 'Bekräftat',
    stavNelze: 'Går inte',
    predmet: 'VIVIEN · Lägenheten är klar',
  },
  hu: {
    cekaPrijezd: 'Megkaptuk a korábbi érkezés kérését {cas} órára. Amint lehet, megerősítjük.',
    cekaOdjezd: 'Megkaptuk a későbbi távozás kérését {cas} órára. Amint lehet, megerősítjük.',
    cekaPripraveny: 'A {cas} órás korábbi érkezést megkaptuk. Megerősítjük, amint a lakás kész.',
    cekaUklid: 'A kérést megkaptuk. Az érkezés napján erősítjük meg, amint a lakás ki van takarítva.',
    potvrzenoPrijezd: 'Rendben, {cas} órakor várjuk Önöket. A {kc} Kč felárat az átadáskor rendezzük.',
    potvrzenoOdjezd: 'Rendben, a {cas} órás távozás érvényes. A {kc} Kč felárat a lakás átvételekor rendezzük.',
    kratcePrijezd: 'A {cas} órás korábbi érkezés megvan',
    kratceOdjezd: 'A {cas} órás későbbi távozás megvan',
    nelzePrijezd: 'Most sajnos nem megy. 14:00-tól várjuk Önöket.',
    nelzeOdjezd: 'Most sajnos nem megy. A lakást 10:00-ig adják át.',
    zeleny: 'A lakás már kész. Ha korábban szeretnének érkezni, válasszanak időpontot. 14:00 előtt minden megkezdett félóráért 75 Kč-t számolunk.',
    pozadat: 'Kérem',
    sekce: 'Korábbi érkezés és későbbi távozás',
    cenik: 'Minden megkezdett félóráért 75 Kč-t számolunk. Érkezés legkorábban 11:00-kor, távozás legkésőbb 14:00-ig. Csak a megerősítésünk után érvényes.',
    emailVeta: 'Korábban szeretnének érkezni, vagy később távozni? Itt tudják megrendelni. Minden félóráért 75 Kč-t számolunk.',
    emailTlacitko: 'Korábban érkeznék / később távoznék',
    odjezdNabidka: 'Később szeretnének távozni? Válasszanak időpontot az útmutatóban. 10:00 után minden félóráért 75 Kč-t számolunk, legkésőbb 14:00-ig.',
    pripravenoUvod: 'Jó napot, a lakás már ki van takarítva és kész. Ha korábban szeretnének érkezni, itt válasszanak időpontot. 14:00 előtt minden félóráért 75 Kč-t számolunk.',
    tlacitkoDrive: 'Korábban érkeznék',
    tesime: 'Nagyon várjuk Önöket.',
    podpis: 'Nikol és a VIVIEN család',
    popisekDrive: '{cas} · korábbi érkezés +{kc} Kč (megerősítjük)',
    popisekOdjezd: '{cas} · későbbi távozás +{kc} Kč (megerősítjük)',
    nesedi: 'A foglalás száma vagy a vezetéknév nem stimmel.',
    zatim: 'A foglalást még nem látjuk. Próbálják meg pár perc múlva, vagy írjanak a',
    blok: 'Próbálják meg egy óra múlva.',
    odeslat: 'Kérés elküldése',
    zrusit: 'Kérés visszavonása',
    stavCeka: 'Megerősítésre vár',
    stavPotvrzeno: 'Megerősítve',
    stavNelze: 'Nem megy',
    predmet: 'VIVIEN · A lakás kész',
  },
};

function jazyk(lang: GuideLang | null | undefined): GuideLang {
  if (lang && (GUIDE_LANGS as readonly string[]).includes(lang)) return lang;
  return 'en';
}

export function vety(lang: GuideLang | null | undefined): Vety {
  return VETY[jazyk(lang)];
}

function dopln(sablona: string, cas: string, kc: number): string {
  return sablona.replaceAll('{cas}', zobrazCas(cas)).replaceAll('{kc}', String(kc));
}

export function minutyCasu(cas: string | null | undefined): number | null {
  if (!cas || !/^([01]\d|2[0-3]):[0-5]\d$/.test(cas)) return null;
  const [h, m] = cas.split(':').map(Number);
  return h * 60 + m;
}

export function casZMinut(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function zobrazCas(cas: string): string {
  return cas.replace(/^0(\d:)/, '$1');
}

export function cenaDrive(cas: string | null | undefined): number | null {
  const min = minutyCasu(cas);
  if (min == null || min < PRIJEZD_NEJDRIV || min >= PRIJEZD_STANDARD) return null;
  return Math.ceil((PRIJEZD_STANDARD - min) / 30) * OKNO_KC;
}

export function cenaPozde(cas: string | null | undefined): number | null {
  const min = minutyCasu(cas);
  if (min == null || min <= ODJEZD_STANDARD || min > ODJEZD_NEJPOZDEJI) return null;
  return Math.ceil((min - ODJEZD_STANDARD) / 30) * OKNO_KC;
}

export function jeCasDrive(cas: string | null | undefined): boolean {
  return cenaDrive(cas) != null;
}

export function jeCasPozde(cas: string | null | undefined): boolean {
  return cenaPozde(cas) != null;
}

export function popisekDrive(lang: GuideLang | null | undefined, cas: string): string {
  return dopln(vety(lang).popisekDrive, cas, cenaDrive(cas) || 0);
}

export function popisekOdjezd(lang: GuideLang | null | undefined, cas: string): string {
  return dopln(vety(lang).popisekOdjezd, cas, cenaPozde(cas) || 0);
}

/** Nejdřív půl hodiny po známém odjezdu a po úklidu. Bez známého času od 11:00. */
export function nejdrivePoOdjezdu(casOdjezdu: string | null, nekdoOdjizdi: boolean): string {
  if (!nekdoOdjizdi) return casZMinut(PRIJEZD_NEJDRIV);
  const min = minutyCasu(casOdjezdu);
  if (min == null) return casZMinut(PRIJEZD_NEJDRIV);
  const zaokr = Math.ceil((min + MEZERA_PO_ODJEZDU_MIN + UKLID_MIN) / 30) * 30;
  return casZMinut(Math.max(PRIJEZD_NEJDRIV, zaokr));
}

/** Nejpozději 3 hodiny před známým příjezdem. Neznámý čas nejvýš do 11:00. */
export function nejpozdejiPredPrijezdem(casPrijezdu: string | null, nekdoPrijizdi: boolean): string {
  if (!nekdoPrijizdi) return casZMinut(ODJEZD_NEJPOZDEJI);
  const min = minutyCasu(casPrijezdu);
  if (min == null) return casZMinut(ODJEZD_KDYZ_CAS_NEZNAMY);
  const zaokr = Math.floor((min - MEZERA_PRED_PRIJEZDEM_MIN) / 30) * 30;
  return casZMinut(Math.min(ODJEZD_NEJPOZDEJI, Math.max(ODJEZD_STANDARD, zaokr)));
}

export function casyDrive(nejdrive: string): string[] {
  const od = Math.max(PRIJEZD_NEJDRIV, minutyCasu(nejdrive) ?? PRIJEZD_NEJDRIV);
  const ven: string[] = [];
  for (let m = od; m < PRIJEZD_STANDARD; m += 30) {
    const cas = casZMinut(m);
    if (cenaDrive(cas)) ven.push(cas);
  }
  return ven;
}

export function casyPozde(nejpozdeji: string): string[] {
  const konec = Math.min(ODJEZD_NEJPOZDEJI, minutyCasu(nejpozdeji) ?? ODJEZD_NEJPOZDEJI);
  const ven: string[] = [];
  for (let m = ODJEZD_STANDARD + 30; m <= konec; m += 30) {
    const cas = casZMinut(m);
    if (cenaPozde(cas)) ven.push(cas);
  }
  return ven;
}

export function praha(now: Date): { den: string; hodina: number; minuta: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const v = (typ: string) => parts.find((p) => p.type === typ)?.value || '';
  return { den: `${v('year')}-${v('month')}-${v('day')}`, hodina: Number(v('hour')), minuta: Number(v('minute')) };
}

export function posunDen(den: string, dny: number): string {
  const [y, m, d] = den.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + dny)).toISOString().slice(0, 10);
}

/** Od teď, zaokrouhleno na půlhodinu nahoru, nejdřív za 30 minut. */
export function nejdriveOdTed(now: Date): string {
  const { hodina, minuta } = praha(now);
  const zaokr = Math.ceil((hodina * 60 + minuta + PRIPRAVENO_PRED_MIN) / 30) * 30;
  return casZMinut(zaokr);
}

export function odjizdiTenDen(hoste: HostOkna[], ja: { rezervace: string; apartman: string | null; prijezd: string | null }): HostOkna | null {
  if (!ja.apartman || !ja.prijezd) return null;
  return (
    hoste.find(
      (h) => h.rezervace !== ja.rezervace && h.apartman === ja.apartman && h.odjezd === ja.prijezd && h.stav !== 'zruseno',
    ) || null
  );
}

export function prijizdiTenDen(hoste: HostOkna[], ja: { rezervace: string; apartman: string | null; odjezd: string | null }): HostOkna | null {
  if (!ja.apartman || !ja.odjezd) return null;
  return (
    hoste.find(
      (h) => h.rezervace !== ja.rezervace && h.apartman === ja.apartman && h.prijezd === ja.odjezd && h.stav !== 'zruseno',
    ) || null
  );
}

export function smiPotvrditPrijezd(obsazeno: boolean, uklizeno: boolean): boolean {
  return !obsazeno || uklizeno;
}

function hostZ(rec: RezervaceRecord): HostOkna {
  return {
    rezervace: rec.rezervace,
    apartman: rec.apartman,
    prijezd: rec.prijezd,
    odjezd: rec.odjezd,
    stav: rec.stav,
    casOdjezdu: rec.casOdjezdu,
    casPrijezdu: rec.casPrijezdu,
    uklizenoKdy: rec.uklizenoKdy,
    predano: rec.predano,
    jmeno: rec.jmeno,
    zadostPrijezd: rec.zadostPrijezd,
  };
}

export function hosteZ(zaznamy: RezervaceRecord[]): HostOkna[] {
  return zaznamy.map(hostZ);
}

function poznamka(rec: RezervaceRecord, co: string, patch: Partial<RezervaceRecord>, now: Date): RezervaceRecord {
  return {
    ...rec,
    ...patch,
    historie: [...rec.historie, { cas: now.toISOString(), co }].slice(-40),
  };
}

export function novaZadost(cas: string, kc: number, od: ZadostOkna['od'], hned: boolean, now: Date): ZadostOkna {
  return { cas, kc, stav: 'ceka', kdy: now.toISOString(), od, hned, upozorneno: false };
}

export function textPushePrijezdu(popis: string, cas: string, kc: number, hned: boolean): string {
  const veta = `${popis} chce přijet ve ${zobrazCas(cas)} (+${kc} Kč)`;
  return hned ? `${veta}, lze potvrdit hned` : veta;
}

export function textPusheOdjezdu(popis: string, cas: string, kc: number): string {
  return `${popis} chce odjet ve ${zobrazCas(cas)} (+${kc} Kč)`;
}

export function textPushePoUklidu(popis: string): string {
  return `${popis} čeká na potvrzení dřívějšího příjezdu, apartmán je uklizený`;
}

export function popisHostaKratce(rec: { apartman: string | null; jmeno: string | null; rezervace: string }): string {
  const casti = (rec.jmeno || '').trim().split(/\s+/).filter(Boolean);
  const prijmeni = casti.length ? casti[casti.length - 1] : rec.rezervace;
  return `${rec.apartman || 'Apartmán'} ${prijmeni}`;
}

export type TextStavu = { kratce: string; veta: string };

export function textStavu(
  lang: GuideLang | null | undefined,
  druh: 'prijezd' | 'odjezd',
  zadost: ZadostOkna | null,
): TextStavu | null {
  if (!zadost) return null;
  const t = vety(lang);
  if (zadost.stav === 'nelze') {
    return { kratce: '', veta: druh === 'prijezd' ? t.nelzePrijezd : t.nelzeOdjezd };
  }
  if (zadost.stav === 'potvrzeno') {
    return {
      kratce: dopln(druh === 'prijezd' ? t.kratcePrijezd : t.kratceOdjezd, zadost.cas, zadost.kc),
      veta: dopln(druh === 'prijezd' ? t.potvrzenoPrijezd : t.potvrzenoOdjezd, zadost.cas, zadost.kc),
    };
  }
  if (druh === 'odjezd') return { kratce: '', veta: dopln(t.cekaOdjezd, zadost.cas, zadost.kc) };
  if (!zadost.hned) return { kratce: '', veta: dopln(t.cekaPripraveny, zadost.cas, zadost.kc) };
  return { kratce: '', veta: dopln(t.cekaPrijezd, zadost.cas, zadost.kc) };
}

export function textCekaniUklid(lang: GuideLang | null | undefined): string {
  return vety(lang).cekaUklid;
}

export type OknoPohled = {
  zeleny: boolean;
  sekcePrijezd: boolean;
  sekceOdjezd: boolean;
  slotyZelene: string[];
  slotyPrijezd: string[];
  slotyOdjezd: string[];
  nejpozdeji: string;
  zadostPrijezd: ZadostOkna | null;
  zadostOdjezd: ZadostOkna | null;
};

export function oknoProHosta(rec: RezervaceRecord, zaznamy: RezervaceRecord[], now: Date, otevreno: boolean): OknoPohled {
  const hoste = hosteZ(zaznamy);
  const ja = hostZ(rec);
  const { den, hodina } = praha(now);
  const odchod = odjizdiTenDen(hoste, ja);
  const dalsi = prijizdiTenDen(hoste, ja);
  const nejdrive = nejdrivePoOdjezdu(odchod?.casOdjezdu ?? null, Boolean(odchod));
  const nejpozdeji = nejpozdejiPredPrijezdem(dalsi?.casPrijezdu ?? null, Boolean(dalsi));
  const cas = rec.casPrijezdu;
  const poStandardu = minutyCasu(cas) == null || (minutyCasu(cas) as number) > PRIJEZD_STANDARD;
  const zeleny = Boolean(odchod?.uklizenoKdy) && rec.prijezd === den && !rec.predano && poStandardu;
  const odTed = nejdriveOdTed(now);
  const hraniceZelene = (minutyCasu(odTed) || 0) > (minutyCasu(nejdrive) || 0) ? odTed : nejdrive;
  const denPred = rec.odjezd ? posunDen(rec.odjezd, -1) : '';
  const sekceOdjezd = otevreno && Boolean(rec.odjezd) && (den < denPred || (den === denPred && hodina < 18));
  return {
    zeleny,
    sekcePrijezd: otevreno && !rec.predano && Boolean(rec.prijezd) && den < (rec.prijezd || ''),
    sekceOdjezd,
    slotyZelene: zeleny ? casyDrive(hraniceZelene) : [],
    slotyPrijezd: casyDrive(nejdrive),
    slotyOdjezd: casyPozde(nejpozdeji),
    nejpozdeji,
    zadostPrijezd: rec.zadostPrijezd,
    zadostOdjezd: rec.zadostOdjezd,
  };
}

export function zadostPrijezdu(
  rec: RezervaceRecord,
  zaznamy: RezervaceRecord[],
  cas: string,
  od: ZadostOkna['od'],
  now: Date,
): { rec: RezervaceRecord; push: string } | null {
  const kc = cenaDrive(cas);
  if (!kc || rec.zadostPrijezd?.stav === 'potvrzeno') return null;
  const odchod = odjizdiTenDen(hosteZ(zaznamy), hostZ(rec));
  const povoleno = casyDrive(nejdrivePoOdjezdu(odchod?.casOdjezdu ?? null, Boolean(odchod)));
  if (!povoleno.includes(cas)) return null;
  const hned = !odchod;
  const rucni = maRucni(rec, 'casPrijezdu');
  const oficialni = rucni || (rec.casPrijezdu && !jeCasDrive(rec.casPrijezdu)) ? rec.casPrijezdu : '14:00';
  const vetaHistorie = od === 'objednat' ? 'Žádost přes stránku Objednat' : `Žádost o dřívější příjezd ve ${zobrazCas(cas)}`;
  const dalsi = poznamka(
    rec,
    vetaHistorie,
    {
      zadostPrijezd: novaZadost(cas, kc, od, hned, now),
      casPrijezdu: oficialni,
      casZadalHost: rucni ? rec.casZadalHost : true,
    },
    now,
  );
  return { rec: dalsi, push: textPushePrijezdu(popisHostaKratce(rec), cas, kc, hned) };
}

export function zadostOdjezdu(
  rec: RezervaceRecord,
  zaznamy: RezervaceRecord[],
  cas: string,
  od: ZadostOkna['od'],
  now: Date,
): { rec: RezervaceRecord; push: string } | null {
  const kc = cenaPozde(cas);
  if (!kc || rec.zadostOdjezd?.stav === 'potvrzeno') return null;
  const dalsiHost = prijizdiTenDen(hosteZ(zaznamy), hostZ(rec));
  const povoleno = casyPozde(nejpozdejiPredPrijezdem(dalsiHost?.casPrijezdu ?? null, Boolean(dalsiHost)));
  if (!povoleno.includes(cas)) return null;
  const vetaHistorie = od === 'objednat' ? 'Žádost přes stránku Objednat' : `Žádost o pozdější odjezd ve ${zobrazCas(cas)}`;
  const dalsi = poznamka(rec, vetaHistorie, { zadostOdjezd: novaZadost(cas, kc, od, !dalsiHost, now) }, now);
  return { rec: dalsi, push: textPusheOdjezdu(popisHostaKratce(rec), cas, kc) };
}

export function zrusitZadost(rec: RezervaceRecord, druh: 'prijezd' | 'odjezd', now: Date): RezervaceRecord | null {
  const zadost = druh === 'prijezd' ? rec.zadostPrijezd : rec.zadostOdjezd;
  if (!zadost || zadost.stav === 'potvrzeno') return null;
  const veta = druh === 'prijezd' ? 'Žádost o dřívější příjezd zrušena' : 'Žádost o pozdější odjezd zrušena';
  return poznamka(rec, veta, druh === 'prijezd' ? { zadostPrijezd: null } : { zadostOdjezd: null }, now);
}

export function aplikujPotvrzeni(
  rec: RezervaceRecord,
  druh: 'prijezd' | 'odjezd',
  zaznamy: RezervaceRecord[],
  now: Date,
): RezervaceRecord | null {
  const zadost = druh === 'prijezd' ? rec.zadostPrijezd : rec.zadostOdjezd;
  if (!zadost || zadost.stav !== 'ceka') return null;
  if (druh === 'prijezd') {
    const odchod = odjizdiTenDen(hosteZ(zaznamy), hostZ(rec));
    if (!smiPotvrditPrijezd(Boolean(odchod), Boolean(odchod?.uklizenoKdy))) return null;
    const rucni = maRucni(rec, 'casPrijezdu');
    return poznamka(
      rec,
      `Dřívější příjezd ${zobrazCas(zadost.cas)} potvrzen`,
      {
        zadostPrijezd: { ...zadost, stav: 'potvrzeno', kdy: now.toISOString() },
        casPrijezdu: rucni ? rec.casPrijezdu : zadost.cas,
        casZadalHost: rucni ? rec.casZadalHost : true,
      },
      now,
    );
  }
  const rucni = maRucni(rec, 'casOdjezdu');
  return poznamka(
    rec,
    `Pozdější odjezd ${zobrazCas(zadost.cas)} potvrzen`,
    {
      zadostOdjezd: { ...zadost, stav: 'potvrzeno', kdy: now.toISOString() },
      casOdjezdu: rucni ? rec.casOdjezdu : zadost.cas,
      casOdjezduZadalHost: rucni ? rec.casOdjezduZadalHost : true,
    },
    now,
  );
}

export function aplikujNelze(rec: RezervaceRecord, druh: 'prijezd' | 'odjezd', now: Date): RezervaceRecord | null {
  const zadost = druh === 'prijezd' ? rec.zadostPrijezd : rec.zadostOdjezd;
  if (!zadost || zadost.stav !== 'ceka') return null;
  if (druh === 'prijezd') {
    const rucni = maRucni(rec, 'casPrijezdu');
    const vratit = !rucni && (!rec.casPrijezdu || rec.casPrijezdu === zadost.cas || rec.casPrijezdu === '14:00');
    return poznamka(
      rec,
      'Dřívější příjezd nejde',
      {
        zadostPrijezd: { ...zadost, stav: 'nelze', kdy: now.toISOString() },
        casPrijezdu: vratit ? '14:00' : rec.casPrijezdu,
      },
      now,
    );
  }
  return poznamka(
    rec,
    'Pozdější odjezd nejde',
    { zadostOdjezd: { ...zadost, stav: 'nelze', kdy: now.toISOString() } },
    now,
  );
}

export type NabidkaUklidu = {
  nabidka: { id: string; jmeno: string } | null;
  cekajici: RezervaceRecord | null;
  push: string;
  odeslanoHostovi: false;
};

/** Po Uklizeno se zeptáme. Hostovi se samo nic neposílá. */
export function poUklidu(uklizeny: RezervaceRecord, zaznamy: RezervaceRecord[], now: Date): NabidkaUklidu {
  const den = praha(now).den;
  const prijezd = zaznamy.find(
    (h) =>
      h.rezervace !== uklizeny.rezervace &&
      h.apartman === uklizeny.apartman &&
      h.prijezd === den &&
      h.stav !== 'zruseno' &&
      !h.predano,
  );
  if (!prijezd) return { nabidka: null, cekajici: null, push: '', odeslanoHostovi: false };
  const cas = minutyCasu(prijezd.casPrijezdu);
  const po = cas == null || cas > PRIJEZD_STANDARD;
  const nabidka = po ? { id: prijezd.rezervace, jmeno: prijezd.jmeno || prijezd.rezervace } : null;
  const z = prijezd.zadostPrijezd;
  const cekajici = z && z.stav === 'ceka' && !z.hned && !z.upozorneno ? prijezd : null;
  return {
    nabidka,
    cekajici,
    push: cekajici ? textPushePoUklidu(popisHostaKratce(prijezd)) : '',
    odeslanoHostovi: false,
  };
}

export function oznacUpozorneno(rec: RezervaceRecord): RezervaceRecord {
  if (!rec.zadostPrijezd) return rec;
  return { ...rec, zadostPrijezd: { ...rec.zadostPrijezd, upozorneno: true } };
}

export function vetaEmailu(lang: GuideLang | null | undefined): string {
  return vety(lang).emailVeta;
}

export function tlacitkoEmailu(lang: GuideLang | null | undefined): string {
  return vety(lang).emailTlacitko;
}

export function odkazSekce(guideUrl: string): string {
  const zaklad = guideUrl.split('#')[0];
  return `${zaklad}#drivejsi`;
}

export function odkazPripraveno(guideUrl: string): string {
  const zaklad = guideUrl.split('#')[0];
  return `${zaklad}#pripraveno`;
}

export function vetaOdjezduNavic(lang: GuideLang | null | undefined): string {
  return vety(lang).odjezdNabidka;
}

export function textPripraveno(lang: GuideLang | null | undefined, odkaz: string): string {
  const t = vety(lang);
  return `${t.pripravenoUvod}\n\n${t.tlacitkoDrive}\n${odkaz}\n\n${t.tesime}\n${t.podpis}`;
}

export function predmetPripraveno(lang: GuideLang | null | undefined): string {
  return vety(lang).predmet;
}

export function bezDiakritiky(raw: string): string {
  return (raw || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

export function sediPrijmeni(jmeno: string | null, zadane: string): boolean {
  const cil = bezDiakritiky(zadane);
  if (!cil) return false;
  return (jmeno || '')
    .split(/\s+/)
    .filter(Boolean)
    .some((slovo) => bezDiakritiky(slovo) === cil);
}

export function jazykProhlizece(hlavicka: string | null): GuideLang {
  const raw = (hlavicka || '').toLowerCase();
  const poradi: [string, GuideLang][] = [
    ['zh', 'zh-Hant'],
    ['cs', 'cs'],
    ['sk', 'cs'],
    ['de', 'de'],
    ['pl', 'pl'],
    ['uk', 'uk'],
    ['es', 'es'],
    ['fr', 'fr'],
    ['it', 'it'],
    ['sv', 'sv'],
    ['hu', 'hu'],
    ['en', 'en'],
  ];
  for (const [kod, lang] of poradi) {
    if (raw.includes(kod)) return lang;
  }
  return 'cs';
}

export type ObjednatNahled = {
  rezervace: string;
  apartman: string;
  termin: string;
  casPrijezdu: string;
  casOdjezdu: string;
  prijezd: 'zadny' | 'ceka' | 'potvrzeno' | 'nelze';
  odjezd: 'zadny' | 'ceka' | 'potvrzeno' | 'nelze';
  slotyPrijezd: string[];
  slotyOdjezd: string[];
  muzeMenitPrijezd: boolean;
  muzeMenitOdjezd: boolean;
};

export type VysledekObjednavky =
  | { ok: false; duvod: 'chybi' | 'nesedi' }
  | { ok: true; nahled: ObjednatNahled; rec: RezervaceRecord; push: string[] };

function denText(den: string | null): string {
  if (!den || !/^\d{4}-\d{2}-\d{2}$/.test(den)) return '';
  const [y, m, d] = den.split('-');
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

function stavZ(z: ZadostOkna | null): ObjednatNahled['prijezd'] {
  if (!z) return 'zadny';
  return z.stav;
}

export function nahledObjednavky(rec: RezervaceRecord, zaznamy: RezervaceRecord[], apartmanNazev: string): ObjednatNahled {
  const pohled = oknoProHosta(rec, zaznamy, new Date(), true);
  return {
    rezervace: rec.rezervace,
    apartman: apartmanNazev,
    termin: [denText(rec.prijezd), denText(rec.odjezd)].filter(Boolean).join(' - '),
    casPrijezdu: rec.casPrijezdu && !jeCasDrive(rec.casPrijezdu) ? zobrazCas(rec.casPrijezdu) : '14:00',
    casOdjezdu: rec.casOdjezdu ? zobrazCas(rec.casOdjezdu) : '10:00',
    prijezd: stavZ(rec.zadostPrijezd),
    odjezd: stavZ(rec.zadostOdjezd),
    slotyPrijezd: pohled.slotyPrijezd,
    slotyOdjezd: pohled.slotyOdjezd,
    muzeMenitPrijezd: rec.zadostPrijezd?.stav !== 'potvrzeno',
    muzeMenitOdjezd: rec.zadostOdjezd?.stav !== 'potvrzeno',
  };
}

export function vyhodnotObjednavku(
  zaznamy: RezervaceRecord[],
  id: string,
  prijmeni: string,
  dnes: string,
  zadani: { prijezd?: string; odjezd?: string; zrusitPrijezd?: boolean; zrusitOdjezd?: boolean } | null,
  apartmanNazev: string,
  now: Date,
): VysledekObjednavky {
  const rec = zaznamy.find((r) => r.rezervace === id.trim());
  if (!rec) return { ok: false, duvod: 'chybi' };
  if (rec.stav === 'zruseno' || (rec.odjezd && rec.odjezd < dnes) || !sediPrijmeni(rec.jmeno, prijmeni)) {
    return { ok: false, duvod: 'nesedi' };
  }
  let pracovni = rec;
  const push: string[] = [];
  if (zadani?.zrusitPrijezd) {
    const zruseno = zrusitZadost(pracovni, 'prijezd', now);
    if (zruseno) pracovni = zruseno;
  }
  if (zadani?.zrusitOdjezd) {
    const zruseno = zrusitZadost(pracovni, 'odjezd', now);
    if (zruseno) pracovni = zruseno;
  }
  if (zadani?.prijezd) {
    const vysledek = zadostPrijezdu(pracovni, zaznamy, zadani.prijezd, 'objednat', now);
    if (vysledek) {
      pracovni = vysledek.rec;
      push.push(vysledek.push);
    }
  }
  if (zadani?.odjezd) {
    const vysledek = zadostOdjezdu(pracovni, zaznamy, zadani.odjezd, 'objednat', now);
    if (vysledek) {
      pracovni = vysledek.rec;
      push.push(vysledek.push);
    }
  }
  const ostatni = zaznamy.map((r) => (r.rezervace === pracovni.rezervace ? pracovni : r));
  return { ok: true, nahled: nahledObjednavky(pracovni, ostatni, apartmanNazev), rec: pracovni, push };
}

const HODINA_MS = 60 * 60 * 1000;

export function jeBlokPokus(mapa: Record<string, { od: number; pocet: number }>, klic: string, now: number): boolean {
  const stav = mapa[klic];
  if (!stav) return false;
  if (now - stav.od >= HODINA_MS) return false;
  return stav.pocet >= OBJEDNAT_POKUSU;
}

export function zapisPokus(
  mapa: Record<string, { od: number; pocet: number }>,
  klic: string,
  now: number,
): Record<string, { od: number; pocet: number }> {
  const stav = mapa[klic];
  const cerstvy = !stav || now - stav.od >= HODINA_MS;
  return { ...mapa, [klic]: { od: cerstvy ? now : stav.od, pocet: cerstvy ? 1 : stav.pocet + 1 } };
}
