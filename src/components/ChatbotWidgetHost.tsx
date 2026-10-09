"use client";

import dynamic from "next/dynamic";

const ChatbotIcon = dynamic(() => import("@/components/ChatbotIcon"), {
  ssr: false,
  loading: () => null,
});

export default function ChatbotWidgetHost() {
  return <ChatbotIcon />;
}
