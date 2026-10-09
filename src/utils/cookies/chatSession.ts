/**
 * Chat session persistence via the tab's **sessionStorage**.
 *
 * sessionStorage is scoped to a single tab: it survives page refreshes
 * within that tab (so the resume-on-refresh flow still works), is cleared
 * automatically when the tab is closed, and is NOT shared with other tabs —
 * so opening the site in a new tab always starts a fresh chat with no
 * previous conversation.
 *
 * (Module path kept as-is to avoid touching imports; the API is unchanged.)
 */

import type { ChatSessionStorage } from "@/types/chat";

const STORAGE_KEY = "nca_chat";

function getStore(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    // sessionStorage can throw (e.g. privacy mode / disabled storage).
    return null;
  }
}

export function readChatSession(): ChatSessionStorage | null {
  const store = getStore();
  if (!store) return null;
  const raw = store.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ChatSessionStorage;
  } catch {
    return null;
  }
}

export function writeChatSession(data: ChatSessionStorage): void {
  const store = getStore();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota / disabled storage */
  }
}

/** Shallow-merge a partial update into the existing payload. */
export function patchChatSession(partial: Partial<ChatSessionStorage>): void {
  const current = readChatSession() || {};
  writeChatSession({ ...current, ...partial });
}

/** Drop only the sessionId (keep lead identity so history can still resume). */
export function clearChatSessionId(): void {
  const current = readChatSession();
  if (!current) return;
  const { sessionId: _sessionId, ...rest } = current;
  void _sessionId;
  writeChatSession(rest);
}

export function clearChatSession(): void {
  const store = getStore();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
