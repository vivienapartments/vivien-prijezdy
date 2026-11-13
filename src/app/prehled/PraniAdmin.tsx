'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TlacitkoWhatsApp } from '@/components/TlacitkoWhatsApp';
import { textZminujeFakturu } from '@/lib/faktura';
import { FAKTURA_MAJITEL, FAKTURA_PRANI_NAPOVEDA, FAKTURA_SLOVA } from '@/lib/faktura-texty';
import type { KdoPrani, VlaknoPrani, ZpravaPrani } from '@/lib/prani';
import type { PraniRadekPrehled } from '@/lib/prani';
import type { GuideLang } from '@/lib/types';
function casKratky(iso: string): string {
  try {
    return new Intl.DateTimeFormat('cs-CZ', {
      timeZone: 'Europe/Prague',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

function noveId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `a-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export function PraniRamecekDomu({
  radky,
  onOtevri,
  onPrecteno,
}: {
  radky: PraniRadekPrehled[];
  onOtevri: (rezervace: string, vlakno: string) => void;
  onPrecteno: (rezervace: string, vlakno: string) => Promise<void>;
}) {
  if (!radky.length) return null;
  return (
    <div className="ph-prani-seznam">
      <div className="ph-prani-seznam__hlava">
        <h2>Přání hostů ({radky.length})</h2>
      </div>
      <ul>
        {radky.map((r) => (
          <li key={`${r.rezervace}:${r.vlakno}:${r.cas}`}>
            <button type="button" className="ph-prani-seznam__radek" onClick={() => onOtevri(r.rezervace, r.vlakno)}>
              <span className="ph-prani-seznam__cas">{casKratky(r.cas)}</span>
              <span>
                {r.apartman} · {r.host} · nová zpráva
                <span className="ph-prani-seznam__nahled"> · „{r.nahled}“</span>
              </span>
            </button>
            <button
              type="button"
              className="ph-ulozit"
              onClick={() => void onPrecteno(r.rezervace, r.vlakno)}
            >
              Přečetl jsem
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PraniStitek({
  pocet,
  nove,
  onClick,
}: {
  pocet: number;
  nove: number;
  onClick: () => void;
}) {
  if (pocet <= 0) return null;
  return (
    <button type="button" className={`ph-prani-stitek${nove ? ' is-nove' : ''}`} onClick={onClick}>
      {nove ? `Přání ${pocet} · nové` : `Přání ${pocet}`}
    </button>
  );
}

export function PraniDetail({
  rezervace,
  kdo,
  focusVlakno,
  ukazka,
  wa,
  userAgent = '',
  jazyk = 'cs',
  fakturaZadana = false,
}: {
  rezervace: string;
  kdo: KdoPrani;
  focusVlakno?: string | null;
  ukazka?: boolean;
  wa?: string | null;
  userAgent?: string;
  jazyk?: GuideLang;
  fakturaZadana?: boolean;
}) {
  const router = useRouter();
  const [vlakna, setVlakna] = useState<VlaknoPrani[]>([]);
  const [zpravy, setZpravy] = useState<ZpravaPrani[]>([]);
  const [otevrene, setOtevrene] = useState<string | null>(focusVlakno || null);
  const [text, setText] = useState('');
  const [hlaska, setHlaska] = useState('');
  const [cekam, setCekam] = useState(false);
  const [waPoOdpovedi, setWaPoOdpovedi] = useState<{ vlakno: string; zprava: string } | null>(null);

  async function nacti() {
    if (ukazka) return;
    const res = await fetch('/api/prehled/akce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezervace, akce: 'prani-nacti' }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      vlakna?: VlaknoPrani[];
      zpravy?: ZpravaPrani[];
    } | null;
    if (!res.ok || !data?.ok) return;
    setVlakna(data.vlakna || []);
    setZpravy(data.zpravy || []);
  }

  useEffect(() => {
    void nacti();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rezervace]);

  useEffect(() => {
    if (focusVlakno) setOtevrene(focusVlakno);
  }, [focusVlakno]);

  async function zapisWhatsAppHistorii() {
    if (ukazka) return;
    try {
      await fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rezervace, akce: 'prani-whatsapp' }),
      });
      router.refresh();
    } catch {
      /* historie není povinná */
    }
  }

  async function akce(telo: Record<string, string>, poOdpovedi = false) {
    if (ukazka) return;
    setCekam(true);
    setHlaska('');
    try {
      const res = await fetch('/api/prehled/akce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rezervace, ...telo }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        zpravaWa?: string | null;
      } | null;
      if (!res.ok || !data?.ok) {
        setHlaska(data?.error || 'Nepovedlo se.');
        return;
      }
      if (poOdpovedi) {
        setText('');
        if (data.zpravaWa && telo.vlakno) {
          setWaPoOdpovedi({ vlakno: telo.vlakno, zprava: data.zpravaWa });
        } else {
          setWaPoOdpovedi(null);
          setHlaska(data.zpravaWa === null || data.zpravaWa === undefined ? 'Odpověď uložena. Odkaz na průvodce teď nejde sestavit.' : '');
        }
      } else {
        setText('');
        setWaPoOdpovedi(null);
      }
      await nacti();
      router.refresh();
    } catch {
      setHlaska('Nepovedlo se.');
    } finally {
      setCekam(false);
    }
  }

  if (ukazka) {
    return <p className="ph-prazdne">V ukázce přání nejsou.</p>;
  }

  if (!vlakna.length) {
    return <p className="ph-prazdne">Zatím žádná přání.</p>;
  }

  const serazena = [...vlakna].sort((a, b) => Date.parse(b.zalozeno) - Date.parse(a.zalozeno));

  return (
    <div className="ph-prani-detail">
      {serazena.map((v) => {
        const zs = zpravy.filter((z) => z.vlakno === v.id && !z.smazano);
        const open = otevrene === v.id;
        const stav =
          v.stav === 'nove' ? 'Nové' : v.stav === 'precteno' ? 'Přečtené' : 'Vyřízené';
        const waBox = waPoOdpovedi?.vlakno === v.id ? waPoOdpovedi : null;
        const fakturaVeVlakne =
          !fakturaZadana &&
          zs.some((z) => z.autor === 'host' && textZminujeFakturu(z.text, FAKTURA_SLOVA));
        const napovedaFaktury = FAKTURA_PRANI_NAPOVEDA[jazyk] || FAKTURA_PRANI_NAPOVEDA.en;
        return (
          <div key={v.id} className="ph-prani-detail__vlakno" id={`ph-prani-${v.id}`}>
            <button type="button" className="ph-prani-detail__hlava" onClick={() => setOtevrene(open ? null : v.id)}>
              <span>{(zs.find((z) => z.autor === 'host')?.text || v.id).slice(0, 70)}</span>
              <span className="ph-prani-detail__stav">{stav}</span>
            </button>
            {open ? (
              <div>
                {zs.map((z) => (
                  <div key={z.id} className={`ph-prani-detail__bublina is-${z.autor}`}>
                    <div className="ph-prani-detail__meta">
                      {z.autor === 'host' ? 'Host' : z.jmeno || 'VIVIEN'}
                      {z.cas ? ` · ${casKratky(z.cas)}` : ''}
                      {z.upraveno ? ' · upraveno' : ''}
                    </div>
                    <p>{z.text}</p>
                  </div>
                ))}
                {waBox ? (
                  <div className="ph-prani-detail__wa">
                    <p>Odpověď je uložená. Pošlete hostovi odkaz do průvodce na WhatsApp.</p>
                    <TlacitkoWhatsApp
                      wa={wa}
                      zprava={waBox.zprava}
                      userAgent={userAgent}
                      onPredOtevrenim={() => void zapisWhatsAppHistorii()}
                    >
                      WhatsApp hostovi
                    </TlacitkoWhatsApp>
                    <button type="button" className="ph-ulozit" onClick={() => setWaPoOdpovedi(null)}>
                      Hotovo
                    </button>
                  </div>
                ) : null}
                {v.stav !== 'vyrizeno' ? (
                  <div className="ph-prani-detail__form">
                    <textarea
                      rows={3}
                      value={otevrene === v.id ? text : ''}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Odpověď hostovi"
                    />
                    <div className="ph-prani-detail__tlacitka">
                      <button
                        type="button"
                        disabled={cekam || !text.trim()}
                        onClick={() =>
                          void akce(
                            {
                              akce: 'prani-odpoved',
                              vlakno: v.id,
                              id: noveId(),
                              text,
                              kdo,
                            },
                            true,
                          )
                        }
                      >
                        Odeslat odpověď
                      </button>
                      {fakturaVeVlakne ? (
                        <button
                          type="button"
                          disabled={cekam}
                          onClick={() => {
                            void (async () => {
                              await akce(
                                {
                                  akce: 'prani-odpoved',
                                  vlakno: v.id,
                                  id: noveId(),
                                  text: napovedaFaktury,
                                  kdo,
                                },
                                true,
                              );
                              await akce({ akce: 'prani-vyrizeno', vlakno: v.id, kdo });
                            })();
                          }}
                        >
                          {FAKTURA_MAJITEL.prani_tlacitko}
                        </button>
                      ) : null}
                      {v.stav === 'nove' ? (
                        <button
                          type="button"
                          disabled={cekam}
                          onClick={() => void akce({ akce: 'prani-precteno', vlakno: v.id, kdo })}
                        >
                          Přečetl jsem
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={cekam}
                        onClick={() => {
                          if (window.confirm('Označit přání jako vyřízené?')) {
                            void akce({ akce: 'prani-vyrizeno', vlakno: v.id, kdo });
                          }
                        }}
                      >
                        Vyřízeno
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={cekam}
                    onClick={() => void akce({ akce: 'prani-otevrit', vlakno: v.id, kdo })}
                  >
                    Znovu otevřít
                  </button>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
      {hlaska ? <p className="ph-chyba">{hlaska}</p> : null}
    </div>
  );
}
