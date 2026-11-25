# Pravidla stavby VIVIEN Klubu (karta klienta, úrovně, kredit) · platí pro všechny dávky klubu

Cíl: dnešní průvodce hosta, poptávka, stránka po odjezdu a přehled musí fungovat beze změny, dokud majitel klub výslovně nezapne.

## 1. Klub se staví vedle, ne místo
- Nové stránky a API mají vlastní cesty (např. `/klub/...`, `/api/klub/...`). Stávající `/{token}`, `/poptavka`, `/prehled`, `/doporucitel` se v dávkách klubu **nemění**, dokud to dávka výslovně neříká.
- Výjimka jen tam, kde se klub napojí (sleva v poptávce, odkaz z ikony na ploše) – a to vždy za vypínačem (bod 2).

## 2. Vypínač
- Env proměnná `KLUB_ZAPNUTO` (výchozí `0`). Při `0` se aplikace chová přesně jako dnes: žádná sleva podle úrovně, ikona vede na dnešní stránku, žádné nové sekce.
- Na Preview `1`, na produkci `0`, dokud majitel neřekne „zapni klub“.
- Vypnutí = okamžitý návrat k dnešnímu stavu, bez nového nasazení kódu.

## 3. Data
- Nové klíče (např. `klient:*`, `klub:pravidla`), stávající `rez:*`, `dop:*`, `poptavka:*` se **nepřepisují**. Převod karet doporučitelů = kopie do nového klíče, originál zůstává.
- Před jakoukoli migrací záloha dotčených klíčů do souboru (mimo git, bez osobních údajů v logu).
- Na Preview prefix `test:` jako dosud.

## 4. Nasazování
- **Ostrá (produkce) jen z `master`.** Práce běží ve větvi `doporuceni`. Na produkci se dostane až sloučením do `master` (po souhlasu majitele).
- Klub: **jen Preview** (+ odkaz pro majitele na test z mobilu). Produkce až po souhlasu majitele.
- Opravy průvodce a dnešních funkcí jdou na produkci jako dosud (sloučit `doporuceni` → `master`), nezávisle na klubu.
- Klub ve vlastní větvi `klub` (odbočit z `doporuceni`); do `doporuceni`/produkce se slučuje až po souhlasu.

## 5. Kontrola po každém nasazení (produkce i Preview)
Skript `scripts/kontrola-zakladu.mjs`, výsledek do ODPOVED:
- `/{token TESTPOMAJ2}` → 200 a obsahuje průvodce / stránku po odjezdu,
- `/{token}/manifest.webmanifest` → 200,
- `/poptavka?t=...` → 200,
- `/prehled` → 200 (přihlášení),
- `npm test` (vitest) celé zelené.
Když cokoli selže: nenasazovat, případně `vercel rollback` na předchozí produkční verzi a hlásit.

## 6. Malé dávky
Jedna dávka = jedna věc, kterou jde vrátit. Každá s hashem v ZMENY-LOG a stavem vypínače.
