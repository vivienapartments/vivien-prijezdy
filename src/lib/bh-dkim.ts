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

type DkimRow = { status?: { result?: string; comment?: string | false }; signingDomain?: string };
type DkimResolver = (domain: string, rrtype: string) => Promise<string[] | string[][]>;

/**
 * Podpis pro better-hotel.com, který je kryptograficky v pořádku.
 * Prošlá platnost se bere taky. Z těchto mailů se hostům nic neposílá.
 * Špatný podpis, cizí doména ani výpadek DNS se neberou.
 */
export function podpisInterniOk(row: DkimRow): boolean {
  if (!domenaBh(row.signingDomain || '')) return false;
  if (row.status?.result === 'pass') return true;
  return row.status?.result === 'neutral' && row.status?.comment === 'expired';
}

/**
 * Ověří podpis DKIM v těle e-mailu. Platí jen better-hotel.com.
 * Prošlý, ale jinak platný podpis projde. Při výpadku DNS ne.
 */
export async function overDkimBetterHotel(raw: Buffer, vlastni?: DkimResolver): Promise<boolean> {
  try {
    const mod = (await import('mailauth')) as {
      dkimVerify?: (input: Buffer, opts?: { resolver?: DkimResolver }) => Promise<{ results?: DkimRow[] }>;
      default?: {
        dkimVerify?: (input: Buffer, opts?: { resolver?: DkimResolver }) => Promise<{ results?: DkimRow[] }>;
      };
    };
    const dkimVerify = mod.dkimVerify || mod.default?.dkimVerify;
    if (!dkimVerify) return false;
    const res = await dkimVerify(raw, { resolver: vlastni || resolver });
    return (res.results || []).some((row) => podpisInterniOk(row));
  } catch {
    return false;
  }
}
