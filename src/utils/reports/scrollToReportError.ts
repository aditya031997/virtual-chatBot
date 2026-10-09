import { getFirstReportFormErrorField } from "@/utils/validation/reportFormValidation";
import type { ReportFormErrors } from "@/types/reports";

const SCROLL_PARENT_SELECTOR = ".nca-chatbot__scroll-area";
const HIGHLIGHT_CLASS = "nca-chatbot__report-field--highlight";

export function scrollToFirstReportError(
  errors: ReportFormErrors,
  root: Document | HTMLElement = document,
): boolean {
  const field = getFirstReportFormErrorField(errors);
  if (!field) return false;

  const el = root.querySelector(`[data-report-field="${field}"]`);
  if (!el) return false;

  const scrollParent = el.closest(SCROLL_PARENT_SELECTOR);
  if (scrollParent) {
    const parentRect = scrollParent.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const top = elRect.top - parentRect.top + scrollParent.scrollTop - 16;
    scrollParent.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  } else {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  el.classList.remove(HIGHLIGHT_CLASS);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(HIGHLIGHT_CLASS);
  const removeHighlight = () => el.classList.remove(HIGHLIGHT_CLASS);
  el.addEventListener("animationend", removeHighlight, { once: true });
  setTimeout(removeHighlight, 2000);

  const focusable = el.querySelector<HTMLElement>(
    "input:not([type=hidden]), select, textarea, button.nca-chatbot__dropdown-trigger",
  );
  if (focusable && typeof focusable.focus === "function") {
    setTimeout(() => focusable.focus({ preventScroll: true }), 400);
  }

  return true;
}
