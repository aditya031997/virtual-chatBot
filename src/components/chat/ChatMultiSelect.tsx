"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface MultiSelectOption {
  value: string;
  label: string;
}

interface ChatMultiSelectProps {
  value?: string[];
  onChange: (next: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  hasError?: boolean;
  searchPlaceholder?: string;
}

export default function ChatMultiSelect({
  value = [],
  onChange,
  options,
  placeholder = "Select…",
  hasError,
  searchPlaceholder = "Search…",
}: ChatMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selectedSet = useMemo(() => new Set(value), [value]);
  const label =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? options.find((o) => o.value === value[0])?.label ?? `${value.length} selected`
        : `${value.length} selected`;

  const toggle = (id: string) => {
    const next = selectedSet.has(id) ? value.filter((v) => v !== id) : [...value, id];
    onChange(next);
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
      <button type="button" onClick={() => setOpen((p) => !p)} className={triggerMods}>
        <span className={value.length ? "nca-chatbot__dropdown-trigger-text--selected" : "nca-chatbot__dropdown-trigger-text"}>
          {label}
        </span>
        <svg className={`nca-chatbot__dropdown-chevron ${open ? "nca-chatbot__dropdown-chevron--open" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open ? (
        <div className="nca-chatbot__dropdown-menu nca-chatbot__dropdown-menu--tall">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="nca-chatbot__multiselect-search"
            aria-label={searchPlaceholder}
          />
          <ul className="nca-chatbot__multiselect-list">
            {filtered.map((o) => {
              const checked = selectedSet.has(o.value);
              return (
                <li key={o.value}>
                  <label className="nca-chatbot__multiselect-option">
                    <input type="checkbox" checked={checked} onChange={() => toggle(o.value)} />
                    <span>{o.label}</span>
                  </label>
                </li>
              );
            })}
            {filtered.length === 0 ? (
              <li className="nca-chatbot__multiselect-empty">No matches</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
