'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  apartmanPozice,
  denKonce,
  jeVolna,
  jmenoNaPozici,
  konecZOdjezdu,
  prazdnaBrana,
  stavParkovani,
  textKonce,
  type BranaSlot,
  type NahledBrany,
} from '@/lib/brana';
import type { PrehledRadek } from '@/lib/prehled';
import { textTelefonu } from '@/lib/telefon';

type RadkaProps = {
  row: PrehledRadek;
  sloty: BranaSlot[];
  pripravena: boolean;
  potvrzena: boolean;
  ukazka: boolean;
  cekam: boolean;
  /** Zvýšení z dlaždice Autem spustí náhled SMS do brány. */
  vyzvaRegistrace?: number;
  onSloty: (sloty: BranaSlot[]) => void;
  onHlaska: (text: string) => void;
  /** Po potvrzení brány (i v ukázce) ať dlaždice přepne na Brána OK. */
  onBranaHotovo?: () => void;
  deti: (dil: ParkovaniDil) => ReactNode;
};

export type ParkovaniDil = {
  radek: ReactNode;
  registrace: ReactNode | null;
  odpoved: ReactNode | null;
  /** Panel hned pod dlaždicí Autem: potvrzení zápisu + SMS + odpověď brány. */
  panelBrany: ReactNode | null;
  detail: ReactNode;
};

function hostZ(row: PrehledRadek) {
  return {
    rezervace: row.rezervace,
    apartman: row.apartman,
    prijezd: row.prijezd,
    odjezd: row.odjezd,
    zpusob: row.zpusobPrijezdu,
    telefonBrana: row.telefonBrana,
    branaRegistrovano: row.branaRegistrovano,
    zruseno: row.stav === 'zruseno',
  };
}

export function ParkovaniRadek({
  row,
  sloty,
  pripravena,
  potvrzena,
  ukazka,
  cekam,
  vyzvaRegistrace = 0,
  onSloty,
  onHlaska,
  onBranaHotovo,
  deti,
}: RadkaProps) {
  const [sms, setSms] = useState('');
  const [druhe, setDruhe] = useState('');
  const [dotaz, setDotaz] = useState(false);
  const [nahled, setNahled] = useState<NahledBrany | null>(null);
  const [nahledDruhe, setNahledDruhe] = useState<string | undefined>(undefined);
  const [odpoved, setOdpoved] = useState('');
  const [chybaOdpovedi, setChybaOdpovedi] = useState('');
  const [ukazkaCeka, setUkazkaCeka] = useState(false);
  const [ukazkaHotovo, setUkazkaHotovo] = useState(false);
  const stav = stavParkovani(hostZ(row), sloty, new Date());
  const minulaVyzva = useRef(0);

  async function zavolej(akce: string, extra?: { druhe?: string; odpoved?: string }) {
    if (ukazka) {
      onHlaska('V ukázce se SMS do brány neotevře.');
      return null;
    }
    onHlaska('');
    const res = await fetch('/api/prehled/brana', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        akce,
        rezervace: row.rezervace,
        pozice: nahled?.pozice ?? stav.pozice ?? undefined,
        druhe: extra?.druhe,
        odpoved: extra?.odpoved,
      }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      odkaz?: string;
      text?: string;
      sloty?: BranaSlot[];
      nahled?: NahledBrany;
    } | null;
    if (!res.ok || !json?.ok) {
      const hlaska = json?.error || 'Bránu se nepodařilo připravit.';
      if (akce === 'odpoved') setChybaOdpovedi(hlaska);
      else onHlaska(hlaska);
      return null;
    }
    if (json.sloty) onSloty(json.sloty);
    return json;
  }

  async function ukazNahled(druh: 'zapis' | 'zneplatnit', extra?: { druhe?: string }) {
    setChybaOdpovedi('');
    setUkazkaCeka(false);
    if (ukazka) {
      const pozice = stav.pozice ?? (row.apartman === 'V1' ? 150 : row.apartman === 'V2' ? 154 : row.apartman === 'V3' ? 158 : row.apartman === 'V4' ? 162 : 166);
      setNahled({
        druh: druh === 'zneplatnit' ? 'zneplatnit' : 'zapis',
        pozice,
        telefon: textTelefonu(row.telefonBrana || '') || 'telefon hosta',
        konec: textKonce(konecZOdjezdu(row.odjezd)),
        staryTelefon: null,
        staryKonec: null,
      });
      return;
    }
    const json = await zavolej(druh === 'zneplatnit' ? 'nahled-zneplatnit' : 'nahled', extra);
    if (json?.nahled) {
      setNahled(json.nahled);
      setNahledDruhe(extra?.druhe);
    }
  }

  useEffect(() => {
    if (!vyzvaRegistrace || vyzvaRegistrace === minulaVyzva.current) return;
    minulaVyzva.current = vyzvaRegistrace;
    if (ukazka || stav.akce === 'registrovat' || stav.akce === 'upravit' || stav.akce === 'brzy') {
      void ukazNahled('zapis');
    } else if (stav.akce === 'potvrdit') {
      onHlaska('SMS už šla. Vložte odpověď brány dole na kartě.');
    } else {
      onHlaska('Teď bránu zapsat nejde. Zkontrolujte telefon, SPZ a volné stání.');
    }
    // Jen při nové výzvě z dlaždice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vyzvaRegistrace]);

  async function otevriSms(extra?: { druhe?: string }) {
    if (ukazka) {
      setNahled(null);
      setUkazkaCeka(true);
      onHlaska('V ukázce se SMS neotevře. Po odeslání sem vložte odpověď brány.');
      return;
    }
    const json = await zavolej(nahled?.druh === 'zneplatnit' ? 'zneplatnit' : 'sms', extra);
    if (json?.odkaz) {
      setSms(json.text || '');
      setNahled(null);
      window.location.href = json.odkaz;
    }
  }

  async function kopirovat() {
    if (!sms) return;
    try {
      await navigator.clipboard.writeText(sms);
      onHlaska('SMS je ve schránce. Heslo je jen v ní.');
    } catch {
      onHlaska('SMS se nepodařilo zkopírovat.');
    }
  }

  const smsAkce = stav.akce === 'registrovat' || stav.akce === 'upravit' || stav.akce === 'brzy';
  const muzeZneplatnit = stav.ton === 'zelena' && stav.pozice != null && stav.akce === 'nic';
  const nahledZapis = nahled && nahled.druh !== 'zneplatnit' ? nahled : null;
  const nahledPryc = nahled && nahled.druh === 'zneplatnit' ? nahled : null;

  function nahledBox(ukaz: NahledBrany) {
    return (
      <div className="ph-parkovani__dotaz">
        {ukaz.druh === 'zneplatnit' ? (
          <p>
            Pozice {ukaz.pozice}: v bráně nastavíme konec na teď, {ukaz.konec}.
          </p>
        ) : (
          <p>
            Pozice {ukaz.pozice}: zapíšeme <span className="ph-tel">{ukaz.telefon}</span> do {ukaz.konec}.
            {ukaz.staryTelefon ? (
              <>
                {' '}
                Teď tam je <span className="ph-tel">{ukaz.staryTelefon}</span> do {ukaz.staryKonec}.
              </>
            ) : null}
          </p>
        )}
        <div className="ph-nova-rada">
          <button type="button" onClick={() => setNahled(null)}>
            Zrušit
          </button>
          <button
            type="button"
            className="ph-nova-zprava"
            disabled={cekam}
            onClick={() => void otevriSms(nahledDruhe ? { druhe: nahledDruhe } : undefined)}
          >
            Otevřít SMS do brány
          </button>
        </div>
      </div>
    );
  }

  const registrace = stav.tlacitko && stav.akce !== 'potvrdit' && !ukazkaHotovo ? (
    <div className="ph-parkovani-akce">
      <button
        type="button"
        disabled={cekam || stav.neaktivni || (smsAkce && !ukazka && (!potvrzena || !pripravena))}
        onClick={() => void ukazNahled('zapis')}
      >
        {stav.tlacitko}
      </button>
      {nahledZapis ? nahledBox(nahledZapis) : null}
      {smsAkce && !potvrzena && !ukazka ? (
        <div className="ph-parkovani__poznamka">Nejdřív dole potvrďte, že stav brány souhlasí.</div>
      ) : null}
      {smsAkce && potvrzena && !pripravena && !ukazka ? (
        <div className="ph-parkovani__poznamka">Chybí heslo nebo číslo brány.</div>
      ) : null}
    </div>
  ) : null;

  const cekaOdpoved = stav.akce === 'potvrdit' || ukazkaCeka;
  const odpovedPole = cekaOdpoved && !ukazkaHotovo ? (
    <div className="ph-parkovani__dotaz">
      <p>Po odeslání SMS vložte odpověď z brány. Když sedí, stání zezelená.</p>
      <label className="ph-parkovani__druhe">
        Odpověď brány
        <span>
          <input
            value={odpoved}
            onChange={(e) => setOdpoved(e.target.value)}
            autoComplete="off"
            placeholder="vložit kopii odpovědi"
          />
          <button
            type="button"
            disabled={cekam || !odpoved.trim()}
            onClick={() => {
              if (ukazka) {
                setUkazkaCeka(false);
                setUkazkaHotovo(true);
                setOdpoved('');
                onHlaska('V ukázce je brána potvrzená.');
                onBranaHotovo?.();
                return;
              }
              void zavolej('odpoved', { odpoved }).then((json) => {
                if (json) {
                  setOdpoved('');
                  onBranaHotovo?.();
                }
              });
            }}
          >
            Porovnat
          </button>
        </span>
        {chybaOdpovedi ? <span className="ph-parkovani__chyba">{chybaOdpovedi}</span> : null}
      </label>
      <button
        type="button"
        className="ph-predano"
        disabled={cekam}
        onClick={() => {
          if (ukazka) {
            setUkazkaCeka(false);
            setUkazkaHotovo(true);
            onHlaska('V ukázce je brána potvrzená.');
            onBranaHotovo?.();
            return;
          }
          void zavolej('potvrdit').then((json) => {
            if (json) onBranaHotovo?.();
          });
        }}
      >
        Brána potvrdila (bez kontroly)
      </button>
    </div>
  ) : null;

  const panelBrany = ukazkaHotovo ? (
    <div className="ph-nova-panel ph-nova-panel--brana">
      <h3>Brána</h3>
      <p className="ph-nova-panel__stupen">Zapsáno · stání je připravené</p>
    </div>
  ) : nahledZapis || cekaOdpoved || (stav.tlacitko && stav.akce !== 'potvrdit') ? (
    <div className="ph-nova-panel ph-nova-panel--brana" id={`brana-${row.rezervace}`}>
      <h3>Registrace do brány</h3>
      {nahledZapis ? (
        <>
          <p className="ph-nova-panel__stupen">Nejdřív zkontrolujte pozici a číslo, pak otevřete SMS.</p>
          {nahledBox(nahledZapis)}
        </>
      ) : null}
      {odpovedPole}
      {!nahledZapis && !cekaOdpoved && stav.tlacitko ? (
        <>
          <button
            type="button"
            disabled={cekam || stav.neaktivni || (smsAkce && !ukazka && (!potvrzena || !pripravena))}
            onClick={() => void ukazNahled('zapis')}
          >
            {stav.tlacitko}
          </button>
          {smsAkce && !potvrzena && !ukazka ? (
            <p className="ph-parkovani__poznamka">Nejdřív dole potvrďte, že stav brány souhlasí.</p>
          ) : null}
          {smsAkce && potvrzena && !pripravena && !ukazka ? (
            <p className="ph-parkovani__poznamka">Chybí heslo nebo číslo brány.</p>
          ) : null}
        </>
      ) : null}
    </div>
  ) : null;

  const detail = (
    <div className="ph-parkovani-detail">
      {stav.druhe ? (
        <label className="ph-parkovani__druhe">
          Druhé číslo
          <span>
            <input value={druhe} onChange={(e) => setDruhe(e.target.value)} inputMode="tel" autoComplete="off" />
            <button type="button" disabled={cekam || !druhe.trim()} onClick={() => void ukazNahled('zapis', { druhe })}>
              Přidat na další pozici
            </button>
          </span>
        </label>
      ) : null}
      {stav.zrusit ? (
        dotaz ? (
          <div className="ph-parkovani__dotaz">
            Brána o tom neví, číslo v ní platí dál do {textKonce(sloty.find((s) => s.pozice === stav.pozice)?.konec || null)}.
            <button type="button" disabled={cekam} onClick={() => void zavolej('zrusit').then(() => setDotaz(false))}>
              Zrušit parkování
            </button>
            <button type="button" onClick={() => setDotaz(false)}>
              Nechat
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setDotaz(true)}>
            Zrušit parkování
          </button>
        )
      ) : null}
      {muzeZneplatnit ? (
        <button type="button" disabled={cekam} onClick={() => void ukazNahled('zneplatnit')}>
          Zneplatnit v bráně
        </button>
      ) : null}
      {nahledPryc ? nahledBox(nahledPryc) : null}
      {sms ? (
        <button type="button" onClick={() => void kopirovat()}>
          Zkopírovat SMS
        </button>
      ) : null}
      {stav.akce === 'potvrdit' ? (
        <button type="button" disabled={cekam} onClick={() => void zavolej('potvrdit')}>
          Brána potvrdila
        </button>
      ) : null}
    </div>
  );

  return deti({
    radek: (
      <div className={`ph-parkovani ph-parkovani--${stav.ton}`}>
        <div>{stav.text}</div>
      </div>
    ),
    registrace,
    odpoved: odpovedPole,
    panelBrany,
    detail,
  });
}

type TabulkaProps = {
  sloty: BranaSlot[];
  radky: PrehledRadek[];
  ukazka: boolean;
  potvrzena: boolean;
  onPotvrzeno: () => void;
  onSloty: (sloty: BranaSlot[]) => void;
  onHost: (id: string) => void;
  onHlaska: (text: string) => void;
};

type RadekUlozeni = { pozice: number; telefon: string; konec: string; rezervace: string; uvolnit: boolean };

export function BranaTabulka({ sloty, radky, ukazka, potvrzena, onPotvrzeno, onSloty, onHost, onHlaska }: TabulkaProps) {
  const [uprava, setUprava] = useState<number | null>(null);
  const [telefon, setTelefon] = useState('');
  const [konec, setKonec] = useState('');
  const [host, setHost] = useState('');
  const [dotaz, setDotaz] = useState('');
  const prazdne = sloty.every((s) => !s.telefon && s.stav === 'prazdna');
  const now = new Date();

  function stavRadku(slot: BranaSlot): { text: string; ton: string } {
    if (jeVolna(slot, now) && (slot.telefon || slot.konec)) return { text: 'vypršelo', ton: 'seda' };
    if (jeVolna(slot, now)) return { text: 'prázdné', ton: 'seda' };
    if (slot.stav === 'ceka') return { text: 'čeká na potvrzení', ton: 'oranzova' };
    return { text: 'platí', ton: 'zelena' };
  }

  async function uloz(kUlozeni: RadekUlozeni[]) {
    if (ukazka) {
      onHlaska('V náhledu se stav brány neukládá.');
      return;
    }
    const res = await fetch('/api/prehled/brana', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ akce: 'ulozit', radky: kUlozeni }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; sloty?: BranaSlot[] } | null;
    if (!res.ok || !json?.ok || !json.sloty) {
      onHlaska(json?.error || 'Stav brány se neuložil.');
      return;
    }
    onSloty(json.sloty);
    onHlaska('Stav brány je uložený. Bráně se nic neposlalo.');
    setUprava(null);
    setDotaz('');
  }

  return (
    <section className="ph-brana-sekce" id="brana">
      <h2>Brána parkoviště</h2>
      {potvrzena ? null : (
        <div className="ph-brana-souhlas">
          <p>Registrace je zavřená, dokud tenhle stav nepotvrdíte.</p>
          <button
            type="button"
            onClick={() => {
              if (ukazka) {
                onHlaska('V náhledu se stav brány neukládá.');
                return;
              }
              void fetch('/api/prehled/brana', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ akce: 'souhlas' }),
              })
                .then(async (res) => {
                  const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
                  if (!res.ok || !json?.ok) {
                    onHlaska(json?.error || 'Stav brány se nepotvrdil.');
                    return;
                  }
                  onPotvrzeno();
                  onHlaska('Stav brány je potvrzený. Teď jde registrace.');
                })
                .catch(() => onHlaska('Stav brány se nepotvrdil.'));
            }}
          >
            Stav brány souhlasí
          </button>
        </div>
      )}
      <div className="ph-brana-tabulka">
        {sloty.map((slot) => {
          const stav = stavRadku(slot);
          const apt = radky.find((r) => r.rezervace === slot.rezervace)?.apartman || apartmanPozice(slot.pozice);
          const konecText = textKonce(slot.konec);
          return (
            <div key={slot.pozice} className="ph-brana-radek">
              <div className="ph-brana-radek__hlava">
                <span>{slot.pozice}</span>
                <span>{apt || ''}</span>
                <span className={`ph-brana-stav ph-brana-stav--${stav.ton}`}>{stav.text}</span>
              </div>
              {slot.rezervace ? (
                <button type="button" className="ph-brana-host" onClick={() => onHost(slot.rezervace || '')}>
                  {jmenoNaPozici(slot, radky)}
                </button>
              ) : null}
              {slot.telefon ? <div className="ph-tel">{textTelefonu(slot.telefon)}</div> : null}
              {konecText ? <div>do {konecText}</div> : null}
              <button
                type="button"
                onClick={() => {
                  setUprava(slot.pozice);
                  setTelefon(slot.telefon || '');
                  setKonec(denKonce(slot.konec));
                  setHost(slot.rezervace || '');
                  setDotaz('');
                }}
              >
                Upravit
              </button>
              {uprava === slot.pozice ? (
                <div className="ph-brana-uprava">
                  <label>
                    Telefon
                    <input value={telefon} onChange={(e) => setTelefon(e.target.value)} inputMode="tel" />
                  </label>
                  <label>
                    Konec
                    <input value={konec} onChange={(e) => setKonec(e.target.value)} placeholder="2026-10-18" />
                  </label>
                  <label>
                    Rezervace
                    <input value={host} onChange={(e) => setHost(e.target.value)} />
                  </label>
                  {dotaz === `rucne-${slot.pozice}` ? (
                    <p>
                      Uložit opravu pozice {slot.pozice}? Bráně se nic nepošle.
                      <button type="button" onClick={() => void uloz([{ pozice: slot.pozice, telefon, konec, rezervace: host, uvolnit: false }])}>
                        Uložit
                      </button>
                      <button type="button" onClick={() => setDotaz('')}>
                        Nechat
                      </button>
                    </p>
                  ) : (
                    <button type="button" onClick={() => setDotaz(`rucne-${slot.pozice}`)}>
                      Uložit opravu
                    </button>
                  )}
                  {dotaz === `volno-${slot.pozice}` ? (
                    <p>
                      Uvolnit pozici {slot.pozice} v přehledu? V bráně číslo zůstane až do konce. Mazací příkaz se neposílá.
                      <button type="button" onClick={() => void uloz([{ pozice: slot.pozice, telefon: '', konec: '', rezervace: '', uvolnit: true }])}>
                        Uvolnit
                      </button>
                      <button type="button" onClick={() => setDotaz('')}>
                        Nechat
                      </button>
                    </p>
                  ) : (
                    <button type="button" onClick={() => setDotaz(`volno-${slot.pozice}`)}>
                      Uvolnit v přehledu
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {prazdne ? <NastaveniBrany onUloz={uloz} /> : null}
    </section>
  );
}

function NastaveniBrany({ onUloz }: { onUloz: (radky: RadekUlozeni[]) => Promise<void> }) {
  const [radky, setRadky] = useState(() => prazdnaBrana().map((s) => ({ pozice: s.pozice, telefon: '', konec: '', rezervace: '' })));
  const [dotaz, setDotaz] = useState(false);
  return (
    <form
      className="ph-brana-nastaveni"
      onSubmit={(e) => {
        e.preventDefault();
        setDotaz(true);
      }}
    >
      <h3>Nastavit stav brány</h3>
      <p>Jednou přepište dnešních 20 pozic. Bráně se nic nepošle.</p>
      {radky.map((r, i) => (
        <div key={r.pozice} className="ph-brana-nastaveni__radek">
          <span>{r.pozice}</span>
          <input
            aria-label={`Telefon ${r.pozice}`}
            value={r.telefon}
            onChange={(e) => setRadky((prev) => prev.map((x, n) => (n === i ? { ...x, telefon: e.target.value } : x)))}
          />
          <input
            aria-label={`Konec ${r.pozice}`}
            placeholder="2026-10-18"
            value={r.konec}
            onChange={(e) => setRadky((prev) => prev.map((x, n) => (n === i ? { ...x, konec: e.target.value } : x)))}
          />
          <input
            aria-label={`Host ${r.pozice}`}
            placeholder="rezervace"
            value={r.rezervace}
            onChange={(e) => setRadky((prev) => prev.map((x, n) => (n === i ? { ...x, rezervace: e.target.value } : x)))}
          />
        </div>
      ))}
      {dotaz ? (
        <p>
          Uložit těchto 20 pozic do přehledu? Bráně se nic nepošle.
          <button type="button" onClick={() => void onUloz(radky.map((r) => ({ ...r, uvolnit: !r.telefon.trim() })))}>
            Uložit
          </button>
          <button type="button" onClick={() => setDotaz(false)}>
            Nechat
          </button>
        </p>
      ) : (
        <button type="submit">Uložit stav brány</button>
      )}
    </form>
  );
}
