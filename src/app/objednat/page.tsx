import { headers } from 'next/headers';
import { ObjednatForm } from './ObjednatForm';
import { jazykProhlizece } from '@/lib/okno-pobytu';
import './objednat.scss';

export const metadata = { title: 'Objednat · VIVIEN' };

export default async function ObjednatPage() {
  const hlavicka = (await headers()).get('accept-language');
  return <ObjednatForm vychozi={jazykProhlizece(hlavicka)} />;
}
