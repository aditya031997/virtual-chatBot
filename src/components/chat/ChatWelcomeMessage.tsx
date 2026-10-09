import type { ComponentType } from "react";

interface RobotIconLikeProps {
  size?: number;
  color?: string;
  className?: string;
}

interface ChatWelcomeMessageProps {
  RobotIcon: ComponentType<RobotIconLikeProps>;
  compact?: boolean;
  fill?: boolean;
  timeLabel?: string;
}

export default function ChatWelcomeMessage({ RobotIcon, compact = false, fill = true, timeLabel }: ChatWelcomeMessageProps) {
  return (
    <div className={compact ? "nca-chatbot__welcome-row nca-chatbot__welcome-row--compact" : "nca-chatbot__welcome-row"}>
      <div
        className={
          compact
            ? "nca-chatbot__bot-avatar nca-chatbot__bot-avatar--sm"
            : "nca-chatbot__bot-avatar nca-chatbot__bot-avatar--md"
        }
      >
        <RobotIcon size={compact ? 15 : 18} color="#FFFFFF" />
      </div>
      <div
        className={`nca-chatbot__bubble-welcome ${fill ? "nca-chatbot__bubble-welcome--grow" : ""} ${compact ? "nca-chatbot__bubble-welcome--compact" : "nca-chatbot__bubble-welcome--regular"}`}
      >
        <span className="nca-chatbot__welcome-lead">Hey 👋</span>
        <br />
        <span className={compact ? "nca-chatbot__welcome-body--compact" : "nca-chatbot__welcome-body"}>
          Let&apos;s take a moment to gather some basic
          <br />
          info before we begin.
        </span>
        {timeLabel ? (
          <p className="nca-chatbot__bubble-bot-text-plain text-right !text-xs">{timeLabel}</p>
        ) : null}
      </div>
    </div>
  );
}
