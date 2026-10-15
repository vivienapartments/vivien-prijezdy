import fs from 'fs';
import os from 'os';
import path from 'path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ListaZpet } from '@/components/ListaZpet';
import { DOTAZ_PREDANI_MS, odkazPruvodceMajitele, odkazZpetDoPrehledu } from './pruvodce-majitel';
import { jeUkazkaPruvodce, nactiStavPruvodce, rezervaceProMajitele } from './pruvodce-stav';
import { FileProcessStore, prazdnaRezervace } from './store';
import { createToken } from './token';

const SECRET = 'test-secret-at-least-32-bytes-long!!';
process.env.PRUVODCE_TOKEN_SECRET = SECRET;

function storeTmp(): FileProcessStore {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stav-'));
  return new FileProcessStore(path.join(dir, 'store.json'));
}

describe('průvodce hosta z přehledu', () => {
  it('bez přihlášení se záznam nenačte', async () => {
    const store = storeTmp();
    const id = '120260900';
    await store.setRezervace(id, {
      ...prazdnaRezervace(id, '2026-10-14T00:00:00.000Z'),
      apartman: 'V1',
      jazyk: 'cs',
    });
    const rec = await rezervaceProMajitele({
      prihlasen: false,
      id,
      ukazka: false,
      store,
    });
    expect(rec).toBeNull();
    expect((await store.getRezervace(id))?.otevrenoPocet ?? 0).toBe(0);
  });

  it('ukázka na ostrém webu nic neotevře', () => {
    const drive = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    expect(jeUkazkaPruvodce('1')).toBe(false);
    process.env.NODE_ENV = drive;
  });

  it('lišta vede zpět na řádek hosta', () => {
    expect(odkazZpetDoPrehledu('9001')).toBe('/prehled#9001');
    expect(odkazPruvodceMajitele('9001')).toBe('/prehled/host/9001');
    const html = renderToStaticMarkup(createElement(ListaZpet, { id: '9001' }));
    expect(html).toContain('href="/prehled#9001"');
    expect(html).toContain('Zpět do přehledu');
  });
});

describe('dotaz na předání', () => {
  it('ptá se každých 20 vteřin', () => {
    expect(DOTAZ_PREDANI_MS).toBe(20_000);
  });

  it('před předáním kódy nevrátí a otevření nepočítá', async () => {
    const store = storeTmp();
    const id = '120260901';
    await store.setRezervace(id, {
      ...prazdnaRezervace(id, '2026-10-14T00:00:00.000Z'),
      apartman: 'V1',
      jazyk: 'cs',
      otevrenoPocet: 2,
    });
    const token = createToken({ r: id, a: 'V1', d: '2099-12-31', l: 'cs', i: '1111' }, SECRET);
    const stav = await nactiStavPruvodce(store, token);
    expect(stav).toEqual({ ok: true, predano: false, kody: null });
    expect((await store.getRezervace(id))?.otevrenoPocet).toBe(2);
  });

  it('po předání vrátí kódy a otevření pořád nepočítá', async () => {
    const store = storeTmp();
    const id = '120260902';
    await store.setRezervace(id, {
      ...prazdnaRezervace(id, '2026-10-14T00:00:00.000Z'),
      apartman: 'V1',
      jazyk: 'cs',
      otevrenoPocet: 1,
      predano: '2026-10-14T12:00:00.000Z',
    });
    const token = createToken({ r: id, a: 'V1', d: '2099-12-31', l: 'cs', i: '1111' }, SECRET);
    const stav = await nactiStavPruvodce(store, token);
    expect(stav.ok).toBe(true);
    if (!stav.ok || !stav.predano) throw new Error('kódy se po předání nevrátily');
    expect(stav.kody.length).toBeGreaterThan(0);
    expect(stav.kody.some((radek) => radek.value.includes('1111'))).toBe(true);
    expect((await store.getRezervace(id))?.otevrenoPocet).toBe(1);
  });

  it('neplatný token nic nevrátí', async () => {
    const store = storeTmp();
    const stav = await nactiStavPruvodce(store, 'nic');
    expect(stav.ok).toBe(false);
  });
});
