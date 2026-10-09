"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useConversation } from "@elevenlabs/react";
import { parsePhoneNumber } from "libphonenumber-js";
import NurseCallAssistantIcon from "@/public/icon/nurseCallAssistantIcon";
import ChatPanelHeader from "@/components/chat/ChatPanelHeader";
import ChatWelcomeMessage from "@/components/chat/ChatWelcomeMessage";
import ChatInfoForm from "@/components/chat/ChatInfoForm";
import ChatMessageInput from "@/components/chat/ChatMessageInput";
import ChatDropdown from "@/components/chat/ChatDropdown";
import ChatTypingIndicator from "@/components/chat/ChatTypingIndicator";
import ChatDetailsPanel from "@/components/chat/ChatDetailsPanel";
import ReportGenerationForm, { type ReportSuccessMessages } from "@/components/chat/report/ReportGenerationForm";
import {
  ChatbotApiError,
  createOrResumeLead,
  appendSessionMessage,
  createAppointment,
  linkSessionConversation,
  endSession,
  pingSessionActivity,
  sendSessionEndBeacon,
} from "@/utils/api/chatbotLeads";
import {
  readChatSession,
  writeChatSession,
  patchChatSession,
  clearChatSession,
} from "@/utils/cookies/chatSession";
import { getInitialProfileChangedAt } from "@/utils/profileHistory";
import type {
  EndSessionReason,
  HistoryItem,
  Lead,
  MessageRole,
  PreviousSessionSnapshot,
  ProfileChangeGroup,
} from "@/types/api";
import type {
  AppointmentDraft,
  ChatFormData,
  Message,
  MessageKind,
  OutgoingChatMessage,
  QueryOption,
  QueryType,
  SessionSnapshotEntry,
} from "@/types/chat";

interface ChatPanelProps {
  onClose: () => void;
  open?: boolean;
}

interface AppointmentErrorsLocal {
  facilityLocation?: string;
  appointmentTime?: string;
  requestNature?: string;
}

interface ArchivedFlowEntry {
  id: string;
  queryType: QueryType;
  promptText: string;
}

interface FailedSendState {
  text: string;
}

type RenderSessionDividerOptions = { wrap?: boolean; title?: string };

const QUERY_TYPES: QueryOption[] = [
  { id: "general", label: "General Query", img: "/img/GeneralQuery.svg" },
  { id: "report", label: "Report Generation", img: "/img/ReportGeneration.svg" },
  { id: "appointment", label: "Appointment Booking", img: "/img/AppointmentBooking .svg" },
];

const GENERAL_PROMPT = "Please type your message below.";
const REPORT_PROMPT = "Tell me what report you'd like to generate.";
const APPOINTMENT_PROMPT = "Sure, I can help you with your appointment. I just need a few details to get started.";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;
const CHAT_CONNECTION_ERROR = "Sorry, I couldn't connect to the assistant right now. Please try again.";
// Hard limits so a persistently-failing history endpoint can never loop
// /chatbot-leads/create. After this, history persistence is disabled and the
// chat continues normally without server-side history.
const MAX_LEAD_RECREATES = 2;
const RECREATE_COOLDOWN_MS = 10000;
// End the conversation after this much time with no chat interaction.
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
const INACTIVITY_CHECK_MS = 30 * 1000;
// Safety net: if the agent never sends a recognizable reply, never let the
// typing indicator stay stuck (it would otherwise reappear on every render).
const BOT_TYPING_TIMEOUT_MS = 30 * 1000;
// localStorage marker key used by the refresh-vs-close detection (see the
// `pagehide` effect and the mount-resume effect for the full flow).
const PENDING_END_KEY = "nca_pending_end";

export default function ChatPanel({ onClose, open = true }: ChatPanelProps) {
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<ChatFormData | null>(null);
  const [initialProfileChangedAt, setInitialProfileChangedAt] = useState<string | null>(null);

  const [explicitQueryType, setExplicitQueryType] = useState<QueryType | null>(null);
  // Value is unused (kept for future routing); only the setter is called.
  const [, setEffectiveQueryType] = useState<QueryType | null>(null);
  const [queryPromptText, setQueryPromptText] = useState("");
  const [queryFlowStarted, setQueryFlowStarted] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showFollowUpFlow, setShowFollowUpFlow] = useState(false);
  const [conversationEnded, setConversationEnded] = useState(false);
  const [, setConversationId] = useState("");
  const [archivedFlows, setArchivedFlows] = useState<ArchivedFlowEntry[]>([]);
  const [isSwitching, setIsSwitching] = useState(false);
  const [appointmentFormAtBottom, setAppointmentFormAtBottom] = useState(false);

  const [appointmentDraft, setAppointmentDraft] = useState<AppointmentDraft>({
    facilityLocation: "",
    appointmentHour: "",
    appointmentMinute: "",
    requestNature: "",
  });
  const [appointmentErrors, setAppointmentErrors] = useState<AppointmentErrorsLocal>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSessionStarting, setIsSessionStarting] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isLeadSubmitting, setIsLeadSubmitting] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [isAppointmentSubmitting, setIsAppointmentSubmitting] = useState(false);
  const [appointmentApiError, setAppointmentApiError] = useState("");
  const [failedSend, setFailedSend] = useState<FailedSendState | null>(null);
  const [resumedHistory, setResumedHistory] = useState<Message[]>([]);
  // Per-session profile change groups from the backend. Drives the inline
  // "updated details" bubble that appears AFTER each "Previous session
  // ended · New session" divider (in addition to the always-on top bubble).
  const [profileHistoryBySession, setProfileHistoryBySession] = useState<ProfileChangeGroup[]>([]);
  // Setter kept for resume bookkeeping; the value itself is no longer read
  // (the options picker now always shows after login, even on refresh).
  const [, setIsResumeFromCookie] = useState(false);
  // True when a refresh/reopen restored a previously-confirmed query flow —
  // the chat continues where it left off and the options picker is NOT
  // shown again.
  const [resumedWithQuery, setResumedWithQuery] = useState(false);
  // True for the whole lifetime of a resumed/returning session (refresh /
  // reopen). A returning user is NOT first-time onboarding, so "Back" is
  // never shown and the picker behaves as the reopened quick-switcher.
  const [isResumedSession, setIsResumedSession] = useState(false);
  // Authoritative from the backend /create response — render the divider
  // strictly from this instead of inferring it on the client.
  const [previousSessionEnded, setPreviousSessionEnded] = useState(false);
  const [previousSessionEndedReason, setPreviousSessionEndedReason] = useState<EndSessionReason | null>(null);
  // Backend anchor: the history message id the prior session ended AFTER.
  // null → prior session had no messages → divider goes after all history.
  const [endedAfterMessageId, setEndedAfterMessageId] = useState<string | null>(null);
  // prior session id + endedAt from POST /chatbot-leads/create (previousSession).
  const [previousSessionSnapshot, setPreviousSessionSnapshot] = useState<PreviousSessionSnapshot | null>(null);
  // Why the CURRENT session ended ("manual" | "inactivity" | "no" | null) —
  // drives the ended-state footer message. The chat stays visible (read-only)
  // until the user refreshes or reopens.
  const [sessionEndReason, setSessionEndReason] = useState<EndSessionReason | null>(null);
  // Reference id shown when the user ends via the "No" prompt.
  const [endReferenceId, setEndReferenceId] = useState("");

  const leadIdRef = useRef("");
  const sessionIdRef = useRef("");
  const formDataRef = useRef<ChatFormData | null>(null);
  const isReturningUserRef = useRef(false);
  const messageQueueRef = useRef<OutgoingChatMessage[]>([]);
  const isFlushingQueueRef = useRef(false);
  const botBufferRef = useRef("");
  const queuedBotIdsRef = useRef<Set<string>>(new Set());
  const recreateCountRef = useRef(0);
  const lastRecreateAtRef = useRef(0);
  const persistenceDisabledRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const lastHeartbeatRef = useRef(0);
  const inactivityEndedRef = useRef(false);
  const submittedRef = useRef(false);
  const conversationEndedRef = useRef(false);

  const [bootstrapping, setBootstrapping] = useState(true);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  // True while a temporary, button-added options form is in the chat and
  // still removable (i.e. not yet submitted/finalized).
  const [inlineFormActive, setInlineFormActive] = useState(false);
  const [lastSelectedType, setLastSelectedType] = useState<QueryType | null>(null);
  // Index into `messages` where the follow-up "How can I help?" prompt sits,
  // so messages before it render above the prompt and new ones below it.
  const [followUpAnchor, setFollowUpAnchor] = useState<number | null>(null);

  const HOURS_24 = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")), []);
  const MINUTES = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")), []);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const prevMsgLenRef = useRef(0);
  const prevLastLenRef = useRef(0);
  const activeBotMessageIdRef = useRef<string | null>(null);
  const botHasVisibleContentRef = useRef(false);
  /** True when stream already rendered the agent reply (blocks duplicate onMessage). */
  const streamBotReplyShownRef = useRef(false);
  const activeConversationIdRef = useRef("");
  const sessionPromiseRef = useRef<Promise<string> | null>(null);
  const skipNextAgentMessageRef = useRef(false);
  /** After appointment/report submit — mark flow complete (no Yes/No follow-up). */
  const finalizeFormQueryFlow = (queryType: QueryType) => {
    setQueryFlowStarted(true);
    setShowAppointmentForm(false);
    setShowReportForm(false);
    setInlineFormActive(false);
    setLastSelectedType(queryType);
    patchChatSession({ selectedQueryType: queryType });
  };

  const panelHeightPx = 500;
  const columnClass = submitted ? "nca-chatbot__column nca-chatbot__column--right-narrow" : "nca-chatbot__column";
  // A real session starts only once the user picks an option (or types a
  // question, which auto-selects General). Before that there are no session
  // controls to show.
  const sessionStarted =
    submitted && !bootstrapping && !conversationEnded && Boolean(explicitQueryType || lastSelectedType);
  // Session controls (End Session / Add Form) stay COMPLETELY HIDDEN until
  // the conversation has genuinely started IN THIS session — i.e. the user
  // asked a question (got a bot reply) or submitted the appointment (bot
  // confirmation). Resumed/past history must NOT count, otherwise a returning
  // user sees the controls before doing anything in the new session.
  const hasBotResponded = messages.some((m) => m.role === "bot");
  const conversationStarted = sessionStarted && hasBotResponded;
  // Visible once started, but DISABLED while a reply is loading (typing
  // indicator showing) so they can't be clicked mid-response.
  const sessionControlsDisabled = isBotTyping;

  // Walk profileHistoryBySession chronologically and compute, for each
  // session, the {name,email,contact} snapshot at the end of that session
  // plus which fields actually changed within it. The inline "updated
  // details" bubble after each session-divider reads from this map.
  const sessionSnapshots = useMemo(() => {
    const map = new Map<string, SessionSnapshotEntry>();
    const acc: { name: string | null; email: string | null; contact: string | null } = { name: null, email: null, contact: null };
    for (const group of profileHistoryBySession ?? []) {
      if (!group || !group.sessionId) continue;
      const changedFields = new Set<"name" | "email" | "contact">();
      for (const c of group.changes ?? []) {
        if (!c || !c.field) continue;
        const next = c.newValue ?? null;
        if (next !== acc[c.field]) changedFields.add(c.field);
        acc[c.field] = next;
      }
      map.set(group.sessionId, {
        snapshot: { ...acc },
        changedFields,
        // "initial" = account creation → already shown by the top bubble.
        hasUpdate: changedFields.size > 0 && group.changeType !== "initial",
      });
    }
    return map;
  }, [profileHistoryBySession]);

  // Per-session profile changes are now rendered inline in the chat history
  // at each session boundary (see resumedHistory map below) — no top-level
  // "previous vs current" comparison cards.
  const isQuerySelectionLocked = Boolean(explicitQueryType);
  // "Back" belongs to the first-time onboarding selection flow only. When the
  // form is reopened later via the "Add Form"/sidebar button (follow-up flow),
  // it's a quick option-switcher and must NOT show "Back".
  const canGoBackCurrent =
    Boolean(explicitQueryType) &&
    !queryFlowStarted &&
    !conversationEnded &&
    !showFollowUpFlow &&
    !isResumedSession;
  const composerInputDisabled =
    !submitted ||
    conversationEnded ||
    showAppointmentForm ||
    showReportForm ||
    isSessionStarting;
  const shouldShowPostFormIntro = submitted;

  submittedRef.current = submitted;
  conversationEndedRef.current = conversationEnded;

  // Time only, "HH:MM" (24h), in the user's system timezone. No day / AM-PM.
  const formatMsgTime = (value?: string | number | Date | null): string => {
    const d = value ? new Date(value) : new Date();
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  const createMessageId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  // Any real chat interaction resets the inactivity window.
  const markActivity = () => {
    if (inactivityEndedRef.current) return;
    const now = Date.now();
    lastActivityRef.current = now;
    patchChatSession({ lastActivity: now });
    // Throttled server heartbeat (best-effort) so long, genuinely-used
    // sessions aren't expired by the cron. Server is the source of truth.
    if (sessionIdRef.current && now - lastHeartbeatRef.current > 60000) {
      lastHeartbeatRef.current = now;
      pingSessionActivity({ sessionId: sessionIdRef.current }).catch(() => { });
    }
  };

  const appendMessage = (next: { id?: string; role: MessageRole; text: string; kind?: MessageKind; createdAt?: string }): string => {
    markActivity();
    const id = next.id ?? createMessageId();
    setMessages((prev) => [
      ...prev,
      {
        id,
        role: next.role,
        text: next.text,
        kind: next.kind ?? "text",
        createdAt: next.createdAt ?? new Date().toISOString(),
      },
    ]);
    return id;
  };

  // Permanently stop persisting history (and drop the queue) once the server
  // proves unable to accept it. The chat itself keeps working unaffected.
  const disablePersistence = (reason: string) => {
    if (persistenceDisabledRef.current) return;
    persistenceDisabledRef.current = true;
    messageQueueRef.current = [];
    console.warn(
      `Chat history persistence disabled (${reason}). Chat continues without server-side history.`,
    );
  };

  // Bounded + cooled-down lead/session re-creation. Returns null (without
  // calling the API) once the cap is hit or we're within the cooldown, so a
  // failing history endpoint can never loop POST /chatbot-leads/create.
  const recreateLeadSession = async (): Promise<string | null> => {
    const fd = formDataRef.current;
    if (!fd || persistenceDisabledRef.current) return null;
    if (recreateCountRef.current >= MAX_LEAD_RECREATES) return null;
    if (Date.now() - lastRecreateAtRef.current < RECREATE_COOLDOWN_MS) return null;

    lastRecreateAtRef.current = Date.now();
    recreateCountRef.current += 1;
    try {
      const lead = await createOrResumeLead({
        name: fd.fullName,
        email: fd.email,
        contact: fd.phone,
      });
      if (lead?.id) leadIdRef.current = lead.id;
      if (lead?.sessionId) sessionIdRef.current = lead.sessionId;
      patchChatSession({ leadId: leadIdRef.current, sessionId: sessionIdRef.current });
      return sessionIdRef.current || null;
    } catch (error) {
      console.error("Failed to re-create chatbot lead session:", error);
      return null;
    }
  };

  const recreateExhausted = () =>
    persistenceDisabledRef.current || recreateCountRef.current >= MAX_LEAD_RECREATES;

  // Sequential, in-order, non-blocking flush. Retries network blips and
  // re-creates the session on a 404 — but strictly bounded by the cap above.
  const flushMessageQueue = async () => {
    if (isFlushingQueueRef.current || persistenceDisabledRef.current) return;
    isFlushingQueueRef.current = true;
    try {
      while (messageQueueRef.current.length > 0 && !persistenceDisabledRef.current) {
        if (!sessionIdRef.current) {
          const sid = await recreateLeadSession();
          if (!sid) {
            if (recreateExhausted()) disablePersistence("no session");
            else setTimeout(() => void flushMessageQueue(), RECREATE_COOLDOWN_MS);
            break;
          }
        }

        const item = messageQueueRef.current[0];
        if (!item) break;
        try {
          await appendSessionMessage({
            sessionId: sessionIdRef.current,
            role: item.role,
            content: item.content,
            metadata: item.metadata ?? null,
          });
          messageQueueRef.current.shift();
        } catch (error) {
          item.attempts = (item.attempts ?? 0) + 1;

          if (error instanceof ChatbotApiError && error.status === 404) {
            const sid = await recreateLeadSession();
            if (!sid) {
              if (recreateExhausted()) disablePersistence("session endpoint 404");
              else setTimeout(() => void flushMessageQueue(), RECREATE_COOLDOWN_MS);
              break;
            }
            continue;
          }

          if (item.attempts >= 5) {
            console.error("Dropping chat message after repeated failures:", error, item);
            messageQueueRef.current.shift();
            continue;
          }
          await new Promise((resolve) => setTimeout(resolve, 800 * item.attempts!));
        }
      }
    } finally {
      isFlushingQueueRef.current = false;
    }
  };

  const queueSessionMessage = (role: MessageRole, content: string, metadata: Record<string, unknown> | null = null) => {
    if (persistenceDisabledRef.current) return;
    const text = typeof content === "string" ? content.trim() : "";
    if (!text) return;
    messageQueueRef.current.push({ role, content: text, metadata, attempts: 0 });
    void flushMessageQueue();
  };

  const queueBotFinal = (messageId: string | null, text: string) => {
    if (!text || !text.trim()) return;
    if (messageId) {
      if (queuedBotIdsRef.current.has(messageId)) return;
      queuedBotIdsRef.current.add(messageId);
    }
    queueSessionMessage("bot", text);
  };

  const updateMessageText = (messageId: string, updater: (current: string) => string) => {
    setMessages((prev) =>
      prev.map((entry) =>
        entry.id === messageId
          ? {
            ...entry,
            text: updater(entry.text),
          }
          : entry,
      ),
    );
  };

  // Drop a message from the live transcript (used to clean up empty bot
  // drafts whose stream ended without ever producing text).
  const removeMessage = (messageId: string | null) => {
    if (!messageId) return;
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  const resetBotStreamRefs = ({ clearStreamDedupe = false }: { clearStreamDedupe?: boolean } = {}) => {
    activeBotMessageIdRef.current = null;
    botBufferRef.current = "";
    botHasVisibleContentRef.current = false;
    if (clearStreamDedupe) streamBotReplyShownRef.current = false;
  };

  const markStreamBotReplyShown = () => {
    streamBotReplyShownRef.current = true;
  };

  const ensureBotDraftId = (): string => {
    if (activeBotMessageIdRef.current) return activeBotMessageIdRef.current;
    const messageId = createMessageId();
    activeBotMessageIdRef.current = messageId;
    return messageId;
  };

  /** First visible bot text: hide loader and add bubble (never append empty drafts). */
  const publishVisibleBotText = (messageId: string, text: string): boolean => {
    const content = typeof text === "string" ? text : "";
    if (!content.trim()) return false;

    if (!botHasVisibleContentRef.current) {
      setIsBotTyping(false);
      botHasVisibleContentRef.current = true;
      appendMessage({
        id: messageId,
        role: "bot",
        text: content,
        createdAt: new Date().toISOString(),
      });
      return true;
    }

    updateMessageText(messageId, (current) => current + content);
    return true;
  };

  const extractAgentText = (payload: unknown): string => {
    const p = payload as Record<string, unknown> & {
      delta?: { text?: unknown };
      content?: { text?: unknown };
      message?: { text?: unknown };
      agentResponseEvent?: { agentResponse?: unknown; agent_response?: unknown; text?: unknown };
      agent_response_event?: { agentResponse?: unknown; agent_response?: unknown; text?: unknown };
    };
    const candidates: unknown[] = [
      p?.text,
      p?.delta,
      p?.message,
      p?.content,
      p?.response,
      p?.agentResponse,
      p?.agent_response,
      p?.delta?.text,
      p?.content?.text,
      p?.message?.text,
      p?.agentResponseEvent?.agentResponse,
      p?.agentResponseEvent?.agent_response,
      p?.agentResponseEvent?.text,
      p?.agent_response_event?.agent_response,
      p?.agent_response_event?.agentResponse,
      p?.agent_response_event?.text,
    ];

    const match = candidates.find((value): value is string => typeof value === "string" && value.trim().length > 0);
    return match ?? "";
  };

  const getChatPartType = (part: unknown): string => {
    const p = part as { type?: unknown; event?: unknown; state?: unknown } | null | undefined;
    const value = p?.type ?? p?.event ?? p?.state;
    return typeof value === "string" ? value.toLowerCase() : "";
  };

  const conversation = useConversation({
    textOnly: true,
    onDisconnect: () => {
      resetBotStreamRefs({ clearStreamDedupe: true });
      sessionPromiseRef.current = null;
      skipNextAgentMessageRef.current = false;
      activeConversationIdRef.current = "";
      setIsBotTyping(false);
    },
    onError: (error: unknown) => {
      console.error("ElevenLabs chat error:", error);
      resetBotStreamRefs({ clearStreamDedupe: true });
      sessionPromiseRef.current = null;
      skipNextAgentMessageRef.current = false;
      setIsBotTyping(false);
      appendMessage({
        role: "bot",
        text: CHAT_CONNECTION_ERROR,
      });
      queueSessionMessage("system", CHAT_CONNECTION_ERROR);
    },
    onAgentChatResponsePart: (part: unknown) => {
      const partType = getChatPartType(part);
      const textChunk = extractAgentText(part);

      if (partType === "start") {
        activeBotMessageIdRef.current = null;
        skipNextAgentMessageRef.current = true;
        botBufferRef.current = "";
        botHasVisibleContentRef.current = false;
        streamBotReplyShownRef.current = false;
        return;
      }

      if (partType === "delta") {
        skipNextAgentMessageRef.current = true;
        const messageId = ensureBotDraftId();
        if (textChunk) {
          botBufferRef.current += textChunk;
          if (!botHasVisibleContentRef.current) {
            publishVisibleBotText(messageId, botBufferRef.current);
            markStreamBotReplyShown();
          } else {
            updateMessageText(messageId, (current) => current + textChunk);
          }
        }
        return;
      }

      if (partType === "stop" || partType === "complete" || partType === "end") {
        const draftId = activeBotMessageIdRef.current;
        const finalText = (botBufferRef.current || textChunk || "").trim();

        if (finalText) {
          const messageId = draftId ?? ensureBotDraftId();
          if (!botHasVisibleContentRef.current) {
            publishVisibleBotText(messageId, finalText);
          } else if (textChunk) {
            updateMessageText(messageId, (current) => current || textChunk);
          }
          markStreamBotReplyShown();
          queueBotFinal(messageId, finalText);
          resetBotStreamRefs();
          skipNextAgentMessageRef.current = false;
        } else if (!botHasVisibleContentRef.current) {
          // Stream ended with no text — final reply often arrives via onMessage; keep loader.
          botBufferRef.current = "";
          skipNextAgentMessageRef.current = true;
        } else {
          setIsBotTyping(false);
          markStreamBotReplyShown();
          resetBotStreamRefs();
          skipNextAgentMessageRef.current = false;
        }
        return;
      }
    },
    onMessage: (event: unknown) => {
      const e = event as { type?: unknown } | null | undefined;
      const eventType = typeof e?.type === "string" ? e.type.toLowerCase() : "";
      const agentText = extractAgentText(event);

      if (!agentText) return;

      if (streamBotReplyShownRef.current) {
        skipNextAgentMessageRef.current = false;
        return;
      }

      if (skipNextAgentMessageRef.current) {
        skipNextAgentMessageRef.current = false;
      }

      if (eventType && !eventType.includes("agent")) return;

      const messageId = activeBotMessageIdRef.current ?? createMessageId();
      if (!botHasVisibleContentRef.current) {
        publishVisibleBotText(messageId, agentText);
      } else {
        updateMessageText(messageId, (current) => current || agentText);
      }
      markStreamBotReplyShown();
      queueBotFinal(messageId, agentText);
      resetBotStreamRefs();
    },
  });

  const resetAppointmentDraft = () => {
    setAppointmentErrors({});
    setAppointmentDraft({
      facilityLocation: "",
      appointmentHour: "",
      appointmentMinute: "",
      requestNature: "",
    });
  };

  const resetCurrentFlow = () => {
    setExplicitQueryType(null);
    setEffectiveQueryType(null);
    setQueryPromptText("");
    setQueryFlowStarted(false);
    setShowAppointmentForm(false);
    setShowReportForm(false);
    resetAppointmentDraft();
  };

  const archiveCurrentFlow = () => {
    // Only archive a flow the user actually engaged with (sent a message /
    // submitted the appointment). An option that was merely selected but
    // never used must NOT be archived — that's what created stale,
    // incomplete duplicate "How can I help?" blocks.
    if (!explicitQueryType || !queryFlowStarted) return;
    setArchivedFlows((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        queryType: explicitQueryType,
        promptText: queryPromptText,
      },
    ]);
  };

  // Signature changes both when a message is added AND while a streamed bot
  // reply grows (same count, longer text) — so auto-scroll follows streaming.
  const lastMessage = messages[messages.length - 1];
  const streamSignature = `${messages.length}:${lastMessage ? lastMessage.text.length : 0}`;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const lenChanged = messages.length !== prevMsgLenRef.current;
    const lastLen = lastMessage ? lastMessage.text.length : 0;
    // Streaming = same message count but the last bot reply text is growing.
    const isStreamingGrowth = !lenChanged && lastLen > prevLastLenRef.current;
    prevMsgLenRef.current = messages.length;
    prevLastLenRef.current = lastLen;

    // rAF so newly rendered content (e.g. an added options/appointment form)
    // is laid out before we measure scrollHeight.
    const raf = requestAnimationFrame(() => {
      if (isStreamingGrowth) {
        // Follow the stream only if the user is already near the bottom —
        // don't yank them down if they scrolled up to read.
        const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distance < 140) el.scrollTop = el.scrollHeight;
      } else {
        // New message, typing indicator, or any structural change (form
        // added, prompt shown, follow-up opened) → ensure it's visible.
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [streamSignature, submitted, showAppointmentForm, showReportForm, queryPromptText, showFollowUpFlow, inlineFormActive, archivedFlows.length, isBotTyping, failedSend, resumedHistory.length]);

  // Scroll to the latest content on (re)open AND once bootstrapping finishes.
  // On the very first open the panel is still bootstrapping (only a spinner is
  // mounted), so an open-time scroll would do nothing — we must also run it
  // when the real content first renders (bootstrapping → false).
  useEffect(() => {
    if (!open || bootstrapping) return;
    // Double rAF so the freshly-rendered form/chat is laid out before we
    // measure scrollHeight.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [open, bootstrapping]);

  const getChatbotSignedUrl = async (): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/elevenlabs/chatbot/signed-url`);
    const payload = await response.json().catch(() => null) as { signedUrl?: string; message?: string } | null;

    console.log("ElevenLabs signed-url API response:", {
      ok: response.ok,
      status: response.status,
      payload,
    });

    if (!response.ok || !payload?.signedUrl) {
      throw new Error(payload?.message || "Failed to create ElevenLabs chatbot session.");
    }

    return payload.signedUrl;
  };

  const closeChatSession = async () => {
    resetBotStreamRefs({ clearStreamDedupe: true });
    skipNextAgentMessageRef.current = false;
    sessionPromiseRef.current = null;
    // Any teardown (refresh/resume, back, appointment switch, inactivity,
    // close) must drop the "Assistant is typing…" indicator so it can never
    // linger or reappear without an active in-flight message.
    setIsBotTyping(false);

    if (conversation.status !== "disconnected") {
      try {
        await conversation.endSession();
      } catch (error) {
        console.error("Failed to end ElevenLabs session:", error);
      }
    }

    activeConversationIdRef.current = "";
    setConversationId("");
  };

  // Hard reset back to the lead form (name / email / phone), as if the
  // widget had just been opened fresh. Used when the user re-opens the
  // chatbot after the session ended due to inactivity — matching what a
  // page refresh already does.
  const resetToLeadForm = () => {
    void closeChatSession();
    clearChatSession();

    leadIdRef.current = "";
    sessionIdRef.current = "";
    formDataRef.current = null;
    messageQueueRef.current = [];
    queuedBotIdsRef.current = new Set();
    recreateCountRef.current = 0;
    lastRecreateAtRef.current = 0;
    persistenceDisabledRef.current = false;
    inactivityEndedRef.current = false;
    lastActivityRef.current = Date.now();

    setSubmitted(false);
    setConversationEnded(false);
    setFormData(null);
    setLeadError("");
    setMessages([]);
    setResumedHistory([]);
    setProfileHistoryBySession([]);
    setInitialProfileChangedAt(null);
    setIsResumeFromCookie(false);
    setResumedWithQuery(false);
    setIsResumedSession(false);
    setPreviousSessionEnded(false);
    setEndedAfterMessageId(null);
    setPreviousSessionEndedReason(null);
    setPreviousSessionSnapshot(null);
    setSessionEndReason(null);
    setEndReferenceId("");
    setArchivedFlows([]);
    setShowFollowUpFlow(false);
    setFollowUpAnchor(null);
    setInlineFormActive(false);
    setShowDetailsPanel(false);
    setFailedSend(null);
    setIsBotTyping(false);
    setLastSelectedType(null);
    resetCurrentFlow();
    setBootstrapping(false);
  };

  // Manual "End Session" (header button): notify the backend best-effort and
  // put the chat into the ended (read-only) state — same as an inactivity
  // timeout. The user can still scroll/read; refreshing or reopening returns
  // them to the lead form to start a new conversation.
  const handleEndSession = () => {
    if (!submitted || conversationEnded || inactivityEndedRef.current) return;
    const sid = sessionIdRef.current;
    const lid = leadIdRef.current;
    if (sid) {
      endSession({ sessionId: sid, leadId: lid || undefined, reason: "manual" }).catch(
        (error) => console.warn("endSession (manual) failed — non-blocking:", error),
      );
    }
    inactivityEndedRef.current = true;
    setSessionEndReason("manual");
    setConversationEnded(true);
    void closeChatSession();
    clearChatSession();
  };

  // Re-opening the widget after an inactivity timeout behaves like a page
  // refresh: it returns the user to the lead form. (A normal close/reopen
  // before any timeout still continues the same session untouched.)
  useEffect(() => {
    if (open && inactivityEndedRef.current) {
      resetToLeadForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Correlate the ElevenLabs conversation with our session/lead so the
  // post-call webhook transcript can be tied back. Fire-and-forget,
  // idempotent. The value MUST be the ElevenLabs `conv_...` id — guard
  // against ever sending a lead UUID (the original bug).
  const linkConversation = async (conversationId: string) => {
    if (typeof conversationId !== "string" || !conversationId.startsWith("conv_")) {
      console.warn("Skipping conversation link — not an ElevenLabs conv_ id:", conversationId);
      return;
    }
    if (!sessionIdRef.current) return;
    patchChatSession({ conversationId });
    try {
      await linkSessionConversation({
        sessionId: sessionIdRef.current,
        leadId: leadIdRef.current || undefined,
        conversationId,
      });
    } catch (error) {
      // Idempotent on the backend — safe to retry on the next session start.
      console.warn("Failed to link ElevenLabs conversation to session:", error);
    }
  };

  const ensureChatSession = async (): Promise<string> => {
    if (conversation.status === "connected" && activeConversationIdRef.current) {
      return activeConversationIdRef.current;
    }

    if (sessionPromiseRef.current) {
      return sessionPromiseRef.current;
    }

    const pendingSession = (async (): Promise<string> => {
      setIsSessionStarting(true);
      const signedUrl = await getChatbotSignedUrl();
      const fd: Partial<ChatFormData> = formDataRef.current || formData || {};
      const userId = fd.email || fd.phone || fd.fullName || undefined;
      const firstName = (fd.fullName || "").trim().split(/\s+/)[0] || "there";
      const nationalPhone = (() => {
        const raw = fd.phone || "";
        if (!raw) return "";
        try {
          return parsePhoneNumber(raw)?.nationalNumber || raw.replace(/\D/g, "");
        } catch {
          return raw.replace(/\D/g, "");
        }
      })();
      const dynamicVariables = {
        user_name: firstName,
        user_email: (fd.email || "").trim(),
        user_phone: String(nationalPhone),
        is_returning_user: isReturningUserRef.current ? "yes" : "no",
      };
      console.log("Starting ElevenLabs chatbot session with:", {
        signedUrl,
        userId,
        dynamicVariables,
      });
      const conversationId = await conversation.startSession({
        signedUrl,
        connectionType: "websocket",
        textOnly: true,
        userId,
        dynamicVariables,
        overrides: {
          conversation: {
            textOnly: true,
          },
        },
      });

      console.log("ElevenLabs chatbot session started:", {
        conversationId,
      });
      activeConversationIdRef.current = conversationId;
      setConversationId(conversationId);
      void linkConversation(conversationId);
      return conversationId;
    })();

    sessionPromiseRef.current = pendingSession;

    try {
      return await pendingSession;
    } finally {
      sessionPromiseRef.current = null;
      setIsSessionStarting(false);
    }
  };

  useEffect(() => {
    return () => {
      void closeChatSession();
    };
  }, []);

  // Creates/resumes the lead, hydrates history, and (re)starts a fresh
  // session. Used by the lead form AND by cookie-based resume on mount.
  const startLeadSession = async (data: ChatFormData, { isResume = false }: { isResume?: boolean } = {}) => {
    // On a resume, preserve the previously-confirmed query so the chat can
    // continue where it left off instead of re-showing the picker.
    const storedBefore = isResume ? readChatSession() : null;
    const storedQueryType = (storedBefore?.selectedQueryType ?? null) as QueryType | null;
    const restoredQueryType: QueryType | null =
      isResume && storedQueryType && ["general", "report", "appointment"].includes(storedQueryType)
        ? storedQueryType
        : null;

    const lead = await createOrResumeLead({
      name: data.fullName,
      email: data.email,
      contact: data.phone,
    });

    leadIdRef.current = lead?.id || "";
    sessionIdRef.current = lead?.sessionId || "";
    formDataRef.current = data;
    messageQueueRef.current = [];
    queuedBotIdsRef.current = new Set();
    recreateCountRef.current = 0;
    lastRecreateAtRef.current = 0;
    persistenceDisabledRef.current = false;
    inactivityEndedRef.current = false;
    lastActivityRef.current = Date.now();

    const mappedHistory: Message[] = Array.isArray(lead?.history)
      ? lead.history
        .filter((item: HistoryItem) => item && typeof item.content === "string" && item.content.trim())
        .map((item: HistoryItem): Message => ({
          id: item.id ?? createMessageId(),
          role: item.role === "user" ? "user" : "bot",
          text: item.content,
          sessionId: item.sessionId,
          createdAt: item.createdAt,
        }))
      : [];

    isReturningUserRef.current = mappedHistory.length > 0;

    writeChatSession({
      leadId: leadIdRef.current,
      sessionId: sessionIdRef.current,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      lastActivity: lastActivityRef.current,
      ...(restoredQueryType ? { selectedQueryType: restoredQueryType } : {}),
    });

    void closeChatSession();
    setFormData(data);
    setResumedHistory(mappedHistory);
    setProfileHistoryBySession(
      Array.isArray(lead?.profileHistoryBySession) ? lead.profileHistoryBySession : [],
    );
    setInitialProfileChangedAt(getInitialProfileChangedAt(lead));
    setIsResumeFromCookie(isResume);
    setPreviousSessionEnded(lead?.previousSessionEnded === true);
    setPreviousSessionEndedReason(lead?.previousSession?.endReason ?? lead?.endedReason ?? null);
    setEndedAfterMessageId(lead?.previousSession?.endedAfterMessageId ?? null);
    const ps = lead?.previousSession;
    setPreviousSessionSnapshot(
      ps && typeof ps.id === "string"
        ? { id: ps.id, endedAt: typeof ps.endedAt === "string" ? ps.endedAt : null }
        : null,
    );
    setSessionEndReason(null);
    setEndReferenceId("");
    setSubmitted(true);
    setConversationEnded(false);
    setConversationId("");
    setArchivedFlows([]);
    setMessages([]);
    setFailedSend(null);
    setShowFollowUpFlow(false);
    setFollowUpAnchor(null);
    setInlineFormActive(false);
    resetCurrentFlow();
    setLastSelectedType(null);
    setIsResumedSession(isResume);

    if (restoredQueryType) {
      // Resume the previously-confirmed flow: continue the chat, keep the
      // session controls, and do NOT re-show the options picker.
      setLastSelectedType(restoredQueryType);
      setExplicitQueryType(restoredQueryType);
      setEffectiveQueryType(restoredQueryType);
      setQueryFlowStarted(true);
      setQueryPromptText(
        restoredQueryType === "report" ? REPORT_PROMPT : restoredQueryType === "general" ? GENERAL_PROMPT : "",
      );
      setResumedWithQuery(true);
    } else if (isResume) {
      // Returning user, no confirmed query → render the picker as the
      // reopened quick-switcher (follow-up flow): NO "Back", treated as an
      // already-open inline form so the side button is "Remove Form" and
      // clicking it can't recreate/duplicate the form.
      setResumedWithQuery(false);
      setShowFollowUpFlow(true);
      setFollowUpAnchor(0);
      setInlineFormActive(true);
    } else {
      // First-time login (no confirmed query yet) → onboarding picker with
      // the "Back" affordance.
      setResumedWithQuery(false);
    }

  };

  const handleFormSubmit = async (data: ChatFormData) => {
    if (isLeadSubmitting) return;
    setLeadError("");
    setIsLeadSubmitting(true);
    try {
      await startLeadSession(data);
    } catch (error) {
      console.error("Failed to create/resume chatbot lead:", error);
      setLeadError(
        error instanceof ChatbotApiError && error.status >= 400 && error.status < 500
          ? error.message
          : "We couldn't start your chat session. Please check your details and try again.",
      );
    } finally {
      setIsLeadSubmitting(false);
    }
  };

  // Resume from the session cookie on mount (covers page refresh AND
  // re-opening the widget within the same browser session).
  useEffect(() => {
    const saved = readChatSession();

    // Refresh vs real-close decision (matches the `pagehide` marker logic):
    //  - sessionStorage survived → it was a refresh → discard the marker,
    //    no end call.
    //  - sessionStorage is gone → it was a real tab/window close → fire the
    //    deferred PATCH /session/end {reason:"tab_close"} now, then clear.
    try {
      const raw = window.localStorage.getItem(PENDING_END_KEY);
      if (raw) {
        const sessionStorageIntact = Boolean(saved?.email && saved?.fullName);
        if (!sessionStorageIntact) {
          const marker = JSON.parse(raw);
          if (marker?.sessionId) {
            sendSessionEndBeacon({
              sessionId: marker.sessionId,
              leadId: marker.leadId || undefined,
            });
          }
        }
        window.localStorage.removeItem(PENDING_END_KEY);
      }
    } catch {
      /* storage disabled — cron is the backstop */
    }

    if (!saved?.email || !saved?.fullName) {
      setBootstrapping(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await startLeadSession(
          {
            fullName: saved.fullName ?? "",
            email: saved.email ?? "",
            phone: saved.phone || "",
          },
          { isResume: true },
        );
      } catch (error) {
        console.error("Failed to resume chat from cookie:", error);
        clearChatSession();
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watchdog: stop loader if no visible reply arrives (no intermediate status bubble).
  useEffect(() => {
    if (!isBotTyping) return;
    const id = setTimeout(() => {
      if (!botHasVisibleContentRef.current) {
        resetBotStreamRefs({ clearStreamDedupe: true });
        setIsBotTyping(false);
      }
    }, BOT_TYPING_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [isBotTyping]);

  // Refresh-vs-close handling (deferred end via localStorage marker).
  //
  //  - NO `beforeunload` handler → no "Reload site?" prompt on refresh.
  //  - `pagehide` fires on BOTH refresh and real tab/window close and the
  //    browser can't tell them apart at that moment. So we don't call the
  //    end API there; we just write a tiny "pending close" marker to
  //    localStorage and leave sessionStorage untouched.
  //  - On the next page mount the mount-resume effect decides:
  //      * sessionStorage still has the chat session → it was a refresh →
  //        delete the marker, no end call, resume normally.
  //      * sessionStorage is gone → the tab really closed → fire the
  //        deferred PATCH /session/end {reason:"tab_close"} for that
  //        sessionId, then delete the marker.
  //    (If the user never returns, the server inactivity cron is the
  //    backstop — same as before.)
  useEffect(() => {
    const onPageHide = (e: PageTransitionEvent) => {
      if (e.persisted) return;                                // bfcache restore
      if (!sessionIdRef.current) return;
      if (inactivityEndedRef.current || conversationEndedRef.current) return;
      try {
        window.localStorage.setItem(
          PENDING_END_KEY,
          JSON.stringify({
            sessionId: sessionIdRef.current,
            leadId: leadIdRef.current || null,
            ts: Date.now(),
          }),
        );
      } catch {
        /* storage disabled — server cron will catch this session */
      }
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  // After INACTIVITY_TIMEOUT_MS of no interaction, end the session: hide the
  // input, close the ElevenLabs connection, and wipe the full chat session
  // from sessionStorage so a refresh or reopen returns the user to the lead
  // form (no auto-resume after a timeout).
  const handleInactivityTimeout = () => {
    if (inactivityEndedRef.current || conversationEnded) return;
    inactivityEndedRef.current = true;
    // Notify the backend immediately (single end API, idempotent) so the
    // reason is recorded now rather than only on the next cron sweep.
    const sid = sessionIdRef.current;
    const lid = leadIdRef.current;
    if (sid) {
      endSession({ sessionId: sid, leadId: lid || undefined, reason: "inactivity" }).catch(
        (error) => console.warn("endSession (inactivity) failed — non-blocking:", error),
      );
    }
    setSessionEndReason("inactivity");
    setConversationEnded(true);
    void closeChatSession();
    clearChatSession();
  };

  useEffect(() => {
    if (!submitted || conversationEnded) return;
    const id = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
        handleInactivityTimeout();
      }
    }, INACTIVITY_CHECK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, conversationEnded]);

  // Side-panel ("Your details") handlers.
  const handleSaveDetails = (name: string) => {
    const trimmed = name.trim();
    const base = formDataRef.current || formData || { fullName: "", email: "", phone: "" };
    const next: ChatFormData = { ...base, fullName: trimmed };
    formDataRef.current = next;
    setFormData(next);
    patchChatSession({ fullName: trimmed });
    markActivity();
  };

  const handleDetailsContinueChat = () => {
    setShowDetailsPanel(false);
    setShowAppointmentForm(false);
    setExplicitQueryType("general");
    setEffectiveQueryType("general");
    setQueryPromptText(GENERAL_PROMPT);
    setQueryFlowStarted(true);
  };

  const handleDetailsBookAppointment = () => {
    setShowDetailsPanel(false);
    // No persistence here — the confirmed option only updates once the
    // appointment is actually submitted.
    resetAppointmentDraft();
    setExplicitQueryType("appointment");
    setEffectiveQueryType("appointment");
    setQueryFlowStarted(false);
    setQueryPromptText(APPOINTMENT_PROMPT);
    setShowAppointmentForm(true);
    markActivity();
  };

  const handleQueryTypeClick = (id: QueryType) => {
    if (explicitQueryType || conversationEnded) return;

    // Selecting an option is TEMPORARY — it must not change the persistent
    // confirmed option (used to pre-highlight the reopened form). That only
    // updates after an actual submit / message send for that option.
    setExplicitQueryType(id);
    setEffectiveQueryType(id);
    setQueryFlowStarted(false);
    setConversationEnded(false);
    setConversationId("");
    resetAppointmentDraft();

    if (id === "general") {
      setQueryPromptText(GENERAL_PROMPT);
      setShowAppointmentForm(false);
      setShowReportForm(false);
      return;
    }

    if (id === "report") {
      setQueryPromptText(REPORT_PROMPT);
      setShowAppointmentForm(false);
      setShowReportForm(true);
      return;
    }

    setQueryPromptText(APPOINTMENT_PROMPT);
    setShowAppointmentForm(true);
    setShowReportForm(false);
  };

  const handleBackToQuerySelection = () => {
    void closeChatSession();
    setConversationEnded(false);
    setConversationId("");
    resetCurrentFlow();
  };

  // Remove a specific archived "How can I help?" block from the transcript.
  const removeArchivedFlow = (id: string) => {
    setArchivedFlows((prev) => prev.filter((f) => f.id !== id));
  };

  // "Add Form": drop a fresh, temporary options picker into the chat (below
  // the existing messages). Any prior finalized flow is archived first so it
  // stays permanently in the transcript.
  const handleAddInlineForm = () => {
    // A form is already open and not yet submitted/used → keep that one,
    // don't create a duplicate. (User must submit/send or Remove it first.)
    if (inlineFormActive) return;
    void closeChatSession();
    archiveCurrentFlow();
    setConversationEnded(false);
    setConversationId("");
    resetCurrentFlow();
    setFollowUpAnchor(messages.length);
    setShowFollowUpFlow(true);
    setInlineFormActive(true);
    markActivity();
  };

  // "Remove Form": discard the temporary picker. Only possible while the
  // form is still active (not yet submitted/finalized).
  const handleRemoveInlineForm = () => {
    if (!inlineFormActive) return;
    void closeChatSession();
    resetCurrentFlow();
    setShowFollowUpFlow(false);
    setFollowUpAnchor(null);
    setInlineFormActive(false);
  };

  const validateAppointmentDraft = (draft: AppointmentDraft): AppointmentErrorsLocal => {
    const errors: AppointmentErrorsLocal = {};
    const facility = draft.facilityLocation.trim();
    const nature = draft.requestNature.trim();

    if (!facility) {
      errors.facilityLocation = "Care facility & location is required.";
    } else if (facility.length < 2) {
      errors.facilityLocation = "Please enter at least 2 characters.";
    } else if (facility.length > 200) {
      errors.facilityLocation = "Please keep this under 200 characters.";
    }

    if (!draft.appointmentHour || !draft.appointmentMinute) {
      errors.appointmentTime = "Please select appointment time.";
    }

    if (!nature) {
      errors.requestNature = "Nature of request / issue is required.";
    } else if (nature.length < 5) {
      errors.requestNature = "Please add a bit more detail (at least 5 characters).";
    } else if (nature.length > 1000) {
      errors.requestNature = "Please keep this under 1000 characters.";
    }

    return errors;
  };

  const handleReportSuccess = ({ userSummary, botMessage }: ReportSuccessMessages) => {
    appendMessage({ role: "user", kind: "text", text: userSummary });
    appendMessage({ role: "bot", text: botMessage });
    queueSessionMessage("user", userSummary, { reportGeneration: true });
    queueSessionMessage("bot", botMessage);

    finalizeFormQueryFlow("report");
    markActivity();
  };

  const handleAppointmentSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isAppointmentSubmitting) return;

    const errors = validateAppointmentDraft(appointmentDraft);
    setAppointmentErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const facilityLocation = appointmentDraft.facilityLocation.trim();
    const time24 = `${appointmentDraft.appointmentHour}:${appointmentDraft.appointmentMinute}`;
    const requestNature = appointmentDraft.requestNature.trim();

    setAppointmentApiError("");
    setIsAppointmentSubmitting(true);

    const submitAppointment = async () =>
      createAppointment({
        leadId: leadIdRef.current,
        sessionId: sessionIdRef.current,
        careFacilityLocation: facilityLocation,
        preferredTime: time24,
        natureOfRequest: requestNature,
      });

    try {
      try {
        await submitAppointment();
      } catch (error) {
        // 404 → wrong/expired lead: re-create the lead once and retry.
        if (error instanceof ChatbotApiError && error.status === 404) {
          const sid = await recreateLeadSession();
          if (!sid && !leadIdRef.current) throw error;
          await submitAppointment();
        } else {
          throw error;
        }
      }

      const userSummary = `${facilityLocation}
${time24}
${requestNature}`;
      const confirmation =
        "Thank you 🙌 for your request. A team member will review your information and get back to you shortly to confirm your appointment.";

      appendMessage({ role: "user", kind: "text", text: userSummary });
      appendMessage({ role: "bot", text: confirmation });
      queueSessionMessage("user", userSummary, {
        appointment: { careFacilityLocation: facilityLocation, preferredTime: time24, natureOfRequest: requestNature },
      });
      queueSessionMessage("bot", confirmation);

      finalizeFormQueryFlow("appointment");
      resetAppointmentDraft();
    } catch (error) {
      console.error("Failed to create appointment:", error);
      setAppointmentApiError(
        error instanceof ChatbotApiError && error.status >= 400 && error.status < 500
          ? error.message
          : "We couldn't submit your appointment. Please try again.",
      );
    } finally {
      setIsAppointmentSubmitting(false);
    }
  };

  // Delivers an already-displayed user message to the assistant. Used by both
  // the initial send and the inline "Retry" affordance so a network blip
  // doesn't lose the user's message or duplicate the chat bubble.
  const sendToAssistant = async (text: string) => {
    try {
      setFailedSend(null);
      resetBotStreamRefs({ clearStreamDedupe: true });
      // Show the typing indicator immediately — before the (possibly slow)
      // first-time session connect — so there's instant feedback.
      setIsBotTyping(true);
      await ensureChatSession();
      skipNextAgentMessageRef.current = false;
      console.log("Sending user message to ElevenLabs:", text);
      conversation.sendUserMessage(text);
    } catch (error) {
      console.error("Failed to send chatbot message:", error);
      setIsBotTyping(false);
      setFailedSend({ text });
    }
  };

  const handleSend = async (text: string) => {
    if (showAppointmentForm || showReportForm || conversationEnded) return;
    if (isBotTyping) return;

    // Hard guard against empty/whitespace-only sends — never reach the API,
    // never append an empty bubble. (ChatMessageInput trims too; belt &
    // braces in case it's invoked from anywhere else.)
    const trimmed = (text ?? "").trim();
    if (!trimmed) return;

    // Typing a question without picking an option defaults to General Query:
    // select it and lock the picker (disabled) just like an explicit pick.
    if (!explicitQueryType) {
      setExplicitQueryType("general");
      setQueryPromptText(GENERAL_PROMPT);
      setShowAppointmentForm(false);
    }
    setEffectiveQueryType((prev) => prev ?? "general");
    setQueryFlowStarted(true);

    // Sending a message CONFIRMS the active option → update the persistent
    // selection (general/report) and persist it so a refresh resumes here.
    const confirmedType = explicitQueryType ?? "general";
    setLastSelectedType(confirmedType);
    patchChatSession({ selectedQueryType: confirmedType });

    appendMessage({ role: "user", text: trimmed, kind: "text" });
    queueSessionMessage("user", trimmed);
    setMessage("");
    // Submitting a question finalizes the form → it becomes permanent and the
    // remove option no longer applies.
    setInlineFormActive(false);

    await sendToAssistant(trimmed);
  };

  const handleRetrySend = async () => {
    if (!failedSend?.text) return;
    await sendToAssistant(failedSend.text);
  };

  const formatSessionIdElided = (id: string | null | undefined): string => {
    if (!id || typeof id !== "string") return "";
    return id.length > 10 ? `${id.slice(0, 8)}…` : id;
  };

  /** endReason from API, or null for generic “Previous session ended” (e.g. history session boundary). */
  const buildPreviousSessionDividerLeftText = (
    sessionId: string | null | undefined,
    endedAtIso: string | null | undefined,
    endReason: string | null | undefined,
  ): string => {
    const reasonWord: string | null =
      endReason != null
        ? ({
            manual: "ended",
            inactivity: "timed out",
            tab_close: "closed",
            expired: "expired",
            superseded: "ended",
          } as Record<string, string>)[endReason] ?? "ended"
        : null;
    const headline = reasonWord ? `Previous session ${reasonWord}` : "Previous session ended";
    const idShort = formatSessionIdElided(sessionId);
    const time = endedAtIso ? formatMsgTime(endedAtIso) : "";
    const parts = [headline];
    if (idShort) parts.push(`ID ${idShort}`);
    if (time) parts.push(time);
    return parts.join(" · ");
  };

  // Hairline rule with a centered, boxed two-tone label (muted past + cyan
  // accent for the "new session" part).
  const renderSessionDivider = (leftText: string, rightText: string, { wrap = false, title }: RenderSessionDividerOptions = {}) => (
    <div className="nca-chatbot__divider-row">
      <span className="nca-chatbot__divider-rule" aria-hidden />
      <span
        className={`nca-chatbot__divider-pill${wrap ? " nca-chatbot__divider-pill--wrap" : ""}`}
        title={title}
      >
        <span className="nca-chatbot__divider-muted">{leftText}</span>
        <span className="nca-chatbot__divider-dot"> · </span>
        <span className="nca-chatbot__divider-accent">{rightText}</span>
      </span>
      <span className="nca-chatbot__divider-rule" aria-hidden />
    </div>
  );

  // Authoritative "previous session ended" divider, reason from the backend.
  const renderPreviousSessionDivider = () => {
    const sid = previousSessionSnapshot?.id ?? null;
    const endedAt = previousSessionSnapshot?.endedAt ?? null;
    const left = buildPreviousSessionDividerLeftText(sid, endedAt, previousSessionEndedReason);
    return renderSessionDivider(left, "This is a new session", { wrap: true, title: sid ?? undefined });
  };

  // Inline "updated details" bubble shown after a session divider when that
  // session changed one or more profile fields. Same layout as the top
  // current-details bubble; updated fields get an "Updated" tag inline.
  const updatedTagStyle: CSSProperties = {
    marginLeft: "0.375rem",
    padding: "1px 6px",
    borderRadius: "9999px",
    backgroundColor: "var(--nca-primary)",
    color: "var(--nca-white)",
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    verticalAlign: "middle",
  };
  const renderUpdatedDetailsBubble = (entry: SessionSnapshotEntry | undefined, keyHint: string) => {
    if (!entry || !entry.snapshot) return null;
    const { snapshot, changedFields } = entry;
    return (
      <div key={`upd-${keyHint}`} className="nca-chatbot__profile-bubble--current">
        <p className="nca-chatbot__profile-line-accent">
          {snapshot.name}
          {changedFields.has("name") ? <span style={updatedTagStyle}>Updated</span> : null}
        </p>
        <p className="nca-chatbot__profile-line-accent-regular">
          {snapshot.email}
          {changedFields.has("email") ? <span style={updatedTagStyle}>Updated</span> : null}
        </p>
        <p className="nca-chatbot__profile-line-accent-regular">
          {snapshot.contact}
          {changedFields.has("contact") ? <span style={updatedTagStyle}>Updated</span> : null}
        </p>
      </div>
    );
  };

  const renderBotBubble = (text: string) => (
    <div className="nca-chatbot__msg-row-bot">
      <div className="nca-chatbot__bot-avatar nca-chatbot__bot-avatar--md">
        <NurseCallAssistantIcon size={18} color="#FFFFFF" />
      </div>
      <div>
        <div className="nca-chatbot__bubble-bot">
          <p className="nca-chatbot__bubble-bot-text">{text}</p>
          <p className="nca-chatbot__bubble-bot-text text-right !text-xs">{formatMsgTime()}</p>
        </div>
      </div>
    </div>
  );

  const renderMessageItem = (m: Message) => {
    // Defensive: never render an empty/whitespace-only bubble (e.g. a stale
    // bot draft that got cleaned up out-of-band).
    if (!m || typeof m.text !== "string" || !m.text.trim()) return null;
    return m.role === "user" ? (
      <div key={m.id} className="nca-chatbot__bubble-user">
        <p className="nca-chatbot__bubble-user-text">{m.text}</p>
        <p className="nca-chatbot__bubble-user-text text-right !text-xs">{formatMsgTime(m.createdAt)}</p>
      </div>
    ) : (
      <div key={m.id} className="nca-chatbot__msg-row-bot">
        <div className="nca-chatbot__bot-avatar nca-chatbot__bot-avatar--md">
          <NurseCallAssistantIcon size={18} color="#FFFFFF" />
        </div>
        <div className="nca-chatbot__bubble-bot">
          <p className="nca-chatbot__bubble-bot-text-plain">{m.text}</p>
          <p className="nca-chatbot__bubble-bot-text-plain text-right !text-xs">{formatMsgTime(m.createdAt)}</p>
        </div>
      </div>
    );
  };

  const renderOptionButtons = (selectedId: QueryType | null, disabled: boolean, keyPrefix = "live") => (
    <div className="nca-chatbot__options-stack">
      {QUERY_TYPES.map(({ id, label, img }) => (
        <button
          key={`${keyPrefix}-${id}`}
          type="button"
          onClick={() => handleQueryTypeClick(id)}
          aria-pressed={selectedId === id}
          disabled={disabled}
          className={`nca-chatbot__option-btn ${selectedId === id ? "nca-chatbot__option-btn--selected" : "nca-chatbot__option-btn--idle"
            }`}
        >
          <img src={img} alt="" width={16} height={16} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );

  const renderAppointmentForm = () => (
    <div className="nca-chatbot__appointment-shell">
      <form onSubmit={handleAppointmentSubmit} className="nca-chatbot__form-vertical">
        <div>
          <input
            type="text"
            value={appointmentDraft.facilityLocation}
            onChange={(e) => {
              setAppointmentDraft((prev) => ({ ...prev, facilityLocation: e.target.value }));
              if (appointmentErrors.facilityLocation) {
                setAppointmentErrors((prev) => ({ ...prev, facilityLocation: undefined }));
              }
            }}
            placeholder="Care Facility & Location"
            aria-invalid={!!appointmentErrors.facilityLocation}
            className={`nca-chatbot__appt-field ${appointmentErrors.facilityLocation ? "nca-chatbot__appt-field--error" : "nca-chatbot__appt-field--ok"
              }`}
          />
          {appointmentErrors.facilityLocation && (
            <p className="nca-chatbot__field-error" role="alert">
              {appointmentErrors.facilityLocation}
            </p>
          )}
        </div>

        <div>
          <div className="nca-chatbot__time-row">
            <ChatDropdown
              value={appointmentDraft.appointmentHour}
              onChange={(value) => {
                setAppointmentDraft((prev) => ({ ...prev, appointmentHour: value }));
                if (appointmentErrors.appointmentTime) {
                  setAppointmentErrors((prev) => ({ ...prev, appointmentTime: undefined }));
                }
              }}
              options={HOURS_24.map((h) => ({ value: h, label: h }))}
              placeholder="Hour"
              hasError={!!appointmentErrors.appointmentTime}
            />
            <span className="nca-chatbot__time-sep" aria-hidden="true">
              :
            </span>
            <ChatDropdown
              value={appointmentDraft.appointmentMinute}
              onChange={(value) => {
                setAppointmentDraft((prev) => ({ ...prev, appointmentMinute: value }));
                if (appointmentErrors.appointmentTime) {
                  setAppointmentErrors((prev) => ({ ...prev, appointmentTime: undefined }));
                }
              }}
              options={MINUTES.map((m) => ({ value: m, label: m }))}
              placeholder="Min"
              hasError={!!appointmentErrors.appointmentTime}
            />
          </div>
          {appointmentErrors.appointmentTime && (
            <p className="nca-chatbot__field-error" role="alert">
              {appointmentErrors.appointmentTime}
            </p>
          )}
        </div>

        <div>
          <input
            type="text"
            value={appointmentDraft.requestNature}
            onChange={(e) => {
              setAppointmentDraft((prev) => ({ ...prev, requestNature: e.target.value }));
              if (appointmentErrors.requestNature) {
                setAppointmentErrors((prev) => ({ ...prev, requestNature: undefined }));
              }
            }}
            placeholder="Nature of Request"
            aria-invalid={!!appointmentErrors.requestNature}
            className={`nca-chatbot__appt-field ${appointmentErrors.requestNature ? "nca-chatbot__appt-field--error" : "nca-chatbot__appt-field--ok"
              }`}
          />
          {appointmentErrors.requestNature && (
            <p className="nca-chatbot__field-error" role="alert">
              {appointmentErrors.requestNature}
            </p>
          )}
        </div>

        {appointmentApiError ? (
          <p className="nca-chatbot__field-error" role="alert">
            {appointmentApiError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isAppointmentSubmitting}
          aria-busy={isAppointmentSubmitting}
          className="nca-chatbot__btn-primary-block"
        >
          {isAppointmentSubmitting ? (
            <>
              <svg className="nca-chatbot__spinner-sm nca-chatbot__spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="nca-chatbot__opacity-25" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Submitting
            </>
          ) : (
            "Submit"
          )}
        </button>
      </form>
    </div>
  );

  const renderCurrentQueryFlow = () => (
    <>
      {renderBotBubble("How can I help? Please choose one of the following options:")}
      {renderOptionButtons(explicitQueryType ?? lastSelectedType, isQuerySelectionLocked, showFollowUpFlow ? "followup" : "live")}
      {!isQuerySelectionLocked ? (
        <p className="nca-chatbot__hint-muted">Or, type your question or query below...</p>
      ) : null}
      {canGoBackCurrent && explicitQueryType !== "appointment" && explicitQueryType !== "report" ? (
        <div className="nca-chatbot__link-row">
          <button type="button" onClick={handleBackToQuerySelection} className="nca-chatbot__text-link">
            Back
          </button>
        </div>
      ) : null}
      {queryPromptText && explicitQueryType === "appointment" ? renderBotBubble(queryPromptText) : null}
      {showAppointmentForm ? renderAppointmentForm() : null}
      {showReportForm ? <ReportGenerationForm onSuccess={handleReportSuccess} /> : null}
      {canGoBackCurrent && (explicitQueryType === "appointment" || explicitQueryType === "report") ? (
        <div className="nca-chatbot__link-row">
          <button type="button" onClick={handleBackToQuerySelection} className="nca-chatbot__text-link">
            Back
          </button>
        </div>
      ) : null}
    </>
  );

  // Hidden when closed, but the component stays mounted (state, ElevenLabs
  // session, timers preserved) so an outside-click/X close does NOT start a
  // new session — reopening continues exactly where the user left off.
  if (!open) return null;

  const overlay = (
    <div className="nca-chatbot" role="dialog" aria-modal="true" aria-labelledby="nca-chatbot-title">
      {/* Outside click closes the panel (hides it) but does NOT end the
          session — only a chat/page refresh starts a new session. */}
      <button
        type="button"
        className="nca-chatbot__backdrop"
        onClick={onClose}
        aria-label="Close chat overlay"
      />
      <div
        className="nca-chatbot__panel-slot"
        style={{
          height: `min(${panelHeightPx}px, calc(100vh - 7rem))`,
          minHeight: `min(${panelHeightPx}px, calc(100vh - 7rem))`,
          maxHeight: `min(${panelHeightPx}px, calc(100vh - 7rem))`,
        }}
      >
        <div className="nca-chatbot__surface">
          <ChatPanelHeader
            onClose={onClose}
            RobotIcon={NurseCallAssistantIcon}
            showEndSession={conversationStarted}
            endSessionDisabled={sessionControlsDisabled}
            onEndSession={handleEndSession}
          />

          <div ref={scrollRef} className="nca-chatbot__scroll-area">
            {bootstrapping ? (
              <div className="nca-chatbot__center-loading" aria-live="polite">
                <svg className="nca-chatbot__spinner-lg nca-chatbot__spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="nca-chatbot__opacity-25" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            ) : !submitted ? (
              <div className="nca-chatbot__pad-chat-intro">
                <div className={columnClass}>
                  <div className="nca-chatbot__stack-gap-2">
                    <ChatWelcomeMessage RobotIcon={NurseCallAssistantIcon} fill={false} />
                    <div className="nca-chatbot__form-shell">
                      <ChatInfoForm onSubmit={handleFormSubmit} submitting={isLeadSubmitting} />
                      {leadError ? (
                        <p className="nca-chatbot__field-error nca-chatbot__field-error-spacing" role="alert">
                          {leadError}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="nca-chatbot__pad-chat">
                <div className={columnClass}>
                  <div className="nca-chatbot__stack-gap-3">
                    <ChatWelcomeMessage
                      RobotIcon={NurseCallAssistantIcon}
                      fill={false}
                      timeLabel={
                        initialProfileChangedAt
                          ? formatMsgTime(initialProfileChangedAt)
                          : undefined
                      }
                    />

                    {formData ? (
                      <div className="nca-chatbot__profile-bubble--current">
                        <p className="nca-chatbot__profile-line-accent">{formData.fullName}</p>
                        <p className="nca-chatbot__profile-line-accent-regular">{formData.email}</p>
                        <p className="nca-chatbot__profile-line-accent-regular">{formData.phone}</p>
                        {initialProfileChangedAt ? (
                          <p className="nca-chatbot__bubble-user-text text-right !text-xs">
                            {formatMsgTime(initialProfileChangedAt)}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {resumedHistory.length > 0 ? (
                      <div className="nca-chatbot__stack-gap-3">
                        {resumedHistory.map((m, idx) => {
                          const prev = idx > 0 ? resumedHistory[idx - 1] : null;
                          const isBoundary =
                            prev && m.sessionId && prev.sessionId && m.sessionId !== prev.sessionId;
                          return (
                            <Fragment key={m.id}>
                              {isBoundary
                                ? renderSessionDivider(
                                    buildPreviousSessionDividerLeftText(
                                      prev.sessionId,
                                      m.createdAt,
                                      null,
                                    ),
                                    "New session",
                                    {
                                      wrap: true,
                                      title: typeof prev.sessionId === "string" ? prev.sessionId : undefined,
                                    },
                                  )
                                : null}
                              {(isBoundary || idx === 0) &&
                              m.sessionId &&
                              sessionSnapshots.get(m.sessionId)?.hasUpdate
                                ? renderUpdatedDetailsBubble(
                                    sessionSnapshots.get(m.sessionId),
                                    m.sessionId,
                                  )
                                : null}
                              {renderMessageItem(m)}
                              {previousSessionEnded &&
                                previousSessionEndedReason !== "superseded" &&
                                endedAfterMessageId &&
                                m.id === endedAfterMessageId
                                ? renderPreviousSessionDivider()
                                : null}
                            </Fragment>
                          );
                        })}
                      </div>
                    ) : null}

                    {previousSessionEnded &&
                      previousSessionEndedReason !== "superseded" &&
                      !(endedAfterMessageId && resumedHistory.some((m) => m.id === endedAfterMessageId))
                      ? renderPreviousSessionDivider()
                      : null}

                    {shouldShowPostFormIntro && !showFollowUpFlow && !resumedWithQuery ? renderCurrentQueryFlow() : null}

                    {archivedFlows.map((flow) => (
                      <div key={flow.id} className="nca-chatbot__archived">
                        <button
                          type="button"
                          onClick={() => removeArchivedFlow(flow.id)}
                          aria-label="Remove this options block"
                          className="nca-chatbot__archived-remove"
                        >
                          <svg className="nca-chatbot__archived-remove-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                          </svg>
                        </button>
                        {renderBotBubble("How can I help? Please choose one of the following options:")}
                        {renderOptionButtons(flow.queryType, true, flow.id)}
                        {flow.promptText ? renderBotBubble(flow.promptText) : null}
                      </div>
                    ))}

                    {(() => {
                      const inFollowUp = showFollowUpFlow && followUpAnchor != null;
                      const splitAt = inFollowUp
                        ? Math.min(followUpAnchor, messages.length)
                        : messages.length;
                      const before = messages.slice(0, splitAt);
                      const after = messages.slice(splitAt);
                      return (
                        <>
                          {before.map(renderMessageItem)}
                          {showFollowUpFlow ? renderCurrentQueryFlow() : null}
                          {after.map(renderMessageItem)}
                          {isBotTyping ? <ChatTypingIndicator RobotIcon={NurseCallAssistantIcon} /> : null}
                          {failedSend ? (
                            <div className="nca-chatbot__retry-stack">
                              <p className="nca-chatbot__field-error" role="alert">
                                Message not sent.
                              </p>
                              <button type="button" onClick={handleRetrySend} className="nca-chatbot__retry-btn">
                                Retry
                              </button>
                            </div>
                          ) : null}
                        </>
                      );
                    })()}

                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="nca-chatbot__footer">
            {conversationEnded ? (
              <p className="nca-chatbot__ended-msg">
                {sessionEndReason === "no"
                  ? `Conversation ended. Reference ID: ${endReferenceId}`
                  : sessionEndReason === "manual"
                    ? "Session ended. Refresh or reopen the chat to start a new conversation."
                    : "Session ended due to inactivity. Refresh or reopen the chat to start a new conversation."}
              </p>
            ) : (
              <ChatMessageInput
                value={message}
                onChange={setMessage}
                disabled={composerInputDisabled}
                sendBlocked={isBotTyping}
                onSend={handleSend}
                placeholderDisabled={
                  isSessionStarting
                    ? "Connecting to assistant..."
                    : showAppointmentForm
                      ? "Complete the appointment form to continue..."
                      : showReportForm
                        ? "Complete the report form to continue..."
                        : undefined
                }
              />
            )}
          </div>

          {conversationStarted && !showDetailsPanel ? (
            <button
              type="button"
              onClick={inlineFormActive ? handleRemoveInlineForm : handleAddInlineForm}
              disabled={sessionControlsDisabled}
              aria-label={inlineFormActive ? "Remove the options form" : "Add the options form"}
              className={`nca-chatbot__side-tab ${inlineFormActive ? "nca-chatbot__side-tab--danger" : "nca-chatbot__side-tab--primary"}`}
            >
              <span className="nca-chatbot__side-tab-label">{inlineFormActive ? "Remove Form" : "Add Form"}</span>
            </button>
          ) : null}

          {showDetailsPanel ? (
            <ChatDetailsPanel
              data={formData}
              onSave={handleSaveDetails}
              onContinueChat={handleDetailsContinueChat}
              onBookAppointment={handleDetailsBookAppointment}
              onClose={() => setShowDetailsPanel(false)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}