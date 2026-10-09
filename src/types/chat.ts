/**
 * Chat domain types — what gets rendered in the message list and the per-flow
 * UI state managed inside ChatPanel.
 */

import type {
  EndSessionReason,
  HistoryItem,
  Lead,
  MessageRole,
  PreviousSessionSnapshot,
  ProfileChangeGroup,
} from "@/types/api";

export type { HistoryItem, Lead, MessageRole, PreviousSessionSnapshot, ProfileChangeGroup };

export type MessageKind = "text" | "system" | "divider" | "form" | "options";

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  kind?: MessageKind;
  createdAt?: string;
  sessionId?: string;
}

export type QueryType = "general" | "report" | "appointment";

export interface QueryOption {
  id: QueryType;
  label: string;
  img: string;
}

export type SessionEndReason = EndSessionReason | "no" | null;

export interface ChatFormData {
  fullName: string;
  email: string;
  phone: string;
}

export interface AppointmentDraft {
  facilityLocation: string;
  appointmentHour: string;
  appointmentMinute: string;
  requestNature: string;
}

export interface AppointmentErrors {
  facilityLocation?: string;
  appointmentHour?: string;
  appointmentMinute?: string;
  requestNature?: string;
}

export interface ArchivedFlow {
  id: string;
  type: QueryType;
  endedAt: string;
  reason?: SessionEndReason;
}

/** Persisted (sessionStorage) snapshot used to resume on refresh. */
export interface ChatSessionStorage {
  leadId?: string;
  sessionId?: string;
  lastActivity?: number;
  selectedQueryType?: QueryType | null;
  fullName?: string;
  email?: string;
  phone?: string;
  conversationId?: string;
  submitted?: boolean;
  [key: string]: unknown;
}

/** Outgoing queue item for /chatbot-leads/session/message. */
export interface OutgoingChatMessage {
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown> | null;
  attempts?: number;
}

/** Per-session profile snapshot map value (memoized in ChatPanel). */
export interface SessionSnapshotEntry {
  snapshot: {
    name: string | null;
    email: string | null;
    contact: string | null;
  };
  changedFields: Set<"name" | "email" | "contact">;
  hasUpdate: boolean;
}
