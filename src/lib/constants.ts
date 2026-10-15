/** Kolik minut před časem příjezdu přijde upozornění majiteli a Nikol. */
export const PREDSTIH_PRIJEZDU_MIN = 60;

/** Běžný odjezd. Host v průvodci volí od 6:00 po půlhodinách až sem. */
export const CHECKOUT = '10:00';
export const ODJEZD_OD = '06:00';
export const ODJEZD_KROK_MIN = 30;
/** Rámeček v průvodci od této hodiny dne před odjezdem. */
export const HODINA_RAMCEKU_ODJEZDU = 12;
/** Push se seznamem zítřejších odjezdů. */
export const HODINA_DOTAZU_ODJEZDU = 18;
/** Připomínka, když dotaz ještě neodešel. */
export const HODINA_PRIPOMINKY_ODJEZDU = 20;
/** Ranní přehled dne. Nedoplatky jsou jeho součástí, samostatně už nechodí. */
export const HODINA_RANIHO_DNE = 7;
export const MINUTA_RANIHO_DNE = 30;
/** Kolik minut před známým odjezdem přijde upozornění. */
export const PREDSTIH_ODJEZDU_MIN = 30;

/** Příplatek za příjezd. Od 20:00, pak 100 Kč za každou započatou půlhodinu, do 23:00. */
export const PRIPLATEK_OD = 20 * 60;
export const PRIPLATEK_KROK_MIN = 30;
export const PRIPLATEK_KC = 100;
export const PRIPLATEK_DO = 23 * 60;

/** Dřívější příjezd a pozdější odjezd. 75 Kč za každou započatou půlhodinu, jen po potvrzení. */
export const OKNO_KC = 75;
export const PRIJEZD_STANDARD = 14 * 60;
export const PRIJEZD_NEJDRIV = 11 * 60;
export const ODJEZD_STANDARD = 10 * 60;
export const ODJEZD_NEJPOZDEJI = 14 * 60;
export const UKLID_MIN = 60;
export const MEZERA_PO_ODJEZDU_MIN = 30;
export const MEZERA_PRED_PRIJEZDEM_MIN = 180;
export const ODJEZD_KDYZ_CAS_NEZNAMY = 11 * 60;
export const PRIPRAVENO_PRED_MIN = 30;
export const OBJEDNAT_POKUSU = 5;

export const PARKING_ADDRESS = 'Chelčického 95/15';
export const HOUSE_ADDRESS = 'Nádražní 108/43, 370 01 České Budějovice';
export const NIKOL_PHONE = '+420 702 153 573';
export const PARKING_OWNER_PHONE = '+420 604 692 573';
export const WIFI_GARDEN_SSID = 'VivienGarden';

export const PARKING_DISTANCE = { meters: 239, minutes: 3 };

const VIVIEN_LAT = 48.976077;
const VIVIEN_LON = 14.486864;
const PARKING_LAT = 48.9754181;
const PARKING_LON = 14.4862944;

export const HOUSE_MAPY_URL = `https://mapy.com/fnc/v1/showmap?mapset=basic&center=${VIVIEN_LON},${VIVIEN_LAT}&zoom=17&marker=true`;
export const HOUSE_GOOGLE_URL = `https://www.google.com/maps/search/?api=1&query=${VIVIEN_LAT}%2C${VIVIEN_LON}`;
export const PARKING_DRIVE_MAPY_URL = `https://mapy.com/fnc/v1/route?mapset=basic&end=${PARKING_LON},${PARKING_LAT}&routeType=car_fast`;
export const PARKING_DRIVE_GOOGLE_URL = `https://www.google.com/maps/dir/?api=1&destination=${PARKING_LAT},${PARKING_LON}&travelmode=driving`;
export const WALK_BACK_MAPY_URL = `https://mapy.com/fnc/v1/route?mapset=basic&start=${PARKING_LON},${PARKING_LAT}&end=${VIVIEN_LON},${VIVIEN_LAT}&routeType=foot_fast`;
export const WALK_BACK_GOOGLE_URL = `https://www.google.com/maps/dir/?api=1&origin=${PARKING_LAT},${PARKING_LON}&destination=${VIVIEN_LAT},${VIVIEN_LON}&travelmode=walking`;

export const PARKING_ONLY_SECTIONS = new Set([
  'zadost-o-parkovani',
  'brana-parkoviste',
  'parkovani',
  'pesky-parkoviste-dum',
]);

export const AUTO_SECTION_ORDER = [
  'zadost-o-parkovani',
  'brana-parkoviste',
  'parkovani',
  'pesky-parkoviste-dum',
  'prijezd-k-domu',
];
