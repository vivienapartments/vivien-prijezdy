/**
 * XLF skript (krok 1): televize a pravidla jsou převzaté z náhledu (schválené texty),
 * ne slepě z XLF. Odjezd, poplatek, brána a SMS = jen náhled.
 *
 * Převzatá / vědomě sdílená i18n ID (obsah_z_webu v pruvodce.json):
 * - stay.tv.eyebrow, stay.tv.heading, stay.tv.lead
 * - stay.tv.step1, stay.tv.step2, stay.tv.step3, stay.tv.langs, stay.tv.help
 * - stay.rules.* (v náhledu jako stayRules v texts.ts)
 *
 * Nepřevádět z XLF: stay.checkin.step4.* (odjezd), poplatek, brána, SMS.
 */
console.log('XLF IDs used via náhled texts (not live XLF parse in krok 1):');
console.log(
  [
    'stay.tv.eyebrow',
    'stay.tv.heading',
    'stay.tv.lead',
    'stay.tv.step1',
    'stay.tv.step2',
    'stay.tv.step3',
    'stay.tv.langs',
    'stay.tv.help',
    'stay.rules.heading',
    'stay.rules.smoking.title',
    'stay.rules.smoking.text',
    'stay.rules.bikes.title',
    'stay.rules.bikes.text',
    'stay.rules.pets.title',
    'stay.rules.pets.text',
    'stay.rules.quiet.title',
    'stay.rules.quiet.text',
  ].join('\n'),
);
