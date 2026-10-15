import type { ProcessStore, RezervaceRecord } from './store';
import { soucetVyjezdu } from './priplatek-prijezd';
import { popisHosta, upozorniMajitele } from './upozorneni';

/** Od sedmé hodiny pražského času. */
const RANI_HODINA = 7;

function denPraha(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function hodinaPraha(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Prague',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  return Number(parts.find((p) => p.type === 'hour')?.value || '0');
}

/** Ráno v den odjezdu, jednou, dokud není vybraný městský poplatek nebo opakovaný výjezd. */
export function maUpozornitPlatbu(rec: RezervaceRecord, now = new Date()): boolean {
  if (rec.stav === 'zruseno') return false;
  if (!rec.odjezd || rec.odjezd !== denPraha(now)) return false;
  if (rec.platbaUpozorneno === rec.odjezd) return false;
  if (hodinaPraha(now) < RANI_HODINA) return false;
  const mesto = rec.poplatek !== 'ne' && !rec.zaplaceno;
  return mesto || soucetVyjezdu(rec.vyjezdy || []) > 0;
}

export function textNezaplaceneho(rec: RezervaceRecord): string {
  const casti: string[] = [];
  if (rec.poplatek !== 'ne' && !rec.zaplaceno) casti.push('poplatek městu není vybraný');
  const vyjezd = soucetVyjezdu(rec.vyjezdy || []);
  if (vyjezd > 0) casti.push(`opakovaný výjezd ${vyjezd} Kč není zaplacený`);
  return `${popisHosta(rec)}: dnes odjezd, ${casti.join(', ')}`;
}

/** Pošle upozornění a zapíše, že už dnes odešlo. Když telefon ani e-mail neberou, zkusí to příští běh. */
/** Nahrazeno souhrnem nedoplatků v 8:00. Z běhu /api/zpracuj se už nevolá. */
export async function upozorniNezaplacene(store: ProcessStore, now = new Date()): Promise<number> {
  const list = await store.listRezervace();
  let pocet = 0;
  for (const { id, record } of list) {
    if (!maUpozornitPlatbu(record, now)) continue;
    const text = textNezaplaceneho(record);
    const jak = await upozorniMajitele(store, text, `/prehled#${id}`);
    if (jak === 'nic') continue;
    const cerstvy = (await store.getRezervace(id)) || record;
    if (cerstvy.platbaUpozorneno === cerstvy.odjezd) continue;
    if (!maUpozornitPlatbu(cerstvy, now)) continue;
    const duvod = textNezaplaceneho(cerstvy);
    const veta = jak === 'push' ? `Upozornění na telefon: ${duvod}` : `Upozornění e-mailem: ${duvod}`;
    await store.setRezervace(id, {
      ...cerstvy,
      platbaUpozorneno: cerstvy.odjezd,
      historie: [...cerstvy.historie, { cas: now.toISOString(), co: veta }].slice(-40),
    });
    pocet += 1;
  }
  return pocet;
}
