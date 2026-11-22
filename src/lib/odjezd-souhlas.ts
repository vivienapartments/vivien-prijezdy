import { casVPraze, denPraha } from './brana';
import { PREDSTIH_VYBER_PRODLOUZENI_MIN } from './constants';
import { t } from './i18n';
import { cenaPozde, zobrazCas } from './okno-pobytu';
import { polozkyZRezervace } from './odjezd';
import type { RezervaceRecord, ZadostOkna } from './store';
import type { GuideLang, LText } from './types';
import { GUIDE_LANGS } from './types';

export type OdjezdKanal = 'whatsapp' | 'pruvodce' | 'sms';

export const ODJEZD_KANALY: OdjezdKanal[] = ['whatsapp', 'pruvodce', 'sms'];

export function jeOdjezdKanal(v: unknown): v is OdjezdKanal {
  return v === 'whatsapp' || v === 'pruvodce' || v === 'sms';
}

function langOk(lang?: GuideLang | null): GuideLang {
  return lang && GUIDE_LANGS.includes(lang) ? lang : 'en';
}

export const ODJEZD_SOUHLAS_NADPIS: LText = {
  cs: 'Potvrzení odjezdu',
  en: 'Departure confirmation',
  de: 'Bestätigung der Abreise',
  pl: 'Potwierdzenie wyjazdu',
  uk: 'Підтвердження виїзду',
  'zh-Hant': '退房確認',
  sv: 'Bekräftelse av avresa',
  es: 'Confirmación de salida',
  hu: 'Távozás megerősítése',
  da: 'Bekræftelse af afrejse',
  fr: 'Confirmation du départ',
  it: 'Conferma della partenza',
  pt: 'Confirmação de partida',
};

/** Souhlas Ano/Ne (varianta A, schváleno 19. 11. 2026). */
export const ODJEZD_SOUHLAS_TEXT: LText = {
  cs: 'Souhlasíte se změnou času odjezdu na {{CAS}} a s poplatkem {{KC}} Kč?',
  en: 'Do you agree to change the departure time to {{CAS}} and to the fee of {{KC}} Kč?',
  de: 'Stimmen Sie der Änderung der Abreisezeit auf {{CAS}} und der Gebühr von {{KC}} Kč zu?',
  pl: 'Czy zgadzacie się na zmianę godziny wyjazdu na {{CAS}} i opłatę {{KC}} Kč?',
  uk: 'Чи погоджуєтесь змінити час виїзду на {{CAS}} і збір {{KC}} Kč?',
  'zh-Hant': '您是否同意將退房時間改為 {{CAS}}，並支付 {{KC}} Kč？',
  sv: 'Godkänner ni att ändra avresetiden till {{CAS}} och avgiften {{KC}} Kč?',
  es: '¿Están de acuerdo con cambiar la hora de salida a las {{CAS}} y con el cargo de {{KC}} Kč?',
  hu: 'Egyetértenek a {{CAS}} távozási idővel és a {{KC}} Kč díjjal?',
  da: 'Er I enige i at ændre afrejsetidspunktet til {{CAS}} og gebyret på {{KC}} Kč?',
  fr: 'Acceptez-vous le changement de l’heure de départ à {{CAS}} et les frais de {{KC}} Kč ?',
  it: 'Accettate di cambiare l’orario di partenza alle {{CAS}} e il costo di {{KC}} Kč?',
  pt: 'Concordam com a alteração da hora de partida para {{CAS}} e com a taxa de {{KC}} Kč?',
};

export const ODJEZD_KANAL_OTAZKA: LText = {
  cs: 'Jak vám máme napsat, až to schválíme?',
  en: 'How should we write to you once we approve it?',
  de: 'Wie sollen wir Ihnen schreiben, sobald wir es bestätigen?',
  pl: 'Jak mamy Wam napisać, gdy to potwierdzimy?',
  uk: 'Як нам вам написати, коли підтвердимо?',
  'zh-Hant': '核准後要以什麼方式通知您？',
  sv: 'Hur ska vi skriva till er när vi har godkänt det?',
  es: '¿Cómo les escribimos cuando lo confirmemos?',
  hu: 'Hogyan írjunk önöknek, ha jóváhagytuk?',
  da: 'Hvordan skal vi skrive til jer, når vi har godkendt det?',
  fr: 'Comment devons-nous vous écrire une fois que nous l’aurons confirmé ?',
  it: 'Come dobbiamo scrivervi quando lo confermiamo?',
  pt: 'Como devemos escrever-vos quando confirmarmos?',
};

export const ODJEZD_KANAL_STITKY: Record<OdjezdKanal, LText> = {
  whatsapp: {
    cs: 'WhatsApp',
    en: 'WhatsApp',
    de: 'WhatsApp',
    pl: 'WhatsApp',
    uk: 'WhatsApp',
    'zh-Hant': 'WhatsApp',
    sv: 'WhatsApp',
    es: 'WhatsApp',
    hu: 'WhatsApp',
    da: 'WhatsApp',
    fr: 'WhatsApp',
    it: 'WhatsApp',
    pt: 'WhatsApp',
  },
  pruvodce: {
    cs: 'V průvodci',
    en: 'In the guide',
    de: 'Im Guide',
    pl: 'W przewodniku',
    uk: 'У путівнику',
    'zh-Hant': '在指南中',
    sv: 'I guiden',
    es: 'En la guía',
    hu: 'Az útmutatóban',
    da: 'I guiden',
    fr: 'Dans le guide',
    it: 'Nella guida',
    pt: 'No guia',
  },
  sms: {
    cs: 'SMS',
    en: 'SMS',
    de: 'SMS',
    pl: 'SMS',
    uk: 'SMS',
    'zh-Hant': '簡訊',
    sv: 'SMS',
    es: 'SMS',
    hu: 'SMS',
    da: 'SMS',
    fr: 'SMS',
    it: 'SMS',
    pt: 'SMS',
  },
};

const CEKA_WHATSAPP: LText = {
  cs: 'Čas odjezdu {{CAS}} a poplatek {{KC}} Kč jsme přijali. Až ověříme, že je to možné, napíšeme vám na WhatsApp.',
  en: 'We have received the departure time {{CAS}} and the fee of {{KC}} Kč. When we confirm it is possible, we will write to you on WhatsApp.',
  de: 'Wir haben die Abreisezeit {{CAS}} und die Gebühr von {{KC}} Kč erhalten. Sobald wir bestätigt haben, dass es möglich ist, schreiben wir Ihnen auf WhatsApp.',
  pl: 'Przyjęliśmy godzinę wyjazdu {{CAS}} i opłatę {{KC}} Kč. Gdy potwierdzimy, że to możliwe, napiszemy do Was na WhatsApp.',
  uk: 'Ми прийняли час виїзду {{CAS}} і збір {{KC}} Kč. Коли підтвердимо, що це можливо, напишемо вам у WhatsApp.',
  'zh-Hant': '我們已收到退房時間 {{CAS}} 與費用 {{KC}} Kč。確認可行後，會透過 WhatsApp 通知您。',
  sv: 'Vi har mottagit avresetiden {{CAS}} och avgiften {{KC}} Kč. När vi bekräftat att det går skriver vi till er på WhatsApp.',
  es: 'Hemos recibido la hora de salida {{CAS}} y el cargo de {{KC}} Kč. Cuando confirmemos que es posible, les escribiremos por WhatsApp.',
  hu: 'Megkaptuk a {{CAS}} távozási időt és a {{KC}} Kč díjat. Ha megerősítjük, hogy lehetséges, WhatsAppon írunk.',
  da: 'Vi har modtaget afrejsetidspunktet {{CAS}} og gebyret på {{KC}} Kč. Når vi har bekræftet, at det er muligt, skriver vi til jer på WhatsApp.',
  fr: 'Nous avons bien reçu l’heure de départ {{CAS}} et les frais de {{KC}} Kč. Dès que nous confirmerons que c’est possible, nous vous écrirons sur WhatsApp.',
  it: 'Abbiamo ricevuto l’orario di partenza {{CAS}} e il costo di {{KC}} Kč. Quando confermeremo che è possibile, vi scriveremo su WhatsApp.',
  pt: 'Recebemos a hora de partida {{CAS}} e a taxa de {{KC}} Kč. Quando confirmarmos que é possível, escrevemos-vos no WhatsApp.',
};

const CEKA_PRUVODCE: LText = {
  cs: 'Čas odjezdu {{CAS}} a poplatek {{KC}} Kč jsme přijali. Až ověříme, že je to možné, napíšeme vám sem do průvodce.',
  en: 'We have received the departure time {{CAS}} and the fee of {{KC}} Kč. When we confirm it is possible, we will write to you here in the guide.',
  de: 'Wir haben die Abreisezeit {{CAS}} und die Gebühr von {{KC}} Kč erhalten. Sobald wir bestätigt haben, dass es möglich ist, schreiben wir Ihnen hier im Guide.',
  pl: 'Przyjęliśmy godzinę wyjazdu {{CAS}} i opłatę {{KC}} Kč. Gdy potwierdzimy, że to możliwe, napiszemy Wam tutaj w przewodniku.',
  uk: 'Ми прийняли час виїзду {{CAS}} і збір {{KC}} Kč. Коли підтвердимо, що це можливо, напишемо вам тут у путівнику.',
  'zh-Hant': '我們已收到退房時間 {{CAS}} 與費用 {{KC}} Kč。確認可行後，會在本指南通知您。',
  sv: 'Vi har mottagit avresetiden {{CAS}} och avgiften {{KC}} Kč. När vi bekräftat att det går skriver vi till er här i guiden.',
  es: 'Hemos recibido la hora de salida {{CAS}} y el cargo de {{KC}} Kč. Cuando confirmemos que es posible, les escribiremos aquí en la guía.',
  hu: 'Megkaptuk a {{CAS}} távozási időt és a {{KC}} Kč díjat. Ha megerősítjük, hogy lehetséges, ide írunk az útmutatóba.',
  da: 'Vi har modtaget afrejsetidspunktet {{CAS}} og gebyret på {{KC}} Kč. Når vi har bekræftet, at det er muligt, skriver vi til jer her i guiden.',
  fr: 'Nous avons bien reçu l’heure de départ {{CAS}} et les frais de {{KC}} Kč. Dès que nous confirmerons que c’est possible, nous vous écrirons ici dans le guide.',
  it: 'Abbiamo ricevuto l’orario di partenza {{CAS}} e il costo di {{KC}} Kč. Quando confermeremo che è possibile, vi scriveremo qui nella guida.',
  pt: 'Recebemos a hora de partida {{CAS}} e a taxa de {{KC}} Kč. Quando confirmarmos que é possível, escrevemos-vos aqui no guia.',
};

const CEKA_SMS: LText = {
  cs: 'Čas odjezdu {{CAS}} a poplatek {{KC}} Kč jsme přijali. Až ověříme, že je to možné, pošleme vám SMS.',
  en: 'We have received the departure time {{CAS}} and the fee of {{KC}} Kč. When we confirm it is possible, we will send you an SMS.',
  de: 'Wir haben die Abreisezeit {{CAS}} und die Gebühr von {{KC}} Kč erhalten. Sobald wir bestätigt haben, dass es möglich ist, senden wir Ihnen eine SMS.',
  pl: 'Przyjęliśmy godzinę wyjazdu {{CAS}} i opłatę {{KC}} Kč. Gdy potwierdzimy, że to możliwe, wyślemy Wam SMS.',
  uk: 'Ми прийняли час виїзду {{CAS}} і збір {{KC}} Kč. Коли підтвердимо, що це можливо, надішлемо вам SMS.',
  'zh-Hant': '我們已收到退房時間 {{CAS}} 與費用 {{KC}} Kč。確認可行後，會傳簡訊通知您。',
  sv: 'Vi har mottagit avresetiden {{CAS}} och avgiften {{KC}} Kč. När vi bekräftat att det går skickar vi ett SMS.',
  es: 'Hemos recibido la hora de salida {{CAS}} y el cargo de {{KC}} Kč. Cuando confirmemos que es posible, les enviaremos un SMS.',
  hu: 'Megkaptuk a {{CAS}} távozási időt és a {{KC}} Kč díjat. Ha megerősítjük, hogy lehetséges, SMS-t küldünk.',
  da: 'Vi har modtaget afrejsetidspunktet {{CAS}} og gebyret på {{KC}} Kč. Når vi har bekræftet, at det er muligt, sender vi jer en SMS.',
  fr: 'Nous avons bien reçu l’heure de départ {{CAS}} et les frais de {{KC}} Kč. Dès que nous confirmerons que c’est possible, nous vous enverrons un SMS.',
  it: 'Abbiamo ricevuto l’orario di partenza {{CAS}} e il costo di {{KC}} Kč. Quando confermeremo che è possibile, vi invieremo un SMS.',
  pt: 'Recebemos a hora de partida {{CAS}} e a taxa de {{KC}} Kč. Quando confirmarmos que é possível, enviamos-vos um SMS.',
};

export const ODJEZD_CEKA_NADPIS: LText = {
  cs: 'Čeká na schválení',
  en: 'Waiting for approval',
  de: 'Wartet auf Bestätigung',
  pl: 'Czeka na potwierdzenie',
  uk: 'Чекає на підтвердження',
  'zh-Hant': '等待核准',
  sv: 'Väntar på godkännande',
  es: 'Esperando confirmación',
  hu: 'Jóváhagyásra vár',
  da: 'Afventer godkendelse',
  fr: 'En attente de confirmation',
  it: 'In attesa di conferma',
  pt: 'A aguardar confirmação',
};

export const ODJEZD_CEKA_SBALENA: LText = {
  cs: 'Odjezd čeká na schválení',
  en: 'Departure waiting for approval',
  de: 'Abreise wartet auf Bestätigung',
  pl: 'Wyjazd czeka na potwierdzenie',
  uk: 'Виїзд чекає на підтвердження',
  'zh-Hant': '退房待核准',
  sv: 'Avresa väntar på godkännande',
  es: 'Salida pendiente de confirmación',
  hu: 'Távozás jóváhagyásra vár',
  da: 'Afrejse afventer godkendelse',
  fr: 'Départ en attente de confirmation',
  it: 'Partenza in attesa di conferma',
  pt: 'Partida a aguardar confirmação',
};

/** Potvrzení po schválení (WhatsApp / SMS). */
export const ODJEZD_SCHVALENO_ODESLAT: LText = {
  cs: 'Dobrý den, odjezd v {{CAS}} je potvrzený. Poplatek za pozdější odjezd je {{KC}} Kč.',
  en: 'Hello, departure at {{CAS}} is confirmed. The later departure fee is {{KC}} Kč.',
  de: 'Guten Tag, die Abreise um {{CAS}} ist bestätigt. Die Gebühr für die spätere Abreise beträgt {{KC}} Kč.',
  pl: 'Dzień dobry, wyjazd o {{CAS}} jest potwierdzony. Opłata za późniejszy wyjazd wynosi {{KC}} Kč.',
  uk: 'Добрий день, виїзд о {{CAS}} підтверджено. Збір за пізніший виїзд становить {{KC}} Kč.',
  'zh-Hant': '您好，{{CAS}} 退房已確認。延遲退房費用為 {{KC}} Kč。',
  sv: 'God dag, avresa kl. {{CAS}} är bekräftad. Avgiften för senare avresa är {{KC}} Kč.',
  es: 'Buenos días, la salida a las {{CAS}} está confirmada. El cargo por salida posterior es de {{KC}} Kč.',
  hu: 'Jó napot, a {{CAS}} távozás megerősítve. A későbbi távozás díja {{KC}} Kč.',
  da: 'Goddag, afrejse kl. {{CAS}} er bekræftet. Gebyret for senere afrejse er {{KC}} Kč.',
  fr: 'Bonjour, le départ à {{CAS}} est confirmé. Les frais pour un départ plus tardif sont de {{KC}} Kč.',
  it: 'Buongiorno, la partenza alle {{CAS}} è confermata. Il costo per la partenza più tardi è di {{KC}} Kč.',
  pt: 'Olá, a partida às {{CAS}} está confirmada. A taxa por partida mais tarde é de {{KC}} Kč.',
};

export function textSouhlasuOdjezdu(cas: string, kc: number, lang?: GuideLang | null): string {
  return t(ODJEZD_SOUHLAS_TEXT, langOk(lang))
    .replaceAll('{{CAS}}', zobrazCas(cas))
    .replaceAll('{{KC}}', String(kc));
}

export function textCekaOdjezdu(cas: string, kc: number, kanal: OdjezdKanal, lang?: GuideLang | null): string {
  const mapa = kanal === 'whatsapp' ? CEKA_WHATSAPP : kanal === 'sms' ? CEKA_SMS : CEKA_PRUVODCE;
  return t(mapa, langOk(lang))
    .replaceAll('{{CAS}}', zobrazCas(cas))
    .replaceAll('{{KC}}', String(kc));
}

export function textSchvaleniOdjezduOdeslat(cas: string, kc: number, lang?: GuideLang | null): string {
  return t(ODJEZD_SCHVALENO_ODESLAT, langOk(lang))
    .replaceAll('{{CAS}}', zobrazCas(cas))
    .replaceAll('{{KC}}', String(kc));
}

export function rozpisPozde(cas: string): { kc: number; pulhodin: number } | null {
  const kc = cenaPozde(cas);
  if (!kc) return null;
  return { kc, pulhodin: Math.round(kc / 75) };
}

/** Potvrzené / čekající prodloužení, které ještě není zaplacené. */
export function nevybraneProdlouzeni(
  rec: Pick<RezervaceRecord, 'zadostOdjezd' | 'platby' | 'zaplaceno' | 'stav' | 'nedojezdKdy'>,
): { cas: string; kc: number; stav: ZadostOkna['stav'] } | null {
  if (rec.stav === 'zruseno' || rec.nedojezdKdy) return null;
  const z = rec.zadostOdjezd;
  if (!z || z.kc <= 0) return null;
  if (z.stav !== 'ceka' && z.stav !== 'potvrzeno') return null;
  if (z.stav === 'potvrzeno') {
    const dluh = polozkyZRezervace(rec as RezervaceRecord).find((p) => p.druh === 'pozde');
    if (!dluh) return null;
    return { cas: z.cas, kc: dluh.kc, stav: z.stav };
  }
  return { cas: z.cas, kc: z.kc, stav: z.stav };
}

export type UpozorneniVyberProdlouzeni = {
  kdo: RezervaceRecord;
  kc: number;
  cas: string;
  kvuli: RezervaceRecord;
  klic: string;
  text: string;
};

/** Host už u nás bydlí (předán / na místě), ještě neodjel. Jinak výběr peněz nemá smysl. */
export function bydliTed(
  rec: Pick<RezervaceRecord, 'prijezd' | 'predano' | 'naMiste' | 'prevzatoKdy' | 'stav' | 'nedojezdKdy'>,
  dnes: string,
): boolean {
  if (rec.stav === 'zruseno' || rec.nedojezdKdy || rec.prevzatoKdy) return false;
  if (!rec.prijezd || rec.prijezd > dnes) return false;
  return Boolean(rec.predano || rec.naMiste);
}

/**
 * 10 min před převzetím jiného bytu: kdo má nezaplacené prodloužení.
 * Jen u hostů, co už bydlí (ne u těch, co ještě nepřijeli).
 * Klíč držíme u hosta s dluhem (`prodlouzeniVyberPush`).
 */
export function najdiVyberyProdlouzeni(
  list: RezervaceRecord[],
  now = new Date(),
): UpozorneniVyberProdlouzeni[] {
  const dnes = denPraha(now);
  const prevzetiDnes = list.filter(
    (r) =>
      r.stav !== 'zruseno' &&
      !r.nedojezdKdy &&
      r.odjezd === dnes &&
      r.casOdjezdu &&
      !r.prevzatoKdy,
  );
  const ven: UpozorneniVyberProdlouzeni[] = [];
  for (const kvuli of prevzetiDnes) {
    const [hh, mm] = (kvuli.casOdjezdu || '').split(':').map(Number);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) continue;
    const cil = casVPraze(dnes, hh, mm).getTime();
    const od = cil - PREDSTIH_VYBER_PRODLOUZENI_MIN * 60_000;
    if (now.getTime() < od || now.getTime() > cil) continue;
    const klicPrevzeti = `${kvuli.rezervace}:${kvuli.odjezd} ${kvuli.casOdjezdu}`;
    for (const kdo of list) {
      if (kdo.rezervace === kvuli.rezervace) continue;
      if (kdo.apartman && kvuli.apartman && kdo.apartman === kvuli.apartman) continue;
      if (!bydliTed(kdo, dnes)) continue;
      const dluh = nevybraneProdlouzeni(kdo);
      if (!dluh) continue;
      if (kdo.prodlouzeniVyberPush === klicPrevzeti) continue;
      const prijmeni = (kdo.jmeno || '').trim().split(/\s+/).filter(Boolean).slice(-1)[0] || kdo.rezervace;
      const apt = kdo.apartman || 'Apartmán';
      const aptKvuli = kvuli.apartman || 'jiný byt';
      ven.push({
        kdo,
        kc: dluh.kc,
        cas: dluh.cas,
        kvuli,
        klic: klicPrevzeti,
        text: `Za ${PREDSTIH_VYBER_PRODLOUZENI_MIN} min převzetí ${aptKvuli}. Vyberte prodloužení u ${prijmeni} · ${apt}: odjezd ${zobrazCas(dluh.cas)} · +${dluh.kc} Kč ještě nezaplaceno.`,
      });
    }
  }
  return ven;
}
