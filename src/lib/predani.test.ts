import fs from 'fs';
import os from 'os';
import path from 'path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Guide } from '@/components/Guide';
import { HOUSE_KEY_TAG } from './access-codes';
import { kodoveRadky, kodyProHosta } from './kody-pruvodce';
import { hodinaPraha } from './prehled';
import {
  maDostatPredani,
  migracePredaniJednou,
  oznacUbystovane,
  predanoRezervace,
  spocitejPredani,
} from './predani';
import { FileProcessStore, prazdnaRezervace, type ProcessStore, type RezervaceRecord } from './store';
import type { GuideSecrets } from './secrets';

const PIN = '4821';
const DUM = HOUSE_KEY_TAG;

const secrets: GuideSecrets = {
  WIFI_HESLO_V1: 'DOPLNIT',
  WIFI_HESLO_V2: 'DOPLNIT',
  WIFI_HESLO_V3: 'DOPLNIT',
  WIFI_HESLO_V4: 'DOPLNIT',
  WIFI_HESLO_V5: 'DOPLNIT',
  WIFI_HESLO_ZAHRADA: 'DOPLNIT',
  BRANA_TELEFON: '+420604692573',
};

function htmlPruvodce(predano: boolean): string {
  return renderToStaticMarkup(
    createElement(Guide, {
      apt: 'V2',
      lang: 'cs',
      secrets,
      stay: { noci: 2, osob: 2 },
      kody: kodyProHosta(predano, 'V2', PIN, 'cs'),
      initialPrijezd: 'pesky',
    }),
  );
}

function zaznam(id: string, prijezd: string | null, odjezd: string | null, extra: Partial<RezervaceRecord> = {}): RezervaceRecord {
  return {
    ...prazdnaRezervace(id, '2026-10-01T00:00:00.000Z'),
    prijezd,
    odjezd,
    stav: 'odeslano',
    ...extra,
  };
}

describe('kódy až po předání', () => {
  it('nepředáno: v HTML není kód domu, apartmánu ani zahrady', () => {
    const html = htmlPruvodce(false);
    expect(html).toContain('Tady budou vaše PINy.');
    expect(html).not.toContain('Vstup dům');
    expect(html).not.toContain(DUM);
    expect(html).not.toContain(PIN);
    expect(html).not.toContain('pv-klic');
    expect(kodyProHosta(false, 'V1', PIN, 'cs')).toBeNull();
  });

  it('box o předání je vidět bez volby autem nebo pěšky', () => {
    const html = renderToStaticMarkup(
      createElement(Guide, {
        apt: 'V1',
        lang: 'cs',
        secrets,
        stay: { noci: 2, osob: 2 },
        kody: null,
      }),
    );
    expect(html).toContain('Bez času příjezdu se neubytujete');
    expect(html).toContain('Tady budou vaše PINy.');
    expect(html).not.toContain('Další kroky se ukážou');
    expect(html).not.toContain('Napište nám, v kolik dorazíte');
    expect(html).not.toContain('Ukážeme vám jen to, co potřebujete');
    expect(html).not.toContain('id="vase-kody"');
    expect(html).not.toContain('id="pv-parkovani"');
  });

  it('po předání se box změní a vede ke kódům', () => {
    const html = renderToStaticMarkup(
      createElement(Guide, {
        apt: 'V1',
        lang: 'cs',
        secrets,
        stay: { noci: 2, osob: 2 },
        kody: kodyProHosta(true, 'V1', PIN, 'cs'),
      }),
    );
    expect(html).toContain('id="vase-piny"');
    expect(html).toContain(PIN);
    expect(html).not.toContain('Apartmán je předaný.');
    expect(html).not.toContain('Kódy najdete níže.');
    expect(html).not.toContain('<h2>Apartmán vám předáme osobně</h2>');
  });

  it('předáno: kódy v HTML jsou, u domu klíček a u apartmánu mřížka', () => {
    const html = htmlPruvodce(true);
    expect(html).toContain(DUM);
    expect(html).toContain(`${PIN}#`);
    expect(html.match(/class="pv-klic"/g)?.length).toBe(2);
    expect(html).not.toContain('Zobrazí se po osobním předání');
  });

  it('chyba úložiště se bere jako nepředáno', async () => {
    const store = {
      getRezervace: async () => {
        throw new Error('úložiště nejde');
      },
    } as unknown as ProcessStore;
    expect(await predanoRezervace(store, '1')).toBe(false);
    const html = htmlPruvodce(false);
    expect(html).not.toContain(DUM);
    expect(html).not.toContain(PIN);
  });

  it('přechod podle data příjezdu', async () => {
    const dnes = '2026-10-13';
    const bydlí = zaznam('1', '2026-10-12', '2026-10-15');
    const dneska = zaznam('2', '2026-10-13', '2026-10-15');
    const pozdeji = zaznam('3', '2026-10-14', '2026-10-16');
    const odjel = zaznam('4', '2026-10-10', '2026-10-12');
    const odjezdDnes = zaznam('5', '2026-10-11', '2026-10-13');
    const zruseno = zaznam('6', '2026-10-10', '2026-10-15', { stav: 'zruseno' });
    const uz = zaznam('7', '2026-10-10', '2026-10-15', { predano: '2026-10-10T10:00:00.000Z' });
    const bezData = zaznam('8', null, null);
    const vse = [bydlí, dneska, pozdeji, odjel, odjezdDnes, zruseno, uz, bezData];
    expect(spocitejPredani(vse, dnes)).toBe(2);
    expect(maDostatPredani(bydlí, dnes)).toBe(true);
    expect(maDostatPredani(dneska, dnes)).toBe(false);
    expect(maDostatPredani(odjel, dnes)).toBe(false);
    expect(maDostatPredani(odjezdDnes, dnes)).toBe(true);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vivien-predani-'));
    const store = new FileProcessStore(path.join(dir, 'store.json'));
    for (const rec of vse) await store.setRezervace(rec.rezervace, rec);
    const now = '2026-10-13T12:00:00.000Z';
    expect(await oznacUbystovane(store, dnes, now)).toBe(2);
    expect((await store.getRezervace('1'))?.predano).toBe(now);
    expect((await store.getRezervace('5'))?.predano).toBe(now);
    expect((await store.getRezervace('2'))?.predano).toBeNull();
    expect((await store.getRezervace('4'))?.predano).toBeNull();
    expect(await migracePredaniJednou(store, dnes, now)).toBe(0);
    expect(await migracePredaniJednou(store, dnes, now)).toBeNull();
    expect(hodinaPraha('2026-10-13T13:42:00.000Z')).toBe('15:42');
  });

  it('před předáním v HTML není 1234 ani mřížka, po předání je 1234#', () => {
    const pred = renderToStaticMarkup(
      createElement(Guide, {
        apt: 'V1',
        lang: 'cs',
        secrets,
        stay: { noci: 2, osob: 2 },
        kody: kodyProHosta(false, 'V1', '1234', 'cs'),
      }),
    );
    const box = pred.match(/<section class="pv-piny"[\s\S]*?<\/section>/)?.[0] || '';
    const textBoxu = box.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '');
    expect(textBoxu).not.toMatch(/\d/);
    expect(textBoxu).not.toContain('#');
    expect(box).not.toContain('1234');
    expect(pred).not.toContain('1234#');
    expect(pred).not.toContain('Zadejte číslice');

    const po = renderToStaticMarkup(
      createElement(Guide, {
        apt: 'V3',
        lang: 'cs',
        secrets,
        stay: { noci: 2, osob: 2 },
        kody: kodyProHosta(true, 'V3', '1234', 'cs'),
      }),
    );
    expect(po).toContain('1234#');
    expect(po).toContain('Zadejte číslice a potvrďte mřížkou #.');
    expect(po).toMatch(/pv-piny__hodnota[^>]*>1234#/);
    const radky = kodoveRadky('V3', '1234', 'cs');
    expect(radky.find((r) => r.kind === 'dum')?.value).toBe(DUM);
    expect(radky.find((r) => r.kind === 'apt')?.value).toBe('1234#');
    expect(radky.find((r) => r.kind === 'zahrada')?.value).toBe('1234#');
    const ulice = kodoveRadky('V1', '1234', 'cs');
    expect(ulice.find((r) => r.kind === 'zahrada')?.value).toBe('9000#');
    expect(ulice.find((r) => r.kind === 'dum')?.value).not.toContain('#');
  });
});
