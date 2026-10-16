import { casVPraze, denPraha, hodinaPraha } from './brana';
import { PREDSTIH_PRIJEZDU_MIN } from './constants';
import type { ProcessStore, RezervaceRecord } from './store';
import { popisHosta, upozorniMajitele } from './upozorneni';

/** Od deváté hodiny pražského času, když čas příjezdu pořád neznáme. */
const RANO = 9;

function jeHodina(cas: string | null): cas is string {
  return Boolean(cas && /^([01]\d|2[0-3]):[0-5]\d$/.test(cas));
}

/** Klíč upozornění. Když se čas změní, klíč se změní a upozornění se pošle znovu. */
export function klicPrijezdu(rec: Pick<RezervaceRecord, 'prijezd' | 'casPrijezdu'>): string | null {
  if (!rec.prijezd || !jeHodina(rec.casPrijezdu)) return null;
  return `${rec.prijezd} ${rec.casPrijezdu}`;
}

function uzJeTu(rec: RezervaceRecord): boolean {
  return rec.stav === 'zruseno' || Boolean(rec.naMiste) || Boolean(rec.predano);
}

/** Jednou, v okně hodinu před časem příjezdu, dokud host není na místě ani předaný. */
export function maUpozornitHodinu(rec: RezervaceRecord, now = new Date()): boolean {
  if (uzJeTu(rec)) return false;
  const klic = klicPrijezdu(rec);
  if (!klic || !rec.prijezd || !jeHodina(rec.casPrijezdu)) return false;
  if (rec.prijezdPushCas === klic) return false;
  const [hodina, minuta] = rec.casPrijezdu.split(':').map(Number);
  const prijezd = casVPraze(rec.prijezd, hodina, minuta);
  const od = new Date(prijezd.getTime() - PREDSTIH_PRIJEZDU_MIN * 60_000);
  return now >= od && now < prijezd;
}

/** Jednou v den příjezdu od 9:00, když čas pořád neznáme. */
export function maUpozornitNeznamy(rec: RezervaceRecord, now = new Date()): boolean {
  if (uzJeTu(rec)) return false;
  if (!rec.prijezd || rec.prijezd !== denPraha(now)) return false;
  if (jeHodina(rec.casPrijezdu) || rec.casPrijezdu === 'po20' || rec.casPrijezdu === 'po23') return false;
  if (rec.prijezdPushNeznamy === rec.prijezd) return false;
  return hodinaPraha(now) >= RANO;
}

export function textHodinuPred(rec: Pick<RezervaceRecord, 'apartman' | 'jmeno' | 'rezervace' | 'casPrijezdu'>): string {
  return `${popisHosta(rec)} přijede kolem ${rec.casPrijezdu} (za hodinu)`;
}

export function textCasNeznamy(rec: Pick<RezervaceRecord, 'apartman' | 'jmeno' | 'rezervace'>): string {
  return `${popisHosta(rec)} dnes přijíždí, čas neznámý`;
}

/** Pošle upozornění a zapíše, že už odešlo. Když telefon ani e-mail neberou, zkusí to příští běh. */
export async function upozorniPrijezd(
  store: ProcessStore,
  now = new Date(),
  posli: typeof upozorniMajitele = upozorniMajitele,
): Promise<number> {
  if (hodinaPraha(now) < RANO) return 0;
  const list = await store.listRezervace();
  let pocet = 0;
  for (const { id, record } of list) {
    const hodinu = maUpozornitHodinu(record, now);
    const neznamy = !hodinu && maUpozornitNeznamy(record, now);
    if (!hodinu && !neznamy) continue;
    const text = hodinu ? textHodinuPred(record) : textCasNeznamy(record);
    const jak = await posli(store, text, `/prehled#${id}`);
    if (jak === 'nic') continue;
    const cerstvy = (await store.getRezervace(id)) || record;
    if (hodinu && !maUpozornitHodinu(cerstvy, now)) continue;
    if (neznamy && !maUpozornitNeznamy(cerstvy, now)) continue;
    const veta = jak === 'push' ? `Upozornění na telefon: ${text}` : `Upozornění e-mailem: ${text}`;
    const klic = klicPrijezdu(cerstvy);
    await store.setRezervace(id, {
      ...cerstvy,
      prijezdPushCas: hodinu && klic ? klic : cerstvy.prijezdPushCas,
      prijezdPushNeznamy: neznamy ? cerstvy.prijezd : cerstvy.prijezdPushNeznamy,
      historie: [...cerstvy.historie, { cas: now.toISOString(), co: veta }].slice(-40),
    });
    pocet += 1;
  }
  return pocet;
}
