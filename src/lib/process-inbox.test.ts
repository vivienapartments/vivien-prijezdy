import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InboxMail } from './inbox-mail';
import { FileProcessStore, prazdnaRezervace } from './store';

const BH_KLIC = 'test-bh-key-24chars!!ok';
const MAJITEL = 'info@vivienapartments.cz';

const sendGuestEmail = vi.fn().mockResolvedValue({ to: MAJITEL, messageId: '<x>' });

vi.mock('./email-host', () => ({
  sendGuestEmail: (...args: unknown[]) => sendGuestEmail(...args),
}));

function tmpStore(): FileProcessStore {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vivien-store-'));
  return new FileProcessStore(path.join(dir, 'store.json'));
}

function mail(partial: Partial<InboxMail> & Pick<InboxMail, 'messageId' | 'from' | 'text'>): InboxMail {
  return {
    uid: 1,
    subject: 'check-in',
    date: new Date(),
    authenticationResults: null,
    html: '',
    ...partial,
  };
}

const BLOCK = `
VIVIEN-DATA v1
REZERVACE: 120260530
APARTMAN: Pohodlí v tlumených tónech
PRIJEZD: 16.11.2026
ODJEZD: 18.11.2026
NOCI: 2
OSOB: 2
EMAIL: host@example.com
NARODNOST: CZE
OSLOVENI: Vážený pane Nováku
ZDROJ: Booking.com
ACCESS_PIN: 1234
KLIC: ${BH_KLIC}
KONEC
`;

describe('processOneMail', () => {
  beforeEach(() => {
    sendGuestEmail.mockClear();
    vi.stubEnv('BH_KLIC', BH_KLIC);
    vi.stubEnv('MAJITEL_PREPOSILA_Z', MAJITEL);
    vi.stubEnv('PRUVODCE_TOKEN_SECRET', 'x'.repeat(40));
    vi.stubEnv('PRUVODCE_BASE_URL', 'http://127.0.0.1:3000');
    vi.stubEnv('TEST_REZIM', '1');
    vi.stubEnv('MAJITEL_EMAIL', MAJITEL);
    vi.stubEnv('SMTP_USER', '');
    vi.stubEnv('SMTP_HESLO', '');
    sendGuestEmail.mockResolvedValue({ to: MAJITEL, messageId: '<x>' });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('odešle a uloží rezervaci', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const item = await processOneMail(
      mail({
        messageId: 'msg-1@test',
        from: 'noreply@better-hotel.com',
        authenticationResults: 'dkim=pass header.d=better-hotel.com; spf=pass',
        text: BLOCK,
      }),
      store,
    );

    expect(item.status).toBe('sent');
    expect(item.rezervace).toBe('120260530');
    expect(sendGuestEmail).toHaveBeenCalledOnce();
    expect(await store.isMessageProcessed('msg-1@test')).toBe(true);
    expect((await store.getRezervace('120260530'))?.stav).toBe('odeslano');
  });

  it('druhé zpracování stejného Message-ID nic neudělá', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    await store.markMessage({
      messageId: 'msg-2@test',
      processedAt: new Date().toISOString(),
      status: 'sent',
      rezervace: '1',
    });

    const item = await processOneMail(
      mail({
        messageId: 'msg-2@test',
        from: 'noreply@better-hotel.com',
        text: BLOCK,
      }),
      store,
    );
    expect(item.status).toBe('already_done');
    expect(sendGuestEmail).not.toHaveBeenCalled();
  });

  it('odmítne neznámého odesílatele', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const item = await processOneMail(
      mail({
        messageId: 'msg-3@test',
        from: 'utocnik@example.com',
        text: BLOCK,
      }),
      store,
    );
    expect(item.status).toBe('rejected');
    expect(await store.isMessageProcessed('msg-3@test')).toBe(true);
    expect(sendGuestEmail).not.toHaveBeenCalled();
  });

  it('přeposlání majitelem (cesta 2) projde bez KLIC', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const blockNoKlic = BLOCK.replace(`KLIC: ${BH_KLIC}\n`, '');
    const item = await processOneMail(
      mail({
        messageId: 'msg-4@test',
        from: `VIVIEN <${MAJITEL}>`,
        authenticationResults: 'spf=pass smtp.mailfrom=vivienapartments.cz',
        text: `Fwd:\n> ${blockNoKlic.split('\n').join('\n> ')}`,
      }),
      store,
    );
    expect(item.status).toBe('sent');
    expect(sendGuestEmail).toHaveBeenCalledOnce();
  });

  it('špatná data uloží rezervaci a neodešle', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const item = await processOneMail(
      mail({
        messageId: 'msg-bad@test',
        from: 'noreply@better-hotel.com',
        authenticationResults: 'dkim=pass header.d=better-hotel.com; spf=pass',
        text: BLOCK.replace('EMAIL: host@example.com\n', '').replace('REZERVACE: 120260530', 'REZERVACE: 77'),
      }),
      store,
    );
    expect(item.status).toBe('neodeslano');
    expect(item.reason).toBe('chybi_email');
    expect((await store.getRezervace('77'))?.stav).toBe('neodeslano');
    expect(sendGuestEmail).not.toHaveBeenCalled();
  });

  it('nesedící noci odešle s výhradou', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const item = await processOneMail(
      mail({
        messageId: 'msg-noci@test',
        from: 'noreply@better-hotel.com',
        authenticationResults: 'dkim=pass header.d=better-hotel.com; spf=pass',
        text: BLOCK.replace('NOCI: 2', 'NOCI: 1').replace('REZERVACE: 120260530', 'REZERVACE: 88'),
      }),
      store,
    );
    expect(item.status).toBe('sent');
    expect((await store.getRezervace('88'))?.stav).toBe('odeslano_s_vyhradou');
  });

  it('smtp selhání zkusí znovu a po třetím pokusu skončí', async () => {
    sendGuestEmail.mockRejectedValue(new Error('smtp'));
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const one = mail({
      messageId: 'msg-smtp@test',
      from: 'noreply@better-hotel.com',
      authenticationResults: 'dkim=pass header.d=better-hotel.com; spf=pass',
      text: BLOCK.replace('REZERVACE: 120260530', 'REZERVACE: 66'),
    });
    expect((await processOneMail(one, store)).status).toBe('error');
    expect(await store.isMessageProcessed('msg-smtp@test')).toBe(false);
    await processOneMail(one, store);
    await processOneMail(one, store);
    expect(await store.isMessageProcessed('msg-smtp@test')).toBe(true);
    expect((await store.getRezervace('66'))?.smtpPokusy).toBe(3);
    expect((await store.getRezervace('66'))?.stav).toBe('neodeslano');
  });

  it('nedoručený dopis označí rezervaci jako vrácenou', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    await processOneMail(
      mail({
        messageId: 'msg-sent@test',
        from: 'noreply@better-hotel.com',
        authenticationResults: 'dkim=pass header.d=better-hotel.com; spf=pass',
        text: BLOCK,
      }),
      store,
    );
    const bounce = await processOneMail(
      mail({
        messageId: 'bounce-1@seznam.cz',
        from: 'Mail Delivery System <mailer-daemon@seznam.cz>',
        subject: 'Undelivered Mail Returned to Sender',
        text: `Content-Type: multipart/report; report-type=delivery-status
Final-Recipient: rfc822; host@example.com
Diagnostic-Code: smtp; 550 5.1.1 User unknown
Original-Message-ID: <x>
`,
      }),
      store,
    );
    expect(bounce.status).toBe('vraceno');
    expect((await store.getRezervace('120260530'))?.stav).toBe('vraceno');
    expect((await store.getRezervace('120260530'))?.duvody[0]?.kod).toBe('nedoruceno');
  });

  it('nepřiřazený bounce nechá rezervace být', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const item = await processOneMail(
      mail({
        messageId: 'bounce-2@seznam.cz',
        from: 'postmaster@seznam.cz',
        subject: 'Delivery Status Notification',
        text: 'Diagnostic-Code: smtp; 550 mailbox unavailable',
      }),
      store,
    );
    expect(item.reason).toBe('nedoruceno-neprirazeno');
    expect(await store.listRezervace()).toEqual([]);
  });

  it('chybí PIN → neodeslano a chybi_pin', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const item = await processOneMail(
      mail({
        messageId: 'msg-bez-pinu@test',
        from: 'noreply@better-hotel.com',
        authenticationResults: 'dkim=pass header.d=better-hotel.com; spf=pass',
        text: BLOCK.replace('ACCESS_PIN: 1234\n', '').replace('REZERVACE: 120260530', 'REZERVACE: 55'),
      }),
      store,
    );
    expect(item.status).toBe('neodeslano');
    expect(item.reason).toBe('chybi_pin');
    expect(sendGuestEmail).not.toHaveBeenCalled();
    const rec = await store.getRezervace('55');
    expect(rec?.stav).toBe('neodeslano');
    expect(rec?.duvody.some((d) => d.kod === 'chybi_pin')).toBe(true);
  });

  it('starý záznam odesláno se znovu nepošle a nepřepíše', async () => {
    const { processOneMail } = await import('./process-inbox');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vivien-store-'));
    const file = path.join(dir, 'store.json');
    fs.writeFileSync(
      file,
      JSON.stringify({
        messages: {},
        rezervace: {
          '120260530': {
            status: 'odeslano',
            odjezd: '2026-11-18',
            emailHosta: 'host@example.com',
            processedAt: '2026-10-01T00:00:00.000Z',
            messageId: 'stary-mail',
          },
        },
      }),
    );
    const store = new FileProcessStore(file);
    const item = await processOneMail(
      mail({
        messageId: 'msg-znovu@test',
        from: 'noreply@better-hotel.com',
        authenticationResults: 'dkim=pass header.d=better-hotel.com; spf=pass',
        text: BLOCK,
      }),
      store,
    );
    expect(item.status).toBe('doplneno');
    expect(sendGuestEmail).not.toHaveBeenCalled();
    const rec = await store.getRezervace('120260530');
    expect(rec?.stav).toBe('odeslano');
    expect(rec?.apartman).toBeTruthy();
    expect(rec?.jmeno).toBeTruthy();
    expect(rec?.historie.some((h) => h.co.startsWith('Doplněno z check-inu'))).toBe(true);
  });

  const NOVA = 'Vivien Apartmens Character and Atmosphere | Nová rezervace - #100000001';
  const TELO = [
    'Nová rezervace',
    'Číslo',
    '100000001',
    'Zarezervováno',
    '6.10.2026',
    'Příjezd',
    '20.11.2026',
    'Odjezd',
    '22.11.2026',
    'Agentura',
    'Booking.com',
    'Klient',
    'Jana Malá',
    'Email',
    'jana.mala@example.com',
    'Telefon',
    '777 123 456',
    'Rezervované pokoje',
    'Jemná harmonie (Gentle Harmony) - počet hostů: 2',
  ].join('\n');

  function interni(partial: Partial<InboxMail> & Pick<InboxMail, 'messageId'>): InboxMail {
    return mail({
      from: 'Better Hotel <info@better-hotel.com>',
      subject: NOVA,
      authenticationResults: 'dkim=pass header.d=mg2.better-hotel.com',
      text: TELO,
      ...partial,
    });
  }

  it('podvržený e-mail bez DKIM se odmítne a záznam nevznikne', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const item = await processOneMail(
      interni({
        messageId: 'podvrh@test',
        authenticationResults: null,
      }),
      store,
    );
    expect(item.status).toBe('rejected');
    expect(await store.getRezervace('100000001')).toBeNull();
    expect(sendGuestEmail).not.toHaveBeenCalled();
  });

  it('nová rezervace založí záznam a check-in ho doplní a pošle průvodce', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const zalozeno = await processOneMail(interni({ messageId: 'nova@test' }), store);
    expect(zalozeno.status).toBe('bez_checkinu');
    expect(sendGuestEmail).not.toHaveBeenCalled();
    const pred = await store.getRezervace('100000001');
    expect(pred?.stav).toBe('bez_checkinu');
    expect(pred?.telefonRezervace).toBe('+420777123456');
    expect(pred?.apartman).toBe('V1');

    const checkin = BLOCK.replace('REZERVACE: 120260530', 'REZERVACE: 100000001').replace(
      'EMAIL: host@example.com',
      'EMAIL: jana.mala@example.com\nGUEST_NAME: Jana\nGUEST_SURNAME: Malá\nGUEST_PHONE: +420777999888\nDATE: 6.10.2026',
    );
    const item = await processOneMail(
      mail({
        messageId: 'checkin@test',
        from: 'noreply@better-hotel.com',
        authenticationResults: 'dkim=pass header.d=better-hotel.com',
        text: checkin,
      }),
      store,
    );
    expect(item.status).toBe('sent');
    expect(sendGuestEmail).toHaveBeenCalledOnce();
    const po = await store.getRezervace('100000001');
    expect(po?.stav).toBe('odeslano');
    expect(po?.telefon).toBe('+420777999888');
    expect(po?.telefonRezervace).toBe('+420777123456');
  });

  it('ručně uložený telefon přežije check-in i další e-mail z Better Hotelu', async () => {
    const { processOneMail } = await import('./process-inbox');
    const { prazdnaRezervace } = await import('./store');
    const { zapisMajitele } = await import('./rucni-pole');
    const store = tmpStore();
    const id = '100000009';
    const zaklad = zapisMajitele(
      {
        ...prazdnaRezervace(id, '2026-10-14T08:00:00.000Z'),
        stav: 'odeslano',
        apartman: 'V1',
        prijezd: '2026-11-20',
        odjezd: '2026-11-22',
        noci: 2,
        osob: 2,
        jazyk: 'cs',
        jmeno: 'Jana Malá',
        emailHosta: 'jana.mala@example.com',
        accessPin: '1234',
        telefon: '+420777000111',
        telefonWa: '420777000111',
        telefonRezervace: '+420777000222',
        telefonRezervaceWa: '420777000222',
      },
      ['telefon', 'telefonRezervace'],
      {},
      'Telefon uložen',
    );
    await store.setRezervace(id, zaklad);
    const checkin = BLOCK.replace('REZERVACE: 120260530', `REZERVACE: ${id}`).replace(
      'EMAIL: host@example.com',
      'EMAIL: jana.mala@example.com\nGUEST_NAME: Jana\nGUEST_SURNAME: Malá\nGUEST_PHONE: +420777999888\nDATE: 6.10.2026',
    );
    await processOneMail(
      mail({
        messageId: 'rucni-checkin@test',
        from: 'noreply@better-hotel.com',
        authenticationResults: 'dkim=pass header.d=better-hotel.com',
        text: checkin,
      }),
      store,
    );
    const poCheckinu = await store.getRezervace(id);
    expect(poCheckinu?.telefon).toBe('+420777000111');
    expect(poCheckinu?.navrhy.some((n) => n.pole === 'telefon' && n.od === 'check-in')).toBe(true);
    expect(sendGuestEmail).not.toHaveBeenCalled();

    await processOneMail(
      interni({
        messageId: 'rucni-rez@test',
        subject: NOVA.replace('100000001', id),
        text: TELO.replaceAll('100000001', id).replace('777 123 456', '777 555 666'),
      }),
      store,
    );
    const poRezervaci = await store.getRezervace(id);
    expect(poRezervaci?.telefon).toBe('+420777000111');
    expect(poRezervaci?.telefonRezervace).toBe('+420777000222');
    expect(poRezervaci?.navrhy.some((n) => n.pole === 'telefonRezervace')).toBe(true);
  });

  it('zrušení zastaví odeslání průvodce', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    await processOneMail(interni({ messageId: 'nova-zrus@test' }), store);
    const zruseno = await processOneMail(
      interni({
        messageId: 'zrus@test',
        subject: 'Vivien Apartmens Character and Atmosphere | Zrušení rezervace - #100000001',
      }),
      store,
    );
    expect(zruseno.status).toBe('zruseno');

    const item = await processOneMail(
      mail({
        messageId: 'checkin-zrus@test',
        from: 'noreply@better-hotel.com',
        authenticationResults: 'dkim=pass header.d=better-hotel.com',
        text: BLOCK.replace('REZERVACE: 120260530', 'REZERVACE: 100000001'),
      }),
      store,
    );
    expect(item.status).toBe('zruseno');
    expect(sendGuestEmail).not.toHaveBeenCalled();
    expect((await store.getRezervace('100000001'))?.stav).toBe('zruseno');
  });

  it('ruční přidání založí záznam a stejné číslo ho jen doplní', async () => {
    const { doplnRezervaci } = await import('./rezervace-rucne');
    const store = tmpStore();
    const zalozeno = await doplnRezervaci(
      store,
      {
        rezervace: '120260541',
        jmeno: 'Eva Dvořáková',
        telefon: '777 123 456',
        apartman: 'V3',
        prijezd: '2026-11-16',
        odjezd: '2026-11-18',
        osob: 2,
        zdroj: 'Booking',
      },
      { stitek: 'rucne', historie: 'Přidáno ručně' },
    );
    expect(zalozeno).toEqual({ ok: true, nova: true });
    const pred = await store.getRezervace('120260541');
    expect(pred?.stav).toBe('bez_checkinu');
    expect(pred?.stitek).toBe('rucne');
    expect(pred?.telefonRezervace).toBe('+420777123456');
    expect(pred?.jmeno).toBe('Eva Dvořáková');
    expect(sendGuestEmail).not.toHaveBeenCalled();

    const doplneno = await doplnRezervaci(
      store,
      { rezervace: '120260541', jmeno: 'Jiný člověk', email: 'eva@example.com' },
      { stitek: 'rucne', historie: 'Přidáno ručně' },
    );
    expect(doplneno).toEqual({ ok: true, nova: false });
    const po = await store.getRezervace('120260541');
    expect(po?.jmeno).toBe('Eva Dvořáková');
    expect(po?.emailHosta).toBe('eva@example.com');
    expect(po?.stitek).toBe('rucne');
  });

  it('check-in ruční záznam doplní a průvodce odejde, telefon z formuláře zůstane', async () => {
    const { doplnRezervaci } = await import('./rezervace-rucne');
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    await doplnRezervaci(
      store,
      {
        rezervace: '120260530',
        jmeno: 'Eva Dvořáková',
        telefon: '777 123 456',
        apartman: 'V3',
      },
      { stitek: 'rucne', historie: 'Přidáno ručně' },
    );
    const item = await processOneMail(
      mail({
        messageId: 'rucni-checkin@test',
        from: 'noreply@better-hotel.com',
        authenticationResults: 'dkim=pass header.d=better-hotel.com; spf=pass',
        text: BLOCK,
      }),
      store,
    );
    expect(item.status).toBe('sent');
    expect(sendGuestEmail).toHaveBeenCalledOnce();
    const po = await store.getRezervace('120260530');
    expect(po?.stav).toBe('odeslano');
    expect(po?.telefonRezervace).toBe('+420777123456');
    expect(po?.apartman).toBe('V3');
    expect(po?.navrhy.some((n) => n.pole === 'apartman' && n.hodnota === 'V5')).toBe(true);
  });

  it('přeposlaná nová rezervace z info@ založí řádek a hostovi nic nepošle', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const item = await processOneMail(
      mail({
        messageId: 'fwd-nova@test',
        from: `VIVIEN <${MAJITEL}>`,
        subject: NOVA,
        authenticationResults: 'dkim=pass header.d=seznam.cz',
        text: TELO,
      }),
      store,
    );
    expect(item.status).toBe('bez_checkinu');
    expect(sendGuestEmail).not.toHaveBeenCalled();
    const rec = await store.getRezervace('100000001');
    expect(rec?.stitek).toBe('info');
    expect(rec?.jmeno).toBe('Jana Malá');
    expect(rec?.apartman).toBe('V1');
  });

  it('potvrzení rezervace z info@ založí řádek', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const item = await processOneMail(
      mail({
        messageId: 'fwd-potvrzeni@test',
        from: MAJITEL,
        subject: 'Rezervace 120260541, Jan Novák : Potvrzení rezervace',
        authenticationResults: null,
        text: [
          'Jméno: Jan Novák',
          'E-mail: jan@example.com',
          'Telefon: 777 111 222',
          'Příjezd: 16.11.2026',
          'Odjezd: 18.11.2026',
          'Typ ubytování: Večerní elegance',
          'Počet nocí: 2',
        ].join('\n'),
      }),
      store,
    );
    expect(item.status).toBe('bez_checkinu');
    expect(sendGuestEmail).not.toHaveBeenCalled();
    const rec = await store.getRezervace('120260541');
    expect(rec?.stitek).toBe('info');
    expect(rec?.jmeno).toBe('Jan Novák');
    expect(rec?.apartman).toBe('V3');
    expect(rec?.prijezd).toBe('2026-11-16');
    expect(rec?.odjezd).toBe('2026-11-18');
    expect(rec?.telefonRezervace).toBe('+420777111222');
    expect(rec?.noci).toBe(2);
  });

  it('anglické potvrzení z info@ založí řádek a hostovi nic nepošle', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const item = await processOneMail(
      mail({
        messageId: 'fwd-en@test',
        from: MAJITEL,
        subject: 'Reservation 120260439, Ada Novak: Reservation confirmation',
        text: 'Reservation 120260439',
      }),
      store,
    );
    expect(item.status).toBe('bez_checkinu');
    expect(sendGuestEmail).not.toHaveBeenCalled();
    const rec = await store.getRezervace('120260439');
    expect(rec?.stitek).toBe('info');
    expect(rec?.jmeno).toBeFalsy();
  });

  it('anglické potvrzení bere booking name a typ ubytování z dalšího řádku', async () => {
    const { parsujPotvrzeni } = await import('./potvrzeni-rezervace');
    const predmet = 'Reservation 120260439, Vivien Apartmens Character and Atmosphere: Reservation confirmation';
    const radky = [
      'Booking name: Host Test',
      'Arrival: 14/10/2026',
      'Departure date: 15/10/2026',
      'Accommodation type:',
      'Noble Contrast',
      'Number of nights: 1',
      'Number of Guests: 2',
    ];
    const html = `<table><tr><td>Booking name:</td><td>Host Test</td></tr><tr><td>Arrival:</td><td>14/10/2026</td></tr><tr><td>Departure date:</td><td>15/10/2026</td></tr><tr><td>Accommodation type:</td><td>Noble Contrast</td></tr><tr><td>Number of nights:</td><td>1</td></tr><tr><td>Number of Guests:</td><td>2</td></tr></table>`;
    for (const u of [parsujPotvrzeni(predmet, '', radky.join('\n')), parsujPotvrzeni(predmet, html, '')]) {
      expect(u?.jmeno).toBe('Host Test');
      expect(u?.jmeno).not.toContain('Vivien');
      expect(u?.apartman).toBe('V4');
      expect(u?.prijezd).toBe('2026-10-14');
      expect(u?.odjezd).toBe('2026-10-15');
      expect(u?.noci).toBe(1);
      expect(u?.osob).toBe(2);
    }
  });

  it('už označené potvrzení bez řádku se doplní a průvodce neodejde', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    await store.markMessage({
      messageId: 'stare-potvrzeni@test',
      processedAt: '2026-10-13T15:36:00.000Z',
      status: 'skipped_no_data',
      reason: 'bez čísla rezervace',
    });
    const item = await processOneMail(
      mail({
        messageId: 'stare-potvrzeni@test',
        from: MAJITEL,
        subject: 'Rezervace 120260541, Jan Novák : Potvrzení rezervace',
        text: 'Telefon: 777 111 222',
      }),
      store,
    );
    expect(item.status).toBe('bez_checkinu');
    expect(sendGuestEmail).not.toHaveBeenCalled();
    expect(await store.getRezervace('120260541')).toBeTruthy();
  });

  it('výzva k check-inu bez dat založí řádek a průvodce neodejde', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const item = await processOneMail(
      mail({
        messageId: 'vyzva@test',
        from: MAJITEL,
        subject: 'Váš online check-in - nutnost vyplnění. Rezervace 120260509',
        text: 'Vyplňte check-in',
      }),
      store,
    );
    expect(item.status).toBe('bez_checkinu');
    expect(sendGuestEmail).not.toHaveBeenCalled();
    expect((await store.getRezervace('120260509'))?.checkinUrl).toBeNull();
  });

  it('výzva uloží href odkazu a ruční odkaz nepřepíše', async () => {
    const { processOneMail } = await import('./process-inbox');
    const { odkazCheckinuZVyzvy } = await import('./potvrzeni-rezervace');
    const html = [
      '<a href="https://www.google.com/logo.png">logo</a>',
      '<a href="https://checkin.example.com/formular/120260541?x=1&amp;y=2">Vivien Apartmens Character and Atmosphere / #120260541 / online checkin</a>',
    ].join('');
    expect(odkazCheckinuZVyzvy(html)).toBe('https://checkin.example.com/formular/120260541?x=1&y=2');
    expect(odkazCheckinuZVyzvy(html)).not.toContain('Vivien');

    const store = tmpStore();
    const predmet = 'Váš online check-in - nutnost vyplnění pro přidělení přístupu - Rezervace 120260541, Vivien Apartmens Character and Atmosphere';
    const zalozeni = await processOneMail(
      mail({
        messageId: 'vyzva-odkaz@test',
        from: MAJITEL,
        subject: predmet,
        text: 'Vyplňte check-in',
        html,
      }),
      store,
    );
    expect(zalozeni.status).toBe('bez_checkinu');
    expect(sendGuestEmail).not.toHaveBeenCalled();
    expect((await store.getRezervace('120260541'))?.checkinUrl).toBe(
      'https://checkin.example.com/formular/120260541?x=1&y=2',
    );

    await store.markMessage({
      messageId: 'vyzva-odkaz@test',
      processedAt: '2026-10-14T06:00:00.000Z',
      status: 'skipped_no_data',
      reason: 'preposlano',
      rezervace: '120260541',
    });
    const rec = await store.getRezervace('120260541');
    await store.setRezervace('120260541', { ...rec!, checkinUrl: 'https://rucne.example/formular' });
    const znovu = await processOneMail(
      mail({
        messageId: 'vyzva-odkaz@test',
        from: MAJITEL,
        subject: predmet,
        text: 'Vyplňte check-in',
        html,
      }),
      store,
    );
    expect(znovu.status).toBe('already_done');
    expect((await store.getRezervace('120260541'))?.checkinUrl).toBe('https://rucne.example/formular');
    expect(await store.listRezervace()).toHaveLength(1);
  });

  it('už označená výzva doplní prázdný odkaz a druhý řádek nevznikne', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const html = '<a href="https://checkin.example.com/formular/120260556">online checkin</a>';
    const predmet = 'Váš online check-in - nutnost vyplnění. Rezervace 120260556';
    await store.markMessage({
      messageId: 'vyzva-prazdna@test',
      processedAt: '2026-10-14T06:00:00.000Z',
      status: 'bez_checkinu',
      reason: 'preposlano',
      rezervace: '120260556',
    });
    const prazdna = await processOneMail(
      mail({ messageId: 'jina@test', from: MAJITEL, subject: predmet, text: 'bez odkazu' }),
      store,
    );
    expect(prazdna.status).toBe('bez_checkinu');
    expect((await store.getRezervace('120260556'))?.checkinUrl).toBeNull();

    await store.markMessage({
      messageId: 'vyzva-prazdna@test',
      processedAt: '2026-10-14T06:00:00.000Z',
      status: 'bez_checkinu',
      reason: 'preposlano',
      rezervace: '120260556',
    });
    const doplneni = await processOneMail(
      mail({
        messageId: 'vyzva-prazdna@test',
        from: MAJITEL,
        subject: predmet,
        text: 'Vyplňte check-in',
        html,
      }),
      store,
    );
    expect(doplneni.status).toBe('bez_checkinu');
    expect(sendGuestEmail).not.toHaveBeenCalled();
    expect((await store.getRezervace('120260556'))?.checkinUrl).toBe('https://checkin.example.com/formular/120260556');
    expect(await store.listRezervace()).toHaveLength(1);
  });

  it('anglická výzva od info@ uloží odkaz a nic nepošle', async () => {
    const { processOneMail } = await import('./process-inbox');
    const { jeVyzvaCheckinu } = await import('./potvrzeni-rezervace');
    const predmet = 'Your online check\u2011in \u2013 required to receive access - Reservation #120260700';
    expect(jeVyzvaCheckinu(predmet)).toBe(true);
    const store = tmpStore();
    const html =
      '<a href="https://checkin.example.com/formular/120260700">Vivien apartments / #120260700 / online checkin</a>';
    const item = await processOneMail(
      mail({
        messageId: 'en-vyzva@test',
        from: `Vivien apartments <${MAJITEL}>`,
        subject: predmet,
        text: 'Please complete the online check-in',
        html,
      }),
      store,
    );
    expect(item.status).toBe('bez_checkinu');
    expect(sendGuestEmail).not.toHaveBeenCalled();
    expect((await store.getRezervace('120260700'))?.checkinUrl).toBe('https://checkin.example.com/formular/120260700');
  });

  it('výzva po hotovém check-inu doplní prázdný odkaz a průvodce znovu neodejde', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const rec = prazdnaRezervace('120260701', '2026-10-15T08:00:00.000Z');
    rec.stav = 'odeslano';
    rec.jmeno = 'Luis Garcia';
    rec.telefon = '+420777111222';
    rec.apartman = 'V2';
    rec.prijezd = '2026-10-15';
    rec.odjezd = '2026-10-17';
    await store.setRezervace(rec.rezervace, rec);
    const html =
      '<a href="https://checkin.example.com/formular/120260701">Vivien apartments / #120260701 / online checkin</a>';
    const item = await processOneMail(
      mail({
        messageId: 'en-po-checkinu@test',
        from: `Vivien apartments <${MAJITEL}>`,
        subject: 'Your online check-in \u2013 required to receive access',
        text: 'Please complete the online check-in',
        html,
      }),
      store,
    );
    expect(item.status).toBe('bez_checkinu');
    expect(sendGuestEmail).not.toHaveBeenCalled();
    const po = await store.getRezervace('120260701');
    expect(po?.checkinUrl).toBe('https://checkin.example.com/formular/120260701');
    expect(po?.stav).toBe('odeslano');
    expect(po?.jmeno).toBe('Luis Garcia');
    expect(po?.telefon).toBe('+420777111222');
  });

  it('přeposlaný check-in z info@ se Seznamem neprojde a průvodce neodejde', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const item = await processOneMail(
      mail({
        messageId: 'fwd-checkin-seznam@test',
        from: `VIVIEN <${MAJITEL}>`,
        subject: 'Fwd: check-in',
        authenticationResults: 'dkim=pass header.d=seznam.cz',
        text: BLOCK,
      }),
      store,
    );
    expect(item.status).toBe('rejected');
    expect(item.reason).toBe('Přeposlání bez platného SPF/DKIM majitele');
    expect(sendGuestEmail).not.toHaveBeenCalled();
  });

  it('přeposlaný check-in z info@ projde, jen když ověření patří schránce', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    const item = await processOneMail(
      mail({
        messageId: 'fwd-checkin-ok@test',
        from: `VIVIEN <${MAJITEL}>`,
        authenticationResults: 'spf=pass smtp.mailfrom=vivienapartments.cz',
        text: BLOCK,
      }),
      store,
    );
    expect(item.status).toBe('sent');
    expect(sendGuestEmail).toHaveBeenCalledOnce();
  });

  const PREDMET_541 = 'Rezervace 120260541, Vivien Apartmens Character and Atmosphere: Potvrzení rezervace';
  const RADKY_541 = [
    'Rezervace na jméno: Karolína Košťálová',
    'Datum příjezdu: 14.10.2026',
    'Datum odjezdu: 15.10.2026',
    'Typ ubytování: Ušlechtilý kontrast',
    'Počet nocí: 1',
    'Počet hostů: 2',
  ];

  it('jméno bere z řádku rezervace na jméno, ne z předmětu', async () => {
    const { parsujPotvrzeni } = await import('./potvrzeni-rezervace');
    const html = `<table>${RADKY_541.map((r) => {
      const [a, b] = r.split(': ');
      return `<tr><td>${a}:</td><td>${b}</td></tr>`;
    }).join('')}</table>`;
    const zHtml = parsujPotvrzeni(PREDMET_541, html, '');
    const zCitace = parsujPotvrzeni(PREDMET_541, '', RADKY_541.map((r) => `> ${r}`).join('\n'));
    for (const u of [zHtml, zCitace]) {
      expect(u?.jmeno).toBe('Karolína Košťálová');
      expect(u?.jmeno).not.toContain('Vivien');
      expect(u?.apartman).toBe('V4');
      expect(u?.prijezd).toBe('2026-10-14');
      expect(u?.odjezd).toBe('2026-10-15');
      expect(u?.noci).toBe(1);
      expect(u?.osob).toBe(2);
      expect(u?.telefon).toBeFalsy();
    }
  });

  it('špatné jméno z předmětu se opraví a check-in se nepřepíše', async () => {
    const { processOneMail } = await import('./process-inbox');
    const store = tmpStore();
    await store.markMessage({
      messageId: 'stare-541@test',
      processedAt: '2026-10-13T20:49:00.000Z',
      status: 'skipped_no_data',
      reason: 'preposlano',
      rezervace: '120260541',
    });
    await store.setRezervace('120260541', {
      ...(await import('./store')).prazdnaRezervace('120260541', '2026-10-13T20:49:00.000Z'),
      jmeno: 'Vivien Apartmens Character and Atmosphere',
      krestni: 'Vivien',
      stav: 'bez_checkinu',
      stitek: 'info',
    });
    const oprava = await processOneMail(
      mail({
        messageId: 'stare-541@test',
        from: MAJITEL,
        subject: PREDMET_541,
        text: RADKY_541.join('\n'),
      }),
      store,
    );
    expect(oprava.status).toBe('bez_checkinu');
    expect(sendGuestEmail).not.toHaveBeenCalled();
    const po = await store.getRezervace('120260541');
    expect(po?.jmeno).toBe('Karolína Košťálová');
    expect(po?.apartman).toBe('V4');
    expect(po?.odjezd).toBe('2026-10-15');

    sendGuestEmail.mockClear();
    const checkin = await processOneMail(
      mail({
        messageId: 'checkin-541@test',
        from: 'noreply@better-hotel.com',
        authenticationResults: 'dkim=pass header.d=better-hotel.com; spf=pass',
        text: `
VIVIEN-DATA v1
REZERVACE: 120260541
APARTMAN: Ušlechtilý kontrast
PRIJEZD: 14.10.2026
ODJEZD: 15.10.2026
NOCI: 1
OSOB: 2
EMAIL: host@example.com
GUEST_NAME: Karolína
GUEST_SURNAME: Košťálová
NARODNOST: CZE
ACCESS_PIN: 1234
KLIC: ${BH_KLIC}
KONEC
`,
      }),
      store,
    );
    expect(checkin.status).toBe('sent');
    expect(sendGuestEmail).toHaveBeenCalledOnce();
    const poCheckinu = await store.getRezervace('120260541');
    expect(poCheckinu?.stav).toBe('odeslano');
    expect(await store.listRezervace()).toHaveLength(1);

    const znovu = await processOneMail(
      mail({
        messageId: 'stare-541-znovu@test',
        from: MAJITEL,
        subject: PREDMET_541,
        text: RADKY_541.join('\n'),
      }),
      store,
    );
    expect(znovu.status).not.toBe('sent');
    const poZnovu = await store.getRezervace('120260541');
    expect(poZnovu?.stav).toBe('odeslano');
    expect(poZnovu?.jmeno).toBe(poCheckinu?.jmeno);
    expect(poZnovu?.apartman).toBe('V4');
    expect(await store.listRezervace()).toHaveLength(1);
    expect(sendGuestEmail).toHaveBeenCalledOnce();
  });

  it('check-in přepíše údaje z info@ a ruční čas příjezdu nechá', async () => {
    const { processOneMail } = await import('./process-inbox');
    const { prazdnaRezervace } = await import('./store');
    const store = tmpStore();
    await store.setRezervace('120269001', {
      ...prazdnaRezervace('120269001', '2026-10-14T08:00:00.000Z'),
      jmeno: 'Vivien Apartmens Character and Atmosphere',
      krestni: 'Vivien',
      apartman: 'V1',
      prijezd: '2026-11-01',
      odjezd: '2026-11-02',
      jazyk: 'en',
      stav: 'bez_checkinu',
      stitek: 'info',
      casPrijezdu: '16:30',
      telefonRezervace: '+420777111222',
      telefonRezervaceWa: '420777111222',
      checkinUrl: 'https://rucne.example/formular',
    });
    const item = await processOneMail(
      mail({
        messageId: 'checkin-hu@test',
        from: 'noreply@better-hotel.com',
        authenticationResults: 'dkim=pass header.d=better-hotel.com; spf=pass',
        text: `
VIVIEN-DATA v1
REZERVACE: 120269001
APARTMAN: Ušlechtilý kontrast
PRIJEZD: 20.11.2026
ODJEZD: 22.11.2026
NOCI: 2
OSOB: 2
EMAIL: host@example.com
GUEST_NAME: Anna
GUEST_SURNAME: Nagy
NARODNOST: HUN
GUEST_PHONE: +36301234567
ZDROJ: Booking.com
ACCESS_PIN: 1234
DATE: 14.10.2026
KLIC: ${BH_KLIC}
KONEC
`,
      }),
      store,
    );
    expect(item.status).toBe('sent');
    expect(sendGuestEmail).toHaveBeenCalledOnce();
    const rec = await store.getRezervace('120269001');
    expect(rec?.jmeno).toBe('Anna Nagy');
    expect(rec?.jmeno).not.toContain('Vivien');
    expect(rec?.apartman).toBe('V4');
    expect(rec?.prijezd).toBe('2026-11-20');
    expect(rec?.odjezd).toBe('2026-11-22');
    expect(rec?.jazyk).toBe('hu');
    expect(rec?.narodnost).toBe('HUN');
    expect(rec?.casPrijezdu).toBe('16:30');
    expect(rec?.checkinUrl).toBe('https://rucne.example/formular');
    expect(rec?.telefon).toBe('+36301234567');
    expect(rec?.telefonRezervace).toBe('+420777111222');
    expect(rec?.historie.some((h) => h.co.startsWith('Doplněno z check-inu'))).toBe(true);
    expect(await store.listRezervace()).toHaveLength(1);
  });

  it('už odeslaný průvodce se z check-inu doplní a znovu neodejde', async () => {
    const { processOneMail } = await import('./process-inbox');
    const { prazdnaRezervace } = await import('./store');
    const store = tmpStore();
    await store.setRezervace('120269002', {
      ...prazdnaRezervace('120269002', '2026-10-14T08:00:00.000Z'),
      jmeno: 'Vivien Apartmens Character and Atmosphere',
      apartman: 'V1',
      prijezd: '2026-11-01',
      odjezd: '2026-11-02',
      jazyk: 'en',
      emailHosta: 'host@example.com',
      accessPin: '9999',
      stav: 'odeslano',
      casPrijezdu: '15:00',
    });
    await store.markMessage({
      messageId: 'checkin-stary@test',
      processedAt: '2026-10-14T08:05:00.000Z',
      status: 'duplicate',
      reason: 'Rezervace už odeslána',
      rezervace: '120269002',
    });
    const item = await processOneMail(
      mail({
        messageId: 'checkin-stary@test',
        from: 'noreply@better-hotel.com',
        authenticationResults: 'dkim=pass header.d=better-hotel.com; spf=pass',
        text: `
VIVIEN-DATA v1
REZERVACE: 120269002
APARTMAN: Pohodlí v tlumených tónech
PRIJEZD: 16.11.2026
ODJEZD: 18.11.2026
NOCI: 2
OSOB: 2
EMAIL: host@example.com
GUEST_NAME: Anna
GUEST_SURNAME: Nagy
NARODNOST: HUN
ACCESS_PIN: 1234
KLIC: ${BH_KLIC}
KONEC
`,
      }),
      store,
    );
    expect(item.status).toBe('doplneno');
    expect(sendGuestEmail).not.toHaveBeenCalled();
    const rec = await store.getRezervace('120269002');
    expect(rec?.jmeno).toBe('Anna Nagy');
    expect(rec?.jazyk).toBe('hu');
    expect(rec?.stav).toBe('odeslano');
    expect(rec?.casPrijezdu).toBe('15:00');
    expect(await store.listRezervace()).toHaveLength(1);
  });

  it('ruční oprava má přednost před check-inem', async () => {
    const { processOneMail } = await import('./process-inbox');
    const { prazdnaRezervace } = await import('./store');
    const store = tmpStore();
    await store.setRezervace('120269003', {
      ...prazdnaRezervace('120269003', '2026-10-14T08:00:00.000Z'),
      jmeno: 'Vivien Apartmens Character and Atmosphere',
      apartman: 'V2',
      prijezd: '2026-11-01',
      odjezd: '2026-11-03',
      jazyk: 'cs',
      emailHosta: 'rucne@example.com',
      accessPin: '4321',
      stav: 'odeslano',
      historie: [{ cas: '2026-10-14T08:10:00.000Z', co: 'Údaje opraveny' }],
    });
    const item = await processOneMail(
      mail({
        messageId: 'checkin-rucni@test',
        from: 'noreply@better-hotel.com',
        authenticationResults: 'dkim=pass header.d=better-hotel.com; spf=pass',
        text: BLOCK.replace('REZERVACE: 120260530', 'REZERVACE: 120269003').replace('NARODNOST: CZE', 'NARODNOST: HUN'),
      }),
      store,
    );
    expect(item.status).toBe('doplneno');
    expect(sendGuestEmail).not.toHaveBeenCalled();
    const rec = await store.getRezervace('120269003');
    expect(rec?.jazyk).toBe('cs');
    expect(rec?.apartman).toBe('V2');
    expect(rec?.emailHosta).toBe('rucne@example.com');
    expect(rec?.accessPin).toBe('4321');
    expect(rec?.jmeno).not.toContain('Vivien');
  });

  it('odkaz znovu v maďarštině má jazyk hu', async () => {
    const { odkazNaPruvodce } = await import('./posli-pruvodce');
    const { prazdnaRezervace } = await import('./store');
    const { verifyToken } = await import('./token');
    const rec = {
      ...prazdnaRezervace('120269001', '2026-10-14T08:00:00.000Z'),
      apartman: 'V4' as const,
      prijezd: '2026-11-20',
      odjezd: '2026-11-22',
      jazyk: 'hu' as const,
      accessPin: '1234',
    };
    const url = odkazNaPruvodce(rec);
    const token = url?.split('/').pop() || '';
    const vysledek = verifyToken(token, 'x'.repeat(40));
    expect(vysledek.ok).toBe(true);
    if (vysledek.ok) expect(vysledek.payload.l).toBe('hu');
  });

  it('jeden spadlý e-mail neshodí zpracování ostatních', async () => {
    const { runInboxProcessing } = await import('./process-inbox');
    const store = tmpStore();
    const puvodni = store.isMessageProcessed.bind(store);
    store.isMessageProcessed = async (id: string) => {
      if (id === 'boom@test') throw new Error('rozbity mail');
      return puvodni(id);
    };
    const summary = await runInboxProcessing({
      store,
      mails: [
        mail({
          messageId: 'boom@test',
          from: MAJITEL,
          subject: 'Rezervace 120269999, Vivien Apartmens Character and Atmosphere: Potvrzení rezervace',
          text: 'x',
        }),
        mail({
          messageId: 'dalsi@test',
          from: MAJITEL,
          subject: PREDMET_541,
          text: RADKY_541.join('\n'),
        }),
      ],
    });
    expect(summary.errors).toBe(1);
    expect(summary.scanned).toBe(2);
    expect((await store.getRezervace('120260541'))?.apartman).toBe('V4');
    expect(sendGuestEmail).not.toHaveBeenCalled();
  });

  it('chyba při čtení spamu neshodí check-in', async () => {
    const { runInboxProcessing } = await import('./process-inbox');
    const store = tmpStore();
    const summary = await runInboxProcessing({
      store,
      spam: async () => {
        throw new Error('imap spam');
      },
      mails: [
        mail({
          messageId: 'msg-spam-ok@test',
          from: 'noreply@better-hotel.com',
          authenticationResults: 'dkim=pass header.d=better-hotel.com; spf=pass',
          text: BLOCK,
        }),
      ],
    });
    expect(summary.errors).toBe(1);
    expect(summary.items.some((item) => item.reason === 'Spam se nepodařilo projít.')).toBe(true);
    expect(summary.sent).toBe(1);
    expect((await store.getRezervace('120260530'))?.stav).toBe('odeslano');
  });
});
