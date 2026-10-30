import { NextResponse } from 'next/server';
import { normalizujCasPrijezdu } from '@/lib/cas-prijezdu';
import { zkontrolujCheckinOdkaz } from '@/lib/checkin-odkaz';
import { duvod, jeVyhrada, problemEmailu } from '@/lib/chyby';
import { nightsBetween } from '@/lib/dates';
import { jeRucniPole, maRucni, prevzitNavrh, zapisMajitele } from '@/lib/rucni-pole';
import { jazykZPredvolby, normalizujTelefon, textTelefonu } from '@/lib/telefon';
import { CAS_PO_23, novyVyjezd, vratPosledniVyjezd, VYJEZD_CASTKA } from '@/lib/priplatek-prijezd';
import { denPraha } from '@/lib/brana';
import { isoPrahaZCasu } from '@/lib/prehled';
import { CASY_VYBERU } from '@/lib/vstup-pruvodce';
import { posliEmailZpravy, predmetZpravy } from '@/lib/email-zprava';
import { odkazNaPruvodce, posliPruvodce } from '@/lib/posli-pruvodce';
import { oznacUklid, vratUklid } from '@/lib/dnesek';
import {
  jeKdoZavad,
  normalizujTextZavad,
  odkazPotvrzeniZavad,
  predmetEmailuPoOdjezdu,
  predmetEmailuZavad,
  textEmailuPoOdjezdu,
  textEmailuZavad,
  tlacitkoPotvrditZavady,
} from '@/lib/zavady-predani';
import {
  aplikujNelze,
  aplikujPotvrzeni,
  cenaPozde,
  oznacUpozorneno,
  poUklidu,
  predmetPripraveno,
} from '@/lib/okno-pobytu';
import { upozorniMajitele } from '@/lib/upozorneni';
import { polozkyZRezervace, textRozpisu, type DruhDluhu } from '@/lib/odjezd';
import { vratPlatbu, zaplatDruhy } from '@/lib/platby-hosta';
import { oznacPrevzeti, vratPrevzeti } from '@/lib/zalozky';
import {
  adminOdpovedPrani,
  adminOtevritPrani,
  adminPrectenoPrani,
  adminVyrizenoPrani,
  jeKdoPrani,
} from '@/lib/prani';
import { zpravyMenu, type DruhZpravy } from '@/lib/whatsapp-zprava';
import { chybejiciKroky } from '@/lib/vstup-pruvodce';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { createProcessStore, type JakPlatby, type RezervaceRecord, type RezervaceStav } from '@/lib/store';
import { APT_IDS, GUIDE_LANGS, LANG_LABELS, type AptId, type GuideLang } from '@/lib/types';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };

function chyba(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status, headers: noStore });
}

function jeJak(v: unknown): JakPlatby | null {
  return v === 'hotove' || v === 'karta' || v === 'prevod' || v === 'cena' ? v : null;
}

function jeDruh(v: unknown): DruhDluhu | 'vse' | null {
  return v === 'vse' || v === 'poplatek' || v === 'prijezd' || v === 'cesta' || v === 'drive' || v === 'pozde' ? v : null;
}

function pridej(rec: RezervaceRecord, co: string, patch: Partial<RezervaceRecord> = {}): RezervaceRecord {
  const cas = new Date().toISOString();
  return {
    ...rec,
    ...patch,
    posledniPokus: cas,
    historie: [...rec.historie, { cas, co }].slice(-40),
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await prehledPrihlasen())) return chyba(401, 'Nepřihlášen.');

  const body = (await request.json().catch(() => null)) as {
    rezervace?: string;
    akce?: string;
    email?: string;
    apartman?: string;
    prijezd?: string;
    odjezd?: string;
    osob?: number;
    jazyk?: string;
    pin?: string;
    cas?: string;
    url?: string;
    cislo?: string;
    ktery?: string;
    pole?: string;
    kdo?: string;
    jak?: string;
    druh?: string;
    ids?: string[];
    castka?: string;
    stav?: string;
    zprava?: string;
    presto?: boolean;
    text?: string;
    dalsiRezervace?: string;
    iDalsimu?: boolean;
    vlakno?: string;
    id?: string;
  } | null;
  if (body?.akce === 'platba-hromadne') {
    const jak = jeJak(body.jak);
    const kdo = body.kdo === 'pravoslav' || body.kdo === 'nikol' ? body.kdo : null;
    const ids = Array.isArray(body.ids) ? body.ids.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean) : [];
    if (!jak || !kdo || !ids.length) return chyba(400, 'Chybí platba.');
    const store = createProcessStore();
    let pocet = 0;
    for (const cislo of ids) {
      const zaznam = await store.getRezervace(cislo);
      if (!zaznam) continue;
      const dalsi = zaplatDruhy(zaznam, ['vse'], jak, kdo);
      if (dalsi === zaznam) continue;
      await store.setRezervace(cislo, dalsi);
      pocet += 1;
    }
    return NextResponse.json({ ok: true, pocet }, { headers: noStore });
  }

  const id = (body?.rezervace || '').trim();
  const akce = body?.akce;
  if (
    !id ||
    (akce !== 'znovu' &&
      akce !== 'opravit' &&
      akce !== 'odkaz' &&
      akce !== 'cas' &&
      akce !== 'cas-odjezdu' &&
      akce !== 'odjezd-dotaz' &&
      akce !== 'pohoda-dotaz' &&
      akce !== 'checkin' &&
      akce !== 'telefon' &&
      akce !== 'predano' &&
      akce !== 'zrusit-predani' &&
      akce !== 'na-miste' &&
      akce !== 'zrusit-na-miste' &&
      akce !== 'priplatek' &&
      akce !== 'uklid' &&
      akce !== 'vratit-uklid' &&
      akce !== 'potvrdit-prijezd' &&
      akce !== 'nelze-prijezd' &&
      akce !== 'potvrdit-odjezd' &&
      akce !== 'nelze-odjezd' &&
      akce !== 'pripraveno-whatsapp' &&
      akce !== 'zaplaceno' &&
      akce !== 'poplatek' &&
      akce !== 'zrusit-zaplaceni' &&
      akce !== 'vyjezd' &&
      akce !== 'vratit-vyjezd' &&
      akce !== 'brana' &&
      akce !== 'odemknout' &&
      akce !== 'email' &&
      akce !== 'whatsapp' &&
      akce !== 'sms' &&
      akce !== 'jazyk' &&
      akce !== 'platba' &&
      akce !== 'vratit-platbu' &&
      akce !== 'prevzato' &&
      akce !== 'vratit-odjezd' &&
      akce !== 'prevzit' &&
      akce !== 'zavady' &&
      akce !== 'zavady-odeslat' &&
      akce !== 'zavady-po-odjezdu' &&
      akce !== 'zavady-po-odjezdu-odeslat' &&
      akce !== 'email-hosta' &&
      akce !== 'prani-odpoved' &&
      akce !== 'prani-precteno' &&
      akce !== 'prani-vyrizeno' &&
      akce !== 'prani-otevrit' &&
      akce !== 'prani-nacti')
  ) {
    return chyba(400, 'Neznámá akce.');
  }

  const store = createProcessStore();
  const rec = await store.getRezervace(id);
  if (!rec) return chyba(404, 'Rezervace v přehledu není.');

  if (akce === 'jazyk') {
    const jazyk = body?.jazyk as GuideLang;
    if (!GUIDE_LANGS.includes(jazyk)) return chyba(400, 'Vyberte jazyk.');
    const stejne = rec.jazyk === jazyk;
    const dalsi = zapisMajitele(
      rec,
      'jazyk',
      { jazyk },
      stejne ? '' : `Jazyk → ${LANG_LABELS[jazyk]}`,
    );
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, jazyk }, { headers: noStore });
  }

  if (akce === 'zavady') {
    const text = normalizujTextZavad(typeof body?.text === 'string' ? body.text : '');
    if (!text) return chyba(400, 'Napište, co není v pořádku.');
    const kdo = jeKdoZavad(body?.kdo) || 'pravoslav';
    const kdy = new Date().toISOString();
    const dalsi = pridej(rec, 'Závady z předání zapsány', {
      zavadyPredani: { text, kdy, kdo, odeslanoKdy: null, potvrzenoKdy: null },
    });
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, zavadyPredani: dalsi.zavadyPredani }, { headers: noStore });
  }

  if (akce === 'zavady-odeslat') {
    const z = rec.zavadyPredani;
    if (!z || !z.text) return chyba(400, 'Nejdřív zapište závady.');
    if (z.odeslanoKdy) return chyba(400, 'E-mail už odešel.');
    const email = (rec.emailHosta || '').trim();
    if (!email) return chyba(400, 'U rezervace chybí e-mail hosta.');
    const odeslanoKdy = new Date().toISOString();
    const lang = rec.jazyk;
    const odkaz = odkazPotvrzeniZavad(id, odeslanoKdy);
    try {
      await posliEmailZpravy({
        to: email,
        subject: predmetEmailuZavad(lang),
        text: textEmailuZavad(lang, z.text),
        lang,
        telefon: false,
        tlacitko: { url: odkaz, label: tlacitkoPotvrditZavady(lang) },
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'E-mail se nepodařilo odeslat.';
      return chyba(502, reason);
    }
    const dalsi = pridej(rec, 'Závady z předání odeslány hostovi', {
      zavadyPredani: { ...z, odeslanoKdy, potvrzenoKdy: null },
    });
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, zavadyPredani: dalsi.zavadyPredani }, { headers: noStore });
  }

  if (akce === 'zavady-po-odjezdu') {
    const text = normalizujTextZavad(typeof body?.text === 'string' ? body.text : '');
    if (!text) return chyba(400, 'Napište, co není v pořádku.');
    const kdo = jeKdoZavad(body?.kdo);
    if (!kdo) return chyba(400, 'Vyberte, kdo zapsal.');
    const kdy = new Date().toISOString();
    const dalsi = pridej(rec, 'Závady po odjezdu zapsány', {
      zavadyPoOdjezdu: { text, kdy, kdo, odeslanoKdy: null },
    });
    await store.setRezervace(id, dalsi);

    const dalsiId = typeof body?.dalsiRezervace === 'string' ? body.dalsiRezervace.trim() : '';
    let zavadyPredaniDalsi: RezervaceRecord['zavadyPredani'] = null;
    if (dalsiId && body?.iDalsimu === true) {
      const dalsiHost = await store.getRezervace(dalsiId);
      if (dalsiHost && !dalsiHost.zavadyPredani) {
        const zapis = pridej(dalsiHost, 'Závady z předání zapsány', {
          zavadyPredani: { text, kdy, kdo, odeslanoKdy: null, potvrzenoKdy: null },
        });
        await store.setRezervace(dalsiId, zapis);
        zavadyPredaniDalsi = zapis.zavadyPredani;
      }
    }

    return NextResponse.json(
      {
        ok: true,
        zavadyPoOdjezdu: dalsi.zavadyPoOdjezdu,
        dalsiRezervace: dalsiId || null,
        zavadyPredaniDalsi,
      },
      { headers: noStore },
    );
  }

  if (akce === 'zavady-po-odjezdu-odeslat') {
    const z = rec.zavadyPoOdjezdu;
    if (!z || !z.text) return chyba(400, 'Nejdřív zapište závady po odjezdu.');
    if (z.odeslanoKdy) return chyba(400, 'E-mail už odešel.');
    const email = (rec.emailHosta || '').trim();
    if (!email) return chyba(400, 'U rezervace chybí e-mail hosta.');
    const odeslanoKdy = new Date().toISOString();
    const lang = rec.jazyk;
    try {
      await posliEmailZpravy({
        to: email,
        subject: predmetEmailuPoOdjezdu(lang),
        text: textEmailuPoOdjezdu(lang, z.text),
        lang,
        telefon: false,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'E-mail se nepodařilo odeslat.';
      return chyba(502, reason);
    }
    const dalsi = pridej(rec, 'Závady po odjezdu odeslány hostovi', {
      zavadyPoOdjezdu: { ...z, odeslanoKdy },
    });
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, zavadyPoOdjezdu: dalsi.zavadyPoOdjezdu }, { headers: noStore });
  }

  if (akce === 'predano') {
    const dalsi = zapisMajitele(rec, 'predano', { predano: new Date().toISOString() }, 'Předáno');
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, predano: dalsi.predano }, { headers: noStore });
  }

  if (akce === 'zrusit-predani') {
    await store.setRezervace(id, zapisMajitele(rec, 'predano', { predano: null }, 'Vráceno předání'));
    return NextResponse.json({ ok: true, predano: null }, { headers: noStore });
  }

  if (akce === 'na-miste') {
    const surovyCas = typeof body?.cas === 'string' ? body.cas.trim() : '';
    const den = rec.prijezd && /^\d{4}-\d{2}-\d{2}$/.test(rec.prijezd) ? rec.prijezd : denPraha(new Date());
    let kdy = new Date().toISOString();
    let popisek = 'Host je na místě';
    if (surovyCas) {
      const hhmm =
        surovyCas === CAS_PO_23 || /^po\s*23/i.test(surovyCas)
          ? '23:30'
          : (CASY_VYBERU as readonly string[]).includes(surovyCas)
            ? surovyCas
            : /^\d{2}:\d{2}$/.test(surovyCas)
              ? surovyCas
              : null;
      if (!hhmm) return chyba(400, 'Neplatný čas příjezdu.');
      const iso = isoPrahaZCasu(den, hhmm);
      if (!iso) return chyba(400, 'Čas příjezdu se nepodařilo uložit.');
      kdy = iso;
      popisek =
        surovyCas === CAS_PO_23 || /^po\s*23/i.test(surovyCas)
          ? 'Skutečný příjezd po 23:00'
          : `Skutečný příjezd ${hhmm}`;
    }
    const dalsi = pridej(rec, popisek, { naMiste: kdy });
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, naMiste: dalsi.naMiste }, { headers: noStore });
  }

  if (akce === 'zrusit-na-miste') {
    const dalsi = pridej(rec, 'Vrácen skutečný příjezd', { naMiste: null });
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, naMiste: null }, { headers: noStore });
  }

  if (akce === 'priplatek') {
    const surovy = (body?.castka || '').trim();
    if (!surovy) {
      const dalsi = zapisMajitele(rec, 'priplatekRucni', { priplatekRucni: null }, 'Příplatek za čas smazán');
      await store.setRezervace(id, dalsi);
      return NextResponse.json({ ok: true, priplatekRucni: null }, { headers: noStore });
    }
    if (!/^\d{1,5}$/.test(surovy)) return chyba(400, 'Částka musí být číslo.');
    const kc = Number(surovy);
    const dalsi = zapisMajitele(rec, 'priplatekRucni', { priplatekRucni: kc }, `Příplatek za čas ${kc} Kč`);
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, priplatekRucni: kc }, { headers: noStore });
  }

  if (akce === 'uklid') {
    const kdo =
      body?.kdo === 'miluska' || body?.kdo === 'pravoslav' || body?.kdo === 'nikol' ? body.kdo : null;
    if (!kdo) return chyba(400, 'Chybí, kdo uklízel.');
    const dalsi = oznacUklid(rec, kdo);
    await store.setRezervace(id, dalsi);
    const vse = (await store.listRezervace()).map((e) => e.record);
    const nabidka = poUklidu(dalsi, vse, new Date());
    if (nabidka.cekajici && nabidka.push) {
      const jak = await upozorniMajitele(store, nabidka.push, `/prehled#${nabidka.cekajici.rezervace}`);
      if (jak !== 'nic') await store.setRezervace(nabidka.cekajici.rezervace, oznacUpozorneno(nabidka.cekajici));
    }
    return NextResponse.json(
      {
        ok: true,
        uklizenoKdy: dalsi.uklizenoKdy,
        uklizenoKdo: dalsi.uklizenoKdo,
        nabidka: nabidka.nabidka,
        odeslanoHostovi: false,
      },
      { headers: noStore },
    );
  }

  if (akce === 'potvrdit-prijezd' || akce === 'potvrdit-odjezd' || akce === 'nelze-prijezd' || akce === 'nelze-odjezd') {
    const druh = akce.endsWith('prijezd') ? 'prijezd' : 'odjezd';
    const vse = (await store.listRezervace()).map((e) => e.record);
    const presto = body?.presto === true;
    const dalsi = akce.startsWith('potvrdit')
      ? aplikujPotvrzeni(rec, druh, vse, new Date(), presto)
      : aplikujNelze(rec, druh, new Date());
    if (!dalsi) {
      if (akce === 'potvrdit-prijezd' && !presto) {
        return chyba(409, 'Apartmán ještě není uklizený. Přesto potvrdit?');
      }
      return chyba(400, 'Teď to nejde potvrdit.');
    }
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  if (akce === 'pripraveno-whatsapp') {
    await store.setRezervace(id, pridej(rec, 'WhatsApp: Apartmán je připravený'));
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  if (akce === 'vratit-uklid') {
    const dalsi = vratUklid(rec);
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  if (akce === 'zaplaceno') {
    const kdo = body?.kdo === 'ja' || body?.kdo === 'nikol' ? body.kdo : null;
    if (!kdo) return chyba(400, 'Chybí, kdo poplatek vybral.');
    const veta = kdo === 'nikol' ? 'Poplatek městu vybrala Nikol' : 'Poplatek městu vybral majitel';
    const dalsi = zapisMajitele(
      rec,
      ['zaplaceno', 'poplatekVybral'],
      { zaplaceno: new Date().toISOString(), poplatekVybral: kdo },
      veta,
    );
    await store.setRezervace(id, dalsi);
    return NextResponse.json(
      { ok: true, zaplaceno: dalsi.zaplaceno, poplatekVybral: dalsi.poplatekVybral },
      { headers: noStore },
    );
  }

  if (akce === 'poplatek') {
    const stav = body?.stav === 'ano' || body?.stav === 'ne' ? body.stav : null;
    if (!stav) return chyba(400, 'Chybí volba poplatku.');
    const veta = stav === 'ano' ? 'Poplatek zvolen: vybírat' : 'Poplatek zvolen: v ceně';
    const dalsi = zapisMajitele(rec, 'poplatek', { poplatek: stav }, veta);
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, poplatek: stav }, { headers: noStore });
  }

  if (akce === 'platba' || akce === 'vratit-platbu') {
    const druh = jeDruh(body?.druh);
    if (!druh) return chyba(400, 'Chybí položka.');
    if (akce === 'vratit-platbu') {
      const dalsi = vratPlatbu(rec, druh);
      await store.setRezervace(id, dalsi);
      return NextResponse.json({ ok: true, platby: dalsi.platby, zaplaceno: dalsi.zaplaceno, dluh: textRozpisu(polozkyZRezervace(dalsi)) }, { headers: noStore });
    }
    const jak = jeJak(body?.jak);
    const kdo = body?.kdo === 'pravoslav' || body?.kdo === 'nikol' ? body.kdo : null;
    if (!jak || !kdo) return chyba(400, 'Chybí způsob platby.');
    const dalsi = zaplatDruhy(rec, [druh], jak, kdo);
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, platby: dalsi.platby, zaplaceno: dalsi.zaplaceno, dluh: textRozpisu(polozkyZRezervace(dalsi)) }, { headers: noStore });
  }

  if (akce === 'prevzato') {
    const dalsi = oznacPrevzeti(rec);
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, prevzatoKdy: dalsi.prevzatoKdy }, { headers: noStore });
  }

  if (akce === 'vratit-odjezd') {
    const dalsi = vratPrevzeti(rec);
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, prevzatoKdy: null }, { headers: noStore });
  }

  if (akce === 'zrusit-zaplaceni') {
    await store.setRezervace(
      id,
      zapisMajitele(rec, ['zaplaceno', 'poplatekVybral'], { zaplaceno: null, poplatekVybral: null, platby: [] }, 'Vrácena platba'),
    );
    return NextResponse.json({ ok: true, zaplaceno: null, poplatekVybral: null }, { headers: noStore });
  }

  if (akce === 'vyjezd') {
    const polozka = novyVyjezd(new Date().toISOString(), VYJEZD_CASTKA);
    const vyjezdy = [...(rec.vyjezdy || []), polozka];
    const dalsi = pridej(rec, `Opakovaný výjezd ${polozka.castka} Kč`, { vyjezdy });
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, vyjezdy: dalsi.vyjezdy }, { headers: noStore });
  }

  if (akce === 'vratit-vyjezd') {
    const posledni = rec.vyjezdy?.[rec.vyjezdy.length - 1];
    if (!posledni) return chyba(400, 'Není co vracet.');
    const vyjezdy = vratPosledniVyjezd(rec.vyjezdy);
    const dalsi = pridej(rec, `Vrácen opakovaný výjezd ${posledni.castka} Kč`, { vyjezdy });
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, vyjezdy: dalsi.vyjezdy }, { headers: noStore });
  }

  if (akce === 'prevzit') {
    const pole = body?.pole || '';
    if (!jeRucniPole(pole)) return chyba(400, 'Neznámé pole.');
    const dalsi = prevzitNavrh(rec, pole);
    if (!dalsi) return chyba(400, 'Není co převzít.');
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  if ((akce === 'znovu' || akce === 'opravit') && rec.stav === 'zruseno') {
    return chyba(400, 'Zrušená rezervace se znovu neposílá.');
  }

  if (akce === 'brana') {
    if (rec.zpusobPrijezdu !== 'auto' || !rec.telefonBrana) return chyba(400, 'Chybí telefon pro bránu.');
    await store.setRezervace(id, pridej(rec, 'Zaregistrováno v bráně', { branaRegistrovano: new Date().toISOString() }));
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  if (akce === 'odemknout') {
    await store.setRezervace(id, pridej(rec, 'Průvodce odemčen', { pruvodceOdemcen: new Date().toISOString() }));
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  if (akce === 'cas') {
    const surovy = (body?.cas || '').trim();
    let cas: string | null;
    if (!surovy) cas = null;
    else if (surovy === 'po20' || /^po\s*20/i.test(surovy)) cas = 'po20';
    else {
      const vysledek = normalizujCasPrijezdu(surovy);
      if (!vysledek.ok) return chyba(400, 'Čas napište jako 1630.');
      cas = vysledek.cas;
    }
    const bylo = rec.casPrijezdu === 'po20' ? 'po 20:00' : rec.casPrijezdu || 'žádný';
    const nove = cas === 'po20' ? 'po 20:00' : cas || 'žádný';
    const dalsi = zapisMajitele(
      rec,
      'casPrijezdu',
      { casPrijezdu: cas, casZadalHost: false },
      bylo === nove ? '' : `Čas příjezdu ${bylo} → ${nove}`,
    );
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, hodnota: nove === 'žádný' ? '' : nove }, { headers: noStore });
  }

  if (akce === 'cas-odjezdu') {
    const surovy = (body?.cas || '').trim();
    let cas: string | null;
    if (!surovy) cas = null;
    else {
      const vysledek = normalizujCasPrijezdu(surovy);
      if (!vysledek.ok || vysledek.cas === 'po20') return chyba(400, 'Čas napište jako 0930.');
      cas = vysledek.cas;
    }
    const bylo = rec.casOdjezdu || 'žádný';
    const nove = cas || 'žádný';
    if (!cas) {
      const bez = (rec.rucniZnacky || []).filter((z) => z.pole !== 'casOdjezdu');
      const dalsi = pridej(rec, bylo === 'žádný' ? '' : `Čas odjezdu ${bylo} → žádný`, {
        casOdjezdu: null,
        casOdjezduZadalHost: false,
        zadostOdjezd: null,
        rucniZnacky: bez,
      });
      if (bylo === 'žádný') dalsi.historie = rec.historie;
      await store.setRezervace(id, dalsi);
      return NextResponse.json({ ok: true, hodnota: '' }, { headers: noStore });
    }
    const kc = cenaPozde(cas);
    const now = new Date().toISOString();
    const veta =
      bylo === nove
        ? ''
        : kc
          ? `Čas odjezdu ${bylo} → ${nove} (+${kc} Kč)`
          : `Čas odjezdu ${bylo} → ${nove}`;
    const dalsi = zapisMajitele(
      rec,
      'casOdjezdu',
      {
        casOdjezdu: cas,
        casOdjezduZadalHost: false,
        zadostOdjezd: kc
          ? {
              cas,
              kc,
              stav: 'potvrzeno',
              kdy: now,
              od: 'pruvodce',
              hned: true,
              upozorneno: false,
            }
          : null,
      },
      veta,
    );
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, hodnota: nove }, { headers: noStore });
  }

  if (akce === 'odjezd-dotaz') {
    if (rec.odjezdDotaz) return NextResponse.json({ ok: true, cas: rec.odjezdDotaz }, { headers: noStore });
    const dalsi = pridej(rec, 'Dotaz na odjezd na WhatsApp', { odjezdDotaz: new Date().toISOString() });
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, cas: dalsi.odjezdDotaz }, { headers: noStore });
  }

  if (akce === 'pohoda-dotaz') {
    const ted = new Date().toISOString();
    const veta = rec.pohodaDotaz ? 'Je vše v pořádku? znovu na WhatsApp' : 'Je vše v pořádku? na WhatsApp';
    const dalsi = pridej(rec, veta, { pohodaDotaz: ted });
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, cas: dalsi.pohodaDotaz }, { headers: noStore });
  }

  if (akce === 'checkin') {
    const vysledek = zkontrolujCheckinOdkaz(body?.url || '');
    if (!vysledek.ok) return chyba(400, 'Odkaz musí začínat https://.');
    const stejne = (rec.checkinUrl || '') === (vysledek.url || '');
    await store.setRezervace(
      id,
      zapisMajitele(rec, 'checkinUrl', { checkinUrl: vysledek.url }, stejne ? '' : 'Odkaz na check-in uložen'),
    );
    return NextResponse.json({ ok: true, hodnota: vysledek.url || '' }, { headers: noStore });
  }

  if (akce === 'email-hosta') {
    const email = (body?.email || '').trim();
    if (problemEmailu(email)) return chyba(400, 'E-mail má špatný tvar.');
    await store.setRezervace(
      id,
      zapisMajitele(rec, 'emailHosta', { emailHosta: email }, 'E-mail z minula'),
    );
    return NextResponse.json({ ok: true, hodnota: email }, { headers: noStore });
  }

  if (akce === 'telefon') {
    const ktery = body?.ktery;
    if (ktery !== 'checkin' && ktery !== 'rezervace') return chyba(400, 'Neznámé číslo.');
    const tel = normalizujTelefon(body?.cislo || '', rec.narodnost);
    if (!tel) return chyba(400, 'Napište číslo.');
    const pole = ktery === 'rezervace' ? 'telefonRezervace' : 'telefon';
    const stare = ktery === 'rezervace' ? rec.telefonRezervace : rec.telefon;
    const patch: Partial<RezervaceRecord> =
      ktery === 'rezervace'
        ? { telefonRezervace: tel.ulozeny, telefonRezervaceWa: tel.wa }
        : { telefon: tel.ulozeny, telefonWa: tel.wa };
    if (!rec.narodnost && !maRucni(rec, 'jazyk')) {
      const proJazyk = ktery === 'rezervace' ? tel.ulozeny : rec.telefonRezervace || tel.ulozeny;
      patch.jazyk = jazykZPredvolby(proJazyk);
    }
    const textStary = stare ? textTelefonu(stare) : 'žádné';
    const textNovy = textTelefonu(tel.ulozeny);
    await store.setRezervace(
      id,
      zapisMajitele(rec, pole, patch, textStary === textNovy ? '' : `Telefon ${textStary} → ${textNovy}`),
    );
    return NextResponse.json({ ok: true, nejisty: tel.nejisty, hodnota: textNovy }, { headers: noStore });
  }

  if (akce === 'email' || akce === 'whatsapp' || akce === 'sms') {
    const druhy: DruhZpravy[] = [
      'checkin',
      'checkinNedojezd',
      'neotevrel',
      'nerozbalen',
      'denNerozbalen',
      'pruvodce3',
      'denCas',
      'doklady',
      'brana',
      'nedojezd',
      'odjezd',
      'pohoda',
      'pripraveno',
    ];
    const druh = druhy.find((id) => id === body?.zprava);
    if (!druh) return chyba(400, 'Vyberte zprávu.');
    const kroky = chybejiciKroky({
      cas: rec.casPrijezdu,
      zpusob: rec.zpusobPrijezdu,
      telefonBrana: rec.telefonBrana,
      spz: rec.spz,
      spzPujcene: Boolean(rec.spzPujcene),
      souhlas: Boolean(rec.souhlasPravidel),
    });
    let odkaz: string | null = null;
    try {
      odkaz = odkazNaPruvodce(rec);
    } catch {
      odkaz = null;
    }
    const langBody = body?.jazyk as GuideLang | undefined;
    const lang = langBody && GUIDE_LANGS.includes(langBody) ? langBody : rec.jazyk;
    const zprava = zpravyMenu({
      stav: rec.stav,
      lang,
      zdroj: rec.zdroj,
      pruvodce: odkaz,
      checkinUrl: rec.checkinUrl,
      otevrenoPocet: rec.otevrenoPocet,
      casPrijezdu: rec.casPrijezdu,
      prijezd: rec.prijezd,
      dnes: denPraha(new Date()),
      chybi: kroky,
      zpusob: rec.zpusobPrijezdu,
      souhlas: Boolean(rec.souhlasPravidel),
      naMiste: Boolean(rec.naMiste),
      predano: rec.predano || '',
      odjezd: rec.odjezd,
      casOdjezdu: rec.casOdjezdu,
      dluh: polozkyZRezervace(rec),
      branaChybi: rec.zpusobPrijezdu === 'auto' && (!rec.telefonBrana || (!rec.spz && !rec.spzPujcene)),
      pripraveno: druh === 'pripraveno',
      historie: rec.historie,
      narodnost: rec.narodnost,
    }).find((z) => z.id === druh);
    if (!zprava) return chyba(400, 'Tahle zpráva teď nejde poslat.');
    const patch =
      druh === 'odjezd'
        ? { odjezdDotaz: new Date().toISOString() }
        : druh === 'pohoda'
          ? { pohodaDotaz: new Date().toISOString() }
          : {};
    const sJazykem =
      lang && lang !== rec.jazyk
        ? zapisMajitele(rec, 'jazyk', { jazyk: lang }, `Jazyk → ${LANG_LABELS[lang]}`)
        : rec;
    if (akce === 'whatsapp' || akce === 'sms') {
      const prefix = akce === 'sms' ? 'SMS' : 'WhatsApp';
      await store.setRezervace(id, pridej(sJazykem, `${prefix}: ${zprava.nazev}`, patch));
      return NextResponse.json({ ok: true, nazev: zprava.nazev }, { headers: noStore });
    }
    const komu = (rec.emailHosta || '').trim();
    if (!komu || problemEmailu(komu)) return chyba(400, 'Host nemá e-mail.');
    try {
      await posliEmailZpravy({
        to: komu,
        subject: druh === 'pripraveno' ? predmetPripraveno(lang) : predmetZpravy(druh, lang, druh === 'odjezd' ? rec.odjezd : rec.prijezd),
        text: zprava.text,
        lang,
        telefon: druh !== 'odjezd' && druh !== 'pripraveno' && druh !== 'pohoda',
      });
    } catch {
      return chyba(502, 'E-mail se nepodařilo odeslat.');
    }
    await store.setRezervace(id, pridej(sJazykem, `E-mailem: ${zprava.nazev}`, patch));
    return NextResponse.json({ ok: true, nazev: zprava.nazev }, { headers: noStore });
  }

  if (akce === 'odkaz') {
    const url = odkazNaPruvodce(rec);
    if (!url) return chyba(400, 'Chybí apartmán, datum nebo jazyk.');
    await store.setRezervace(id, pridej(rec, 'Zkopírován odkaz na průvodce'));
    return NextResponse.json({ ok: true, url }, { headers: noStore });
  }

  if (akce === 'prani-nacti') {
    const data = await store.listPrani(id);
    return NextResponse.json(
      { ok: true, vlakna: Object.values(data.vlakna), zpravy: data.zpravy },
      { headers: noStore },
    );
  }

  if (
    akce === 'prani-odpoved' ||
    akce === 'prani-precteno' ||
    akce === 'prani-vyrizeno' ||
    akce === 'prani-otevrit'
  ) {
    const vlakno = typeof body?.vlakno === 'string' ? body.vlakno.trim() : '';
    const kdo = jeKdoPrani(body?.kdo);
    if (!vlakno || !kdo) return chyba(400, 'Chybí údaje k přání.');
    if (akce === 'prani-odpoved') {
      const vysledek = await adminOdpovedPrani(store, rec, {
        vlakno,
        id: typeof body?.id === 'string' ? body.id : '',
        text: typeof body?.text === 'string' ? body.text : '',
        kdo,
      });
      if (!vysledek.ok) return chyba(vysledek.duvod === 'nenalezeno' ? 404 : 400, vysledek.duvod);
      return NextResponse.json({ ok: true, uz: Boolean(vysledek.uz) }, { headers: noStore });
    }
    if (akce === 'prani-precteno') {
      const vysledek = await adminPrectenoPrani(store, rec, { vlakno, kdo });
      if (!vysledek.ok) return chyba(404, vysledek.duvod);
      return NextResponse.json({ ok: true }, { headers: noStore });
    }
    if (akce === 'prani-vyrizeno') {
      const vysledek = await adminVyrizenoPrani(store, rec, { vlakno, kdo });
      if (!vysledek.ok) return chyba(404, vysledek.duvod);
      return NextResponse.json({ ok: true }, { headers: noStore });
    }
    const vysledek = await adminOtevritPrani(store, rec, { vlakno, kdo });
    if (!vysledek.ok) return chyba(404, vysledek.duvod);
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  let pracovni = rec;
  if (akce === 'znovu') {
    const jazyk = (body?.jazyk || rec.jazyk) as GuideLang;
    if (!GUIDE_LANGS.includes(jazyk)) return chyba(400, 'Vyberte jazyk.');
    pracovni = { ...rec, jazyk };
  }
  if (akce === 'opravit') {
    const email = (body?.email || '').trim();
    if (problemEmailu(email)) return chyba(400, 'E-mail má špatný tvar. Nic jsem neopravil.');
    const apartman = (body?.apartman || '').toUpperCase() as AptId;
    if (!APT_IDS.includes(apartman)) return chyba(400, 'Vyberte apartmán.');
    const prijezd = (body?.prijezd || '').trim();
    const odjezd = (body?.odjezd || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(prijezd) || !/^\d{4}-\d{2}-\d{2}$/.test(odjezd)) {
      return chyba(400, 'Datum je ve špatném tvaru.');
    }
    const noci = nightsBetween(prijezd, odjezd);
    if (noci == null) return chyba(400, 'Odjezd musí být po příjezdu.');
    const osob = Number(body?.osob);
    if (!Number.isFinite(osob) || osob < 1) return chyba(400, 'Doplňte počet osob.');
    const jazyk = body?.jazyk as GuideLang;
    if (!GUIDE_LANGS.includes(jazyk)) return chyba(400, 'Vyberte jazyk.');
    const pin = (body?.pin || '').trim();
    if (!pin) return chyba(400, duvod('chybi_pin').veta);

    pracovni = zapisMajitele(
      rec,
      ['emailHosta', 'apartman', 'prijezd', 'odjezd', 'noci', 'osob', 'jazyk', 'accessPin'],
      {
        emailHosta: email,
        apartman,
        prijezd,
        odjezd,
        noci,
        osob: Math.floor(osob),
        jazyk,
        accessPin: pin,
        duvody: [],
      },
      'Údaje opraveny',
    );
  }

  if (!pracovni.accessPin) return chyba(400, duvod('chybi_pin').veta);
  if (!pracovni.emailHosta || !pracovni.apartman || !pracovni.prijezd || !pracovni.odjezd || !pracovni.jazyk) {
    return chyba(400, 'Chybí údaje. Použijte Opravit a odeslat.');
  }

  try {
    const sent = await posliPruvodce(pracovni, pracovni.krestni);
    const vyhrady = pracovni.duvody.filter((d) => jeVyhrada(d.kod));
    const stav: RezervaceStav = vyhrady.length ? 'odeslano_s_vyhradou' : 'odeslano';
    const hotovo = pridej(pracovni, akce === 'opravit' ? 'Opraveno a odesláno' : `Odesláno znovu v jazyce ${LANG_LABELS[pracovni.jazyk!]}`, {
      stav,
      jazyk: pracovni.jazyk,
      duvody: vyhrady,
      odeslaneMessageId: sent.messageId || pracovni.odeslaneMessageId,
      smtpPokusy: 0,
    });
    await store.setRezervace(id, hotovo);
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch {
    // Ruční pokus nemá strop „ze 3“ (ten platí jen u automatu). Majitel může kliknout znovu.
    const selhalo = pridej(pracovni, 'Ruční odeslání selhalo. Můžete to zkusit znovu.', {
      stav: 'neodeslano',
      smtpPokusy: 0,
    });
    await store.setRezervace(id, selhalo);
    return chyba(502, 'E-mail se nepodařilo odeslat. Zkuste to znovu.');
  }
}
