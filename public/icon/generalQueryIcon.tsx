interface GeneralQueryIconProps {
  size?: number;
  className?: string;
}

export default function GeneralQueryIcon({ size = 16, className = "" }: GeneralQueryIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 1.5V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11.5 1.5V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M1.5 6H14.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="4.2" y="8.3" width="2.2" height="2.2" rx="0.4" fill="currentColor" />
      <rect x="7.4" y="8.3" width="2.2" height="2.2" rx="0.4" fill="currentColor" />
      <rect x="10.6" y="8.3" width="2.2" height="2.2" rx="0.4" fill="currentColor" />
    </svg>
  );
}
