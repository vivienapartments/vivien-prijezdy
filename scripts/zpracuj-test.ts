/**
 * Fáze 4b: lokální běh IMAP automatu (TEST_REZIM zůstává zapnutý).
 * Nic v schránce nemění. Druhé spuštění by nemělo znovu odesílat stejné maily.
 */
import { config } from 'dotenv';
import path from 'path';
import { runInboxProcessing } from '../src/lib/process-inbox';

config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
  const testMode = (process.env.TEST_REZIM ?? '1') !== '0';
  if (!testMode) {
    console.error('Zastaveno: TEST_REZIM není 1. Ostré odesílání hostům teď nechceme.');
    process.exit(1);
  }

  console.log('Spouštím zpracování schránky (BODY.PEEK, 14 dní)…');
  const summary = await runInboxProcessing();
  console.log(
    JSON.stringify(
      {
        scanned: summary.scanned,
        sent: summary.sent,
        skipped: summary.skipped,
        rejected: summary.rejected,
        duplicate: summary.duplicate,
        errors: summary.errors,
        items: summary.items,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : 'chyba');
  process.exit(1);
});
