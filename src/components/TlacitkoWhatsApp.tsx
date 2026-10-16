'use client';

import { odkazWhatsAppPrehled } from '@/lib/whatsapp-zprava';

function IkonaWhatsApp() {
  return (
    <svg className="ph-wa__ikona" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.04 2c-5.46 0-9.91 4.43-9.91 9.9 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.9-4.44 9.9-9.9C21.95 6.43 17.5 2 12.04 2zm5.83 14.13c-.25.7-1.23 1.28-2.01 1.45-.53.11-1.22.2-3.55-.76-2.98-1.23-4.9-4.25-5.05-4.45-.14-.2-1.2-1.6-1.2-3.05s.76-2.16 1.03-2.46c.26-.3.57-.37.76-.37.19 0 .38 0 .54.01.18.01.41-.07.64.49.25.58.84 2.05.91 2.2.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.03 1.12 1 2.07 1.31 2.36 1.46.3.15.47.12.64-.07.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.28.1 1.75.83 2.05.98.3.15.5.22.57.34.08.13.08.74-.17 1.44z"
      />
    </svg>
  );
}

type Props = {
  wa: string | null | undefined;
  zprava: string;
  userAgent: string;
  className?: string;
  /** Po kliknutí před otevřením WhatsApp (historie, označení). */
  onPredOtevrenim?: () => void | Promise<void>;
  children?: string;
};

/** Zelené tlačítko WhatsApp s ikonou. Bez čísla je šedé „Chybí telefon“. */
export function TlacitkoWhatsApp({
  wa,
  zprava,
  userAgent,
  className = '',
  onPredOtevrenim,
  children = 'WhatsApp',
}: Props) {
  const trida = ['ph-wa', className].filter(Boolean).join(' ');
  if (!wa) {
    return (
      <span className={`${trida} ph-wa--chybi`} aria-disabled="true">
        <IkonaWhatsApp />
        Chybí telefon
      </span>
    );
  }
  const href = odkazWhatsAppPrehled(wa, zprava, userAgent);
  return (
    <a
      className={`${trida} ph-wa--zeleny`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        if (!onPredOtevrenim) return;
        e.preventDefault();
        void Promise.resolve(onPredOtevrenim()).then(() => {
          window.open(href, '_blank', 'noopener,noreferrer');
        });
      }}
    >
      <IkonaWhatsApp />
      {children}
    </a>
  );
}
