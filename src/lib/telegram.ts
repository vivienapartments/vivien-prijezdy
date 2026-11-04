/**
 * Provozní budíček do Telegramu (hlavně Android).
 * Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (více chatů oddělených čárkou).
 */

export type TelegramDruh =
  | 'cas-prijezdu'
  | 'cas-odjezdu'
  | 'brana'
  | 'hodina-pred'
  | 'nedoplatek'
  | 'doklady'
  | 'uklizeno'
  | 'automat'
  | 'zadost';

const POVOLENE = new Set<TelegramDruh>([
  'cas-prijezdu',
  'cas-odjezdu',
  'brana',
  'hodina-pred',
  'nedoplatek',
  'doklady',
  'uklizeno',
  'automat',
  'zadost',
]);

function token(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t && !t.startsWith('SEM_') ? t : null;
}

function chatIds(): string[] {
  const raw = process.env.TELEGRAM_CHAT_ID?.trim() || '';
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Pošle text do nastavených chatů. Selhání nehází ven. */
export async function posliTelegram(
  text: string,
  druh: TelegramDruh,
  urlPath?: string | null,
): Promise<boolean> {
  if (process.env.VITEST) return false;
  if (!POVOLENE.has(druh)) return false;
  const bot = token();
  const chats = chatIds();
  if (!bot || !chats.length) return false;

  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://vivien-prijezdy-six.vercel.app';
  const odkaz = urlPath ? `\n${base}${urlPath.startsWith('/') ? urlPath : `/${urlPath}`}` : '';
  const body = `${text}${odkaz}`;

  let ok = false;
  for (const chat_id of chats) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id,
          text: body,
          disable_web_page_preview: true,
        }),
      });
      if (res.ok) ok = true;
      else {
        const detail = await res.text().catch(() => '');
        console.error(`Telegram: chat ${chat_id} status=${res.status}`, detail.slice(0, 200));
      }
    } catch (err) {
      console.error('Telegram: send selhalo', err instanceof Error ? err.message : err);
    }
  }
  return ok;
}
