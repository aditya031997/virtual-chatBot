"use client";

import { useEffect } from "react";

interface ChatToastProps {
  message?: string;
  onDismiss?: () => void;
  durationMs?: number;
}

export default function ChatToast({ message, onDismiss, durationMs = 5000 }: ChatToastProps) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => onDismiss?.(), durationMs);
    return () => clearTimeout(id);
  }, [message, durationMs, onDismiss]);

  if (!message) return null;

  return (
    <div className="nca-chatbot__toast" role="alert" aria-live="assertive">
      <p className="nca-chatbot__toast-text">{message}</p>
      <button type="button" className="nca-chatbot__toast-close" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
