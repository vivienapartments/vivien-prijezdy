/**
 * Doplní chybějící uk / pl / zh-Hant do src/data/pruvodce.json.
 * Spuštění: node scripts/fill-pruvodce-langs.mjs
 */
import fs from 'fs';

/** @type {Record<string, { uk: string; pl: string; 'zh-Hant': string }>} */
const byCs = {
  'Přijedete autem? Napište nám hned': {
    uk: 'Приїжджаєте автомобілем? Напишіть нам одразу',
    pl: 'Przyjeżdżacie samochodem? Napiszcie do nas od razu',
    'zh-Hant': '開車前來？請立刻寫訊息給我們',
  },
  'Parkovací stání vám zajistíme, jen když nám co nejdříve pošlete SMS nebo zprávu na číslo +420 777 702 272. Nejlépe hned teď. Uveďte v ní:':
    {
      uk: 'Паркувальне місце можемо забронювати, лише якщо якомога швидше надішлете SMS або повідомлення на номер +420 777 702 272. Найкраще просто зараз. Укажіть у ньому:',
      pl: 'Miejsce parkingowe zarezerwujemy tylko wtedy, gdy jak najszybciej wyślecie SMS lub wiadomość na numer +420 777 702 272. Najlepiej zaraz. Podajcie w niej:',
      'zh-Hant': '只有您盡快傳簡訊或訊息到 +420 777 702 272，我們才能為您保留車位。最好現在就傳。請寫明：',
    },
  'že máte zájem o parkovací stání,': {
    uk: 'що вам потрібне паркувальне місце,',
    pl: 'że chcecie miejsce parkingowe,',
    'zh-Hant': '您需要停車位，',
  },
  'telefonní číslo, ze kterého budete otevírat bránu parkoviště,': {
    uk: 'номер телефону, з якого відкриватимете ворота парковки,',
    pl: 'numer telefonu, z którego będziecie otwierać bramę parkingu,',
    'zh-Hant': '用來開啟停車場大門的電話號碼，',
  },
  'registrační značku (SPZ) vašeho auta.': {
    uk: 'реєстраційний номер вашого авто.',
    pl: 'numer rejestracyjny Waszego samochodu.',
    'zh-Hant': '您的車牌號碼。',
  },
  'Číslo musíme předem zaregistrovat v bráně, proto to nejde řešit až na poslední chvíli. Bez této zprávy vám stání bohužel zajistit nemůžeme.':
    {
      uk: 'Номер треба заздалегідь зареєструвати в системі воріт, тому це не можна відкладати на останню мить. Без цього повідомлення місце на жаль забезпечити не можемо.',
      pl: 'Numer musimy wcześniej zarejestrować w systemie bramy, więc nie da się tego załatwić na ostatnią chwilę. Bez tej wiadomości niestety nie możemy zapewnić miejsca.',
      'zh-Hant': '我們必須事先把號碼登記到大門系統，所以不能拖到最後一刻。沒有這則訊息，我們無法為您保留車位。',
    },
  'Příjezd k domu': {
    uk: 'Приїзд до будинку',
    pl: 'Przyjazd do domu',
    'zh-Hant': '抵達房屋',
  },
  'Brána parkoviště': {
    uk: 'Ворота парковки',
    pl: 'Brama parkingu',
    'zh-Hant': '停車場大門',
  },
  'Kdy je brána otevřená': {
    uk: 'Коли ворота відкриті',
    pl: 'Kiedy brama jest otwarta',
    'zh-Hant': '大門何時開啟',
  },
  'Ve všední dny (pondělí až pátek) je brána otevřená od 6:00 do 18:00. Večer, v noci a o víkendu celý den je zavřená. Otevřete si ji telefonním hovorem na číslo {{BRANA_TELEFON}}. Hovor nikdo nepřijme: ozve se obsazovací tón a brána se začne otevírat.':
    {
      uk: 'У будні (понеділок-п’ятниця) ворота відкриті з 6:00 до 18:00. Увечері, вночі та у вихідні весь день вони зачинені. Відкрийте їх телефонним дзвінком на {{BRANA_TELEFON}}. Ніхто не відповість: прозвучить сигнал зайнято й ворота почнуть відкриватися.',
      pl: 'W dni powszednie (poniedziałek-piątek) brama jest otwarta od 6:00 do 18:00. Wieczorem, w nocy i w weekend przez cały dzień jest zamknięta. Otworzycie ją zwykłym połączeniem na {{BRANA_TELEFON}}. Nikt nie odbierze: usłyszycie sygnał zajętości i brama zacznie się otwierać.',
      'zh-Hant': '平日（週一至週五）大門 6:00-18:00 開啟。傍晚、夜間與週末全天關閉。請撥打 {{BRANA_TELEFON}} 開啟。無人接聽：會聽到忙線音，大門隨即開啟。',
    },
  'Aby se brána otevřela': {
    uk: 'Щоб ворота відкрилися',
    pl: 'Żeby brama się otworzyła',
    'zh-Hant': '要讓大門開啟',
  },
  'Volejte z telefonního čísla, které jste nám předem nahlásili. Máte-li v telefonu dvě SIM karty, volejte z té s nahlášeným číslem.':
    {
      uk: 'Телефонуйте з номера, який ви нам раніше повідомили. Якщо в телефоні дві SIM-картки, телефонуйте з тієї з повідомленим номером.',
      pl: 'Dzwońcie z numeru, który wcześniej nam podaliście. Jeśli telefon ma dwie karty SIM, dzwońcie z tej z podanym numerem.',
      'zh-Hant': '請用您事先告知我們的號碼撥打。若手機有雙 SIM，請用已登記的那張卡撥打。',
    },
  'Volejte běžným telefonním hovorem, ne přes WhatsApp ani jinou aplikaci.': {
    uk: 'Телефонуйте звичайним дзвінком, не через WhatsApp чи інший застосунок.',
    pl: 'Dzwońcie zwykłym połączeniem, nie przez WhatsApp ani inną aplikację.',
    'zh-Hant': '請用一般電話撥打，不要用 WhatsApp 或其他 App。',
  },
  'Vaše číslo nesmí být skryté (vypněte skrývání čísla volajícího).': {
    uk: 'Ваш номер не повинен бути прихованим (вимкніть приховування номера).',
    pl: 'Wasze numer nie może być ukryty (wyłączcie ukrywanie numeru).',
    'zh-Hant': '號碼不可隱藏（請關閉隱藏來電號碼）。',
  },
  'Brána se neotevírá?': {
    uk: 'Ворота не відкриваються?',
    pl: 'Brama się nie otwiera?',
    'zh-Hant': '大門打不開？',
  },
  'Zavolejte nám na +420 777 702 272. Pokud se nedovoláte, volejte Nikol na +420 702 153 573.':
    {
      uk: 'Зателефонуйте нам на +420 777 702 272. Якщо не додзвонитеся, телефонуйте Nikol на +420 702 153 573.',
      pl: 'Zadzwońcie do nas na +420 777 702 272. Jeśli nie dodzwonicie się, dzwońcie do Nikol na +420 702 153 573.',
      'zh-Hant': '請撥打 +420 777 702 272。若打不通，請打給 Nikol：+420 702 153 573。',
    },
  'Parkování: cesta na vaše stání': {
    uk: 'Парковка: шлях до вашого місця',
    pl: 'Parking: droga do Waszego miejsca',
    'zh-Hant': '停車：前往您的車位',
  },
  'Přehled parkoviště': {
    uk: 'Огляд парковки',
    pl: 'Przegląd parkingu',
    'zh-Hant': '停車場概覽',
  },
  '': { uk: '', pl: '', 'zh-Hant': '' },
  'Příjezd z ulice': {
    uk: 'Приїзд з вулиці',
    pl: 'Wjazd z ulicy',
    'zh-Hant': '從街道進入',
  },
  'Orientační bod je roh budovy s nápisem LIBRA ELECTRONICS (tu vidíte z čela). Vjezd na parkoviště je u hnědého plotu s cedulí „Parkovací místa“.':
    {
      uk: ' орієнтир — кут будівлі з написом LIBRA ELECTRONICS (видно спереду). В’їзд на парковку біля коричневого паркану з табличкою «Parkovací místa».',
      pl: 'Punktem orientacyjnym jest róg budynku z napisem LIBRA ELECTRONICS (widać go z przodu). Wjazd na parking jest przy brązowym płocie z tabliczką „Parkovací místa”.',
      'zh-Hant': '地標是寫著 LIBRA ELECTRONICS 的大樓轉角（正面可見）。停車場入口在棕色圍籬旁，有「Parkovací místa」標誌。',
    },
  'Ke průjezdu': {
    uk: 'До проїзду',
    pl: 'Do przejazdu',
    'zh-Hant': '前往通道',
  },
  'Vjeďte do dvora a pokračujte k průjezdu pod kulatou cedulí NuArt (vpravo je zeď s nápisem ELECTRONICS).':
    {
      uk: 'Заїдьте у двір і прямуйте до проїзду під круглою табличкою NuArt (праворуч стіна з написом ELECTRONICS).',
      pl: 'Wjedźcie na dziedziniec i jedźcie do przejazdu pod okrągłą tabliczką NuArt (po prawej ściana z napisem ELECTRONICS).',
      'zh-Hant': '駛進院子，朝圓形 NuArt 標誌下的通道前進（右側牆面寫著 ELECTRONICS）。',
    },
  'Projeďte průjezdem': {
    uk: 'Проїдьте проїздом',
    pl: 'Przejedźcie przez przejazd',
    'zh-Hant': '駛過通道',
  },
  'Průjezdem projedete na druhou stranu. Brána má omezení výšky 3,3 m, pozor na výšku vozidla.':
    {
      uk: 'Проїздом виїдете на інший бік. Ворота мають обмеження висоти 3,3 м, зважайте на висоту авто.',
      pl: 'Przejazdem wyjedziecie na drugą stronę. Brama ma ograniczenie wysokości 3,3 m, uważajcie na wysokość pojazdu.',
      'zh-Hant': '穿過通道到另一側。大門限高 3.3 公尺，請注意車高。',
    },
  'Za průjezdem jemně doprava': {
    uk: 'Після проїзду трохи праворуч',
    pl: 'Za przejazdem lekko w prawo',
    'zh-Hant': '過通道後稍向右',
  },
  'Za průjezdem se dejte jemně doprava. Parkovací stání jsou podél protější stěny.':
    {
      uk: 'Після проїзду тримайтеся трохи праворуч. Паркувальні місця вздовж протилежної стіни.',
      pl: 'Za przejazdem trzymajcie się lekko w prawo. Miejsca parkingowe są wzdłuż przeciwległej ściany.',
      'zh-Hant': '過通道後稍靠右。車位在對面牆邊。',
    },
  'Cíl: stání č. 14': {
    uk: 'Мета: місце № 14',
    pl: 'Cel: miejsce nr 14',
    'zh-Hant': '目的地：車位 14 號',
  },
  'Vaše místo je zlaté „Gentle Harmony 14“ u zdi. Zaparkujte prosím pouze zde.': {
    uk: 'Ваше місце — золоте «Gentle Harmony 14» біля стіни. Паркуйтеся лише тут.',
    pl: 'Wasze miejsce to złote „Gentle Harmony 14” przy ścianie. Parkujcie proszę tylko tutaj.',
    'zh-Hant': '您的車位是牆邊金色的「Gentle Harmony 14」。請只停在這裡。',
  },
  'Za průjezdem doleva. Stání č. 25': {
    uk: 'Після проїзду ліворуч. Місце № 25',
    pl: 'Za przejazdem w lewo. Miejsce nr 25',
    'zh-Hant': '過通道後左轉。車位 25 號',
  },
  'Za průjezdem odbočte doleva. Vaše místo je podélné stání, první v pořadí (hned u rohu budovy), č. 25 „Golden Balance“ (zlaté). Zaparkujte prosím pouze zde.':
    {
      uk: 'Після проїзду поверніть ліворуч. Ваше місце — поздовжнє, перше в ряду (одразу біля кута будівлі), № 25 «Golden Balance» (золоте). Паркуйтеся лише тут.',
      pl: 'Za przejazdem skręćcie w lewo. Wasze miejsce to miejsce wzdłużne, pierwsze w rzędzie (zaraz przy rogu budynku), nr 25 „Golden Balance” (złote). Parkujcie proszę tylko tutaj.',
      'zh-Hant': '過通道後左轉。您的車位是縱向車位，整排第一個（就在大樓轉角），25 號「Golden Balance」（金色）。請只停在這裡。',
    },
  'Za průjezdem doleva. Stání č. 26': {
    uk: 'Після проїзду ліворуч. Місце № 26',
    pl: 'Za przejazdem w lewo. Miejsce nr 26',
    'zh-Hant': '過通道後左轉。車位 26 號',
  },
  'Za průjezdem odbočte doleva. Vaše místo je podélné stání, druhé v pořadí (uprostřed, mezi 25 a 27), č. 26 „Evening Elegance“ (modré). Zaparkujte prosím pouze zde.':
    {
      uk: 'Після проїзду поверніть ліворуч. Ваше місце — поздовжнє, друге в ряду (посередині, між 25 і 27), № 26 «Evening Elegance» (синє). Паркуйтеся лише тут.',
      pl: 'Za przejazdem skręćcie w lewo. Wasze miejsce to miejsce wzdłużne, drugie w rzędzie (w środku, między 25 a 27), nr 26 „Evening Elegance” (niebieskie). Parkujcie proszę tylko tutaj.',
      'zh-Hant': '過通道後左轉。您的車位是縱向車位，整排第二個（中間，在 25 與 27 之間），26 號「Evening Elegance」（藍色）。請只停在這裡。',
    },
  'Za průjezdem doleva. Stání č. 27': {
    uk: 'Після проїзду ліворуч. Місце № 27',
    pl: 'Za przejazdem w lewo. Miejsce nr 27',
    'zh-Hant': '過通道後左轉。車位 27 號',
  },
  'Za průjezdem odbočte doleva. Vaše místo je podélné stání, třetí v pořadí, č. 27 „Noble Contrast“ (zelené). Zaparkujte prosím pouze zde.':
    {
      uk: 'Після проїзду поверніть ліворуч. Ваше місце — поздовжнє, третє в ряду, № 27 «Noble Contrast» (зелене). Паркуйтеся лише тут.',
      pl: 'Za przejazdem skręćcie w lewo. Wasze miejsce to miejsce wzdłużne, trzecie w rzędzie, nr 27 „Noble Contrast” (zielone). Parkujcie proszę tylko tutaj.',
      'zh-Hant': '過通道後左轉。您的車位是縱向車位，整排第三個，27 號「Noble Contrast」（綠色）。請只停在這裡。',
    },
  'Odbočte doprava': {
    uk: 'Поверніть праворуч',
    pl: 'Skręćcie w prawo',
    'zh-Hant': '右轉',
  },
  'Průjezdem rovně dozadu neprojíždíte (podjezd s cedulí NuArt). Ještě před ním odbočte doprava, za roh budovy.':
    {
      uk: 'Прямо назад через проїзд не їдьте (під’їзд з табличкою NuArt). Ще перед ним поверніть праворуч, за ріг будівлі.',
      pl: 'Nie jedźcie prosto do tyłu przez przejazd (przejazd z tabliczką NuArt). Jeszcze przed nim skręćcie w prawo, za róg budynku.',
      'zh-Hant': '不要直行穿過後方通道（有 NuArt 標誌的通道）。在通道前右轉，繞過大樓轉角。',
    },
  'Kolem brány a kontejneru': {
    uk: 'Повз ворота й контейнер',
    pl: 'Obok bramy i kontenera',
    'zh-Hant': '經過大門與垃圾桶',
  },
  'Bránou s omezením výšky 3,3 m neprojíždíte. Míjíte kontejner a po pravé straně se otevře dlážděná plocha.':
    {
      uk: 'Через ворота з обмеженням висоти 3,3 м не проїжджайте. Минаєте контейнер, і праворуч відкривається брукована площадка.',
      pl: 'Nie przejeżdżajcie przez bramę z ograniczeniem wysokości 3,3 m. Mijacie kontener i po prawej stronie otwiera się brukowana przestrzeń.',
      'zh-Hant': '不要駛過限高 3.3 公尺的大門。經過垃圾桶後，右側會出現鋪面場地。',
    },
  'Dlážděná plocha': {
    uk: 'Брукована площадка',
    pl: 'Brukowana przestrzeń',
    'zh-Hant': '鋪面場地',
  },
  'Pokračujte po dlážděné (zámkové) ploše.': {
    uk: 'Продовжуйте брукованою (замковою) площадкою.',
    pl: 'Jedźcie dalej po brukowanej nawierzchni.',
    'zh-Hant': '繼續沿著鋪面行駛。',
  },
  'Cíl: stání č. 43': {
    uk: 'Мета: місце № 43',
    pl: 'Cel: miejsce nr 43',
    'zh-Hant': '目的地：車位 43 號',
  },
  'Po pravé straně uvidíte své místo č. 43 (u plotu s modrou šipkou). Zaparkujte prosím pouze zde.':
    {
      uk: 'Праворуч побачите своє місце № 43 (біля паркану з синьою стрілкою). Паркуйтеся лише тут.',
      pl: 'Po prawej stronie zobaczycie swoje miejsce nr 43 (przy płocie z niebieską strzałką). Parkujcie proszę tylko tutaj.',
      'zh-Hant': '右側會看到您的車位 43 號（藍色箭頭圍籬旁）。請只停在這裡。',
    },
  'Důležité': {
    uk: 'Важливо',
    pl: 'Ważne',
    'zh-Hant': '重要',
  },
  'Parkujte prosím POUZE na svém přiděleném místě, stání č. {{STANI}}.': {
    uk: 'Паркуйтеся ЛИШЕ на своєму призначеному місці, місце № {{STANI}}.',
    pl: 'Parkujcie proszę TYLKO na swoim przydzielonym miejscu, nr {{STANI}}.',
    'zh-Hant': '請只停在您指定的車位 {{STANI}} 號。',
  },
  'Z parkoviště zpět k domu': {
    uk: 'З парковки назад до будинку',
    pl: 'Z parkingu z powrotem do domu',
    'zh-Hant': '從停車場返回房屋',
  },
  WiFi: { uk: 'WiFi', pl: 'WiFi', 'zh-Hant': 'WiFi' },
  'WiFi přístup': {
    uk: 'Доступ до WiFi',
    pl: 'Dostęp WiFi',
    'zh-Hant': 'WiFi 連線',
  },
  'Připojení k síti': {
    uk: 'Підключення до мережі',
    pl: 'Połączenie z siecią',
    'zh-Hant': '網路連線',
  },
  'Název sítě (SSID)': {
    uk: 'Назва мережі (SSID)',
    pl: 'Nazwa sieci (SSID)',
    'zh-Hant': '網路名稱 (SSID)',
  },
  Heslo: { uk: 'Пароль', pl: 'Hasło', 'zh-Hant': '密碼' },
  Zabezpečení: {
    uk: 'Захист',
    pl: 'Zabezpieczenie',
    'zh-Hant': '安全性',
  },
  'Naskenujte pro přímé připojení': {
    uk: 'Відскануйте для прямого підключення',
    pl: 'Zeskanujcie, by połączyć się od razu',
    'zh-Hant': '掃描即可直接連線',
  },
  'Cesta na zahradu': {
    uk: 'Шлях у сад',
    pl: 'Droga do ogrodu',
    'zh-Hant': '前往花園',
  },
  'Schody dolů': {
    uk: 'Сходами вниз',
    pl: 'Schodami w dół',
    'zh-Hant': '下樓',
  },
  'Ze svého patra sejděte po schodech dolů do přízemí. Na konci chodby uvidíte prosklené dveře vedoucí do zahrady.':
    {
      uk: 'Зі свого поверху спустіться сходами на перший поверх. У кінці коридору побачите скляні двері в сад.',
      pl: 'Ze swojego piętra zejdźcie schodami na parter. Na końcu korytarza zobaczycie szklane drzwi do ogrodu.',
      'zh-Hant': '從您的樓層下樓到一樓。走廊盡頭會看到通往花園的玻璃門。',
    },
  'Prosklené dveře': {
    uk: 'Скляні двері',
    pl: 'Szklane drzwi',
    'zh-Hant': '玻璃門',
  },
  'Prosklené dveře jsou na konci přízemní chodby. Na pravé straně vedle dveří je kódová klávesnice.':
    {
      uk: 'Скляні двері в кінці коридору на першому поверсі. Праворуч біля дверей — кодова клавіатура.',
      pl: 'Szklane drzwi są na końcu korytarza na parterze. Po prawej obok drzwi jest klawiatura kodowa.',
      'zh-Hant': '玻璃門在一樓走廊盡頭。門右側有密碼鍵盤。',
    },
  'Zadání kódu': {
    uk: 'Введення коду',
    pl: 'Wpisanie kodu',
    'zh-Hant': '輸入密碼',
  },
  'Zadejte kód na klávesnici a potvrďte. Dveře se odemknou a otevřou do zahrady.': {
    uk: 'Введіть код на клавіатурі й підтвердіть. Двері відімкнуться й відкриються в сад.',
    pl: 'Wpiszcie kod na klawiaturze i potwierdźcie. Drzwi się odblokują i otworzą do ogrodu.',
    'zh-Hant': '在鍵盤輸入密碼並確認。門會解鎖並通往花園。',
  },
  'Kód na zahradu': {
    uk: 'Код до саду',
    pl: 'Kod do ogrodu',
    'zh-Hant': '花園密碼',
  },
  'Jste v zahradě': {
    uk: 'Ви в саду',
    pl: 'Jesteście w ogrodzie',
    'zh-Hant': '您已在花園',
  },
  'Dveře vedou do klidné zahrady. Je tu zeleň a posezení, stranou od ruchu města.': {
    uk: 'Двері ведуть у тихий сад. Тут зелень і місце посидіти, осторонь міського шуму.',
    pl: 'Drzwi prowadzą do spokojnego ogrodu. Jest tu zieleń i miejsce do siedzenia, z dala od miejskiego zgiełku.',
    'zh-Hant': '門通往安靜的花園。有綠意與座位，遠離市區喧鬧。',
  },
  'Tichý kout v zahradě': {
    uk: 'Тихий куточок у саду',
    pl: 'Cichy zakątek w ogrodzie',
    'zh-Hant': '花園裡安靜的一角',
  },
  'K odpočinku': {
    uk: 'Для відпочинку',
    pl: 'Na odpoczynek',
    'zh-Hant': '休息用',
  },
  'Ráno i podvečer': {
    uk: 'Вранці й увечері',
    pl: 'Rano i pod wieczór',
    'zh-Hant': '早晨與傍晚',
  },
  'Ráno si tu dáte kávu, odpoledne sedíte ve stínu. Po dni ve městě je to dobré místo i na sklenku vína.':
    {
      uk: 'Вранці тут можна випити каву, вдень посидіти в тіні. Після дня в місті це добре місце й на келих вина.',
      pl: 'Rano wypijecie tu kawę, po południu usiądziecie w cieniu. Po dniu w mieście to też dobre miejsce na kieliszek wina.',
      'zh-Hant': '早上可以在這裡喝咖啡，下午坐在陰涼處。在城裡逛完一天後，也很適合喝杯酒。',
    },
  'Sdílený prostor': {
    uk: 'Спільний простір',
    pl: 'Wspólna przestrzeń',
    'zh-Hant': '共用空間',
  },
  Ohleduplnost: {
    uk: 'Ввічливість',
    pl: 'Względność',
    'zh-Hant': '請互相體諒',
  },
  'Zahradu sdílejí hosté více apartmánů. Prosíme o klid, čistotu a ohled k ostatním. Ať si ji užije každý stejně.':
    {
      uk: 'Садом користуються гості кількох апартаментів. Просимо про тишу, чистоту й повагу до інших. Нехай ним насолоджуються всі однаково.',
      pl: 'Z ogrodu korzystają goście kilku apartamentów. Prosimy o ciszę, czystość i wzgląd na innych. Niech cieszą się nim wszyscy tak samo.',
      'zh-Hant': '花園由多間公寓的客人共用。請保持安靜、整潔並體諒他人，讓大家都能好好使用。',
    },
  'Při odchodu': {
    uk: 'При виході',
    pl: 'Przy wyjściu',
    'zh-Hant': '離開時',
  },
  'Dveře zavírejte': {
    uk: 'Зачиняйте двері',
    pl: 'Zamykajcie drzwi',
    'zh-Hant': '請關好門',
  },
  'Při návratu zkontrolujte, že se dveře řádně dovřely. Kód si vezměte s sebou.': {
    uk: 'Повертаючись, перевірте, що двері добре зачинилися. Код візьміть із собою.',
    pl: 'Przy powrocie sprawdźcie, że drzwi dobrze się zamknęły. Kod zabierzcie ze sobą.',
    'zh-Hant': '回來時請確認門已關好。請隨身帶著密碼。',
  },
  'Posezení venku': {
    uk: 'Місце для сидіння надворі',
    pl: 'Miejsce do siedzenia na zewnątrz',
    'zh-Hant': '戶外座位',
  },
  'K posezení venku máte svou terasu. Když jsou křesílka dole v zahradě volná, můžete je využít i vy. Jsou ale určená hlavně hostům apartmánů, které terasu nemají. Děkujeme za ohleduplnost.':
    {
      uk: 'Для сидіння надворі у вас є своя тераса. Якщо крісла внизу в саду вільні, можете скористатися й ви. Але вони призначені головно для гостей апартаментів без тераси. Дякуємо за ввічливість.',
      pl: 'Do siedzenia na zewnątrz macie swoją taras. Jeśli fotele na dole w ogrodzie są wolne, możecie z nich też skorzystać. Są jednak przeznaczone głównie dla gości apartamentów bez tarasu. Dziękujemy za względność.',
      'zh-Hant': '戶外座位您有自己的露台。若花園下方的椅子空著，您也可以使用。不過它們主要是給沒有露台的公寓客人。謝謝體諒。',
    },
  Televize: { uk: 'Телевізор', pl: 'Telewizja', 'zh-Hant': '電視' },
  'Pravidla pobytu': {
    uk: 'Правила перебування',
    pl: 'Zasady pobytu',
    'zh-Hant': '住宿規則',
  },
  Odjezd: { uk: 'Виїзд', pl: 'Wyjazd', 'zh-Hant': '退房' },
  'Časy a kontakt': {
    uk: 'Час і контакт',
    pl: 'Godziny i kontakt',
    'zh-Hant': '時間與聯絡',
  },
  Časy: { uk: 'Час', pl: 'Godziny', 'zh-Hant': '時間' },
  'Check-in 14:00 až 20:00, check-out do 10:00.': {
    uk: 'Check-in 14:00-20:00, check-out до 10:00.',
    pl: 'Check-in 14:00-20:00, check-out do 10:00.',
    'zh-Hant': '入住 14:00-20:00，退房至 10:00。',
  },
  Kontakt: { uk: 'Контакт', pl: 'Kontakt', 'zh-Hant': '聯絡' },
  'Nikol: +420 702 153 573 · info@vivienapartments.cz': {
    uk: 'Nikol: +420 702 153 573 · info@vivienapartments.cz',
    pl: 'Nikol: +420 702 153 573 · info@vivienapartments.cz',
    'zh-Hant': 'Nikol: +420 702 153 573 · info@vivienapartments.cz',
  },
};

// Fix accidental leading space in one UK string
byCs[
  'Orientační bod je roh budovy s nápisem LIBRA ELECTRONICS (tu vidíte z čela). Vjezd na parkoviště je u hnědého plotu s cedulí „Parkovací místa“.'
].uk =
  'Орієнтир — кут будівлі з написом LIBRA ELECTRONICS (видно спереду). В’їзд на парковку біля коричневого паркану з табличкою «Parkovací místa».';

function fill(obj) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach(fill);
    return;
  }
  const keys = Object.keys(obj);
  if (
    (keys.includes('cs') || keys.includes('en')) &&
    (typeof obj.cs === 'string' || typeof obj.en === 'string')
  ) {
    const cs = obj.cs ?? '';
    const tr = byCs[cs];
    if (tr) {
      if (!obj.uk?.trim()) obj.uk = tr.uk;
      if (!obj.pl?.trim()) obj.pl = tr.pl;
      if (!obj['zh-Hant']?.trim()) obj['zh-Hant'] = tr['zh-Hant'];
    } else if (cs === '' && obj.en === '') {
      obj.uk = obj.uk ?? '';
      obj.pl = obj.pl ?? '';
      obj['zh-Hant'] = obj['zh-Hant'] ?? '';
    } else {
      console.warn('MISSING MAP:', JSON.stringify(cs).slice(0, 80));
    }
  }
  for (const k of keys) {
    if (['cs', 'en', 'de', 'pl', 'uk', 'zh-Hant'].includes(k)) continue;
    fill(obj[k]);
  }
}

const path = 'src/data/pruvodce.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
fill(data);
fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log('updated', path);
