import { promises as dns, setServers } from 'dns';

let verejnyDns = false;

async function resolver(domain: string, rrtype: string): Promise<string[][] | string[]> {
  if (verejnyDns) setServers(['1.1.1.1', '8.8.8.8']);
  try {
    return (await dns.resolve(domain, rrtype)) as string[] | string[][];
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (!verejnyDns && (code === 'ECONNREFUSED' || code === 'ETIMEOUT' || code === 'ECONNRESET')) {
      verejnyDns = true;
      setServers(['1.1.1.1', '8.8.8.8']);
      return (await dns.resolve(domain, rrtype)) as string[] | string[][];
    }
    throw err;
  }
}

function domenaBh(domain: string): boolean {
  const d = domain.trim().toLowerCase();
  return d === 'better-hotel.com' || d.endsWith('.better-hotel.com');
}

/**
 * Ověří podpis DKIM v těle e-mailu. Platí jen pass pro doménu končící na better-hotel.com.
 * Prošlý podpis je odmítnutí. Při výpadku DNS taky.
 */
export async function overDkimBetterHotel(raw: Buffer): Promise<boolean> {
  try {
    const mod = (await import('mailauth')) as {
      dkimVerify?: (input: Buffer, opts?: { resolver?: typeof resolver }) => Promise<{ results?: DkimRow[] }>;
      default?: {
        dkimVerify?: (input: Buffer, opts?: { resolver?: typeof resolver }) => Promise<{ results?: DkimRow[] }>;
      };
    };
    const dkimVerify = mod.dkimVerify || mod.default?.dkimVerify;
    if (!dkimVerify) return false;
    const res = await dkimVerify(raw, { resolver });
    return (res.results || []).some((row) => row.status?.result === 'pass' && domenaBh(row.signingDomain || ''));
  } catch {
    return false;
  }
}

type DkimRow = { status?: { result?: string }; signingDomain?: string };
