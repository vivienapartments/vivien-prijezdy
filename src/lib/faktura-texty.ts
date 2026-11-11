import type { GuideLang } from './types';

type T = Record<GuideLang, string>;

export const FAKTURA_NADPIS: T = {
  'cs': 'Faktura na firmu',
  'en': 'Company invoice',
  'de': 'Rechnung für Firma',
  'pl': 'Faktura na firmę',
  'uk': 'Рахунок-фактура для компанії',
  'zh-Hant': '公司發票',
  'sv': 'Faktura till företag',
  'es': 'Factura para empresa',
  'fr': 'Facture pour entreprise',
  'it': 'Fattura per azienda',
  'pt': 'Fatura para empresa',
  'hu': 'Számla cégre',
};

export const FAKTURA_VETA_SBALENA: T = {
  'cs': 'Potřebujete fakturu? Zadejte údaje, vystavíme ji po pobytu.',
  'en': 'Need an invoice? Enter your details and we will issue it after your stay.',
  'de': 'Brauchen Sie eine Rechnung? Geben Sie Ihre Daten ein, wir stellen sie nach Ihrem Aufenthalt aus.',
  'pl': 'Potrzebujecie faktury? Podajcie dane, wystawimy ją po pobycie.',
  'uk': 'Потрібен рахунок-фактура? Введіть дані, ми виставимо його після вашого перебування.',
  'zh-Hant': '需要發票嗎？請填寫資料，我們會在您住宿結束後開立。',
  'sv': 'Behöver ni en faktura? Fyll i uppgifterna så utfärdar vi den efter vistelsen.',
  'es': '¿Necesitan factura? Introduzcan sus datos y la emitiremos después de su estancia.',
  'fr': 'Besoin d\'une facture ? Indiquez vos coordonnées, nous l\'établirons après votre séjour.',
  'it': 'Vi serve una fattura? Inserite i dati, la emetteremo dopo il vostro soggiorno.',
  'pt': 'Precisam de fatura? Indiquem os dados e emitimo-la após a vossa estadia.',
  'hu': 'Számlára van szükségük? Adják meg az adatokat, és a tartózkodás után kiállítjuk.',
};

export const FAKTURA_TYP_CZ: T = {
  'cs': 'Firma v ČR',
  'en': 'Czech company',
  'de': 'Firma in Tschechien',
  'pl': 'Firma w Czechach',
  'uk': 'Компанія в Чехії',
  'zh-Hant': '捷克公司',
  'sv': 'Företag i Tjeckien',
  'es': 'Empresa en la República Checa',
  'fr': 'Entreprise en République tchèque',
  'it': 'Azienda in Repubblica Ceca',
  'pt': 'Empresa na República Checa',
  'hu': 'Cseh cég',
};

export const FAKTURA_TYP_ZAHRANICI: T = {
  'cs': 'Firma v zahraničí',
  'en': 'Company outside the Czech Republic',
  'de': 'Firma außerhalb Tschechiens',
  'pl': 'Firma poza Czechami',
  'uk': 'Компанія за межами Чехії',
  'zh-Hant': '捷克以外的公司',
  'sv': 'Företag utanför Tjeckien',
  'es': 'Empresa fuera de la República Checa',
  'fr': 'Entreprise hors de la République tchèque',
  'it': 'Azienda fuori dalla Repubblica Ceca',
  'pt': 'Empresa fora da República Checa',
  'hu': 'Csehországon kívüli cég',
};

export const FAKTURA_ICO: T = {
  'cs': 'IČO',
  'en': 'Company ID (IČO)',
  'de': 'Firmen-ID (IČO)',
  'pl': 'Numer firmy (IČO)',
  'uk': 'Код компанії (IČO)',
  'zh-Hant': '公司編號（IČO）',
  'sv': 'Organisationsnummer (IČO)',
  'es': 'Número de empresa (IČO)',
  'fr': 'Numéro d\'entreprise (IČO)',
  'it': 'Numero azienda (IČO)',
  'pt': 'Número da empresa (IČO)',
  'hu': 'Cégazonosító (IČO)',
};

export const FAKTURA_ICO_NAPOVEDA: T = {
  'cs': 'Název a adresu doplníme z obchodního rejstříku.',
  'en': 'We will fill in the name and address from the Czech business register.',
  'de': 'Name und Adresse ergänzen wir aus dem tschechischen Handelsregister.',
  'pl': 'Nazwę i adres uzupełnimy z czeskiego rejestru firm.',
  'uk': 'Назву та адресу ми доповнимо з чеського реєстру підприємств.',
  'zh-Hant': '我們會從捷克商業登記處自動填入公司名稱與地址。',
  'sv': 'Namn och adress hämtar vi från det tjeckiska företagsregistret.',
  'es': 'Completaremos el nombre y la dirección desde el registro mercantil checo.',
  'fr': 'Nous compléterons le nom et l\'adresse à partir du registre tchèque des entreprises.',
  'it': 'Completeremo nome e indirizzo dal registro delle imprese ceco.',
  'pt': 'O nome e a morada são preenchidos a partir do registo comercial checo.',
  'hu': 'A nevet és a címet a cseh cégnyilvántartásból töltjük ki.',
};

export const FAKTURA_ARES_NALEZENO: T = {
  'cs': 'Našli jsme:',
  'en': 'We found:',
  'de': 'Gefunden:',
  'pl': 'Znaleźliśmy:',
  'uk': 'Ми знайшли:',
  'zh-Hant': '我們找到：',
  'sv': 'Vi hittade:',
  'es': 'Hemos encontrado:',
  'fr': 'Nous avons trouvé :',
  'it': 'Abbiamo trovato:',
  'pt': 'Encontrámos:',
  'hu': 'Ezt találtuk:',
};

export const FAKTURA_ARES_NENALEZENO: T = {
  'cs': 'IČO jsme nenašli. Zkontrolujte ho, nebo vyplňte údaje ručně.',
  'en': 'We could not find this ID. Please check it or fill in the details manually.',
  'de': 'Diese ID haben wir nicht gefunden. Bitte prüfen Sie sie oder füllen Sie die Daten manuell aus.',
  'pl': 'Nie znaleźliśmy tego numeru. Sprawdźcie go lub wpiszcie dane ręcznie.',
  'uk': 'Ми не знайшли цей код. Перевірте його або заповніть дані вручну.',
  'zh-Hant': '找不到此編號。請檢查，或手動填寫資料。',
  'sv': 'Vi hittade inte numret. Kontrollera det eller fyll i uppgifterna manuellt.',
  'es': 'No hemos encontrado este número. Compruébenlo o rellenen los datos manualmente.',
  'fr': 'Nous n\'avons pas trouvé ce numéro. Vérifiez-le ou saisissez les coordonnées manuellement.',
  'it': 'Non abbiamo trovato questo numero. Controllatelo o inserite i dati manualmente.',
  'pt': 'Não encontrámos este número. Verifiquem-no ou preencham os dados manualmente.',
  'hu': 'Ezt a számot nem találtuk. Ellenőrizzék, vagy töltsék ki az adatokat kézzel.',
};

export const FAKTURA_NAZEV: T = {
  'cs': 'Název firmy',
  'en': 'Company name',
  'de': 'Firmenname',
  'pl': 'Nazwa firmy',
  'uk': 'Назва компанії',
  'zh-Hant': '公司名稱',
  'sv': 'Företagsnamn',
  'es': 'Nombre de la empresa',
  'fr': 'Nom de l\'entreprise',
  'it': 'Ragione sociale',
  'pt': 'Nome da empresa',
  'hu': 'Cégnév',
};

export const FAKTURA_ADRESA: T = {
  'cs': 'Adresa (ulice, město, PSČ)',
  'en': 'Address (street, city, postcode)',
  'de': 'Adresse (Straße, Ort, PLZ)',
  'pl': 'Adres (ulica, miasto, kod pocztowy)',
  'uk': 'Адреса (вулиця, місто, поштовий індекс)',
  'zh-Hant': '地址（街道、城市、郵遞區號）',
  'sv': 'Adress (gata, ort, postnummer)',
  'es': 'Dirección (calle, ciudad, código postal)',
  'fr': 'Adresse (rue, ville, code postal)',
  'it': 'Indirizzo (via, città, CAP)',
  'pt': 'Morada (rua, cidade, código postal)',
  'hu': 'Cím (utca, város, irányítószám)',
};

export const FAKTURA_ZEME: T = {
  'cs': 'Země',
  'en': 'Country',
  'de': 'Land',
  'pl': 'Kraj',
  'uk': 'Країна',
  'zh-Hant': '國家',
  'sv': 'Land',
  'es': 'País',
  'fr': 'Pays',
  'it': 'Paese',
  'pt': 'País',
  'hu': 'Ország',
};

export const FAKTURA_DIC: T = {
  'cs': 'DIČ / VAT ID (pokud máte)',
  'en': 'VAT ID (if you have one)',
  'de': 'USt-IdNr. (falls vorhanden)',
  'pl': 'NIP / VAT ID (jeśli macie)',
  'uk': 'Податковий номер / VAT ID (якщо є)',
  'zh-Hant': '稅號 / VAT ID（如有）',
  'sv': 'Momsregistreringsnummer / VAT ID (om ni har)',
  'es': 'NIF / VAT ID (si lo tienen)',
  'fr': 'N° de TVA / VAT ID (si vous en avez un)',
  'it': 'Partita IVA / VAT ID (se l\'avete)',
  'pt': 'NIF / VAT ID (se tiverem)',
  'hu': 'Adószám / VAT ID (ha van)',
};

export const FAKTURA_EMAIL: T = {
  'cs': 'E-mail pro zaslání faktury',
  'en': 'E-mail for the invoice',
  'de': 'E-Mail für die Rechnung',
  'pl': 'E-mail do wysłania faktury',
  'uk': 'E-mail для надсилання рахунку',
  'zh-Hant': '接收發票的電子郵件',
  'sv': 'E-post för fakturan',
  'es': 'E-mail para enviar la factura',
  'fr': 'E-mail pour l\'envoi de la facture',
  'it': 'E-mail per l\'invio della fattura',
  'pt': 'E-mail para envio da fatura',
  'hu': 'E-mail cím a számlához',
};

export const FAKTURA_POZNAMKA: T = {
  'cs': 'Poznámka na fakturu (např. jméno zaměstnance, číslo objednávky)',
  'en': 'Note for the invoice (e.g. employee name, order number)',
  'de': 'Hinweis für die Rechnung (z. B. Name des Mitarbeiters, Bestellnummer)',
  'pl': 'Uwaga na fakturze (np. imię i nazwisko pracownika, numer zamówienia)',
  'uk': 'Примітка до рахунку (напр. ім\'я працівника, номер замовлення)',
  'zh-Hant': '發票備註（例如員工姓名、訂單編號）',
  'sv': 'Anteckning på fakturan (t.ex. anställds namn, ordernummer)',
  'es': 'Nota para la factura (p. ej., nombre del empleado, número de pedido)',
  'fr': 'Mention sur la facture (p. ex. nom du collaborateur, numéro de commande)',
  'it': 'Nota in fattura (ad es. nome del dipendente, numero d\'ordine)',
  'pt': 'Nota na fatura (p. ex. nome do colaborador, número de encomenda)',
  'hu': 'Megjegyzés a számlára (pl. munkatárs neve, rendelésszám)',
};

export const FAKTURA_ODESLAT: T = {
  'cs': 'Odeslat údaje',
  'en': 'Send details',
  'de': 'Daten senden',
  'pl': 'Wyślij dane',
  'uk': 'Надіслати дані',
  'zh-Hant': '送出資料',
  'sv': 'Skicka uppgifter',
  'es': 'Enviar datos',
  'fr': 'Envoyer',
  'it': 'Invia i dati',
  'pt': 'Enviar dados',
  'hu': 'Adatok elküldése',
};

export const FAKTURA_ULOZENO: T = {
  'cs': 'Děkujeme. Fakturu vystavíme po skončení pobytu a pošleme vám ji e-mailem.',
  'en': 'Thank you. We will issue the invoice after your stay and send it to you by e-mail.',
  'de': 'Vielen Dank. Wir stellen die Rechnung nach Ihrem Aufenthalt aus und senden sie Ihnen per E-Mail.',
  'pl': 'Dziękujemy. Fakturę wystawimy po zakończeniu pobytu i wyślemy e-mailem.',
  'uk': 'Дякуємо. Ми виставимо рахунок після завершення перебування й надішлемо його електронною поштою.',
  'zh-Hant': '謝謝。我們會在住宿結束後開立發票，並以電子郵件寄給您。',
  'sv': 'Tack. Vi utfärdar fakturan efter vistelsen och skickar den till er via e-post.',
  'es': 'Gracias. Emitiremos la factura al terminar su estancia y se la enviaremos por e-mail.',
  'fr': 'Merci. Nous établirons la facture après votre séjour et vous l\'enverrons par e-mail.',
  'it': 'Grazie. Emetteremo la fattura al termine del soggiorno e ve la invieremo via e-mail.',
  'pt': 'Obrigado. Emitiremos a fatura após a estadia e enviá-la-emos por e-mail.',
  'hu': 'Köszönjük. A számlát a tartózkodás után állítjuk ki, és e-mailben elküldjük.',
};

export const FAKTURA_UPRAVIT: T = {
  'cs': 'Upravit údaje',
  'en': 'Edit details',
  'de': 'Daten ändern',
  'pl': 'Edytuj dane',
  'uk': 'Змінити дані',
  'zh-Hant': '修改資料',
  'sv': 'Ändra uppgifter',
  'es': 'Editar datos',
  'fr': 'Modifier',
  'it': 'Modifica i dati',
  'pt': 'Editar dados',
  'hu': 'Adatok módosítása',
};

export const FAKTURA_CHYBA: T = {
  'cs': 'Údaje se nepodařilo uložit. Zkuste to prosím znovu.',
  'en': 'We could not save your details. Please try again.',
  'de': 'Die Daten konnten nicht gespeichert werden. Bitte versuchen Sie es erneut.',
  'pl': 'Nie udało się zapisać danych. Spróbujcie ponownie.',
  'uk': 'Не вдалося зберегти дані. Спробуйте ще раз.',
  'zh-Hant': '資料無法儲存，請再試一次。',
  'sv': 'Uppgifterna kunde inte sparas. Försök igen.',
  'es': 'No se han podido guardar los datos. Inténtenlo de nuevo.',
  'fr': 'Impossible d\'enregistrer vos coordonnées. Veuillez réessayer.',
  'it': 'Non è stato possibile salvare i dati. Riprovate.',
  'pt': 'Não foi possível guardar os dados. Tentem novamente.',
  'hu': 'Az adatokat nem sikerült menteni. Kérjük, próbálják újra.',
};

export const FAKTURA_CHYBI_ICO: T = {
  'cs': 'Vyplňte prosím platné IČO (8 číslic).',
  'en': 'Please enter a valid company ID (8 digits).',
  'de': 'Bitte geben Sie eine gültige Firmen-ID ein (8 Ziffern).',
  'pl': 'Wpiszcie prawidłowy numer IČO (8 cyfr).',
  'uk': 'Введіть правильний код IČO (8 цифр).',
  'zh-Hant': '請輸入有效的 IČO（8 位數字）。',
  'sv': 'Ange ett giltigt IČO (8 siffror).',
  'es': 'Introduzcan un IČO válido (8 dígitos).',
  'fr': 'Veuillez saisir un IČO valide (8 chiffres).',
  'it': 'Inserite un IČO valido (8 cifre).',
  'pt': 'Indiquem um IČO válido (8 dígitos).',
  'hu': 'Kérjük, adjanak meg érvényes IČO-t (8 számjegy).',
};

export const FAKTURA_CHYBI_UDAJE: T = {
  'cs': 'Vyplňte prosím název firmy, adresu a zemi.',
  'en': 'Please fill in the company name, address and country.',
  'de': 'Bitte füllen Sie Firmenname, Adresse und Land aus.',
  'pl': 'Wpiszcie nazwę firmy, adres i kraj.',
  'uk': 'Заповніть назву компанії, адресу та країну.',
  'zh-Hant': '請填寫公司名稱、地址與國家。',
  'sv': 'Fyll i företagsnamn, adress och land.',
  'es': 'Rellenen el nombre de la empresa, la dirección y el país.',
  'fr': 'Veuillez indiquer le nom de l\'entreprise, l\'adresse et le pays.',
  'it': 'Inserite ragione sociale, indirizzo e paese.',
  'pt': 'Preencham o nome da empresa, a morada e o país.',
  'hu': 'Kérjük, adják meg a cégnevet, a címet és az országot.',
};

export const FAKTURA_VYRIZENO: T = {
  'cs': 'Faktura je vystavená a odeslaná na váš e-mail.',
  'en': 'Your invoice has been issued and sent to your e-mail.',
  'de': 'Ihre Rechnung wurde ausgestellt und an Ihre E-Mail gesendet.',
  'pl': 'Faktura została wystawiona i wysłana na Wasz e-mail.',
  'uk': 'Рахунок виставлено й надіслано на ваш e-mail.',
  'zh-Hant': '發票已開立並寄至您的電子郵件。',
  'sv': 'Fakturan är utfärdad och skickad till er e-post.',
  'es': 'La factura se ha emitido y enviado a su e-mail.',
  'fr': 'Votre facture a été établie et envoyée à votre e-mail.',
  'it': 'La fattura è stata emessa e inviata al vostro indirizzo e-mail.',
  'pt': 'A fatura foi emitida e enviada para o vosso e-mail.',
  'hu': 'A számlát kiállítottuk és elküldtük az e-mail címükre.',
};

export const FAKTURA_MAJITEL = {
  "tlacitko_prehled": "Faktury",
  "karta_tlacitko": "+ Faktura",
  "stitek_karty": "Faktura",
  "sekce_cekaji": "Čekají na vystavení",
  "sekce_pozdeji": "Po odjezdu",
  "sekce_vyrizene": "Vyřízené",
  "tlacitko_hotovo": "Hotovo",
  "tlacitko_vratit": "Vrátit mezi nevyřízené",
  "prazdne": "Žádné faktury k vystavení.",
  "telegram_nova": "{host} ({apartman}) chce fakturu: {firma}. Vystavit po odjezdu {datum}.",
  "telegram_zmena": "{host} ({apartman}) upravil údaje na fakturu: {firma}.",
  "telegram_den_odjezdu": "Vystavte fakturu: {seznam}. Odjezd dnes.",
  "telegram_pripominka": "Pořád chybí faktura: {seznam}.",
  "historie_host": "Host zadal údaje na fakturu",
  "historie_majitel": "Majitel zadal údaje na fakturu",
  "historie_hotovo": "Faktura vystavena"
} as const;
