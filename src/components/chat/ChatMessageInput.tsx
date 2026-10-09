"use client";

import type { KeyboardEvent } from "react";
import SendIcon from "@/public/icon/sendIcon";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";

interface ChatMessageInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** When true, input stays editable but Send and Enter do nothing until cleared. */
  sendBlocked?: boolean;
  placeholderDisabled?: string;
  placeholderActive?: string;
  onSend?: (text: string) => void;
  compact?: boolean;
}

export default function ChatMessageInput({
  value,
  onChange,
  disabled = false,
  sendBlocked = false,
  placeholderDisabled,
  placeholderActive,
  onSend,
  compact = false,
}: ChatMessageInputProps) {
  const placeholder = disabled
    ? (placeholderDisabled ?? "Type your message here...")
    : (placeholderActive ?? "Type your message here...");

  const canSend = !disabled && !sendBlocked;
  const { ref: textareaRef, resize } = useAutoResizeTextarea(value, { minRows: 1, maxRows: 5 });

  const handleSend = () => {
    if (!canSend) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend?.(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return; // Shift+Enter → new line (default)
    e.preventDefault();
    handleSend();
  };

  return (
    <div className={compact ? "nca-chatbot__composer-wrap nca-chatbot__composer-wrap--tight" : "nca-chatbot__composer-wrap"}>
      <div className={`nca-chatbot__composer-inner ${disabled ? "nca-chatbot__composer-inner--disabled" : ""}`}>
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            resize();
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label="Message"
          className="nca-chatbot__composer-field"
        />
        <button
          type="button"
          aria-label="Send message"
          aria-disabled={!canSend}
          disabled={!canSend}
          onClick={handleSend}
          className="nca-chatbot__composer-send"
        >
          <SendIcon className="nca-chatbot__submit-icon" />
        </button>
      </div>
    </div>
  );
}
