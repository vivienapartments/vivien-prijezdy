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

## Ověření

```bash
npm test
npm run build
```

V produkčním buildu `/nahled` neexistuje.
