"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

interface AutoResizeOptions {
  minRows?: number;
  maxRows?: number;
}

interface AutoResizeResult {
  ref: RefObject<HTMLTextAreaElement | null>;
  resize: () => void;
}

/**
 * Grows a textarea with content up to maxRows, then scrolls internally.
 */
export function useAutoResizeTextarea(
  value: string,
  { minRows = 1, maxRows = 5 }: AutoResizeOptions = {},
): AutoResizeResult {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const styles = getComputedStyle(el);
    const lineHeight = parseFloat(styles.lineHeight) || 20;
    const paddingTop = parseFloat(styles.paddingTop) || 0;
    const paddingBottom = parseFloat(styles.paddingBottom) || 0;
    const minHeight = lineHeight * minRows + paddingTop + paddingBottom;
    const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom;

    el.style.height = "auto";
    const nextHeight = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [minRows, maxRows]);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return { ref, resize };
}
