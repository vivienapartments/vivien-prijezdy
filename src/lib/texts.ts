import type { LText } from './types';

/** Schválené texty z náhledu ve vivien (ne z XLF). */

export const fasadaNadpis: LText = {
  cs: 'Náš dům z ulice',
  en: 'Our house from the street',
  de: 'Unser Haus von der Straße',
  pl: 'Nasz dom od strony ulicy',
  uk: 'Наш будинок з вулиці',
  'zh-Hant': '從街上看到的房子',
};

export const fasadaText: LText = {
  cs: 'Takhle dům vypadá, až k nám přijedete. Hledejte zelenou fasádu na Nádražní.',
  en: 'This is how the house looks when you arrive. Look for the green façade on Nádražní.',
  de: 'So sieht das Haus aus, wenn Sie ankommen. Suchen Sie die grüne Fassade an der Nádražní.',
  pl: 'Tak wygląda dom, gdy do nas dojedziecie. Szukajcie zielonej elewacji przy Nádražní.',
  uk: 'Так виглядає будинок, коли ви до нас приїдете. Шукайте зелений фасад на Nádražní.',
  'zh-Hant': '抵達時房子就是這個樣子。請找 Nádražní 街上的綠色外牆。',
};

export const predDomemText: LText = {
  cs: 'Přímo před domem je zákaz zastavení.',
  en: 'Stopping directly in front of the house is not allowed.',
  de: 'Direkt vor dem Haus gilt Halteverbot.',
  pl: 'Bezpośrednio przed domem obowiązuje zakaz zatrzymywania się.',
  uk: 'Безпосередньо перед будинком зупинятися заборонено.',
  'zh-Hant': '房屋正前方禁止停車短暫上下客。',
};

export const vstupNadpis: LText = {
  cs: 'Vstup do apartmánu',
  en: 'Entering the apartment',
  de: 'Zugang zum Apartment',
  pl: 'Wejście do apartamentu',
  uk: 'Вхід до апартаментів',
  'zh-Hant': '進入公寓',
};

export const vstupText: LText = {
  cs: 'Do domu i do apartmánu vás uvedeme osobně. Po kontrole dokladů vám aktivujeme kódy ke vstupu do apartmánu.',
  en: 'We will show you into the house and the apartment in person. After we check your ID, we activate the codes for entering the apartment.',
  de: 'In das Haus und das Apartment führen wir Sie persönlich. Nach der Ausweiskontrolle aktivieren wir die Codes für den Zugang zum Apartment.',
  pl: 'Do domu i do apartamentu wprowadzimy Was osobiście. Po sprawdzeniu dokumentów aktywujemy kody wejścia do apartamentu.',
  uk: 'До будинку й апартаментів проведемо вас особисто. Після перевірки документів активуємо коди входу до апартаментів.',
  'zh-Hant': '我們會親自帶您進入房屋與公寓。核對證件後，會為您啟用進入公寓的密碼。',
};

export const poplatekNadpis: LText = {
  cs: 'Městský poplatek z pobytu',
  en: 'City stay tax',
  de: 'Kurtaxe / Aufenthaltssteuer',
  pl: 'Miejski podatek noclegowy',
  uk: 'Міський збір за проживання',
  'zh-Hant': '城市住宿稅',
};

export const poplatekZaklad: LText = {
  cs: 'U rezervací vzniklých od 1. 10. 2026 se městský poplatek z pobytu platí: 50 Kč za noc a osobu a není zahrnutý v ceně ubytování. U rezervací vzniklých před 1. 10. 2026 byl poplatek zahrnutý v ceně.',
  en: 'For reservations created from 1 October 2026, the city stay tax is charged: 50 CZK per night per person and is not included in the accommodation price. For reservations created before 1 October 2026, the tax was included in the price.',
  de: 'Bei Reservierungen ab dem 1. 10. 2026 wird die Kurtaxe erhoben: 50 CZK pro Nacht und Person und ist nicht im Unterkunftspreis enthalten. Bei Reservierungen vor dem 1. 10. 2026 war die Steuer im Preis enthalten.',
  pl: 'Dla rezerwacji utworzonych od 1.10.2026 miejski podatek noclegowy jest pobierany: 50 CZK za noc na osobę i nie jest wliczony w cenę zakwaterowania. Dla rezerwacji utworzonych przed 1.10.2026 podatek był wliczony w cenę.',
  uk: 'Для бронювань, створених з 1.10.2026, міський збір за проживання стягується: 50 CZK за ніч на особу і не включений у ціну розміщення. Для бронювань, створених до 1.10.2026, збір був включений у ціну.',
  'zh-Hant': '自 2026 年 10 月 1 日起建立的預訂需另行支付城市住宿稅：每人每晚 50 捷克克朗，不含在住宿價格內。此日期之前建立的預訂，該稅已含在價格中。',
};

export const poplatekFormulaStitek: LText = {
  cs: 'Pro váš pobyt',
  en: 'For your stay',
  de: 'Für Ihren Aufenthalt',
  pl: 'Dla Waszego pobytu',
  uk: 'Для вашого перебування',
  'zh-Hant': '本次住宿',
};

export const poplatekFormulaDetail: LText = {
  cs: '{{POPLATEK_NOCI}} nocí × {{POPLATEK_OSOB}} osob × 50 Kč',
  en: '{{POPLATEK_NOCI}} nights × {{POPLATEK_OSOB}} guests × 50 CZK',
  de: '{{POPLATEK_NOCI}} Nächte × {{POPLATEK_OSOB}} Personen × 50 CZK',
  pl: '{{POPLATEK_NOCI}} nocy × {{POPLATEK_OSOB}} osób × 50 CZK',
  uk: '{{POPLATEK_NOCI}} ночей × {{POPLATEK_OSOB}} осіб × 50 CZK',
  'zh-Hant': '{{POPLATEK_NOCI}} 晚 × {{POPLATEK_OSOB}} 人 × 50 CZK',
};

export const odjezdTextL: LText = {
  cs: 'Check-out je do 10:00. Večer před odjezdem si spolu domluvíme přesný čas. Apartmán s vámi krátce projdeme a osobně ho převezmeme.',
  en: 'Check-out is by 10:00. The evening before departure we will agree the exact time together. We will walk through the apartment with you briefly and take it over in person.',
  de: 'Check-out ist bis 10:00. Am Vorabend stimmen wir die genaue Uhrzeit gemeinsam ab. Wir gehen die Wohnung kurz mit Ihnen durch und übernehmen sie persönlich.',
  pl: 'Check-out jest do 10:00. Wieczorem przed wyjazdem ustalimy razem dokładną godzinę. Krótko przejdziemy z Wami apartament i odbierzemy go osobiście.',
  uk: 'Check-out до 10:00. Увечері перед виїздом разом домовимося про точний час. Коротко пройдемо з вами апартаменти й особисто їх приймемо.',
  'zh-Hant': '退房時間為 10:00 前。前一晚我們會一起約定確切時間。我們會與您簡單走訪公寓並親自交接。',
};

export const wifiLabelApt: LText = {
  cs: 'V apartmánu',
  en: 'In the apartment',
  de: 'In der Wohnung',
  pl: 'W apartamencie',
  uk: 'В апартаментах',
  'zh-Hant': '公寓內',
};

export const wifiLabelGarden: LText = {
  cs: 'Na zahradě',
  en: 'In the garden',
  de: 'Im Garten',
  pl: 'W ogrodzie',
  uk: 'У саду',
  'zh-Hant': '在花園裡',
};

export const zahradaUzitek: { stitek: LText; nadpis: LText; text: LText }[] = [
  {
    stitek: {
      cs: 'V zahradě',
      en: 'In the garden',
      de: 'Im Garten',
      pl: 'W ogrodzie',
      uk: 'У саду',
      'zh-Hant': '在花園裡',
    },
    nadpis: {
      cs: 'Klid od města',
      en: 'Quiet away from the city',
      de: 'Ruhe abseits der Stadt',
      pl: 'Spokój od miasta',
      uk: 'Спокій від міста',
      'zh-Hant': '遠離城市喧囂',
    },
    text: {
      cs: 'Dveře vedou do klidné zahrady. Je tu zeleň a posezení, stranou od ruchu města.',
      en: 'The door leads into a quiet garden. There is greenery and seating, away from the city noise.',
      de: 'Die Tür führt in einen ruhigen Garten. Es gibt Grün und Sitzplätze, abseits vom Stadtlärm.',
      pl: 'Drzwi prowadzą do spokojnego ogrodu. Jest zieleń i miejsca do siedzenia, z dala od miejskiego zgiełku.',
      uk: 'Двері ведуть у тихий сад. Тут зелень і місця для сидіння, осторонь від міського шуму.',
      'zh-Hant': '門通向安靜的花園。這裡有綠意和座位，遠離城市喧鬧。',
    },
  },
  {
    stitek: {
      cs: 'K odpočinku',
      en: 'To relax',
      de: 'Zum Entspannen',
      pl: 'Do odpoczynku',
      uk: 'Для відпочинку',
      'zh-Hant': '休憩',
    },
    nadpis: {
      cs: 'Ráno i podvečer',
      en: 'Morning and evening',
      de: 'Morgens und abends',
      pl: 'Rano i wieczorem',
      uk: 'Вранці й увечері',
      'zh-Hant': '早晨與傍晚',
    },
    text: {
      cs: 'Ráno si tu dáte kávu, odpoledne sedíte ve stínu. Po dni ve městě je to dobré místo i na sklenku vína.',
      en: 'In the morning you can have coffee here, in the afternoon you sit in the shade. After a day in the city it is a good place for a glass of wine too.',
      de: 'Morgens können Sie hier Kaffee trinken, nachmittags im Schatten sitzen. Nach einem Tag in der Stadt ist es auch ein guter Platz für ein Glas Wein.',
      pl: 'Rano wypijecie tu kawę, po południu usiądziecie w cieniu. Po dniu w mieście to też dobre miejsce na kieliszek wina.',
      uk: 'Вранці тут можна випити каву, після обіду посидіти в тіні. Після дня в місті це й гарне місце на келих вина.',
      'zh-Hant': '早上可以在這裡喝咖啡，下午坐在樹蔭下。逛完城後也很適合來一杯酒。',
    },
  },
];

export const zahradaPravidla: {
  stitek: LText;
  nadpis: LText;
  text: LText;
  highlight?: boolean;
}[] = [
  {
    highlight: true,
    stitek: {
      cs: 'Sdílený prostor',
      en: 'Shared space',
      de: 'Gemeinsamer Bereich',
      pl: 'Wspólna przestrzeń',
      uk: 'Спільний простір',
      'zh-Hant': '共用空間',
    },
    nadpis: {
      cs: 'Ohleduplnost',
      en: 'Consideration',
      de: 'Rücksichtnahme',
      pl: 'Uprzejmość',
      uk: 'Повага',
      'zh-Hant': '體諒',
    },
    text: {
      cs: 'Zahradu sdílejí hosté více apartmánů. Prosíme o klid, čistotu a ohled k ostatním. Ať si ji užije každý stejně.',
      en: 'Guests from several apartments share the garden. Please keep it quiet and tidy, and be considerate. So everyone can enjoy it the same way.',
      de: 'Gäste mehrerer Apartments teilen sich den Garten. Bitte um Ruhe, Sauberkeit und Rücksicht. Damit ihn alle gleich genießen können.',
      pl: 'Ogród dzielą goście kilku apartamentów. Prosimy o ciszę, porządek i wzgląd na innych. Niech każdy skorzysta z niego tak samo.',
      uk: 'Сад ділять гості кількох апартаментів. Просимо про тишу, чистоту й повагу до інших. Нехай кожен насолоджується ним так само.',
      'zh-Hant': '花園由多間公寓房客共用。請保持安靜、整潔，並體諒他人。讓每個人都能好好享用。',
    },
  },
  {
    stitek: {
      cs: 'Při odchodu',
      en: 'When leaving',
      de: 'Beim Verlassen',
      pl: 'Przy wyjściu',
      uk: 'При виході',
      'zh-Hant': '離開時',
    },
    nadpis: {
      cs: 'Dveře zavírejte',
      en: 'Keep the door closed',
      de: 'Tür schließen',
      pl: 'Zamykaj drzwi',
      uk: 'Зачиняйте двері',
      'zh-Hant': '請關好門',
    },
    text: {
      cs: 'Při návratu zkontrolujte, že se dveře řádně dovřely. Kód si vezměte s sebou.',
      en: 'When returning, please check that the door has closed properly. Take the code with you.',
      de: 'Bitte prüfen Sie bei Ihrer Rückkehr, dass sich die Tür wieder richtig geschlossen hat. Nehmen Sie den Code mit.',
      pl: 'Po powrocie sprawdź, czy drzwi się domknęły. Kod zabierz ze sobą.',
      uk: 'Після повернення перевірте, що двері щільно зачинилися. Код візьміть із собою.',
      'zh-Hant': '回來時請確認門已關好。密碼請隨身帶著。',
    },
  },
];

export const zahradaPravidlaNadpis: LText = {
  cs: 'Prakticky na zahradě',
  en: 'Practical notes for the garden',
  de: 'Praktisches zum Garten',
  pl: 'Praktycznie w ogrodzie',
  uk: 'Практично в саду',
  'zh-Hant': '花園實用提醒',
};

export const stayRules: { title: LText; text: LText }[] = [
  {
    title: {
      cs: 'Bez kouření',
      en: 'No smoking',
      de: 'Rauchfrei',
      pl: 'Bez palenia',
      uk: 'Без куріння',
      'zh-Hant': '禁止吸菸',
    },
    text: {
      cs: 'V apartmánech, společných prostorách i u domu nekouříme, včetně elektronických cigaret. Platí to i pro otevřený oheň a vonné svíčky.',
      en: 'We do not smoke in the apartments, shared spaces or by the house, including e-cigarettes. The same applies to open fire and scented candles.',
      de: 'In den Apartments, Gemeinschaftsräumen und am Haus rauchen wir nicht, auch keine E-Zigaretten. Das gilt auch für offenes Feuer und Duftkerzen.',
      pl: 'W apartamentach, częściach wspólnych i przy domu nie palimy, także e-papierosów. Dotyczy to też otwartego ognia i świec zapachowych.',
      uk: 'В апартаментах, спільних приміщеннях і біля будинку не куримо, зокрема електронні сигарети. Те саме стосується відкритого вогню й ароматичних свічок.',
      'zh-Hant': '公寓、共用空間與房屋周圍皆禁止吸菸，包含電子菸。明火與香氛蠟燭同樣不允許。',
    },
  },
  {
    title: {
      cs: 'Kola',
      en: 'Bikes',
      de: 'Fahrräder',
      pl: 'Rowery',
      uk: 'Велосипеди',
      'zh-Hant': '腳踏車',
    },
    text: {
      cs: 'Kola do apartmánu nepatří. Úschovu řešíme individuálně. Napište nám před příjezdem, co potřebujete.',
      en: 'Bikes do not belong in the apartment. We arrange storage individually. Write to us before arrival if you need something.',
      de: 'Fahrräder gehören nicht ins Apartment. Die Aufbewahrung klären wir individuell. Schreiben Sie uns vor der Anreise, was Sie brauchen.',
      pl: 'Rowery nie należą do apartamentu. Przechowanie ustalamy indywidualnie. Napiszcie przed przyjazdem, czego potrzebujecie.',
      uk: 'Велосипеди в апартаменти не належать. Зберігання вирішуємо індивідуально. Напишіть нам перед приїздом, що вам потрібно.',
      'zh-Hant': '腳踏車請勿帶進公寓。存放方式可個別安排。抵達前請先告訴我們您的需求。',
    },
  },
  {
    title: {
      cs: 'Bez zvířat',
      en: 'No pets',
      de: 'Keine Tiere',
      pl: 'Bez zwierząt',
      uk: 'Без тварин',
      'zh-Hant': '禁帶寵物',
    },
    text: {
      cs: 'Domácí zvířata u nás bohužel nejsou povolená. Platí to v apartmánech i ve společných prostorách.',
      en: 'Pets are unfortunately not allowed. This applies in the apartments and in the shared spaces.',
      de: 'Haustiere sind bei uns leider nicht erlaubt. Das gilt in den Apartments und in den Gemeinschaftsräumen.',
      pl: 'Zwierząt domowych niestety nie przyjmujemy. Dotyczy to apartamentów i części wspólnych.',
      uk: 'Домашніх тварин у нас на жаль не дозволено. Це стосується апартаментів і спільних приміщень.',
      'zh-Hant': '很抱歉，這裡不接受寵物。公寓與共用空間皆適用。',
    },
  },
  {
    title: {
      cs: 'Klid večer',
      en: 'Quiet in the evening',
      de: 'Ruhe am Abend',
      pl: 'Cisza wieczorem',
      uk: 'Тиша ввечері',
      'zh-Hant': '晚間安靜',
    },
    text: {
      cs: 'Jsme malý dům uprostřed města. Prosíme o ohleduplnost vůči sousedům, zvlášť večer a v noci.',
      en: 'We are a small house in the middle of the city. Please be considerate of neighbours, especially in the evening and at night.',
      de: 'Wir sind ein kleines Haus mitten in der Stadt. Bitte nehmen Sie Rücksicht auf die Nachbarn, besonders abends und nachts.',
      pl: 'Jesteśmy małym domem w środku miasta. Prosimy o wzgląd na sąsiadów, zwłaszcza wieczorem i w nocy.',
      uk: 'Ми маленький будинок посеред міста. Просимо про повагу до сусідів, особливо ввечері й уночі.',
      'zh-Hant': '我們是市中心的一棟小房子。請體諒鄰居，尤其是晚上與夜間。',
    },
  },
];

/** Televize: převzato z náhledu / webu (obsah_z_webu), věrné překlady. */
export const tvTexts = {
  eyebrow: {
    cs: 'Během pobytu · Televize',
    en: 'During your stay · TV',
    de: 'Während des Aufenthalts · Fernsehen',
    pl: 'Podczas pobytu · Telewizja',
    uk: 'Під час перебування · Телевізор',
    'zh-Hant': '入住期間 · 電視',
  } as LText,
  heading: {
    cs: 'Televize s Lepší.TV: přes 150 programů, i zpětně',
    en: 'TV with Lepší.TV: over 150 channels, including catch-up',
    de: 'Fernsehen mit Lepší.TV: über 150 Programme, auch zeitversetzt',
    pl: 'Telewizja z Lepší.TV: ponad 150 programów, także wstecz',
    uk: 'Телевізор з Lepší.TV: понад 150 програм, також із записом',
    'zh-Hant': 'Lepší.TV 電視：逾 150 個頻道，亦可回看',
  } as LText,
  lead: {
    cs: 'V každém apartmánu je televize s aplikací Lepší.TV, přihlášená a v ceně pobytu.',
    en: 'Every apartment has a TV with the Lepší.TV app, signed in and included in the stay.',
    de: 'In jedem Apartment gibt es einen Fernseher mit der App Lepší.TV, angemeldet und im Preis inklusive.',
    pl: 'W każdym apartamencie jest telewizor z aplikacją Lepší.TV, zalogowaną i w cenie pobytu.',
    uk: 'У кожних апартаментах є телевізор із застосунком Lepší.TV, увімкненим і в ціні перебування.',
    'zh-Hant': '每間公寓皆有已登入的 Lepší.TV 電視應用，含在住宿費用內。',
  } as LText,
  step1: {
    cs: 'Zapněte televizi a na ovladači stiskněte tlačítko domovské stránky.',
    en: 'Turn on the TV and press the home button on the remote.',
    de: 'Schalten Sie den Fernseher ein und drücken Sie die Home-Taste auf der Fernbedienung.',
    pl: 'Włączcie telewizor i na pilocie naciśnijcie przycisk strony głównej.',
    uk: 'Увімкніть телевізор і на пульті натисніть кнопку домашньої сторінки.',
    'zh-Hant': '開啟電視，並在遙控器上按下主畫面鍵。',
  } as LText,
  step2: {
    cs: 'V menu zvolte první položku, aplikaci Lepší.TV.',
    en: 'In the menu choose the first item, the Lepší.TV app.',
    de: 'Wählen Sie im Menü den ersten Eintrag, die App Lepší.TV.',
    pl: 'W menu wybierzcie pierwszą pozycję, aplikację Lepší.TV.',
    uk: 'У меню оберіть перший пункт, застосунок Lepší.TV.',
    'zh-Hant': '在選單中選擇第一項：Lepší.TV 應用。',
  } as LText,
  step3: {
    cs: 'Sledujte programy živě nebo zpětně až 100 dní.',
    en: 'Watch live or catch up up to 100 days back.',
    de: 'Sehen Sie Programme live oder zeitversetzt bis zu 100 Tage zurück.',
    pl: 'Oglądajcie programy na żywo lub wstecz do 100 dni.',
    uk: 'Дивіться програми наживо або із записом до 100 днів.',
    'zh-Hant': '可看直播，也可回看最多 100 天。',
  } as LText,
  langs: {
    cs: 'Programy i ve vašem jazyce: německé (ZDF, Das Erste, 3sat), anglické (CNN International, Bloomberg), francouzské (France 2, TV5MONDE), polské (Polsat, TVN) a ukrajinské (1+1 International, ICTV). Na televizi je i YouTube.',
    en: 'Channels in your language too: German (ZDF, Das Erste, 3sat), English (CNN International, Bloomberg), French (France 2, TV5MONDE), Polish (Polsat, TVN) and Ukrainian (1+1 International, ICTV). YouTube is on the TV as well.',
    de: 'Programme auch in Ihrer Sprache: deutsch (ZDF, Das Erste, 3sat), englisch (CNN International, Bloomberg), französisch (France 2, TV5MONDE), polnisch (Polsat, TVN) und ukrainisch (1+1 International, ICTV). Auf dem Fernseher gibt es auch YouTube.',
    pl: 'Programy także w Waszym języku: niemieckie (ZDF, Das Erste, 3sat), angielskie (CNN International, Bloomberg), francuskie (France 2, TV5MONDE), polskie (Polsat, TVN) i ukraińskie (1+1 International, ICTV). Na telewizorze jest też YouTube.',
    uk: 'Програми також вашою мовою: німецькі (ZDF, Das Erste, 3sat), англійські (CNN International, Bloomberg), французькі (France 2, TV5MONDE), польські (Polsat, TVN) і українські (1+1 International, ICTV). На телевізорі також є YouTube.',
    'zh-Hant': '也有您語言的頻道：德語（ZDF、Das Erste、3sat）、英語（CNN International、Bloomberg）、法語（France 2、TV5MONDE）、波蘭語（Polsat、TVN）與烏克蘭語（1+1 International、ICTV）。電視上也有 YouTube。',
  } as LText,
  help: {
    cs: 'Když něco nefunguje, zavolejte Nikol:',
    en: 'If something does not work, call Nikol:',
    de: 'Wenn etwas nicht funktioniert, rufen Sie Nikol an:',
    pl: 'Jeśli coś nie działa, zadzwońcie do Nikol:',
    uk: 'Якщо щось не працює, зателефонуйте Nikol:',
    'zh-Hant': '若有問題，請致電 Nikol：',
  } as LText,
};

export const hub = {
  kicker: {
    cs: 'Jak přijíždíte?',
    en: 'How are you arriving?',
    de: 'Wie reisen Sie an?',
    pl: 'Jak przyjeżdżacie?',
    uk: 'Як ви прибуваєте?',
    'zh-Hant': '您如何抵達？',
  } as LText,
  title: {
    cs: 'Vyberte způsob příjezdu',
    en: 'Choose how you arrive',
    de: 'Wählen Sie Ihre Anreise',
    pl: 'Wybierzcie sposób przyjazdu',
    uk: 'Оберіть спосіб прибуття',
    'zh-Hant': '選擇抵達方式',
  } as LText,
  lead: {
    cs: 'Ukážeme vám jen to, co potřebujete. Nemusíte číst řádky, které se vás netýkají.',
    en: 'We show you only what you need. You do not have to read lines that do not apply to you.',
    de: 'Wir zeigen Ihnen nur, was Sie brauchen. Sie müssen keine Zeilen lesen, die Sie nicht betreffen.',
    pl: 'Pokażemy tylko to, czego potrzebujecie. Nie musicie czytać linii, które Was nie dotyczą.',
    uk: 'Покажемо лише те, що вам потрібно. Не треба читати рядки, які вас не стосуються.',
    'zh-Hant': '我們只顯示您需要的內容。與您無關的段落可以略過。',
  } as LText,
  autoKicker: {
    cs: 'Auto',
    en: 'Car',
    de: 'Auto',
    pl: 'Samochód',
    uk: 'Авто',
    'zh-Hant': '汽車',
  } as LText,
  autoTitle: {
    cs: 'Přijedu autem',
    en: 'I arrive by car',
    de: 'Ich komme mit dem Auto',
    pl: 'Przyjeżdżam samochodem',
    uk: 'Приїжджаю автомобілем',
    'zh-Hant': '我開車抵達',
  } as LText,
  autoText: {
    cs: 'Parkování, brána, stání a cesta k domu.',
    en: 'Parking, gate, space and the walk to the house.',
    de: 'Parken, Tor, Stellplatz und der Weg zum Haus.',
    pl: 'Parking, brama, miejsce i droga do domu.',
    uk: 'Паркування, брама, місце і шлях до будинку.',
    'zh-Hant': '停車、大門、車位與步行到房子。',
  } as LText,
  walkKicker: {
    cs: 'Vlak / autobus',
    en: 'Train / bus',
    de: 'Zug / Bus',
    pl: 'Pociąg / autobus',
    uk: 'Поїзд / автобус',
    'zh-Hant': '火車 / 公車',
  } as LText,
  walkTitle: {
    cs: 'Přijdu pěšky',
    en: 'I arrive on foot',
    de: 'Ich komme zu Fuß',
    pl: 'Przychodzę pieszo',
    uk: 'Приходжу пішки',
    'zh-Hant': '我步行抵達',
  } as LText,
  walkText: {
    cs: 'Bez parkování. Rovnou k domu a do apartmánu.',
    en: 'No parking. Straight to the house and apartment.',
    de: 'Ohne Parken. Direkt zum Haus und Apartment.',
    pl: 'Bez parkingu. Prosto do domu i apartamentu.',
    uk: 'Без паркування. Прямо до будинку й апартаментів.',
    'zh-Hant': '無需停車。直接到房子與公寓。',
  } as LText,
  reset: {
    cs: 'Změnit způsob příjezdu',
    en: 'Change arrival mode',
    de: 'Anreise ändern',
    pl: 'Zmień sposób przyjazdu',
    uk: 'Змінити спосіб прибуття',
    'zh-Hant': '更改抵達方式',
  } as LText,
};

/** Krátké UI popisky podle jazyka hosta. */
export const ui = {
  routeParking: {
    cs: 'Trasa na parkování',
    en: 'Route to parking',
    de: 'Route zum Parkplatz',
    pl: 'Trasa na parking',
    uk: 'Маршрут на парковку',
    'zh-Hant': '前往停車場',
  } as LText,
  routeHouse: {
    cs: 'Trasa k domu',
    en: 'Route to the house',
    de: 'Route zum Haus',
    pl: 'Trasa do domu',
    uk: 'Маршрут до будинку',
    'zh-Hant': '前往房子',
  } as LText,
  openMapy: {
    cs: 'Otevřít navigaci v Mapy.cz',
    en: 'Open navigation in Mapy.cz',
    de: 'Navigation in Mapy.cz öffnen',
    pl: 'Otwórz nawigację w Mapy.cz',
    uk: 'Відкрити навігацію в Mapy.cz',
    'zh-Hant': '在 Mapy.cz 開啟導航',
  } as LText,
  orGoogle: {
    cs: 'Nebo Google Maps',
    en: 'Or Google Maps',
    de: 'Oder Google Maps',
    pl: 'Lub Google Maps',
    uk: 'Або Google Maps',
    'zh-Hant': '或 Google Maps',
  } as LText,
  walkHint: {
    cs: '{{M}} m · {{MIN}} min pěšky · Mapy.cz',
    en: '{{M}} m · {{MIN}} min on foot · Mapy.cz',
    de: '{{M}} m · {{MIN}} Min. zu Fuß · Mapy.cz',
    pl: '{{M}} m · {{MIN}} min pieszo · Mapy.cz',
    uk: '{{M}} м · {{MIN}} хв пішки · Mapy.cz',
    'zh-Hant': '{{M}} 公尺 · 步行 {{MIN}} 分鐘 · Mapy.cz',
  } as LText,
  step: {
    cs: 'Krok',
    en: 'Step',
    de: 'Schritt',
    pl: 'Krok',
    uk: 'Крок',
    'zh-Hant': '步驟',
  } as LText,
  note: {
    cs: 'Poznámka',
    en: 'Note',
    de: 'Hinweis',
    pl: 'Uwaga',
    uk: 'Примітка',
    'zh-Hant': '備註',
  } as LText,
  entry: {
    cs: 'Vstup',
    en: 'Entry',
    de: 'Zugang',
    pl: 'Wejście',
    uk: 'Вхід',
    'zh-Hant': '進入',
  } as LText,
  house: {
    cs: 'Dům',
    en: 'House',
    de: 'Haus',
    pl: 'Dom',
    uk: 'Будинок',
    'zh-Hant': '房子',
  } as LText,
  rulesHeading: {
    cs: 'Co u nás platí, jednoduše a napřímo',
    en: 'What applies here, simply and directly',
    de: 'Was bei uns gilt, einfach und direkt',
    pl: 'Co u nas obowiązuje, prosto i wprost',
    uk: 'Що у нас діє, просто й прямо',
    'zh-Hant': '這裡的規則，簡單直接',
  } as LText,
  qrApt: {
    cs: 'QR kód WiFi apartmán',
    en: 'Apartment WiFi QR code',
    de: 'WLAN-QR-Code Apartment',
    pl: 'Kod QR WiFi apartamentu',
    uk: 'QR-код WiFi апартаментів',
    'zh-Hant': '公寓 WiFi QR 碼',
  } as LText,
  qrGarden: {
    cs: 'QR kód WiFi zahrada',
    en: 'Garden WiFi QR code',
    de: 'WLAN-QR-Code Garten',
    pl: 'Kod QR WiFi ogrodu',
    uk: 'QR-код WiFi саду',
    'zh-Hant': '花園 WiFi QR 碼',
  } as LText,
  qrMissApt: {
    cs: 'QR kód se zobrazí, až bude doplněné heslo WiFi pro tento apartmán.',
    en: 'The QR code appears once the WiFi password for this apartment is set.',
    de: 'Der QR-Code erscheint, sobald das WLAN-Passwort für dieses Apartment hinterlegt ist.',
    pl: 'Kod QR pojawi się, gdy hasło WiFi tego apartamentu będzie uzupełnione.',
    uk: 'QR-код з’явиться, коли буде додано пароль WiFi для цих апартаментів.',
    'zh-Hant': '補上此公寓的 WiFi 密碼後會顯示 QR 碼。',
  } as LText,
  qrMissGarden: {
    cs: 'QR kód se zobrazí, až bude doplněné heslo WiFi na zahradě.',
    en: 'The QR code appears once the garden WiFi password is set.',
    de: 'Der QR-Code erscheint, sobald das WLAN-Passwort für den Garten hinterlegt ist.',
    pl: 'Kod QR pojawi się, gdy hasło WiFi ogrodu będzie uzupełnione.',
    uk: 'QR-код з’явиться, коли буде додано пароль WiFi для саду.',
    'zh-Hant': '補上花園 WiFi 密碼後會顯示 QR 碼。',
  } as LText,
};

export const expiredTexts: LText = {
  cs: 'Platnost odkazu skončila',
  en: 'This link has expired',
  de: 'Der Link ist abgelaufen',
  pl: 'Link wygasł',
  uk: 'Термін дії посилання закінчився',
  'zh-Hant': '連結已過期',
};

export const expiredHelp: LText = {
  cs: 'Potřebujete pomoc? Zavolejte Nikol:',
  en: 'Need help? Call Nikol:',
  de: 'Brauchen Sie Hilfe? Rufen Sie Nikol an:',
  pl: 'Potrzebujecie pomocy? Zadzwońcie do Nikol:',
  uk: 'Потрібна допомога? Зателефонуйте Nikol:',
  'zh-Hant': '需要協助？請致電 Nikol：',
};

export const SECTION_NAV: Record<string, LText> = {
  'zadost-o-parkovani': {
    cs: 'Parkování',
    en: 'Parking',
    de: 'Parken',
    pl: 'Parking',
    uk: 'Паркування',
    'zh-Hant': '停車',
  },
  'brana-parkoviste': {
    cs: 'Brána',
    en: 'Gate',
    de: 'Tor',
    pl: 'Brama',
    uk: 'Брама',
    'zh-Hant': '大門',
  },
  parkovani: {
    cs: 'Stání',
    en: 'Space',
    de: 'Stellplatz',
    pl: 'Miejsce',
    uk: 'Місце',
    'zh-Hant': '車位',
  },
  'pesky-parkoviste-dum': {
    cs: 'K domu',
    en: 'To the house',
    de: 'Zum Haus',
    pl: 'Do domu',
    uk: 'До будинку',
    'zh-Hant': '到房子',
  },
  'prijezd-k-domu': {
    cs: 'Dům',
    en: 'House',
    de: 'Haus',
    pl: 'Dom',
    uk: 'Будинок',
    'zh-Hant': '房子',
  },
  wifi: {
    cs: 'WiFi',
    en: 'WiFi',
    de: 'WLAN',
    pl: 'WiFi',
    uk: 'WiFi',
    'zh-Hant': 'WiFi',
  },
  zahrada: {
    cs: 'Zahrada',
    en: 'Garden',
    de: 'Garten',
    pl: 'Ogród',
    uk: 'Сад',
    'zh-Hant': '花園',
  },
  'posezeni-venku': {
    cs: 'Posezení',
    en: 'Seating',
    de: 'Sitzplatz',
    pl: 'Miejsce do siedzenia',
    uk: 'Місце для сидіння',
    'zh-Hant': '戶外座位',
  },
  televize: {
    cs: 'Televize',
    en: 'TV',
    de: 'Fernsehen',
    pl: 'Telewizja',
    uk: 'Телевізор',
    'zh-Hant': '電視',
  },
  pravidla: {
    cs: 'Pravidla',
    en: 'Rules',
    de: 'Regeln',
    pl: 'Zasady',
    uk: 'Правила',
    'zh-Hant': '規則',
  },
  odjezd: {
    cs: 'Odjezd',
    en: 'Departure',
    de: 'Abreise',
    pl: 'Wyjazd',
    uk: 'Виїзд',
    'zh-Hant': '退房',
  },
  kontakt: {
    cs: 'Kontakt',
    en: 'Contact',
    de: 'Kontakt',
    pl: 'Kontakt',
    uk: 'Контакт',
    'zh-Hant': '聯絡',
  },
};
