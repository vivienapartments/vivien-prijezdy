import { cookies } from 'next/headers';
import { PREHLED_COOKIE, UKLID_COOKIE, verifySession } from './admin-auth';

/** Platná cookie úklidu nebo majitele. */
export async function uklidPrihlasen(): Promise<boolean> {
  const jar = await cookies();
  if (verifySession(jar.get(UKLID_COOKIE)?.value)) return true;
  return verifySession(jar.get(PREHLED_COOKIE)?.value);
}

/** Jen cookie úklidu (ne majitel). Pro roli push. */
export async function jenUklidCookie(): Promise<boolean> {
  const jar = await cookies();
  return verifySession(jar.get(UKLID_COOKIE)?.value);
}
