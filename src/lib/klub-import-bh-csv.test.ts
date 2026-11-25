import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  eurNaKc,
  jePoznamkaMistoJmena,
  nahledImportuBhCsv,
  parsujBhCsv,
  parsujCenuBh,
  stavUtratyZTerminu,
} from './klub-import-bh-csv';
import { VYCHOZI_KLUB_PRAVIDLA } from './klub-pravidla';

const CSV_PATH = path.join(process.cwd(), '.data/import/BH_export_prime_2026-11-25.csv');

describe('klub-import-bh-csv', () => {
  it('parsuje cenu s mezerou a čárkou', () => {
    expect(parsujCenuBh('1 640,00 Kč')).toEqual({ castka: 1640, mena: 'CZK' });
    expect(parsujCenuBh('8 050,00 Kč').castka).toBe(8050);
    expect(parsujCenuBh('178,26 €')).toEqual({ castka: 178.26, mena: 'EUR' });
  });

  it('přepočte EUR na Kč (kurz 24,50)', () => {
    expect(eurNaKc(178.26)).toBe(Math.round(178.26 * 24.5));
  });

  it('stav útraty podle odjezdu', () => {
    expect(stavUtratyZTerminu('2026-11-20', '2026-11-25')).toBe('zapocteno');
    expect(stavUtratyZTerminu('2026-11-26', '2026-11-25')).toBe('ceka');
    expect(stavUtratyZTerminu('2026-11-25', '2026-11-25')).toBe('ceka');
  });

  it('pozná poznámku místo jména', () => {
    expect(jePoznamkaMistoJmena('FLIDR DOHROMADY CENA 5800')).toBe(true);
    expect(jePoznamkaMistoJmena('RODICE TELEFON PLATBA HOTOVE')).toBe(true);
    expect(jePoznamkaMistoJmena('anna')).toBe(false);
    expect(jePoznamkaMistoJmena('sobcak')).toBe(false);
  });

  it('náhled z BH exportu: Hromada, Sobčák, Angela, cutoff, firmy partner', () => {
    if (!fs.existsSync(CSV_PATH)) return;
    const text = fs.readFileSync(CSV_PATH, 'utf8');
    const dnes = '2026-11-25';
    const nahled = nahledImportuBhCsv(text, [], VYCHOZI_KLUB_PRAVIDLA, dnes);

    const anna = nahled.souhrn.find((s) => /nirenberh/i.test(s.host));
    expect(anna).toBeTruthy();
    expect(anna!.utrata).toBe(1630 + 8050 + 1540);
    expect(anna!.pocet).toBe(3);

    // EG.D karta firmy ne – Dominik Hromada host 9 600 Kč odbydlené
    expect(nahled.souhrn.some((s) => /eg\.?d/i.test(s.host) && s.akce === 'firma')).toBe(false);
    const hromada = nahled.souhrn.find((s) => /hromada/i.test(s.host));
    expect(hromada).toBeTruthy();
    expect(hromada!.akce).toBe('priradit');
    expect(hromada!.utrata).toBe(9600);
    expect(hromada!.uroven).toBe('Stálý host');
    expect(hromada!.pobyty.some((p) => p.stavUtraty === 'ceka')).toBe(true);

    // Sobčák: jeden host, ceny majitele, oba budoucí = modře
    const sobcak = nahled.souhrn.find((s) => /sobčák|sobcak/i.test(s.host));
    expect(sobcak).toBeTruthy();
    expect(sobcak!.pocet).toBe(2);
    expect(sobcak!.utrata).toBe(0);
    expect(sobcak!.utrataCeka).toBe(5000 + 4400);
    expect(sobcak!.pobyty.every((p) => p.stavUtraty === 'ceka')).toBe(true);
    expect(sobcak!.pobyty.map((p) => p.castka).sort()).toEqual([4400, 5000]);

    // Angela EUR → Kč, přiřazena (ne kontrola)
    const angela = nahled.souhrn.find((s) => /pohl|angela/i.test(s.host));
    expect(angela).toBeTruthy();
    expect(angela!.utrata + angela!.utrataCeka).toBe(eurNaKc(178.26));
    expect(nahled.kontrola.some((r) => /pohl|angela/i.test(`${r.cilJmeno} ${r.jmeno}`))).toBe(
      false,
    );

    // Příjezdy před 1. 5. 2026 pryč
    expect(nahled.radky.every((r) => !r.prijezd || r.prijezd.slice(0, 10) >= '2026-05-01')).toBe(
      true,
    );
    expect(nahled.kontrola.every((r) => !r.prijezd || r.prijezd.slice(0, 10) >= '2026-05-01')).toBe(
      true,
    );

    // Lancová: Booking 120260665 doplněn
    const lancova = nahled.souhrn.find((s) => /lancov/i.test(s.host));
    expect(lancova).toBeTruthy();
    expect(lancova!.rezervace).toContain('120260665');
    expect(lancova!.pocet).toBeGreaterThanOrEqual(2);

    // Firmy mají názvy „… partner“
    for (const f of nahled.souhrn.filter((s) => s.akce === 'firma')) {
      expect(f.uroven.toLowerCase()).toMatch(/partner/);
    }

    expect(nahled.kontrola.some((r) => /flidr/i.test(r.oznaceni))).toBe(true);

    expect(parsujBhCsv(text).length).toBeGreaterThan(20);
  });
});
