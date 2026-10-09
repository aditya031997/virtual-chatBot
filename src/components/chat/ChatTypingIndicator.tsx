import type { ComponentType } from "react";

interface RobotIconLikeProps {
  size?: number;
  color?: string;
  className?: string;
}

interface ChatTypingIndicatorProps {
  RobotIcon: ComponentType<RobotIconLikeProps>;
}

/**
 * WhatsApp-style "assistant is typing" indicator.
 * Mirrors the bot message bubble (avatar + grey left bubble) so it sits
 * naturally at the lower-left of the chat while a reply is being prepared.
 */
export default function ChatTypingIndicator({ RobotIcon }: ChatTypingIndicatorProps) {
  return (
    <div className="nca-chatbot__msg-row-bot" aria-live="polite" aria-label="Assistant is typing">
      <div className="nca-chatbot__bot-avatar nca-chatbot__bot-avatar--md">
        <RobotIcon size={18} color="#FFFFFF" />
      </div>
      <div className="nca-chatbot__typing-bubble">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="nca-chatbot__typing-dot"
            style={{ animationDelay: `${delay}ms`, animationDuration: "1s" }}
          />
        ))}
      </div>
    </div>
  );
}
