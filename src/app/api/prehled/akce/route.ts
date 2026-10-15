import { NextResponse } from 'next/server';
import { normalizujCasPrijezdu } from '@/lib/cas-prijezdu';
import { zkontrolujCheckinOdkaz } from '@/lib/checkin-odkaz';
import { duvod, jeVyhrada, problemEmailu } from '@/lib/chyby';
import { nightsBetween } from '@/lib/dates';
import { jeRucniPole, maRucni, prevzitNavrh, zapisMajitele } from '@/lib/rucni-pole';
import { jazykZPredvolby, normalizujTelefon, textTelefonu } from '@/lib/telefon';
import { novyVyjezd, vratPosledniVyjezd, VYJEZD_CASTKA } from '@/lib/priplatek-prijezd';
import { denPraha } from '@/lib/brana';
import { posliEmailZpravy, predmetZpravy } from '@/lib/email-zprava';
import { odkazNaPruvodce, posliPruvodce } from '@/lib/posli-pruvodce';
import { oznacUklid, vratUklid } from '@/lib/dnesek';
import { aplikujNelze, aplikujPotvrzeni, oznacUpozorneno, poUklidu, predmetPripraveno } from '@/lib/okno-pobytu';
import { upozorniMajitele } from '@/lib/upozorneni';
import { polozkyZRezervace } from '@/lib/odjezd';
import { zpravyMenu, type DruhZpravy } from '@/lib/whatsapp-zprava';
import { chybejiciKroky } from '@/lib/vstup-pruvodce';
import { prehledPrihlasen } from '@/lib/prehled-session';
import { createProcessStore, type RezervaceRecord, type RezervaceStav } from '@/lib/store';
import { APT_IDS, GUIDE_LANGS, LANG_LABELS, type AptId, type GuideLang } from '@/lib/types';

export const runtime = 'nodejs';

const noStore = { 'Cache-Control': 'no-store' };

function chyba(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status, headers: noStore });
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
    castka?: string;
    stav?: string;
    zprava?: string;
  } | null;
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
      akce !== 'prevzit')
  ) {
    return chyba(400, 'Neznámá akce.');
  }

  const store = createProcessStore();
  const rec = await store.getRezervace(id);
  if (!rec) return chyba(404, 'Rezervace v přehledu není.');

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
    const dalsi = pridej(rec, 'Host je na místě', { naMiste: new Date().toISOString() });
    await store.setRezervace(id, dalsi);
    return NextResponse.json({ ok: true, naMiste: dalsi.naMiste }, { headers: noStore });
  }

  if (akce === 'zrusit-na-miste') {
    const dalsi = pridej(rec, 'Vrácen čas na místě', { naMiste: null });
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
    const kdo = body?.kdo === 'pravoslav' || body?.kdo === 'nikol' ? body.kdo : null;
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
    const dalsi = akce.startsWith('potvrdit') ? aplikujPotvrzeni(rec, druh, vse, new Date()) : aplikujNelze(rec, druh, new Date());
    if (!dalsi) return chyba(400, 'Teď to nejde potvrdit.');
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

  if (akce === 'zrusit-zaplaceni') {
    await store.setRezervace(
      id,
      zapisMajitele(rec, ['zaplaceno', 'poplatekVybral'], { zaplaceno: null, poplatekVybral: null }, 'Vrácen poplatek městu'),
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
        rucniZnacky: bez,
      });
      if (bylo === 'žádný') dalsi.historie = rec.historie;
      await store.setRezervace(id, dalsi);
      return NextResponse.json({ ok: true, hodnota: '' }, { headers: noStore });
    }
    const dalsi = zapisMajitele(
      rec,
      'casOdjezdu',
      { casOdjezdu: cas, casOdjezduZadalHost: false },
      bylo === nove ? '' : `Čas odjezdu ${bylo} → ${nove}`,
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

  if (akce === 'email') {
    const druhy: DruhZpravy[] = ['checkin', 'neotevrel', 'nerozbalen', 'denNerozbalen', 'denCas', 'brana', 'nedojezd', 'odjezd', 'pripraveno'];
    const druh = druhy.find((id) => id === body?.zprava);
    if (!druh) return chyba(400, 'Vyberte zprávu.');
    const komu = (rec.emailHosta || '').trim();
    if (!komu || problemEmailu(komu)) return chyba(400, 'Host nemá e-mail.');
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
    const zprava = zpravyMenu({
      stav: rec.stav,
      lang: rec.jazyk,
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
    }).find((z) => z.id === druh);
    if (!zprava) return chyba(400, 'Tahle zpráva teď nejde poslat.');
    try {
      await posliEmailZpravy({
        to: komu,
        subject: druh === 'pripraveno' ? predmetPripraveno(rec.jazyk) : predmetZpravy(druh, rec.jazyk, druh === 'odjezd' ? rec.odjezd : rec.prijezd),
        text: zprava.text,
        lang: rec.jazyk,
        telefon: druh !== 'odjezd' && druh !== 'pripraveno',
      });
    } catch {
      return chyba(502, 'E-mail se nepodařilo odeslat.');
    }
    await store.setRezervace(
      id,
      pridej(rec, `E-mailem: ${zprava.nazev}`, druh === 'odjezd' ? { odjezdDotaz: new Date().toISOString() } : {}),
    );
    return NextResponse.json({ ok: true, nazev: zprava.nazev }, { headers: noStore });
  }

  if (akce === 'odkaz') {
    const url = odkazNaPruvodce(rec);
    if (!url) return chyba(400, 'Chybí apartmán, datum nebo jazyk.');
    await store.setRezervace(id, pridej(rec, 'Zkopírován odkaz na průvodce'));
    return NextResponse.json({ ok: true, url }, { headers: noStore });
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
    const pokusy = pracovni.smtpPokusy + 1;
    const selhalo = pridej(pracovni, `Odeslání selhalo, pokus ${pokusy} ze 3`, {
      stav: 'neodeslano',
      smtpPokusy: pokusy,
    });
    await store.setRezervace(id, selhalo);
    return chyba(502, 'E-mail se nepodařilo odeslat. Zkuste to znovu.');
  }
}
