'use client';

import Link from 'next/link';
import '../doporucitel.scss';

/** Otevřená registrace vypnutá. Jen pozvánka z přehledu. */
export default function DoporucitelRegistracePage() {
  return (
    <main className="dop-page" lang="cs">
      <div className="dop-klub">
        <div className="dop-karticka">
          <div className="k1">VIVIEN CLUB</div>
          <div className="k2">Doporučitel</div>
          <div className="k3">jen na pozvánku</div>
        </div>
        <p className="dop-lead dop-lead--blok">
          Kartu doporučitele zakládáme jen z pozvánky, kterou vám pošleme. Po vyplnění údajů vás
          schválíme a teprve potom dostanete odkaz na kartu.
        </p>
        <p className="dop-muted">
          <Link href="/" style={{ color: '#c9a84c' }}>
            Zpět na VIVIEN
          </Link>
        </p>
      </div>
    </main>
  );
}
