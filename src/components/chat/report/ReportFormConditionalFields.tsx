"use client";

import ReportField from "@/components/chat/report/ReportField";
import type { ReportFormErrors, ReportFormField, ReportFormState } from "@/types/reports";

interface ReportFormConditionalFieldsProps {
  form: ReportFormState;
  errors: ReportFormErrors;
  patch: (updates: Partial<ReportFormState>) => void;
  type: string;
  loading?: boolean;
}

export default function ReportFormConditionalFields({ form, errors, patch, type, loading }: ReportFormConditionalFieldsProps) {
  const typeNum = Number(type);
  if (!type) return null;

  const fieldClass = (key: ReportFormField) =>
    `nca-chatbot__appt-field ${errors[key] ? "nca-chatbot__appt-field--error" : "nca-chatbot__appt-field--ok"}`;

  if (loading) {
    return <p className="nca-chatbot__report-loading" aria-live="polite">Loading report options…</p>;
  }

  if (typeNum === 1) {
    return (
      <div className="nca-chatbot__report-conditional nca-chatbot__report-conditional--in">
        <p className="nca-chatbot__report-legend">Summary report targets</p>
        <ReportField name="targetASeconds" errors={errors}>
          <label htmlFor="target-a" className="nca-chatbot__report-label">
            Target A (seconds) <span className="nca-chatbot__required">*</span>
          </label>
          <input
            id="target-a"
            type="number"
            min={60}
            value={form.targetASeconds}
            onChange={(e) => patch({ targetASeconds: e.target.value })}
            className={fieldClass("targetASeconds")}
            aria-invalid={!!errors.targetASeconds}
          />
          {errors.targetASeconds ? (
            <p className="nca-chatbot__field-error" role="alert">{errors.targetASeconds}</p>
          ) : null}
        </ReportField>
        <ReportField name="targetBSeconds" errors={errors}>
          <label htmlFor="target-b" className="nca-chatbot__report-label">
            Target B (seconds) <span className="nca-chatbot__required">*</span>
          </label>
          <input
            id="target-b"
            type="number"
            min={60}
            value={form.targetBSeconds}
            onChange={(e) => patch({ targetBSeconds: e.target.value })}
            className={fieldClass("targetBSeconds")}
            aria-invalid={!!errors.targetBSeconds}
          />
          {errors.targetBSeconds ? (
            <p className="nca-chatbot__field-error" role="alert">{errors.targetBSeconds}</p>
          ) : null}
        </ReportField>
      </div>
    );
  }

  if (typeNum === 4) {
    return (
      <div className="nca-chatbot__report-conditional nca-chatbot__report-conditional--in">
        <p className="nca-chatbot__report-legend">Excessive response threshold</p>
        <ReportField name="thresholdSeconds" errors={errors}>
          <label htmlFor="threshold" className="nca-chatbot__report-label">
            Threshold (seconds) <span className="nca-chatbot__required">*</span>
          </label>
          <input
            id="threshold"
            type="number"
            min={60}
            value={form.thresholdSeconds}
            onChange={(e) => patch({ thresholdSeconds: e.target.value })}
            className={fieldClass("thresholdSeconds")}
            aria-invalid={!!errors.thresholdSeconds}
          />
          {errors.thresholdSeconds ? (
            <p className="nca-chatbot__field-error" role="alert">{errors.thresholdSeconds}</p>
          ) : null}
        </ReportField>
      </div>
    );
  }

  return null;
}
