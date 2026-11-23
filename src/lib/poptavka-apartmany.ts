/**
 * Fotky a odkazy z veřejného webu (ne kopírujeme do příjezdů).
 * Titulní snímky = stejné jako na vivienapartments.cz.
 */

import type { AptId } from './types';

const WEB = 'https://www.vivienapartments.cz';

export type PoptavkaAptInfo = {
  id: AptId;
  slug: string;
  /** Relativní cesta pod /{lang}/ (Angular base href). */
  coverPath: string;
  galeriePaths: string[];
  stranka: (langKod: string) => string;
};

function asset(langKod: string, path: string): string {
  const cisty = path.replace(/^\//, '');
  return `${WEB}/${langKod}/${cisty}`;
}

/** Preferuje -600.webp, když na webu existuje. */
function cover600Path(baseWithoutExt: string): string {
  return `${baseWithoutExt}-600.webp`;
}

export const POPTAVKA_APARTMANY: PoptavkaAptInfo[] = [
  {
    id: 'V1',
    slug: 'gentle-harmony',
    coverPath: cover600Path('images/apartments/pokoj4-5'),
    galeriePaths: [
      'images/apartments/v1/01_uvod-obyvaci-pokoj-600.webp',
      'images/apartments/v1/02_vstup-chodba-600.webp',
      'images/apartments/v1/03_kuchyne-jidelni-stul-600.webp',
      'images/apartments/v1/05_pruchod-do-pokoje-600.webp',
      'images/apartments/v1/08_pokoj-okna-tv-600.webp',
      'images/apartments/v1/09_koupelna-vana-600.webp',
      'images/apartments/v1/10_sprchovy-kout-600.webp',
      'images/apartments/v1/11_umyvadlo-600.webp',
    ],
    stranka: (l) => `${WEB}/${l}/apartmany/gentle-harmony`,
  },
  {
    id: 'V2',
    slug: 'golden-balance',
    coverPath: cover600Path('images/apartments/pokoj3'),
    galeriePaths: [
      'images/apartments/v2/01_uvod-pokoj-s-oknem-600.webp',
      'images/apartments/v2/03_kuchyne-barovy-stul-600.webp',
      'images/apartments/v2/04_manzelska-postel-600.webp',
      'images/apartments/v2/05_pokoj-okna-tv-600.webp',
      'images/apartments/v2/06_pracovni-stul-u-okna-600.webp',
      'images/apartments/v2/07_umelecky-strop-600.webp',
      'images/apartments/v2/08_koupelna-600.webp',
    ],
    stranka: (l) => `${WEB}/${l}/apartmany/golden-balance`,
  },
  {
    id: 'V3',
    slug: 'evening-elegance',
    coverPath: cover600Path('images/apartments/pokoj2'),
    galeriePaths: [
      'images/apartments/v3/01_uvod-loznice-600.webp',
      'images/apartments/v3/02_pokoj-kuchynsky-kout-600.webp',
      'images/apartments/v3/03_kuchynska-linka-600.webp',
      'images/apartments/v3/05_umelecky-strop-600.webp',
      'images/apartments/v3/06_koupelna-600.webp',
      'images/apartments/v3/04_pokoj-tv-pracovni-stul-600.webp',
    ],
    stranka: (l) => `${WEB}/${l}/apartmany/evening-elegance`,
  },
  {
    id: 'V4',
    slug: 'noble-contrast',
    coverPath: cover600Path('images/apartments/pokoj4'),
    galeriePaths: [
      'images/apartments/v4/01_uvod-loznice-terasa-600.webp',
      'images/apartments/v4/02_pokoj-pohled-ke-kuchyni-600.webp',
      'images/apartments/v4/05_postel-u-okna-600.webp',
      'images/apartments/v4/06_umelecky-strop-600.webp',
      'images/apartments/v4/07_koupelna-600.webp',
      'images/apartments/v4/08_sprchovy-kout-600.webp',
    ],
    stranka: (l) => `${WEB}/${l}/apartmany/noble-contrast`,
  },
  {
    id: 'V5',
    slug: 'comfort-in-muted-tones',
    coverPath: cover600Path('images/apartments/pokoj1'),
    galeriePaths: [
      'images/apartments/v5/01_uvod-obyvak-tv-600.webp',
      'images/apartments/v5/02-600.webp',
      'images/apartments/v5/03-600.webp',
      'images/apartments/v5/04-600.webp',
      'images/apartments/v5/05-600.webp',
      'images/apartments/v5/06_umelecky-strop-600.webp',
      'images/apartments/v5/13zahrada-shora-600.webp',
      'images/apartments/v5/14zahrada-vecer-dvere-600.webp',
      'images/apartments/v5/15zahrada-vecer-lipa-600.webp',
      'images/apartments/v5/16zahrada-dum-shora-600.webp',
    ],
    stranka: (l) => `${WEB}/${l}/apartmany/comfort-in-muted-tones`,
  },
];

const GALERIE_KOMPLET_COVER_PATH = 'images/apartments/apartments-hero-600.webp';

export function coverUrl(langKod: string, apt: PoptavkaAptInfo): string {
  return asset(langKod, apt.coverPath);
}

export function galerieUrls(langKod: string, apt: PoptavkaAptInfo): string[] {
  return apt.galeriePaths.map((p) => asset(langKod, p));
}

export function galerieKompletCoverUrl(langKod: string): string {
  return asset(langKod, GALERIE_KOMPLET_COVER_PATH);
}

export type GalerieKompletPolozka = { url: string; aptId: AptId };

/**
 * Celá galerie: u každé fotky víme, ke kterému apartmánu patří.
 * `jenApty` = jen tyto (volné v termínu). Bez něj / null = všech 5.
 */
export function galerieKompletPolozky(
  langKod: string,
  jenApty?: readonly AptId[] | null,
): GalerieKompletPolozka[] {
  const seznam =
    jenApty == null
      ? POPTAVKA_APARTMANY
      : POPTAVKA_APARTMANY.filter((a) => jenApty.includes(a.id));
  return seznam.flatMap((a) => [
    { url: coverUrl(langKod, a), aptId: a.id },
    ...galerieUrls(langKod, a).map((url) => ({ url, aptId: a.id })),
  ]);
}

export function galerieKompletUrls(langKod: string): string[] {
  return galerieKompletPolozky(langKod).map((p) => p.url);
}

export function odkazApartmanyWeb(langKod: string): string {
  return `${WEB}/${langKod}/apartmany`;
}

export function odkazKvizAtmosfery(langKod: string): string {
  return `${WEB}/${langKod}/discover-your-atmosphere`;
}

export function webLangKod(lang: string): string {
  if (lang === 'cs' || lang === 'de' || lang === 'es') return lang;
  return 'en';
}
