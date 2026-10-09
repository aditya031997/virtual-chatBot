import { REPORTS_SITE_ID } from "@/utils/reports/constants";
import { endDateToIsoUtc, startDateToIsoUtc } from "@/utils/reports/dateToIsoUtc";
import { normalizeTimezoneForApi } from "@/utils/reports/reportTimezones";
import type { ReportFormState, ReportPayload } from "@/types/reports";

export function buildReportPayload(form: ReportFormState): ReportPayload {
  const type = Number(form.type);
  const payload: ReportPayload = {
    siteId: REPORTS_SITE_ID,
    name: form.name.trim(),
    type,
    fileFormat: Number(form.fileFormat),
    startDate: startDateToIsoUtc(form.startDate),
    endDate: endDateToIsoUtc(form.endDate),
  };

  const timezone = normalizeTimezoneForApi(form.timezone);
  if (timezone) payload.timezone = timezone;

  if (form.locationIds?.length) payload.locationIds = form.locationIds;
  if (form.clientIds?.length) payload.clientIds = form.clientIds;
  if (form.alarmTypeIds?.length) payload.alarmTypeIds = form.alarmTypeIds;
  if (form.shiftIds?.length) payload.shiftIds = form.shiftIds;

  if (form.showAlarmsBetweenDates) {
    payload.showAlarmsBetweenDates = true;
    payload.fromTime = form.fromTime;
    payload.toTime = form.toTime;
  }

  if (type === 1) {
    payload.targetASeconds = Number(form.targetASeconds);
    payload.targetBSeconds = Number(form.targetBSeconds);
  }

  if (type === 4) {
    payload.thresholdSeconds = Number(form.thresholdSeconds);
  }

  return payload;
}
