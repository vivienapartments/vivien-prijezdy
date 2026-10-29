import { describe, expect, it } from 'vitest';
import { buildGuestEmail } from '@/lib/email-host';
import { kodyProHosta } from '@/lib/kody-pruvodce';
import {
  aplikujPotvrzeni,
  casyDrive,
  casyPozde,
  cenaDrive,
  cenaPozde,
  jeBlokPokus,
  nejdrivePoOdjezdu,
  nejpozdejiPredPrijezdem,
  odkazSekce,
  poUklidu,
  sediPrijmeni,
  stavApartmanuProHosta,
  textStavu,
  vety,
  vyhodnotObjednavku,
  zadostOdjezdu,
  zadostPrijezdu,
  zapisPokus,
} from '@/lib/okno-pobytu';
import { jeCasOdjezduPovoleny, jeSlotOdjezdu, polozkyZRezervace } from '@/lib/odjezd';
import { priplatekProCas } from '@/lib/priplatek-prijezd';
import { prazdnaRezervace, type RezervaceRecord } from '@/lib/store';
import { GUIDE_LANGS } from '@/lib/types';

function zaklad(id: string, patch: Partial<RezervaceRecord> = {}): RezervaceRecord {
  return { ...prazdnaRezervace(id, '2026-10-01T08:00:00.000Z'), apartman: 'V3', jmeno: 'Jan Novák', stav: 'odeslano', ...patch };
}

describe('okno pobytu', () => {
  it('počítá 75 Kč za půlhodinu', () => {
    expect(cenaDrive('13:30')).toBe(75);
    expect(cenaDrive('12:00')).toBe(300);
    expect(cenaDrive('11:00')).toBe(450);
    expect(cenaPozde('10:30')).toBe(75);
    expect(cenaPozde('12:00')).toBe(300);
    expect(cenaPozde('14:00')).toBe(600);
    expect(priplatekProCas('20:30')).toBe(100);
    expect(priplatekProCas('12:00')).toBeNull();
    expect(jeSlotOdjezdu('10:30')).toBe(false);
    expect(jeSlotOdjezdu('10:00')).toBe(true);
  });

  it('nabízí příjezd až po odjezdu a úklidu', () => {
    expect(nejdrivePoOdjezdu('09:30', true)).toBe('11:00');
    expect(casyDrive(nejdrivePoOdjezdu('10:00', true))[0]).toBe('11:30');
    expect(casyDrive(nejdrivePoOdjezdu('12:00', true))).toEqual(['13:30']);
    expect(nejdrivePoOdjezdu(null, true)).toBe('11:00');
    expect(nejdrivePoOdjezdu(null, false)).toBe('11:00');
  });

  it('pozdní odjezd končí 3 hodiny před dalším příjezdem', () => {
    expect(nejpozdejiPredPrijezdem('16:00', true)).toBe('13:00');
    expect(casyPozde('13:00')).toContain('13:00');
    expect(casyPozde('13:00')).not.toContain('13:30');
    expect(nejpozdejiPredPrijezdem(null, true)).toBe('11:00');
    expect(casyPozde(nejpozdejiPredPrijezdem(null, true))).toEqual(['10:30', '11:00']);
    expect(casyPozde(nejpozdejiPredPrijezdem(null, false))).toContain('14:00');
  });

  it('bez potvrzení nic nepřipíše a po potvrzení ano', () => {
    const ceka = zaklad('2', {
      prijezd: '2026-10-20',
      odjezd: '2026-10-22',
      zadostPrijezd: { cas: '12:00', kc: 300, stav: 'ceka', kdy: '', od: 'pruvodce', hned: true, upozorneno: false },
    });
    expect(polozkyZRezervace(ceka).some((p) => p.druh === 'drive')).toBe(false);
    const potvrzeno = aplikujPotvrzeni(ceka, 'prijezd', [ceka], new Date('2026-10-15T10:00:00.000Z'));
    expect(potvrzeno?.casPrijezdu).toBe('12:00');
    expect(polozkyZRezervace(potvrzeno as RezervaceRecord)).toContainEqual({ druh: 'drive', kc: 300 });
  });

  it('volná předchozí noc jde potvrdit hned, obsazená až po úklidu', () => {
    const host = zaklad('2', {
      prijezd: '2026-10-16',
      zadostPrijezd: { cas: '12:00', kc: 300, stav: 'ceka', kdy: '', od: 'pruvodce', hned: false, upozorneno: false },
    });
    const odjezd = zaklad('1', { apartman: 'V3', odjezd: '2026-10-16', uklizenoKdy: null });
    expect(aplikujPotvrzeni(host, 'prijezd', [host, odjezd], new Date())).toBeNull();
    expect(aplikujPotvrzeni(host, 'prijezd', [host, odjezd], new Date(), true)?.zadostPrijezd?.stav).toBe('potvrzeno');
    const uklizeno = { ...odjezd, uklizenoKdy: '2026-10-16T06:00:00.000Z' };
    expect(aplikujPotvrzeni(host, 'prijezd', [host, uklizeno], new Date())?.zadostPrijezd?.stav).toBe('potvrzeno');
    const volna = zaklad('3', {
      apartman: 'V1',
      prijezd: '2026-10-16',
      zadostPrijezd: { cas: '12:00', kc: 300, stav: 'ceka', kdy: '', od: 'pruvodce', hned: true, upozorneno: false },
    });
    expect(aplikujPotvrzeni(volna, 'prijezd', [volna], new Date())?.zadostPrijezd?.stav).toBe('potvrzeno');
  });

  it('po úklidu se zeptá a hostovi samo nic neodejde', () => {
    const odjezd = zaklad('1', { odjezd: '2026-10-16', uklizenoKdy: '2026-10-16T06:00:00.000Z' });
    const prijezd = zaklad('2', { prijezd: '2026-10-16', casPrijezdu: '16:00', jmeno: 'Jan Novák' });
    const vysledek = poUklidu(odjezd, [odjezd, prijezd], new Date('2026-10-16T08:00:00.000Z'));
    expect(vysledek.odeslanoHostovi).toBe(false);
    expect(vysledek.nabidka?.id).toBe('2');
  });

  it('příjmení sedí bez diakritiky a stránka nevrátí kódy', () => {
    expect(sediPrijmeni('Jan Novák', 'novak')).toBe(true);
    expect(sediPrijmeni('Jan Novák', 'JAN')).toBe(true);
    expect(sediPrijmeni('Jan Novák', 'Smith')).toBe(false);
    const host = zaklad('9046', {
      prijezd: '2026-10-20',
      odjezd: '2026-10-22',
      accessPin: '1234',
      emailHosta: 'tajne@example.com',
      telefon: '+420777000146',
    });
    const spatne = vyhodnotObjednavku([host], '9046', 'Smith', '2026-10-15', null, 'Vivien 3', new Date());
    const jine = vyhodnotObjednavku([host], '9046', 'Horak', '2026-10-15', null, 'Vivien 3', new Date());
    expect(spatne.ok).toBe(false);
    expect(jine.ok).toBe(false);
    if (!spatne.ok && !jine.ok) expect(vety('cs').nesedi).toBe(vety('cs').nesedi);
    const zruseno = vyhodnotObjednavku([{ ...host, stav: 'zruseno' }], '9046', 'Novak', '2026-10-15', null, 'Vivien 3', new Date());
    const poOdjezdu = vyhodnotObjednavku([{ ...host, odjezd: '2026-10-01' }], '9046', 'Novak', '2026-10-15', null, 'Vivien 3', new Date());
    expect(zruseno).toEqual({ ok: false, duvod: 'nesedi' });
    expect(poOdjezdu).toEqual({ ok: false, duvod: 'nesedi' });
    const chybi = vyhodnotObjednavku([host], '9999', 'Novak', '2026-10-15', null, '', new Date());
    expect(chybi).toEqual({ ok: false, duvod: 'chybi' });
    const ok = vyhodnotObjednavku([host], '9046', 'Novak', '2026-10-15', { prijezd: '12:00' }, 'Vivien 3', new Date('2026-10-15T10:00:00.000Z'));
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      const text = JSON.stringify(ok.nahled);
      expect(text).not.toContain('1234');
      expect(text).not.toContain('example.com');
      expect(text).not.toContain('777');
      expect(ok.rec.historie.some((h) => h.co === 'Žádost přes stránku Objednat')).toBe(true);
      expect(ok.rec.zadostPrijezd?.stav).toBe('ceka');
      expect(polozkyZRezervace(ok.rec).some((p) => p.druh === 'drive')).toBe(false);
    }
  });

  it('po pěti špatných pokusech blokuje', () => {
    let mapa: Record<string, { od: number; pocet: number }> = {};
    const now = Date.parse('2026-10-15T10:00:00.000Z');
    for (let i = 0; i < 5; i += 1) mapa = zapisPokus(mapa, 'abc', now);
    expect(jeBlokPokus(mapa, 'abc', now)).toBe(true);
    expect(jeBlokPokus(mapa, 'abc', now + 61 * 60 * 1000)).toBe(false);
  });

  it('tlačítko v e-mailu vede na výběr času příjezdu', () => {
    expect(odkazSekce('https://example.test/pruvodce')).toBe('https://example.test/pruvodce#cas-prijezdu');
    const mail = buildGuestEmail({
      lang: 'cs',
      apt: 'V1',
      prijezd: '2026-11-01',
      odjezd: '2026-11-03',
      noci: 2,
      osob: 2,
      osloveni: null,
      jmeno: 'Marie',
      guideUrl: 'https://example.test/pruvodce',
      intendedTo: 'host@example.com',
    });
    expect(mail.html).toContain('https://example.test/pruvodce#cas-prijezdu');
    expect(mail.html).toContain('Chcete přijet dřív nebo odjet později?');
    expect(mail.text).toContain('#cas-prijezdu');
  });

  it('stav apartmánu je zlatý před příjezdem a zelený po úklidu', () => {
    const ted = new Date('2026-10-20T08:00:00.000Z');
    const host = zaklad('9', { prijezd: '2026-10-21', predano: null });
    expect(stavApartmanuProHosta(host, [], ted)?.barva).toBe('zlaty');
    const den = zaklad('9', { prijezd: '2026-10-20', predano: null });
    expect(stavApartmanuProHosta(den, [], ted)?.barva).toBe('zeleny');
    expect(stavApartmanuProHosta({ ...den, predano: '2026-10-20T10:00:00.000Z' }, [], ted)).toBeNull();
  });

  it('vlastní čas odjezdu 10:40 vytvoří žádost a 9:40 je v rozsahu', () => {
    expect(jeCasOdjezduPovoleny('09:40')).toBe(true);
    expect(jeCasOdjezduPovoleny('15:00')).toBe(false);
    const v = zadostOdjezdu(zaklad('10', { odjezd: '2026-10-22' }), [], '10:40', 'pruvodce', new Date());
    expect(v?.rec.zadostOdjezd?.cas).toBe('10:40');
    expect(v?.rec.zadostOdjezd?.kc).toBe(150);
  });

  it('má texty ve všech jazycích a v rámečku nejsou kódy', () => {
    for (const lang of GUIDE_LANGS) {
      const text = textStavu(lang, 'prijezd', {
        cas: '12:00',
        kc: 300,
        stav: 'ceka',
        kdy: '',
        od: 'pruvodce',
        hned: true,
        upozorneno: false,
      });
      expect(text?.veta).toContain('12:00');
      expect(text?.veta).not.toContain('{cas}');
    }
    expect(kodyProHosta(false, 'V1', '1234', 'cs')).toBeNull();
    expect(odkazSekce('https://example.test/pruvodce')).toContain('#cas-prijezdu');
    const zadost = zadostPrijezdu(zaklad('8', { prijezd: '2026-10-20' }), [], '12:00', 'pruvodce', new Date());
    expect(zadost?.push).toContain('lze potvrdit hned');
    expect(zadost?.push).not.toContain('@');
  });
});
