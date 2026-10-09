import type { ComponentType } from "react";
import CloseIcon from "@/public/icon/closeIcon";

interface RobotIconLikeProps {
  size?: number;
  color?: string;
  className?: string;
}

interface ChatPanelHeaderProps {
  onClose: () => void;
  RobotIcon: ComponentType<RobotIconLikeProps>;
  onEndSession?: () => void;
  showEndSession?: boolean;
  endSessionDisabled?: boolean;
}

export default function ChatPanelHeader({
  onClose,
  RobotIcon,
  onEndSession,
  showEndSession = false,
  endSessionDisabled = false,
}: ChatPanelHeaderProps) {
  return (
    <header className="nca-chatbot__header">
      <div className="nca-chatbot__header-brand">
        <div className="nca-chatbot__header-avatar">
          <RobotIcon size={18} color="#00A6DA" />
        </div>
        <span id="nca-chatbot-title" className="nca-chatbot__header-title">
          Nurse Call Assistant
        </span>
      </div>
      <div className="nca-chatbot__header-actions">
        {showEndSession ? (
          <button
            type="button"
            onClick={onEndSession}
            disabled={endSessionDisabled}
            className="nca-chatbot__end-session-btn"
          >
            End Session
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="nca-chatbot__icon-btn nca-chatbot__close-btn"
        >
          <CloseIcon size={22} className="nca-chatbot__close-svg" />
        </button>
      </div>
    </header>
  );
}
