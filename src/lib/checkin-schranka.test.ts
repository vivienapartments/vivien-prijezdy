import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { doplnOdkazyZeSchranky, HISTORIE_ODKAZU, planOdkazu } from './checkin-schranka';
import type { InboxMail } from './inbox-mail';
import { odkazCheckinuZVyzvy } from './potvrzeni-rezervace';
import { FileProcessStore, prazdnaRezervace } from './store';

const MAJITEL = 'info@vivienapartments.cz';

function mail(partial: Partial<InboxMail> & Pick<InboxMail, 'messageId' | 'subject'>): InboxMail {
  return {
    uid: 1,
    from: `Vivien <${MAJITEL}>`,
    to: MAJITEL,
    date: new Date('2026-10-15T08:45:00.000Z'),
    authenticationResults: null,
    text: '',
    html: '',
    ...partial,
  };
}

describe('odkaz z výzvy', () => {
  it('dlouhý tvar bere adresu odkazu, ne text', () => {
    const html =
      '<a href="https://checkin.example.com/formular/120260541?x=1&amp;y=2">Vivien Apartmens Character and Atmosphere / #120260541 / online checkin</a>';
    expect(odkazCheckinuZVyzvy(html)).toBe('https://checkin.example.com/formular/120260541?x=1&y=2');
  });

  it('krátký mev.im má přednost před webem a logem', () => {
    const html = [
      '<a href="https://vivienapartments.cz/logo.png">logo</a>',
      '<a href="mailto:info@vivienapartments.cz">napsat</a>',
      '<p>Odkaz pro vyplnění najdete zde:</p>',
      '<a href="https://mev.im/SVcal">https://mev.im/SVcal</a>',
    ].join('');
    expect(odkazCheckinuZVyzvy(html)).toBe('https://mev.im/SVcal');
    expect(odkazCheckinuZVyzvy('', 'Odkaz pro vyplnění najdete zde:\nhttps://mev.im/SVcal')).toBe('https://mev.im/SVcal');
  });

  it('web s check-in v adrese se nebere', () => {
    const html = '<a href="https://vivienapartments.cz/check-in">online checkin</a>';
    expect(odkazCheckinuZVyzvy(html)).toBeNull();
  });

  it('anglická věta vezme první platný odkaz za ní', () => {
    const html = [
      '<p>You will find the link here:</p>',
      '<a href="https://vivienapartments.cz/logo.png">logo</a>',
      '<a href="https://guest.example/abc">here</a>',
    ].join('');
    expect(odkazCheckinuZVyzvy(html)).toBe('https://guest.example/abc');
  });
});

describe('plán doplnění', () => {
  const predmet = (id: string) =>
    `Váš online check-in - nutnost vyplnění pro přidělení přístupu - Rezervace ${id}, Vivien Apartmens Character and Atmosphere`;

  it('doplní jen prázdnou kartu, ruční a cizí řádek nechá', () => {
    const prazdna = prazdnaRezervace('120260493', '2026-10-15T08:00:00.000Z');
    prazdna.jmeno = 'Eva Zimanová';
    prazdna.stav = 'odeslano';
    const rucni = prazdnaRezervace('120260500', '2026-10-15T08:00:00.000Z');
    rucni.jmeno = 'Jan Novák';
    rucni.checkinUrl = 'https://rucne.example/formular';
    rucni.rucniZnacky = [{ pole: 'checkinUrl', cas: '2026-10-15T08:00:00.000Z' }];
    const mails = [
      mail({
        messageId: 'a',
        from: 'VIVIEN <INFO@VIVIENAPARTMENTS.CZ>',
        to: 'INFO@VIVIENAPARTMENTS.CZ',
        subject: predmet('120260493'),
        html: '<a href="https://mev.im/SVcal">https://mev.im/SVcal</a>',
      }),
      mail({
        messageId: 'b',
        subject: predmet('120260500'),
        html: '<a href="https://mev.im/Jinak">odkaz</a>',
      }),
      mail({
        messageId: 'c',
        subject: predmet('120260777'),
        html: '<a href="https://mev.im/Neni">odkaz</a>',
      }),
      mail({
        messageId: 'd',
        subject: 'Your online check-in – required to receive access - Reservation 120260541',
        html: '<p>You will find the link here:</p><a href="https://guest.example/en">here</a>',
      }),
    ];
    const plan = planOdkazu(mails, [prazdna, rucni], MAJITEL);
    expect(plan.find((r) => r.rezervace === '120260493')).toMatchObject({
      host: 'Eva Zimanová',
      nalezen: 'ano',
      naKarte: 'ne',
      stane: 'doplní se',
    });
    expect(plan.find((r) => r.rezervace === '120260500')?.stane).toBe('ruční odkaz zůstane');
    expect(plan.find((r) => r.rezervace === '120260777')?.stane).toBe('řádek není, nezaloží se');
    expect(plan.find((r) => r.rezervace === '120260541')).toMatchObject({
      nalezen: 'ano',
      naKarte: 'není',
      stane: 'řádek není, nezaloží se',
    });
  });

  it('zápis doplní odkaz po check-inu a druhý běh už nic nepřepisuje', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vivien-odkaz-'));
    const store = new FileProcessStore(path.join(dir, 'store.json'));
    const rec = prazdnaRezervace('120260493', '2026-10-15T08:00:00.000Z');
    rec.jmeno = 'Eva Zimanová';
    rec.stav = 'odeslano';
    await store.setRezervace(rec.rezervace, rec);
    const mails = [
      mail({
        messageId: 'a',
        from: 'INFO@VIVIENAPARTMENTS.CZ',
        subject: predmet('120260493'),
        text: 'Odkaz pro vyplnění najdete zde: https://mev.im/SVcal',
      }),
    ];
    const prvni = await doplnOdkazyZeSchranky(store, mails, MAJITEL);
    expect(prvni.doplneno).toEqual([{ rezervace: '120260493', host: 'Eva Zimanová' }]);
    const po = await store.getRezervace('120260493');
    expect(po?.checkinUrl).toBe('https://mev.im/SVcal');
    expect(po?.stav).toBe('odeslano');
    expect(po?.historie.at(-1)?.co).toBe(HISTORIE_ODKAZU);
    const druhy = await doplnOdkazyZeSchranky(store, mails, MAJITEL);
    expect(druhy.doplneno).toEqual([]);
    expect(druhy.radky[0]?.stane).toBe('na kartě už je, zůstane');
  });
});
