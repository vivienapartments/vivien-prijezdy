import { describe, expect, it } from 'vitest';
import { najdiVyberyProdlouzeni, nevybraneProdlouzeni, rozpisPozde, textSouhlasuOdjezdu } from './odjezd-souhlas';
import type { RezervaceRecord } from './store';

function rec(partial: Partial<RezervaceRecord>): RezervaceRecord {
  return {
    rezervace: '1',
    apartman: 'V1',
    prijezd: '2026-11-18',
    odjezd: '2026-11-19',
    noci: 1,
    osob: 2,
    jazyk: 'cs',
    jmeno: 'Jan Novák',
    krestni: 'Jan',
    narodnost: 'CZE',
    emailHosta: null,
    accessPin: null,
    datumVzniku: null,
    stav: 'odeslano',
    historie: [],
    otevrenoPoprve: null,
    otevrenoNaposled: null,
    otevrenoPocet: null,
    telefon: null,
    telefonWa: null,
    telefonPuvodni: null,
    zdroj: null,
    casPrijezdu: null,
    casOdjezdu: null,
    casOdjezduZadalHost: false,
    odjezdDotaz: null,
    pohodaDotaz: null,
    odjezdPushPul: null,
    prodlouzeniVyberPush: null,
    zpravaOdjezdCekaPrectena: null,
    uklizenoKdy: null,
    uklizenoKdo: null,
    zadostPrijezd: null,
    zadostOdjezd: null,
    zadostPozdniPrijezd: null,
    telefonRezervace: null,
    telefonRezervaceWa: null,
    telefonRezervacePuvodni: null,
    checkinUrl: null,
    stitek: null,
    predano: null,
    naMiste: null,
    priplatekRucni: null,
    dohodaKc: null,
    dohodaPoznamka: null,
    zaplaceno: null,
    platby: [],
    poplatekVybral: null,
    prevzatoKdy: null,
    prevzatoAuto: false,
    platbaUpozorneno: null,
    vyjezdy: [],
    souhlasPravidel: null,
    zavadyPredani: null,
    zavadyPoOdjezdu: null,
    casZadalHost: false,
    zpusobPrijezdu: null,
    telefonBrana: null,
    ...partial,
  } as RezervaceRecord;
}

describe('odjezd-souhlas', () => {
  it('spočíá rozpis pozdního odjezdu', () => {
    expect(rozpisPozde('12:00')).toEqual({ kc: 300, pulhodin: 4 });
  });

  it('složí text souhlasu', () => {
    expect(textSouhlasuOdjezdu('12:00', 300, 'cs')).toContain('12:00');
    expect(textSouhlasuOdjezdu('12:00', 300, 'cs')).toContain('300');
  });

  it('pozná nezaplacené čekající prodloužení', () => {
    const r = rec({
      zadostOdjezd: {
        cas: '12:00',
        kc: 300,
        stav: 'ceka',
        kdy: '2026-11-19T08:00:00.000Z',
        od: 'pruvodce',
        hned: true,
        upozorneno: false,
        kanal: 'whatsapp',
      },
    });
    expect(nevybraneProdlouzeni(r)).toEqual({ cas: '12:00', kc: 300, stav: 'ceka' });
  });

  it('najde upomínku 10 min před převzetím jiného bytu', () => {
    const now = new Date('2026-11-19T09:52:00.000Z'); // 10:52 Praha (CET)
    const odjizdi = rec({
      rezervace: '2',
      apartman: 'V3',
      jmeno: 'Petr Svoboda',
      odjezd: '2026-11-19',
      casOdjezdu: '11:00',
    });
    const zustava = rec({
      rezervace: '3',
      apartman: 'V2',
      jmeno: 'Jan Novák',
      prijezd: '2026-11-18',
      odjezd: '2026-11-19',
      casOdjezdu: '12:00',
      predano: '2026-11-18T15:00:00.000Z',
      zadostOdjezd: {
        cas: '12:00',
        kc: 300,
        stav: 'ceka',
        kdy: '2026-11-18T20:00:00.000Z',
        od: 'pruvodce',
        hned: true,
        upozorneno: false,
        kanal: 'whatsapp',
      },
    });
    const ven = najdiVyberyProdlouzeni([odjizdi, zustava], now);
    expect(ven).toHaveLength(1);
    expect(ven[0].kdo.rezervace).toBe('3');
    expect(ven[0].kc).toBe(300);
    expect(ven[0].text).toContain('V2');
  });

  it('u hosta co ještě nepřijel (Lackner) výběr peněz nehlásí', () => {
    const now = new Date('2026-11-19T09:52:00.000Z');
    const odjizdi = rec({
      rezervace: '2',
      apartman: 'V3',
      odjezd: '2026-11-19',
      casOdjezdu: '11:00',
    });
    const lackner = rec({
      rezervace: 'lackner',
      apartman: 'V1',
      jmeno: 'Melanie Lackner',
      prijezd: '2026-11-25',
      odjezd: '2026-11-27',
      casOdjezdu: '11:00',
      predano: null,
      naMiste: null,
      zadostOdjezd: {
        cas: '11:00',
        kc: 150,
        stav: 'potvrzeno',
        kdy: '2026-11-18T10:00:00.000Z',
        od: 'pruvodce',
        hned: true,
        upozorneno: true,
        kanal: 'whatsapp',
      },
      priplatekPozde: 150,
    });
    expect(najdiVyberyProdlouzeni([odjizdi, lackner], now)).toEqual([]);
  });
});
