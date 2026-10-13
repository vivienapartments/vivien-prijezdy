import { describe, expect, it } from 'vitest';
import { prazdnaRezervace, type RezervaceRecord } from './store';
import { sestavVizitku } from './vizitka';

function host(patch: Partial<RezervaceRecord>): RezervaceRecord {
  return { ...prazdnaRezervace('1', '2026-10-11T06:00:00.000Z'), ...patch };
}

describe('vizitka hosta', () => {
  it('má jméno, upravený telefon a diakritiku', () => {
    const vcf = sestavVizitku(
      host({
        rezervace: '8004',
        jmeno: 'Eva Dvořáková',
        krestni: 'Eva',
        apartman: 'V3',
        prijezd: '2026-10-12',
        odjezd: '2026-10-15',
        emailHosta: 'eva.ukazka@example.com',
        telefonRezervace: '+420777123456',
        telefonRezervacePuvodni: '777 123 456',
      }),
    );
    expect(vcf).not.toBeNull();
    expect(vcf?.telo.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n')).toBe(true);
    expect(vcf?.telo).toContain('N:;Eva Dvořáková · V3 · 12.–15.10.;;;');
    expect(vcf?.telo).toContain('FN:Eva Dvořáková · V3 · 12.–15.10.');
    expect(vcf?.telo).not.toContain('ORG:');
    expect(vcf?.telo).not.toContain('TITLE:');
    expect(vcf?.telo).toContain('TEL;TYPE=CELL:+420777123456');
    expect(vcf?.telo).not.toContain('777 123 456');
    expect(vcf?.telo).toContain('EMAIL:eva.ukazka@example.com');
    expect(vcf?.telo).toContain('NOTE:Večerní elegance (V3)\\n12. 10. → 15. 10.\\n#8004');
    expect(vcf?.telo).toContain('ř');
    expect(vcf?.telo).not.toContain('=C5');
    expect(vcf?.soubor).toBe('Eva-Dvorakova-V3-12.-15.10.vcf');
    expect(vcf?.souborUtf).toBe('Eva Dvořáková · V3 · 12.–15.10.vcf');
  });

  it('přidá druhé číslo a bez jména použije číslo rezervace', () => {
    const dve = sestavVizitku(
      host({
        jmeno: 'Anna Svobodová',
        krestni: 'Anna',
        apartman: 'V1',
        prijezd: '2026-10-12',
        telefon: '+420777111222',
        telefonRezervace: '+420777123456',
      }),
    );
    expect(dve?.telo).toContain('TEL;TYPE=CELL:+420777111222');
    expect(dve?.telo).toContain('TEL;TYPE=CELL:+420777123456');
    expect(dve?.telo.match(/TEL;TYPE=CELL:/g)).toHaveLength(2);

    const stejne = sestavVizitku(
      host({
        jmeno: 'Anna Svobodová',
        krestni: 'Anna',
        telefon: '+420 777 111 222',
        telefonRezervace: '+420777111222',
      }),
    );
    expect(stejne?.telo.match(/TEL;TYPE=CELL:/g)).toHaveLength(1);
    expect(stejne?.telo).toContain('TEL;TYPE=CELL:+420777111222');

    const bezJmena = sestavVizitku(
      host({
        rezervace: '9003',
        jmeno: null,
        apartman: 'V5',
        prijezd: '2026-10-12',
        telefon: '+420777333444',
        emailHosta: null,
      }),
    );
    expect(bezJmena?.telo).toContain('N:;9003 · V5 · 12.10.;;;');
    expect(bezJmena?.telo).toContain('FN:9003 · V5 · 12.10.');
    expect(bezJmena?.telo).not.toContain('EMAIL');
    expect(sestavVizitku(host({ jmeno: 'Eva', telefon: null, telefonRezervace: null }))).toBeNull();
  });

  it('stejný měsíc zkrátí a přes měsíc nechá oba dny', () => {
    const stejny = sestavVizitku(
      host({
        jmeno: 'Jan Novák',
        apartman: 'V3',
        prijezd: '2026-10-12',
        odjezd: '2026-10-14',
        telefon: '+420777111222',
      }),
    );
    const text = 'Jan Novák · V3 · 12.–14.10.';
    expect(stejny?.telo).toContain(`N:;${text};;;`);
    expect(stejny?.telo).toContain(`FN:${text}`);

    const pres = sestavVizitku(
      host({
        jmeno: 'Jan Novák',
        apartman: 'V3',
        prijezd: '2026-10-30',
        odjezd: '2026-11-02',
        telefon: '+420777111222',
      }),
    );
    const dlouhy = 'Jan Novák · V3 · 30.10.–2.11.';
    expect(pres?.telo).toContain(`N:;${dlouhy};;;`);
    expect(pres?.telo).toContain(`FN:${dlouhy}`);
  });
});
