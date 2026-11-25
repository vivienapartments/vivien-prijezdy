# Odpovědi na bod 0 (PROMPT-FINAL-POPTAVKA) · 22. 11. 2026

Pro Clauda před body 5–6. Nic se v Upstash neměnilo. Hesla a čísla hostů tu nejsou.

## 1. Ze kterých kanálů chodí rezervace do průvodce?

Ano, ze všech čtyř, jak je majitel zná:

| Kanál | Jak se pozná v průvodci |
|---|---|
| Booking | e-mail z Better Hotelu / schránky, pole `zdroj` např. `Booking` / `Booking.com` |
| Airbnb | stejně, `zdroj` např. `Airbnb` |
| Web / Better Hotel (přímá) | interní e-mail z BH, `zdroj` často `přímá` |
| Ruční zápis | majitel v přehledu (`rezervace-rucne`), `zdroj` `přímá` |

Automat čte schránku (IMAP), skládá kartu `rez:*`. Ruční zápis jde mimo e-mail.

## 2. Pozná průvodce storno?

Ano. Stav karty `stav === 'zruseno'` (z e-mailu o zrušení / druh `zruseni`). Stornovaná rezervace se v obsazenosti **nepočítá** (nebude blokovat den).

## 3. Ví u každé rezervace, o který apartmán jde (V1–V5)?

Ano, pole `apartman: 'V1'…'V5' | null`. U většiny karet je apartmán vyplněný. Když chybí (`null`), pro kalendář platí pravidlo z promptu: počítat jako 1 obsazený apartmán do součtu za den, ne jako konkrétní V1–V5.

## 4. Porovnání 22. 11. 2026 – 12. 1. 2027

Zdroj tabulky: list **Podle screenshotů** v `VIVIEN_obsazenost_2026-11-22.xlsx`.  
Zdroj průvodce: ostré klíče `rez:*` v Upstash (195 karet celkem, v rozsahu 47 aktivních bez storna).

**Jen rozdíly** (datum, apartmán, průvodce, tabulka). Nic se neopravovalo.

| Datum | Apartmán | Průvodce | Tabulka |
|---|---|---|---|
| 2026-11-27 | V4 | volno / není | OBSAZENO |
| 2026-11-28 | V4 | volno / není | OBSAZENO |
| 2026-12-04 | V2 | volno / není | OBSAZENO |
| 2026-12-05 | V2 | volno / není | OBSAZENO |
| 2026-12-10 | V1 | volno / není | OBSAZENO |
| 2026-12-11 | V1 | volno / není | OBSAZENO |
| 2026-12-11 | V2 | volno / není | OBSAZENO |
| 2026-12-11 | V3 | volno / není | OBSAZENO |
| 2026-12-12 | V1 | volno / není | OBSAZENO |
| 2026-12-12 | V2 | volno / není | OBSAZENO |
| 2026-12-12 | V3 | volno / není | OBSAZENO |
| 2026-12-31 | V4 | volno / není | OBSAZENO |
| 2027-01-01 | V4 | volno / není | OBSAZENO |
| 2027-01-02 | V4 | volno / není | OBSAZENO |
| 2027-01-03 | V4 | volno / není | OBSAZENO |

**Shrnutí:** 15 rozdílů. Všude tabulka říká OBSAZENO a průvodce o rezervaci neví (nebo ji nemá na tom apartmánu). Obrácený případ (průvodce obsazeno, tabulka volno) v tomto rozsahu nevyšel. Rezervace bez apartmánu v tomto výřezu jako samostatný řádek nevyšly.

Soubor `tmp-rozdily-obsazenost.json` je jen pracovní výstup skriptu, do gitu nepatří.

---

## Stav bodu 5 (kalendář) · 22. 11. 2026 večer

### Hotovo v kódu
- Model: `kalendar-denni.ts` (xlsx ceny + obsazenost, rezervace z průvodce, sleva 5 %, plno).
- Klíče: `kalendar-denni`, `kalendar-meta` (na Preview `test:` přes `kalendar-klic.ts`).
- API host: `GET /api/poptavka/kalendar`.
- API přehled: `GET/POST /api/prehled/kalendar` (vypínač cen výchozí zapnuto, Nahrát xlsx).
- UI: Termín (cena pod dnem, plno), souhrn ceny, dlaždice `obsazeno` + cena, kontakt + WA/SMS.
- Přehled Domů: blok „Kalendář a ceny“.
- Texty kalendáře: `kalendar-texty.ts`. Bod 6 texty platí jen při zapnutých cenách.
- Skript nahrání: `scripts/nahraj-kalendar-xlsx.mjs` (xlsx se necommitují).

### Opravy po testu · dávka 4 (22. 11. 2026) · telefon + Telegram
- Telefon: autocomplete tel-national, autofill zůstane, chyba jen pod polem, bez bílé šipky.
- Telegram: české datum a noci, název apartmánu, cena se slevou, odkud, jazyk; ZKOUŠKA u TEST.
- Odkaz /prehled?poptavka=id otevře detail (Zavolat, WhatsApp, Potvrdit termín).

## OPRAVY-PO-TESTU-2 · 23. 11. 2026

### A · iPhone, zpět, jazyk (nasazeno)
- Kalendář otevřený do document.body (portal), mimo overflow:hidden karty. Div místo label, touch-action, z-index 200.
- Šipka Zpět / gesto: history.pushState po každém kroku, popstate o krok zpět; z prvního kroku lze odejít.
- Rozpracovaná poptávka v localStorage, po odeslání smazat.
- Přepínač jazyka jen v kroku termín (VyberJazyka u ?od= zůstává).
- Patička: malá šedá verze (commit + čas nasazení) v poptávce i po odjezdu.

### B · Chytrý kalendář (nasazeno)
- Jeden kalendář: po příjezdu jen možné odjezdy (dosah jednoho apartmánu), zlatý čárkovaný rámeček a „odjezd“.
- Odjezd není noc. Souhrn s nocemi a „ráno“. Texty A–G ve 13 jazycích.
- Apartmány: volné nahoře, obsazené dole.

## 2026-11-23 09:24 · C e-mail po odjezdu
- HTML podle nahled-email-po-odjezdu: logo v kruhu, střed, 5&nbsp;%, PNG ikony, CTA Využít výhody.
- Ikony: public/email/ikona-kalendar.png, ikona-darek.png, ikona-telefon.png.
- Stav: nasazuji na ostrou + zkušební mail jen majiteli.

## 2026-11-23 09:35 · C e-mail po odjezdu
- HTML podle nahled-email-po-odjezdu: logo v kruhu, střed, 5&nbsp;%, PNG ikony, CTA Využít výhody.
- Ikony: public/email/ikona-kalendar.png, ikona-darek.png, ikona-telefon.png.
- Stav: nasazuji na ostrou + zkušební mail jen majiteli.

## 2026-11-23 09:36 · C hotovo
- Nasazeno bd195da na master. Zkušební e-mail odeslán jen na info@vivienapartments.cz (rez:TESTPOMAJ).

## 2026-11-23 09:38 · D klikací telefony
- Kontaktní čísla jako tlačítka se zlatým rámečkem a ikonou (poptávka, po odjezdu, e-mail).
- Soubory: KontaktTelefony.tsx, Expired.tsx, PoptavkaForm.tsx, podekovani-email.ts, ikona-hovor.png.
- Stav: nasazuji na ostrou.

## 2026-11-23 09:39 · E před startem: co dělá „Potvrdit termín“
- Dnes: POST /api/prehled/poptavka s akce=potvrdit jen přepíše stav poptávky na hotovo. Neotevírá WhatsApp/SMS, neblokuje apartmán, nepočítá lhůtu, nepřipomíná.
- Dál: stavový tok podle OPRAVY-PO-TESTU-2 E (blokace, připomínky, POTVRDIT/HOST POTVRDIL/ZAPSÁNO/NEJDE/PRODLOUŽIT).

## 2026-11-23 09:39 · E NEJDE texty (ke kontrole, mimo cs)
- en: Hello {jmeno}, thank you for your enquiry. The dates {termin} are no longer available. We can offer: {navrh}. Please let us know if that works for you. Nikol, VIVIEN Apartments
- de: Guten Tag {jmeno}, danke für Ihre Anfrage. Der Termin {termin} ist leider nicht mehr frei. Wir können Ihnen anbieten: {navrh}. Schreiben Sie uns bitte, ob Ihnen das passt. Nikol, VIVIEN Apartments
- pl: Dzień dobry {jmeno}, dziękujemy za zapytanie. Termin {termin} jest już niestety zajęty. Możemy zaproponować: {navrh}. Napiszcie nam proszę, czy Wam to odpowiada. Nikol, VIVIEN Apartments
- uk: Добрий день, {jmeno}, дякуємо за запит. Термін {termin} на жаль уже зайнятий. Можемо запропонувати: {navrh}. Напишіть нам, будь ласка, чи вам це підходить. Nikol, VIVIEN Apartments
- zh-Hant: {jmeno} 您好，感謝您的詢問。{termin} 的日期已滿。我們可提供：{navrh}。請告訴我們是否適合您。Nikol，VIVIEN Apartments
- es: Hola {jmeno}, gracias por su consulta. Las fechas {termin} ya no están libres. Podemos ofrecerles: {navrh}. Escríbannos si les conviene. Nikol, VIVIEN Apartments
- fr: Bonjour {jmeno}, merci pour votre demande. Les dates {termin} ne sont plus libres. Nous pouvons vous proposer: {navrh}. Dites-nous si cela vous convient. Nikol, VIVIEN Apartments
- it: Buongiorno {jmeno}, grazie per la richiesta. Le date {termin} non sono più libere. Possiamo proporvi: {navrh}. Scriveteci se va bene. Nikol, VIVIEN Apartments
- pt: Olá {jmeno}, obrigado pelo pedido. As datas {termin} já não estão livres. Podemos oferecer: {navrh}. Digam-nos se vos serve. Nikol, VIVIEN Apartments
- sv: Hej {jmeno}, tack för förfrågan. Datumet {termin} är tyvärr inte ledigt längre. Vi kan erbjuda: {navrh}. Skriv gärna om det passar er. Nikol, VIVIEN Apartments
- hu: Jó napot, {jmeno}! Köszönjük a megkeresést. A(z) {termin} időpont sajnos már foglalt. Ezt tudjuk ajánlani: {navrh}. Írják meg, kérjük, megfelel-e. Nikol, VIVIEN Apartments
- da: Hej {jmeno}, tak for henvendelsen. Terminen {termin} er desværre ikke ledig længere. Vi kan tilbyde: {navrh}. Skriv gerne, om det passer jer. Nikol, VIVIEN Apartments

## 2026-11-23 09:42 · E vyřízení poptávky hotovo
- Po odeslání: blokace nejlevnějšího/zvoleného apartmánu, stav Předběžně.
- Telegram připomínky z cronu /api/zpracuj (~2 min), noc 20–8 max 2 (hned + 30 min). ZKOUŠKA bez připomínek.
- Detail: POTVRDIT / HOST POTVRDIL / ZAPSÁNO V BH / NEJDE / PRODLOUŽIT O 24 H + lhůta a texty.
- Stav: nasazuji na ostrou.

## 2026-11-23 09:48 · Oprava NEJDE pt/fr/uk
- pt: agradecemos o vosso pedido
- fr: mezera před dvojtečkou (proposer : {navrh})
- uk: Термін {termin}, на жаль, уже зайнятий.
- Stav: nasazeno na ostrou

## 2026-11-23 10:09 · Úklid testovacích poptávek + pojistka ZKOUŠKA
- Uzavřeno 5 aktivních (stav nejde, bez blokace, bez připomínek):
  1. pmwsbueyoatozle Pravoslav Tomek TESTPOMAJ 16.–18. 12. 2026
  2. pmwsbh6eon1com5 Pravoslav Tomek TESTPOMAJ 25.–26. 11. 2026
  3. pmws96yrs8lu9uo Pravoslav Tomek TESTPOMAJ 25.–26. 11. 2026
  4. pmwryr1w47qkgtp Rr 25.–27. 11. 2026
  5. pmwrto18j3dbq9p Ndjd 22.–26. 11. 2026
- Žádná z nich neměla blokApt. Aktivní blokace po úklidu: 0.
- Kód: ZKOUŠKA / test: / TEST* = bez Telegramu, bez připomínek, bez blokace.

## 2026-11-23 10:12 · Smazány všechny poptávky
- Na pokyn majitele vymazán celý seznam poptavky:seznam (6 záznamů, včetně Nikol tvrdaruza a testů). Po smazání 0.

## 2026-11-23 10:14 · Termín: Cena za pobyt od …
- Na kroku Termín je „Cena za pobyt od {cena}“ (věrný/doporučený přeškrtnutá + zlatá). Přesná cena zůstává u dlaždic a na Kontaktu.
- Stav: nasazeno

## 2026-11-23 10:25 · Náhled věrný/doporučený
- Adresa: http://localhost:3011/nahled-poptavka-cesty (přepínač nahoře, suchý běh).
- Stav: jen náhled vpravo

## 2026-11-23 11:13 · Jak to teď vypadá (pro majitele s Claudem)

Majitel si to chce projít s tebou od začátku do konce. Níže je přesný stav. Nic z toho neměň, dokud neřekne.

### Kde zkoušet
- Lokální náhled s přepínačem: `http://localhost:3011/nahled-poptavka-cesty` (větev `doporuceni`, port 3011, suchý běh = nic se neukládá / nejde do Telegramu).
- Nahoře přepínač **Věrný** / **Doporučený**. Po přepnutí se formulář resetuje (`key={rezim}`).
- Ostrá: `/poptavka?t=…` (věrný) nebo odkaz doporučitele. Zkouška: `/poptavka?zkouska=1`.

### Důležité (ať se neplete)
- **Žádná dvě políčka** „datum příjezdu“ a „datum odjezdu“. Termín = **hned otevřený kalendář**. Klepnutí na den = příjezd, druhé klepnutí = odjezd.
- Kalendář není „něco navíc“. Je to **krok 1**.
- **Děkujeme** je až po **Odeslat poptávku** na Kontaktu. Ne dřív.

### Věrný host · pořadí obrazovek
1. **Termín** – fotka / logo, „Rádi vás uvidíme znovu“, „Klepněte na den příjezdu.“ Kalendář otevřený. Jazyk: roletka CS vpravo nahoře (jen na tomto kroku).
2. Po klepnutí na příjezd – text „Teď klepněte na den odjezdu…“, možné odjezdy (dosah), „odjezd“ na dni.
3. Po odjezdu – souhrn termínu (noci, ráno), **„Cena za pobyt od …“** (přeškrtnutá plná + zlatá se slevou 5 %), tlačítko **Pokračovat**.
4. **Jak vybereme apartmán?** – tři volby (vyberu si / kterýkoli volný / dotazník).
5. **Apartmány** (když „vyberu si“) – dlaždice s **přesnou** cenou za pobyt + „se slevou 5 %“, obsazené dole. Detail → **Vybrat tento apartmán**.
6. **Kontakt** – souhrn nahoře (termín · apartmán · cena se slevou), jméno, telefon, poznámka, **Odeslat** / WhatsApp / SMS, telefony Nikol + 604.
7. **Děkujeme** – „Děkujeme, že se k nám vracíte.“ Blokujeme termín, potvrzení do hodiny, zlaté „Spěcháte? Zavolejte…“, Přidat na plochu, telefony.

### Doporučený host · pořadí
Stejné kroky 1–7. Rozdíly jen v textech a fotce:
- Úvod: „Rádi vás u nás přivítáme“, večerní zahrada, „Na první pobyt u nás máte slevu 5 %.“
- Na Termínu také „Cena za pobyt od …“ se slevou.
- Děkujeme má své texty pro doporučeného (ne „že se k nám vracíte“).

### Co už je na ostré (související)
- OPRAVY-PO-TESTU-2 A–E, oprava NEJDE pt/fr/uk, ZKOUŠKA bez TG/připomínek/blokace, „Cena za pobyt od …“ na Termínu.
- Testovací poptávky v Upstash smazány (0).

### Co majitel chce od tebe
Projít s ním Věrného a Doporučeného **od první obrazovky po Děkujeme**, krok po kroku, ať vidí konkrétní vzhled. Nezačínat uprostřed. Náhledy do Telegramu neposílat.

## 2026-11-23 11:24 · Termín finální (políčka + panel)
- Na kroku Termín: fotka, nadpis, text + **Příjezd / Odjezd** (bez trvale otevřeného kalendáře).
- Klepnutí otevře panel: záložky Příjezd|Odjezd, pokyny A/B (+ C při dosahu &lt; 7), po odjezdu zavření, souhrn + „Cena za pobyt od …“ + Pokračovat.
- Příjezd = výběr znovu. Odjezd = jen změna odjezdu. Šipka zpět zavře panel.
- Stav: nasazeno (9f791f4)

## 2026-11-23 12:40 · bod 0 pravidlo nahledy-claude
- Pravidlo `.cursor/rules/nahledy-claude.mdc`: `nahled-*.html` od Clauda jsou přibližné návrhy (obsah, pořadí, texty). Vzhled řídí aplikace.
- Stav: nasazeno (bac3254)

## 2026-11-23 12:40 · bod 1 OPRAVY-PO-TESTU-3
- Termín: hustý souhrn bez roku, bez „se slevou 5 %“ a bez „Ráno odjíždíte…“, legenda jen u příjezdu.
- Stav: nasazeno (d0a8217)

## 2026-11-23 12:40 · bod 2 OPRAVY-PO-TESTU-4
- Výsledek dotazníku varianta A (karty volných, obsazené až dole). Oprava červené hlášky pryč.
- Stav: nasazeno (72c1f1d)

## 2026-11-23 12:40 · bod 3 PROMPT-ICAL
- Obsazenost z Better Hotel iCal (`ICAL_V1`…`ICAL_V5` v `.env.local` i Vercel Production + Preview). Soubor `ICAL-ODKAZY.local.txt` smazán, `*.local.txt` v `.gitignore`. URL nikde v logu ani v tomto souboru.
- Cron `/api/zpracuj` obnoví iCal max každých 10 min. Přehled: řádek iCal + „Načíst teď“.
- Skládání: iCal NEBO rezervace průvodce NEBO blokace poptávky; xlsx obsazenost jen když iCal není načtený. Ceny dál z xlsx.
- Porovnání iCal vs list „Podle screenshotů“ (22. 11. 2026 – 12. 1. 2027), 6 rozdílů:

| Datum | Apt | iCal | Tabulka |
|---|---|---|---|
| 2026-12-10 | V1 | volno | OBSAZENO |
| 2026-12-27 | V1 | OBSAZENO | volno |
| 2026-12-28 | V1 | OBSAZENO | volno |
| 2026-12-29 | V3 | OBSAZENO | volno |
| 2026-12-11 | V4 | OBSAZENO | volno |
| 2026-12-07 | V5 | OBSAZENO | volno |

- Plné dny 27.–28. 11., 4.–5. 12., 12. 12., 31. 12., 1. 1.: všechny 5/5 PLNÉ podle iCal.
- Stav: nasazeno (`ff4336a` na master)

## 2026-11-23 15:55 · Volné termíny kalendář (texty ke kontrole)

Tři nové texty (vykání), 13 jazyků:

| Jazyk | Volné termíny: {apt} | Nejbližší volný termín: {termin} | Vybrat tento termín |
|---|---|---|---|
| cs | Volné termíny: {apt} | Nejbližší volný termín: {termin} | Vybrat tento termín |
| en | Free dates: {apt} | Nearest free stay: {termin} | Choose these dates |
| de | Freie Termine: {apt} | Nächster freier Termin: {termin} | Diesen Termin wählen |
| pl | Wolne terminy: {apt} | Najbliższy wolny termin: {termin} | Wybrać ten termin |
| uk | Вільні дати: {apt} | Найближчий вільний термін: {termin} | Вибрати цей термін |
| zh-Hant | 可訂日期：{apt} | 最近的空房：{termin} | 選擇此日期 |
| es | Fechas libres: {apt} | Fecha libre más cercana: {termin} | Elegir estas fechas |
| fr | Dates libres : {apt} | Prochaine date libre : {termin} | Choisir ces dates |
| it | Date libere: {apt} | Data libera più vicina: {termin} | Scegliere queste date |
| pt | Datas livres: {apt} | Data livre mais próxima: {termin} | Escolher estas datas |
| sv | Lediga datum: {apt} | Närmaste lediga datum: {termin} | Välj dessa datum |
| hu | Szabad időpontok: {apt} | Legközelebbi szabad időpont: {termin} | Ezt az időpontot választom |
| da | Ledige datoer: {apt} | Nærmeste ledige dato: {termin} | Vælg denne dato |

fi = en (stejně jako jinde).

## 2026-11-25 18:30 · Booking relay · kompletní ochrana + seznam míst

Centrální brána `src/lib/odchozi-host.ts` (`overOdchoziHostovi` / `pripravTextSmsWa`):
- marketing na relay e-mail = zákaz + Telegram `automat`
- provoz na relay = vyčistit slevu (více jazyků) a odkazy `/poptavka`, `/klub`, `/doporucitel`, `?od=`, `#doporucit`; nejde-li, zákaz + Telegram
- SMS/WhatsApp marketing (poděkování) na telefon při relay e-mailu = povolit (nejde přes schránku Booking)
- SMS/WhatsApp provoz při relay = stejné čištění obsahu

### Seznam míst, odkud aplikace hostům píše

| Místo | Kanál | Co | Ohlídání |
|---|---|---|---|
| Automat / inbox → `posliPruvodce` → `sendGuestEmail` | e-mail | průvodce (souhrn + tlačítko) | `odchozi-host` druh `provozni` |
| Přehled menu zpráv → `posliEmailZpravy` | e-mail | check-in, brána, odjezd, pohoda, shrnutí, připraveno… | `odchozi-host` přes `druhZpravyNaOdchozi` (jen `podekovani` = marketing) |
| Přehled poděkování e-mailem | e-mail | po odjezdu se slevou / doporučením | nejdřív skutečný e-mail (`podekovani.ts`); pak brána druh `podekovani` |
| Přehled WhatsApp / SMS (odkaz wa.me / sms:) | WA / SMS | stejné menu zpráv | API `akce` + `PrehledClient` přes `pripravTextSmsWa` / `overOdchoziHostovi` |
| Přehled poděkování WA / SMS | WA / SMS | marketing na telefon | povolené (ne přes relay schránku) |
| Závady předání / po odjezdu | e-mail | `posliEmailZpravy` provozni | brána `provozni` |
| Úklid → apartmán připravený | e-mail | `posliEmailZpravy` | brána `provozni` |
| Doklad / faktura hostovi | e-mail | `posliEmailDokladu` | brána `provozni` |
| Tip kamarádovi | e-mail | `/api/doporuceni/tip-email` | brána druh `tip-kamaradovi` |
| Upozornění majiteli (Telegram / e-mail na info) | ne host | `upozorneni.ts` | netýká se relay |

Testy: `odchozi-host.test.ts` včetně každého typu z menu (e-mail / SMS / WA). npm test 597/597.

Klub na master nešel (zůstává Preview / `doporuceni`).

### Preview /prehled/klienti
- Záloha migrace: `.data/zalohy-klub/dop-2026-11-25T17-24-37-873Z.json` (0 klíčů `dop*`). Migraci v UI spustí majitel po přihlášení.
- Sdílecí odkaz (Vercel Share, 7 dní, bez Vercel SSO; heslo přehledu `ADMIN_HESLO` zůstává):
  (odkaz předán majiteli v chatu, platnost 7 dní)


## 2026-11-25 20:23 · PROMPT-ZDROJ-A-PRIME-REZERVACE · hotovo a nasazeno

Nasazeno na master `ac4707b` (Vercel ostrá). Testy 596/596. Klubové UI zůstává jen Preview; na master jen brána + zdroj + přehled.

### Co běží
1. Obchodní e-mail nikam, kde adresa obsahuje booking / airbnb / expedia. WA/SMS marketing jen na telefon z check-inu.
2. Zdroj: Agentura / e-mail → Booking|Airbnb; spárování s poptávkou → přímá; jinak Telegram + volba Přímá/Booking/Airbnb v přehledu. Dokud čeká: žádné obchodní zprávy.
3. Úrovně klubu „Bronzový host“ / „… partner“ zůstávají na větvi `doporuceni` (soubor klub-pravidla na master není).

### Ostrá data `rez:*` (211 karet)
- Booking 145, Airbnb 21, přímá 7, prázdný zdroj 38.
- Prázdný zdroj: 28 bez e-mailu, jinak gmail.com (4), seznam.cz (4), centrum.cz (1), egd.cz (1). Pole Agentura v kartách `rez:*` dnes není uložené (zdroj se bere z parsování interního mailu).
- Ruční BH rezervace dnes často končí s prázdným `zdroj` (včetně firemních domén jako egd.cz). Nový tok je má spárovat s poptávkou nebo se zeptat.

### Návrh příznaku pro šablonu BH (přímý host)
Nejlépe: do pole **Agentura** v Better Hotelu napsat pevně `přímá` (nebo `VIVIEN`). Aplikace to už čte a nastaví zdroj přímá bez Telegramu.
Záloha: pevné slovo `VIVIEN-PRIMA` v textu šablony (předmět nebo první řádek těla) — když BH Agenturu nepůjde spolehlivě vyplnit, doplníme čtení z textu.
Typ ceny je slabší (mění se, hůř se čte).

## 2026-11-25 21:01 · PROMPT-DATA-PRIMA-A-KLUB-DAVKA-2

### Body 1–2 (ostrá, master `c490d03` / `6aa367a`)
- `TYP: PRIMA` + ACC pole, Doplnit zdroj, Telegram jen u nových. Check-in odkaz v přehledu pro ruční odeslání.

### Bod 3 (jen Preview `doporuceni` `c333923` + `ed4c30c`, `KLUB_ZAPNUTO`)
- Párování / založení `klient:*` při předání (přímá + kontakt).
- Útrata z ACC_PRICE po předání, když SALDO 0 nebo platba v aplikaci; ruční doplnění v `/prehled/klienti`.
- Import xlsx: náhled → potvrzení; seznam přímých hostů pro poděkování.
- Doporučitel bez pobytu: 5 % na první vlastní pobyt.

## 2026-11-25 21:07 · BH šablony večer (doplnění dávky 2)

Nasazeno na master `d681338` (ostrá). Zdroj na `doporuceni` `f77b51b`.

- **VIVIEN-DATA v1** (automat po check-inu → info@): čte ACC_PRICE, SALDO, KUPON, FAKTURA_PRO, ZALOZIL, CHECKIN_URL i **bez** `TYP: PRIMA`. Staré maily bez těchto řádků fungují dál.
- **Šablona „přímá“** (`TYP: PRIMA`): ručně z BH na info@ = jistá přímá. Cizí odesílatel nebo bez platného KLIC → odmítnout + Telegram. Hostovi nic.
- Automatická kampaň v BH je **vypnutá** (neumí jen info@). Do hovoru s BH zítra zůstává ruční odeslání.
- Klub dávka 3 **není** na master.
