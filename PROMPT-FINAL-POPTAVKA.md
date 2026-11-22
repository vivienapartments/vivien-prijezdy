# FINÁLNÍ ZADÁNÍ – poptávka: doporučený host, věrný host, kalendář s cenami a obsazeností

**Tento soubor nahrazuje všechny předchozí:** PROMPT-DOPORUCENY-HOST-TEXTY.md, PROMPT-CENY-DODATEK.md, PROMPT-OBSAZENOST.md, PROMPT-KALENDAR.md. Pokud jsi z nich už něco udělal, uprav to podle tohoto souboru.
Vlákno: kalendar doporuceni (větev `doporuceni`). Náhled v pravém panelu (390 × 750). Nenasazuj. Zapiš do ZMENY-LOG.md.

**Vzory v rootu:** `nahled-poptavka-s-cenami.html` (hlavní – všech 5 kroků s cenami), `nahled-krok1-texty-spojene.html` (varianta 1), `nahled-vyber-jazyka.html` (varianta B), `nahled-ceny-v-kalendari.html` (panel Přehled).

**Jeden kalendář pro všechny poptávky.** Žádné kopie pro jednotlivé druhy. Liší se jen pravidla zobrazení:

| Druh poptávky | Obsazenost | Ceny | Sleva 5 % |
|---|---|---|---|
| věrný host (`vernost`) | ano | ano | ano |
| doporučený host (`doporucitel`) | ano | ano | ano |
| běžná poptávka | ano | ano | ne |
| firma (`firma`) | ano | **ne** | ne |

Vzhled poptávky zůstává, jak je. Mění se jen to, co je tady.

---

## 0. Nejdřív mi odpověz (než začneš body 5–6)
1. Ze kterých kanálů chodí rezervace do průvodce (Booking, Airbnb, web / Better Hotel, ruční zápis)?
2. Pozná průvodce storno?
3. Ví u každé rezervace, o který apartmán jde (V1–V5)?
4. Porovnej rezervace, které průvodce zná od 22. 11. 2026 do 12. 1. 2027, s listem „Podle screenshotů“ ve `VIVIEN_obsazenost_2026-11-22.xlsx`. Pošli seznam rozdílů (datum, apartmán, průvodce, tabulka). Nic neopravuj.

Body 1–4 můžeš dělat hned.

---

## 1. CHYBA: zlatá tlačítka bez textu (nejdřív tohle)

Na telefonu je vidět zlaté tlačítko úplně bez nápisu na těchto místech:
- výsledek dotazníku – „Pokračovat s tímto apartmánem“,
- galerie apartmánu (1 / 15) – „Vybrat tento apartmán“,
- Kontakt – „Odeslat poptávku“.

Bylo to vidět na **vivien-prijezdy-six.vercel.app**, tedy na ostré adrese.
- Zjisti příčinu: buď má text stejnou barvu jako zlaté pozadí, nebo je text prázdný (např. chybí klíč v textech pro `doporucitel` / `vernost` a doplní se prázdný řetězec).
- Oprav to pro všechny zdroje poptávky (běžná, věrný host, doporučený host, firma) a všech 13 jazyků. Na zlatém tlačítku je vždy tmavý text.
- Pokud je chyba i na master (ostrá verze), oprav ji jako **samostatný commit jen s touto opravou**, aby šel do ostré hned zvlášť (cherry-pick jako u opravy Lackner). Napiš mi hash commitu. Nasazuje se až po „nasaď“.

Drobnost v souhrnu na Kontaktu: „2026· Kterýkoli“ – chybí mezera před tečkou. Má být „2026 · Kterýkoli“.

---

## 2. Telefon: předvolba a kontrola formátu (celý formulář poptávky, všechny zdroje)

Teď host může napsat číslo jakkoli. Chceme ho mít vždy správně a s předvolbou.

- Pole Telefon rozděl na **předvolbu** (malý výběr vlevo s vlajkou, např. 🇨🇿 +420 ▾) a **číslo** (vpravo).
- Předvolba je předvybraná podle jazyka stránky: cs +420, de +49, pl +48, uk +380, zh-Hant +886, es +34, fr +33, it +39, pt +351, sv +46, hu +36, da +45. Pro en podle regionu prohlížeče, jinak +420. Host ji může změnit, v seznamu jsou všechny země s vyhledáváním.
- Když host vloží číslo začínající `+` nebo `00`, předvolbu rozpoznej a přepni sama.
- Číslo se při psaní formátuje po skupinách (např. 602 123 456). Placeholder je ukázka čísla pro zvolenou zemi.
- Pole má `type="tel"`, `inputmode="tel"`, `autocomplete="tel"`.
- Kontrola: `libphonenumber-js` (`isValidPhoneNumber`). Při neplatném čísle neodesílej a pod polem ukaž chybu (texty níže). Chybu ukaž až po opuštění pole nebo po kliknutí na Odeslat, ne během psaní.
- Ukládej a posílej (Telegram, WhatsApp, SMS) číslo ve formátu E.164, např. +420602123456.
- Platí i pro odeslání přes WhatsApp a SMS.

### Chyba telefonu (všechny zdroje poptávky) – `chybaTelefon`

| jazyk | text |
|---|---|
| cs | Zkontrolujte telefonní číslo, i s předvolbou. |
| en | Please check the phone number, including the country code. |
| de | Bitte prüfen Sie die Telefonnummer samt Ländervorwahl. |
| pl | Sprawdźcie numer telefonu razem z numerem kierunkowym kraju. |
| uk | Перевірте номер телефону разом із кодом країни. |
| zh-Hant | 請檢查電話號碼，包括國碼。 |
| es | Comprueben el número de teléfono, con el prefijo del país. |
| fr | Vérifiez le numéro de téléphone, avec l’indicatif du pays. |
| it | Controllate il numero di telefono, con il prefisso internazionale. |
| pt | Verifiquem o número de telefone, com o indicativo do país. |
| sv | Kontrollera telefonnumret, inklusive landsnummer. |
| hu | Ellenőrizzék a telefonszámot az országhívószámmal együtt. |
| da | Tjek telefonnummeret, inklusive landekode. |

---

---

## 3. Texty doporučeného hosta (`doporucitel`)

**Krok 1** (vzor `nahled-krok1-texty-spojene.html`, varianta 1)
- Pryč štítek „Přicházíte na doporučení“.
- Pod nadpisem **jeden odstavec**: `poptavkaVeta` + mezera + `poptavkaSleva` (zlatě uvnitř odstavce) + mezera + `poptavkaNapoveda`.
- Přepínač jazyka malý vpravo nahoře ve fotce (🌐 CS ▾).

**WhatsApp / SMS** – zpráva končí mezerou a `zpravaDoporuceni`.
**Děkujeme** – text `dekujemePotvrdime` (bod 6). Rodinná fotka zůstává. Bez „Přidat na plochu“.

| jazyk | poptavkaVeta | poptavkaSleva | poptavkaNapoveda | zpravaDoporuceni |
|---|---|---|---|---|
| cs | Pět originálních apartmánů, každý s vlastní atmosférou. Vyberete si ten svůj. | Na první pobyt u nás máte slevu 5 %. | Vyberte termín a cenu uvidíte hned. | (doporučení, sleva 5 %) |
| en | Five original apartments, each with its own atmosphere. Choose the one for you. | You get 5% off your first stay with us. | Choose your dates and you will see the price right away. | (referral, 5% off) |
| de | Fünf originelle Apartments, jedes mit eigener Atmosphäre. Wählen Sie Ihres. | Für Ihren ersten Aufenthalt bei uns erhalten Sie 5 % Rabatt. | Wählen Sie den Termin, und Sie sehen den Preis sofort. | (Empfehlung, 5 % Rabatt) |
| pl | Pięć oryginalnych apartamentów, każdy z własną atmosferą. Wybierzcie swój. | Na pierwszy pobyt u nas macie zniżkę 5 %. | Wybierzcie termin, a cenę zobaczycie od razu. | (polecenie, zniżka 5 %) |
| uk | П'ять оригінальних апартаментів, кожен зі своєю атмосферою. Оберіть свої. | На перше перебування у нас маєте знижку 5 %. | Оберіть дати, і ціну побачите одразу. | (рекомендація, знижка 5 %) |
| zh-Hant | 五間獨特的公寓，各有自己的氛圍。選一間屬於您的。 | 首次入住可享 5% 折扣。 | 選擇日期後，即可立即看到價格。 | （推薦，5% 折扣） |
| es | Cinco apartamentos originales, cada uno con su propio ambiente. Elijan el suyo. | En su primera estancia tienen un 5 % de descuento. | Elijan las fechas y verán el precio al instante. | (recomendación, 5 % de descuento) |
| fr | Cinq appartements originaux, chacun avec sa propre atmosphère. Choisissez le vôtre. | Pour votre premier séjour chez nous, vous avez 5 % de réduction. | Choisissez vos dates et vous verrez le prix tout de suite. | (recommandation, 5 % de réduction) |
| it | Cinque appartamenti originali, ognuno con la sua atmosfera. Scegliete il vostro. | Per il primo soggiorno da noi avete lo sconto del 5 %. | Scegliete le date e vedrete subito il prezzo. | (raccomandazione, sconto 5 %) |
| pt | Cinco apartamentos originais, cada um com a sua própria atmosfera. Escolham o vosso. | Na primeira estadia connosco têm 5 % de desconto. | Escolham as datas e verão o preço de imediato. | (recomendação, 5 % de desconto) |
| sv | Fem originella lägenheter, var och en med sin egen atmosfär. Välj er favorit. | På första vistelsen hos oss får ni 5 % rabatt. | Välj datum så ser ni priset direkt. | (rekommendation, 5 % rabatt) |
| hu | Öt egyedi apartman, mindegyik saját hangulattal. Válasszák ki a sajátjukat. | Az első tartózkodásra nálunk 5 % kedvezmény jár. | Válasszanak időpontot, és az árat azonnal látják. | (ajánlás, 5 % kedvezmény) |
| da | Fem originale lejligheder, hver med sin egen stemning. Vælg jeres egen. | På jeres første ophold hos os får I 5 % rabat. | Vælg datoer, så ser I prisen med det samme. | (anbefaling, 5 % rabat) |

---

## 4. Výběr jazyka po otevření odkazu (jen `zdroj === 'doporucitel'`)

Vzor: `nahled-vyber-jazyka.html`, varianta **B (dlaždice se zahradou)**.

- Při **prvním** otevření odkazu `?od=kód` se před krokem 1 ukáže obrazovka: nahoře fotka zahrady (`doporuceny-zahrada-vecer.webp`) přecházející do tmy, logo na hraně, nadpis `vyberteJazyk`, 13 jazyků jako dlaždice ve dvou sloupcích (vlajka + název v daném jazyce), zlaté tlačítko `dale` („Pokračovat“).
- Předvybraný jazyk = jazyk osoby, která hosta doporučila (podle kódu). Když ho neznáme, čeština.
- Klepnutí na dlaždici hned přepne nadpis a tlačítko do zvoleného jazyka. Pokračovat → krok 1 v tom jazyce.
- Volbu si zapamatuj (localStorage, v try/catch). Při dalším otevření obrazovku přeskoč. Přepínač 🌐 v kroku 1 zůstává.

| jazyk | vyberteJazyk | název na dlaždici |
|---|---|---|
| cs | Vyberte jazyk | 🇨🇿 Čeština |
| en | Choose your language | 🇬🇧 English |
| de | Sprache wählen | 🇩🇪 Deutsch |
| pl | Wybierzcie język | 🇵🇱 Polski |
| uk | Оберіть мову | 🇺🇦 Українська |
| zh-Hant | 請選擇語言 | 🇹🇼 中文（繁體） |
| es | Elijan el idioma | 🇪🇸 Español |
| fr | Choisissez la langue | 🇫🇷 Français |
| it | Scegliete la lingua | 🇮🇹 Italiano |
| pt | Escolham o idioma | 🇵🇹 Português |
| sv | Välj språk | 🇸🇪 Svenska |
| hu | Válasszanak nyelvet | 🇭🇺 Magyar |
| da | Vælg sprog | 🇩🇰 Dansk |

---

## 5. Kalendář: ceny + obsazenost + rezervace z průvodce

### Tři zdroje dat
| Zdroj | Co dává | Obnova |
|---|---|---|
| `VIVIEN_ceny_do_31-03-2027.xlsx` (list „Denní ceny“) | cena za apartmán a noc V1–V5 (včetně poplatku z pobytu) | nahrání v Přehledu |
| `VIVIEN_obsazenost_2026-11-22.xlsx` | obsazenost a omezení příjezdu V1–V5 | nahrání v Přehledu |
| rezervace v průvodci (z e-mailů) | obsazené noci podle skutečných rezervací | samo, hned |

Mapování: V1 Jemná harmonie, V2 Zlatá rovnováha, V3 Večerní elegance, V4 Ušlechtilý kontrast, V5 Pohodlí v tlumených tónech.
Oba xlsx jsou v rootu, **necommituj je**. Převeď do Upstash (`kalendar-denni`, na Preview `test:kalendar-denni`): datum → {V1…V5: {cena, obsazeno, bezPrijezdu}}. Jedno tlačítko „Nahrát xlsx“ v Přehledu pozná soubor podle názvů listů.
Stavy: `OBSAZENO`, `NEDOSTUPNÉ` = obsazeno · `VOLNO`, `DOSTUPNÉ` = volno · `VOLNO S OMEZENÍM`, `OMEZENÍ REZERVACE` = volno, ale nejde přijet.

### Pravidla
- **Obsazeno** = tabulka obsazenosti **NEBO** rezervace v průvodci (noci od příjezdu do dne před odjezdem). **Nová rezervace v průvodci zavře termín hned.**
- Storno neblokuje. Rezervace bez apartmánu = 1 obsazený apartmán do součtu za den.
- Na Preview rezervace z ostré databáze jen čti.
- Pravidla last minute nepočítej, host vidí standardní cenu.

### Krok Termín (vzor `nahled-poptavka-s-cenami.html`, krok 2)
- **Plno** (všech 5 obsazeno): zašedlý den, přeškrtnuté číslo, `plno`, nejde zvolit jako noc (den odjezdu ano). Termín přes plný den → `terminPlno`, nepustí dál.
- Den, kdy všechny volné apartmány mají „bez příjezdu“: nejde zvolit jako příjezd.
- Pod dnem nejnižší cena z volných apartmánů. Pod kalendářem `cenaLegenda`.
- **Souhrn** po výběru: termín · počet nocí (tvar podle jazyka), `cenaZaPobyt` + částka nejlevnějšího apartmánu volného ve všech nocích (den odjezdu se nepočítá).
  - věrný a doporučený: součet přeškrtnutý, vedle zlatě −5 % (celé Kč), pod tím `cenaSleva`,
  - běžná: jen součet,
  - pod tím malým `cenaPoznamka`.
  - Žádný apartmán volný celé období → `terminPlno`, nepustí dál.
- Firma: obsazenost ano, čísla a souhrn s cenou ne.

### Krok Apartmány (vzor krok 3)
- Apartmán obsazený v některé noci: ztlumená dlaždice, štítek `obsazeno`, nejde vybrat.
- U volných pod názvem zlatě cena za celý pobyt (u věrného a doporučeného už se slevou) + `zaPobyt`. Firma bez ceny.
- Když host vybere konkrétní apartmán, souhrn ukazuje cenu **toho** apartmánu. U víc vybraných nejnižší z nich. U „Kterýkoli volný“ nejlevnější volný.
- „Kterýkoli volný“ bez volného apartmánu → `terminPlno`.

### Krok Kontakt (vzor krok 4)
- Zlatý souhrn: termín · apartmán (nebo „Kterýkoli volný“) · cena za pobyt + u věrného a doporučeného ` ` + `cenaSleva`. Firma bez ceny.
- WhatsApp/SMS zpráva obsahuje stejnou cenu.

### Přehled → Kalendář a ceny
- Vypínač **Zobrazovat ceny v poptávce**, výchozí **zapnuto**. Vypnuto = poptávka bez čísel a bez souhrnu s cenou, texty se vrátí na „…pošleme cenu“ (dnešní).
- Zdroj cen: „Nahrané xlsx“ (místo pro „Better Hotel API“ připravené, neaktivní).
- Tlačítko **Nahrát xlsx**, datum nahrání každého souboru, „Rezervace z průvodce: poslední přišla X“, upozornění při tabulce obsazenosti starší než 3 dny, náhled po měsících (cena od–do, počet plných dnů), seznam rozdílů z bodu 0.4.

### Texty kalendáře
| jazyk | cenaLegenda | cenaZaPobyt | cenaSleva | cenaPoznamka | zaPobyt |
|---|---|---|---|---|---|
| cs | Ceny za noc, od nejlevnějšího volného apartmánu | Cena za pobyt | se slevou 5 % | za apartmán, ne za osobu · včetně poplatku z pobytu | za pobyt |
| en | Prices per night, from the lowest-priced available apartment | Price for your stay | with 5% off | per apartment, not per person · tourist tax included | for your stay |
| de | Preise pro Nacht, ab dem günstigsten freien Apartment | Preis für den Aufenthalt | mit 5 % Rabatt | pro Apartment, nicht pro Person · inkl. Kurtaxe | für den Aufenthalt |
| pl | Ceny za noc, od najtańszego wolnego apartamentu | Cena za pobyt | ze zniżką 5 % | za apartament, nie za osobę · z opłatą miejscową | za pobyt |
| uk | Ціни за ніч, від найдешевших вільних апартаментів | Ціна за перебування | зі знижкою 5 % | за апартаменти, не за особу · туристичний збір включено | за перебування |
| zh-Hant | 每晚價格，以最便宜的空房公寓計 | 住宿總價 | 已含 5% 折扣 | 以整間公寓計價，非按人數 · 含住宿稅 | 總價 |
| es | Precios por noche, desde el apartamento libre más económico | Precio de la estancia | con 5 % de descuento | por apartamento, no por persona · tasa turística incluida | por la estancia |
| fr | Prix par nuit, à partir de l’appartement libre le moins cher | Prix du séjour | avec 5 % de réduction | par appartement, pas par personne · taxe de séjour incluse | pour le séjour |
| it | Prezzi a notte, dall’appartamento libero più economico | Prezzo del soggiorno | con sconto del 5 % | per appartamento, non a persona · tassa di soggiorno inclusa | per il soggiorno |
| pt | Preços por noite, a partir do apartamento livre mais económico | Preço da estadia | com 5 % de desconto | por apartamento, não por pessoa · taxa turística incluída | pela estadia |
| sv | Pris per natt, från den billigaste lediga lägenheten | Pris för vistelsen | med 5 % rabatt | per lägenhet, inte per person · turistskatt ingår | för vistelsen |
| hu | Éjszakánkénti árak a legolcsóbb szabad apartmantól | A tartózkodás ára | 5 % kedvezménnyel | apartmanonként, nem személyenként · az idegenforgalmi adóval együtt | a teljes tartózkodásra |
| da | Priser pr. nat, fra den billigste ledige lejlighed | Pris for opholdet | med 5 % rabat | pr. lejlighed, ikke pr. person · inkl. turistafgift | for opholdet |

| jazyk | plno | obsazeno | terminPlno |
|---|---|---|---|
| cs | plno | obsazeno | V tomto termínu už máme plno. Zkuste prosím jiný. |
| en | full | booked | We are fully booked on these dates. Please try other dates. |
| de | belegt | belegt | In diesem Zeitraum sind wir ausgebucht. Bitte wählen Sie einen anderen Termin. |
| pl | brak | zajęte | W tym terminie nie mamy już wolnych miejsc. Wybierzcie proszę inny. |
| uk | зайнято | зайнято | На ці дати вільних місць уже немає. Оберіть, будь ласка, інші. |
| zh-Hant | 客滿 | 已訂滿 | 此期間已客滿，請選擇其他日期。 |
| es | completo | ocupado | En estas fechas ya no tenemos disponibilidad. Elijan otras, por favor. |
| fr | complet | occupé | Nous sommes complets à ces dates. Merci de choisir d’autres dates. |
| it | pieno | occupato | In queste date siamo al completo. Scegliete altre date, per favore. |
| pt | cheio | ocupado | Nestas datas já não temos disponibilidade. Escolham outras, por favor. |
| sv | fullt | upptaget | Vi är fullbokade dessa datum. Välj gärna andra datum. |
| hu | foglalt | foglalt | Ebben az időszakban már nincs szabad helyünk. Kérjük, válasszanak másik időpontot. |
| da | optaget | optaget | Vi er fuldt booket i denne periode. Vælg venligst andre datoer. |

Tvary „noc“ (Intl.PluralRules): cs noc / noci / nocí · en night / nights · de Nacht / Nächte · pl noc / noce / nocy · uk ніч / ночі / ночей · zh-Hant 晚 · es noche / noches · fr nuit / nuits · it notte / notti · pt noite / noites · sv natt / nätter · hu éj · da nat / nætter.

---

## 6. Texty, které slibovaly „pošleme cenu“ (platí jen při zapnutých cenách)

Projdi texty všech druhů poptávky ve všech 13 jazycích. Kde se slibuje, že cenu pošleme:
- **úvod kroku 1:** věrný host → `uvodVernostCena`; doporučený host → `poptavkaNapoveda` (bod 3); běžná poptávka → poslední věta s „pošleme cenu“ se nahradí `poptavkaNapoveda`,
- **děkujeme:** všechny druhy kromě firmy → `dekujemePotvrdime` (dnes např. „Cenu vám obvykle pošleme do hodiny…“ nebo „Ověříme volný apartmán…“).
Firma zůstává beze změny. Pošli mi seznam, co jsi kde změnil.

| jazyk | uvodVernostCena | dekujemePotvrdime |
|---|---|---|
| cs | Vyberte termín a cenu se slíbenou slevou uvidíte hned. | Termín pro vás blokujeme. Obvykle do hodiny vám ho potvrdíme. Odpovídáme od 8 do 20 hodin. |
| en | Choose your dates and you will see the price with your promised discount right away. | We are holding the dates for you. We will usually confirm them within an hour. We reply between 8 am and 8 pm. |
| de | Wählen Sie den Termin, und Sie sehen den Preis mit dem versprochenen Rabatt sofort. | Wir halten den Termin für Sie frei. In der Regel bestätigen wir ihn innerhalb einer Stunde. Wir antworten von 8 bis 20 Uhr. |
| pl | Wybierzcie termin, a cenę z obiecaną zniżką zobaczycie od razu. | Blokujemy dla Was ten termin. Zwykle potwierdzimy go w ciągu godziny. Odpowiadamy od 8 do 20. |
| uk | Оберіть дати, і ціну з обіцяною знижкою побачите одразу. | Ми бронюємо для вас ці дати. Зазвичай підтвердимо їх протягом години. Відповідаємо з 8 до 20 години. |
| zh-Hant | 選擇日期後，即可立即看到含承諾折扣的價格。 | 我們正在為您保留日期，通常會在一小時內確認。回覆時間為 8:00 至 20:00。 |
| es | Elijan las fechas y verán al instante el precio con el descuento prometido. | Les reservamos las fechas. Normalmente se las confirmaremos en una hora. Respondemos de 8 a 20 h. |
| fr | Choisissez vos dates et vous verrez tout de suite le prix avec la réduction promise. | Nous bloquons ces dates pour vous. Nous vous les confirmerons en général dans l’heure. Nous répondons de 8 h à 20 h. |
| it | Scegliete le date e vedrete subito il prezzo con lo sconto promesso. | Blocchiamo le date per voi. Di solito ve le confermiamo entro un’ora. Rispondiamo dalle 8 alle 20. |
| pt | Escolham as datas e verão de imediato o preço com o desconto prometido. | Estamos a reservar as datas para vocês. Normalmente confirmamos dentro de uma hora. Respondemos das 8h às 20h. |
| sv | Välj datum så ser ni direkt priset med den utlovade rabatten. | Vi håller datumen åt er. Vi bekräftar dem vanligtvis inom en timme. Vi svarar mellan 8 och 20. |
| hu | Válasszanak időpontot, és az ígért kedvezménnyel csökkentett árat azonnal látják. | Lefoglaljuk Önöknek az időpontot. Általában egy órán belül visszaigazoljuk. 8 és 20 óra között válaszolunk. |
| da | Vælg datoer, så ser I med det samme prisen med den lovede rabat. | Vi holder datoerne for jer. Vi bekræfter dem normalt inden for en time. Vi svarer mellem kl. 8 og 20. |

---

## 7. Kontrola na konci
- Zlatá tlačítka mají všude text (cs, de, zh-Hant).
- Telefon: 602123456 s +420, „00420 602 123 456“, +49 1512 3456789 projdou; „123“ ukáže chybu.
- Doporučený host: výběr jazyka poprvé ano, podruhé ne; krok 1 jeden odstavec.
- Plné dny (data 22. 11.): 22.–24. 11., 27.–28. 11., 4.–5. 12., 12. 12., 31. 12., 1. 1. → `plno`.
- 18.–21. 12. 2026, doporučený host: volná jen Jemná harmonie, 9 470 Kč přeškrtnuto, 8 996 Kč; ostatní apartmány `obsazeno`.
- 24.–26. 12. 2026: nejlevnější (V2 nebo V3) 1 590 + 1 950 = 3 540 Kč, se slevou 3 363 Kč.
- 30. 12.–2. 1. nepustí dál.
- Běžná poptávka: ceny bez přeškrtnutí. Firma: obsazenost ano, ceny nikde.
- Vypínač cen vypnout → poptávka bez čísel a s dnešními texty, obsazenost dál funguje.
- Testová rezervace v průvodci na Preview (prefix `test:`) na volný den → den/apartmán se hned zavře.
