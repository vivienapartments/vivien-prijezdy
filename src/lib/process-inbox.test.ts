import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InboxMail } from './inbox-mail';
import { FileProcessStore } from './store';

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
    expect(item.status).toBe('duplicate');
    expect(sendGuestEmail).not.toHaveBeenCalled();
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as {
      rezervace: Record<string, { status?: string; stav?: string }>;
    };
    expect(raw.rezervace['120260530'].status).toBe('odeslano');
    expect(raw.rezervace['120260530'].stav).toBeUndefined();
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
    expect(po?.apartman).toBe('V5');
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
    expect(await store.getRezervace('120260509')).toBeTruthy();
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
});
