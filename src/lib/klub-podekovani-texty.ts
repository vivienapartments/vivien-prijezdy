/**
 * Texty poděkování napojeného na kartu klubu (PROMPT-PODEKOVANI-KLUB).
 * Neutrální oslovení bez rodu.
 */

import type { GuideLang, LText } from './types';

export const klubZapocitali: LText = {
  cs: 'Váš pobyt jsme započítali.',
  en: 'We have counted your stay.',
  de: 'Wir haben Ihren Aufenthalt angerechnet.',
  pl: 'Wasze pobyty zaliczyliśmy.',
  uk: 'Ми зарахували ваше перебування.',
  'zh-Hant': '我們已將您的住宿計入。',
  es: 'Hemos contabilizado su estancia.',
  fr: 'Nous avons comptabilisé votre séjour.',
  it: 'Abbiamo conteggiato il vostro soggiorno.',
  pt: 'Contámos a vossa estadia.',
  sv: 'Vi har räknat er vistelse.',
  hu: 'Beszámítottuk a tartózkodásukat.',
  da: 'Vi har medregnet jeres ophold.',
  fi: 'Olemme laskeneet majoituksenne.',
};

/** „Tímto pobytem máte úroveň X.“ – X se doplní. */
export const klubTimtoUrovniPred: LText = {
  cs: 'Tímto pobytem máte úroveň',
  en: 'With this stay your level is',
  de: 'Mit diesem Aufenthalt haben Sie die Stufe',
  pl: 'Tym pobytem macie poziom',
  uk: 'Цим перебуванням ваш рівень',
  'zh-Hant': '此次住宿後您的等級為',
  es: 'Con esta estancia su nivel es',
  fr: 'Avec ce séjour, votre niveau est',
  it: 'Con questo soggiorno il vostro livello è',
  pt: 'Com esta estadia o vosso nível é',
  sv: 'Med denna vistelse är er nivå',
  hu: 'Ezzel a tartózkodással a szintjük',
  da: 'Med dette ophold er jeres niveau',
  fi: 'Tällä majoituksella tasonne on',
};

export const klubVaseUrovenPred: LText = {
  cs: 'Vaše úroveň:',
  en: 'Your level:',
  de: 'Ihre Stufe:',
  pl: 'Wasza poziom:',
  uk: 'Ваш рівень:',
  'zh-Hant': '您的等級：',
  es: 'Su nivel:',
  fr: 'Votre niveau :',
  it: 'Il vostro livello:',
  pt: 'O vosso nível:',
  sv: 'Er nivå:',
  hu: 'Az Önök szintje:',
  da: 'Jeres niveau:',
  fi: 'Tasonne:',
};

export const klubBookingPodekovani5: LText = {
  cs: 'Jako poděkování máte 5 % na další pobyt, když rezervujete napřímo u nás.',
  en: 'As a thank you, you have 5% off your next stay when you book directly with us.',
  de: 'Als Dankeschön erhalten Sie 5 % auf den nächsten Aufenthalt bei Direktbuchung bei uns.',
  pl: 'W podziękowaniu macie 5 % na kolejny pobyt przy rezerwacji bezpośrednio u nas.',
  uk: 'Як подяку маєте 5 % на наступне перебування при прямому бронюванні в нас.',
  'zh-Hant': '為感謝您，若直接向我們預訂，下次住宿享 5% 優惠。',
  es: 'Como agradecimiento tiene un 5 % en la próxima estancia si reserva directamente con nosotros.',
  fr: 'En remerciement, vous avez 5 % sur le prochain séjour en réservant directement chez nous.',
  it: 'Come ringraziamento avete il 5 % sul prossimo soggiorno prenotando direttamente da noi.',
  pt: 'Como agradecimento têm 5 % na próxima estadia ao reservarem diretamente connosco.',
  sv: 'Som tack har ni 5 % på nästa vistelse när ni bokar direkt hos oss.',
  hu: 'Köszönetképpen 5 % kedvezmény a következő tartózkodásra, ha közvetlenül nálunk foglalnak.',
  da: 'Som tak har I 5 % på næste ophold, når I booker direkte hos os.',
  fi: 'Kiitoksena saatte 5 % seuraavasta majoituksesta, kun varatte suoraan meiltä.',
};

export const klubDoUrovneSablona: LText = {
  cs: 'Do úrovně {nazev} ({pct} %) vám chybí {kc} Kč.',
  en: 'You need {kc} CZK more to reach {nazev} ({pct} %).',
  de: 'Bis zur Stufe {nazev} ({pct} %) fehlen Ihnen {kc} Kč.',
  pl: 'Do poziomu {nazev} ({pct} %) brakuje Wam {kc} Kč.',
  uk: 'До рівня {nazev} ({pct} %) вам бракує {kc} Kč.',
  'zh-Hant': '距離等級 {nazev}（{pct} %）還差 {kc} Kč。',
  es: 'Le faltan {kc} Kč para el nivel {nazev} ({pct} %).',
  fr: 'Il vous manque {kc} Kč pour le niveau {nazev} ({pct} %).',
  it: 'Vi mancano {kc} Kč per il livello {nazev} ({pct} %).',
  pt: 'Faltam-vos {kc} Kč para o nível {nazev} ({pct} %).',
  sv: 'Det saknas {kc} Kč till nivån {nazev} ({pct} %).',
  hu: '{kc} Kč hiányzik a(z) {nazev} ({pct} %) szinthez.',
  da: 'Der mangler {kc} Kč til niveauet {nazev} ({pct} %).',
  fi: 'Tasoon {nazev} ({pct} %) tarvitaan vielä {kc} Kč.',
};

export const klubNejvyssiUroven: LText = {
  cs: 'Máte nejvyšší úroveň.',
  en: 'You have the highest level.',
  de: 'Sie haben die höchste Stufe.',
  pl: 'Macie najwyższy poziom.',
  uk: 'У вас найвищий рівень.',
  'zh-Hant': '您已是最高等級。',
  es: 'Tiene el nivel más alto.',
  fr: 'Vous avez le niveau le plus élevé.',
  it: 'Avete il livello più alto.',
  pt: 'Têm o nível mais alto.',
  sv: 'Ni har den högsta nivån.',
  hu: 'Önöknek van a legmagasabb szint.',
  da: 'I har det højeste niveau.',
  fi: 'Teillä on korkein taso.',
};

export const klubPodekovaniUvod: LText = {
  cs: 'Jako poděkování pro vás máme:',
  en: 'As a thank you, we have for you:',
  de: 'Als Dankeschön haben wir für Sie:',
  pl: 'W podziękowaniu mamy dla Was:',
  uk: 'Як подяку для вас маємо:',
  'zh-Hant': '為感謝您，我們準備了：',
  es: 'Como agradecimiento tenemos para usted:',
  fr: 'En remerciement, nous avons pour vous :',
  it: 'Come ringraziamento abbiamo per voi:',
  pt: 'Como agradecimento temos para vocês:',
  sv: 'Som tack har vi för er:',
  hu: 'Köszönetképpen ezt ajánljuk:',
  da: 'Som tak har vi til jer:',
  fi: 'Kiitoksena teille on:',
};

export const klubRadek1Nadpis: LText = {
  cs: 'Rezervovat další pobyt',
  en: 'Book another stay',
  de: 'Weiteren Aufenthalt buchen',
  pl: 'Zarezerwować kolejny pobyt',
  uk: 'Забронювати наступне перебування',
  'zh-Hant': '預訂下一次住宿',
  es: 'Reservar otra estancia',
  fr: 'Réserver un autre séjour',
  it: 'Prenotare un altro soggiorno',
  pt: 'Reservar outra estadia',
  sv: 'Boka nästa vistelse',
  hu: 'Következő tartózkodás foglalása',
  da: 'Book næste ophold',
  fi: 'Varaa seuraava majoitus',
};

/** Pod: sleva X % při rezervaci napřímo – X se doplní. */
export const klubRadek1PodPred: LText = {
  cs: 'sleva',
  en: 'discount',
  de: 'Rabatt',
  pl: 'zniżka',
  uk: 'знижка',
  'zh-Hant': '折扣',
  es: 'descuento',
  fr: 'réduction',
  it: 'sconto',
  pt: 'desconto',
  sv: 'rabatt',
  hu: 'kedvezmény',
  da: 'rabat',
  fi: 'alennus',
};

export const klubRadek1PodZa: LText = {
  cs: '% při rezervaci napřímo',
  en: '% when booking directly',
  de: '% bei Direktbuchung',
  pl: '% przy rezerwacji bezpośrednio',
  uk: '% при прямому бронюванні',
  'zh-Hant': '%（直接預訂）',
  es: '% al reservar directamente',
  fr: '% en réservant directement',
  it: '% prenotando direttamente',
  pt: '% ao reservar diretamente',
  sv: '% vid direktbokning',
  hu: '% közvetlen foglalásnál',
  da: '% ved direkte booking',
  fi: '% suorassa varauksessa',
};

export const klubRadek2Nadpis: LText = {
  cs: 'Doporučit přátelům',
  en: 'Recommend to friends',
  de: 'Freunden empfehlen',
  pl: 'Polecić znajomym',
  uk: 'Рекомендувати друзям',
  'zh-Hant': '推薦給朋友',
  es: 'Recomendar a amigos',
  fr: 'Recommander à des amis',
  it: 'Consigliare agli amici',
  pt: 'Recomendar a amigos',
  sv: 'Rekommendera till vänner',
  hu: 'Ajánlás barátoknak',
  da: 'Anbefal til venner',
  fi: 'Suosittele ystäville',
};

export const klubRadek2Pod: LText = {
  cs: 'přítel má 5 %, vy kredit na pobyt',
  en: 'your friend gets 5 %, you get stay credit',
  de: 'Freund hat 5 %, Sie erhalten Guthaben',
  pl: 'znajomy ma 5 %, Wy kredyt na pobyt',
  uk: 'друг має 5 %, ви кредит на перебування',
  'zh-Hant': '朋友享 5%，您獲得住宿點數',
  es: 'el amigo tiene 5 %, usted crédito',
  fr: 'l’ami a 5 %, vous un crédit séjour',
  it: 'l’amico ha il 5 %, voi credito soggiorno',
  pt: 'o amigo tem 5 %, vocês crédito',
  sv: 'vännen får 5 %, ni krediter',
  hu: 'a barát 5 %-ot kap, Ön kreditpontot',
  da: 'vennen får 5 %, I får kredit',
  fi: 'ystävä saa 5 %, te majoituskrediitin',
};

export const klubRadek3Nadpis: LText = {
  cs: 'Přidat na plochu',
  en: 'Add to home screen',
  de: 'Zum Startbildschirm',
  pl: 'Dodać na ekran główny',
  uk: 'Додати на головний екран',
  'zh-Hant': '加到主畫面',
  es: 'Añadir a la pantalla de inicio',
  fr: 'Ajouter à l’écran d’accueil',
  it: 'Aggiungere alla schermata Home',
  pt: 'Adicionar ao ecrã inicial',
  sv: 'Lägg till på hemskärmen',
  hu: 'Hozzáadás a kezdőképernyőhöz',
  da: 'Føj til startskærm',
  fi: 'Lisää kotinäytölle',
};

export const klubRadek3Pod: LText = {
  cs: 'vaše karta vždy po ruce',
  en: 'your card always at hand',
  de: 'Ihre Karte immer griffbereit',
  pl: 'Wasza karta zawsze pod ręką',
  uk: 'ваша картка завжди під рукою',
  'zh-Hant': '您的卡片隨時可用',
  es: 'su tarjeta siempre a mano',
  fr: 'votre carte toujours sous la main',
  it: 'la vostra carta sempre a portata',
  pt: 'o vosso cartão sempre à mão',
  sv: 'ert kort alltid till hands',
  hu: 'a kártyájuk mindig kéznél',
  da: 'jeres kort altid ved hånden',
  fi: 'korttinne aina käden ulottuvilla',
};

export const klubOtevritKartu: LText = {
  cs: 'Otevřít moji kartu',
  en: 'Open my card',
  de: 'Meine Karte öffnen',
  pl: 'Otwórz moją kartę',
  uk: 'Відкрити мою картку',
  'zh-Hant': '開啟我的卡片',
  es: 'Abrir mi tarjeta',
  fr: 'Ouvrir ma carte',
  it: 'Aprire la mia carta',
  pt: 'Abrir o meu cartão',
  sv: 'Öppna mitt kort',
  hu: 'Kártyám megnyitása',
  da: 'Åbn mit kort',
  fi: 'Avaa korttini',
};

/** Řádek v e-mailu místo velké kartičky. */
export const klubRadekKlubNadpis: LText = {
  cs: 'VIVIEN Klub',
  en: 'VIVIEN Club',
  de: 'VIVIEN Club',
  pl: 'VIVIEN Klub',
  uk: 'VIVIEN Klub',
  'zh-Hant': 'VIVIEN 俱樂部',
  es: 'VIVIEN Club',
  fr: 'VIVIEN Club',
  it: 'VIVIEN Club',
  pt: 'VIVIEN Club',
  sv: 'VIVIEN Club',
  hu: 'VIVIEN Club',
  da: 'VIVIEN Club',
  fi: 'VIVIEN Club',
};

export const klubRadekKlubPod: LText = {
  cs: 'vaše karta a výhody',
  en: 'your card and benefits',
  de: 'Ihre Karte und Vorteile',
  pl: 'Wasza karta i korzyści',
  uk: 'ваша картка та переваги',
  'zh-Hant': '您的卡片與優惠',
  es: 'su tarjeta y ventajas',
  fr: 'votre carte et avantages',
  it: 'la vostra carta e i vantaggi',
  pt: 'o vosso cartão e vantagens',
  sv: 'ert kort och förmåner',
  hu: 'a kártyájuk és előnyeik',
  da: 'jeres kort og fordele',
  fi: 'korttinne ja edut',
};

export const klubATadyKarta: LText = {
  cs: 'A tady je vaše karta VIVIEN Klubu',
  en: 'And here is your VIVIEN Club card',
  de: 'Und hier ist Ihre VIVIEN-Club-Karte',
  pl: 'A oto Wasza karta VIVIEN Klubu',
  uk: 'А ось ваша картка VIVIEN Klubu',
  'zh-Hant': '這是您的 VIVIEN 俱樂部卡片',
  es: 'Y aquí está su tarjeta VIVIEN Club',
  fr: 'Et voici votre carte VIVIEN Club',
  it: 'Ed ecco la vostra carta VIVIEN Club',
  pt: 'E aqui está o vosso cartão VIVIEN Club',
  sv: 'Och här är ert VIVIEN Club-kort',
  hu: 'És itt a VIVIEN Club kártyájuk',
  da: 'Og her er jeres VIVIEN Club-kort',
  fi: 'Ja tässä on VIVIEN Club -korttinne',
};

/** Pod kartou po odjezdu. {sleva} = % podle úrovně. Vždy přímá rezervace. */
export const klubRamecekPoOdjezdu: LText = {
  cs: 'Příště při přímé rezervaci ušetříte {sleva} %.',
  en: 'Next time, with a direct booking you save {sleva} %.',
  de: 'Beim nächsten Mal sparen Sie bei Direktbuchung {sleva} %.',
  pl: 'Następnym razem przy bezpośredniej rezerwacji oszczędzacie {sleva} %.',
  uk: 'Наступного разу при прямому бронюванні заощадите {sleva} %.',
  'zh-Hant': '下次直接向我們預訂可省 {sleva} %。',
  es: 'La próxima vez, al reservar directamente, ahorra un {sleva} %.',
  fr: 'La prochaine fois, en réservant directement, vous économisez {sleva} %.',
  it: 'La prossima volta, prenotando direttamente, risparmiate il {sleva} %.',
  pt: 'Da próxima vez, ao reservarem diretamente, poupam {sleva} %.',
  sv: 'Nästa gång sparar ni {sleva} % vid direktbokning.',
  hu: 'Legközelebb közvetlen foglalásnál {sleva} %-ot spórolnak.',
  da: 'Næste gang sparer I {sleva} % ved direkte booking.',
  fi: 'Ensi kerralla säästätte suorassa varauksessa {sleva} %.',
};

export const klubPruvodcePo: LText = {
  cs: 'Průvodce pobytem · adresa, tipy, kontakt',
  en: 'Stay guide · address, tips, contact',
  de: 'Aufenthaltsguide · Adresse, Tipps, Kontakt',
  pl: 'Przewodnik pobytu · adres, wskazówki, kontakt',
  uk: 'Гід перебування · адреса, поради, контакт',
  'zh-Hant': '住宿指南 · 地址、提示、聯絡',
  es: 'Guía de estancia · dirección, consejos, contacto',
  fr: 'Guide du séjour · adresse, conseils, contact',
  it: 'Guida al soggiorno · indirizzo, consigli, contatto',
  pt: 'Guia da estadia · morada, dicas, contacto',
  sv: 'Vistelseguide · adress, tips, kontakt',
  hu: 'Tartózkodási útmutató · cím, tippek, kapcsolat',
  da: 'Opholdsgarde · adresse, tips, kontakt',
  fi: 'Majoitusopas · osoite, vinkit, yhteystiedot',
};

export const klubPlochaANadpis: LText = {
  cs: 'Přidat VIVIEN na plochu',
  en: 'Add VIVIEN to home screen',
  de: 'VIVIEN zum Startbildschirm',
  pl: 'Dodać VIVIEN na ekran',
  uk: 'Додати VIVIEN на екран',
  'zh-Hant': '將 VIVIEN 加到主畫面',
  es: 'Añadir VIVIEN a inicio',
  fr: 'Ajouter VIVIEN à l’accueil',
  it: 'Aggiungere VIVIEN alla Home',
  pt: 'Adicionar VIVIEN ao ecrã',
  sv: 'Lägg till VIVIEN på hemskärmen',
  hu: 'VIVIEN a kezdőképernyőre',
  da: 'Føj VIVIEN til startskærm',
  fi: 'Lisää VIVIEN kotinäytölle',
};

export const klubPlochaAPod: LText = {
  cs: 'Příště kartu i průvodce otevřete jedním klepnutím.',
  en: 'Next time open the card and guide with one tap.',
  de: 'Öffnen Sie Karte und Guide nächstes Mal mit einem Tippen.',
  pl: 'Następnym razem kartę i przewodnik otworzycie jednym stuknięciem.',
  uk: 'Наступного разу картку й гід відкриєте одним дотиком.',
  'zh-Hant': '下次一鍵開啟卡片與指南。',
  es: 'La próxima vez abra la tarjeta y la guía con un toque.',
  fr: 'La prochaine fois, ouvrez la carte et le guide d’un toucher.',
  it: 'La prossima volta aprite carta e guida con un tocco.',
  pt: 'Da próxima vez abram o cartão e o guia com um toque.',
  sv: 'Nästa gång öppnar ni kortet och guiden med ett tryck.',
  hu: 'Legközelebb egy koppintással nyílik a kártya és az útmutató.',
  da: 'Næste gang åbner I kort og guide med ét tryk.',
  fi: 'Seuraavalla kerralla avaat kortin ja oppaan yhdellä napautuksella.',
};

export const klubPlochaAAkce: LText = {
  cs: 'Přidat ›',
  en: 'Add ›',
  de: 'Hinzufügen ›',
  pl: 'Dodaj ›',
  uk: 'Додати ›',
  'zh-Hant': '加入 ›',
  es: 'Añadir ›',
  fr: 'Ajouter ›',
  it: 'Aggiungi ›',
  pt: 'Adicionar ›',
  sv: 'Lägg till ›',
  hu: 'Hozzáadás ›',
  da: 'Tilføj ›',
  fi: 'Lisää ›',
};

export const klubPlochaBNadpis: LText = {
  cs: 'Poslat do dalšího telefonu',
  en: 'Send to another phone',
  de: 'An anderes Telefon senden',
  pl: 'Wyślij na inny telefon',
  uk: 'Надіслати на інший телефон',
  'zh-Hant': '傳送到另一支手機',
  es: 'Enviar a otro teléfono',
  fr: 'Envoyer sur un autre téléphone',
  it: 'Inviare a un altro telefono',
  pt: 'Enviar para outro telefone',
  sv: 'Skicka till annan telefon',
  hu: 'Küldés másik telefonra',
  da: 'Send til en anden telefon',
  fi: 'Lähetä toiseen puhelimeen',
};

export const klubPlochaBPod: LText = {
  cs: '✓ Na tomto telefonu máte VIVIEN na ploše.',
  en: '✓ VIVIEN is on this phone’s home screen.',
  de: '✓ VIVIEN ist auf diesem Telefon auf dem Startbildschirm.',
  pl: '✓ Na tym telefonie macie VIVIEN na ekranie.',
  uk: '✓ На цьому телефоні VIVIEN на головному екрані.',
  'zh-Hant': '✓ 這支手機的主畫面已有 VIVIEN。',
  es: '✓ En este teléfono tiene VIVIEN en inicio.',
  fr: '✓ VIVIEN est sur l’écran d’accueil de ce téléphone.',
  it: '✓ Su questo telefono VIVIEN è sulla Home.',
  pt: '✓ Neste telefone têm VIVIEN no ecrã inicial.',
  sv: '✓ På den här telefonen finns VIVIEN på hemskärmen.',
  hu: '✓ Ezen a telefonon a VIVIEN a kezdőképernyőn van.',
  da: '✓ På denne telefon har I VIVIEN på startskærmen.',
  fi: '✓ Tässä puhelimessa VIVIEN on kotinäytöllä.',
};

export const klubPlochaBAkce: LText = {
  cs: 'Poslat ›',
  en: 'Send ›',
  de: 'Senden ›',
  pl: 'Wyślij ›',
  uk: 'Надіслати ›',
  'zh-Hant': '傳送 ›',
  es: 'Enviar ›',
  fr: 'Envoyer ›',
  it: 'Invia ›',
  pt: 'Enviar ›',
  sv: 'Skicka ›',
  hu: 'Küldés ›',
  da: 'Send ›',
  fi: 'Lähetä ›',
};

export const klubPlochaSdileniUpozorneni: LText = {
  cs: 'Pošlete jen svým blízkým',
  en: 'Send only to people close to you',
  de: 'Nur an Ihre Nahestehenden senden',
  pl: 'Wyślijcie tylko bliskim',
  uk: 'Надсилайте лише близьким',
  'zh-Hant': '請只傳給您的親友',
  es: 'Envíe solo a sus allegados',
  fr: 'N’envoyez qu’à vos proches',
  it: 'Inviate solo ai vostri cari',
  pt: 'Enviem só a quem vos é próximo',
  sv: 'Skicka bara till era närmaste',
  hu: 'Csak a közeli ismerősöknek küldjék',
  da: 'Send kun til jer nærmeste',
  fi: 'Lähettäkää vain läheisillenne',
};

export function vyplnSablonu(
  sablona: string,
  vars: Record<string, string | number>,
): string {
  let out = sablona;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{${k}}`, String(v));
  }
  return out;
}

export function jazykKlubPodekovani(lang: GuideLang | null | undefined): GuideLang {
  return lang && lang in klubZapocitali ? lang : 'en';
}
