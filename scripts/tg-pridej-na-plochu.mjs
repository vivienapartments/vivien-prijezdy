import fs from 'fs';

function loadEnv() {
  if (!fs.existsSync('.env.local')) return;
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
}

loadEnv();
const bot = process.env.TELEGRAM_BOT_TOKEN?.trim();
const chats = (process.env.TELEGRAM_CHAT_ID || '')
  .split(/[,;\s]+/)
  .map((s) => s.trim())
  .filter(Boolean);

const text = `Přidat na plochu (průvodce) – zkouška

1) První otevření (okno přes celou obrazovku):
https://vivien-prijezdy-six.vercel.app/zkouska/pridej-na-plochu?plocha=okno

2) Děkujeme dole tiše:
https://vivien-prijezdy-six.vercel.app/zkouska/pridej-na-plochu-dekujeme

Android (Chrome, ne Telegram uvnitř):
… → Otevřít v Chrome → Ano → má vyskočit SYSTÉMOVÉ Instalovat.
Návod „tři tečky“ už nemá přijít.

iPhone: omluva (Apple to z odkazu nepovoluje).`;

for (const chat_id of chats) {
  const res = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text, disable_web_page_preview: false }),
  });
  if (!res.ok) console.error(await res.text());
  else console.log('ok', chat_id);
}
