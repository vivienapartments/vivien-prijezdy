import { jeCasDrive, jeCasPozde, zadostOdjezdu, zadostPrijezdu, zrusitZadost } from './okno-pobytu';
import { jeCasOdjezduPovoleny, textHostUlozil, zobrazCas } from './odjezd';
import { verzeAktualni } from './pravidla-verze';
import { popisekCasu } from './priplatek-prijezd';
import { maRucni } from './rucni-pole';
import type { ProcessStore, RezervaceRecord } from './store';
import { textTelefonu } from './telefon';
import { verifyToken } from './token';
import { GUIDE_LANGS } from './types';
import { popisHosta, poznamenejUpozorneni, upozorniMajitele } from './upozorneni';
import {
  jeCasHosta,
  normalizujSpz,
  smiUlozit,
  telefonProBranu,
  urovenZRezervace,
  type VysledekUlozeni,
} from './vstup-pruvodce';

function jazykSouhlasu(raw: string | undefined): string {
  return raw && (GUIDE_LANGS as readonly string[]).includes(raw) ? raw : 'cs';
}

/** Zaškrtnutí se uloží jen když přijde. Stejná verze si nechá původní čas. */
function doplnSouhlas(
  rec: RezervaceRecord,
  souhlas: boolean | undefined,
  jazyk: string | undefined,
): { patch: Partial<RezervaceRecord>; veta: string | null } {
  if (typeof souhlas !== 'boolean') return { patch: {}, veta: null };
  if (souhlas) {
    const verze = verzeAktualni();
    if (rec.souhlasPravidel?.verze === verze) return { patch: {}, veta: null };
    return {
      patch: { souhlasPravidel: { kdy: new Date().toISOString(), jazyk: jazykSouhlasu(jazyk), verze } },
      veta: 'Host souhlasí s pravidly příjezdu',
    };
  }
  if (!rec.souhlasPravidel) return { patch: {}, veta: null };
  return { patch: { souhlasPravidel: null }, veta: 'Host zrušil souhlas s pravidly' };
}

function poznamenej(rec: RezervaceRecord, co: string, patch: Partial<RezervaceRecord>): RezervaceRecord {
  const cas = new Date().toISOString();
  const znacky = [...(rec.hostUlozeni || []), cas].slice(-20);
  return {
    ...rec,
    ...patch,
    hostUlozeni: znacky,
    posledniPokus: cas,
    historie: [...rec.historie, { cas, co }].slice(-40),
  };
}

async function ohlas(store: ProcessStore, id: string, text: string): Promise<void> {
  try {
    const jak = await upozorniMajitele(store, text, `/prehled#${id}`);
    await poznamenejUpozorneni(store, id, jak);
  } catch {
    /* upozornění nesmí shodit uložení hosta */
  }
}

export async function ulozVstupHosta(
  store: ProcessStore,
  token: string,
  telo: {
    akce?: string;
    cas?: string;
    zpusob?: string;
    telefon?: string;
    spz?: string;
    pujcene?: boolean;
    souhlas?: boolean;
    jazyk?: string;
    casPrijezd?: string;
    casOdjezd?: string;
    zrusit?: string;
    od?: string;
  },
): Promise<VysledekUlozeni> {
  const overeni = verifyToken(token);
  if (!overeni.ok) return { ok: false, duvod: 'token' };
  const id = overeni.payload.r;
  const rec = await store.getRezervace(id);
  if (!rec || rec.stav === 'zruseno') return { ok: false, duvod: 'chybi' };
  if (!smiUlozit(rec.hostUlozeni || [])) return { ok: false, duvod: 'limit' };

  const spalit = async () => {
    const cas = new Date().toISOString();
    await store.setRezervace(id, {
      ...rec,
      hostUlozeni: [...(rec.hostUlozeni || []), cas].slice(-20),
      posledniPokus: cas,
    });
  };

  const vsechny = async () => (await store.listRezervace()).map((e) => e.record);

  if (telo.akce === 'okno') {
    const vse = await vsechny();
    const now = new Date();
    let pracovni = rec;
    const pushe: string[] = [];
    if (telo.zrusit === 'prijezd' || telo.zrusit === 'oboji') pracovni = zrusitZadost(pracovni, 'prijezd', now) || pracovni;
    if (telo.zrusit === 'odjezd' || telo.zrusit === 'oboji') pracovni = zrusitZadost(pracovni, 'odjezd', now) || pracovni;
    const odkud = telo.od === 'pripraveno' ? 'pripraveno' : 'pruvodce';
    if (telo.casPrijezd) {
      const v = zadostPrijezdu(pracovni, vse, telo.casPrijezd, odkud, now);
      if (!v) {
        await spalit();
        return { ok: false, duvod: 'cas' };
      }
      if (!v.bezeZmeny) {
        pracovni = v.rec;
        if (v.push) pushe.push(v.push);
      }
    }
    if (telo.casOdjezd) {
      const v = zadostOdjezdu(pracovni, vse, telo.casOdjezd, 'pruvodce', now);
      if (!v) {
        await spalit();
        return { ok: false, duvod: 'cas' };
      }
      if (!v.bezeZmeny) {
        pracovni = v.rec;
        if (v.push) pushe.push(v.push);
      }
    }
    if (pracovni === rec && !pushe.length) {
      return { ok: true, uroven: urovenZRezervace(rec) };
    }
    const casUlozeni = now.toISOString();
    const zapis = { ...pracovni, hostUlozeni: [...(rec.hostUlozeni || []), casUlozeni].slice(-20) };
    await store.setRezervace(id, zapis);
    for (const text of pushe) await ohlas(store, id, text);
    return { ok: true, uroven: urovenZRezervace(zapis) };
  }

  if (telo.akce === 'odjezd') {
    const cas = (telo.cas || '').trim();
    if (jeCasPozde(cas)) {
      const v = zadostOdjezdu(rec, await vsechny(), cas, 'pruvodce', new Date());
      if (!v) {
        await spalit();
        return { ok: false, duvod: 'cas' };
      }
      if (v.bezeZmeny) {
        return { ok: true, cas: rec.zadostOdjezd?.cas || cas, uroven: urovenZRezervace(rec) };
      }
      const casUlozeni = new Date().toISOString();
      const zapis = { ...v.rec, hostUlozeni: [...(rec.hostUlozeni || []), casUlozeni].slice(-20) };
      await store.setRezervace(id, zapis);
      if (v.push) await ohlas(store, id, v.push);
      return { ok: true, cas: v.rec.zadostOdjezd?.cas || cas, uroven: urovenZRezervace(zapis) };
    }
    if (!jeCasOdjezduPovoleny(cas)) {
      await spalit();
      return { ok: false, duvod: 'cas' };
    }
    if (maRucni(rec, 'casOdjezdu') && rec.casOdjezdu && rec.casOdjezdu !== cas) {
      const zapis = poznamenej(rec, 'Host zadal jiný odjezd, ruční čas zůstal', {});
      await store.setRezervace(id, zapis);
      await ohlas(store, id, `${popisHosta(rec)} napsal odjezd ${zobrazCas(cas)}, váš čas zůstává`);
      return { ok: true, cas: rec.casOdjezdu, uroven: urovenZRezervace(rec) };
    }
    const bylo = rec.casOdjezdu ? zobrazCas(rec.casOdjezdu) : 'žádný';
    const nove = zobrazCas(cas);
    const zapis = poznamenej(rec, `Čas odjezdu ${bylo} → ${nove}`, {
      casOdjezdu: cas,
      casOdjezduZadalHost: true,
    });
    await store.setRezervace(id, zapis);
    await ohlas(store, id, textHostUlozil(rec, cas));
    return { ok: true, cas, uroven: urovenZRezervace(zapis) };
  }

  if (telo.akce === 'dokoncit') {
    const cas = (telo.cas || '').trim();
    if (!jeCasHosta(cas)) {
      await spalit();
      return { ok: false, duvod: 'cas' };
    }
    const zpusob = telo.zpusob === 'auto' || telo.zpusob === 'pesky' ? telo.zpusob : null;
    if (!zpusob) {
      await spalit();
      return { ok: false, duvod: 'zpusob' };
    }
    if (telo.souhlas !== true) {
      await spalit();
      return { ok: false, duvod: 'souhlas' };
    }
    let telefonBrana: string | null = null;
    let spz: string | null = null;
    let pujcene = false;
    if (zpusob === 'auto') {
      const tel = telefonProBranu(telo.telefon || '');
      if (!tel.ok) {
        await spalit();
        return { ok: false, duvod: 'telefon' };
      }
      pujcene = Boolean(telo.pujcene);
      if (!pujcene) {
        const v = normalizujSpz(telo.spz || '');
        if (!v.ok) {
          await spalit();
          return { ok: false, duvod: 'spz' };
        }
        spz = v.spz;
      }
      telefonBrana = tel.ulozeny;
    }
    if (jeCasDrive(cas)) {
      const v = zadostPrijezdu(rec, await vsechny(), cas, 'pruvodce', new Date());
      if (!v) {
        await spalit();
        return { ok: false, duvod: 'cas' };
      }
      const souhlas = doplnSouhlas(v.rec, true, telo.jazyk);
      const casUlozeni = new Date().toISOString();
      const zapis = {
        ...v.rec,
        ...souhlas.patch,
        zpusobPrijezdu: zpusob as 'auto' | 'pesky' | null,
        telefonBrana,
        spz,
        spzPujcene: pujcene,
        hostUlozeni: [...(rec.hostUlozeni || []), casUlozeni].slice(-20),
        historie: souhlas.veta ? [...v.rec.historie, { cas: casUlozeni, co: souhlas.veta }].slice(-40) : v.rec.historie,
      };
      await store.setRezervace(id, zapis);
      if (v.push) await ohlas(store, id, v.push);
      return { ok: true, cas: zapis.casPrijezdu || undefined, uroven: urovenZRezervace(zapis) };
    }
    const novy = popisekCasu(cas);
    const souhlas = doplnSouhlas(rec, true, telo.jazyk);
    const rucniCas = maRucni(rec, 'casPrijezdu') && rec.casPrijezdu !== cas;
    const navrhy = rucniCas
      ? [...(rec.navrhy || []).filter((n) => n.pole !== 'casPrijezdu'), { pole: 'casPrijezdu' as const, od: 'host' as const, hodnota: cas }]
      : (rec.navrhy || []).filter((n) => n.pole !== 'casPrijezdu');
    const zmenaTelefonu = Boolean(rec.telefonBrana && telefonBrana && rec.telefonBrana !== telefonBrana);
    const zapis = poznamenej(
      rec,
      rucniCas ? 'Host zadal jiný čas, ruční čas zůstal' : `Příjezd ${popisekCasu(rec.casPrijezdu || 'žádný')} → ${novy}`,
      {
        casPrijezdu: rucniCas ? rec.casPrijezdu : cas,
        casZadalHost: rucniCas ? rec.casZadalHost : true,
        zpusobPrijezdu: zpusob,
        telefonBrana,
        spz,
        spzPujcene: pujcene,
        branaRegistrovano: zmenaTelefonu ? null : rec.branaRegistrovano,
        zadostPrijezd: rec.zadostPrijezd?.stav === 'potvrzeno' ? rec.zadostPrijezd : null,
        navrhy,
        ...souhlas.patch,
      },
    );
    if (souhlas.veta) zapis.historie = [...zapis.historie, { cas: zapis.posledniPokus, co: souhlas.veta }].slice(-40);
    await store.setRezervace(id, zapis);
    if (rucniCas) await ohlas(store, id, `${popisHosta(rec)}: host napsal ${novy}, váš čas zůstává`);
    else if ((rec.casPrijezdu || '') !== cas) await ohlas(store, id, `${popisHosta(rec)}: příjezd kolem ${novy}`);
    if (telefonBrana && telefonBrana !== rec.telefonBrana) {
      await ohlas(store, id, `${popisHosta(rec)}: zaregistrujte v bráně ${textTelefonu(telefonBrana)}`);
    }
    if (spz && spz !== rec.spz) {
      const textSpz = spz.length > 4 ? `${spz.slice(0, -4)} ${spz.slice(-4)}` : spz;
      await ohlas(store, id, `${popisHosta(rec)}: SPZ ${textSpz}`);
    }
    return { ok: true, uroven: urovenZRezervace(await store.getRezervace(id)) };
  }

  if (telo.akce === 'cas') {
    const cas = (telo.cas || '').trim();
    if (!jeCasHosta(cas)) {
      await spalit();
      return { ok: false, duvod: 'cas' };
    }
    const stary = rec.casPrijezdu || 'žádný';
    const novy = popisekCasu(cas);
    const bylo = popisekCasu(stary);
    const souhlas = doplnSouhlas(rec, telo.souhlas, telo.jazyk);
    if (maRucni(rec, 'casPrijezdu') && rec.casPrijezdu !== cas) {
      const navrhy = [
        ...(rec.navrhy || []).filter((n) => n.pole !== 'casPrijezdu'),
        { pole: 'casPrijezdu' as const, od: 'host' as const, hodnota: cas },
      ];
      const zapis = poznamenej(rec, 'Host zadal jiný čas, ruční čas zůstal', { navrhy, ...souhlas.patch });
      if (souhlas.veta) zapis.historie = [...zapis.historie, { cas: zapis.posledniPokus, co: souhlas.veta }].slice(-40);
      await store.setRezervace(id, zapis);
      await ohlas(store, id, `${popisHosta(rec)}: host napsal ${novy}, váš čas zůstává`);
      return { ok: true, uroven: urovenZRezervace(rec) };
    }
    const zapis = poznamenej(rec, `Čas příjezdu ${bylo} → ${novy}`, {
      casPrijezdu: cas,
      casZadalHost: true,
      ...souhlas.patch,
    });
    if (souhlas.veta) zapis.historie = [...zapis.historie, { cas: zapis.posledniPokus, co: souhlas.veta }].slice(-40);
    await store.setRezervace(id, zapis);
    await ohlas(store, id, `${popisHosta(rec)}: příjezd kolem ${novy}`);
    return { ok: true, uroven: urovenZRezervace({ ...rec, casPrijezdu: cas, casZadalHost: true }) };
  }

  if (telo.akce === 'souhlas') {
    const souhlas = doplnSouhlas(rec, telo.souhlas, telo.jazyk);
    if (!souhlas.veta) return { ok: true, uroven: urovenZRezervace(rec) };
    await store.setRezervace(id, poznamenej(rec, souhlas.veta, souhlas.patch));
    return { ok: true, uroven: urovenZRezervace(rec) };
  }

  if (telo.akce === 'prijezd') {
    const zpusob = telo.zpusob === 'auto' || telo.zpusob === 'pesky' ? telo.zpusob : null;
    if (!zpusob) return { ok: false, duvod: 'zpusob' };
    if (zpusob === 'pesky') {
      await store.setRezervace(
        id,
        poznamenej(rec, 'Host přijede pěšky', {
          zpusobPrijezdu: 'pesky',
          telefonBrana: null,
          spz: null,
          spzPujcene: false,
          branaRegistrovano: null,
        }),
      );
      return { ok: true, uroven: urovenZRezervace({ ...rec, zpusobPrijezdu: 'pesky' }) };
    }
    const tel = telefonProBranu(telo.telefon || '');
    if (!tel.ok) {
      await spalit();
      return { ok: false, duvod: 'telefon' };
    }
    const pujcene = Boolean(telo.pujcene);
    let spz: string | null = null;
    if (!pujcene) {
      const v = normalizujSpz(telo.spz || '');
      if (!v.ok) {
        await spalit();
        return { ok: false, duvod: 'spz' };
      }
      spz = v.spz;
    }
    const zmenaTelefonu = Boolean(rec.telefonBrana && rec.telefonBrana !== tel.ulozeny);
    const novyTelefon = !rec.telefonBrana || zmenaTelefonu;
    const novaSpz = Boolean(spz && spz !== rec.spz);
    await store.setRezervace(
      id,
      poznamenej(rec, zmenaTelefonu ? 'Host změnil telefon pro bránu' : 'Host doplnil údaje k bráně', {
        zpusobPrijezdu: 'auto',
        telefonBrana: tel.ulozeny,
        spz,
        spzPujcene: pujcene,
        branaRegistrovano: zmenaTelefonu ? null : rec.branaRegistrovano,
      }),
    );
    if (novyTelefon) {
      await ohlas(store, id, `${popisHosta(rec)}: zaregistrujte v bráně ${textTelefonu(tel.ulozeny)}`);
    }
    if (novaSpz && spz) {
      const textSpz = spz.length > 4 ? `${spz.slice(0, -4)} ${spz.slice(-4)}` : spz;
      await ohlas(store, id, `${popisHosta(rec)}: SPZ ${textSpz}`);
    }
    return {
      ok: true,
      uroven: urovenZRezervace({
        ...rec,
        zpusobPrijezdu: 'auto',
        telefonBrana: tel.ulozeny,
        spz,
        spzPujcene: pujcene,
      }),
    };
  }

  return { ok: false, duvod: 'zpusob' };
}
