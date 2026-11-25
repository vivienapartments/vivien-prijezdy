import { describe, expect, it } from 'vitest';
import {
  castkaUtratyZRezervace,
  jePrimaZdroj,
  jeZaplacenoProUtratu,
  nahledImportuUtratyXlsx,
} from './klub-utrata';
import { VYCHOZI_KLUB_PRAVIDLA } from './klub-pravidla';
import * as XLSX from 'xlsx';

describe('klub-utrata', () => {
  it('pozná přímý zdroj a zaplacení', () => {
    expect(jePrimaZdroj('přímá')).toBe(true);
    expect(jePrimaZdroj('Booking')).toBe(false);
    expect(jeZaplacenoProUtratu({ saldoKc: 0, zaplaceno: null, platby: [] })).toBe(true);
    expect(jeZaplacenoProUtratu({ saldoKc: 500, zaplaceno: null, platby: [] })).toBe(false);
    expect(jeZaplacenoProUtratu({ saldoKc: null, zaplaceno: '2026-11-01', platby: [] })).toBe(true);
    expect(castkaUtratyZRezervace({ cenaPobytu: 4500.4 })).toBe(4500);
  });

  it('náhled xlsx bere jen přímé řádky', () => {
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet([
      { Jméno: 'Jan Novák', Telefon: '+420604111222', Email: 'jan@example.com', Cena: 5000, Agentura: '' },
      { Jméno: 'Booking Host', Telefon: '', Email: 'x@guest.booking.com', Cena: 3000, Agentura: 'Booking.com' },
      { Jméno: 'Eva', Telefon: '777888999', Email: 'eva@seznam.cz', Cena: 2000, Agentura: 'přímá' },
    ]);
    XLSX.utils.book_append_sheet(wb, sheet, 'Rez');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const nahled = nahledImportuUtratyXlsx(buf, [], VYCHOZI_KLUB_PRAVIDLA);
    expect(nahled.radky.length).toBe(2);
    expect(nahled.souhrn.length).toBeGreaterThanOrEqual(1);
    expect(nahled.primaHoste.length).toBeGreaterThanOrEqual(1);
  });
});
