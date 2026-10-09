"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getReportTimezones,
  PRIMARY_REPORT_TIMEZONE,
  searchReportTimezones,
} from "@/utils/reports/reportTimezones";

const MAX_RESULTS = 120;

interface ChatTimezoneFieldProps {
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
}

export default function ChatTimezoneField({ value, onChange, hasError }: ChatTimezoneFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const zones = useMemo(() => getReportTimezones(), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    const t = setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("pointerdown", handler);
      clearTimeout(t);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim();
    return searchReportTimezones(zones, q).slice(0, MAX_RESULTS);
  }, [zones, query]);

  const openMenu = () => {
    setOpen(true);
    setQuery("");
  };

  const triggerMods = [
    "nca-chatbot__dropdown-trigger",
    open && !hasError ? "nca-chatbot__dropdown-trigger--open" : "",
    hasError ? "nca-chatbot__dropdown-trigger--error" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={containerRef} className="nca-chatbot__dropdown">
      <button type="button" onClick={() => (open ? setOpen(false) : openMenu())} className={triggerMods}>
        <span className={value ? "nca-chatbot__dropdown-trigger-text--selected" : "nca-chatbot__dropdown-trigger-text"}>
          {value || "Timezone (optional)"}
        </span>
        <svg className={`nca-chatbot__dropdown-chevron ${open ? "nca-chatbot__dropdown-chevron--open" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open ? (
        <div className="nca-chatbot__dropdown-menu nca-chatbot__dropdown-menu--timezone">
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search e.g. Melbourne, Kolkata"
            className="nca-chatbot__multiselect-search"
            aria-label="Search timezones"
            autoComplete="off"
            spellCheck={false}
          />
          <ul className="nca-chatbot__multiselect-list nca-chatbot__multiselect-list--timezone" role="listbox">
            <li>
              <button
                type="button"
                className="nca-chatbot__dropdown-item nca-chatbot__dropdown-item--inactive nca-chatbot__tz-clear"
                onClick={() => { onChange(""); setOpen(false); setQuery(""); }}
              >
                Clear timezone
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="nca-chatbot__multiselect-empty">No timezones match your search</li>
            ) : (
              filtered.map((z) => (
                <li key={z} role="option" aria-selected={value === z}>
                  <button
                    type="button"
                    className={`nca-chatbot__dropdown-item ${value === z ? "nca-chatbot__dropdown-item--active" : "nca-chatbot__dropdown-item--inactive"}`}
                    onClick={() => { onChange(z); setOpen(false); setQuery(""); }}
                  >
                    {z}
                    {z === PRIMARY_REPORT_TIMEZONE ? " — primary" : ""}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
