import type {
  ReportFormErrors,
  ReportFormField,
  ReportFormState,
  ReportFormValidationResult,
} from "@/types/reports";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Visual / scroll order when multiple fields fail validation. */
export const REPORT_FORM_FIELD_ORDER: ReportFormField[] = [
  "name",
  "type",
  "fileFormat",
  "startDate",
  "endDate",
  "targetASeconds",
  "targetBSeconds",
  "thresholdSeconds",
  "fromTime",
  "toTime",
];

export function getFirstReportFormErrorField(errors: ReportFormErrors): ReportFormField | undefined {
  return REPORT_FORM_FIELD_ORDER.find((key) => errors[key]);
}

export function validateReportForm(form: ReportFormState): ReportFormValidationResult {
  const errors: ReportFormErrors = {};
  const name = (form.name ?? "").trim();

  if (!name) errors.name = "Report name is required.";
  else if (name.length > 100) errors.name = "Report name must be 100 characters or fewer.";

  if (!form.type) errors.type = "Report type is required.";
  if (!form.fileFormat) errors.fileFormat = "File format is required.";
  if (!form.startDate) errors.startDate = "Start date is required.";
  if (!form.endDate) errors.endDate = "End date is required.";

  if (form.startDate && form.endDate && form.endDate <= form.startDate) {
    errors.endDate = "Start date must be before end date";
  }

  const type = Number(form.type);

  if (type === 1) {
    const a = Number(form.targetASeconds);
    const b = Number(form.targetBSeconds);
    if (!form.targetASeconds && (form.targetASeconds as unknown as number) !== 0) {
      errors.targetASeconds = "Target A is required.";
    } else if (Number.isNaN(a) || a < 60) {
      errors.targetASeconds = "Target A must be at least 60 seconds.";
    }
    if (!form.targetBSeconds && (form.targetBSeconds as unknown as number) !== 0) {
      errors.targetBSeconds = "Target B is required.";
    } else if (Number.isNaN(b) || b < 60) {
      errors.targetBSeconds = "Target B must be at least 60 seconds.";
    } else if (!Number.isNaN(a) && b <= a) {
      errors.targetBSeconds = "Target B must be greater than Target A";
    }
  }

  if (type === 4) {
    const t = Number(form.thresholdSeconds);
    if (!form.thresholdSeconds && (form.thresholdSeconds as unknown as number) !== 0) {
      errors.thresholdSeconds = "Threshold is required.";
    } else if (Number.isNaN(t) || t < 60) {
      errors.thresholdSeconds = "Threshold must be at least 60 seconds.";
    }
  }

  if (form.showAlarmsBetweenDates) {
    if (!form.fromTime) errors.fromTime = "From time is required.";
    else if (!TIME_RE.test(form.fromTime)) errors.fromTime = "Use HH:mm format.";
    if (!form.toTime) errors.toTime = "To time is required.";
    else if (!TIME_RE.test(form.toTime)) errors.toTime = "Use HH:mm format.";
  }

  return { errors, isValid: Object.keys(errors).length === 0 };
}
