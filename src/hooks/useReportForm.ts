"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchReportTypeFields, generateReport, ReportsApiError } from "@/utils/api/reportsChatbot";
import { buildReportPayload } from "@/utils/reports/buildReportPayload";
import { EMPTY_REPORT_FORM } from "@/utils/reports/constants";
import { validateReportForm } from "@/utils/validation/reportFormValidation";
import { useReportLookups } from "@/hooks/useReportLookups";
import type { ReportExtraField } from "@/types/api";
import type {
  ReportFormErrors,
  ReportFormField,
  ReportFormState,
  ReportSubmitResult,
} from "@/types/reports";

export function useReportForm() {
  const [form, setForm] = useState<ReportFormState>(EMPTY_REPORT_FORM);
  const [errors, setErrors] = useState<ReportFormErrors>({});
  const [typeFieldsLoading, setTypeFieldsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [extraFields, setExtraFields] = useState<ReportExtraField[]>([]);

  const setToastStable = useCallback((msg: string) => setToast(msg), []);
  const lookups = useReportLookups(setToastStable);

  const patch = useCallback((updates: Partial<ReportFormState>) => {
    setForm((prev) => ({ ...prev, ...updates }));
    setErrors((prev) => {
      const next = { ...prev };
      (Object.keys(updates) as ReportFormField[]).forEach((k) => delete next[k]);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!form.type) {
      setExtraFields([]);
      return;
    }
    const controller = new AbortController();
    (async () => {
      setTypeFieldsLoading(true);
      try {
        const data = await fetchReportTypeFields(form.type, { signal: controller.signal });
        if (!controller.signal.aborted) setExtraFields(data?.extraFields ?? []);
      } catch (error) {
        if ((error as { name?: string } | null)?.name === "AbortError" || controller.signal.aborted) return;
        setToast(error instanceof ReportsApiError ? error.message : "Failed to load report fields.");
        setExtraFields([]);
      } finally {
        if (!controller.signal.aborted) setTypeFieldsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [form.type]);

  const handleTypeChange = (type: string) => {
    setForm((prev) => ({
      ...prev,
      type,
      targetASeconds: "",
      targetBSeconds: "",
      thresholdSeconds: "",
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.type;
      delete next.targetASeconds;
      delete next.targetBSeconds;
      delete next.thresholdSeconds;
      return next;
    });
  };

  const submit = async (): Promise<ReportSubmitResult> => {
    const { errors: nextErrors, isValid } = validateReportForm(form);
    setErrors(nextErrors);
    if (!isValid) return { ok: false, errors: nextErrors };

    setSubmitting(true);
    setToast("");
    try {
      const payload = buildReportPayload(form);
      const { blob, filename } = await generateReport(payload);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      return { ok: true, filename, payload };
    } catch (error) {
      setToast(
        error instanceof ReportsApiError
          ? error.message
          : "We couldn't generate your report. Please try again.",
      );
      return { ok: false };
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setForm(EMPTY_REPORT_FORM);
    setErrors({});
    setExtraFields([]);
    setToast("");
  };

  return {
    form,
    errors,
    patch,
    handleTypeChange,
    lookupsLoading: lookups.loading,
    typeFieldsLoading,
    submitting,
    toast,
    setToast,
    extraFields,
    locationOptions: lookups.locationOptions,
    clientOptions: lookups.clientOptions,
    alarmTypeOptions: lookups.alarmTypeOptions,
    shiftOptions: lookups.shiftOptions,
    submit,
    reset,
  };
}
