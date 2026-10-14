import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { predmetyPruvodce } from './email-host';
import { dnesVPraze } from './prehled';
import { rozhodniSpam } from './spam-schranka';
import {
  duvodVytazeni,
  predmetProVypis,
  VETA_SPAM,
  VETA_SPAM_CHYBA,
  type HostOkno,
  type SpamZprava,
} from './spam-host';
import { FileProcessStore, prazdnaRezervace } from './store';

const TED = new Date('2026-10-14T08:00:00.000Z');
const DNES = dnesVPraze(TED);
const PREDMET_CS = 'DŮLEŽITÉ · Váš průvodce příjezdem, bez něj nezaparkujete ani nevejdete';

function host(partial: Partial<HostOkno> & Pick<HostOkno, 'rezervace'>): HostOkno {
  return { email: null, prijezd: '2026-10-16', odjezd: '2026-10-18', ...partial };
}

function zprava(partial: Partial<SpamZprava> & Pick<SpamZprava, 'from' | 'subject'>): SpamZprava {
  return {
    uid: 7,
    messageId: 'spam-1@test',
    date: new Date('2026-10-13T08:00:00.000Z'),
    ...partial,
  };
}

function tmpStore(): FileProcessStore {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vivien-spam-'));
  return new FileProcessStore(path.join(dir, 'store.json'));
}

describe('duvodVytazeni', () => {
  const predmety = [PREDMET_CS];
  const hosti = [host({ rezervace: '120260530', email: 'host@example.com' })];

  it('e-mail z adresy rezervace se má přesunout', () => {
    const vysledek = duvodVytazeni(
      zprava({ from: 'Host <host@example.com>', subject: 'Přijedeme v 15:00' }),
      hosti,
      predmety,
      TED,
      DNES,
    );
    expect(vysledek?.duvod).toBe('adresa');
    expect(vysledek?.rezervace).toEqual(['120260530']);
  });

  it('adresa Bookingu a Airbnb se má přesunout', () => {
    const booking = duvodVytazeni(
      zprava({ from: 'Guest <a@guest.booking.com>', subject: 'Hello' }),
      hosti,
      predmety,
      TED,
      DNES,
    );
    const expedia = duvodVytazeni(
      zprava({ from: 'Guest <a@m.expediapartnercentral.com>', subject: 'Hello' }),
      hosti,
      predmety,
      TED,
      DNES,
    );
    const airbnb = duvodVytazeni(
      zprava({ from: 'Guest <a@reply.airbnb.com>', subject: 'Hello' }),
      hosti,
      predmety,
      TED,
      DNES,
    );
    expect(booking?.duvod).toBe('booking');
    expect(expedia?.duvod).toBe('booking');
    expect(airbnb?.duvod).toBe('airbnb');
  });

  it('odpověď na předmět průvodce se má přesunout', () => {
    const vysledek = duvodVytazeni(
      zprava({ from: 'nekdo@example.net', subject: `Re: ${PREDMET_CS}` }),
      hosti,
      predmety,
      TED,
      DNES,
    );
    expect(vysledek?.duvod).toBe('predmet');
    expect(predmetProVypis(`Re: ${PREDMET_CS}`, predmety)).toBe(PREDMET_CS);
  });

  it('číslo rezervace v předmětu se má přesunout', () => {
    const vysledek = duvodVytazeni(
      zprava({ from: 'nekdo@example.net', subject: 'Re: rezervace 120260530' }),
      hosti,
      predmety,
      TED,
      DNES,
    );
    expect(vysledek?.duvod).toBe('predmet');
    expect(vysledek?.rezervace).toEqual(['120260530']);
  });

  it('cizí spam zůstane', () => {
    const vysledek = duvodVytazeni(
      zprava({ from: 'akce@booking.com', subject: 'Sleva na víkend' }),
      hosti,
      predmety,
      TED,
      DNES,
    );
    const stary = duvodVytazeni(
      zprava({
        from: 'Host <host@example.com>',
        subject: 'starý',
        date: new Date('2026-10-01T08:00:00.000Z'),
      }),
      hosti,
      predmety,
      TED,
      DNES,
    );
    const odjety = duvodVytazeni(
      zprava({ from: 'Host <stary@example.com>', subject: 'Ahoj' }),
      [host({ rezervace: '120260100', email: 'stary@example.com', prijezd: '2026-09-01', odjezd: '2026-09-03' })],
      predmety,
      TED,
      DNES,
    );
    expect(vysledek).toBeNull();
    expect(stary).toBeNull();
    expect(odjety).toBeNull();
  });

  it('předměty průvodce obsahují češtinu', () => {
    expect(predmetyPruvodce().some((p) => p.includes('průvodce příjezdem'))).toBe(true);
  });
});

describe('rozhodniSpam', () => {
  async function ulozHosta(store: FileProcessStore) {
    const rec = prazdnaRezervace('120260530', '2026-10-01T08:00:00.000Z');
    rec.emailHosta = 'host@example.com';
    rec.prijezd = '2026-10-16';
    rec.odjezd = '2026-10-18';
    rec.stav = 'odeslano';
    await store.setRezervace(rec.rezervace, rec);
  }

  it('při souhlasu přesune hosta a zapíše historii, cizí spam ne', async () => {
    const store = tmpStore();
    await ulozHosta(store);
    const presunute: number[] = [];
    const vysledek = await rozhodniSpam(
      [
        zprava({ uid: 1, messageId: 'host@test', from: 'Host <host@example.com>', subject: 'Čas 15:00' }),
        zprava({ uid: 2, messageId: 'cizi@test', from: 'akce@spam.test', subject: 'Výhra' }),
      ],
      store,
      { presunout: async (z) => { presunute.push(z.uid); } },
      { presouvat: true, ted: TED },
    );
    expect(presunute).toEqual([1]);
    expect(vysledek.presunuto).toBe(1);
    expect(vysledek.nalezeno).toBe(1);
    const rec = await store.getRezervace('120260530');
    expect(rec?.historie.some((h) => h.co === VETA_SPAM && h.cas)).toBe(true);
    expect(rec?.stav).toBe('odeslano');
  });

  it('bez souhlasu nic nepřesune a každého vezme jen jednou', async () => {
    const store = tmpStore();
    await ulozHosta(store);
    const zpravy = [zprava({ from: 'Host <host@example.com>', subject: 'Čas' })];
    const presunout = async () => {
      throw new Error('nemá se volat');
    };
    const prvni = await rozhodniSpam(zpravy, store, { presunout }, { presouvat: false, ted: TED });
    expect(prvni.nalezeno).toBe(1);
    expect(prvni.presunuto).toBe(0);
    expect((await store.getRezervace('120260530'))?.historie).toEqual([]);

    await rozhodniSpam(
      zpravy,
      store,
      { presunout: async () => undefined },
      { presouvat: true, ted: TED },
    );
    const druhy = await rozhodniSpam(
      zpravy,
      store,
      { presunout: async () => { throw new Error('podruhé'); } },
      { presouvat: true, ted: TED },
    );
    expect(druhy.nalezeno).toBe(0);
    expect(druhy.chyby).toBe(0);
  });

  it('chyba přesunu zapíše co se stalo a pokračuje', async () => {
    const store = tmpStore();
    await ulozHosta(store);
    const vysledek = await rozhodniSpam(
      [
        zprava({ uid: 1, messageId: 'pad@test', from: 'Host <host@example.com>', subject: 'Čas' }),
        zprava({
          uid: 2,
          messageId: 'air@test',
          from: 'Guest <a@reply.airbnb.com>',
          subject: 'Re: 120260530',
        }),
      ],
      store,
      {
        presunout: async (z) => {
          if (z.uid === 1) throw new Error('imap');
        },
      },
      { presouvat: true, ted: TED },
    );
    expect(vysledek.chyby).toBe(1);
    expect(vysledek.presunuto).toBe(1);
    const rec = await store.getRezervace('120260530');
    expect(rec?.duvody.some((d) => d.veta === VETA_SPAM_CHYBA)).toBe(true);
    expect(rec?.historie.some((h) => h.co === VETA_SPAM)).toBe(true);
  });
});
