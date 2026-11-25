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
import { posliEmailDokladu } from '@/lib/email-doklad';
import {
  textDokladuHostovi,
  urlDokladu,
  vytvorDokladToken,
  zakladUrlZEnv,
} from '@/lib/doklad-odkaz';
import { sestavHtmlDokladu } from '@/lib/doklad-sestav';
import {
  normalizujZpusobUhrady,
  type JazykDokladu,
  type OdberatelDokladu,
  type TypDokladu,
} from '@/lib/faktura-doklad';
import { odkazNaPruvodce, posliPruvodce } from '@/lib/posli-pruvodce';
import { upozorniPoOdeslaniPruvodce } from '@/lib/pruvodce-wa';
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
  poZmeneCasuOdjezdu,
  poZmeneCasuPrijezdu,
  predmetPripraveno,
} from '@/lib/okno-pobytu';
import {
  nastavIndividualniPozdni,
  odmitniZadostPozdni,
  potvrdZadostPozdni,
} from '@/lib/zadost-pozni-prijezd';
import { upozorniMajitele, upozorniUklid } from '@/lib/upozorneni';
import { polozkyZRezervace, textRozpisu, type DruhDluhu } from '@/lib/odjezd';
import { polePoCasuOdjezdu } from '@/lib/odjezd-potvrzeni';
import { upravitPlatbuDruhu, vratPlatbu, zaplatCastku, zaplatDruhy } from '@/lib/platby-hosta';
import { oznacPrevzeti, vratPrevzeti } from '@/lib/zalozky';
import {
  adminOdpovedPrani,
  adminOtevritPrani,
  adminPrectenoPrani,
  adminVyrizenoPrani,
  jeKdoPrani,
} from '@/lib/prani';
import { odkazPraniVPruvodci, textWhatsAppPraniOdpoved } from '@/lib/prani-texty';
import {
  dotazAres,
  fakturaProNovyPobyt,
  maUdajeFirmy,
  nactiFakturu,
  sestavFakturu,
  type FakturaVstup,
} from '@/lib/faktura';
import { FAKTURA_MAJITEL } from '@/lib/faktura-texty';
import { zpravyMenu, type DruhZpravy } from '@/lib/whatsapp-zprava';
import { chybejiciKroky } from '@/lib/vstup-pruvodce';
import { prehledPrihlasen } from '@/lib/prehled-session';
import {
  listOtevrenaDoporuceni,
  najdiNeboVytvorOsobu,
  nactiOsobu,
  sparujRucne,
  spojOsoby,
} from '@/lib/doporuceni';
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
  return v === 'vse' ||
    v === 'poplatek' ||
    v === 'prijezd' ||
    v === 'cesta' ||
    v === 'drive' ||
    v === 'pozde' ||
    v === 'dohoda'
    ? v
    : null;
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
    kc?: string | number;
    url?: string;
    cislo?: string;
    ktery?: string;
    pole?: string;
    kdo?: string;
    jak?: string;
    druh?: string;
    ids?: string[];
    castka?: string | number;
    stav?: string;
    zprava?: string;
    presto?: boolean;
    text?: string;
    dalsiRezervace?: string;
    iDalsimu?: boolean;
    vlakno?: string;
    id?: string;
    ico?: string;
    faktura?: FakturaVstup;
    typ?: string;
    odberatel?: string;
    lang?: string;
    origin?: string;
    vystaveno?: string;
    splatnost?: string;
    bezHosta?: boolean;
    bezEmailu?: boolean;
    bezPoznamky?: boolean;
    poznamkaDokladu?: string;
    poznamka?: string;
    zpusobUhrady?: string;
    kanal?: string;
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
      akce !== 'den-odjezdu' &&
      akce !== 'den-prijezdu' &&
      akce !== 'pin' &&
      akce !== 'dohoda' &&
      akce !== 'uz-zaplaceno' &&
      akce !== 'odjezd-dotaz' &&
      akce !== 'pohoda-dotaz' &&
      akce !== 'podekovani-odeslat' &&
      akce !== 'podekovani-vratit' &&
      akce !== 'shrnuti-odeslat' &&
      akce !== 'shrnuti-vratit' &&
      akce !== 'shrnuti-rucne' &&
      akce !== 'shrnuti-neposilat' &&
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
      akce !== 'potvrdit-pozni-prijezd' &&
      akce !== 'nelze-pozni-prijezd' &&
      akce !== 'individualni-pozni-prijezd' &&
      akce !== 'pripraveno-whatsapp' &&
      akce !== 'zaplaceno' &&
      akce !== 'poplatek' &&
      akce !== 'zrusit-zaplaceni' &&
      akce !== 'vyjezd' &&
      akce !== 'vratit-vyjezd' &&
      akce !== 'brana' &&
      akce !== 'potvrzeni-prijezdu' &&
      akce !== 'zrusit-potvrzeni-prijezdu' &&
      akce !== 'potvrzeni-odjezdu' &&
      akce !== 'zrusit-potvrzeni-odjezdu' &&
      akce !== 'odemknout' &&
      akce !== 'email' &&
      akce !== 'whatsapp' &&
      akce !== 'sms' &&
      akce !== 'jazyk' &&
      akce !== 'platba' &&
      akce !== 'vratit-platbu' &&
      akce !== 'upravit-platbu' &&
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
      akce !== 'prani-nacti' &&
      akce !== 'prani-whatsapp' &&
      akce !== 'faktura-ulozit' &&
      akce !== 'faktura-prebirat' &&
      akce !== 'faktura-doklad-volby' &&
      akce !== 'faktura-poznamka' &&
      akce !== 'faktura-hotovo' &&
      akce !== 'faktura-vratit' &&
      akce !== 'faktura-smazat' &&
      akce !== 'faktura-ares' &&
      akce !== 'faktura-whatsapp' &&
      akce !== 'faktura-doklad-email' &&
      akce !== 'faktura-doklad-whatsapp' &&
      akce !== 'cena-pobytu' &&
      akce !== 'poznamka-uklid' &&
      akce !== 'checkin-neni' &&
      akce !== 'bez-marketingu' &&
      akce !== 'nedojezd' &&
      akce !== 'zrusit-nedojezd' &&
      akce !== 'mena' &&
      akce !== 'doporuceni-spojit' &&
      akce !== 'doporuceni-priradit' &&
      akce !== 'doporuceni-seznam')
  ) {
    return chyba(400, 'Neznámá akce.');
  }

  const store = createProcessStore();
  const rec = await store.getRezervace(id);
  if (!rec) return chyba(404, 'Rezervace v přehledu není.');

  if (akce === 'doporuceni-seznam') {
    const list = await listOtevrenaDoporuceni(store, { dnu: 90 });
    const polozky = [];
    for (const d of list) {
      const kdo = d.doporucitelOsobaId ? await nactiOsobu(store, d.doporucitelOsobaId) : null;
      polozky.push({
        id: d.id,
        jmeno: d.jmeno,
        termin: d.termin,
        doporucil: kdo?.jmeno || d.kod,
      });
    }
    return NextResponse.json({ ok: true, polozky }, { headers: noStore });
  }

  if (akce === 'doporuceni-spojit') {
    const jineId = (body?.dalsiRezervace || '').trim();
    if (!jineId || jineId === id) return chyba(400, 'Zadejte číslo druhé rezervace.');
    const jina = await store.getRezervace(jineId);
    if (!jina) return chyba(404, 'Druhá rezervace není v přehledu.');
    const { nactiOsobaIdRezervace, ulozVazbyRezervace } = await import('@/lib/doporuceni');
    const a = await najdiNeboVytvorOsobu(store, {
      rezervaceId: id,
      jmeno: rec.jmeno,
      telefon: rec.telefon || rec.telefonRezervace,
      email: rec.emailHosta,
      narodnost: rec.narodnost,
      osobaId: await nactiOsobaIdRezervace(store, id, rec),
    });
    const b = await najdiNeboVytvorOsobu(store, {
      rezervaceId: jineId,
      jmeno: jina.jmeno,
      telefon: jina.telefon || jina.telefonRezervace,
      email: jina.emailHosta,
      narodnost: jina.narodnost,
      osobaId: await nactiOsobaIdRezervace(store, jineId, jina),
    });
    if (a.id === b.id) {
      await ulozVazbyRezervace(store, id, { osobaId: a.id }, { rec });
      await ulozVazbyRezervace(store, jineId, { osobaId: a.id }, { rec: jina });
      return NextResponse.json({ ok: true, osobaId: a.id }, { headers: noStore });
    }
    const sloucená = await spojOsoby(store, a.id, b.id);
    if (!sloucená) return chyba(500, 'Spojení se nepovedlo.');
    await ulozVazbyRezervace(
      store,
      id,
      { osobaId: sloucená.id },
      { historie: `Spojeno s #${jineId}`, rec },
    );
    const jina2 = await store.getRezervace(jineId);
    if (jina2) {
      await ulozVazbyRezervace(
        store,
        jineId,
        { osobaId: sloucená.id },
        { historie: `Spojeno s #${id}`, rec: jina2 },
      );
    }
    return NextResponse.json({ ok: true, osobaId: sloucená.id, kod: sloucená.kod }, { headers: noStore });
  }

  if (akce === 'doporuceni-priradit') {
    const dopId = (body?.id || '').trim();
    if (!dopId) return chyba(400, 'Chybí doporučení.');
    const vysledek = await sparujRucne(store, dopId, id);
    if (!vysledek.ok) return chyba(400, 'Spárování se nepovedlo.');
    const kdo = vysledek.doporucitel?.jmeno || 'doporučitele';
    const host = rec.jmeno || rec.krestni || 'Host';
    await upozorniMajitele(
      store,
      `${host} spárován s doporučením od ${kdo}. Kredit vznikne po předání.`,
      '/prehled',
      { telegram: 'zadost' },
    );
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

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

  if (akce === 'checkin-neni') {
    const zapnout = body?.stav !== 'ne';
    const patch: Partial<typeof rec> = { checkinNeniPotreba: zapnout };
    /** Přímý host: pryč z „čeká check-in“. Když už má průvodce, stav odesláno. */
    if (zapnout && rec.stav === 'bez_checkinu') {
      const uzPruvodce =
        Boolean(rec.odeslaneMessageId) ||
        (rec.otevrenoPocet ?? 0) > 0 ||
        rec.historie.some((h) => /odesláno|Odesláno/i.test(h.co));
      patch.stav = uzPruvodce
        ? rec.duvody.some((d) => jeVyhrada(d.kod))
          ? 'odeslano_s_vyhradou'
          : 'odeslano'
        : 'neodeslano';
    } else if (!zapnout && rec.checkinNeniPotreba) {
      patch.stav = 'bez_checkinu';
    }
    const dalsi = pridej(
      rec,
      zapnout ? 'Check-in se nečeká' : 'Check-in se zase čeká',
      patch,
    );
    await store.setRezervace(id, dalsi);
    return NextResponse.json(
      { ok: true, checkinNeniPotreba: zapnout, stav: dalsi.stav },
      { headers: noStore },
    );
  }

  if (akce === 'bez-marketingu') {
    const zapnout = body?.stav !== 'ne';
    const dalsi = pridej(
      rec,
      zapnout ? 'Nechce e-maily' : 'E-maily zase ano',
      { bezMarketingu: zapnout },
    );
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, bezMarketingu: zapnout }, { headers: noStore });
  }

  if (akce === 'nedojezd') {
    if (rec.nedojezdKdy) {
      return NextResponse.json({ ok: true, nedojezdKdy: rec.nedojezdKdy }, { headers: noStore });
    }
    if (rec.predano) return chyba(400, 'U předaného hosta nedojezd nejde.');
    const kdy = new Date().toISOString();
    const dalsi = pridej(rec, 'Nedojezd', { nedojezdKdy: kdy, casOdjezduPushCeka: null });
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, nedojezdKdy: kdy }, { headers: noStore });
  }

  if (akce === 'zrusit-nedojezd') {
    if (!rec.nedojezdKdy) {
      return NextResponse.json({ ok: true, nedojezdKdy: null }, { headers: noStore });
    }
    const dalsi = pridej(rec, 'Nedojezd zrušen', { nedojezdKdy: null });
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, nedojezdKdy: null }, { headers: noStore });
  }

  if (akce === 'mena') {
    const mena = body?.stav === 'EUR' ? 'EUR' : 'CZK';
    const dalsi = pridej(rec, mena === 'EUR' ? 'Platby v eurech' : 'Platby v korunách', { mena });
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, mena }, { headers: noStore });
  }

  if (akce === 'cena-pobytu') {
    const surovy = typeof body?.castka === 'string' || typeof body?.castka === 'number' ? String(body.castka) : '';
    const castka = Math.round(Number(surovy.replace(/\s+/g, '').replace(',', '.')) * 100) / 100;
    if (!Number.isFinite(castka) || castka <= 0) return chyba(400, 'Zadejte částku pobytu.');
    const dalsi = zapisMajitele(rec, 'cenaPobytu', { cenaPobytu: castka }, `Cena pobytu ${castka}`);
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, cenaPobytu: dalsi.cenaPobytu }, { headers: noStore });
  }

  if (akce === 'poznamka-uklid') {
    const text = typeof body?.text === 'string' ? body.text.trim().slice(0, 500) : '';
    const stejne = (rec.poznamkaUklid || '') === text;
    const dalsi = zapisMajitele(
      rec,
      'poznamkaUklid',
      { poznamkaUklid: text || null },
      stejne ? '' : text ? 'Poznámka pro úklid uložena' : 'Poznámka pro úklid smazána',
    );
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, poznamkaUklid: dalsi.poznamkaUklid }, { headers: noStore });
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
    const surovy = String(body?.castka ?? '').trim();
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
      const jak = await upozorniMajitele(
        store,
        nabidka.push,
        `/prehled#${nabidka.cekajici.rezervace}?zprava=pripraveno`,
        { telegram: 'uklizeno' },
      );
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
    let dalsi = akce.startsWith('potvrdit')
      ? aplikujPotvrzeni(rec, druh, vse, new Date(), presto)
      : aplikujNelze(rec, druh, new Date());
    if (!dalsi) {
      if (akce === 'potvrdit-prijezd' && !presto) {
        return chyba(409, 'Apartmán ještě není uklizený. Přesto potvrdit?');
      }
      return chyba(400, 'Teď to nejde potvrdit.');
    }
    /** U odjezdu jde Osobně/Sami hned s potvrzením času (Domů i karta). */
    const rozlouceni =
      akce === 'potvrdit-odjezd' && (body?.druh === 'osobne' || body?.druh === 'telefon')
        ? (body.druh as 'osobne' | 'telefon')
        : null;
    if (rozlouceni && dalsi.casOdjezdu) {
      const ted = new Date().toISOString();
      const popisek = rozlouceni === 'osobne' ? 'Osobně se rozloučíme' : 'Sami · jsme na telefonu';
      dalsi = pridej(dalsi, `Potvrzení odjezdu: ${popisek}`, {
        potvrzeniOdjezdu: rozlouceni,
        potvrzeniOdjezduKdy: ted,
        zpravaOdjezdPrectena: null,
        zpravaOdjezdPrijatiPrectena: dalsi.zpravaOdjezdPrijatiPrectena || ted,
      });
    }
    await store.setRezervace(id, dalsi);
    if (akce === 'potvrdit-odjezd') {
      const z = dalsi.zadostOdjezd;
      const kanal = z?.kanal === 'whatsapp' || z?.kanal === 'sms' || z?.kanal === 'pruvodce' ? z.kanal : null;
      return NextResponse.json(
        {
          ok: true,
          potvrzeniOdjezdu: dalsi.potvrzeniOdjezdu,
          potvrzeniOdjezduKdy: dalsi.potvrzeniOdjezduKdy,
          odjezdSchvaleno: z
            ? {
                cas: z.cas,
                kc: z.kc,
                kanal,
                jazyk: dalsi.jazyk,
                telefonWa: dalsi.telefonWa,
                telefon: dalsi.telefon || dalsi.telefonBrana,
              }
            : null,
        },
        { headers: noStore },
      );
    }
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  if (akce === 'potvrdit-pozni-prijezd') {
    const vysledek = potvrdZadostPozdni(rec);
    if (!vysledek) return chyba(400, 'Žádost o pozdní příjezd teď nejde potvrdit.');
    const cas = new Date().toISOString();
    await store.setRezervace(id, {
      ...rec,
      ...vysledek.patch,
      historie: [...rec.historie, { cas, co: vysledek.historie }].slice(-40),
    });
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  if (akce === 'nelze-pozni-prijezd') {
    const zprava = String(body?.zprava ?? '').trim();
    if (!zprava) return chyba(400, 'Napište hostovi, proč to nejde nebo jaký čas nabízíte.');
    const vysledek = odmitniZadostPozdni(rec, zprava);
    if (!vysledek) return chyba(400, 'Žádost o pozdní příjezd teď nejde odmítnout.');
    const cas = new Date().toISOString();
    await store.setRezervace(id, {
      ...rec,
      ...vysledek.patch,
      historie: [...rec.historie, { cas, co: vysledek.historie }].slice(-40),
    });
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  if (akce === 'individualni-pozni-prijezd') {
    const casHosta = String(body?.cas ?? '').trim();
    const kc = Math.round(Number(String(body?.kc ?? '').trim().replace(',', '.')));
    const vysledek = nastavIndividualniPozdni(rec, casHosta, kc);
    if (!vysledek) return chyba(400, 'Zadejte platný čas a částku v Kč (i 0).');
    const ted = new Date().toISOString();
    await store.setRezervace(id, {
      ...rec,
      ...vysledek.patch,
      historie: [...rec.historie, { cas: ted, co: vysledek.historie }].slice(-40),
    });
    return NextResponse.json({ ok: true, cas: casHosta, kc }, { headers: noStore });
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

  if (akce === 'uz-zaplaceno') {
    const surovy = String(body?.castka ?? '').trim().replace(',', '.');
    const kc = Math.round(Number(surovy));
    if (!Number.isFinite(kc) || kc < 1 || kc > 100_000) return chyba(400, 'Napište částku v Kč.');
    const jak = jeJak(body?.jak) || 'prevod';
    const kdo = body?.kdo === 'nikol' ? 'nikol' : 'pravoslav';
    const poznamka = String(body?.text ?? '').trim().slice(0, 200);
    const pred = polozkyZRezervace(rec);
    if (!pred.length) return chyba(400, 'Teď není co započítat.');
    const dalsi = zaplatCastku(rec, kc, jak, kdo, poznamka || null);
    if (dalsi === rec) return chyba(400, 'Teď není co započítat.');
    await store.setRezervace(id, dalsi);
    return NextResponse.json(
      {
        ok: true,
        platby: dalsi.platby,
        zaplaceno: dalsi.zaplaceno,
        dluh: textRozpisu(polozkyZRezervace(dalsi)),
        dluhPolozky: polozkyZRezervace(dalsi),
      },
      { headers: noStore },
    );
  }

  if (akce === 'platba' || akce === 'vratit-platbu' || akce === 'upravit-platbu') {
    const druh = jeDruh(body?.druh);
    if (!druh) return chyba(400, 'Chybí položka.');
    if (akce === 'vratit-platbu') {
      const dalsi = vratPlatbu(rec, druh);
      await store.setRezervace(id, dalsi);
      return NextResponse.json({ ok: true, platby: dalsi.platby, zaplaceno: dalsi.zaplaceno, dluh: textRozpisu(polozkyZRezervace(dalsi)) }, { headers: noStore });
    }
    if (akce === 'upravit-platbu') {
      if (druh === 'vse') return chyba(400, 'Chybí položka.');
      const surovy = String(body?.castka ?? '').trim().replace(',', '.');
      const kc = Math.round(Number(surovy));
      if (!Number.isFinite(kc) || kc < 0 || kc > 100_000) return chyba(400, 'Napište částku v Kč.');
      const dalsi = upravitPlatbuDruhu(rec, druh, kc);
      await store.setRezervace(id, dalsi);
      return NextResponse.json(
        { ok: true, platby: dalsi.platby, zaplaceno: dalsi.zaplaceno, dluh: textRozpisu(polozkyZRezervace(dalsi)) },
        { headers: noStore },
      );
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
    const apt = dalsi.apartman || 'Apartmán';
    try {
      await upozorniUklid(store, `${apt} převzato, můžete uklízet`, '/uklid');
    } catch {
      /* upozornění úklidu nesmí shodit převzetí */
    }
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
    const ted = new Date().toISOString();
    await store.setRezervace(
      id,
      pridej(rec, 'Zaregistrováno v bráně', {
        branaRegistrovano: ted,
        zpravaBranaOdeslana: ted,
        zpravaBranaPrectena: null,
      }),
    );
    return NextResponse.json({ ok: true, branaRegistrovano: ted, zpravaBranaOdeslana: ted }, { headers: noStore });
  }

  if (akce === 'potvrzeni-prijezdu') {
    const druh = body?.druh === 'osobne' || body?.druh === 'telefon' ? body.druh : null;
    if (!druh) return chyba(400, 'Vyberte Osobně nebo Telefon.');
    if (!rec.casPrijezdu) return chyba(400, 'Nejdřív musí být čas příjezdu.');
    const ted = new Date().toISOString();
    const popisek = druh === 'osobne' ? 'Osobně ubytujeme' : 'Jsme na telefonu';
    await store.setRezervace(
      id,
      pridej(rec, `Potvrzení příjezdu: ${popisek}`, {
        potvrzeniPrijezdu: druh,
        potvrzeniPrijezduKdy: ted,
        zpravaCasPrectena: null,
      }),
    );
    return NextResponse.json(
      { ok: true, potvrzeniPrijezdu: druh, potvrzeniPrijezduKdy: ted },
      { headers: noStore },
    );
  }

  if (akce === 'zrusit-potvrzeni-prijezdu') {
    await store.setRezervace(
      id,
      pridej(rec, 'Zrušeno potvrzení příjezdu', {
        potvrzeniPrijezdu: null,
        potvrzeniPrijezduKdy: null,
        zpravaCasPrectena: null,
      }),
    );
    return NextResponse.json({ ok: true, potvrzeniPrijezdu: null }, { headers: noStore });
  }

  if (akce === 'potvrzeni-odjezdu') {
    const druh = body?.druh === 'osobne' || body?.druh === 'telefon' ? body.druh : null;
    if (!druh) return chyba(400, 'Vyberte Osobně nebo Sami.');
    if (!rec.casOdjezdu) return chyba(400, 'Nejdřív musí být čas odjezdu.');
    const ted = new Date().toISOString();
    const popisek = druh === 'osobne' ? 'Osobně se rozloučíme' : 'Sami · jsme na telefonu';
    await store.setRezervace(
      id,
      pridej(rec, `Potvrzení odjezdu: ${popisek}`, {
        potvrzeniOdjezdu: druh,
        potvrzeniOdjezduKdy: ted,
        zpravaOdjezdPrectena: null,
        zpravaOdjezdPrijatiPrectena: rec.zpravaOdjezdPrijatiPrectena || ted,
      }),
    );
    return NextResponse.json(
      { ok: true, potvrzeniOdjezdu: druh, potvrzeniOdjezduKdy: ted },
      { headers: noStore },
    );
  }

  if (akce === 'zrusit-potvrzeni-odjezdu') {
    await store.setRezervace(
      id,
      pridej(rec, 'Zrušeno potvrzení odjezdu', {
        potvrzeniOdjezdu: null,
        potvrzeniOdjezduKdy: null,
        zpravaOdjezdPrectena: null,
      }),
    );
    return NextResponse.json({ ok: true, potvrzeniOdjezdu: null }, { headers: noStore });
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
    const uprava = cas && cas !== 'po20' ? poZmeneCasuPrijezdu(rec, cas, new Date()) : poZmeneCasuPrijezdu(rec, null, new Date());
    const dalsi = zapisMajitele(
      rec,
      'casPrijezdu',
      {
        casPrijezdu: cas,
        casZadalHost: false,
        ...(uprava?.patch || { zadostPrijezd: cas && cas !== 'po20' ? rec.zadostPrijezd : null }),
      },
      bylo === nove ? '' : uprava?.historie || `Čas příjezdu ${bylo} → ${nove}`,
    );
    await store.setRezervace(id, dalsi);
    if (uprava?.push) {
      try {
        await upozorniMajitele(store, uprava.push, `/prehled#${id}`, { telegram: 'zadost' });
      } catch {
        /* push není povinný */
      }
    }
    return NextResponse.json({ ok: true, hodnota: nove === 'žádný' ? '' : nove }, { headers: noStore });
  }

  if (akce === 'den-odjezdu') {
    const odjezd = (body?.odjezd || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(odjezd)) return chyba(400, 'Datum je ve špatném tvaru.');
    if (!rec.prijezd) return chyba(400, 'Nejdřív doplňte den příjezdu.');
    const noci = nightsBetween(rec.prijezd, odjezd);
    if (noci == null) return chyba(400, 'Odjezd musí být po příjezdu.');
    const bylo = rec.odjezd || 'žádný';
    const dalsi = zapisMajitele(
      rec,
      ['odjezd', 'noci'],
      { odjezd, noci },
      bylo === odjezd ? '' : `Den odjezdu ${bylo} → ${odjezd}`,
    );
    await store.setRezervace(id, dalsi);
    return NextResponse.json(
      { ok: true, odjezd, noci, termin: `${rec.prijezd} – ${odjezd}` },
      { headers: noStore },
    );
  }

  if (akce === 'den-prijezdu') {
    const prijezd = (body?.prijezd || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(prijezd)) return chyba(400, 'Datum je ve špatném tvaru.');
    if (!rec.odjezd) return chyba(400, 'Nejdřív doplňte den odjezdu.');
    const noci = nightsBetween(prijezd, rec.odjezd);
    if (noci == null) return chyba(400, 'Příjezd musí být před odjezdem.');
    const bylo = rec.prijezd || 'žádný';
    const dalsi = zapisMajitele(
      rec,
      ['prijezd', 'noci'],
      { prijezd, noci },
      bylo === prijezd ? '' : `Den příjezdu ${bylo} → ${prijezd}`,
    );
    await store.setRezervace(id, dalsi);
    return NextResponse.json(
      { ok: true, prijezd, noci, termin: `${prijezd} – ${rec.odjezd}` },
      { headers: noStore },
    );
  }

  if (akce === 'pin') {
    const pin = (body?.pin || '').trim();
    if (!pin) return chyba(400, duvod('chybi_pin').veta);
    if (pin.length > 64) return chyba(400, 'PIN je moc dlouhý.');
    const bylo = rec.accessPin || 'žádný';
    const dalsi = zapisMajitele(
      rec,
      'accessPin',
      { accessPin: pin },
      bylo === pin ? '' : `PIN apartmánu ${bylo} → ${pin}`,
    );
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, pin }, { headers: noStore });
  }

  if (akce === 'dohoda') {
    const surovy = String(body?.castka ?? '').trim().replace(',', '.');
    const poznamka = String(body?.text ?? '')
      .trim()
      .slice(0, 200);
    if (!surovy) {
      const dalsi = zapisMajitele(
        rec,
        ['dohodaKc', 'dohodaPoznamka'],
        {
          dohodaKc: null,
          dohodaPoznamka: null,
          platby: (rec.platby || []).filter((p) => p.druh !== 'dohoda'),
        },
        rec.dohodaKc ? `Domluvená částka ${rec.dohodaKc} Kč smazána` : '',
      );
      await store.setRezervace(id, dalsi);
      return NextResponse.json({ ok: true, dohodaKc: null, dohodaPoznamka: null }, { headers: noStore });
    }
    const kc = Math.round(Number(surovy));
    if (!Number.isFinite(kc) || kc < 1 || kc > 100_000) return chyba(400, 'Napište částku v Kč.');
    const popis = poznamka || null;
    const veta = popis
      ? `Domluvená částka ${kc} Kč (${popis})`
      : `Domluvená částka ${kc} Kč`;
    const dalsi = zapisMajitele(
      rec,
      ['dohodaKc', 'dohodaPoznamka'],
      { dohodaKc: kc, dohodaPoznamka: popis },
      veta,
    );
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, dohodaKc: kc, dohodaPoznamka: popis }, { headers: noStore });
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
        ...polePoCasuOdjezdu(null, rec.casOdjezdu),
      });
      if (bylo === 'žádný') dalsi.historie = rec.historie;
      await store.setRezervace(id, dalsi);
      return NextResponse.json({ ok: true, hodnota: '' }, { headers: noStore });
    }
    const kc = cenaPozde(cas);
    const ted = new Date();
    const upravaOd = poZmeneCasuOdjezdu(rec, cas, ted);
    const now = ted.toISOString();
    const veta =
      bylo === nove
        ? ''
        : upravaOd?.historie ||
          (kc ? `Čas odjezdu ${bylo} → ${nove} (+${kc} Kč)` : `Čas odjezdu ${bylo} → ${nove}`);
    const dalsi = zapisMajitele(
      rec,
      'casOdjezdu',
      {
        casOdjezdu: cas,
        casOdjezduZadalHost: false,
        ...(upravaOd?.patch || {
          zadostOdjezd: kc
            ? {
                cas,
                kc,
                stav: 'potvrzeno' as const,
                kdy: now,
                od: 'pruvodce' as const,
                hned: true,
                upozorneno: false,
              }
            : null,
        }),
        ...polePoCasuOdjezdu(cas, rec.casOdjezdu, ted),
        casOdjezduPushCeka: null,
      },
      veta,
    );
    await store.setRezervace(id, dalsi);
    if (upravaOd?.push) {
      try {
        await upozorniMajitele(store, upravaOd.push, `/prehled#${id}`, { telegram: 'zadost' });
      } catch {
        /* push není povinný */
      }
    }
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

  if (akce === 'podekovani-odeslat') {
    if (rec.bezMarketingu) return chyba(400, 'Host nechce e-maily.');
    const kanalRaw = String(body?.kanal || '').trim();
    const kanal =
      kanalRaw === 'whatsapp' || kanalRaw === 'sms' || kanalRaw === 'email' ? kanalRaw : null;
    if (!kanal) return chyba(400, 'Vyberte kanál.');
    if (kanal === 'email') {
      const {
        CHYBA_PODEKOVANI_RELAY,
        chybiSkutecnyEmailPodekovani,
        skutecnyEmailProPodekovani,
      } = await import('@/lib/podekovani');
      if (!skutecnyEmailProPodekovani(rec)) {
        return chyba(
          400,
          chybiSkutecnyEmailPodekovani(rec) ? CHYBA_PODEKOVANI_RELAY : 'Host nemá e-mail.',
        );
      }
    }
    const ted = new Date().toISOString();
    const stitek = kanal === 'whatsapp' ? 'WhatsApp' : kanal === 'sms' ? 'SMS' : 'E-mail';
    const veta = rec.podekovaniKdy
      ? `Poděkování odesláno znovu · ${stitek}`
      : `Poděkování odesláno · ${stitek}`;
    const dalsi = pridej(rec, veta, { podekovaniKdy: ted, podekovaniKanal: kanal });
    await store.setRezervace(id, dalsi);
    return NextResponse.json(
      { ok: true, cas: dalsi.podekovaniKdy, kanal: dalsi.podekovaniKanal },
      { headers: noStore },
    );
  }

  if (akce === 'podekovani-vratit') {
    if (!rec.podekovaniKdy) return NextResponse.json({ ok: true }, { headers: noStore });
    const dalsi = pridej(rec, 'Poděkování vráceno', { podekovaniKdy: null, podekovaniKanal: null });
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  if (akce === 'shrnuti-odeslat' || akce === 'shrnuti-rucne' || akce === 'shrnuti-neposilat') {
    const { otiskShrnuti } = await import('@/lib/shrnuti');
    const kanalRaw = String(body?.kanal || '').trim();
    const kanal =
      akce === 'shrnuti-neposilat'
        ? 'neposilat'
        : akce === 'shrnuti-rucne'
          ? null
          : kanalRaw === 'whatsapp' || kanalRaw === 'sms' || kanalRaw === 'email'
            ? kanalRaw
            : null;
    if (akce === 'shrnuti-odeslat' && !kanal) return chyba(400, 'Vyberte kanál.');
    const ted = new Date().toISOString();
    const stitek =
      kanal === 'whatsapp'
        ? 'WhatsApp'
        : kanal === 'sms'
          ? 'SMS'
          : kanal === 'email'
            ? 'E-mail'
            : kanal === 'neposilat'
              ? 'neposláno'
              : 'ručně';
    const veta =
      akce === 'shrnuti-neposilat'
        ? rec.shrnutiKdy
          ? 'Shrnutí neposílat (znovu)'
          : 'Shrnutí neposílat'
        : rec.shrnutiKdy
          ? `Shrnutí odesláno znovu · ${stitek}`
          : `Shrnutí odesláno · ${stitek}`;
    const dalsi = pridej(rec, veta, {
      shrnutiKdy: ted,
      shrnutiKanal: kanal,
      shrnutiOtisk: otiskShrnuti(rec),
      zpravaShrnutiPrectena: null,
      shrnutiUpozorneno: rec.shrnutiUpozorneno || ted,
    });
    await store.setRezervace(id, dalsi);
    return NextResponse.json(
      { ok: true, cas: dalsi.shrnutiKdy, kanal: dalsi.shrnutiKanal },
      { headers: noStore },
    );
  }

  if (akce === 'shrnuti-vratit') {
    if (!rec.shrnutiKdy) return NextResponse.json({ ok: true }, { headers: noStore });
    const dalsi = pridej(rec, 'Shrnutí vráceno', {
      shrnutiKdy: null,
      shrnutiKanal: null,
      shrnutiOtisk: null,
      zpravaShrnutiPrectena: null,
    });
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true }, { headers: noStore });
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
      'checkin2',
      'checkin3',
      'checkinNedojezd',
      'neotevrel',
      'pruvodceEmail',
      'nerozbalen',
      'denNerozbalen',
      'pruvodce3',
      'denCas',
      'doklady',
      'brana',
      'brana2',
      'brana3',
      'nedojezd',
      'odjezd',
      'pohoda',
      'podekovani',
      'shrnuti',
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
    const dnesAkce = denPraha(new Date());
    let zprava = zpravyMenu({
      stav: rec.stav,
      lang,
      zdroj: rec.zdroj,
      pruvodce: odkaz,
      checkinUrl: rec.checkinUrl,
      otevrenoPocet: rec.otevrenoPocet,
      casPrijezdu: rec.casPrijezdu,
      prijezd: rec.prijezd,
      dnes: dnesAkce,
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
      krestni: rec.krestni,
      telefonBrana: rec.telefonBrana,
      apartman: rec.apartman,
      shrnutiKdy: rec.shrnutiKdy,
      shrnutiOtisk: rec.shrnutiOtisk,
      branaRegistrovano: rec.branaRegistrovano,
      nedojezdKdy: rec.nedojezdKdy,
      checkinNeniPotreba: rec.checkinNeniPotreba === true,
      zadostPrijezd: rec.zadostPrijezd,
      zadostPozdniPrijezd: rec.zadostPozdniPrijezd,
    }).find((z) => z.id === druh);
    if (!zprava && druh === 'shrnuti') {
      const { textShrnuti } = await import('@/lib/shrnuti');
      const { NAZEV } = await import('@/lib/whatsapp-zprava');
      zprava = {
        id: 'shrnuti',
        nazev: NAZEV.shrnuti,
        text: textShrnuti(
          {
            casPrijezdu: rec.casPrijezdu,
            zpusobPrijezdu: rec.zpusobPrijezdu,
            telefonBrana: rec.telefonBrana,
            apartman: rec.apartman,
            jazyk: lang,
          },
          lang,
          odkaz,
        ),
        vychozi: false,
        vystraha: false,
      };
    }
    if (!zprava) return chyba(400, 'Tahle zpráva teď nejde poslat.');
    const ted = new Date().toISOString();
    const kanalShrnuti =
      akce === 'whatsapp' ? ('whatsapp' as const) : akce === 'sms' ? ('sms' as const) : ('email' as const);
    const patch =
      druh === 'odjezd'
        ? { odjezdDotaz: ted }
        : druh === 'pohoda'
          ? { pohodaDotaz: ted }
          : druh === 'podekovani'
            ? {
                podekovaniKdy: ted,
                podekovaniKanal: kanalShrnuti,
              }
            : druh === 'shrnuti'
              ? {
                  shrnutiKdy: ted,
                  shrnutiKanal: kanalShrnuti,
                  shrnutiOtisk: (await import('@/lib/shrnuti')).otiskShrnuti(rec),
                  zpravaShrnutiPrectena: null,
                  shrnutiUpozorneno: rec.shrnutiUpozorneno || ted,
                }
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
    let komu = (rec.emailHosta || '').trim();
    if (druh === 'podekovani') {
      const {
        CHYBA_PODEKOVANI_RELAY,
        chybiSkutecnyEmailPodekovani,
        skutecnyEmailProPodekovani,
      } = await import('@/lib/podekovani');
      const skutecny = skutecnyEmailProPodekovani(rec);
      if (!skutecny) {
        return chyba(
          400,
          chybiSkutecnyEmailPodekovani(rec) ? CHYBA_PODEKOVANI_RELAY : 'Host nemá e-mail.',
        );
      }
      komu = skutecny;
    }
    if (!komu || problemEmailu(komu)) return chyba(400, 'Host nemá e-mail.');
    let odeslanoNa = komu;
    try {
      if (druh === 'podekovani') {
        if (rec.bezMarketingu) return chyba(400, 'Host nechce e-maily.');
        const {
          htmlPodekovaniEmail,
          textPodekovaniEmail,
          odkazPoptavkaVernost,
        } = await import('@/lib/podekovani-email');
        const url = odkaz || '';
        if (!url) return chyba(400, 'Chybí odkaz na průvodce.');
        const urlRez = odkazPoptavkaVernost(url);
        const urlDop = `${url}#doporucit`;
        const urlPlo = `${url}${url.includes('?') ? '&' : '?'}plocha=1`;
        const vysledek = await posliEmailZpravy({
          to: komu,
          subject: predmetZpravy('podekovani', lang, rec.odjezd),
          text: textPodekovaniEmail(lang, url, urlDop, urlPlo, urlRez),
          lang,
          telefon: false,
          html: htmlPodekovaniEmail(lang, url, undefined, urlDop, urlPlo, urlRez),
        });
        odeslanoNa = vysledek.to;
      } else {
        const vysledek = await posliEmailZpravy({
          to: komu,
          subject:
            druh === 'pripraveno'
              ? predmetPripraveno(lang)
              : predmetZpravy(
                  druh,
                  lang,
                  druh === 'odjezd' ? rec.odjezd : rec.prijezd,
                ),
          text: zprava.text,
          lang,
          telefon:
            druh !== 'odjezd' &&
            druh !== 'pripraveno' &&
            druh !== 'pohoda' &&
            druh !== 'shrnuti',
        });
        odeslanoNa = vysledek.to;
      }
    } catch {
      return chyba(502, 'E-mail se nepodařilo odeslat.');
    }
    await store.setRezervace(
      id,
      pridej(sJazykem, `E-mailem: ${zprava.nazev} → ${odeslanoNa}`, patch),
    );
    return NextResponse.json(
      { ok: true, nazev: zprava.nazev, email: odeslanoNa },
      { headers: noStore },
    );
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

  if (akce === 'faktura-ares') {
    const ares = await dotazAres(body?.ico || '');
    return NextResponse.json({ ok: true, ares }, { headers: noStore });
  }

  if (akce === 'faktura-ulozit') {
    const vstup: FakturaVstup = body?.faktura && typeof body.faktura === 'object' ? body.faktura : {};
    if (vstup.typ !== 'zahranici' && vstup.ico) {
      const ares = await dotazAres(vstup.ico);
      if (ares.ok) {
        vstup.nazev = vstup.nazev || ares.nazev;
        vstup.adresa = vstup.adresa || ares.adresa;
        vstup.dic = vstup.dic || ares.dic;
      }
    }
    const ted = new Date().toISOString();
    const sestava = sestavFakturu(vstup, 'majitel', ted, rec.faktura);
    if (!sestava.ok) {
      return chyba(400, sestava.duvod === 'chybi_ico' ? 'IČO není platné.' : 'Vyplňte název, adresu a zemi.');
    }
    const faktura = { ...sestava.faktura, hotovo: rec.faktura?.hotovo ?? null };
    await store.setRezervace(
      id,
      pridej(rec, FAKTURA_MAJITEL.historie_majitel, { faktura, fakturaNeprebirat: false }),
    );
    return NextResponse.json({ ok: true, faktura, fakturaNeprebirat: false }, { headers: noStore });
  }

  if (akce === 'faktura-prebirat') {
    if (rec.faktura && maUdajeFirmy(rec.faktura)) {
      return NextResponse.json(
        { ok: true, faktura: rec.faktura, fakturaNeprebirat: false },
        { headers: noStore },
      );
    }
    const ted = new Date().toISOString();
    const surovy =
      body?.faktura && typeof body.faktura === 'object'
        ? (body.faktura as Record<string, unknown>)
        : null;
    const zeVstupu = surovy
      ? nactiFakturu({
          ...surovy,
          zadal: 'majitel',
          kdy: typeof surovy.kdy === 'string' && surovy.kdy ? surovy.kdy : ted,
        })
      : null;
    if (!zeVstupu || !maUdajeFirmy(zeVstupu)) {
      return chyba(400, 'Z minulého pobytu není firma k přilepení.');
    }
    const faktura = fakturaProNovyPobyt(zeVstupu, ted);
    await store.setRezervace(
      id,
      pridej(rec, 'Firma z minulého pobytu', { faktura, fakturaNeprebirat: false }),
    );
    return NextResponse.json({ ok: true, faktura, fakturaNeprebirat: false }, { headers: noStore });
  }

  if (akce === 'faktura-doklad-volby') {
    if (!rec.faktura) return chyba(404, 'Faktura není zadaná.');
    const typDokladu = body?.typ === 'zalohova' ? 'zalohova' : 'faktura';
    const odberatel = body?.odberatel === 'host' ? 'host' : 'firma';
    const dokladVolby = {
      typDokladu: typDokladu as 'zalohova' | 'faktura',
      zpusobUhrady: normalizujZpusobUhrady(String(body?.zpusobUhrady || '')),
      odberatel: odberatel as 'firma' | 'host',
      bezHosta: odberatel === 'firma' && body?.bezHosta === true,
      bezEmailu: body?.bezEmailu === true,
      bezPoznamky: body?.bezPoznamky === true,
    };
    const faktura = {
      ...rec.faktura,
      dokladVolby,
      upraveno: new Date().toISOString(),
    };
    await store.setRezervace(id, pridej(rec, 'Nastavení dokladu uloženo', { faktura }));
    return NextResponse.json({ ok: true, faktura }, { headers: noStore });
  }

  if (akce === 'faktura-poznamka') {
    if (!rec.faktura) return chyba(404, 'Faktura není zadaná.');
    const text = String(body?.poznamka ?? '')
      .trim()
      .slice(0, 500);
    const faktura = {
      ...rec.faktura,
      ...(text ? { poznamka: text } : { poznamka: undefined }),
      upraveno: new Date().toISOString(),
    };
    if (!text) delete (faktura as { poznamka?: string }).poznamka;
    await store.setRezervace(id, pridej(rec, 'Poznámka na fakturu upravena', { faktura }));
    return NextResponse.json({ ok: true, faktura }, { headers: noStore });
  }

  if (akce === 'faktura-hotovo' || akce === 'faktura-vratit' || akce === 'faktura-smazat') {
    if (!rec.faktura) return chyba(404, 'Faktura není zadaná.');
    if (akce === 'faktura-smazat') {
      await store.setRezervace(
        id,
        pridej(rec, 'Firma odepnutá', { faktura: null, fakturaNeprebirat: true }),
      );
      return NextResponse.json({ ok: true, faktura: null, fakturaNeprebirat: true }, { headers: noStore });
    }
    const hotovo = akce === 'faktura-hotovo' ? new Date().toISOString() : null;
    const faktura = { ...rec.faktura, hotovo };
    await store.setRezervace(
      id,
      pridej(rec, hotovo ? FAKTURA_MAJITEL.historie_hotovo : 'Faktura vrácena mezi nevyřízené', { faktura }),
    );
    return NextResponse.json({ ok: true, faktura }, { headers: noStore });
  }

  if (akce === 'faktura-whatsapp') {
    await store.setRezervace(id, pridej(rec, 'WhatsApp: Doplnění údajů na fakturu'));
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  if (akce === 'faktura-doklad-email' || akce === 'faktura-doklad-whatsapp') {
    const typ: TypDokladu = body?.typ === 'zalohova' ? 'zalohova' : 'faktura';
    const odberatel: OdberatelDokladu = body?.odberatel === 'host' ? 'host' : 'firma';
    const bezHosta = odberatel === 'firma' && body?.bezHosta === true;
    const bezEmailu = body?.bezEmailu === true;
    const bezPoznamky = body?.bezPoznamky === true;
    const poznamkaDokladu =
      typeof body?.poznamkaDokladu === 'string' ? body.poznamkaDokladu : undefined;
    const zpusobUhrady =
      typ === 'faktura' ? normalizujZpusobUhrady(String(body?.zpusobUhrady || '')) : 'prevodem';
    const lang: JazykDokladu = body?.lang === 'en' ? 'en' : 'cs';
    const castkaRaw =
      typeof body?.castka === 'string' || typeof body?.castka === 'number' ? String(body.castka) : '';
    const castkaN = Math.round(Number(castkaRaw.replace(/\s+/g, '').replace(',', '.')) * 100) / 100;
    const castka = Number.isFinite(castkaN) && castkaN > 0 ? castkaN : undefined;
    const emailFirma = rec.faktura?.email?.trim() || '';
    const emailHost = rec.emailHosta?.trim() || '';
    const na =
      odberatel === 'host' ? emailHost || emailFirma : emailFirma || emailHost;
    if (akce === 'faktura-doklad-email' && !na) {
      return chyba(400, 'Chybí e-mail odběratele. Doplňte ho u firmy nebo u hosta.');
    }
    const token = vytvorDokladToken({
      r: rec.rezervace,
      typ,
      odberatel,
      lang,
      castka,
      bezHosta,
      bezEmailu,
      bezPoznamky,
      zpusobUhrady,
    });
    const base =
      (typeof body?.origin === 'string' && body.origin.startsWith('http')
        ? body.origin.replace(/\/$/, '')
        : '') || zakladUrlZEnv();
    const odkaz = urlDokladu(base, token);
    const texty = textDokladuHostovi(lang, typ, odkaz);
    if (akce === 'faktura-doklad-whatsapp') {
      await store.setRezervace(id, pridej(rec, 'WhatsApp: Odkaz na doklad'));
      return NextResponse.json({ ok: true, zpravaWa: texty.wa, odkaz }, { headers: noStore });
    }
    const html = await sestavHtmlDokladu(rec, {
      typ,
      lang,
      odberatel,
      castka,
      bezHosta,
      bezEmailu,
      bezPoznamky,
      poznamkaDokladu: bezPoznamky ? null : poznamkaDokladu,
      zpusobUhrady,
      vystaveno: typeof body?.vystaveno === 'string' ? body.vystaveno : undefined,
      splatnost: typeof body?.splatnost === 'string' ? body.splatnost : undefined,
      logoUrl: `${base}/pruvodce/va-logo-faktura.png`,
    });
    const soubor =
      typ === 'zalohova'
        ? `zalohova-${rec.rezervace}.html`
        : `doklad-${rec.rezervace}.html`;
    try {
      await posliEmailDokladu({
        to: na,
        subject: texty.predmet,
        text: texty.text,
        htmlDokladu: html,
        filename: soubor,
      });
    } catch (e) {
      return chyba(500, e instanceof Error ? e.message : 'E-mail se nepodařilo odeslat.');
    }
    await store.setRezervace(id, pridej(rec, `E-mail: Doklad odeslán na ${na}`));
    return NextResponse.json({ ok: true, email: na, odkaz }, { headers: noStore });
  }

  if (akce === 'prani-whatsapp') {
    await store.setRezervace(id, pridej(rec, 'WhatsApp: Odpověď na přání'));
    return NextResponse.json({ ok: true }, { headers: noStore });
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
      const guide = odkazNaPruvodce(rec);
      const odkaz = guide ? odkazPraniVPruvodci(guide) : null;
      const zpravaWa = odkaz ? textWhatsAppPraniOdpoved(rec.jazyk, odkaz) : null;
      return NextResponse.json(
        { ok: true, uz: Boolean(vysledek.uz), odkaz, zpravaWa },
        { headers: noStore },
      );
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
      ...(rec.stav === 'bez_checkinu' ? { checkinNeniPotreba: true } : {}),
    });
    await store.setRezervace(id, hotovo);
    await upozorniPoOdeslaniPruvodce(store, hotovo);
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
