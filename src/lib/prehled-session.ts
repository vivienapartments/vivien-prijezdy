import { cookies } from 'next/headers';
import { PREHLED_COOKIE, verifySession } from './admin-auth';

export async function prehledPrihlasen(): Promise<boolean> {
  const jar = await cookies();
  return verifySession(jar.get(PREHLED_COOKIE)?.value);
}
