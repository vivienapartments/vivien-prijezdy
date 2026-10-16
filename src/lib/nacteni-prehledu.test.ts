import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dnesek } from '@/app/prehled/Dnesek';
import { hostZRezervace, sestavDnesek } from './dnesek';
import { buildPrehledSOdkazy } from './prehled-odkazy';
import { kartaNelzeNacist } from './prehled';
import { casVPraze } from './brana';
import { upozorniDnes } from './dnesek-upozorneni';
import { upozorniOdjezdy } from './odjezd-upozorneni';
import { prazdnaRezervace, UpstashProcessStore, type ProcessStore, type RezervaceRecord } from './store';

const NOW = new Date('2026-10-16T06:00:00.000Z');

function hostitel(id: string): RezervaceRecord {
  return {
    ...prazdnaRezervace(id, '2026-10-16T06:00:00.000Z'),
    apartman: 'V1',
    prijezd: '2026-10-16',
    odjezd: '2026-10-18',
    noci: 2,
    osob: 2,
    jmeno: 'Jan Novák',
    stav: 'odeslano',
    emailHosta: 'jan@example.com',
    jazyk: 'cs',
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('načtení přehledu 16. 10. 2026', () => {
  it('Upstash SCAN bere jen text a rozbitá karta neshodí ostatní', async () => {
    const tela: unknown[][] = [];
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      const args = JSON.parse(String(init?.body || '[]')) as unknown[];
      tela.push(args);
      if (args.some((arg) => typeof arg === 'number')) {
        return new Response(JSON.stringify({ error: 'ERR value is not an integer or out of range' }), { status: 400 });
      }
      if (args[0] === 'SCAN') {
        return new Response(JSON.stringify({ result: ['0', ['rez:1001', 'rez:1002']] }), { status: 200 });
      }
      if (args[0] === 'MGET') {
        const hodnoty = (args.slice(1) as string[]).map((klic) =>
          klic === 'rez:1001' ? JSON.stringify(hostitel('1001')) : '{',
        );
        return new Response(JSON.stringify({ result: hodnoty }), { status: 200 });
      }
      return new Response(JSON.stringify({ result: null }), { status: 200 });
    });

    const store = new UpstashProcessStore('https://example.upstash.io', 'token');
    const radky = await buildPrehledSOdkazy(store, NOW);

    expect(tela.some((args) => args.some((arg) => typeof arg === 'number'))).toBe(false);
    expect(tela.some((args) => args[0] === 'SCAN' && args.includes('100'))).toBe(true);
    expect(tela.filter((args) => args[0] === 'MGET')).toHaveLength(1);
    expect(tela.some((args) => args[0] === 'GET')).toBe(false);
    expect(radky.some((r) => r.rezervace === '1001' && r.jmeno === 'Jan Novák' && !r.nelzeNacist)).toBe(true);
    expect(radky.some((r) => r.rezervace === '1002' && r.nelzeNacist)).toBe(true);
  });

  it('když SCAN stejně vrátí 400, seznam dojde přes KEYS', async () => {
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      const args = JSON.parse(String(init?.body || '[]')) as unknown[];
      if (args[0] === 'SCAN') {
        return new Response(JSON.stringify({ error: 'ERR syntax error' }), { status: 400 });
      }
      if (args[0] === 'KEYS') {
        return new Response(JSON.stringify({ result: ['rez:1001'] }), { status: 200 });
      }
      if (args[0] === 'MGET') {
        return new Response(JSON.stringify({ result: [JSON.stringify(hostitel('1001'))] }), { status: 200 });
      }
      return new Response(JSON.stringify({ result: null }), { status: 200 });
    });

    const store = new UpstashProcessStore('https://example.upstash.io', 'token');
    const radky = await buildPrehledSOdkazy(store, NOW);
    expect(radky.map((r) => r.rezervace)).toEqual(['1001']);
  });

  it('sestavDnesek nechá ostatní hosty, když jeden záznam hodí chybu', () => {
    const dobry = hostZRezervace(hostitel('1001'));
    const spatny = hostZRezervace(hostitel('1002'));
    Object.defineProperty(spatny, 'odjezd', {
      get() {
        throw new Error('rozbity zaznam');
      },
    });
    const pohled = sestavDnesek([spatny, dobry], '2026-10-16');
    expect(pohled.chyby).toEqual(['1002']);
    expect(pohled.prijezdy.map((r) => r.rezervace)).toEqual(['1001']);
  });

  it('červená věta u karty, která se nenačetla', () => {
    const html = renderToStaticMarkup(
      createElement(Dnesek, {
        radky: [kartaNelzeNacist('1002')],
        dnes: '2026-10-16',
      }),
    );
    expect(html).toContain('Kartu 1002 se nepodařilo načíst');
  });

  it('sto klíčů je jedna dávka MGET, sto jedna jsou dvě, druhé čtení už nevolá Upstash', async () => {
    const klice = Array.from({ length: 101 }, (_, i) => `rez:${i + 1}`);
    let mget = 0;
    let scan = 0;
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      const args = JSON.parse(String(init?.body || '[]')) as unknown[];
      if (args[0] === 'SCAN') {
        scan += 1;
        return new Response(JSON.stringify({ result: ['0', klice] }), { status: 200 });
      }
      if (args[0] === 'MGET') {
        mget += 1;
        const hodnoty = (args.slice(1) as string[]).map((klic) =>
          JSON.stringify(hostitel(String(klic).slice(4))),
        );
        return new Response(JSON.stringify({ result: hodnoty }), { status: 200 });
      }
      return new Response(JSON.stringify({ result: null }), { status: 200 });
    });
    const store = new UpstashProcessStore('https://example.upstash.io', 'token');
    const prvni = await store.listRezervace();
    const druhy = await store.listRezervace();
    expect(prvni).toHaveLength(101);
    expect(druhy).toHaveLength(101);
    expect(scan).toBe(1);
    expect(mget).toBe(2);
    expect(store.pocetPrikazu()).toBe(3);
  });

  it('při vyčerpaném limitu se nezkouší druhý příkaz', async () => {
    const tela: string[] = [];
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      const args = JSON.parse(String(init?.body || '[]')) as string[];
      tela.push(String(args[0]));
      return new Response(
        JSON.stringify({
          error: 'ERR max requests limit exceeded. Limit: 500000, Usage: 500000.',
        }),
        { status: 400 },
      );
    });
    const store = new UpstashProcessStore('https://example.upstash.io', 'token');
    await expect(store.listRezervace()).rejects.toThrow(/max requests limit exceeded/);
    expect(tela).toEqual(['SCAN']);
  });

  it('před 7:30 ranní přehled nesahá do úložiště a před 11:00 se nečte běh odjezdů', async () => {
    const store = {
      async listRezervace() {
        throw new Error('seznam');
      },
      async getOdjezdBeh() {
        throw new Error('beh');
      },
    } as unknown as ProcessStore;
    expect(await upozorniDnes(store, casVPraze('2026-10-16', 7, 0))).toBe(0);
    const dopoledne = {
      async listRezervace() {
        return [];
      },
      async getOdjezdBeh() {
        throw new Error('beh');
      },
    } as unknown as ProcessStore;
    expect(await upozorniOdjezdy(dopoledne, casVPraze('2026-10-16', 10, 0), async () => 'nic')).toBe(0);
  });
});
