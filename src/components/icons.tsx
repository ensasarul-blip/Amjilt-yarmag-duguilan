/**
 * Жижиг SVG дүрснүүд. Эмоджигоос ялгаатай нь бүх утсан дээр
 * ижилхэн, тэгш, өнгийг нь удирдах боломжтой.
 */
type Props = { className?: string };

const base = "h-4 w-4 shrink-0";

export function ClockIcon({ className = "" }: Props) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function PinIcon({ className = "" }: Props) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function PersonIcon({ className = "" }: Props) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
    </svg>
  );
}

export function SearchIcon({ className = "" }: Props) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function CheckIcon({ className = "" }: Props) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

export function CloseIcon({ className = "" }: Props) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "" }: Props) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

export function ArrowLeftIcon({ className = "" }: Props) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M19 12H6M11 6l-6 6 6 6" />
    </svg>
  );
}

export function WarningIcon({ className = "" }: Props) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M12 3.5 2.5 20h19L12 3.5Z" />
      <path d="M12 10v4M12 17.2v.1" />
    </svg>
  );
}

export function EditIcon({ className = "" }: Props) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m14.5 6.5 3 3" />
    </svg>
  );
}

export function DownloadIcon({ className = "" }: Props) {
  return (
    <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M4 20h16" />
    </svg>
  );
}
