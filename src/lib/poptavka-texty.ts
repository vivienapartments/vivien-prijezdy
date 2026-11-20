/**
 * Texty stránky poptávky. Čeština je návrh A (ke schválení majitelem).
 * Ostatní jazyky zatím anglický fallback u věrnosti z tokenu.
 */

import type { GuideLang } from './types';

export type PoptavkaTexty = {
  nadpis: string;
  uvod: string;
  firmaRadek: string;
  sleva: string;
  cenaPozdeji: string;
  termin: string;
  prijezd: string;
  odjezd: string;
  apartmany: string;
  libovolny: string;
  jmeno: string;
  telefon: string;
  doprava: string;
  auto: string;
  dodavka: string;
  nevim: string;
  poznamka: string;
  odeslat: string;
  whatsapp: string;
  sms: string;
  dekujeme: string;
  zavolat: string;
  zaloha: string;
  chybaTermin: string;
  chybaKontakt: string;
  chybaObecna: string;
  chybaBlok: string;
};

const CS: PoptavkaTexty = {
  nadpis: 'Vyberte termín dalšího pobytu',
  uvod: 'Pošlete nám poptávku. Do hodiny ověříme volno a ozveme se s cenou.',
  firmaRadek: 'Poptávka pro {firma}',
  sleva: 'Na této cestě máte slevu 5 %.',
  cenaPozdeji: 'Přesnou cenu dopočítáme po ověření termínu.',
  termin: 'Termín',
  prijezd: 'Příjezd',
  odjezd: 'Odjezd',
  apartmany: 'Apartmány (můžete víc)',
  libovolny: 'Je mi to jedno, doporučte',
  jmeno: 'Jméno',
  telefon: 'Telefon',
  doprava: 'Doprava (volitelné)',
  auto: 'Autem',
  dodavka: 'Dodávkou',
  nevim: 'Zatím nevím',
  poznamka: 'Poznámka (volitelné)',
  odeslat: 'Odeslat poptávku',
  whatsapp: 'Napsat na WhatsApp',
  sms: 'Napsat SMS',
  dekujeme: 'Děkujeme. Do hodiny se ozveme s cenou.',
  zavolat: 'Zavolat Nikol',
  zaloha: 'Když se nedovoláte',
  chybaTermin: 'Zvolte příjezd a odjezd. Odjezd musí být po příjezdu.',
  chybaKontakt: 'Vyplňte jméno a telefon.',
  chybaObecna: 'Poptávku teď nešlo uložit. Zavolejte nebo napište.',
  chybaBlok: 'Příliš mnoho pokusů. Zkuste to později, nebo zavolejte.',
};

const EN: PoptavkaTexty = {
  nadpis: 'Choose dates for your next stay',
  uvod: 'Send us a request. Within an hour we will check availability and reply with the price.',
  firmaRadek: 'Request for {firma}',
  sleva: 'On this path you get a 5% discount.',
  cenaPozdeji: 'We will calculate the exact price after we check the dates.',
  termin: 'Dates',
  prijezd: 'Arrival',
  odjezd: 'Departure',
  apartmany: 'Apartments (you may pick more)',
  libovolny: 'No preference, please recommend',
  jmeno: 'Name',
  telefon: 'Phone',
  doprava: 'Travel (optional)',
  auto: 'By car',
  dodavka: 'By van',
  nevim: 'Not sure yet',
  poznamka: 'Note (optional)',
  odeslat: 'Send request',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  dekujeme: 'Thank you. We will reply within an hour with the price.',
  zavolat: 'Call Nikol',
  zaloha: 'If you cannot reach her',
  chybaTermin: 'Choose arrival and departure. Departure must be after arrival.',
  chybaKontakt: 'Please fill in name and phone.',
  chybaObecna: 'We could not save the request. Please call or write.',
  chybaBlok: 'Too many attempts. Try later, or call us.',
};

export function poptavkaTexty(lang: GuideLang): PoptavkaTexty {
  return lang === 'cs' ? CS : EN;
}
