import { denPraha, hodinaPraha, stavParkovani, type BranaSlot } from './brana';
import { zajistiVychoziBranu } from './brana-akce';
import type { ProcessStore, RezervaceRecord } from './store';
import { popisHosta, upozorniMajitele } from './upozorneni';

const RANO = 9;

function hostZ(rec: RezervaceRecord) {
  return {
    rezervace: rec.rezervace,
    apartman: rec.apartman,
    prijezd: rec.prijezd,
    odjezd: rec.odjezd,
    zpusob: rec.zpusobPrijezdu,
    telefonBrana: rec.telefonBrana,
    branaRegistrovano: rec.branaRegistrovano,
    zruseno: rec.stav === 'zruseno',
  };
}

/** Jednou, když host napsal telefon a je v okně 7 dní a brána ještě nemá místo. */
export function maUpozornitRegistraci(rec: RezervaceRecord, sloty: BranaSlot[], now: Date): boolean {
  if (rec.branaPushRegistrace) return false;
  const stav = stavParkovani(hostZ(rec), sloty, now);
  return stav.akce === 'registrovat';
}

/** Jednou ráno v den příjezdu, když parkování ještě není zelené. */
export function maUpozornitRano(rec: RezervaceRecord, sloty: BranaSlot[], now: Date): boolean {
  if (rec.zpusobPrijezdu !== 'auto' || rec.stav === 'zruseno') return false;
  if (!rec.prijezd || rec.prijezd !== denPraha(now)) return false;
  if (rec.branaPushRano === rec.prijezd) return false;
  if (hodinaPraha(now) < RANO) return false;
  const stav = stavParkovani(hostZ(rec), sloty, now);
  return stav.ton !== 'zelena' && stav.ton !== 'seda';
}

export async function upozorniBranu(store: ProcessStore, now = new Date()): Promise<number> {
  const doc = await zajistiVychoziBranu(store);
  if (!doc.potvrzeno) return 0;
  const sloty = doc.sloty;
  const list = await store.listRezervace();
  let pocet = 0;
  for (const { id, record } of list) {
    const registrace = maUpozornitRegistraci(record, sloty, now);
    const rano = !registrace && maUpozornitRano(record, sloty, now);
    if (!registrace && !rano) continue;
    const text = registrace
      ? `${popisHosta(record)}: zaregistrujte bránu`
      : `${popisHosta(record)} dnes přijíždí, brána není zaregistrovaná`;
    const jak = await upozorniMajitele(store, text, `/prehled#${id}`);
    if (jak === 'nic') continue;
    const cerstvy = (await store.getRezervace(id)) || record;
    if (registrace && cerstvy.branaPushRegistrace) continue;
    if (rano && cerstvy.branaPushRano === cerstvy.prijezd) continue;
    const veta = jak === 'push' ? `Upozornění na telefon: ${text}` : `Upozornění e-mailem: ${text}`;
    await store.setRezervace(id, {
      ...cerstvy,
      branaPushRegistrace: registrace ? now.toISOString() : cerstvy.branaPushRegistrace,
      branaPushRano: rano ? cerstvy.prijezd : cerstvy.branaPushRano,
      historie: [...cerstvy.historie, { cas: now.toISOString(), co: veta }].slice(-40),
    });
    pocet += 1;
  }
  return pocet;
}
