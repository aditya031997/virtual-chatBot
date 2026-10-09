import { REPORTS_API_BASE_URL, REPORTS_SITE_ID } from "@/utils/reports/constants";
import { parseContentDispositionFilename } from "@/utils/reports/parseContentDisposition";
import type {
  GenerateReportResult,
  ReportAlarmTypeRaw,
  ReportClientRaw,
  ReportLocationRaw,
  ReportShiftRaw,
  ReportTypeFieldsResponse,
} from "@/types/api";
import type { ReportPayload } from "@/types/reports";

export class ReportsApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ReportsApiError";
    this.status = status;
    this.payload = payload;
  }
}

const reportsFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const { headers: initHeaders, ...rest } = init;
  const response = await fetch(`${REPORTS_API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(initHeaders ?? {}),
    },
  });
  return response;
};

const getJson = async <T = unknown>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await reportsFetch(path, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ReportsApiError(
      (payload as { message?: string } | null)?.message || `Request failed (${response.status}).`,
      response.status,
      payload,
    );
  }
  const envelope = payload as { data?: T } | null;
  return (envelope?.data ?? payload) as T;
};

export const fetchReportLocations = (): Promise<ReportLocationRaw[]> =>
  getJson<ReportLocationRaw[]>(`/locations?siteId=${encodeURIComponent(REPORTS_SITE_ID)}`);

export const fetchReportClients = (): Promise<ReportClientRaw[]> =>
  getJson<ReportClientRaw[]>(`/clients?siteId=${encodeURIComponent(REPORTS_SITE_ID)}`);

export const fetchReportAlarmTypes = (): Promise<ReportAlarmTypeRaw[]> =>
  getJson<ReportAlarmTypeRaw[]>(`/alarm-types?siteId=${encodeURIComponent(REPORTS_SITE_ID)}`);

export const fetchReportShifts = (): Promise<ReportShiftRaw[]> =>
  getJson<ReportShiftRaw[]>(`/shifts?siteId=${encodeURIComponent(REPORTS_SITE_ID)}`);

export const fetchReportTypeFields = (type: string, init: RequestInit = {}): Promise<ReportTypeFieldsResponse> =>
  getJson<ReportTypeFieldsResponse>(`/type-fields?type=${encodeURIComponent(type)}`, init);

export const generateReport = async (body: ReportPayload): Promise<GenerateReportResult> => {
  const response = await reportsFetch("/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ReportsApiError(
      (payload as { message?: string } | null)?.message || `Report generation failed (${response.status}).`,
      response.status,
      payload,
    );
  }

  const blob = await response.blob();
  const filename = parseContentDispositionFilename(response.headers.get("Content-Disposition"));
  return { blob, filename };
};

export const fetchAllReportLookups = (): Promise<[
  ReportLocationRaw[],
  ReportClientRaw[],
  ReportAlarmTypeRaw[],
  ReportShiftRaw[],
]> =>
  Promise.all([
    fetchReportLocations(),
    fetchReportClients(),
    fetchReportAlarmTypes(),
    fetchReportShifts(),
  ]);
