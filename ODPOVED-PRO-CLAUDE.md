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
