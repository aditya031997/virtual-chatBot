/**
 * Report timezone configuration (no npm package).
 * Uses the browser's Intl.supportedValuesOf("timeZone") plus curated
 * Australia-first zones and API aliases (e.g. Asia/Kolkata vs Asia/Calcutta).
 */

export const PRIMARY_REPORT_TIMEZONE = "Australia/Melbourne";

/** Australia-first; Asia/Kolkata kept for API/testing (see normalizeTimezoneForApi). */
export const FEATURED_REPORT_TIMEZONES: string[] = [
  "Australia/Melbourne",
  "Australia/Sydney",
  "Australia/Brisbane",
  "Australia/Perth",
  "Australia/Adelaide",
  "Australia/Hobart",
  "Australia/Darwin",
  "Australia/ACT",
  "Australia/Lord_Howe",
  "Australia/Broken_Hill",
  "Asia/Kolkata",
  "UTC",
];

/** Maps common search terms to IANA ids shown in the picker. */
export const TIMEZONE_SEARCH_ALIASES: Record<string, string> = {
  kolkata: "Asia/Kolkata",
  calcutta: "Asia/Kolkata",
  melbourne: "Australia/Melbourne",
  sydney: "Australia/Sydney",
  brisbane: "Australia/Brisbane",
  perth: "Australia/Perth",
  adelaide: "Australia/Adelaide",
  hobart: "Australia/Hobart",
  darwin: "Australia/Darwin",
  india: "Asia/Kolkata",
  aet: "Australia/Sydney",
};

/** Legacy/browser ids → API-preferred names (per SmartCaller docs). */
export const TIMEZONE_API_NORMALIZE: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
};

export function normalizeTimezoneForApi(tz: string | null | undefined): string | undefined {
  if (!tz?.trim()) return undefined;
  const trimmed = tz.trim();
  return TIMEZONE_API_NORMALIZE[trimmed] ?? trimmed;
}

function loadIntlZones(): string[] {
  try {
    if (typeof Intl !== "undefined" && typeof (Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf === "function") {
      return (Intl as typeof Intl & { supportedValuesOf: (key: string) => string[] }).supportedValuesOf("timeZone");
    }
  } catch {
    /* unsupported */
  }
  return [...FEATURED_REPORT_TIMEZONES];
}

let cachedZones: string[] | null = null;

export function getReportTimezones(): string[] {
  if (cachedZones) return cachedZones;
  const set = new Set(loadIntlZones());
  if (set.has("Asia/Calcutta")) set.delete("Asia/Calcutta");
  FEATURED_REPORT_TIMEZONES.forEach((z) => set.add(z));
  cachedZones = Array.from(set).sort((a, b) => a.localeCompare(b));
  return cachedZones;
}

export function defaultReportTimezoneList(allZones: string[]): string[] {
  const available = new Set(allZones);
  const featured = FEATURED_REPORT_TIMEZONES.filter((z) => available.has(z));
  const featuredSet = new Set(featured);
  const rest = allZones.filter((z) => !featuredSet.has(z)).slice(0, 50);
  return [...featured, ...rest];
}

function scoreMatch(zoneId: string, q: string, cityPart: string): number {
  const lower = zoneId.toLowerCase();
  if (lower === q) return 0;
  if (lower.endsWith(`/${cityPart}`)) return 1;
  if (lower.startsWith(q)) return 2;
  if (lower.includes(q)) return 3;
  return 4;
}

export function searchReportTimezones(allZones: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return defaultReportTimezoneList(allZones);

  const cityPart = q.includes("/") ? (q.split("/").pop() ?? q) : q;
  const matchSet = new Set<string>();

  const aliasHit = TIMEZONE_SEARCH_ALIASES[q] ?? TIMEZONE_SEARCH_ALIASES[cityPart];
  if (aliasHit && allZones.includes(aliasHit)) matchSet.add(aliasHit);

  for (const z of allZones) {
    const lower = z.toLowerCase();
    if (lower.includes(q) || lower.includes(cityPart)) matchSet.add(z);
  }

  return [...matchSet].sort((a, b) => {
    const diff = scoreMatch(a, q, cityPart) - scoreMatch(b, q, cityPart);
    if (diff !== 0) return diff;
    const aFeatured = FEATURED_REPORT_TIMEZONES.includes(a);
    const bFeatured = FEATURED_REPORT_TIMEZONES.includes(b);
    if (aFeatured && !bFeatured) return -1;
    if (!aFeatured && bFeatured) return 1;
    return a.localeCompare(b);
  });
}
