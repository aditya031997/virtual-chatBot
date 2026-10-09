/**
 * API request/response shapes for the chatbot widget and reports endpoints.
 * Sourced from the JSDoc in src/utils/api/chatbotLeads.js and the backend
 * contracts described in src/utils/api/reportsChatbot.js.
 */

export type MessageRole = "user" | "bot" | "system";

export type EndSessionReason = "manual" | "inactivity" | "tab_close" | "no" | "superseded" | "expired";

export interface LeadInput {
  name: string;
  email: string;
  contact?: string;
}

export interface HistoryItem {
  id: string;
  role: MessageRole;
  content: string;
  sessionId?: string;
  createdAt?: string;
  metadata?: Record<string, unknown> | null;
}

export interface ProfileChange {
  field: "name" | "email" | "contact";
  oldValue?: string | null;
  newValue?: string | null;
}

export interface ProfileChangeGroup {
  sessionId: string;
  changeType?: "initial" | "update" | string;
  changedAt?: string;
  changes: ProfileChange[];
}

export interface PreviousSessionSnapshot {
  id: string;
  endedAt?: string | null;
  endReason?: EndSessionReason | null;
  endedAfterMessageId?: string | null;
}

export interface Lead {
  id: string;
  sessionId: string;
  name?: string;
  email?: string;
  contact?: string;
  isReturning?: boolean;
  history?: HistoryItem[];
  profileHistoryBySession?: ProfileChangeGroup[];
  previousSession?: PreviousSessionSnapshot | null;
  previousSessionEnded?: boolean;
  previousSessionEndedReason?: EndSessionReason | null;
  endedAfterMessageId?: string | null;
  endedReason?: EndSessionReason | null;
}

export interface AppendMessageInput {
  sessionId: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown> | null;
}

export interface AppointmentInput {
  leadId: string;
  sessionId?: string;
  careFacilityLocation: string;
  preferredTime: string;
  natureOfRequest: string;
}

export interface LinkConversationInput {
  sessionId: string;
  leadId?: string;
  conversationId: string;
}

export interface EndSessionInput {
  sessionId: string;
  leadId?: string;
  reason?: EndSessionReason;
}

export interface PingSessionInput {
  sessionId: string;
}

export interface SessionEndBeaconInput {
  sessionId: string;
  leadId?: string;
}

/** Generic discriminated union for axios-handler results (chatbotLeadHandler). */
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Shape backend uses for validation/error payloads. */
export interface ApiErrorPayload {
  message?: string | { message?: string; errors?: Record<string, string> };
  error?: string;
  errors?: Record<string, string>;
}

export interface ValidationErrorResponse {
  message: string;
  errors?: Record<string, string>;
}

/** Reports lookup raw shapes (from upstream reports API). */
export interface ReportLocationRaw {
  id: string;
  name: string;
}

export interface ReportClientRaw {
  id: string;
  clientName?: string;
  displayName?: string;
  clientIdentifier?: string;
}

export interface ReportAlarmTypeRaw {
  id: string;
  name: string;
}

export interface ReportShiftRaw {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface ReportExtraField {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
}

export interface ReportTypeFieldsResponse {
  extraFields?: ReportExtraField[];
}

export interface GenerateReportResult {
  blob: Blob;
  filename: string;
}
