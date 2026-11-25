import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  jePoznamkaMistoJmena,
  nahledImportuBhCsv,
  parsujBhCsv,
  parsujCenuBh,
} from './klub-import-bh-csv';
import { VYCHOZI_KLUB_PRAVIDLA } from './klub-pravidla';

const CSV_PATH = path.join(process.cwd(), '.data/import/BH_export_prime_2026-11-25.csv');

describe('klub-import-bh-csv', () => {
  it('parsuje cenu s mezerou a čárkou', () => {
    expect(parsujCenuBh('1 640,00 Kč')).toEqual({ castka: 1640, mena: 'CZK' });
    expect(parsujCenuBh('8 050,00 Kč').castka).toBe(8050);
    expect(parsujCenuBh('178,26 €')).toEqual({ castka: 178, mena: 'EUR' });
  });

  it('pozná poznámku místo jména', () => {
    expect(jePoznamkaMistoJmena('FLIDR DOHROMADY CENA 5800')).toBe(true);
    expect(jePoznamkaMistoJmena('RODICE TELEFON PLATBA HOTOVE')).toBe(true);
    expect(jePoznamkaMistoJmena('anna')).toBe(false);
    expect(jePoznamkaMistoJmena('sobcak')).toBe(false);
  });

  it('náhled z BH exportu: Anna, firmy, kontrola 10099', () => {
    if (!fs.existsSync(CSV_PATH)) return;
    const text = fs.readFileSync(CSV_PATH, 'utf8');
    const nahled = nahledImportuBhCsv(text, [], VYCHOZI_KLUB_PRAVIDLA);

    const anna = nahled.souhrn.find((s) => /nirenberh/i.test(s.host));
    expect(anna).toBeTruthy();
    expect(anna!.utrata).toBe(1630 + 8050 + 1540);
    expect(anna!.pocet).toBe(3);

    const egd = nahled.souhrn.find((s) => /eg\.?d/i.test(s.host));
    expect(egd).toBeTruthy();
    expect(egd!.akce).toBe('firma');

    expect(nahled.kontrola.some((r) => r.castka === 10099)).toBe(true);
    expect(nahled.kontrola.some((r) => /flidr/i.test(r.oznaceni))).toBe(true);
    expect(nahled.kontrola.some((r) => r.mena === 'EUR')).toBe(true);

    const cekaSobcak = nahled.cekajici.find((s) => /sobcak/i.test(s.host));
    expect(cekaSobcak || nahled.souhrn.some((s) => /sobčák|sobcak/i.test(s.host))).toBeTruthy();

    expect(parsujBhCsv(text).length).toBeGreaterThan(20);
  });
});
