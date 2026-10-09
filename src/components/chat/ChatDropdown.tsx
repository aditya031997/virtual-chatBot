"use client";

import { useEffect, useRef, useState } from "react";

interface DropdownOption {
  value: string;
  label: string;
}

interface ChatDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  hasError?: boolean;
}

export default function ChatDropdown({ value, onChange, options, placeholder, hasError }: ChatDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  useEffect(() => {
    if (!open || !listRef.current || !value) return;
    const active = listRef.current.querySelector("[data-active='true']");
    if (active) active.scrollIntoView({ block: "nearest" });
  }, [open, value]);

  const selected = options.find((o) => o.value === value);

  const triggerMods = [
    "nca-chatbot__dropdown-trigger",
    open && !hasError ? "nca-chatbot__dropdown-trigger--open" : "",
    hasError ? "nca-chatbot__dropdown-trigger--error" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={containerRef} className="nca-chatbot__dropdown">
      <button type="button" onClick={() => setOpen((p) => !p)} className={triggerMods}>
        <span className={selected ? "nca-chatbot__dropdown-trigger-text--selected" : "nca-chatbot__dropdown-trigger-text"}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`nca-chatbot__dropdown-chevron ${open ? "nca-chatbot__dropdown-chevron--open" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <ul ref={listRef} className="nca-chatbot__dropdown-menu">
          {options.map((o) => {
            const isActive = o.value === value;
            return (
              <li
                key={o.value}
                data-active={isActive}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`nca-chatbot__dropdown-item ${isActive ? "nca-chatbot__dropdown-item--active" : "nca-chatbot__dropdown-item--inactive"}`}
              >
                {o.label}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
