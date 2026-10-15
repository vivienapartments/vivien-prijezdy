import { PRIPLATEK_DO, PRIPLATEK_KC, PRIPLATEK_OD } from './constants';
import { casZMinut } from './priplatek-prijezd';
import type { LText } from './types';

const od = casZMinut(PRIPLATEK_OD);
const dokonce = casZMinut(PRIPLATEK_DO);
const kc = String(PRIPLATEK_KC);

export const vstupNadpis: LText = {
  cs: 'Bez času příjezdu se neubytujete',
  en: 'Without an arrival time you cannot check in',
  de: 'Ohne Ankunftszeit können Sie nicht einchecken',
  pl: 'Bez godziny przyjazdu nie zameldujecie się',
  uk: 'Без часу приїзду ви не заселитеся',
  'zh-Hant': '沒有抵達時間就無法入住',
  sv: 'Utan ankomsttid kan ni inte checka in',
  es: 'Sin hora de llegada no se alojan',
  hu: 'Érkezési idő nélkül nem tudnak bejelentkezni',
};

export const vstupUvod: LText = {
  cs: 'Každé z těchto pravidel má svůj příběh. Domluvme se na nich hned na začátku, ať se pak na sebe nemusíme mračit.',
  en: 'Each of these rules has its own story. Let us agree on them right at the start, so we do not have to frown at each other later.',
  de: 'Jede dieser Regeln hat ihre eigene Geschichte. Lassen Sie uns gleich am Anfang einig werden, damit wir uns später nicht schief ansehen müssen.',
  pl: 'Każda z tych zasad ma swoją historię. Ustalmy je od razu na początku, żebyśmy później nie patrzyli na siebie spode łba.',
  uk: 'Кожне з цих правил має свою історію. Домовмося про них одразу на початку, щоб потім не хмуритися одне на одного.',
  'zh-Hant': '每一條規則背後都有自己的故事。我們一開始就說好，免得後來彼此不高興。',
  sv: 'Var och en av de här reglerna har sin egen historia. Låt oss komma överens om dem redan från början, så att vi inte behöver se sura ut mot varandra sedan.',
  es: 'Cada una de estas reglas tiene su historia. Acordémoslas ya al principio, para que luego no tengamos que mirarnos mal.',
  hu: 'Mindegyik szabálynak megvan a maga története. Egyeztessünk róluk mindjárt az elején, hogy később ne kelljen egymásra rosszallóan néznünk.',
};

export const vstupSouhlas: LText = {
  cs: 'Rozumím pravidlům příjezdu a souhlasím s nimi.',
  en: 'I understand the arrival rules and I agree with them.',
  de: 'Ich verstehe die Ankunftsregeln und stimme ihnen zu.',
  pl: 'Rozumiem zasadom przyjazdu i zgadzam się z nimi.',
  uk: 'Я розумію правила приїзду і погоджуюся з ними.',
  'zh-Hant': '我了解抵達規則並同意。',
  sv: 'Jag förstår ankomstreglerna och samtycker till dem.',
  es: 'Entiendo las reglas de llegada y estoy de acuerdo.',
  hu: 'Értem az érkezési szabályokat, és egyetértek velük.',
};

export const vstupPravidla: LText[] = [
  {
    cs: 'Čas příjezdu vyberte tady. Stačí přibližně, změnu hned opravte.',
    en: 'Choose your arrival time here. An estimate is enough, and if it changes, correct it right away.',
    de: 'Wählen Sie die Ankunftszeit hier. Ungefähr reicht, eine Änderung korrigieren Sie sofort.',
    pl: 'Godzinę przyjazdu wybierzcie tutaj. Wystarczy w przybliżeniu, zmianę od razu poprawcie.',
    uk: 'Час приїзду оберіть тут. Досить приблизно, зміну одразу виправте.',
    'zh-Hant': '請在這裡選抵達時間。大約即可，有變就立刻改。',
    sv: 'Välj ankomsttiden här. Ett ungefär räcker, och ändras den rättar ni den genast.',
    es: 'Elijan aquí la hora de llegada. Basta una hora aproximada, y si cambia, corríjanla enseguida.',
    hu: 'Az érkezés idejét itt válasszák ki. Elég a hozzávetőleges idő, a változást azonnal javítsák.',
  },
  {
    cs: 'Když nám napíšete čtvrt hodiny předem, že budete na místě, čekáme my na vás. Na domluvený čas pak čekáme 10 minut. Když nedorazíte a musíme přijet znovu, účtujeme za to {{VYJEZD}} Kč.',
    en: 'When you write to us a quarter of an hour beforehand that you will be there, we are the ones waiting for you. We then wait 10 minutes past the agreed time. If you do not arrive and we have to come out again, we charge {{VYJEZD}} Kč for that.',
    de: 'Wenn Sie uns eine Viertelstunde vorher schreiben, dass Sie da sein werden, warten wir auf Sie. Auf die vereinbarte Zeit warten wir dann 10 Minuten. Wenn Sie nicht ankommen und wir noch einmal kommen müssen, berechnen wir dafür {{VYJEZD}} Kč.',
    pl: 'Kiedy napiszecie nam kwadrans wcześniej, że będziecie na miejscu, czekamy my na was. Na umówioną godzinę czekamy potem 10 minut. Gdy nie przyjedziecie i musimy przyjechać ponownie, doliczamy za to {{VYJEZD}} Kč.',
    uk: 'Коли напишете нам за чверть години наперед, що будете на місці, чекаємо ми на вас. На домовлений час потім чекаємо 10 хвилин. Якщо ви не приїдете і нам доведеться виїхати знову, за це беремо {{VYJEZD}} Kč.',
    'zh-Hant': '當您在一刻鐘前寫說會到，等的人是我們。約定時間我們接著等 10 分鐘。如果您沒到，我們得再出來一趟，這次收 {{VYJEZD}} Kč。',
    sv: 'När ni skriver till oss en kvart i förväg att ni kommer att vara på plats, är det vi som väntar på er. Den avtalade tiden väntar vi sedan 10 minuter. Om ni inte kommer och vi måste åka ut igen tar vi {{VYJEZD}} Kč för det.',
    es: 'Cuando nos escriben con un cuarto de hora de antelación que ya van a estar, esperamos nosotros. Después esperamos 10 minutos desde la hora acordada. Si no llegan y tenemos que salir otra vez, cobramos {{VYJEZD}} Kč por ese viaje.',
    hu: 'Amikor negyedórával előre megírják, hogy ott lesznek, mi várunk önökre. A megbeszélt időpontra utána 10 percet várunk. Ha nem érkeznek meg, és újra ki kell jönnünk, ezért {{VYJEZD}} Kč-t számítunk fel.',
  },
  {
    cs: 'Když nám čas předem nedáte, čekáte vy na nás, až hodinu. Až napíšete, že jste na místě, apartmán předáme do hodiny.',
    en: 'When you do not give us a time in advance, you are the one waiting for us, for up to an hour. Once you write that you are here, we hand the apartment over within an hour.',
    de: 'Wenn Sie uns die Zeit nicht vorher geben, warten Sie auf uns, bis zu einer Stunde. Sobald Sie schreiben, dass Sie da sind, übergeben wir das Apartment innerhalb einer Stunde.',
    pl: 'Kiedy nie podacie nam czasu wcześniej, czekacie wy na nas, aż godzinę. Gdy napiszecie, że jesteście na miejscu, apartament przekażemy w ciągu godziny.',
    uk: 'Коли не дасте нам час наперед, чекаєте ви на нас, аж до години. Щойно напишете, що ви на місці, апартаменти передамо протягом години.',
    'zh-Hant': '當您沒有事先給時間，等的人是您，最多一小時。您寫說已經到了，我們會在一小時內把公寓交給您。',
    sv: 'När ni inte ger oss en tid i förväg, är det ni som väntar på oss, upp till en timme. När ni skriver att ni är på plats lämnar vi över lägenheten inom en timme.',
    es: 'Cuando no nos dan la hora por adelantado, esperan ustedes, hasta una hora. En cuanto escriban que ya están, entregamos el apartamento en el plazo de una hora.',
    hu: 'Amikor nem adják meg előre az időt, önök várnak ránk, akár egy órát. Amint megírják, hogy megérkeztek, az apartmant egy órán belül átadjuk.',
  },
  {
    cs: `Check-in je od 14:00 do ${od}. Později platíte ${kc} Kč za každou započatou půlhodinu podle skutečného příjezdu, na místě. Po ${dokonce} jen po domluvě.`,
    en: `Check-in is from 14:00 to ${od}. After that you pay ${kc} Kč for each half-hour started, based on the actual arrival, on the spot. After ${dokonce} only if we agree.`,
    de: `Check-in ist von 14:00 bis ${od}. Danach zahlen Sie ${kc} Kč für jede angefangene halbe Stunde nach der tatsächlichen Ankunft, vor Ort. Nach ${dokonce} nur nach Absprache.`,
    pl: `Check-in jest od 14:00 do ${od}. Później płacicie ${kc} Kč za każdą rozpoczętą półgodzinę według rzeczywistego przyjazdu, na miejscu. Po ${dokonce} tylko po uzgodnieniu.`,
    uk: `Заселення з 14:00 до ${od}. Пізніше платите ${kc} Kč за кожні розпочаті пів години за фактичним приїздом, на місці. Після ${dokonce} лише за домовленістю.`,
    'zh-Hant': `入住時間是 14:00 到 ${od}。更晚則按實際抵達時間，每開始計算的半小時在現場付 ${kc} Kč。${dokonce} 之後只能事先說好。`,
    sv: `Incheckning är från 14:00 till ${od}. Senare betalar ni ${kc} Kč för varje påbörjad halvtimme efter den verkliga ankomsten, på plats. Efter ${dokonce} bara om vi kommer överens.`,
    es: `El check-in es de 14:00 a ${od}. Después pagan ${kc} Kč por cada media hora empezada, según la llegada real, en el momento. Después de las ${dokonce}, solo si lo acordamos.`,
    hu: `A bejelentkezés 14:00-tól ${od}-ig tart. Később a tényleges érkezés szerint minden megkezdett félóráért ${kc} Kč pótdíjat fizetnek, a helyszínen. ${dokonce} után csak megbeszélés után.`,
  },
  {
    cs: 'PINy dostanete při osobním předání po kontrole dokladů.',
    en: 'You receive the PIN codes at the personal handover, after we check your documents.',
    de: 'Die PIN-Codes bekommen Sie bei der persönlichen Übergabe nach der Kontrolle der Ausweise.',
    pl: 'Kody PIN dostaniecie przy osobistym przekazaniu po sprawdzeniu dokumentów.',
    uk: 'PIN-коди отримаєте під час особистої передачі після перевірки документів.',
    'zh-Hant': 'PIN 碼在當面交接、查驗證件之後交給您。',
    sv: 'PIN-koderna får ni vid den personliga överlämningen, efter kontroll av handlingarna.',
    es: 'Los códigos PIN los reciben en la entrega personal, después de revisar los documentos.',
    hu: 'A PIN-kódokat a személyes átadáskor kapják meg, az iratok ellenőrzése után.',
  },
  {
    cs: 'Když do 20:00 nedorazíte ani se neozvete, jde o nedojezd.',
    en: 'If you do not arrive by 20:00 and do not contact us, it is a no-show.',
    de: 'Wenn Sie bis 20:00 nicht ankommen und sich nicht melden, gilt das als Nichtanreise.',
    pl: 'Gdy do 20:00 nie przyjedziecie i nie dacie znać, to niedojazd.',
    uk: 'Якщо до 20:00 не приїдете і не озветеся, це неявка.',
    'zh-Hant': '如果 20:00 前沒到，也沒有聯絡我們，視為未入住。',
    sv: 'Om ni inte är här senast 20:00 och inte hör av er, räknas det som utebliven ankomst.',
    es: 'Si a las 20:00 no han llegado y no han avisado, cuenta como no presentado.',
    hu: 'Ha 20:00-ig nem érkeznek meg, és nem is szólnak, az meg nem jelenés.',
  },
];

export const vstupCenik: LText = {
  cs: 'Příplatky po 20:00',
  en: 'Surcharges after 20:00',
  de: 'Zuschläge nach 20:00',
  pl: 'Dopłaty po 20:00',
  uk: 'Доплати після 20:00',
  'zh-Hant': '20:00 之後的加價',
  sv: 'Tillägg efter 20:00',
  es: 'Suplementos después de las 20:00',
  hu: 'Pótdíjak 20:00 után',
};

export const vstupPriplatek: LText = {
  cs: 'příplatek',
  en: 'surcharge',
  de: 'Zuschlag',
  pl: 'dopłata',
  uk: 'доплата',
  'zh-Hant': '加價',
  sv: 'tillägg',
  es: 'suplemento',
  hu: 'pótdíj',
};

export const vstupDo: LText = {
  cs: 'do',
  en: 'by',
  de: 'bis',
  pl: 'do',
  uk: 'до',
  'zh-Hant': '到',
  sv: 'till',
  es: 'hasta',
  hu: 'ig',
};

export const vstupPo23: LText = {
  cs: 'Po 23:00 · jen po domluvě',
  en: 'After 23:00 · only if we agree',
  de: 'Nach 23:00 · nur nach Absprache',
  pl: 'Po 23:00 · tylko po uzgodnieniu',
  uk: 'Після 23:00 · лише за домовленістю',
  'zh-Hant': '23:00 之後 · 只能事先說好',
  sv: 'Efter 23:00 · bara om vi kommer överens',
  es: 'Después de las 23:00 · solo si lo acordamos',
  hu: '23:00 után · csak megbeszélés után',
};

export const vstupPozde: LText = {
  cs: 'Po 23:00 jen po domluvě. Napište nám na +420 604 692 573.',
  en: 'After 23:00 only if we agree. Write to us at +420 604 692 573.',
  de: 'Nach 23:00 nur nach Absprache. Schreiben Sie uns an +420 604 692 573.',
  pl: 'Po 23:00 tylko po uzgodnieniu. Napiszcie na +420 604 692 573.',
  uk: 'Після 23:00 лише за домовленістю. Напишіть нам на +420 604 692 573.',
  'zh-Hant': '23:00 之後只能事先說好。請寫信到 +420 604 692 573。',
  sv: 'Efter 23:00 bara om vi kommer överens. Skriv till oss på +420 604 692 573.',
  es: 'Después de las 23:00 solo si lo acordamos. Escríbannos al +420 604 692 573.',
  hu: '23:00 után csak megbeszélés után. Írjanak a +420 604 692 573 számra.',
};

export const vstupBranaNadpis: LText = {
  cs: 'Bez registrace v bráně nezaparkujete',
  en: 'Without registration at the gate you cannot park',
  de: 'Ohne Anmeldung am Tor können Sie nicht parken',
  pl: 'Bez rejestracji w bramie nie zaparkujecie',
  uk: 'Без реєстрації на брамі ви не припаркуєтесь',
  'zh-Hant': '沒有在大門登記就無法停車',
  sv: 'Utan registrering vid grinden kan ni inte parkera',
  es: 'Sin registro en la barrera no pueden aparcar',
  hu: 'Kapuregisztráció nélkül nem tudnak parkolni',
};

export const vstupBranaText: LText = {
  cs: 'Číslo, ze kterého budete bránu otevírat, musíme zaregistrovat předem. Na poslední chvíli to nejde.',
  en: 'We must register the number you will use to open the gate in advance. It cannot be done at the last minute.',
  de: 'Die Nummer, mit der Sie das Tor öffnen, müssen wir vorher eintragen. In letzter Minute geht das nicht.',
  pl: 'Numer, z którego otworzycie bramę, musimy wpisać wcześniej. Na ostatnią chwilę się nie da.',
  uk: 'Номер, з якого відкриєте браму, треба зареєструвати заздалегідь. В останню мить це не вийде.',
  'zh-Hant': '用來開門的電話號碼必須事先登記。臨時來不及。',
  sv: 'Numret ni öppnar grinden med måste vi registrera i förväg. I sista stund går det inte.',
  es: 'El número con el que abrirán la barrera lo tenemos que registrar antes. En el último momento no se puede.',
  hu: 'A számot, amelyről a kaput nyitják, előre kell rögzítenünk. Az utolsó pillanatban ez nem megy.',
};

export const vstupChybaTelefon: LText = {
  cs: 'Číslo napište i s předvolbou, třeba',
  en: 'Write the number with the country code, for example',
  de: 'Schreiben Sie die Nummer mit der Vorwahl, zum Beispiel',
  pl: 'Numer wpiszcie z kierunkowym, na przykład',
  uk: 'Номер напишіть із кодом країни, наприклад',
  'zh-Hant': '請連國碼一起寫號碼，例如',
  sv: 'Skriv numret med landsnummer, till exempel',
  es: 'Escriban el número con el prefijo, por ejemplo',
  hu: 'A számot írják előhívóval, például',
};

export const vstupChybaTelefonKonec: LText = {
  cs: 'Bez ní vás brána nepustí.',
  en: 'Without it the gate will not let you in.',
  de: 'Ohne sie lässt Sie die Schranke nicht herein.',
  pl: 'Bez niego brama was nie wpuści.',
  uk: 'Без нього брама вас не впустить.',
  'zh-Hant': '沒有國碼，柵欄不會讓您進去。',
  sv: 'Utan det släpper grinden inte in er.',
  es: 'Sin él la barrera no les dejará entrar.',
  hu: 'Enélkül a kapu nem engedi be önöket.',
};

export const vstupChybaSpz: LText = {
  cs: 'Zkontrolujte SPZ. Stačí písmena a číslice.',
  en: 'Check the plate. Letters and digits are enough.',
  de: 'Prüfen Sie das Kennzeichen. Buchstaben und Ziffern genügen.',
  pl: 'Sprawdźcie tablicę. Wystarczą litery i cyfry.',
  uk: 'Перевірте номер авто. Досить літер і цифр.',
  'zh-Hant': '請檢查車牌。字母和數字即可。',
  sv: 'Kontrollera registreringsskylten. Bokstäver och siffror räcker.',
  es: 'Revisen la matrícula. Bastan letras y números.',
  hu: 'Ellenőrizzék a rendszámot. Betű és szám elég.',
};

export const vstupChybaUlozeni: LText = {
  cs: 'Uložení se nepovedlo. Napište nám na +420 604 692 573.',
  en: 'Saving did not work. Write to us at +420 604 692 573.',
  de: 'Das Speichern hat nicht geklappt. Schreiben Sie uns an +420 604 692 573.',
  pl: 'Zapis się nie udał. Napiszcie na +420 604 692 573.',
  uk: 'Не вдалося зберегти. Напишіть нам на +420 604 692 573.',
  'zh-Hant': '沒有存成功。請寫信到 +420 604 692 573。',
  sv: 'Det gick inte att spara. Skriv till oss på +420 604 692 573.',
  es: 'No se ha guardado. Escríbannos al +420 604 692 573.',
  hu: 'A mentés nem sikerült. Írjanak a +420 604 692 573 számra.',
};

export const vstupCeka: LText = {
  cs: 'Další kroky se ukážou, až vyplníte údaje výše.',
  en: 'The next steps will appear after you fill in the details above.',
  de: 'Die nächsten Schritte erscheinen, wenn Sie die Angaben oben ausfüllen.',
  pl: 'Dalsze kroki pokażą się, gdy wypełnicie dane powyżej.',
  uk: 'Наступні кроки з’являться, коли заповните дані вище.',
  'zh-Hant': '填完上面的資料後，才會出現後面的步驟。',
  sv: 'Nästa steg visas när ni har fyllt i uppgifterna ovan.',
  es: 'Los siguientes pasos aparecen cuando rellenen lo de arriba.',
  hu: 'A további lépések akkor jelennek meg, ha a fenti adatokat kitöltötték.',
};

export const vstupHotovo: LText = {
  cs: 'Apartmán je předaný.',
  en: 'The apartment has been handed over.',
  de: 'Das Apartment ist übergeben.',
  pl: 'Apartament jest przekazany.',
  uk: 'Апартаменти передано.',
  'zh-Hant': '公寓已經交接。',
  sv: 'Lägenheten är överlämnad.',
  es: 'El apartamento está entregado.',
  hu: 'Az apartman átadva.',
};

export const vstupHotovoOdkaz: LText = {
  cs: 'Kódy najdete níže.',
  en: 'You will find the codes below.',
  de: 'Die Codes finden Sie unten.',
  pl: 'Kody znajdziecie poniżej.',
  uk: 'Коди знайдете нижче.',
  'zh-Hant': '密碼在下面。',
  sv: 'Koderna finns nedan.',
  es: 'Los códigos están más abajo.',
  hu: 'A kódok lejjebb vannak.',
};

export const vstupUlozit: LText = {
  cs: 'Uložit',
  en: 'Save',
  de: 'Speichern',
  pl: 'Zapisz',
  uk: 'Зберегти',
  'zh-Hant': '儲存',
  sv: 'Spara',
  es: 'Guardar',
  hu: 'Mentés',
};

export const vstupZmenit: LText = {
  cs: 'Změnit',
  en: 'Change',
  de: 'Ändern',
  pl: 'Zmień',
  uk: 'Змінити',
  'zh-Hant': '修改',
  sv: 'Ändra',
  es: 'Cambiar',
  hu: 'Módosítás',
};

export const vstupPesky: LText = {
  cs: 'Pěšky, vlakem nebo autobusem',
  en: 'On foot, by train or by bus',
  de: 'Zu Fuß, mit dem Zug oder mit dem Bus',
  pl: 'Pieszo, pociągiem albo autobusem',
  uk: 'Пішки, поїздом або автобусом',
  'zh-Hant': '步行、火車或公車',
  sv: 'Till fots, med tåg eller buss',
  es: 'A pie, en tren o en autobús',
  hu: 'Gyalog, vonattal vagy autóbusszal',
};

export const vstupAutem: LText = {
  cs: 'Autem',
  en: 'By car',
  de: 'Mit dem Auto',
  pl: 'Samochodem',
  uk: 'Автомобілем',
  'zh-Hant': '開車',
  sv: 'Med bil',
  es: 'En coche',
  hu: 'Autóval',
};

export const vstupPo20: LText = {
  cs: 'Po 20:00',
  en: 'After 20:00',
  de: 'Nach 20:00',
  pl: 'Po 20:00',
  uk: 'Після 20:00',
  'zh-Hant': '20:00 之後',
  sv: 'Efter 20:00',
  es: 'Después de las 20:00',
  hu: '20:00 után',
};

export const vstupTelefon: LText = {
  cs: 'Telefon pro bránu',
  en: 'Phone for the gate',
  de: 'Telefon für das Tor',
  pl: 'Telefon do bramy',
  uk: 'Телефон для брами',
  'zh-Hant': '大門用的電話',
  sv: 'Telefon till grinden',
  es: 'Teléfono para la barrera',
  hu: 'Telefon a kapuhoz',
};

export const vstupSpz: LText = {
  cs: 'SPZ',
  en: 'Licence plate',
  de: 'Kennzeichen',
  pl: 'Tablica',
  uk: 'Номер авто',
  'zh-Hant': '車牌',
  sv: 'Registreringsnummer',
  es: 'Matrícula',
  hu: 'Rendszám',
};

export const vstupPripominkaSpz: LText = {
  cs: 'SPZ ještě chybí. Doplňte ji, až ji budete znát.',
  en: 'The plate is still missing. Add it when you know it.',
  de: 'Das Kennzeichen fehlt noch. Tragen Sie es ein, wenn Sie es kennen.',
  pl: 'Tablicy jeszcze nie ma. Dopiszcie ją, gdy ją poznacie.',
  uk: 'Номер авто ще бракує. Допишіть його, коли будете знати.',
  'zh-Hant': '車牌還沒有。知道以後請補上。',
  sv: 'Registreringsskylten saknas ännu. Fyll i den när ni vet den.',
  es: 'Falta la matrícula. Añádanla cuando la sepan.',
  hu: 'A rendszám még hiányzik. Írják be, amikor megtudják.',
};

export const vstupCekaCas: LText = {
  cs: 'Vyberte čas',
  en: 'Choose a time',
  de: 'Zeit wählen',
  pl: 'Wybierzcie godzinę',
  uk: 'Оберіть час',
  'zh-Hant': '選擇時間',
  sv: 'Välj tid',
  es: 'Elijan una hora',
  hu: 'Válasszanak időt',
};

export const vstupKolem: LText = {
  cs: 'Dorazíte kolem',
  en: 'You will arrive around',
  de: 'Sie kommen ungefähr um',
  pl: 'Dotrzecie około',
  uk: 'Приїдете близько',
  'zh-Hant': '大約',
  sv: 'Ni kommer omkring',
  es: 'Llegan alrededor de',
  hu: 'Körülbelül ekkor érkeznek',
};

export const vstupBranaKratce: LText = {
  cs: 'brána',
  en: 'gate',
  de: 'Tor',
  pl: 'brama',
  uk: 'брама',
  'zh-Hant': '大門',
  sv: 'grind',
  es: 'barrera',
  hu: 'kapu',
};

export const vstupSpzPozdeji: LText = {
  cs: 'SPZ doplníte později',
  en: 'You will add the plate later',
  de: 'Das Kennzeichen tragen Sie später ein',
  pl: 'Tablicę dopiszecie później',
  uk: 'Номер допишете пізніше',
  'zh-Hant': '車牌稍後補',
  sv: 'Skylten fyller ni i senare',
  es: 'La matrícula la añaden más tarde',
  hu: 'A rendszámot később írják be',
};

export const vstupPujcene: LText = {
  cs: 'Auto je půjčené, SPZ doplním později',
  en: 'The car is rented, I will add the plate later',
  de: 'Das Auto ist gemietet, das Kennzeichen trage ich später ein',
  pl: 'Auto jest wynajęte, tablicę dopiszę później',
  uk: 'Авто орендоване, номер допишу пізніше',
  'zh-Hant': '車子是租的，車牌稍後補',
  sv: 'Bilen är hyrd, jag fyller i skylten senare',
  es: 'El coche es de alquiler, la matrícula la añado más tarde',
  hu: 'Az autó bérelt, a rendszámot később írom be',
};

export const pinyNadpis: LText = {
  cs: 'Vaše vstupní PINy',
  en: 'Your entry PIN codes',
  de: 'Ihre Eingangs-PIN-Codes',
  pl: 'Wasze kody PIN do wejścia',
  uk: 'Ваші вхідні PIN-коди',
  'zh-Hant': '您的入口 PIN 碼',
  sv: 'Era PIN-koder för entrén',
  es: 'Sus códigos PIN de entrada',
  hu: 'A belépő PIN-kódjaik',
};

export const pinyCekaji: LText = {
  cs: 'Tady budou vaše PINy. Níže vyberte čas a způsob příjezdu a potvrďte pravidla.',
  en: 'Your PIN codes will be here. Below, choose the time and how you arrive, and confirm the rules.',
  de: 'Hier stehen dann Ihre PIN-Codes. Wählen Sie unten die Zeit und die Art der Anreise und bestätigen Sie die Regeln.',
  pl: 'Tu będą Wasze kody PIN. Niżej wybierzcie godzinę i sposób przyjazdu i potwierdźcie zasady.',
  uk: 'Тут будуть ваші PIN-коди. Нижче виберіть час і спосіб приїзду та підтвердьте правила.',
  'zh-Hant': 'PIN 碼會出現在這裡。請在下面選擇時間和抵達方式，並確認規則。',
  sv: 'Här kommer era PIN-koder. Nedan väljer ni tid och sätt att komma, och bekräftar reglerna.',
  es: 'Sus códigos PIN estarán aquí. Abajo elijan la hora y cómo llegan, y confirmen las reglas.',
  hu: 'Itt lesznek a PIN-kódok. Lent válasszák ki az időt és az érkezés módját, és erősítsék meg a szabályokat.',
};

export const pinyHotovo: LText = {
  cs: 'Hotovo. PINy se vám tady zobrazí při osobním předání.',
  en: 'Done. Your PIN codes will appear here at the personal handover.',
  de: 'Fertig. Die PIN-Codes erscheinen hier bei der persönlichen Übergabe.',
  pl: 'Gotowe. Kody PIN pokażą się tutaj przy osobistym przekazaniu.',
  uk: 'Готово. PIN-коди з’являться тут під час особистої передачі.',
  'zh-Hant': '完成了。PIN 碼會在當面交接時顯示在這裡。',
  sv: 'Klart. PIN-koderna visas här vid den personliga överlämningen.',
  es: 'Hecho. Sus códigos PIN aparecen aquí en la entrega personal.',
  hu: 'Kész. A PIN-kódok a személyes átadáskor jelennek meg itt.',
};

export const vstupCasPopisek: LText = {
  cs: 'Vyberte přibližný čas',
  en: 'Choose an approximate time',
  de: 'Wählen Sie eine ungefähre Zeit',
  pl: 'Wybierzcie przybliżoną godzinę',
  uk: 'Виберіть приблизний час',
  'zh-Hant': '選擇大約的時間',
  sv: 'Välj en ungefärlig tid',
  es: 'Elijan una hora aproximada',
  hu: 'Válasszanak hozzávetőleges időt',
};

export const vstupJak: LText = {
  cs: 'Jak přijedete',
  en: 'How you arrive',
  de: 'Wie Sie anreisen',
  pl: 'Jak przyjedziecie',
  uk: 'Як ви приїдете',
  'zh-Hant': '您如何抵達',
  sv: 'Hur ni kommer',
  es: 'Cómo llegan',
  hu: 'Hogyan érkeznek',
};

export const vstupUlozitPiny: LText = {
  cs: 'Uložit a pokračovat k PINům',
  en: 'Save and continue to the PIN codes',
  de: 'Speichern und weiter zu den PIN-Codes',
  pl: 'Zapisz i przejdź do kodów PIN',
  uk: 'Зберегти і далі до PIN-кодів',
  'zh-Hant': '儲存並前往 PIN 碼',
  sv: 'Spara och gå vidare till PIN-koderna',
  es: 'Guardar y seguir a los códigos PIN',
  hu: 'Mentés, és tovább a PIN-kódokhoz',
};

export const vstupChybiCas: LText = {
  cs: 'Vyberte čas.',
  en: 'Choose a time.',
  de: 'Wählen Sie eine Zeit.',
  pl: 'Wybierzcie godzinę.',
  uk: 'Виберіть час.',
  'zh-Hant': '請選擇時間。',
  sv: 'Välj en tid.',
  es: 'Elijan una hora.',
  hu: 'Válasszanak időt.',
};

export const vstupChybiZpusob: LText = {
  cs: 'Vyberte, jak přijedete.',
  en: 'Choose how you arrive.',
  de: 'Wählen Sie, wie Sie anreisen.',
  pl: 'Wybierzcie, jak przyjedziecie.',
  uk: 'Виберіть, як приїдете.',
  'zh-Hant': '請選擇抵達方式。',
  sv: 'Välj hur ni kommer.',
  es: 'Elijan cómo llegan.',
  hu: 'Válasszák ki, hogyan érkeznek.',
};

export const vstupChybiPravidla: LText = {
  cs: 'Potvrďte pravidla příjezdu.',
  en: 'Confirm the arrival rules.',
  de: 'Bestätigen Sie die Ankunftsregeln.',
  pl: 'Potwierdźcie zasady przyjazdu.',
  uk: 'Підтвердьте правила приїзду.',
  'zh-Hant': '請確認抵達規則。',
  sv: 'Bekräfta ankomstreglerna.',
  es: 'Confirmen las reglas de llegada.',
  hu: 'Erősítsék meg az érkezési szabályokat.',
};

export const vstupPeskyKratce: LText = {
  cs: 'pěšky',
  en: 'on foot',
  de: 'zu Fuß',
  pl: 'pieszo',
  uk: 'пішки',
  'zh-Hant': '步行',
  sv: 'till fots',
  es: 'a pie',
  hu: 'gyalog',
};

export const vstupAutemKratce: LText = {
  cs: 'autem',
  en: 'by car',
  de: 'mit dem Auto',
  pl: 'samochodem',
  uk: 'автомобілем',
  'zh-Hant': '開車',
  sv: 'med bil',
  es: 'en coche',
  hu: 'autóval',
};

export const vstupRadek: LText = {
  cs: 'Příjezd kolem',
  en: 'Arrival around',
  de: 'Ankunft gegen',
  pl: 'Przyjazd około',
  uk: 'Приїзд близько',
  'zh-Hant': '大約',
  sv: 'Ankomst omkring',
  es: 'Llegada alrededor de',
  hu: 'Érkezés körülbelül',
};

export const vstupPravidlaOk: LText = {
  cs: 'pravidla potvrzena',
  en: 'rules confirmed',
  de: 'Regeln bestätigt',
  pl: 'zasady potwierdzone',
  uk: 'правила підтверджено',
  'zh-Hant': '規則已確認',
  sv: 'reglerna bekräftade',
  es: 'reglas confirmadas',
  hu: 'szabályok megerősítve',
};

export const vstupZamekCesta: LText = {
  cs: 'Cesta k nám',
  en: 'The way to us',
  de: 'Der Weg zu uns',
  pl: 'Droga do nas',
  uk: 'Шлях до нас',
  'zh-Hant': '來我們這裡的路',
  sv: 'Vägen till oss',
  es: 'El camino hasta nosotros',
  hu: 'Az út hozzánk',
};

export const vstupZamekParkovani: LText = {
  cs: 'Parkování a brána',
  en: 'Parking and the gate',
  de: 'Parken und das Tor',
  pl: 'Parking i brama',
  uk: 'Паркування і брама',
  'zh-Hant': '停車和大門',
  sv: 'Parkering och grinden',
  es: 'Aparcamiento y barrera',
  hu: 'Parkolás és a kapu',
};

export const vstupZamekWifi: LText = {
  cs: 'WiFi',
  en: 'WiFi',
  de: 'WLAN',
  pl: 'WiFi',
  uk: 'WiFi',
  'zh-Hant': 'WiFi',
  sv: 'WiFi',
  es: 'WiFi',
  hu: 'WiFi',
};

export const vstupViteji: LText = {
  cs: 'Těšíme se, až vás přivítáme.',
  en: 'We look forward to welcoming you.',
  de: 'Wir freuen uns darauf, Sie willkommen zu heißen.',
  pl: 'Cieszymy się, że Was przywitamy.',
  uk: 'Раді будемо вас привітати.',
  'zh-Hant': '期待迎接您。',
  sv: 'Vi ser fram emot att välkomna er.',
  es: 'Nos alegra recibirles.',
  hu: 'Örülünk, hogy üdvözölhetjük önöket.',
};
