import { casVPraze, denPraha, hodinaPraha } from './brana';
import { uzOdjel } from './zalozky';
import { PREDSTIH_PRIJEZDU_MIN } from './constants';
import type { ProcessStore, RezervaceRecord } from './store';
import { popisHosta, upozorniMajitele } from './upozorneni';

/** Od deváté hodiny pražského času, když čas příjezdu pořád neznáme. */
const RANO = 9;

/** Okno upozornění na doklady před příjezdem (minuty). */
const DOKLADY_PRED_MIN = 30;

function jeHodina(cas: string | null): cas is string {
  return Boolean(cas && /^([01]\d|2[0-3]):[0-5]\d$/.test(cas));
}

/** Klíč upozornění. Když se čas změní, klíč se změní a upozornění se pošle znovu. */
export function klicPrijezdu(rec: Pick<RezervaceRecord, 'prijezd' | 'casPrijezdu'>): string | null {
  if (!rec.prijezd || !jeHodina(rec.casPrijezdu)) return null;
  return `${rec.prijezd} ${rec.casPrijezdu}`;
}

function uzJeTu(rec: RezervaceRecord, now: Date): boolean {
  return rec.stav === 'zruseno' || Boolean(rec.naMiste) || Boolean(rec.predano) || uzOdjel(rec, denPraha(now));
}

/** Jednou, v okně hodinu před časem příjezdu, dokud host není na místě ani předaný. */
export function maUpozornitHodinu(rec: RezervaceRecord, now = new Date()): boolean {
  if (uzJeTu(rec, now)) return false;
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
  if (uzJeTu(rec, now)) return false;
  if (!rec.prijezd || rec.prijezd !== denPraha(now)) return false;
  if (jeHodina(rec.casPrijezdu) || rec.casPrijezdu === 'po20' || rec.casPrijezdu === 'po23') return false;
  if (rec.prijezdPushNeznamy === rec.prijezd) return false;
  return hodinaPraha(now) >= RANO;
}

export function uzOdeslanyDoklady(historie: { co: string }[] | null | undefined): boolean {
  const platne = new Set([
    'WhatsApp: Doklady k předání',
    'SMS: Doklady k předání',
    'E-mailem: Doklady k předání',
  ]);
  return (historie || []).some((h) => platne.has(h.co));
}

/** Jednou v okně 30 minut před příjezdem, když doklady ještě neodešly. */
export function maUpozornitDoklady(rec: RezervaceRecord, now = new Date()): boolean {
  if (uzJeTu(rec, now)) return false;
  const klic = klicPrijezdu(rec);
  if (!klic || !rec.prijezd || !jeHodina(rec.casPrijezdu)) return false;
  if (rec.dokladyPushCas === klic) return false;
  if (uzOdeslanyDoklady(rec.historie)) return false;
  const [hodina, minuta] = rec.casPrijezdu.split(':').map(Number);
  const prijezd = casVPraze(rec.prijezd, hodina, minuta);
  const od = new Date(prijezd.getTime() - DOKLADY_PRED_MIN * 60_000);
  return now >= od && now < prijezd;
}

export function textHodinuPred(rec: Pick<RezervaceRecord, 'apartman' | 'jmeno' | 'rezervace' | 'casPrijezdu'>): string {
  return `${popisHosta(rec)} přijede kolem ${rec.casPrijezdu} (za hodinu)`;
}

export function textCasNeznamy(rec: Pick<RezervaceRecord, 'apartman' | 'jmeno' | 'rezervace'>): string {
  return `${popisHosta(rec)} dnes přijíždí, čas neznámý`;
}

export function textDokladyPred(
  rec: Pick<RezervaceRecord, 'apartman' | 'jmeno' | 'rezervace' | 'casPrijezdu'>,
): string {
  const casti = (rec.jmeno || '').trim().split(/\s+/).filter(Boolean);
  const host = casti.length ? casti[casti.length - 1] : rec.rezervace;
  return `${rec.apartman || 'Apartmán'} · ${host} přijede v ${rec.casPrijezdu} · pošlete vzkaz s doklady`;
}

/** Pošle upozornění a zapíše, že už odešlo. Když telefon ani e-mail neberou, zkusí to příští běh. */
export async function upozorniPrijezd(
  store: ProcessStore,
  now = new Date(),
  posli: typeof upozorniMajitele = upozorniMajitele,
): Promise<number> {
  /**
   * Hodinu před příjezdem musí běžet i před 9:00.
   * Od 9:00 ještě „čas neznámý“. Brána z 707814a na celou funkci blokovala ranní příjezdy.
   */
  const list = await store.listRezervace();
  let pocet = 0;
  for (const { id, record } of list) {
    const hodinu = maUpozornitHodinu(record, now);
    const neznamy = !hodinu && maUpozornitNeznamy(record, now);
    if (hodinu || neznamy) {
      const text = hodinu ? textHodinuPred(record) : textCasNeznamy(record);
      const jak = await posli(store, text, `/prehled#${id}`);
      if (jak !== 'nic') {
        const cerstvy = (await store.getRezervace(id)) || record;
        if ((hodinu && maUpozornitHodinu(cerstvy, now)) || (neznamy && maUpozornitNeznamy(cerstvy, now))) {
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
      }
    }

    const aktualni = (await store.getRezervace(id)) || record;
    if (maUpozornitDoklady(aktualni, now)) {
      const text = textDokladyPred(aktualni);
      const jak = await posli(store, text, `/prehled#${id}?zprava=doklady`);
      if (jak === 'nic') continue;
      const cerstvy = (await store.getRezervace(id)) || aktualni;
      if (!maUpozornitDoklady(cerstvy, now)) continue;
      const veta = jak === 'push' ? `Upozornění na telefon: ${text}` : `Upozornění e-mailem: ${text}`;
      const klic = klicPrijezdu(cerstvy);
      await store.setRezervace(id, {
        ...cerstvy,
        dokladyPushCas: klic || cerstvy.dokladyPushCas,
        historie: [...cerstvy.historie, { cas: now.toISOString(), co: veta }].slice(-40),
      });
      pocet += 1;
    }
  }
  return pocet;
}
