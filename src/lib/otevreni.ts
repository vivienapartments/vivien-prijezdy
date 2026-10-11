import { verifyToken } from './token';
import type { ProcessStore, RezervaceRecord } from './store';

const MINUTA_MS = 60_000;

/** Poslední přijatý zápis v tomto procesu. Druhá brzda je čas na záznamu. */
const posledniZapis = new Map<string, number>();

export function resetOtevreniPamat(): void {
  posledniZapis.clear();
}

/** Náhledy a roboti. Prázdný User-Agent neblokujeme, prohlížeč ho má. */
export function jeRobot(ua: string | null | undefined): boolean {
  const s = (ua || '').toLowerCase();
  if (!s.trim()) return false;
  const stopy = [
    'whatsapp',
    'facebookexternalhit',
    'facebot',
    'slackbot',
    'telegrambot',
    'googlebot',
    'google-inspectiontool',
    'bingbot',
    'twitterbot',
    'linkedinbot',
    'discordbot',
    'applebot',
    'skype',
    'outlook',
    'ms-office',
    'preview',
    'crawler',
    'spider',
    'bot',
  ];
  return stopy.some((stopa) => s.includes(stopa));
}

export function zaznamenejOtevreni(
  rec: RezervaceRecord,
  nowIso: string,
): { record: RezervaceRecord; zapsano: boolean } {
  const now = Date.parse(nowIso);
  const last = rec.otevrenoNaposled ? Date.parse(rec.otevrenoNaposled) : 0;
  if (Number.isFinite(now) && Number.isFinite(last) && last > 0 && now - last < MINUTA_MS) {
    return { record: rec, zapsano: false };
  }
  const pocet = (rec.otevrenoPocet ?? 0) + 1;
  return {
    zapsano: true,
    record: {
      ...rec,
      otevrenoPocet: pocet,
      otevrenoPoprve: rec.otevrenoPoprve || nowIso,
      otevrenoNaposled: nowIso,
    },
  };
}

export type OtevreniVysledek = 'neplatny' | 'majitel' | 'robot' | 'chybi' | 'brzy' | 'zapsano';

/** Zapíše otevření, jen když token sedí, není to majitel a není to robot. */
export async function zpracujBeacon(opts: {
  token: string;
  ua: string | null;
  majitel: boolean;
  store: ProcessStore;
  now?: Date;
  secret?: string;
}): Promise<OtevreniVysledek> {
  if (opts.majitel) return 'majitel';
  if (jeRobot(opts.ua)) return 'robot';

  const now = opts.now ?? new Date();
  let overeni;
  try {
    overeni = opts.secret ? verifyToken(opts.token, opts.secret, now) : verifyToken(opts.token, undefined, now);
  } catch {
    return 'neplatny';
  }
  if (!overeni.ok) return 'neplatny';

  const id = overeni.payload.r;
  const rec = await opts.store.getRezervace(id);
  if (!rec) return 'chybi';

  const nowMs = now.getTime();
  const minule = posledniZapis.get(id) ?? 0;
  if (nowMs - minule < MINUTA_MS) return 'brzy';

  const rozhod = zaznamenejOtevreni(rec, now.toISOString());
  if (!rozhod.zapsano) return 'brzy';

  posledniZapis.set(id, nowMs);
  await opts.store.setRezervace(id, rozhod.record);
  return 'zapsano';
}
