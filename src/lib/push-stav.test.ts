import { describe, expect, it, vi } from 'vitest';
import {
  HLASKA_NENASTAVENO,
  HLASKA_NESPAROVANO,
  HLASKA_READY_TIMEOUT,
  HLASKA_ZAPNUTO,
  hlaskaChybyZapnuti,
  hlaskaNacteniPush,
  jeSparovano,
  nactiLokalniOdberZeSw,
  nadpisPushSekce,
  radekDiagnostikyPush,
  sTimeoutem,
  textPovoleni,
} from './push-stav';

describe('push-stav', () => {
  it('jeSparovano podle endpointu', () => {
    expect(jeSparovano('a', [{ endpoint: 'a' }, { endpoint: 'b' }])).toBe(true);
    expect(jeSparovano('c', [{ endpoint: 'a' }])).toBe(false);
    expect(jeSparovano('', [{ endpoint: 'a' }])).toBe(false);
    expect(jeSparovano(null, [{ endpoint: 'a' }])).toBe(false);
  });

  it('texty povolení a diagnostiky', () => {
    expect(textPovoleni('granted')).toBe('ano');
    expect(textPovoleni('denied')).toBe('ne');
    expect(textPovoleni('neurceno')).toBe('neurčeno');
    expect(
      radekDiagnostikyPush({ povoleni: 'granted', odber: true, sparovano: false }),
    ).toBe('Povolení: ano · Odběr v prohlížeči: ano · Spárováno se serverem: ne');
  });

  it('hlášky zapnutí a načtení', () => {
    expect(HLASKA_ZAPNUTO).toMatch(/zapnutá/i);
    expect(HLASKA_NESPAROVANO).toMatch(/nespároval/i);
    expect(HLASKA_NENASTAVENO).toMatch(/VAPID/);
    expect(HLASKA_READY_TIMEOUT).toMatch(/nepřipravil/i);
    expect(hlaskaNacteniPush(401)).toContain('401');
    expect(hlaskaNacteniPush('sit')).toMatch(/síť/);
    expect(hlaskaChybyZapnuti(new DOMException('x', 'AbortError'))).toContain('AbortError');
    expect(hlaskaChybyZapnuti('x')).toMatch(/Zkuste znovu/);
  });

  it('nadpis sekce', () => {
    expect(nadpisPushSekce({ sparovano: false, nazev: 'Pravoslav' }).varovani).toBe(true);
    expect(nadpisPushSekce({ sparovano: false, nazev: 'Pravoslav' }).text).toMatch(
      /nedostává/,
    );
    expect(nadpisPushSekce({ sparovano: true, nazev: 'Pravoslav' }).text).toBe(
      '⚙ Telefon a upozornění · Pravoslav ✓',
    );
  });

  it('sTimeoutem vrátí hodnotu nebo timeout', async () => {
    await expect(sTimeoutem(Promise.resolve(1), 50, () => 9)).resolves.toBe(1);
    await expect(
      sTimeoutem(new Promise<number>(() => {}), 20, () => 7),
    ).resolves.toBe(7);
  });

  it('nactiLokalniOdber bez registrace nesáhne na ready a vrátí false', async () => {
    const getRegistration = vi.fn(async () => undefined);
    const vysledek = await nactiLokalniOdberZeSw({ getRegistration }, 100);
    expect(vysledek).toEqual({ odber: false, endpoint: null });
    expect(getRegistration).toHaveBeenCalledWith('/prehled/');
  });

  it('nactiLokalniOdber při visícím getRegistration skončí timeoutem', async () => {
    const getRegistration = vi.fn(() => new Promise<undefined>(() => {}));
    const vysledek = await nactiLokalniOdberZeSw({ getRegistration }, 30);
    expect(vysledek).toEqual({ odber: false, endpoint: null });
  });

  it('nactiLokalniOdber přečte endpoint z registrace', async () => {
    const getRegistration = vi.fn(async () => ({
      pushManager: {
        getSubscription: async () => ({ endpoint: 'https://push.example/x' }),
      },
    }));
    const vysledek = await nactiLokalniOdberZeSw({ getRegistration }, 100);
    expect(vysledek).toEqual({ odber: true, endpoint: 'https://push.example/x' });
  });
});
