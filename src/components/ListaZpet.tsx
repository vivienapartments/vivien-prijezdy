import { odkazZpetDoPrehledu } from '@/lib/pruvodce-majitel';

/** Pevná lišta jen v náhledu majitele. Host ji v průvodci nemá. */
export function ListaZpet({ id, ukazka = false }: { id: string; ukazka?: boolean }) {
  return (
    <div className="pv-zpet">
      <a href={odkazZpetDoPrehledu(id, ukazka)}>← Zpět do přehledu</a>
    </div>
  );
}
