# vivien-prijezdy

Osobní průvodce příjezdem pro hosty VIVIEN Apartments (subdoména `prijezd` později).

Samostatný projekt. Repo `vivien` (veřejný web) se zde nemění.

## Lokální náhled

```bash
npm install
npm run dev
```

Otevři: [http://127.0.0.1:3000/nahled?apt=V1&lang=cs&prijezd=auto&vikend=0](http://127.0.0.1:3000/nahled?apt=V1&lang=cs&prijezd=auto&vikend=0)

Tajné hodnoty: `.env.local` (viz `.env.example`).

## Token

Token = `base64url(JSON {r,a,d,l}) + "." + HMAC-SHA256`. Stránka `/{token}`.

## Automat (fáze 4b, lokálně)

```bash
npm run zpracuj:test
```

Čte schránku přes IMAP (jen PEEK), ověří původ, sestaví odkaz a pošle `[TEST]` mail majiteli (`TEST_REZIM=1`). Schránku nemění. `POST /api/zpracuj` se stejným Bearer `CRON_SECRET` (nasazení = PROMPT-5).

## Ověření

```bash
npm test
npm run build
```

V produkčním buildu `/nahled` neexistuje.
