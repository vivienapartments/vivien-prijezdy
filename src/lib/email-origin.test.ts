import { describe, expect, it } from 'vitest';
import { verifyEmailOrigin } from './email-origin';

const BH_KLIC = 'test-bh-key-24chars!!ok';
const MAJITEL = 'info@vivienapartments.cz';

describe('verifyEmailOrigin', () => {
  it('cesta 1: Better Hotel + KLIC', () => {
    const r = verifyEmailOrigin({
      from: 'noreply@better-hotel.com',
      authenticationResults: 'dkim=pass header.d=better-hotel.com; spf=pass',
      body: `VIVIEN-DATA v1\nKLIC: ${BH_KLIC}\nKONEC`,
      bhKlic: BH_KLIC,
      majitelPreposilaZ: MAJITEL,
    });
    expect(r).toEqual({ ok: true, path: 1 });
  });

  it('cesta 2: přeposlání majitelem', () => {
    const r = verifyEmailOrigin({
      from: `VIVIEN <${MAJITEL}>`,
      authenticationResults: 'spf=pass smtp.mailfrom=vivienapartments.cz',
      body: '> VIVIEN-DATA v1\n> REZERVACE: 1\n> KONEC',
      bhKlic: BH_KLIC,
      majitelPreposilaZ: MAJITEL,
    });
    expect(r).toEqual({ ok: true, path: 2 });
  });

  it('odmítne podvrh se správným předmětem v těle', () => {
    const r = verifyEmailOrigin({
      from: 'utocnik@example.com',
      authenticationResults: 'dkim=pass header.d=example.com',
      body: `VIVIEN-DATA v1\nKLIC: ${BH_KLIC}\nKONEC`,
      bhKlic: BH_KLIC,
      majitelPreposilaZ: MAJITEL,
    });
    expect(r.ok).toBe(false);
  });
});
