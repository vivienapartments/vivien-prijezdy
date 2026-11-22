import { Expired } from '@/components/Expired';

/** Lokální / dočasný náhled ostré stránky po odjezdu. Hostům se neposílá. */
export default function NahledPoOdjezduPage() {
  /** Token jen aby se ukázal blok doporučení. */
  return <Expired lang="cs" token="nahled" />;
}
