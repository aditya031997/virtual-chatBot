interface ReportGenerationIconProps {
  size?: number;
  className?: string;
}

export default function ReportGenerationIcon({ size = 16, className = "" }: ReportGenerationIconProps) {
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
      <path
        d="M3 1.5H9.5L13 5V13.5C13 14.05 12.55 14.5 12 14.5H3C2.45 14.5 2 14.05 2 13.5V2.5C2 1.95 2.45 1.5 3 1.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M9.5 1.5V5H13" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.5 11L6.5 8.8L8.2 10.2L10.8 7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10.8 7.5H9.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10.8 7.5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
