import { describe, expect, it } from 'vitest';
import {
  CHYBA_RELAY_EMAIL,
  CHYBA_RELAY_OBSAH,
  druhZpravyNaOdchozi,
  overOdchoziHostovi,
  pripravTextSmsWa,
  textMaZakazanyObsah,
  vycistiTextProRelay,
  type OdchoziDruh,
} from './odchozi-host';

const RELAY = 'host@guest.booking.com';
const SKUTECNY = 'host@gmail.com';

/** Typy zpráv z přehledu (menu) + zvláštní odesílací místa. */
const MENU_ZPRAVY = [
  'checkin',
  'checkin2',
  'checkin3',
  'checkinNedojezd',
  'neotevrel',
  'pruvodceEmail',
  'nerozbalen',
  'denNerozbalen',
  'pruvodce3',
  'denCas',
  'doklady',
  'brana',
  'brana2',
  'brana3',
  'nedojezd',
  'odjezd',
  'pohoda',
  'podekovani',
  'shrnuti',
  'pripraveno',
] as const;

const MARKETING_DRUHY: OdchoziDruh[] = [
  'podekovani',
  'tip-kamaradovi',
  'doporuceni',
  'klub',
  'vernost',
];

describe('odchozi-host · obsah', () => {
  it('pozná slevu ve více jazycích', () => {
    expect(textMaZakazanyObsah('Máte slevu 5 %')).toBe(true);
    expect(textMaZakazanyObsah('You get a discount')).toBe(true);
    expect(textMaZakazanyObsah('10 % Rabatt')).toBe(true);
    expect(textMaZakazanyObsah('Dobrý den, brána je připravená.')).toBe(false);
  });

  it('pozná zakázané odkazy', () => {
    expect(textMaZakazanyObsah('https://x.cz/poptavka?t=1')).toBe(true);
    expect(textMaZakazanyObsah('https://x.cz/klub?k=abc')).toBe(true);
    expect(textMaZakazanyObsah('https://x.cz/doporucitel?k=1')).toBe(true);
    expect(textMaZakazanyObsah('https://x.cz/?od=PETR7')).toBe(true);
    expect(textMaZakazanyObsah('https://x.cz/abc#doporucit')).toBe(true);
    expect(textMaZakazanyObsah('https://x.cz/eyJtoken')).toBe(false);
  });

  it('vyčistí provozní text', () => {
    const raw = 'Brána je nastavená.\n\nMáte slevu 5 %.\n\nTěšíme se.';
    expect(vycistiTextProRelay(raw)).toBe('Brána je nastavená.\n\nTěšíme se.');
  });
});

describe('odchozi-host · e-mail', () => {
  it('marketing na relay zablokuje', async () => {
    const r = await overOdchoziHostovi({
      kanal: 'email',
      druh: 'podekovani',
      emailCil: RELAY,
      text: 'Díky za návštěvu',
      tichy: true,
    });
    expect(r.ok).toBe(false);
    expect(r.duvod).toBe(CHYBA_RELAY_EMAIL);
  });

  it('tip / vernost / klub / doporučení na relay zablokuje', async () => {
    for (const druh of ['tip-kamaradovi', 'vernost', 'klub', 'doporuceni'] as const) {
      const r = await overOdchoziHostovi({
        kanal: 'email',
        druh,
        emailCil: RELAY,
        text: 'nabídka',
        tichy: true,
      });
      expect(r.ok).toBe(false);
    }
  });

  it('skutečný e-mail marketing pustí', async () => {
    const r = await overOdchoziHostovi({
      kanal: 'email',
      druh: 'podekovani',
      emailCil: SKUTECNY,
      text: 'Díky, sleva 5 % na příště',
      tichy: true,
    });
    expect(r.ok).toBe(true);
  });

  it('provoz na relay vyčistí slevu', async () => {
    const r = await overOdchoziHostovi({
      kanal: 'email',
      druh: 'provozni',
      emailCil: RELAY,
      text: 'Check-in prosím.\n\nMáte slevu 5 %.\n\nDíky.',
      tichy: true,
    });
    expect(r.ok).toBe(true);
    expect(r.text).toBe('Check-in prosím.\n\nDíky.');
    expect(r.text).not.toMatch(/sleva/i);
  });

  it('provoz na relay s poptávkou bez zbytku zablokuje', async () => {
    const r = await overOdchoziHostovi({
      kanal: 'email',
      druh: 'provozni',
      emailCil: RELAY,
      text: 'Rezervujte na https://x.cz/poptavka?od=X',
      tichy: true,
    });
    expect(r.ok).toBe(false);
    expect(r.duvod).toBe(CHYBA_RELAY_OBSAH);
  });

  it('provozní čistý text na relay pustí', async () => {
    const r = await overOdchoziHostovi({
      kanal: 'email',
      druh: 'provozni',
      emailCil: 'x@guest.airbnb.com',
      text: 'Váš průvodce: https://vivien-prijezdy-six.vercel.app/token',
      tichy: true,
    });
    expect(r.ok).toBe(true);
  });
});

describe('odchozi-host · SMS / WhatsApp', () => {
  it('poděkování na telefon při relay e-mailu pustí', async () => {
    const r = await overOdchoziHostovi({
      kanal: 'whatsapp',
      druh: 'podekovani',
      emailCil: RELAY,
      text: 'Díky za návštěvu, v průvodci je dárek.',
      tichy: true,
    });
    expect(r.ok).toBe(true);
  });

  it('provozní SMS s odkazem na poptávku při relay vyčistí / zablokuje', () => {
    const r = pripravTextSmsWa(
      'Napište čas.\n\nPříště: https://x.cz/poptavka?t=1',
      RELAY,
      'provozni',
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.text).toBe('Napište čas.');
  });

  it('provozní WA jen se slevou při relay zablokuje', () => {
    const r = pripravTextSmsWa('Máte slevu 5 %.', RELAY, 'provozni');
    expect(r.ok).toBe(false);
  });
});

describe('odchozi-host · každý typ zprávy', () => {
  it('menu: jen poděkování je marketing, ostatní provoz', () => {
    for (const id of MENU_ZPRAVY) {
      const druh = druhZpravyNaOdchozi(id);
      if (id === 'podekovani') expect(druh).toBe('podekovani');
      else expect(druh).toBe('provozni');
    }
  });

  it('e-mail: každý marketing druh na relay zablokuje', async () => {
    for (const druh of MARKETING_DRUHY) {
      const r = await overOdchoziHostovi({
        kanal: 'email',
        druh,
        emailCil: RELAY,
        text: 'nabídka se slevou a /poptavka?od=X',
        tichy: true,
      });
      expect(r.ok).toBe(false);
      expect(r.duvod).toBe(CHYBA_RELAY_EMAIL);
    }
  });

  it('e-mail: provozní typy z menu na relay pustí čistý text', async () => {
    for (const id of MENU_ZPRAVY) {
      if (id === 'podekovani') continue;
      const r = await overOdchoziHostovi({
        kanal: 'email',
        druh: druhZpravyNaOdchozi(id),
        emailCil: RELAY,
        text: `Provozní ${id}: průvodce https://vivien-prijezdy-six.vercel.app/token`,
        tichy: true,
      });
      expect(r.ok).toBe(true);
    }
  });

  it('e-mail: provozní typy z menu na relay vyhodí slevu a poptávku', async () => {
    for (const id of MENU_ZPRAVY) {
      if (id === 'podekovani') continue;
      const r = await overOdchoziHostovi({
        kanal: 'email',
        druh: druhZpravyNaOdchozi(id),
        emailCil: RELAY,
        text: `Ahoj.\n\nMáte slevu 5 %.\n\nOdkaz: https://x.cz/poptavka?od=AB\n\nDíky.`,
        tichy: true,
      });
      expect(r.ok).toBe(true);
      expect(r.text).toBe('Ahoj.\n\nDíky.');
      expect(r.text).not.toMatch(/slev|poptavka|\?od=/i);
    }
  });

  it('SMS a WhatsApp: provozní typy z menu při relay vyčistí zakázané', () => {
    for (const kanal of ['sms', 'whatsapp'] as const) {
      for (const id of MENU_ZPRAVY) {
        if (id === 'podekovani') continue;
        const r = pripravTextSmsWa(
          `Připomínka ${id}.\n\nSleva 5 % na https://x.cz/poptavka?od=1`,
          RELAY,
          druhZpravyNaOdchozi(id),
        );
        expect(r.ok).toBe(true);
        if (r.ok) {
          expect(r.text).toBe(`Připomínka ${id}.`);
          expect(r.text).not.toMatch(/slev|poptavka|\?od=/i);
        }
        void kanal;
      }
    }
  });

  it('SMS a WhatsApp: poděkování (marketing) na telefon při relay pustí i se slevou', () => {
    for (const kanal of ['sms', 'whatsapp'] as const) {
      const r = pripravTextSmsWa(
        'Díky. Máte slevu 5 %: https://x.cz/poptavka?od=X',
        RELAY,
        'podekovani',
      );
      expect(r.ok).toBe(true);
      void kanal;
    }
  });

  it('doklad / průvodce / tip: mapování druhů na bránu', async () => {
    const doklad = await overOdchoziHostovi({
      kanal: 'email',
      druh: 'provozni',
      emailCil: RELAY,
      text: 'Doklad k pobytu.',
      tichy: true,
    });
    expect(doklad.ok).toBe(true);

    const tip = await overOdchoziHostovi({
      kanal: 'email',
      druh: 'tip-kamaradovi',
      emailCil: RELAY,
      text: 'Tip kamarádovi',
      tichy: true,
    });
    expect(tip.ok).toBe(false);

    const tipOk = await overOdchoziHostovi({
      kanal: 'email',
      druh: 'tip-kamaradovi',
      emailCil: SKUTECNY,
      text: 'Tip kamarádovi',
      tichy: true,
    });
    expect(tipOk.ok).toBe(true);
  });
});
