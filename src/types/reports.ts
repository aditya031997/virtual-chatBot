/**
 * Report form state, lookup options, and outgoing payload shapes.
 * Mirrors src/utils/reports/constants.js (EMPTY_REPORT_FORM) and
 * src/utils/reports/buildReportPayload.js.
 */

export interface ReportFormState {
  name: string;
  type: string;
  fileFormat: string;
  startDate: string;
  endDate: string;
  timezone: string;
  locationIds: string[];
  clientIds: string[];
  alarmTypeIds: string[];
  shiftIds: string[];
  targetASeconds: string;
  targetBSeconds: string;
  thresholdSeconds: string;
  showAlarmsBetweenDates: boolean;
  fromTime: string;
  toTime: string;
}

export type ReportFormField = keyof ReportFormState;

export type ReportFormErrors = Partial<Record<ReportFormField, string>>;

export interface ReportFormValidationResult {
  errors: ReportFormErrors;
  isValid: boolean;
}

export interface ReportSelectOption {
  value: string;
  label: string;
}

export interface ReportPayload {
  siteId: string;
  name: string;
  type: number;
  fileFormat: number;
  startDate: string;
  endDate: string;
  timezone?: string;
  locationIds?: string[];
  clientIds?: string[];
  alarmTypeIds?: string[];
  shiftIds?: string[];
  showAlarmsBetweenDates?: boolean;
  fromTime?: string;
  toTime?: string;
  targetASeconds?: number;
  targetBSeconds?: number;
  thresholdSeconds?: number;
}

export interface ReportLookupsResult {
  loading: boolean;
  locationOptions: ReportSelectOption[];
  clientOptions: ReportSelectOption[];
  alarmTypeOptions: ReportSelectOption[];
  shiftOptions: ReportSelectOption[];
}

export interface ReportSubmitSuccess {
  ok: true;
  filename: string;
  payload: ReportPayload;
}

export interface ReportSubmitFailure {
  ok: false;
  errors?: ReportFormErrors;
}

export type ReportSubmitResult = ReportSubmitSuccess | ReportSubmitFailure;
