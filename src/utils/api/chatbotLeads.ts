/**
 * Chatbot widget API client (public endpoints — no auth header).
 * All calls use JSON. Base URL mirrors the value already used in ChatPanel.
 */

import type {
  AppendMessageInput,
  AppointmentInput,
  EndSessionInput,
  Lead,
  LeadInput,
  LinkConversationInput,
  PingSessionInput,
  SessionEndBeaconInput,
} from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

/** Thrown for non-2xx responses so callers can branch on the HTTP status. */
export class ChatbotApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ChatbotApiError";
    this.status = status;
    this.payload = payload;
  }
}

type HttpMethod = "POST" | "PATCH";

const sendJson = async <T = unknown>(method: HttpMethod, path: string, body: unknown): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = (payload as { message?: string } | null)?.message || `Request to ${path} failed (${response.status}).`;
    throw new ChatbotApiError(message, response.status, payload);
  }

  return payload as T;
};

const postJson = <T = unknown>(path: string, body: unknown) => sendJson<T>("POST", path, body);
const patchJson = <T = unknown>(path: string, body: unknown) => sendJson<T>("PATCH", path, body);

/**
 * (1) Create or resume a lead. Backend de-duplicates by email OR phone.
 */
export const createOrResumeLead = ({ name, email, contact }: LeadInput): Promise<Lead> =>
  postJson<Lead>("/chatbot-leads/create", { name, email, contact });

/**
 * (2) Append a single chat message to the persisted history.
 */
export const appendSessionMessage = ({ sessionId, role, content, metadata }: AppendMessageInput) =>
  postJson("/chatbot-leads/session/message", {
    sessionId,
    role,
    content,
    ...(metadata != null ? { metadata } : {}),
  });

/**
 * (3) Create an appointment from the appointment form.
 */
export const createAppointment = ({
  leadId,
  sessionId,
  careFacilityLocation,
  preferredTime,
  natureOfRequest,
}: AppointmentInput) =>
  postJson("/chatbot-leads/appointment/create", {
    leadId,
    ...(sessionId ? { sessionId } : {}),
    careFacilityLocation,
    preferredTime,
    natureOfRequest,
  });

/**
 * (4) Link the ElevenLabs conversation id to our session/lead so the
 * post-call webhook transcript can be correlated. Idempotent.
 * `conversationId` MUST be the ElevenLabs `conv_...` id from the SDK —
 * never the lead UUID.
 */
export const linkSessionConversation = ({ sessionId, leadId, conversationId }: LinkConversationInput) =>
  patchJson("/chatbot-leads/session/conversation", {
    sessionId,
    ...(leadId ? { leadId } : {}),
    conversationId,
  });

/**
 * (5) Mark a session as ended (manual "End Session", inactivity, or tab
 * close). Best-effort + idempotent — the frontend never blocks on it.
 */
export const endSession = ({ sessionId, leadId, reason = "manual" }: EndSessionInput) =>
  patchJson("/chatbot-leads/session/end", {
    sessionId,
    ...(leadId ? { leadId } : {}),
    reason,
  });

/**
 * (6) Idempotent activity heartbeat — bumps lastActivityAt while the session
 * is active so long, genuinely-used sessions don't get expired by the cron.
 * Best-effort; callers don't block on it.
 */
export const pingSessionActivity = ({ sessionId }: PingSessionInput) =>
  patchJson("/chatbot-leads/session/activity", { sessionId });

/**
 * Best-effort tab/window-close: `sendBeacon` is POST-only and would not match
 * `endSession` (PATCH). Use `fetch` with `keepalive` so the request can finish
 * after the page unloads, same intent as a beacon.
 */
export const sendSessionEndBeacon = ({ sessionId, leadId }: SessionEndBeaconInput): boolean => {
  if (typeof fetch !== "function") return false;
  const payload = JSON.stringify({
    sessionId,
    ...(leadId ? { leadId } : {}),
    reason: "tab_close",
  });
  try {
    void fetch(`${API_BASE_URL}/chatbot-leads/session/end`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    });
    return true;
  } catch {
    return false;
  }
};
