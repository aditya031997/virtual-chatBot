"use client";

import { useState } from "react";
import type { ChatFormData } from "@/types/forms";

interface ChatDetailsPanelProps {
  data?: ChatFormData | null;
  onSave?: (fullName: string) => void;
  onContinueChat?: () => void;
  onBookAppointment?: () => void;
  onClose?: () => void;
}

/**
 * Slide-over panel opened from the in-chat side button. Shows the lead's
 * saved details prefilled — name is editable, email & phone are read-only
 * (they are the dedup keys, so changing them would orphan the history) —
 * plus quick actions to continue chatting or jump to appointment booking.
 */
export default function ChatDetailsPanel({ data, onSave, onContinueChat, onBookAppointment, onClose }: ChatDetailsPanelProps) {
  const [fullName, setFullName] = useState(data?.fullName ?? "");
  const [error, setError] = useState("");

  const validateName = (value: string): string => {
    const v = value.trim();
    if (!v) return "Full name is required";
    if (v.length < 2) return "Full name must be at least 2 characters";
    if (v.length > 100) return "Full name must be 100 characters or less";
    return "";
  };

  const persist = () => {
    const message = validateName(fullName);
    if (message) {
      setError(message);
      return false;
    }
    onSave?.(fullName.trim());
    return true;
  };

  return (
    <div className="nca-chatbot__details-panel">
      <div className="nca-chatbot__details-header">
        <p className="nca-chatbot__details-title">Your details</p>
        <button type="button" onClick={onClose} aria-label="Close details" className="nca-chatbot__details-close">
          <svg className="nca-chatbot__details-close-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="nca-chatbot__details-body">
        <div className="nca-chatbot__details-stack">
          <div>
            <label htmlFor="details-name" className="nca-chatbot__field-label nca-chatbot__field-label--mb">
              Full Name
            </label>
            <input
              id="details-name"
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (error) setError("");
              }}
              placeholder="Enter full name"
              aria-invalid={!!error}
              className={`nca-chatbot__field-input nca-chatbot__field-input--regular ${error ? "nca-chatbot__field-input--error" : "nca-chatbot__field-input--focus-ok"}`}
            />
            {error ? (
              <p className="nca-chatbot__field-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div>
            <label className="nca-chatbot__field-label nca-chatbot__field-label--mb">Email Address</label>
            <input type="text" value={data?.email ?? ""} readOnly tabIndex={-1} className="nca-chatbot__input-readonly" />
          </div>

          <div>
            <label className="nca-chatbot__field-label nca-chatbot__field-label--mb">Phone</label>
            <input type="text" value={data?.phone ?? ""} readOnly tabIndex={-1} className="nca-chatbot__input-readonly" />
          </div>

          <p className="nca-chatbot__details-note">
            Email and phone can&apos;t be changed here — they keep your conversation history linked.
          </p>
        </div>
      </div>

      <div className="nca-chatbot__details-footer">
        <button
          type="button"
          onClick={() => {
            if (persist()) onContinueChat?.();
          }}
          className="nca-chatbot__btn-primary-block"
        >
          Save &amp; continue chat
        </button>
        <button
          type="button"
          onClick={() => {
            if (persist()) onBookAppointment?.();
          }}
          className="nca-chatbot__btn-outline-block"
        >
          Book an appointment
        </button>
      </div>
    </div>
  );
}
