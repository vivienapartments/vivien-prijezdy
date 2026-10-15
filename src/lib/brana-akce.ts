import {
  jeVolna,
  konecPrikaz,
  konecZOdjezdu,
  nactiDokument,
  poziceSCislem,
  prazdnySlot,
  slozPrikaz,
  smsOdkaz,
  snimekSlotu,
  telefonNa00,
  uplatniSnimek,
  vyberPozici,
  vychoziBrana,
  type BranaDokument,
  type BranaKtery,
  type BranaSlot,
} from './brana';
import { telefonProBranu } from './vstup-pruvodce';
import type { ProcessStore, RezervaceRecord } from './store';

export type BranaVysledek =
  | { ok: true; pozice: number; odkaz: string; text: string; sloty: BranaSlot[] }
  | { ok: false; error: string; sloty?: BranaSlot[] };

function poznamenej(rec: RezervaceRecord, co: string, patch: Partial<RezervaceRecord> = {}): RezervaceRecord {
  const cas = new Date().toISOString();
  return {
    ...rec,
    ...patch,
    posledniPokus: cas,
    historie: [...rec.historie, { cas, co }].slice(-40),
  };
}

function nastaveniBrany(): { heslo: string; cislo: string } | null {
  const heslo = process.env.BRANA_HESLO?.trim() || '';
  const cislo = process.env.BRANA_CISLO?.trim() || '';
  if (!heslo || !cislo || /\s/.test(heslo)) return null;
  return { heslo, cislo };
}

function nahrad(sloty: BranaSlot[], slot: BranaSlot): BranaSlot[] {
  return sloty.map((s) => (s.pozice === slot.pozice ? slot : s));
}

function branaJePrazdna(doc: BranaDokument): boolean {
  return doc.sloty.every((s) => !s.telefon && !s.konec && s.stav === 'prazdna');
}

export async function zajistiVychoziBranu(store: ProcessStore): Promise<BranaDokument> {
  const raw = await store.getBrana();
  const doc = nactiDokument(raw);
  if ((raw == null || branaJePrazdna(doc)) && !doc.potvrzeno) {
    const novy: BranaDokument = { sloty: vychoziBrana(), potvrzeno: null };
    await store.setBrana(novy);
    return novy;
  }
  return doc;
}

async function ulozSloty(store: ProcessStore, sloty: BranaSlot[]): Promise<void> {
  const doc = nactiDokument(await store.getBrana());
  await store.setBrana({ sloty, potvrzeno: doc.potvrzeno });
}

export async function otevriSmsBrany(
  store: ProcessStore,
  opts: { rezervace: string; ios: boolean; druhe?: string | null; now?: Date },
): Promise<BranaVysledek> {
  const nastaveni = nastaveniBrany();
  if (!nastaveni) return { ok: false, error: 'Doplňte na Vercelu BRANA_HESLO a BRANA_CISLO.' };
  const now = opts.now || new Date();
  const doc = nactiDokument(await store.getBrana());
  if (!doc.potvrzeno) return { ok: false, error: 'Nejdřív potvrďte, že stav brány souhlasí.' };
  const rec = await store.getRezervace(opts.rezervace);
  if (!rec) return { ok: false, error: 'Rezervace v přehledu není.' };
  if (rec.zpusobPrijezdu !== 'auto') return { ok: false, error: 'Host nejede autem.' };

  const sloty = doc.sloty;
  const hlavni = sloty.find((s) => s.rezervace === rec.rezervace && s.ktery !== 'druhy' && !jeVolna(s, now)) || null;
  const druhy = Boolean(opts.druhe);
  const telefonZdroj = druhy ? opts.druhe || '' : rec.telefonBrana || '';
  const tel = telefonProBranu(telefonZdroj);
  if (!tel.ok) return { ok: false, error: 'Číslo musí být i s předvolbou.' };
  const telefon00 = telefonNa00(tel.ulozeny);
  const konecIso = konecZOdjezdu(rec.odjezd);
  const konec = konecIso ? konecPrikaz(konecIso) : null;
  if (!telefon00 || !konec || !konecIso) return { ok: false, error: 'Chybí telefon nebo den odjezdu.' };

  let pozice: number | null = null;
  let ktery: BranaKtery = 'hlavni';
  if (druhy) {
    if (!hlavni) return { ok: false, error: 'Nejdřív zaregistrujte první číslo.' };
    const stare = sloty.find((s) => s.rezervace === rec.rezervace && s.ktery === 'druhy' && !jeVolna(s, now));
    pozice = stare ? stare.pozice : vyberPozici(sloty, rec.apartman, now);
    ktery = 'druhy';
  } else if (hlavni) {
    pozice = hlavni.pozice;
    ktery = 'hlavni';
  } else {
    pozice = vyberPozici(sloty, rec.apartman, now);
  }
  if (pozice == null) return { ok: false, error: 'Všechny pozice jsou obsazené.' };

  const obsazeno = poziceSCislem(sloty, tel.ulozeny, pozice, now);
  if (obsazeno) return { ok: false, error: `Tohle číslo už je na pozici ${obsazeno}.` };

  const text = slozPrikaz(nastaveni.heslo, pozice, telefon00, konec);
  if (!text) return { ok: false, error: 'Zprávu se nepodařilo složit.' };

  const puvodni = sloty.find((s) => s.pozice === pozice) || prazdnySlot(pozice);
  const predchozi = puvodni.stav === 'ceka' && puvodni.predchozi ? puvodni.predchozi : snimekSlotu(puvodni);
  const slot: BranaSlot = {
    ...puvodni,
    telefon: tel.ulozeny,
    konec: konecIso,
    stav: 'ceka',
    rezervace: rec.rezervace,
    rucni: false,
    ktery,
    cekaOd: now.toISOString(),
    predchozi,
  };
  const dalsi = nahrad(sloty, slot);
  await ulozSloty(store, dalsi);
  const veta = druhy
    ? `Brána: druhé číslo čeká na potvrzení, pozice ${pozice}`
    : hlavni
      ? `Brána: úprava čeká na potvrzení, pozice ${pozice}`
      : `Brána: čeká na potvrzení, pozice ${pozice}`;
  await store.setRezervace(rec.rezervace, poznamenej(rec, veta));
  return { ok: true, pozice, odkaz: smsOdkaz(nastaveni.cislo, text, opts.ios), text, sloty: dalsi };
}

export async function potvrdBranu(
  store: ProcessStore,
  rezervace: string,
  pozice: number,
): Promise<{ ok: true; sloty: BranaSlot[] } | { ok: false; error: string }> {
  const rec = await store.getRezervace(rezervace);
  if (!rec) return { ok: false, error: 'Rezervace v přehledu není.' };
  const sloty = nactiDokument(await store.getBrana()).sloty;
  const slot = sloty.find((s) => s.pozice === pozice && s.rezervace === rezervace && s.stav === 'ceka');
  if (!slot) return { ok: false, error: 'Tahle pozice nečeká na potvrzení.' };
  const hotovo: BranaSlot = { ...slot, stav: 'plati', cekaOd: null, predchozi: null };
  const dalsi = nahrad(sloty, hotovo);
  await ulozSloty(store, dalsi);
  const patch = slot.ktery === 'druhy' ? {} : { branaRegistrovano: new Date().toISOString() };
  await store.setRezervace(rezervace, poznamenej(rec, `Brána potvrdila, pozice ${pozice}`, patch));
  return { ok: true, sloty: dalsi };
}

export async function zrusParkovani(
  store: ProcessStore,
  rezervace: string,
  pozice: number,
): Promise<{ ok: true; sloty: BranaSlot[] } | { ok: false; error: string }> {
  const rec = await store.getRezervace(rezervace);
  if (!rec) return { ok: false, error: 'Rezervace v přehledu není.' };
  const sloty = nactiDokument(await store.getBrana()).sloty;
  const slot = sloty.find((s) => s.pozice === pozice && s.rezervace === rezervace);
  if (!slot || (slot.stav === 'prazdna' && !slot.telefon)) return { ok: false, error: 'Není co rušit.' };
  const vraceno = slot.predchozi ? uplatniSnimek(slot, slot.predchozi) : prazdnySlot(pozice);
  const dalsi = nahrad(sloty, vraceno);
  await ulozSloty(store, dalsi);
  const patch =
    slot.ktery === 'druhy'
      ? {}
      : { branaRegistrovano: vraceno.stav === 'plati' ? rec.branaRegistrovano || new Date().toISOString() : null };
  await store.setRezervace(
    rezervace,
    poznamenej(rec, `Brána: parkování zrušeno v přehledu, pozice ${pozice}. Bráně se nic neposlalo.`, patch),
  );
  return { ok: true, sloty: dalsi };
}

export type RucniVstup = {
  pozice: number;
  telefon: string;
  konec: string;
  rezervace: string;
  uvolnit: boolean;
};

export async function ulozRucniBranu(
  store: ProcessStore,
  radky: RucniVstup[],
): Promise<{ ok: true; sloty: BranaSlot[] } | { ok: false; error: string }> {
  const sloty = nactiDokument(await store.getBrana()).sloty;
  const dalsi = sloty.map((s) => ({ ...s }));
  for (const radek of radky) {
    const idx = dalsi.findIndex((s) => s.pozice === radek.pozice);
    if (idx < 0) return { ok: false, error: 'Neznámá pozice.' };
    const rezervace = radek.rezervace.trim();
    if (rezervace && !(await store.getRezervace(rezervace))) {
      return { ok: false, error: `Rezervace ${rezervace} v přehledu není.` };
    }
    if (radek.uvolnit || !radek.telefon.trim()) {
      dalsi[idx] = prazdnySlot(radek.pozice);
      continue;
    }
    const tel = telefonProBranu(radek.telefon);
    if (!tel.ok) return { ok: false, error: `Pozice ${radek.pozice} potřebuje číslo s předvolbou.` };
    const konecIso = konecZOdjezdu(radek.konec);
    if (!konecIso) return { ok: false, error: `Pozice ${radek.pozice} potřebuje den konce.` };
    dalsi[idx] = {
      ...prazdnySlot(radek.pozice),
      telefon: tel.ulozeny,
      konec: konecIso,
      stav: 'plati',
      rezervace: rezervace || null,
      rucni: true,
      ktery: rezervace ? 'hlavni' : null,
    };
  }
  await ulozSloty(store, dalsi);
  for (const radek of radky) {
    const rezervace = radek.rezervace.trim();
    if (!rezervace) continue;
    const rec = await store.getRezervace(rezervace);
    if (!rec) continue;
    const veta = radek.uvolnit || !radek.telefon.trim()
      ? `Brána: pozice ${radek.pozice} uvolněna v přehledu`
      : `Brána: pozice ${radek.pozice} zapsána ručně`;
    await store.setRezervace(rezervace, poznamenej(rec, veta));
  }
  return { ok: true, sloty: dalsi };
}

export async function potvrdStavBrany(store: ProcessStore, now = new Date()): Promise<{ ok: true; sloty: BranaSlot[] }> {
  const doc = await zajistiVychoziBranu(store);
  await store.setBrana({ sloty: doc.sloty, potvrzeno: now.toISOString() });
  return { ok: true, sloty: doc.sloty };
}
