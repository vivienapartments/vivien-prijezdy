# Nový počítač — vivien-prijezdy

Krátký návod, jak rozjet automat příjezdů na novém notebooku.

## 1. Co nainstalovat

1. **Git** — https://git-scm.com
2. **Node.js 20** (na starém notebooku bylo `v20.20.2`; v repu není `.nvmrc`) — https://nodejs.org
3. **Cursor** — https://cursor.com

## 2. Stažení repa

Do složky, kde chcete projekty (např. `C:\Users\VASE_JMENO\`):

```
git clone https://github.com/vivienapartments/vivien-prijezdy.git
cd vivien-prijezdy
```

Ostrý provoz je větev **`master`**. Rozdělaná práce (pokud existuje) je na **`rozpracovano-prijezdy`**:

```
git checkout rozpracovano-prijezdy
```

Zpět na ostré:

```
git checkout master
```

## 3. Instalace a kontrola

```
npm install
npm run build
npm test
```

## 4. Tajné údaje (`.env.local`)

Soubor `.env.local` do gitu nepatří. Získáte ho takto:

```
npx vercel login
npx vercel link
npx vercel env pull .env.local
```

Nebo zkopírujte `.env.local` / složku `vivien-prijezdy-tajne` z flashky ze starého notebooku.

**Názvy proměnných** (jen názvy, bez hodnot):

- `PRUVODCE_TOKEN_SECRET`, `PRUVODCE_BASE_URL`, `TEST_REZIM`
- `MAJITEL_EMAIL`, `MAJITEL_PREPOSILA_Z`
- `SMTP_USER`, `SMTP_HESLO`, `IMAP_USER`, `IMAP_HESLO`
- `BH_KLIC`, `CRON_SECRET`, `ADMIN_HESLO`
- `KV_REST_API_URL`, `KV_REST_API_TOKEN`
- `KOD_ZAHRADA_V1` … `KOD_ZAHRADA_V5`
- `WIFI_HESLO_V1` … `WIFI_HESLO_V5`, `WIFI_HESLO_ZAHRADA`
- `BRANA_TELEFON`
- `VAPID_PUBLIC`, `VAPID_PRIVATE`, `VAPID_SUBJECT`

Vzory jsou v `.env.example`. V ostrém provozu musí být `TEST_REZIM=0`.

## 5. Kde co běží

| Co | Kde |
| --- | --- |
| Aplikace | Vercel projekt **vivien-prijezdy** (`vivien-prijezdy-six.vercel.app`) |
| Databáze klíčů | Upstash Redis (Vercel Storage / `KV_REST_API_*`) |
| Budík schránky | **cron-job.org** volá `/api/zpracuj` asi každé 2 minuty |
| Ruční spuštění | GitHub Actions `.github/workflows/zpracuj.yml` (jen ručně) |

## 6. Pravidla práce

- Platí `.cursor/rules/*.mdc` (paměť projektu, psaní pro lidi).
- Paměť `STAV-PRO-CLAUDE.md` je lokální (není v gitu). Zkopírujte ji z flashky, nebo ji Claude znovu doplní z provozu.
- Před každým pushem: `npm run build` a `npm test`.
- Push na `master` = okamžité nasazení hostům. Pushujte jen po výslovném „nasaď“.
- Nikdy necommitujte `.env*`, hesla, tokeny, `node_modules`, `.next`.
