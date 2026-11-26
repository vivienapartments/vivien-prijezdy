# PROMPT: Poděkování po odjezdu napojené na VIVIEN Klub (kartu)

Pošli až po dokončení `PROMPT-KARTA-TLACITKA-A-STAVY.md`.

## Pravidla
- Platí `PRAVIDLA-STAVBY-KLUBU.md`:
  - větev `doporuceni`, jen Preview, všechno za `KLUB_ZAPNUTO`;
  - dokud je klub vypnutý, poděkování a stránka po odjezdu fungují přesně jako dnes.
- **Nejtvrdší pravidlo, Booking brána `odchozi-host.ts`:**
  - nic obchodního na adresy s booking/airbnb/expedia ani přes jejich zprávy;
  - poděkování jde jen na skutečný e-mail nebo telefon, který host zadal v průvodci;
  - `bezMarketingu` = nic.
- Udělej to celé najednou.
- Potom spusť `node scripts/kontrola-zakladu.mjs` a `npm test`.
- Zkušební e-mail pošli jen na info@vivienapartments.cz.
- Pošli mi výsledek se screenshoty vedle náhledu.
- Design je závazný. Vzor: `nahled-podekovani-a-karta.html`, 4 sloupce.

## 1. E-mail po odjezdu (sloupec 1)
- Horní část zůstává beze změny: hlavička `hlavicka-po-odjezdu.jpg`, „Děkujeme za návštěvu.“, text, podpis „Nikol a rodina VIVIEN“.
- Pod oddělovací čáru přidej:
  1. „Váš pobyt jsme započítali.“ a pod ním zlatě „Tímto pobytem máte úroveň [úroveň].“
     - Oslovení je neutrální, bez rodu (rozhodnutí majitele).
     - Pokud se úroveň nezměnila: „Vaše úroveň: [úroveň].“
     - Host přes Booking: „Jako poděkování máte 5 % na další pobyt, když rezervujete napřímo u nás.“ Řádek „započítali“ u něj vynech.
  2. **Kartička jako obrázek PNG**, ne CSS. E-mailové klienty masky neumí.
     - Předgeneruj 6 obrázků bez jména, jeden na úroveň: `public/email/karticka-{uroven}.png`, šířka 600 px, retina. Na obrázku je VIVIEN KLUB, úroveň, „sleva na další pobyt X %“ a vtisknuté logo.
     - Pro firmy totéž s „partner“.
     - Jméno hosta je pod obrázkem jako text.
  3. Řádek „Do úrovně [další] ([%]) vám chybí X Kč.“ a pruh jako tabulka.
     - U nejvyšší úrovně: „Máte nejvyšší úroveň.“
  4. „Jako poděkování pro vás máme:“ a tři řádky, které už máme, s novými texty:
     - Rezervovat další pobyt / sleva X % při rezervaci napřímo,
     - Doporučit přátelům / přítel má 5 %, vy kredit na pobyt,
     - Přidat na plochu / vaše karta vždy po ruce.
  5. Hlavní zlaté tlačítko **„Otevřít moji kartu“**, odkaz na `/klub?k=…`.
- Všech 13 jazyků jako dnes.

## 2. Karta po odjezdu – první otevření (sloupec 2)
- Při prvním otevření po odjezdu je nahoře poděkování: fotka, „Děkujeme za návštěvu.“, text a podpis jako na dnešní stránce po odjezdu.
- Pod ním je kurzívou věta „A tady je vaše karta VIVIEN Klubu ⌄“. Klepnutí posune na kartu.
- Pod větou je celá karta ve stavu „po odjezdu“ (verze C) a rámeček „Tímto pobytem máte úroveň [úroveň]. Na další pobyt máte X %.“ (neutrální `--tile` / `--tb`, ne modrý)
- **Dnešní samostatná stránka po odjezdu se tím nahrazuje kartou.** Odkazy, které na ni vedou (e-mail, plocha, průvodce), vedou na kartu.

## 3. Každé další otevření (sloupec 3)
- Poděkování se neopakuje. Nahoře je jen kurzívou věta podle situace:
  - do 7 dnů po odjezdu: „Děkujeme za váš pobyt, [křestní jméno].“
  - později: „Rádi vás zase uvidíme, [křestní jméno].“
  - před dalším příjezdem: „Těšíme se na vás za N dní.“
  - v den odjezdu (ještě před předáním): „Dnes odjíždíte, děkujeme. Po předání vám pobyt započítáme.“
- „První otevření“ si pamatuj na serveru u klienta (`podekovaniVidel`), ne jen v prohlížeči.

## 4. Odkaz na průvodce vždy na kartě
- Před příjezdem a během pobytu: velké zlaté „Můj průvodce“, jako dnes.
- Po odjezdu: nenápadný řádek **„Průvodce pobytem · adresa, tipy, kontakt“** (styl jako „Přidat na plochu“, přerušovaný rámeček `--tb`). Odkaz vede na průvodce posledního pobytu.
- „Přidat na plochu“ a „Poslat do dalšího telefonu“ jsou vždy **úplně dole na kartě** (rozhodnutí majitele), viz bod 6.
- Doporučitel bez pobytu průvodce nemá.

## 5. Host přes Booking / Airbnb (sloupec 4)
- **Před příjezdem a během pobytu (jeho první pobyt přes Booking):** jen průvodce v neutrálním tónu Vivien. Vzor `nahled-karta-host-z-bookingu-1-pobyt.html`, sloupce 1 a 2.
  - Nahoře je logo VA, „VIVIEN APARTMENTS“ a jméno.
  - Pod tím uvítání a sekce pobytu se zlatým „Můj průvodce“.
  - Pak řádky „Napište nám · WhatsApp“ a „Přidat na plochu“.
  - **Žádná** kartička, úroveň, slevy, kredit, doporučení ani tlačítka Rezervovat / Doporučit. Odkaz mohl jít přes zprávy Bookingu.
- **Po ubytování (rozhodnutí majitele 26. 11.):** jakmile je check-in hotový a máme skutečné telefonní číslo z průvodce:
  - u pobytu v přehledu a v Telegramu je tlačítko **„Předáno – poslat kartu“**;
  - jedno klepnutí pošle na WhatsApp na **číslo z check-inu** zprávu od Nikol s odkazem na kartu `/klub?k=…`. Nikdy přes zprávy Bookingu, nikdy na relay;
  - text zprávy (13 jazyků): „Dobrý den, [křestní jméno], vítejte u nás. Tady je vaše karta VIVIEN Klubu – najdete v ní průvodce a slevu 5 % na příští pobyt, když rezervujete napřímo: [odkaz]“;
  - stejné tlačítko je i u přímých hostů. Zpráva je pak bez věty o slevě: „…Tady je váš průvodce a karta VIVIEN Klubu: [odkaz]“.
- **Karta během pobytu** (vzor `nahled-booking-host-karta-po-ubytovani.html`, sloupec 3):
  - kartička „Host · na další přímý pobyt 5 %“;
  - neutrální rámeček „Jste u nás poprvé – příště máte 5 %, když rezervujete napřímo.“;
  - pobyt s „Můj průvodce“;
  - tlačítka B „Rezervovat napřímo“ a „Doporučit“;
  - pobyt v seznamu má modrý proužek, šedý text „přes Booking“ a „nepočítá se“.
- **Odkaz z Bookingu (průvodce) zůstává navždy bez klubu.** Klub je jen na odkazu karty, který šel naším kanálem.
- **Po odjezdu:** stejné poděkování a stejná karta jako u přímého hosta, jen:
  - kartička „Host“, „sleva na další přímý pobyt 5 %“ (nárok na 5 % má);
  - rámeček „Jako poděkování máte 5 % na další pobyt, když rezervujete napřímo u nás.“ (neutrální: pozadí `--tile`, rámeček `--tb`, ne modrý – modrá je jen „právě bydlí“);
  - tlačítko „Rezervovat napřímo / další pobyt · 5 %“;
  - pobyt v seznamu šedě: „[datum] · přes Booking“ a „nepočítá se“;
  - do útraty ani kreditu se nepočítá.
- Poděkování mu jde jen na skutečný e-mail z průvodce. Bez něj nic.


## 5b. Okno „Předáno – poslat kartu“ (dodatek 26. 11. 16:10)
- Klepnutí v přehledu u pobytu otevře okno:
  - jméno a kontakty z check-inu,
  - náhled zprávy s odkazem `/klub?k=…`,
  - tlačítka **WhatsApp** (`wa.me`), **SMS** (`sms:`) a **E-mail** (odešle aplikace přes SMTP; dokud nefunguje, `mailto:`),
  - „Kopírovat odkaz“.
- Jen kontakty z check-inu a vše přes `odchozi-host.ts`:
  - relay adresu booking/airbnb/expedia nejde vybrat (neaktivní, s poznámkou „adresa z Bookingu“);
  - bez telefonu jsou WhatsApp a SMS neaktivní.
- Text podle typu hosta (13 jazyků), viz bod 5.
- Po odeslání se uloží `kartaPredana` (čas a kanál) a v přehledu je „Karta poslána · WhatsApp 15:42“. Poslat jde znovu i jiným kanálem.
- U Booking hosta karta ukáže klub **až po `kartaPredana`**. Do té doby vypadá jako neutrální průvodce. Odkaz z Bookingu zůstává bez klubu navždy.
- Testy:
  - před předáním bez klubu;
  - po předání Host + 5 %;
  - relay e-mail nejde vybrat;
  - bez telefonu jsou WhatsApp a SMS neaktivní.

## 6. Přidat na plochu – na kartě vždy, úplně dole (finální podoba 26. 11.)
Vzor `nahled-plocha-uz-ma-3-verze.html`: sloupec **A** a sloupec **B1**. Ostatní sloupce neplatí. Používej stávající logiku plochy (manifest na token, detekce instalace).
- Vždy jeden uzavřený obdélník **úplně dole na kartě**, pod Doporučením: zaoblení 13px, ikona vlevo, nadpis a pod ním věta uvnitř rámečku, akce vpravo.
- Žádné přerušované rámečky, žádná kulatá tlačítka, žádný text mimo rámeček.
- **A · Tento telefon ještě nemá ikonu:** rámeček zlatý `#c9a84c`, pozadí `--tile`, zlatá ikona telefonu s plusem.
  - Nadpis tučně: „Přidat VIVIEN na plochu“.
  - Věta: „Příště kartu i průvodce otevřete jedním klepnutím.“
  - Vpravo zlatě „Přidat ›“.
  - Klepnutí spustí náš průvodce přidáním (iPhone a Android).
- **B1 · Tento telefon už ikonu má, nebo je karta otevřená z ikony:** stejný tvar a velikost, ale tlumený.
  - Rámeček `--tb`, pozadí `--tile`.
  - Ikona sdílení v barvě `--sec`.
  - Nadpis normálním písmem: „Poslat do dalšího telefonu“.
  - Věta: „✓ Na tomto telefonu máte VIVIEN na ploše.“
  - Vpravo šedě „Poslat ›“.
  - Klepnutí otevře sdílení odkazu na kartu (WhatsApp, SMS, kopírovat) s větou „Pošlete jen svým blízkým“.
- Stav se pozná na každém telefonu zvlášť.

## 7. Testy
- Přímý host:
  - e-mail má kartičku správné úrovně a odkaz na kartu;
  - první otevření ukáže poděkování, další už ne.
- Host přes Booking:
  - před odjezdem karta bez klubu;
  - po odjezdu Host s 5 %, pobyt „nepočítá se“;
  - e-mail nikdy na relay adresu.
- `bezMarketingu` → žádný e-mail.
- Host přes Booking: odkaz z Bookingu nikdy neukáže klub; po „Předáno – poslat kartu“ jde WhatsApp jen na číslo z check-inu.
- Plocha: stav A nebo B1 podle zařízení.
- Klub vypnutý → všechno jako dnes.
