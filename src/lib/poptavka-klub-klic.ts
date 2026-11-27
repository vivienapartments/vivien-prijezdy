/**
 * Věrná poptávka z karty klubu (`/poptavka?k=tajnyKlic`).
 * Jméno a telefon bereme z karty, host je znovu nepíše.
 */
import { nactiKlientPodleTajnehoKlice } from '@/lib/klient-karta';
import { najdiPreviewPodleKlice } from '@/lib/klub-preview-klienti';
import type { ProcessStore } from '@/lib/store';
import { GUIDE_LANGS, type GuideLang } from '@/lib/types';

export type KontaktZKlubKlice = {
  jmeno: string;
  telefon: string;
  rezervace: string | null;
  jazyk: GuideLang | null;
};

export async function kontaktZKlubTajnehoKlice(
  store: ProcessStore,
  tajnyKlic: string,
): Promise<KontaktZKlubKlice | null> {
  const k = (tajnyKlic || '').trim();
  if (!k) return null;

  const preview = najdiPreviewPodleKlice(k);
  if (preview?.karta) {
    const jmeno = `${preview.karta.jmeno || ''} ${preview.karta.prijmeni || ''}`.trim();
    const telefon = (preview.karta.telefon || '').trim();
    if (!jmeno || !telefon) return null;
    const rezervace =
      preview.karta.rezervace && preview.karta.rezervace.length
        ? preview.karta.rezervace[preview.karta.rezervace.length - 1]
        : null;
    const jazyk =
      preview.karta.jazyk && GUIDE_LANGS.includes(preview.karta.jazyk)
        ? preview.karta.jazyk
        : null;
    return { jmeno, telefon, rezervace, jazyk };
  }

  const karta = await nactiKlientPodleTajnehoKlice(store, k);
  if (!karta || karta.stav === 'zrusena') return null;
  const jmeno = `${karta.jmeno || ''} ${karta.prijmeni || ''}`.trim();
  const telefon = (karta.telefon || '').trim();
  if (!jmeno || !telefon) return null;
  const rezervace =
    karta.rezervace && karta.rezervace.length
      ? karta.rezervace[karta.rezervace.length - 1]
      : null;
  const jazyk =
    karta.jazyk && GUIDE_LANGS.includes(karta.jazyk) ? karta.jazyk : null;
  return { jmeno, telefon, rezervace, jazyk };
}
