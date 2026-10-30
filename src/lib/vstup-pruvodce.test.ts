import fs from 'fs';
import os from 'os';
import path from 'path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Guide } from '@/components/Guide';
import { kodyProHosta } from './kody-pruvodce';
import { dnesVPraze } from './prehled';
import { verzeAktualni } from './pravidla-verze';
import type { GuideSecrets } from './secrets';
import { zapisMajitele } from './rucni-pole';
import { FileProcessStore, prazdnaRezervace } from './store';
import { createToken } from './token';
import {
  normalizujSpz,
  telefonProBranu,
  urovenPruvodce,
  urovenZRezervace,
} from './vstup-pruvodce';
import { ulozVstupHosta } from './vstup-ulozit';

const SECRET = 'test-secret-at-least-32-bytes-long!!';
process.env.PRUVODCE_TOKEN_SECRET = SECRET;

const PIN = '739184';

const secrets: GuideSecrets = {
  WIFI_HESLO_V1: 'DOPLNIT',
  WIFI_HESLO_V2: 'DOPLNIT',
  WIFI_HESLO_V3: 'DOPLNIT',
  WIFI_HESLO_V4: 'DOPLNIT',
  WIFI_HESLO_V5: 'DOPLNIT',
  WIFI_HESLO_ZAHRADA: 'DOPLNIT',
  BRANA_TELEFON: '+420604692573',
};

function storeTmp(): FileProcessStore {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vstup-'));
  return new FileProcessStore(path.join(dir, 'store.json'));
}

function tokenPro(id: string): string {
  return createToken({ r: id, a: 'V1', d: '2099-12-31', l: 'cs' }, SECRET);
}

function html(
  uroven: 'nic' | 'pesky' | 'auto' | 'cele',
  kody: boolean,
  extra?: { cas?: string | null; cteni?: boolean },
) {
  const cas = extra && 'cas' in extra ? (extra.cas ?? null) : uroven === 'nic' ? null : '16:30';
  const zpusob = uroven === 'auto' || uroven === 'cele' ? 'auto' : uroven === 'pesky' ? 'pesky' : null;
  return renderToStaticMarkup(
    createElement(Guide, {
      apt: 'V1',
      lang: 'cs',
      secrets,
      stay: { noci: 2, osob: 2 },
      kody: kody ? kodyProHosta(true, 'V1', PIN, 'cs') : null,
      vstup: {
        token: null,
        cteni: extra?.cteni,
        uroven,
        hodnoty: {
          cas,
          zpusob,
          telefon: zpusob === 'auto' ? '+420777111222' : '',
          spz: zpusob === 'auto' ? '1C23456' : '',
          pujcene: false,
          souhlas: uroven !== 'nic',
        },
        predvyplneny: '',
      },
    }),
  );
}

describe('průvodce se otevře až po údajích', () => {
  it('bez času nejsou v HTML další kroky', () => {
    const text = html('nic', false);
    expect(text).toContain('Bez času příjezdu se neubytujete');
    expect(text).toContain('Každé z těchto pravidel má svůj příběh.');
    expect(text).not.toContain('bez recepce');
    expect(text).toContain('Když nám napíšete');
    expect(text).toContain('čtvrt hodiny');
    expect(text).toContain('<strong>Když nám napíšete');
    expect(text).toContain('čekáme my na vás.</strong>');
    expect(text).toContain('Když nám čas předem nedáte');
    expect(text).toContain('čekáte vy na nás');
    expect(text).toContain('až hodinu');
    expect(text).toContain('Na domluvený čas pak čekáme');
    expect(text).toContain('přijet znovu');
    expect(text).toContain('Rozumím pravidlům příjezdu a souhlasím s nimi.');
    expect(text).toContain('20:30 · +100 Kč');
    expect(text).toContain('23:00 · +600 Kč');
    expect(text).toContain('Dřívější příjezd (potvrdíme)');
    expect(text).toContain('Běžný příjezd');
    expect(text).toContain('platíte <span class="pv-nedel">100 Kč</span> za každou započatou půlhodinu');
    expect(text).toContain('Po <span class="pv-nedel">23:00</span> jen po domluvě.');
    expect(text).not.toContain('do 21:00');
    expect(text).toContain('Vaše vstupní PINy');
    expect(text).toContain('Tady budou vaše PINy.');
    expect(text).toContain('Uložit a pokračovat k PINům');
    expect(text).toContain('Cesta k nám');
    expect(text).not.toContain('Další kroky se ukážou');
    expect(text).not.toContain('id="pv-parkovani"');
    expect(text).not.toContain('id="pv-brana-parkoviste"');
    expect(text).not.toContain('id="pv-wifi"');
    expect(text).not.toContain('id="vase-kody"');
    expect(text).not.toContain(PIN);
  });

  it('po vyplnění času a před volbou způsobu WiFi není', () => {
    const text = html('nic', false, { cas: '16:30' });
    expect(text).not.toContain('id="pv-wifi"');
    expect(text).not.toContain('id="pv-parkovani"');
    expect(text).not.toContain('id="pv-brana-parkoviste"');
    expect(text).not.toContain(PIN);
    expect(text).not.toContain('id="vase-kody"');
  });

  it('náhled majitele nemá tlačítka, kterými by údaje změnil', () => {
    const text = html('pesky', false, { cteni: true });
    expect(text).not.toContain('pv-vstup__ulozit');
    expect(text).not.toContain('pv-vstup__zmenit');
    expect(text).toContain('id="pv-wifi"');
  });

  it('auto bez telefonu nemá v HTML cestu na parkování', () => {
    expect(
      urovenPruvodce({
        cas: '16:30',
        zpusob: 'auto',
        telefonBrana: null,
        spz: '1C23456',
        spzPujcene: false,
        souhlas: true,
        odemceno: false,
      }),
    ).toBe('nic');
    const text = html('nic', false);
    expect(text).not.toContain('id="pv-parkovani"');
  });

  it('auto má v Bráně adresu parkoviště a navigaci', () => {
    const text = html('auto', false);
    expect(text).toContain('id="pv-brana-parkoviste"');
    expect(text).toContain('Chelčického 95/15');
    expect(text).toContain('mapy.com/fnc/v1/route');
    expect(text).toContain('google.com/maps/dir');
    expect(text).not.toContain('id="pv-zadost-o-parkovani"');
  });

  it('pěšky má navigaci k domu a Příjezd k domu je sbalený', () => {
    const text = html('pesky', false);
    const sekce = text.split('id="pv-prijezd-k-domu"')[1]?.split('id="pv-')[0] || '';
    expect(text).toContain('id="pv-prijezd-k-domu"');
    expect(sekce).toContain('Nádražní 108/43');
    expect(sekce).toContain('class="pv-sbal"');
    expect(sekce).toContain('Rozbalit');
    expect(sekce).toContain('Sbalit');
    expect(sekce).toContain('mapy.com/fnc/v1/showmap');
    expect(text).not.toContain('id="pv-brana-parkoviste"');
  });

  it('autem je Brána rozbalená a Cesta na stání sbalená', () => {
    const text = html('auto', false);
    const cast = (id: string) => text.split(`id="${id}"`)[1]?.split('id="pv-')[0] || '';
    expect(cast('pv-brana-parkoviste')).toContain('pv-flow__card-head');
    // Prompt 61: každá část je ve details; autem je Brána výchozí open.
    expect(cast('pv-brana-parkoviste')).toMatch(/pv-flow__card"><details class="pv-sbal" open/);
    expect(cast('pv-parkovani')).toMatch(/pv-flow__card"><details class="pv-sbal"/);
    // Prompt 64: K domu + Dům spojené; stará kotva zůstává jako alias.
    expect(text).toContain('id="pv-pesky-parkoviste-dum"');
    expect(cast('pv-prijezd-k-domu')).toMatch(/pv-flow__card"><details class="pv-sbal"/);
    expect(cast('pv-prijezd-k-domu')).toContain('routeType=foot_fast');
    expect(cast('pv-prijezd-k-domu')).toContain('fasada');
    expect(cast('pv-prijezd-k-domu')).not.toContain('mapy.com/fnc/v1/showmap');
    expect(text).toContain('Rozbalit');
  });

  it('ani v den příjezdu se nic neodemkne samo', () => {
    const rec = {
      ...prazdnaRezervace('1', '2026-10-14T00:00:00.000Z'),
      prijezd: dnesVPraze(),
      zpusobPrijezdu: 'auto' as const,
      telefonBrana: '+420777111222',
      spz: '1C23456',
    };
    expect(urovenZRezervace(rec)).toBe('nic');
    expect(urovenZRezervace({ ...rec, casPrijezdu: '11:00', zpusobPrijezdu: 'pesky' })).toBe('nic');
    expect(
      urovenZRezervace({
        ...rec,
        casPrijezdu: '11:00',
        zpusobPrijezdu: 'pesky',
        souhlasPravidel: { kdy: '2026-10-14T00:00:00.000Z', jazyk: 'cs', verze: 'x' },
      }),
    ).toBe('pesky');
    const pesky = html('pesky', false);
    expect(pesky).toContain('id="pv-wifi"');
    expect(pesky).not.toContain('id="pv-parkovani"');
    expect(pesky).not.toContain('Přijedete autem? Napište nám hned');
  });

  it('ubytovaný host nevidí červený box a průvodce má otevřený', () => {
    const rec = {
      ...prazdnaRezervace('1', '2026-10-14T00:00:00.000Z'),
      prijezd: '2099-01-01',
      predano: '2026-10-15T10:00:00.000Z',
    };
    expect(urovenZRezervace(rec)).toBe('cele');
    expect(urovenZRezervace({ ...rec, predano: null })).toBe('nic');
    const text = renderToStaticMarkup(
      createElement(Guide, {
        apt: 'V1',
        lang: 'cs',
        secrets,
        stay: { noci: 2, osob: 2 },
        kody: kodyProHosta(true, 'V1', PIN, 'cs'),
        vstup: {
          token: null,
          uroven: 'cele',
          ubytovan: true,
          hodnoty: { cas: null, zpusob: null, telefon: '', spz: '', pujcene: false, souhlas: false },
          predvyplneny: '',
        },
      }),
    );
    expect(text).not.toContain('Bez času příjezdu se neubytujete');
    expect(text).not.toContain('Tady budou vaše PINy.');
    expect(text).toContain('id="pv-wifi"');
    expect(text).toContain(PIN);
  });

  it('odemknutí ukáže vše kromě kódů', () => {
    const text = html('cele', false);
    expect(text).toContain('id="pv-wifi"');
    expect(text).toContain('id="pv-parkovani"');
    expect(text).toContain('Hotovo. PINy se vám tady zobrazí při osobním předání.');
    expect(text).not.toContain('id="vase-kody"');
    expect(text).not.toContain(PIN);
  });

  it('špatný telefon, SPZ ani cizí token se neuloží', async () => {
    const store = storeTmp();
    const id = '120260001';
    await store.setRezervace(id, prazdnaRezervace(id, '2026-10-14T00:00:00.000Z'));
    const token = tokenPro(id);
    expect(telefonProBranu('123').ok).toBe(false);
    expect(telefonProBranu('777111222').ok).toBe(false);
    expect(telefonProBranu('+420 777 111 222').ok).toBe(true);
    expect(normalizujSpz('!').ok).toBe(false);
    expect((await ulozVstupHosta(store, token, { akce: 'prijezd', zpusob: 'auto', telefon: '123', spz: '1C23456' })).ok).toBe(
      false,
    );
    expect((await ulozVstupHosta(store, token, { akce: 'prijezd', zpusob: 'auto', telefon: '+420777111222', spz: '!' })).ok).toBe(
      false,
    );
    expect((await ulozVstupHosta(store, 'nic', { akce: 'cas', cas: '16:30' })).ok).toBe(false);
    const rec = await store.getRezervace(id);
    expect(rec?.casPrijezdu).toBeNull();
    expect(rec?.telefonBrana).toBeNull();
    expect(rec?.spz).toBeNull();
  });

  it('změna telefonu zruší registraci v bráně a údaje jsou v přehledu', async () => {
    const store = storeTmp();
    const id = '120260002';
    await store.setRezervace(id, {
      ...prazdnaRezervace(id, '2026-10-14T00:00:00.000Z'),
      casPrijezdu: '16:30',
      casZadalHost: true,
      zpusobPrijezdu: 'auto',
      telefonBrana: '+420777111222',
      spz: '1C23456',
      branaRegistrovano: '2026-10-14T10:00:00.000Z',
    });
    const token = tokenPro(id);
    const stejny = await ulozVstupHosta(store, token, {
      akce: 'prijezd',
      zpusob: 'auto',
      telefon: '+420 777 111 222',
      spz: '1C2 3456',
    });
    expect(stejny.ok).toBe(true);
    expect((await store.getRezervace(id))?.branaRegistrovano).toBeTruthy();
    const zmena = await ulozVstupHosta(store, token, {
      akce: 'prijezd',
      zpusob: 'auto',
      telefon: '+420777000111',
      spz: '1C23456',
    });
    expect(zmena.ok).toBe(true);
    const rec = await store.getRezervace(id);
    expect(rec?.telefonBrana).toBe('+420777000111');
    expect(rec?.branaRegistrovano).toBeNull();
    expect(rec?.spz).toBe('1C23456');
    expect(rec?.historie.some((h) => h.co.includes('změnil telefon'))).toBe(true);
  });

  it('ruční čas majitele host nepřepíše, jeho čas zůstane jako Použít', async () => {
    const store = storeTmp();
    const id = '120260004';
    await store.setRezervace(
      id,
      zapisMajitele(
        {
          ...prazdnaRezervace(id, '2026-10-14T00:00:00.000Z'),
          apartman: 'V3',
          jmeno: 'Jan Novák',
          casPrijezdu: '16:30',
        },
        'casPrijezdu',
        { casPrijezdu: '16:30' },
        'Čas příjezdu žádný → 16:30',
      ),
    );
    const vysledek = await ulozVstupHosta(store, tokenPro(id), { akce: 'cas', cas: '18:00' });
    expect(vysledek.ok).toBe(true);
    const rec = await store.getRezervace(id);
    expect(rec?.casPrijezdu).toBe('16:30');
    expect(rec?.navrhy.some((n) => n.pole === 'casPrijezdu' && n.hodnota === '18:00' && n.od === 'host')).toBe(true);
  });

  it('po osmi pokusech za deset minut už další nejde', async () => {
    const store = storeTmp();
    const id = '120260003';
    const ted = new Date().toISOString();
    await store.setRezervace(id, {
      ...prazdnaRezervace(id, ted),
      hostUlozeni: Array.from({ length: 8 }, () => ted),
    });
    const vysledek = await ulozVstupHosta(store, tokenPro(id), { akce: 'cas', cas: '16:30' });
    expect(vysledek).toEqual({ ok: false, duvod: 'limit' });
    expect((await store.getRezervace(id))?.casPrijezdu).toBeNull();
  });

  it('souhlas s pravidly se zapíše a stejná verze si nechá čas', async () => {
    const store = storeTmp();
    const id = '120260008';
    await store.setRezervace(id, prazdnaRezervace(id, '2026-10-14T00:00:00.000Z'));
    const token = tokenPro(id);
    const prvni = await ulozVstupHosta(store, token, { akce: 'cas', cas: '16:30', souhlas: true, jazyk: 'cs' });
    expect(prvni.ok).toBe(true);
    const po = await store.getRezervace(id);
    expect(po?.souhlasPravidel?.verze).toBe(verzeAktualni());
    expect(po?.historie.some((h) => h.co === 'Host souhlasí s pravidly příjezdu')).toBe(true);
    const kdy = po?.souhlasPravidel?.kdy;
    const znovu = await ulozVstupHosta(store, token, { akce: 'souhlas', souhlas: true, jazyk: 'en' });
    expect(znovu.ok).toBe(true);
    expect((await store.getRezervace(id))?.souhlasPravidel?.kdy).toBe(kdy);
    const zrusit = await ulozVstupHosta(store, token, { akce: 'souhlas', souhlas: false });
    expect(zrusit.ok).toBe(true);
    const konec = await store.getRezervace(id);
    expect(konec?.souhlasPravidel).toBeNull();
    expect(konec?.historie.some((h) => h.co === 'Host zrušil souhlas s pravidly')).toBe(true);
  });

  it('bez času, způsobu nebo souhlasu se neodemkne a PINy nejsou v HTML', async () => {
    const store = storeTmp();
    const id = '120260028';
    await store.setRezervace(id, prazdnaRezervace(id, '2026-10-14T00:00:00.000Z'));
    const token = tokenPro(id);
    expect(
      (await ulozVstupHosta(store, token, { akce: 'dokoncit', cas: '16:30', zpusob: 'pesky', souhlas: false })).ok,
    ).toBe(false);
    expect((await store.getRezervace(id))?.casPrijezdu).toBeNull();
    const hotovo = await ulozVstupHosta(store, token, {
      akce: 'dokoncit',
      cas: '16:30',
      zpusob: 'pesky',
      souhlas: true,
      jazyk: 'cs',
    });
    expect(hotovo).toEqual({ ok: true, uroven: 'pesky' });
    const pred = html('nic', false);
    expect(pred).not.toContain(PIN);
    expect(pred).not.toContain('id="vase-piny"');
    const po = html('pesky', true);
    expect(po).toContain(PIN);
    expect(po).toContain('id="vase-piny"');
    expect(po).not.toContain('Tady budou vaše PINy.');
  });
});
