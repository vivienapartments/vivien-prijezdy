/**
 * Hlídá, že u textů z dávky FIN-DOPLNIT-2 má fi vyplněné a není to anglická záloha.
 * Stejný fi jako en povolíme jen u značek (WhatsApp).
 */
import { describe, expect, it } from 'vitest';
import { hotovoPoptavka, plochaVetaDekujeme } from '@/app/poptavka/PoptavkaPlocha';
import { upominkaPredmetL } from './email-host';
import {
  ODJEZD_CEKA_NADPIS,
  ODJEZD_CEKA_SBALENA,
  ODJEZD_KANAL_OTAZKA,
  ODJEZD_KANAL_STITKY,
  ODJEZD_SCHVALENO_ODESLAT,
  ODJEZD_SOUHLAS_NADPIS,
  ODJEZD_SOUHLAS_TEXT,
  textCekaOdjezdu,
} from './odjezd-souhlas';
import { vety } from './okno-pobytu';
import type { LText } from './types';
import {
  TEXT_CEKA_VETA,
  TEXT_SBALENY_CEKA,
  TEXT_SCHVALENI,
  TEXT_VYJIMKA,
} from './zadost-pozni-prijezd';
import { PODPIS_ZAVADY } from './zavady-predani';

const STEJNE_OK = new Set(['WhatsApp']);

function assertFi(map: LText, jmeno: string) {
  const fi = (map.fi || '').trim();
  const en = (map.en || '').trim();
  expect(fi, `${jmeno}: chybí fi`).not.toBe('');
  if (!STEJNE_OK.has(fi)) {
    expect(fi, `${jmeno}: fi je stejné jako en`).not.toBe(en);
  }
}

describe('fi kompletní (dávka 2)', () => {
  it('VETY.fi: žádné pole nechybí a není anglická záloha', () => {
    const fi = vety('fi');
    const en = vety('en');
    for (const k of Object.keys(en) as (keyof typeof en)[]) {
      expect(String(fi[k] || '').trim(), `VETY.fi.${k} chybí`).not.toBe('');
      expect(fi[k], `VETY.fi.${k} == en`).not.toBe(en[k]);
    }
  });

  it('odjezd-souhlas: fi u všech map', () => {
    assertFi(ODJEZD_SOUHLAS_NADPIS, 'ODJEZD_SOUHLAS_NADPIS');
    assertFi(ODJEZD_SOUHLAS_TEXT, 'ODJEZD_SOUHLAS_TEXT');
    assertFi(ODJEZD_KANAL_OTAZKA, 'ODJEZD_KANAL_OTAZKA');
    assertFi(ODJEZD_CEKA_NADPIS, 'ODJEZD_CEKA_NADPIS');
    assertFi(ODJEZD_CEKA_SBALENA, 'ODJEZD_CEKA_SBALENA');
    assertFi(ODJEZD_SCHVALENO_ODESLAT, 'ODJEZD_SCHVALENO_ODESLAT');
    assertFi(ODJEZD_KANAL_STITKY.whatsapp, 'kanal.whatsapp');
    assertFi(ODJEZD_KANAL_STITKY.pruvodce, 'kanal.pruvodce');
    assertFi(ODJEZD_KANAL_STITKY.sms, 'kanal.sms');
  });

  it('odjezd čekání: fi texty pro všechny kanály', () => {
    for (const kanal of ['whatsapp', 'pruvodce', 'sms'] as const) {
      const t = textCekaOdjezdu('11:30', 150, kanal, 'fi');
      expect(t.trim()).not.toBe('');
      expect(t).not.toMatch(/We have received|When we confirm/i);
      expect(t).toContain('11:30');
      expect(t).toContain('150');
    }
  });

  it('zadost-pozni-prijezd: fi', () => {
    assertFi(TEXT_SBALENY_CEKA, 'TEXT_SBALENY_CEKA');
    assertFi(TEXT_CEKA_VETA, 'TEXT_CEKA_VETA');
    assertFi(TEXT_SCHVALENI, 'TEXT_SCHVALENI');
    assertFi(TEXT_VYJIMKA, 'TEXT_VYJIMKA');
  });

  it('plocha + upomínka + podpis', () => {
    assertFi(hotovoPoptavka, 'hotovoPoptavka');
    assertFi(plochaVetaDekujeme, 'plochaVetaDekujeme');
    assertFi(upominkaPredmetL, 'upominkaPredmetL');
    expect(PODPIS_ZAVADY.en).toBe('Nikol and the VIVIEN family');
    expect(PODPIS_ZAVADY.fi.trim()).not.toBe('');
    expect(PODPIS_ZAVADY.fi).not.toBe(PODPIS_ZAVADY.en);
  });
});

describe('en/fi nejsou přehozené (regrese)', () => {
  it('en v texts nemá finské znaky ani typické FI nadpisy', async () => {
    const texts = await import('./texts');
    const fiZnaky = /[äöÄÖ]/;
    const fiNadpis =
      /\b(Piilottakaa|avatkaa|Sulkekaa|Talomme|Puutarhan|Sopimusehdot|Majoituksen|Hiljaisuus|Huomaavaisuus|Tulen jalan|Tulen autolla|min jalan|Juna \/ bussi|Vain majoitukseen|Tupakointi kielletty)\b/;

    function projdi(hodnota: unknown, cesta: string) {
      if (!hodnota || typeof hodnota !== 'object') return;
      const o = hodnota as Record<string, unknown>;
      if (typeof o.en === 'string') {
        expect(o.en, `${cesta}.en`).not.toMatch(fiZnaky);
        expect(o.en, `${cesta}.en`).not.toMatch(fiNadpis);
      }
      if (typeof o.fi === 'string' && typeof o.en === 'string') {
        const fi = o.fi;
        const en = o.en;
        if (fi !== 'WiFi' && en !== 'WiFi') {
          if (/\b(Hide|Show|House|Garden|Terms and conditions|Quiet in the evening|Morning and evening)\b/.test(fi)) {
            expect(fi, `${cesta}.fi vypadá anglicky`).not.toMatch(
              /\b(Hide|Show|House|Garden|Terms and conditions|Quiet in the evening|Morning and evening)\b/,
            );
          }
        }
      }
      for (const [k, v] of Object.entries(o)) {
        if (v && typeof v === 'object') projdi(v, `${cesta}.${k}`);
      }
    }

    for (const [jmeno, hodnota] of Object.entries(texts)) {
      if (jmeno === 'default') continue;
      projdi(hodnota, jmeno);
    }
  });
});
