export const PARKING_ADDRESS = 'Chelčického 95/15';
export const HOUSE_ADDRESS = 'Nádražní 108/43, 370 01 České Budějovice';
export const NIKOL_PHONE = '+420 702 153 573';
export const PARKING_OWNER_PHONE = '+420 777 702 272';
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
