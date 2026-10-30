import { cookies } from 'next/headers';
import { PREHLED_COOKIE, UKLID_COOKIE, verifySession } from './admin-auth';

/** Cookie úklidu (role uklid) nebo cookie majitele (role majitel). */
export async function uklidPrihlasen(): Promise<boolean> {
  const jar = await cookies();
  if (verifySession(jar.get(UKLID_COOKIE)?.value, 'uklid')) return true;
  return verifySession(jar.get(PREHLED_COOKIE)?.value, 'majitel');
}

/** Jen cookie úklidu s rolí uklid. Pro roli push. */
export async function jenUklidCookie(): Promise<boolean> {
  const jar = await cookies();
  return verifySession(jar.get(UKLID_COOKIE)?.value, 'uklid');
}
