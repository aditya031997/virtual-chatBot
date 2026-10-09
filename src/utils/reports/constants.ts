import type { ReportFormState, ReportSelectOption } from "@/types/reports";

/**
 * Browser requests always hit the same-origin proxy (avoids ngrok CORS).
 * The proxy forwards to REPORTS_UPSTREAM_URL with ngrok headers server-side.
 */
export const REPORTS_API_BASE_URL = "/api/reports-proxy";

/** Server-only upstream (ngrok). Set REPORTS_UPSTREAM_URL in .env */
export const REPORTS_UPSTREAM_URL = process.env.REPORTS_UPSTREAM_URL!;

export const REPORTS_SITE_ID = process.env.NEXT_PUBLIC_REPORTS_SITE_ID!;

/** Default for Australia (Melbourne) audience; override via env if needed. */
export const DEFAULT_REPORT_TIMEZONE = process.env.NEXT_PUBLIC_REPORTS_DEFAULT_TIMEZONE!;

export const REPORT_TYPES: ReportSelectOption[] = [
  { value: "1", label: "Summary Report" },
  { value: "2", label: "Detailed Alarm History" },
  { value: "3", label: "Response Time by Shift" },
  { value: "4", label: "Excessive Response" },
  { value: "5", label: "Care Minutes" },
  { value: "6", label: "Alarms by Type" },
  { value: "7", label: "Alarms by ID" },
  { value: "8", label: "List of Alarms" },
  { value: "9", label: "Low Battery" },
];

export const FILE_FORMATS: ReportSelectOption[] = [
  { value: "1", label: "CSV" },
  { value: "3", label: "Excel (.xlsx)" },
  { value: "4", label: "PDF" },
];

export const EMPTY_REPORT_FORM: ReportFormState = {
  name: "",
  type: "",
  fileFormat: "",
  startDate: "",
  endDate: "",
  timezone: DEFAULT_REPORT_TIMEZONE,
  locationIds: [],
  clientIds: [],
  alarmTypeIds: [],
  shiftIds: [],
  targetASeconds: "",
  targetBSeconds: "",
  thresholdSeconds: "",
  showAlarmsBetweenDates: false,
  fromTime: "",
  toTime: "",
};
