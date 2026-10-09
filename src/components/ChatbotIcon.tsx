"use client";

import { useState } from "react";
import RobotIcon from "@/public/icon/robotIcon";
import ChatPanel from "@/components/ChatPanel";

export default function ChatbotIcon() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <ChatPanel open={isOpen} onClose={() => setIsOpen(false)} />
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close chatbot" : "Open chatbot"}
        className={`nca-chatbot__fab ${isOpen ? "nca-chatbot__fab--panel-open" : ""}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
      >
        <RobotIcon size={42} color="#FFFFFF" />
      </button>
    </>
  );
}
