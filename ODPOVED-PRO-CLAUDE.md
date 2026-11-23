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

### Opravy po testu · dávka 1 (22. 11. 2026)
- Dlaždice stejně vysoké, fotka nahoře, textová část stejná výška, V5 zkrácený název, obsazeno ztlumené + štítek.
- Poptávka na notebooku max 520 px uprostřed.
- Sleva 5 % zřetelněji (zlatě u ceny v dlaždici i v souhrnu).

### Opravy po testu · dávka 2 (22. 11. 2026)
- `?od=`: výběr jazyka roletkou (varianta C), ne 13 dlaždic.
- Ve všech krocích všech druhů poptávky malá roletka 🌐 vpravo nahoře.

### Opravy po testu · dávka 3 (22. 11. 2026) · kalendář + obsazenost
- Odjezd i při „plno“ ten den; noci (ne dny); příjezd plně zlatě, mezery slabě, odjezd rámeček bez ceny.
- Minulé dny jen tlumené číslo. Hláška bez volného apartmánu + „Ukázat nejbližší volný termín“.
- Dotazník: nejsilnější shoda jen z volných; obsazený ideal se štítkem a „Kdy je volný?“.
- Pojistka API: obsazený apartmán poptávku neodešle (`duvod: obsazeno` + nabídka volných).

### Ostrá · 22. 11. 2026 večer (sluč + nasaď)
- Větev `doporuceni` sloučena do `master` a nasazena (`8b70644`). Commit `117a0ef` (zlatá tlačítka, tmavý text) je v ostré.
- E-mail po odjezdu: tmavý jako stránka, fotka, logo, dopis, 3 výhody, zlaté tlačítko „Otevřít vaše výhody“, předmět `VIVIEN · Děkujeme za návštěvu`, 13 jazyků.
- Nahráno `kalendar-denni` (130 dnů) + `kalendar-meta` (ceny zapnuté).
- Karta `rez:TESTPOMAJ` (`zkusebni: true`, mimo statistiky/kredit/obsazenost). E-mail jen majiteli. Žádný Telegram.

### Ostré odkazy (zkouška majitele)
- Po odjezdu (průvodce): https://vivien-prijezdy-six.vercel.app/eyJyIjoiVEVTVFBPTUFKIiwiYSI6IlYxIiwiZCI6IjIwMjYtMTEtMjEiLCJsIjoiY3MiLCJwIjoiMjAyNi0xMS0xOSIsIm8iOjIsImkiOiIxMjM0IiwiZiI6MX0.2utgI-cWo4lxsi-ePJxiId1mSe3XLQFNXjJw6NBOw68
- Náhled po odjezdu: https://vivien-prijezdy-six.vercel.app/nahled-po-odjezdu
- Poptávka věrný host: https://vivien-prijezdy-six.vercel.app/poptavka?zkouska=1
- Doporučení majitele (`?od=`): https://vivien-prijezdy-six.vercel.app/poptavka?od=a692c6
- Běžná poptávka: https://vivien-prijezdy-six.vercel.app/poptavka
- Firma: https://vivien-prijezdy-six.vercel.app/poptavka?f=raccoon

### Opravy po testu � d�vka 4 (22. 11. 2026) � telefon + Telegram
- Telefon: autocomplete tel-national, autofill z�stane, chyba jen pod polem, bez b�l� �ipky.
- Telegram: �esk� datum a noci, n�zev apartm�nu, cena se slevou, odkud, jazyk; ZKOU�KA u TEST.
- Odkaz /prehled?poptavka=id otev�e detail (Zavolat, WhatsApp, Potvrdit term�n).

## OPRAVY-PO-TESTU-2 · 23. 11. 2026

### A · iPhone, zpet, jazyk (nasazeno)
- Kalendar otevreny do document.body (portal), mimo overflow:hidden karty. Div misto label, touch-action, z-index 200.
- Sipka Zpet / gesto: history.pushState po kazdem kroku, popstate o krok zpet; z prvniho kroku lze odejit.
- Rozpracovana poptavka v localStorage, po odeslani smazat.
- Prepinac jazyka jen v kroku termin (VyberJazyka u ?od= zustava).
- Paticka: mala seda verze (commit + cas nasazeni) v poptavce i po odjezdu.
