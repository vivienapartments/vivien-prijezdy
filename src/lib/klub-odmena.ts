/**
 * Odměna doporučiteli (dávka 5): 5 % první přímý pobyt kamaráda,
 * 2 % další přímé do 12 měsíců od jeho 1. pobytu. Zneužití → nesplňuje.
 */

import { createHash, randomBytes } from 'crypto';
import {
  nactiKartuPodleKodu,
  spocitejOdmenu,
  ulozKartu,
  type DoporuceniNaKarte,
  type DoporucitelKarta,
} from './doporucitel-karta';
import {
  nactiKlientPodleId,
  nactiKlubPravidla,
  ulozKlientKartu,
  type KlientKredit,
} from './klient-karta';
import { klubZapnut } from './klub-klic';
import { jePrimaZdroj } from './klub-utrata';
import type { KlubPravidla } from './klub-pravidla';
import { jeRelayEmail } from './staly-host';
import type { ProcessStore, RezervaceRecord } from './store';
import { normalizujTelefon } from './telefon';
import { listKodyDoporucitelu, najdiKodDoporuciteleProRezervaci } from './klub-odmena-parek';

export function klubVyplatyZapnuto(): boolean {
  return String(process.env.KLUB_VYPLATY || '0').trim() === '1';
}

function normalJmeno(j: string): string {
  return (j || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function domenaEmailu(email: string): string {
  const at = email.lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1).toLowerCase() : '';
}

/** Stejný e-mail / telefon / jméno / IČO / firemní doména = zneužití. */
export function jeZneuzitiDoporuceni(
  doporucitel: {
    jmeno?: string;
    email?: string | null;
    telefon?: string | null;
    firmaIco?: string | null;
    firmaEmailDomena?: string | null;
  },
  kamarad: {
    jmeno?: string | null;
    email?: string | null;
    telefon?: string | null;
    ico?: string | null;
  },
): boolean {
  const emD = (doporucitel.email || '').trim().toLowerCase();
  const emK = (kamarad.email || '').trim().toLowerCase();
  if (emD && emK && emD === emK && !jeRelayEmail(emD)) return true;

  const telD = normalizujTelefon(doporucitel.telefon, null);
  const telK = normalizujTelefon(kamarad.telefon, null);
  if (telD && !telD.nejisty && telK && !telK.nejisty && telD.ulozeny === telK.ulozeny) {
    return true;
  }

  const jD = normalJmeno(doporucitel.jmeno || '');
  const jK = normalJmeno(kamarad.jmeno || '');
  if (jD && jK && jD === jK && jD.split(' ').length >= 2) return true;

  const icoD = (doporucitel.firmaIco || '').replace(/\s+/g, '');
  const icoK = (kamarad.ico || '').replace(/\s+/g, '');
  if (icoD && icoK && icoD === icoK) return true;

  const domFirma = (doporucitel.firmaEmailDomena || '').toLowerCase();
  const domK = domenaEmailu(emK);
  if (
    domFirma &&
    domK &&
    domFirma === domK &&
    !/gmail|seznam|outlook|hotmail|email\.cz|icloud/i.test(domK)
  ) {
    return true;
  }
  return false;
}

export function pctOdmenyProPobyt(
  jePrvniPrimaPobytKamaráda: boolean,
  prvniPobytYmd: string | null,
  pobytYmd: string,
  pravidla: Pick<KlubPravidla, 'odmenaPrvniPct' | 'odmenaDalsiPct' | 'odmenaDalsiMesicu'>,
): number {
  if (jePrvniPrimaPobytKamaráda) return pravidla.odmenaPrvniPct;
  if (
    !prvniPobytYmd ||
    !/^\d{4}-\d{2}-\d{2}$/.test(prvniPobytYmd) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(pobytYmd)
  ) {
    return 0;
  }
  const od = new Date(`${prvniPobytYmd}T12:00:00Z`).getTime();
  const po = new Date(`${pobytYmd}T12:00:00Z`).getTime();
  if (!Number.isFinite(od) || !Number.isFinite(po) || po < od) return 0;
  const mesicu = (po - od) / (30.44 * 24 * 3600 * 1000);
  if (mesicu > pravidla.odmenaDalsiMesicu) return 0;
  return pravidla.odmenaDalsiPct;
}

export function pridejMesice(ymd: string, mesicu: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + mesicu, d));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function kreditVyprsiYmd(kdyIso: string, platnostMesicu: number): string | null {
  const t = Date.parse(kdyIso);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  const ymd = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  return pridejMesice(ymd, platnostMesicu);
}

/** Kredity, které vyprší do 31 dnů (upozornění hostovi i majiteli). */
export function kredityBlizkoVyprseni(
  kredit: KlientKredit[],
  dnesYmd: string,
): { id: string; zbyvaKc: number; vyprsi: string }[] {
  const out: { id: string; zbyvaKc: number; vyprsi: string }[] = [];
  const dnes = new Date(`${dnesYmd}T12:00:00Z`).getTime();
  for (const k of kredit) {
    const zbyva = Math.max(0, k.castka - k.pouzito);
    if (zbyva <= 0) continue;
    const vyprsi = (k.platnostDo || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(vyprsi)) continue;
    const v = new Date(`${vyprsi}T12:00:00Z`).getTime();
    const dnu = (v - dnes) / (24 * 3600 * 1000);
    if (dnu >= 0 && dnu <= 31) out.push({ id: k.id, zbyvaKc: zbyva, vyprsi });
  }
  return out;
}

/**
 * Po převzetí zpět (odjezd) přímého pobytu kamaráda: připiš odměnu doporučiteli (kredit).
 * Storno nic. Booking/Airbnb nic.
 */
export async function pridejOdmenuPoPredani(
  store: ProcessStore,
  rec: RezervaceRecord,
): Promise<{ ok: boolean; castka: number; kod: string | null; duvod?: string }> {
  if (!klubZapnut()) return { ok: false, castka: 0, kod: null, duvod: 'vypnuto' };
  if (!rec.prevzatoKdy) return { ok: false, castka: 0, kod: null, duvod: 'bez-prevzeti' };
  if (!jePrimaZdroj(rec.zdroj)) return { ok: false, castka: 0, kod: null, duvod: 'ne-prima' };

  const kartaKod = (await najdiKodDoporuciteleProRezervaci(store, rec)) || '';
  if (!kartaKod) return { ok: false, castka: 0, kod: null, duvod: 'bez-kodu' };

  const karta = await nactiKartuPodleKodu(store, kartaKod);
  if (!karta || karta.stav !== 'aktivni') {
    return { ok: false, castka: 0, kod: kartaKod, duvod: 'karta' };
  }

  const zneuziti = jeZneuzitiDoporuceni(
    {
      jmeno: `${karta.jmeno} ${karta.prijmeni || ''}`.trim(),
      email: karta.email,
      telefon: karta.telefon,
      firmaIco: karta.firma?.ico || null,
      firmaEmailDomena: karta.email ? domenaEmailu(karta.email) : null,
    },
    {
      jmeno: rec.jmeno,
      email: rec.emailHosta,
      telefon: rec.telefon || rec.telefonRezervace,
      ico: rec.faktura?.ico || null,
    },
  );
  if (zneuziti) {
    await oznacNesplnuje(store, karta, rec);
    return { ok: false, castka: 0, kod: kartaKod, duvod: 'nesplnuje' };
  }

  const pravidla = await nactiKlubPravidla(store);
  const primaPobyty = karta.doporuceni.filter(
    (d) =>
      d.stav === 'pripsano' ||
      d.stav === 'pobyt-probehl' ||
      d.stav === 'vyplaceno' ||
      (d.stav === 'potvrzeno' && d.odjezd && rec.odjezd && d.odjezd < rec.odjezd),
  );
  const jePrvni = primaPobyty.length === 0;
  const prvniYmd =
    primaPobyty
      .map((d) => d.odjezd)
      .filter((x): x is string => Boolean(x))
      .sort()[0] || null;
  const pct = pctOdmenyProPobyt(jePrvni, prvniYmd, rec.odjezd || rec.prijezd || '', pravidla);
  const cena = typeof rec.cenaPobytu === 'number' ? rec.cenaPobytu : 0;
  const castka = pct > 0 ? spocitejOdmenu(cena, pct) : 0;
  if (castka <= 0) return { ok: false, castka: 0, kod: kartaKod, duvod: 'nula' };

  const uz = karta.doporuceni.some(
    (d) => d.rezervaceId === rec.rezervace && (d.stav === 'pripsano' || d.stav === 'vyplaceno'),
  );
  if (uz) return { ok: true, castka: 0, kod: kartaKod, duvod: 'duplicita' };

  const rad: DoporuceniNaKarte = {
    id: `dr${randomBytes(4).toString('hex')}`,
    krestniJmenoKamarada: (rec.jmeno || '').trim().split(/\s+/)[0] || '',
    kanal: 'neznamy',
    poptavkaId: null,
    rezervaceId: rec.rezervace,
    datumPoptavky: new Date().toISOString(),
    termin: rec.prijezd && rec.odjezd ? `${rec.prijezd}→${rec.odjezd}` : '',
    apartman: rec.apartman || null,
    cenaPredSlevou: cena,
    slevaKamarada: null,
    odmena: castka,
    stav: 'pripsano',
    odjezd: rec.odjezd || null,
  };
  karta.doporuceni = [rad, ...karta.doporuceni];
  karta.statistiky.probehle += 1;
  karta.penize.kVyplate += castka;
  await ulozKartu(store, karta);

  await pridejKreditKlientovi(store, karta, castka, `odmena rez:${rec.rezervace}`, pravidla);
  return { ok: true, castka, kod: kartaKod };
}

async function oznacNesplnuje(
  store: ProcessStore,
  karta: DoporucitelKarta,
  rec: RezervaceRecord,
): Promise<void> {
  const idx = karta.doporuceni.findIndex(
    (d) =>
      d.rezervaceId === rec.rezervace ||
      (d.odjezd === rec.odjezd &&
        d.krestniJmenoKamarada &&
        (rec.jmeno || '').includes(d.krestniJmenoKamarada)),
  );
  if (idx < 0) return;
  const d = karta.doporuceni[idx];
  if (d.stav === 'nesplnuje') return;
  if (d.odmena > 0 && (d.stav === 'poptavka' || d.stav === 'potvrzeno')) {
    karta.penize.ceka = Math.max(0, karta.penize.ceka - d.odmena);
  }
  d.stav = 'nesplnuje';
  d.odmena = 0;
  karta.doporuceni[idx] = d;
  await ulozKartu(store, karta);
}

async function pridejKreditKlientovi(
  store: ProcessStore,
  dop: DoporucitelKarta,
  castka: number,
  zdroj: string,
  pravidla: KlubPravidla,
): Promise<void> {
  const { klubKlic } = await import('./klub-klic');
  const raw = await store.getKv(klubKlic(`klient-kod:${dop.kod}`));
  let klientId: string | null = null;
  if (raw) {
    try {
      klientId = (JSON.parse(raw) as { id?: string }).id || null;
    } catch {
      klientId = null;
    }
  }
  if (!klientId) return;
  const k = await nactiKlientPodleId(store, klientId);
  if (!k) return;
  const vznik = new Date().toISOString();
  const polozka: KlientKredit = {
    id: `kr${randomBytes(4).toString('hex')}`,
    castka,
    vznik,
    platnostDo: kreditVyprsiYmd(vznik, pravidla.kreditPlatnostMesicu) || '',
    zdroj: zdroj.slice(0, 200),
    pouzito: 0,
  };
  k.kredit = [...k.kredit, polozka];
  await ulozKlientKartu(store, k);
}

/** Faktura na IČO doporučitele → zruš odměnu i slevu doporučeného. */
export async function zrusOdmenuPriFaktureNaDoporucitele(
  store: ProcessStore,
  rec: RezervaceRecord,
): Promise<boolean> {
  if (!klubZapnut()) return false;
  const ico = (rec.faktura?.ico || '').replace(/\s+/g, '');
  if (!ico) return false;
  const kody = await listKodyDoporucitelu(store);
  let zruseno = false;
  for (const kod of kody) {
    const karta = await nactiKartuPodleKodu(store, kod);
    if (!karta) continue;
    const icoKarty = (karta.firma?.ico || '').replace(/\s+/g, '');
    if (icoKarty !== ico) continue;
    for (let i = 0; i < karta.doporuceni.length; i++) {
      const d = karta.doporuceni[i];
      if (d.rezervaceId !== rec.rezervace && !shodaHosta(d, rec)) continue;
      if (d.stav === 'nesplnuje') continue;
      if (d.odmena > 0) {
        if (d.stav === 'pripsano' || d.stav === 'vyplaceno') {
          karta.penize.kVyplate = Math.max(0, karta.penize.kVyplate - d.odmena);
        } else {
          karta.penize.ceka = Math.max(0, karta.penize.ceka - d.odmena);
        }
      }
      d.odmena = 0;
      d.slevaKamarada = null;
      d.stav = 'nesplnuje';
      karta.doporuceni[i] = d;
      zruseno = true;
    }
    if (zruseno) await ulozKartu(store, karta);
  }
  return zruseno;
}

function shodaHosta(d: DoporuceniNaKarte, rec: RezervaceRecord): boolean {
  const j = (rec.jmeno || '').trim().split(/\s+/)[0] || '';
  return Boolean(
    j && d.krestniJmenoKamarada && j === d.krestniJmenoKamarada && d.odjezd === rec.odjezd,
  );
}

export function hashUpozorneniKredit(klientId: string, kreditId: string, vyprsi: string): string {
  return createHash('sha256').update(`${klientId}|${kreditId}|${vyprsi}`).digest('hex').slice(0, 16);
}
