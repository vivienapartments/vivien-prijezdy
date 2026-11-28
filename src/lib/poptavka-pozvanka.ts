import { adresaKlub } from './verejna-adresa';

/** Odkaz na obecnou poptávku (5 % na první přímý pobyt). */
export function odkazObecnePoptavky(base?: string): string {
  const root = (base || adresaKlub()).replace(/\/$/, '');
  return `${root}/poptavka`;
}

/** Schválený text pozvánky k poptávce (28. 11. 2026). Odkaz se doplní při odeslání. */
export function textPozvankyPoptavky(odkaz: string): string {
  return [
    'Dobrý den,',
    '',
    'děkujeme za Váš zájem o ubytování ve VIVIEN Apartments.',
    '',
    'Zasíláme Vám odkaz na náš poptávkový formulář, ve kterém si můžete jednoduše vybrat požadovaný termín pobytu a zjistit jeho cenu.',
    '',
    'Na svůj první přímý pobyt u nás získáte 5 % slevu.',
    '',
    'Stačí vybrat termín a odeslat poptávku. My ji prověříme a následně se Vám ozveme s dalším postupem k dokončení rezervace.',
    '',
    odkaz,
    '',
    'Budeme se těšit na Vaši návštěvu.',
    '',
    'Nikol a rodina VIVIEN',
  ].join('\n');
}
