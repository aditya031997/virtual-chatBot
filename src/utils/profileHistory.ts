import type { Lead } from "@/types/api";

/**
 * Resolves the timestamp for the lead's initial profile capture from
 * `profileHistoryBySession` (POST /chatbot-leads/create response).
 */
export function getInitialProfileChangedAt(lead: Lead | null | undefined): string | null {
  const sessions = lead?.profileHistoryBySession;
  if (!Array.isArray(sessions)) return null;

  const initial = sessions.find((entry) => entry?.changeType === "initial");
  const changedAt = initial?.changedAt;
  return typeof changedAt === "string" && changedAt.trim() ? changedAt : null;
}
