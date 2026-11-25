import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { FileProcessStore } from './store';
import { migrujDopNaKlienty, nactiKlientPodleKodu, seznamKlientu } from './klient-karta';

function tmpStore(): FileProcessStore {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'klient-'));
  return new FileProcessStore(path.join(dir, 'store.json'));
}

describe('klient-karta migrace', () => {
  it('zkopíruje dop kartu a originál nechá', async () => {
    const store = tmpStore();
    const dop = {
      kod: 'petr7',
      tajnyKlic: 'tajny-test-klic-123456',
      datumZalozeni: '2026-11-01T10:00:00.000Z',
      typ: 'host',
      vznik: 'po-odjezdu',
      stav: 'aktivni',
      jmeno: 'Petr',
      prijmeni: 'Novak',
      email: 'petr@example.com',
      telefon: '+420604111222',
      jazyk: 'cs',
      rezervace: ['120260001'],
      firma: null,
      vyplata: { zpusob: null, ucetHash: null, ucetMaska: null, majitelUctu: '', fakturuje: null },
      souhlasy: { podminky: null, zpracovaniUdaju: null, novinky: null },
      doporuceni: [],
      penize: { ceka: 0, kVyplate: 150, vyplacenoCelkem: 0, historieVyplat: [] },
      statistiky: {
        odeslaneEmaily: 0,
        otevreniWhatsApp: 0,
        kopirovani: 0,
        kliknutiNaOdkaz: 0,
        poptavky: 0,
        potvrzene: 0,
        probehle: 0,
      },
      poznamka: '',
      zalozil: 'test',
    };
    await store.setKv('dop:petr7', JSON.stringify(dop));
    await store.setKv('dop-seznam', JSON.stringify(['petr7']));

    const vysledek = await migrujDopNaKlienty(store);
    expect(vysledek.zkopirovano).toBe(1);
    expect(vysledek.kolizeKodu).toBe(0);

    const orig = await store.getKv('dop:petr7');
    expect(orig).toBeTruthy();

    const klient = await nactiKlientPodleKodu(store, 'PETR7');
    expect(klient?.jmeno).toBe('Petr');
    expect(klient?.dopKodPuvod).toBe('petr7');
    expect(klient?.kreditKc).toBe(150);
    expect((await seznamKlientu(store)).length).toBe(1);

    const znovu = await migrujDopNaKlienty(store);
    expect(znovu.zkopirovano).toBe(0);
    expect(znovu.kolizeKodu).toBe(1);
  });
});
