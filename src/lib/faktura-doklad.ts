import QRCode from 'qrcode';
import { denPraha, posunDen } from './brana';
import { castkaPoplatku } from './poplatek';
import type { FakturaUdaje } from './faktura';
import type { RezervaceRecord } from './store';
import type { AptId } from './types';

export type TypDokladu = 'zalohova' | 'faktura';
export type OdberatelDokladu = 'firma' | 'host';
export type ZpusobUhrady = 'kartou' | 'prevodem' | 'hotove';

export function normalizujZpusobUhrady(raw: string | null | undefined): ZpusobUhrady {
  if (raw === 'kartou' || raw === 'hotove') return raw;
  return 'prevodem';
}

export const ODKAZ_NOVA_REZERVACE = {
  cs: 'https://www.vivienapartments.cz/cs/rezervace',
  en: 'https://www.vivienapartments.cz/en/rezervace',
} as const;

export type MenaFaktury = 'CZK' | 'EUR';
export type JazykDokladu = 'cs' | 'en';

export type BankovniSpojeni = {
  cislo: string;
  iban: string;
  swift: string;
};

export const DODAVATEL_FAKTURY = {
  jmeno: 'Nikola Tomková',
  adresa: 'Reinerova 47',
  mesto: 'České Budějovice',
  psc: '370 06',
  zemeCs: 'Česká republika',
  zemeEn: 'Czech Republic',
  ico: '04304438',
  email: 'info@vivienapartments.cz',
  telefon: '+420\u00A0604\u00A0692\u00A0573',
  telefonHref: '+420604692573',
  brand: 'VIVIEN Apartments',
  adresaObjektu: 'Nádražní 108/43, 370 01 České Budějovice',
} as const;

export const BANKA_CZK: BankovniSpojeni = {
  cislo: '2103497397 / 2010',
  iban: 'CZ04 2010 0000 0021 0349 7397',
  swift: 'FIOBCZPPXXX',
};

export const BANKA_EUR: BankovniSpojeni = {
  cislo: '2003497365 / 2010',
  iban: 'CZ48 2010 0000 0020 0349 7365',
  swift: 'FIOBCZPPXXX',
};

export function bankaProMene(mena: MenaFaktury): BankovniSpojeni {
  return mena === 'EUR' ? BANKA_EUR : BANKA_CZK;
}

/** Číslo dokladu i VS = číslo rezervace (snadné dohledání). */
export function cisloDokladu(rezervace: string): string {
  return String(rezervace || '').trim();
}

export function jazykDokladu(lang: string | null | undefined): JazykDokladu {
  return lang === 'cs' ? 'cs' : 'en';
}

export function menaDokladu(rec: Pick<RezervaceRecord, 'mena'>): MenaFaktury {
  return rec.mena === 'EUR' ? 'EUR' : 'CZK';
}

/** Přečte „celková cena“ z mailu Better Hotelu. */
export function parsujCenuBh(raw: string | null | undefined): { castka: number; mena: MenaFaktury } | null {
  if (!raw) return null;
  const s = String(raw).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  const mena: MenaFaktury = /€|\beur\b/i.test(s) ? 'EUR' : 'CZK';
  const cisla = s.replace(/[^\d,.\-]/g, '');
  if (!cisla) return null;
  let normal = cisla;
  if (cisla.includes(',') && cisla.includes('.')) {
    normal = cisla.replace(/\./g, '').replace(',', '.');
  } else if (cisla.includes(',')) {
    normal = cisla.replace(',', '.');
  }
  const castka = Number(normal);
  if (!Number.isFinite(castka) || castka <= 0) return null;
  return { castka: Math.round(castka * 100) / 100, mena };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** E-mail na dokladu. U firmy nikdy e-mail hosta z karty. */
export function emailNaDokladu(d: Pick<DokladVstup, 'odberatel' | 'bezEmailu' | 'hostEmail' | 'faktura'>): string {
  if (d.bezEmailu) return '';
  if (d.odberatel === 'host') return (d.hostEmail || '').trim();
  const email = (d.faktura?.email || '').trim();
  if (!email) return '';
  const host = (d.hostEmail || '').trim().toLowerCase();
  if (host && email.toLowerCase() === host) return '';
  return email;
}

function formatDatum(iso: string | null | undefined, lang: JazykDokladu): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return lang === 'cs' ? `${Number(d)}. ${Number(m)}. ${y}` : `${y}-${m}-${d}`;
}

function formatCastka(castka: number, mena: MenaFaktury, lang: JazykDokladu): string {
  const loc = lang === 'cs' ? 'cs-CZ' : 'en-GB';
  const cislo = new Intl.NumberFormat(loc, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(castka);
  return mena === 'EUR' ? `${cislo} EUR` : lang === 'cs' ? `${cislo} Kč` : `${cislo} CZK`;
}

function ibanBezMezer(iban: string): string {
  return iban.replace(/\s+/g, '').toUpperCase();
}

function bezDiakritiky(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Český QR platební řetězec (SPD) pro bankovní aplikace. */
export function spdPlatba(opts: {
  iban: string;
  castka: number;
  mena: MenaFaktury;
  vs: string;
  zprava?: string;
}): string | null {
  if (!opts.castka || opts.castka <= 0) return null;
  const acc = ibanBezMezer(opts.iban);
  if (!/^CZ\d{22}$/i.test(acc)) return null;
  const am = opts.castka.toFixed(2);
  const vs = String(opts.vs || '').replace(/\D/g, '').slice(0, 10);
  const msg = bezDiakritiky(opts.zprava || `VIVIEN ${opts.vs}`)
    .replace(/\*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
  const rn = bezDiakritiky(DODAVATEL_FAKTURY.jmeno).slice(0, 35);
  const dilky = [
    'SPD',
    '1.0',
    `ACC:${acc}`,
    `AM:${am}`,
    `CC:${opts.mena}`,
    rn ? `RN:${rn}` : '',
    vs ? `X-VS:${vs}` : '',
    msg ? `MSG:${msg}` : '',
  ].filter(Boolean);
  return dilky.join('*');
}

export async function qrPlatbyDataUrl(spd: string | null): Promise<string | null> {
  if (!spd) return null;
  return QRCode.toDataURL(spd, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 220,
    color: { dark: '#2a241c', light: '#ffffff' },
  });
}

/** QR na webovou rezervaci (ne platební). */
export async function qrOdkazuDataUrl(url: string | null | undefined): Promise<string | null> {
  const cil = String(url || '').trim();
  if (!/^https?:\/\//i.test(cil)) return null;
  return QRCode.toDataURL(cil, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 180,
    color: { dark: '#2a241c', light: '#ffffff' },
  });
}

/** Zbytek ceny po zadání části pro firmu nebo hosta. */
export function zbytekCastky(celkem: number | null | undefined, castka: number | null | undefined): number | null {
  if (celkem == null || castka == null) return null;
  if (!Number.isFinite(celkem) || !Number.isFinite(castka)) return null;
  const z = Math.round((celkem - castka) * 100) / 100;
  return z >= 0 ? z : null;
}

export type PolozkaDokladu = {
  nazev: string;
  pocet: number;
  cena: number;
  celkem: number;
};

export type DokladVstup = {
  typ: TypDokladu;
  rezervace: string;
  lang: JazykDokladu;
  mena: MenaFaktury;
  vystaveno: string;
  splatnost: string;
  uhrazeno: boolean;
  prijezd: string | null;
  odjezd: string | null;
  noci: number | null;
  osob: number | null;
  apartman: AptId | null;
  apartmanNazev: string;
  hostJmeno: string | null;
  hostEmail: string | null;
  hostAdresa: string | null;
  /** Kdo je odběratel na tomto dokladu. */
  odberatel: OdberatelDokladu;
  /** Na žádost firmy: jméno hosta na dokladu vůbec neuvést. */
  bezHosta: boolean;
  /** E-mail odběratele na dokladu neuvést. */
  bezEmailu: boolean;
  /** Poznámku z karty na dokladu neuvést. */
  bezPoznamky: boolean;
  /** Poznámka jen pro tento doklad (jinak z faktury). */
  poznamkaDokladu: string | null;
  faktura: FakturaUdaje | null;
  /** Částka na tomto dokladu (u půlení jen díl). */
  cenaPobytu: number | null;
  /** Celková cena pobytu na kartě (kvůli dopočtu zbytku). */
  cenaCelkem: number | null;
  /** Poplatek jen když doklad bere celou cenu (bez půlení). */
  poplatekKc: number | null;
  /** Jak bylo uhrazeno (u dokladu po odjezdu). U zálohy výchozí převod. */
  zpusobUhrady: ZpusobUhrady;
  logoUrl: string;
  odkazRezervace: string;
};

/** Splatnost zálohy: za týden, nejpozději den příjezdu. */
export function splatnostZalohy(prijezd: string | null | undefined, dnes: string): string {
  const tyden = posunDen(dnes, 7);
  if (prijezd && /^\d{4}-\d{2}-\d{2}$/.test(prijezd) && prijezd < tyden) return prijezd;
  return tyden;
}

/** Výchozí data dokladu podle typu. */
export function dataDokladu(
  typ: TypDokladu,
  rec: Pick<RezervaceRecord, 'prijezd' | 'odjezd'>,
  now = new Date(),
): { vystaveno: string; splatnost: string; uhrazeno: boolean } {
  const dnes = denPraha(now);
  if (typ === 'zalohova') {
    return {
      vystaveno: dnes,
      splatnost: splatnostZalohy(rec.prijezd, dnes),
      uhrazeno: false,
    };
  }
  return { vystaveno: dnes, splatnost: dnes, uhrazeno: true };
}

export function sestavDokladZRezervace(
  rec: RezervaceRecord,
  opts: {
    typ?: TypDokladu;
    lang?: JazykDokladu;
    uhrazeno?: boolean;
    vystaveno?: string;
    splatnost?: string;
    logoUrl?: string;
    apartmanNazev?: string;
    cenaPobytu?: number | null;
    odberatel?: OdberatelDokladu;
    bezHosta?: boolean;
    bezEmailu?: boolean;
    bezPoznamky?: boolean;
    poznamkaDokladu?: string | null;
    zpusobUhrady?: ZpusobUhrady | string | null;
  } = {},
): DokladVstup {
  const typ: TypDokladu = opts.typ === 'zalohova' ? 'zalohova' : 'faktura';
  const lang = opts.lang || jazykDokladu(rec.jazyk);
  const mena = menaDokladu(rec);
  const zaklad = dataDokladu(typ, rec);
  const vystaveno = opts.vystaveno || zaklad.vystaveno;
  const splatnost = opts.splatnost || zaklad.splatnost;
  const uhrazeno = opts.uhrazeno !== undefined ? opts.uhrazeno : zaklad.uhrazeno;
  const odberatel: OdberatelDokladu = opts.odberatel === 'host' ? 'host' : 'firma';
  const bezHosta = odberatel === 'firma' && opts.bezHosta === true;
  const bezEmailu = opts.bezEmailu === true;
  const bezPoznamky = opts.bezPoznamky === true;
  const zpusobUhrady = normalizujZpusobUhrady(opts.zpusobUhrady);
  const poznamkaDokladu =
    opts.poznamkaDokladu !== undefined ? opts.poznamkaDokladu : rec.faktura?.poznamka || null;
  const cenaCelkem = rec.cenaPobytu;
  const cenaPobytu = opts.cenaPobytu !== undefined ? opts.cenaPobytu : rec.cenaPobytu;
  const puleno =
    cenaCelkem != null &&
    cenaPobytu != null &&
    Math.round(cenaPobytu * 100) !== Math.round(cenaCelkem * 100);
  const poplatek =
    !puleno && rec.poplatek === 'ano' ? castkaPoplatku(rec.noci, rec.osob) : null;
  return {
    typ,
    rezervace: rec.rezervace,
    lang,
    mena,
    vystaveno,
    splatnost,
    uhrazeno,
    prijezd: rec.prijezd,
    odjezd: rec.odjezd,
    noci: rec.noci,
    osob: rec.osob,
    apartman: rec.apartman,
    apartmanNazev: opts.apartmanNazev || rec.apartman || '',
    hostJmeno: bezHosta ? null : rec.jmeno,
    hostEmail: rec.emailHosta,
    hostAdresa: bezHosta ? null : rec.adresaHosta,
    odberatel,
    bezHosta,
    bezEmailu,
    bezPoznamky,
    poznamkaDokladu: bezPoznamky ? null : poznamkaDokladu,
    faktura: rec.faktura || null,
    cenaPobytu,
    cenaCelkem,
    poplatekKc: poplatek,
    zpusobUhrady,
    logoUrl: opts.logoUrl || '/pruvodce/va-logo-faktura.png',
    odkazRezervace: ODKAZ_NOVA_REZERVACE[lang],
  };
}

export function polozkyDokladu(d: DokladVstup): PolozkaDokladu[] {
  const t = texty(d.lang);
  const out: PolozkaDokladu[] = [];
  if (d.cenaPobytu != null && d.cenaPobytu > 0) {
    out.push({
      nazev: t.polozkaUbytovani,
      pocet: 1,
      cena: d.cenaPobytu,
      celkem: d.cenaPobytu,
    });
  }
  if (d.poplatekKc != null && d.poplatekKc > 0) {
    const noci = d.noci || 1;
    const osob = d.osob || 1;
    const pocet = noci * osob;
    const jednotka = 50;
    out.push({
      nazev: t.polozkaPoplatek,
      pocet,
      cena: jednotka,
      celkem: d.poplatekKc,
    });
  }
  return out;
}

function texty(lang: JazykDokladu, typ: TypDokladu = 'faktura') {
  if (lang === 'cs') {
    return {
      doklad: typ === 'zalohova' ? 'Zálohová faktura' : 'Doklad',
      vystaveno: 'Vystaveno',
      splatnost: 'Splatnost',
      dodavatel: 'Dodavatel',
      odberatel: 'Odběratel',
      ico: 'IČO',
      dic: 'DIČ',
      neplatce: 'Nejsme plátci DPH',
      pobyt: 'Pobyt',
      apartman: 'Apartmán',
      host: 'Host',
      polozky: 'Položky',
      nazev: 'Název',
      pocet: 'Počet',
      cena: 'Cena',
      celkem: 'Celkem',
      polozkaUbytovani: 'Ubytovací služby',
      polozkaPoplatek: 'Poplatek z pobytu',
    platebni: 'Platební údaje',
    forma: 'Forma úhrady',
    prevodem: 'Převodem',
    kartou: 'Kartou',
    hotove: 'Hotově',
    vs: 'Variabilní symbol',
    banka: 'Bankovní spojení',
    ucet: 'Číslo účtu',
    iban: 'IBAN',
    swift: 'SWIFT / BIC',
    uhrazeno: 'Doklad je uhrazený.',
    kUhrade: 'Celkem k úhradě',
    poznamka: 'Poznámka',
    chybiCena: 'Chybí částka pobytu. Doplňte ji na kartě rezervace.',
    tisk: 'Tisk / uložit PDF',
    qrPopis: 'QR platba',
    qrNapoveda: 'Namiřte fotoaparátem bankovní aplikace.',
    znovuNadpis: 'Další pobyt',
    znovuText: 'Budete znovu v Českých Budějovicích? Novou rezervaci uděláte na našem webu.',
    znovuTlacitko: 'Nová rezervace',
    znovuQr: 'QR na rezervaci',
  };
  }
  return {
    doklad: typ === 'zalohova' ? 'Proforma invoice' : 'Invoice',
    vystaveno: 'Issued',
    splatnost: 'Due date',
    dodavatel: 'Supplier',
    odberatel: 'Customer',
    ico: 'Company ID',
    dic: 'VAT ID',
    neplatce: 'We are not VAT registered',
    pobyt: 'Stay',
    apartman: 'Apartment',
    host: 'Guest',
    polozky: 'Items',
    nazev: 'Description',
    pocet: 'Qty',
    cena: 'Price',
    celkem: 'Total',
    polozkaUbytovani: 'Accommodation services',
    polozkaPoplatek: 'City stay tax',
    platebni: 'Payment details',
    forma: 'Payment method',
    prevodem: 'Bank transfer',
    kartou: 'Card',
    hotove: 'Cash',
    vs: 'Variable symbol',
    banka: 'Bank details',
    ucet: 'Account number',
    iban: 'IBAN',
    swift: 'SWIFT / BIC',
    uhrazeno: 'This invoice has already been paid.',
    kUhrade: 'Amount due',
    poznamka: 'Note',
    chybiCena: 'Stay amount is missing. Add it on the reservation card.',
    tisk: 'Print / save PDF',
    qrPopis: 'QR payment',
    qrNapoveda: 'Scan with your banking app.',
    znovuNadpis: 'Book again',
    znovuText: 'Coming back to České Budějovice? Make a new booking on our website.',
    znovuTlacitko: 'New reservation',
    znovuQr: 'QR for booking',
  };
}

/** HTML doklad ke kontrole a tisku (prohlížeč → Uložit jako PDF). */
export function htmlDokladu(
  d: DokladVstup,
  qrDataUrl: string | null = null,
  promoQrDataUrl: string | null = null,
): string {
  const t = texty(d.lang, d.typ);
  const banka = bankaProMene(d.mena);
  const cislo = cisloDokladu(d.rezervace);
  const polozky = polozkyDokladu(d);
  const soucet = polozky.reduce((s, p) => s + p.celkem, 0);
  const f = d.faktura;
  const termin =
    d.prijezd && d.odjezd
      ? `${formatDatum(d.prijezd, d.lang)} – ${formatDatum(d.odjezd, d.lang)}`
      : '';
  const emailOdberatele = emailNaDokladu(d);
  const odberatelRadky =
    d.odberatel === 'host'
      ? [d.hostJmeno || '', d.hostAdresa || '', emailOdberatele].filter(Boolean)
      : [
          f?.nazev || '',
          f?.adresa || '',
          [f?.zeme].filter(Boolean).join(''),
          f?.ico ? `${t.ico}: ${f.ico}` : '',
          f?.dic ? `${t.dic}: ${f.dic}` : '',
          emailOdberatele,
        ].filter(Boolean);

  const radkyPolozek = polozky.length
    ? polozky
        .map(
          (p) => `<tr>
      <td>${escapeHtml(p.nazev)}</td>
      <td class="num">${p.pocet}</td>
      <td class="num">${escapeHtml(formatCastka(p.cena, d.mena, d.lang))}</td>
      <td class="num">${escapeHtml(formatCastka(p.celkem, d.mena, d.lang))}</td>
    </tr>`,
        )
        .join('')
    : `<tr><td colspan="4" class="warn">${escapeHtml(t.chybiCena)}</td></tr>`;

  const zpusobLabel =
    d.zpusobUhrady === 'kartou' ? t.kartou : d.zpusobUhrady === 'hotove' ? t.hotove : t.prevodem;
  const formaText = `${t.forma}: ${zpusobLabel}`;
  const sumHtml = d.uhrazeno
    ? `<div class="sum-castka">
        <span class="sum-zpusob">${escapeHtml(formaText)}</span>
        <span class="sum-prava">
          <span class="sum-stav">${escapeHtml(t.uhrazeno)}</span>
          <span class="sum-castka-cislo">${escapeHtml(formatCastka(soucet, d.mena, d.lang))}</span>
        </span>
      </div>`
    : `<div class="sum-castka" style="max-width:420px;margin-left:auto;width:auto;min-width:280px">
        <span class="sum-stav">${escapeHtml(t.kUhrade)}</span>
        <span class="sum-castka-cislo">${escapeHtml(formatCastka(soucet, d.mena, d.lang))}</span>
      </div>`;

  return `<!DOCTYPE html>
<html lang="${d.lang}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<title>${escapeHtml(t.doklad)} ${escapeHtml(cislo)}</title>
<style>
  :root {
    --ink: #2a241c;
    --muted: #6a5f52;
    --line: #e8dfd2;
    --gold: #b08d57;
    --paper: #ffffff;
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    margin: 0;
    background: #f5f5f5;
    color: var(--ink);
    font: 13px/1.35 "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  }
  .bar {
    position: sticky; top: 0; z-index: 2;
    display: flex; gap: 12px; align-items: center; justify-content: space-between;
    padding: 12px 16px;
    background: #fff;
    color: var(--ink);
    border-bottom: 1px solid var(--line);
  }
  .bar button, .bar a {
    appearance: none; border: 1px solid var(--gold); cursor: pointer;
    background: #fff; color: var(--ink);
    font: inherit; font-weight: 600;
    padding: 10px 16px; border-radius: 999px;
    text-decoration: none;
  }
  /* Papír je vždy A4 (jako PDF). Na mobilu se jen zmenší, nepřepisuje se. */
  .stage {
    width: 100%;
    overflow: hidden;
    padding: 16px 0 32px;
  }
  .sheet {
    --sheet-w: 794px;
    width: var(--sheet-w);
    max-width: none;
    margin: 0 auto;
    background: var(--paper);
    padding: 28px 32px;
    border: 1px solid var(--line);
    transform-origin: top center;
  }
  header {
    display: grid;
    grid-template-columns: 64px 1fr auto;
    gap: 12px;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--gold);
  }
  .logo {
    width: 64px; height: 64px; border-radius: 50%;
    object-fit: cover; background: #fff;
    border: 1px solid var(--gold);
  }
  .brand { font-family: Georgia, "Times New Roman", serif; font-size: 22px; letter-spacing: .02em; color: var(--ink); }
  .brand small { display: block; margin-top: 2px; color: var(--muted); font: 11px/1.3 "Segoe UI", sans-serif; }
  .meta { text-align: right; font-size: 12px; color: var(--muted); }
  .meta strong { display: block; color: var(--ink); font-size: 15px; margin-bottom: 4px; }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 14px 0;
  }
  .box {
    background: #fff;
    border: 1px solid var(--gold);
    border-radius: 8px;
    padding: 10px 12px;
  }
  .box h2 {
    margin: 0 0 6px;
    font: 600 11px/1 "Segoe UI", sans-serif;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--ink);
  }
  .box p { margin: 0 0 2px; }
  .pobyt {
    margin: 0 0 12px;
    padding: 8px 12px;
    border: 1px solid var(--gold);
    background: #fff;
    border-radius: 8px;
  }
  .pobyt strong { display: block; margin-bottom: 2px; }
  h2.polozky-nadpis {
    margin: 0 0 6px;
    font: 600 11px/1 Segoe UI, sans-serif;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--ink);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 4px 0 10px;
    border: 1px solid var(--gold);
  }
  th, td {
    padding: 6px 6px;
    border-bottom: 1px solid var(--line);
    text-align: left;
    vertical-align: top;
    background: #fff;
  }
  th {
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--ink);
    font-weight: 600;
    background: #fff;
    border-bottom: 1px solid var(--gold);
  }
  td.num, th.num { text-align: right; white-space: nowrap; }
  td.warn { color: #8a3b2b; }
  .sum {
    display: flex;
    justify-content: stretch;
    margin-bottom: 12px;
  }
  .sum-castka {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    background: #fff;
    color: var(--ink);
    border: 1px solid var(--gold);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.25;
  }
  .sum-castka .sum-zpusob {
    color: var(--ink);
    white-space: nowrap;
  }
  .sum-castka .sum-prava {
    display: flex;
    align-items: baseline;
    gap: 16px;
    margin-left: auto;
    white-space: nowrap;
  }
  .sum-castka .sum-stav {
    color: var(--ink);
    white-space: nowrap;
  }
  .sum-castka .sum-castka-cislo {
    white-space: nowrap;
    text-align: right;
  }
  .pay {
    margin-top: 4px;
    padding: 8px 0 0;
  }
  .pay h2 {
    margin: 0 0 8px;
    font: 600 11px/1 "Segoe UI", sans-serif;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--ink);
  }
  .pay-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 110px;
    gap: 14px;
    align-items: center;
  }
  .pay-dl {
    margin: 0;
    display: grid;
    gap: 4px;
  }
  .pay-dl > div {
    display: grid;
    grid-template-columns: 8.5rem 1fr;
    gap: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--line);
  }
  .pay-dl dt {
    margin: 0;
    color: var(--muted);
    font-size: 12px;
  }
  .pay-dl dd {
    margin: 0;
    font-weight: 600;
  }
  .pay-qr {
    text-align: center;
  }
  .pay-qr img {
    width: 100px;
    height: 100px;
    display: block;
    margin: 0 auto 4px;
    border: 1px solid var(--gold);
    border-radius: 6px;
    background: #fff;
  }
  .pay-qr strong {
    display: block;
    font-size: 10px;
    font-weight: 600;
    color: var(--muted);
    letter-spacing: .04em;
    text-transform: uppercase;
  }
  .pay-qr span {
    display: block;
    margin: 4px 0 0;
    font-size: 10px;
    color: var(--muted);
  }
  .pay-after {
    margin: 12px 0 0;
    padding: 10px 0 0;
    border-top: 1px solid var(--line);
    max-width: 42em;
  }
  .promo-pod {
    margin: 0;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.4;
    font-weight: 400;
  }
  .promo-url {
    margin: 4px 0 0;
  }
  .promo-url a {
    display: inline-block;
    color: var(--ink);
    font-weight: 400;
    font-size: 12px;
    text-decoration: underline;
    text-decoration-color: var(--gold);
    text-underline-offset: 2px;
    white-space: nowrap;
  }
  .note { margin-top: 8px; color: var(--muted); font-size: 12px; }
  @page {
    size: A4;
    margin: 10mm;
  }
  @media print {
    html, body {
      background: #fff !important;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .bar { display: none !important; }
    .stage {
      padding: 0 !important;
      overflow: visible !important;
      height: auto !important;
    }
    .sheet {
      margin: 0 !important;
      box-shadow: none !important;
      max-width: none !important;
      width: 100% !important;
      padding: 0 !important;
      border: 0 !important;
      transform: none !important;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    header, .grid, .pobyt, table, .sum, .pay, .pay-after {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .pay-grid { grid-template-columns: minmax(0, 1fr) 100px; }
    .logo, .pay-qr img { border-color: #999; }
    .box, .pobyt, .sum-castka, table { border-color: #999; }
    th { border-bottom-color: #999; }
  }
  /* Jen obrazovka: papír se zmenší, rozložení zůstane jako na A4. Tisk tohle nebere. */
  @media screen and (max-width: 860px) {
    .bar {
      padding: 12px 14px;
      gap: 10px;
      flex-wrap: wrap;
    }
    .bar button, .bar a {
      padding: 12px 18px;
      font-size: 15px;
    }
    .stage { padding: 10px 0 24px; }
  }
</style>
</head>
<body>
  <div class="bar">
    <div>${escapeHtml(t.doklad)} ${escapeHtml(cislo)}</div>
    <button type="button" onclick="window.print()">${escapeHtml(t.tisk)}</button>
  </div>
  <div class="stage">
  <article class="sheet">
    <header>
      <img class="logo" src="${escapeHtml(d.logoUrl)}" alt="VIVIEN"/>
      <div>
        <div class="brand">${escapeHtml(DODAVATEL_FAKTURY.brand)}
          <small>${escapeHtml(DODAVATEL_FAKTURY.adresaObjektu)}</small>
        </div>
      </div>
      <div class="meta">
        <strong>${escapeHtml(t.doklad)} ${escapeHtml(cislo)}</strong>
        <div>${escapeHtml(t.vystaveno)}: ${escapeHtml(formatDatum(d.vystaveno, d.lang))}</div>
        <div>${escapeHtml(t.splatnost)}: ${escapeHtml(formatDatum(d.splatnost, d.lang))}</div>
      </div>
    </header>

    <div class="grid">
      <section class="box">
        <h2>${escapeHtml(t.dodavatel)}</h2>
        <p><strong>${escapeHtml(DODAVATEL_FAKTURY.jmeno)}</strong></p>
        <p>${escapeHtml(DODAVATEL_FAKTURY.adresa)}</p>
        <p>${escapeHtml(DODAVATEL_FAKTURY.psc)} ${escapeHtml(DODAVATEL_FAKTURY.mesto)}</p>
        <p>${escapeHtml(d.lang === 'cs' ? DODAVATEL_FAKTURY.zemeCs : DODAVATEL_FAKTURY.zemeEn)}</p>
        <p>${escapeHtml(t.ico)}: ${escapeHtml(DODAVATEL_FAKTURY.ico)}</p>
        <p>${escapeHtml(t.neplatce)}</p>
        <p><a href="mailto:${escapeHtml(DODAVATEL_FAKTURY.email)}">${escapeHtml(DODAVATEL_FAKTURY.email)}</a></p>
        <p><a href="tel:${escapeHtml(DODAVATEL_FAKTURY.telefonHref)}" style="white-space:nowrap">${escapeHtml(DODAVATEL_FAKTURY.telefon)}</a></p>
      </section>
      <section class="box">
        <h2>${escapeHtml(t.odberatel)}</h2>
        ${
          odberatelRadky.length
            ? odberatelRadky.map((r) => `<p>${escapeHtml(r)}</p>`).join('')
            : `<p>${escapeHtml(d.bezHosta ? '—' : d.hostJmeno || '—')}</p>`
        }
      </section>
    </div>

    <section class="pobyt">
      <strong>${escapeHtml(t.pobyt)}</strong>
      <div>${escapeHtml(termin || '—')}</div>
      <div>${escapeHtml(t.apartman)}: ${escapeHtml(d.apartmanNazev || d.apartman || '—')}</div>
      ${!d.bezHosta && d.hostJmeno ? `<div>${escapeHtml(t.host)}: ${escapeHtml(d.hostJmeno)}</div>` : ''}
    </section>

    <h2 class="polozky-nadpis">${escapeHtml(t.polozky)}</h2>
    <table>
      <thead>
        <tr>
          <th>${escapeHtml(t.nazev)}</th>
          <th class="num">${escapeHtml(t.pocet)}</th>
          <th class="num">${escapeHtml(t.cena)}</th>
          <th class="num">${escapeHtml(t.celkem)}</th>
        </tr>
      </thead>
      <tbody>${radkyPolozek}</tbody>
    </table>

    <div class="sum">
      ${sumHtml}
    </div>

    <section class="pay box">
      <h2>${escapeHtml(t.platebni)}</h2>
      <div class="pay-grid">
        <dl class="pay-dl">
          <div><dt>${escapeHtml(t.forma)}</dt><dd>${escapeHtml(zpusobLabel)}</dd></div>
          <div><dt>${escapeHtml(t.vs)}</dt><dd style="white-space:nowrap">${escapeHtml(cislo)}</dd></div>
          <div><dt>${escapeHtml(t.ucet)}</dt><dd style="white-space:nowrap">${escapeHtml(banka.cislo)}</dd></div>
          <div><dt>${escapeHtml(t.iban)}</dt><dd style="white-space:nowrap">${escapeHtml(banka.iban)}</dd></div>
          <div><dt>${escapeHtml(t.swift)}</dt><dd style="white-space:nowrap">${escapeHtml(banka.swift)}</dd></div>
        </dl>
        ${
          d.typ === 'zalohova' && qrDataUrl
            ? `<div class="pay-qr">
          <img src="${escapeHtml(qrDataUrl)}" alt="${escapeHtml(t.qrPopis)}"/>
          <strong>${escapeHtml(t.qrPopis)}</strong>
          <span>${escapeHtml(t.qrNapoveda)}</span>
        </div>`
            : d.typ === 'faktura' && promoQrDataUrl
              ? `<div class="pay-qr">
          <img src="${escapeHtml(promoQrDataUrl)}" alt="${escapeHtml(t.znovuQr)}"/>
          <strong>${escapeHtml(t.znovuQr)}</strong>
        </div>`
              : ''
        }
      </div>
    </section>
    ${
      d.typ === 'faktura' || d.poznamkaDokladu
        ? `<div class="pay-after">
        ${
          d.typ === 'faktura'
            ? `<p class="promo-pod">${escapeHtml(t.znovuText)}</p>
        <p class="promo-url"><a href="${escapeHtml(d.odkazRezervace)}" target="_blank" rel="noopener">${escapeHtml(d.odkazRezervace.replace(/^https?:\/\//, ''))}</a></p>`
            : ''
        }
        ${d.poznamkaDokladu ? `<p class="note">${escapeHtml(t.poznamka)}: ${escapeHtml(d.poznamkaDokladu)}</p>` : ''}
      </div>`
        : ''
    }
  </article>
  </div>
  <script>
  (function () {
    function fit() {
      var stage = document.querySelector('.stage');
      var sheet = document.querySelector('.sheet');
      if (!stage || !sheet) return;
      sheet.style.transform = 'none';
      stage.style.height = '';
      var pad = 16;
      var avail = Math.max(280, stage.clientWidth - pad);
      var w = sheet.offsetWidth || 794;
      var scale = Math.min(1, avail / w);
      sheet.style.transform = 'scale(' + scale + ')';
      stage.style.height = Math.ceil(sheet.offsetHeight * scale + 8) + 'px';
    }
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', function () { setTimeout(fit, 80); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    Array.prototype.forEach.call(document.images || [], function (img) {
      if (!img.complete) img.addEventListener('load', fit);
    });
  })();
  </script>
</body>
</html>`;
}

/** Sestaví HTML. Zálohová = platební QR. Po odjezdu = QR na rezervaci. */
export async function htmlDokladuSQr(d: DokladVstup): Promise<string> {
  if (d.typ === 'faktura') {
    const promo = await qrOdkazuDataUrl(d.odkazRezervace);
    return htmlDokladu(d, null, promo);
  }
  if (d.uhrazeno) {
    return htmlDokladu(d, null, null);
  }
  const polozky = polozkyDokladu(d);
  const soucet = polozky.reduce((s, p) => s + p.celkem, 0);
  const banka = bankaProMene(d.mena);
  const spd = spdPlatba({
    iban: banka.iban,
    castka: soucet,
    mena: d.mena,
    vs: cisloDokladu(d.rezervace),
    zprava: `VIVIEN ${d.rezervace}`,
  });
  const qr = await qrPlatbyDataUrl(spd);
  return htmlDokladu(d, qr, null);
}
