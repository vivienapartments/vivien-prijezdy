import { describe, expect, it } from 'vitest';
import { novyVyjezd, soucetVyjezdu, vratPosledniVyjezd } from './priplatek-prijezd';
import { ARCHIV_PRAVIDEL, otisk, slozitPravidlaCs, zneniVerze } from './pravidla-verze';

describe('verze pravidel příjezdu', () => {
  it('dnešní text je poslední verze a starší znění zůstává', () => {
    const aktualni = slozitPravidlaCs();
    const posledni = ARCHIV_PRAVIDEL[ARCHIV_PRAVIDEL.length - 1];
    expect(posledni.cs).toBe(aktualni);
    expect(posledni.verze).toBe(otisk(aktualni));
    expect(posledni.cs).toContain('čekáme my na vás');
    expect(posledni.cs).toContain('čekáte vy na nás');
    expect(posledni.cs).toContain('přijet znovu');
    expect(posledni.cs).toContain('300 Kč');
    expect(posledni.cs).toContain('100 Kč za každou započatou půlhodinu');
    expect(ARCHIV_PRAVIDEL[2].cs).toContain('příplatek podle skutečného příjezdu');
    expect(ARCHIV_PRAVIDEL[1].cs).toContain('Asi 15 minut');
    expect(ARCHIV_PRAVIDEL[1].cs).toContain('Bez času předem');
    expect(ARCHIV_PRAVIDEL[0].cs).not.toContain('přijet znovu');
    expect(ARCHIV_PRAVIDEL[0].verze).not.toBe(posledni.verze);
    expect(zneniVerze(ARCHIV_PRAVIDEL[0].verze)).toBe(ARCHIV_PRAVIDEL[0].cs);
  });
});

describe('opakovaný výjezd', () => {
  it('každý výjezd je zvlášť a vrácení sundá jen poslední', () => {
    const prvni = novyVyjezd('2026-10-14T10:00:00.000Z');
    const druhy = novyVyjezd('2026-10-14T12:00:00.000Z');
    expect(prvni.id).not.toBe(druhy.id);
    expect(soucetVyjezdu([prvni, druhy])).toBe(600);
    expect(vratPosledniVyjezd([prvni, druhy])).toEqual([prvni]);
  });
});
