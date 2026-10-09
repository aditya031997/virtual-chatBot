"use client";

interface CloseIconProps {
  size?: number;
  className?: string;
}

/** Pixel size only — Tailwind utilities are NOT applied (public/ is outside tailwind `content`). */
export default function CloseIcon({ size = 22, className }: CloseIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
