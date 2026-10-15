import { describe, expect, it } from 'vitest';
import {
  BRANA_ZACATEK,
  jeVolna,
  konecPrikaz,
  konecZOdjezdu,
  nactiBranu,
  nactiDokument,
  prazdnaBrana,
  prazdnySlot,
  registraceOd,
  slozPrikaz,
  smiRegistrovat,
  smsOdkaz,
  stavParkovani,
  telefonNa00,
  vyberPozici,
  vychoziBrana,
  textKonce,
  type BranaSlot,
  type HostProBranu,
} from './brana';
import { otevriSmsBrany, zajistiVychoziBranu } from './brana-akce';
import { FileProcessStore, prazdnaRezervace } from './store';
import fs from 'fs';
import os from 'os';
import path from 'path';

const TED = new Date('2026-10-15T10:00:00.000Z');

function host(patch: Partial<HostProBranu> = {}): HostProBranu {
  return {
    rezervace: '1',
    apartman: 'V3',
    prijezd: '2026-10-18',
    odjezd: '2026-10-20',
    zpusob: 'auto',
    telefonBrana: '+420777111222',
    branaRegistrovano: null,
    zruseno: false,
    ...patch,
  };
}

function slot(pozice: number, konec: string, rezervace = 'jiny'): BranaSlot {
  return {
    ...prazdnySlot(pozice),
    telefon: '+420777000111',
    konec,
    stav: 'plati',
    rezervace,
    ktery: 'hlavni',
  };
}

describe('příkaz brány', () => {
  it('složí SMS bez mezer, s 00 a pevným začátkem', () => {
    const konec = konecPrikaz(konecZOdjezdu('2026-10-18') || '');
    expect(konec).toBe('2610181600');
    const text = slozPrikaz('1234', 158, '0034612345678', konec || '');
    expect(text).toBe(`1234A158#0034612345678#${BRANA_ZACATEK}#2610181600#`);
    expect(text?.includes(' ')).toBe(false);
    expect(telefonNa00('+34 612 345 678')).toBe('0034612345678');
    expect(telefonNa00('420777111222')).toBeNull();
    expect(telefonNa00('777111222')).toBeNull();
  });

  it('schová mřížku v odkazu a na iPhonu použije jiné spojení', () => {
    const text = '1234A158#0034612345678#0001010000#2610181600#';
    const android = smsOdkaz('+420000000000', text, false);
    const ios = smsOdkaz('+420000000000', text, true);
    expect(android.startsWith('sms:+420000000000?body=')).toBe(true);
    expect(ios.startsWith('sms:+420000000000&body=')).toBe(true);
    expect(decodeURIComponent(android.split('body=')[1])).toBe(text);
    expect(android.includes('#')).toBe(false);
  });
});

describe('výběr pozice', () => {
  it('bere nejdřív apartmán a platnou pozici nikdy nepřepíše', () => {
    const budoucnost = konecZOdjezdu('2026-10-20') || '';
    const sloty = prazdnaBrana();
    for (const pozice of [158, 159, 160, 161]) {
      const i = sloty.findIndex((s) => s.pozice === pozice);
      sloty[i] = slot(pozice, budoucnost);
    }
    expect(vyberPozici(sloty, 'V3', TED)).toBe(150);
    expect(vyberPozici(sloty, 'V3', TED)).not.toBe(158);
    const plne = prazdnaBrana().map((s) => slot(s.pozice, budoucnost));
    expect(vyberPozici(plne, 'V1', TED)).toBeNull();
    const stara = konecZOdjezdu('2026-10-14') || '';
    const uvolnena = prazdnaBrana();
    uvolnena[8] = slot(158, stara);
    expect(jeVolna(uvolnena[8], TED)).toBe(true);
    expect(vyberPozici(uvolnena, 'V3', TED)).toBe(158);
  });

  it('dřív než 7 dní tlačítko neotevře a změna odjezdu chce úpravu', () => {
    expect(registraceOd('2026-10-23')).toBe('2026-10-16');
    expect(smiRegistrovat('2026-10-23', TED)).toBe(false);
    expect(smiRegistrovat('2026-10-22', TED)).toBe(true);
    const brzy = stavParkovani(host({ prijezd: '2026-10-23' }), prazdnaBrana(), TED);
    expect(brzy.text).toBe('Parkování: registrovat od 16. 10.');
    expect(brzy.neaktivni).toBe(true);
    const sloty = nactiBranu([
      {
        ...slot(158, konecZOdjezdu('2026-10-20') || '', '1'),
        telefon: '+420777111222',
      },
    ]);
    const uprava = stavParkovani(host({ odjezd: '2026-10-21' }), sloty, TED);
    expect(uprava.akce).toBe('upravit');
    expect(uprava.pozice).toBe(158);
    expect(uprava.tlacitko).toBe('Upravit v bráně');
    expect(stavParkovani(host({ zpusob: 'pesky' }), prazdnaBrana(), TED).text).toBe('Parkování: nechce (pěšky)');
    expect(stavParkovani(host({ zpusob: null }), prazdnaBrana(), TED).text).toBe('Parkování: host ještě nevybral');
  });
});

describe('uložení čekání', () => {
  it('otevření SMS zapíše pozici a do historie nedá heslo ani telefon', async () => {
    process.env.BRANA_HESLO = '1234';
    process.env.BRANA_CISLO = '00420000000000';
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brana-'));
    const store = new FileProcessStore(path.join(dir, 'store.json'));
    const rec = {
      ...prazdnaRezervace('55', TED.toISOString()),
      apartman: 'V3' as const,
      prijezd: '2026-10-18',
      odjezd: '2026-10-20',
      zpusobPrijezdu: 'auto' as const,
      telefonBrana: '+420777111222',
    };
    await store.setRezervace('55', rec);
    await store.setBrana({ sloty: prazdnaBrana(), potvrzeno: TED.toISOString() });
    const vysledek = await otevriSmsBrany(store, { rezervace: '55', ios: false, now: TED });
    expect(vysledek.ok).toBe(true);
    if (!vysledek.ok) return;
    expect(vysledek.pozice).toBe(158);
    expect(vysledek.text.startsWith('1234A158#00420777111222#')).toBe(true);
    const ulozeno = nactiBranu(await store.getBrana());
    expect(ulozeno.find((s) => s.pozice === 158)?.stav).toBe('ceka');
    const po = await store.getRezervace('55');
    const veta = po?.historie.at(-1)?.co || '';
    expect(veta).toContain('pozice 158');
    expect(veta).not.toContain('1234');
    expect(veta).not.toContain('777');
    expect(nactiDokument(await store.getBrana()).potvrzeno).toBe(TED.toISOString());
  });

  it('bez potvrzení stavu zprávu nesloží a výchozí pozice 153 a 168 drží', async () => {
    process.env.BRANA_HESLO = '1234';
    process.env.BRANA_CISLO = '00420000000000';
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brana-'));
    const store = new FileProcessStore(path.join(dir, 'store.json'));
    const rec = {
      ...prazdnaRezervace('55', TED.toISOString()),
      apartman: 'V3' as const,
      prijezd: '2026-10-18',
      odjezd: '2026-10-20',
      zpusobPrijezdu: 'auto' as const,
      telefonBrana: '+420777111222',
    };
    await store.setRezervace('55', rec);
    await store.setBrana({ sloty: vychoziBrana(), potvrzeno: null });
    const zavreno = await otevriSmsBrany(store, { rezervace: '55', ios: false, now: TED });
    expect(zavreno.ok).toBe(false);
    const sloty = vychoziBrana();
    expect(textKonce(sloty.find((s) => s.pozice === 153)?.konec || null)).toBe('26. 10. 16:00');
    expect(textKonce(sloty.find((s) => s.pozice === 168)?.konec || null)).toBe('16. 10. 14:00');
    expect(jeVolna(sloty.find((s) => s.pozice === 153)!, TED)).toBe(false);
    expect(jeVolna(sloty.find((s) => s.pozice === 168)!, TED)).toBe(false);
    expect(jeVolna(sloty.find((s) => s.pozice === 150)!, TED)).toBe(true);
    expect(vyberPozici(sloty, 'V1', TED)).toBe(150);
    expect(vyberPozici(sloty, 'V5', TED)).toBe(166);
    expect(jeVolna(sloty.find((s) => s.pozice === 168)!, new Date('2026-10-16T13:00:00.000Z'))).toBe(true);
  });

  it('prázdný stav brány se doplní a potvrzený se nepřepíše', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brana-'));
    const store = new FileProcessStore(path.join(dir, 'store.json'));
    const prvni = await zajistiVychoziBranu(store);
    expect(textKonce(prvni.sloty.find((s) => s.pozice === 153)?.konec || null)).toBe('26. 10. 16:00');
    expect(prvni.potvrzeno).toBeNull();
    await store.setBrana({ sloty: prvni.sloty, potvrzeno: TED.toISOString() });
    const druhe = await zajistiVychoziBranu(store);
    expect(druhe.potvrzeno).toBe(TED.toISOString());
    expect(textKonce(druhe.sloty.find((s) => s.pozice === 168)?.konec || null)).toBe('16. 10. 14:00');
  });
});
