import { describe, expect, it } from 'vitest';
import { casVPraze } from './brana';
import { predmetZpravy, textEmailuHostovi } from './email-zprava';
import {
  klicPrijezdu,
  maUpozornitHodinu,
  maUpozornitNeznamy,
  textCasNeznamy,
  textHodinuPred,
  upozorniPrijezd,
} from './prijezd-upozorneni';
import { prazdnaRezervace, type ProcessStore, type RezervaceRecord } from './store';
import { zpravaNedojezdu } from './whatsapp-zprava';

const DEN = '2026-10-15';

function host(patch: Partial<RezervaceRecord> = {}): RezervaceRecord {
  return {
    ...prazdnaRezervace('1', '2026-10-01T00:00:00.000Z'),
    apartman: 'V3',
    jmeno: 'Jan Novák',
    prijezd: DEN,
    stav: 'odeslano',
    casPrijezdu: '16:30',
    ...patch,
  };
}

describe('upozornění hodinu před příjezdem', () => {
  const hodinuPred = casVPraze(DEN, 15, 30);
  const brzy = new Date(hodinuPred.getTime() - 60_000);
  const vOkne = new Date(hodinuPred.getTime() + 60_000);
  const uz = casVPraze(DEN, 16, 30);
  const rano = casVPraze(DEN, 9, 0);
  const predDevatou = new Date(rano.getTime() - 60_000);

  it('text je apartmán, příjmení a čas', () => {
    expect(textHodinuPred(host())).toBe('V3 Novák přijede kolem 16:30 (za hodinu)');
    expect(textCasNeznamy(host({ casPrijezdu: null }))).toBe('V3 Novák dnes přijíždí, čas neznámý');
  });

  it('pošle se jen v hodinovém okně a jen jednou na daný čas', () => {
    const rec = host();
    expect(maUpozornitHodinu(rec, brzy)).toBe(false);
    expect(maUpozornitHodinu(rec, vOkne)).toBe(true);
    expect(maUpozornitHodinu(rec, uz)).toBe(false);
    expect(maUpozornitHodinu({ ...rec, prijezdPushCas: klicPrijezdu(rec) }, vOkne)).toBe(false);
    expect(maUpozornitHodinu({ ...rec, casPrijezdu: '17:00', prijezdPushCas: klicPrijezdu(rec) }, casVPraze(DEN, 16, 10))).toBe(
      true,
    );
  });

  it('na místě, předaný a zrušený se neupozorňují', () => {
    expect(maUpozornitHodinu(host({ naMiste: '2026-10-15T13:00:00.000Z' }), vOkne)).toBe(false);
    expect(maUpozornitHodinu(host({ predano: '2026-10-15T13:00:00.000Z' }), vOkne)).toBe(false);
    expect(maUpozornitHodinu(host({ stav: 'zruseno' }), vOkne)).toBe(false);
  });

  it('v 9:00 v den příjezdu, když čas neznáme', () => {
    const bez = host({ casPrijezdu: null });
    expect(maUpozornitNeznamy(bez, predDevatou)).toBe(false);
    expect(maUpozornitNeznamy(bez, rano)).toBe(true);
    expect(maUpozornitNeznamy({ ...bez, prijezdPushNeznamy: DEN }, rano)).toBe(false);
    expect(maUpozornitNeznamy(host(), rano)).toBe(false);
    expect(maUpozornitNeznamy(host({ casPrijezdu: null, predano: '2026-10-15T08:00:00.000Z' }), rano)).toBe(false);
  });

  it('když push projde, zapíše se a podruhé už ne', async () => {
    let aktualni = host();
    const store = {
      async listRezervace() {
        return [{ id: '1', record: aktualni }];
      },
      async getRezervace() {
        return aktualni;
      },
      async setRezervace(_id: string, record: RezervaceRecord) {
        aktualni = record;
      },
      async listPush() {
        return [];
      },
      async savePush() {
        return undefined;
      },
    } as unknown as ProcessStore;
    const posli = async () => 'push' as const;
    expect(await upozorniPrijezd(store, vOkne, posli)).toBe(1);
    expect(aktualni.prijezdPushCas).toBe('2026-10-15 16:30');
    expect(aktualni.historie.at(-1)?.co).toContain('V3 Novák přijede kolem 16:30 (za hodinu)');
    expect(await upozorniPrijezd(store, vOkne, posli)).toBe(0);
  });

  it('hodinu před příjezdem běží i před 9:00', async () => {
    let aktualni = host({ casPrijezdu: '08:30' });
    const okno = new Date(casVPraze(DEN, 7, 30).getTime() + 60_000);
    const store = {
      async listRezervace() {
        return [{ id: '1', record: aktualni }];
      },
      async getRezervace() {
        return aktualni;
      },
      async setRezervace(_id: string, record: RezervaceRecord) {
        aktualni = record;
      },
    } as unknown as ProcessStore;
    expect(maUpozornitHodinu(aktualni, okno)).toBe(true);
    expect(await upozorniPrijezd(store, okno, async () => 'push')).toBe(1);
    expect(aktualni.prijezdPushCas).toBe('2026-10-15 08:30');
  });
});

describe('e-mail se zprávou hostovi', () => {
  it('předmět je podle zprávy a text má podpis i číslo', () => {
    expect(predmetZpravy('nedojezd', 'cs', '2026-10-15')).toBe('VIVIEN · Váš příjezd 15. 10. 2026');
    expect(predmetZpravy('checkin', 'es', '2026-10-15')).toBe('VIVIEN · Check-in en línea 15. 10. 2026');
    const text = textEmailuHostovi(zpravaNedojezdu('cs'));
    expect(text).toContain('Nikol a rodina VIVIEN');
    expect(text).toContain('604');
    expect(textEmailuHostovi('Dobrý den.\n\nNikol a rodina VIVIEN')).toContain('+420 604 692 573');
  });
});
