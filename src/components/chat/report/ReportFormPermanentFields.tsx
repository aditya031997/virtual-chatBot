"use client";

import ChatDropdown from "@/components/chat/ChatDropdown";
import ChatTimezoneField from "@/components/chat/ChatTimezoneField";
import ReportField from "@/components/chat/report/ReportField";
import { FILE_FORMATS, REPORT_TYPES } from "@/utils/reports/constants";
import type { ReportFormErrors, ReportFormField, ReportFormState } from "@/types/reports";

interface ReportFormPermanentFieldsProps {
  form: ReportFormState;
  errors: ReportFormErrors;
  patch: (updates: Partial<ReportFormState>) => void;
  onTypeChange: (type: string) => void;
  lookupsLoading?: boolean;
}

export default function ReportFormPermanentFields({ form, errors, patch, onTypeChange, lookupsLoading }: ReportFormPermanentFieldsProps) {
  const fieldClass = (key: ReportFormField) =>
    `nca-chatbot__appt-field ${errors[key] ? "nca-chatbot__appt-field--error" : "nca-chatbot__appt-field--ok"}`;

  return (
    <>
      <ReportField name="name" errors={errors}>
        <label htmlFor="report-name" className="nca-chatbot__report-label">
          Report Name <span className="nca-chatbot__required">*</span>
        </label>
        <input
          id="report-name"
          type="text"
          maxLength={100}
          value={form.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="e.g. Weekly Summary"
          aria-invalid={!!errors.name}
          className={fieldClass("name")}
        />
        {errors.name ? <p className="nca-chatbot__field-error" role="alert">{errors.name}</p> : null}
      </ReportField>

      <ReportField name="type" errors={errors}>
        <label className="nca-chatbot__report-label">
          Report Type <span className="nca-chatbot__required">*</span>
        </label>
        <ChatDropdown
          value={form.type}
          onChange={onTypeChange}
          options={REPORT_TYPES}
          placeholder="Select report type"
          hasError={!!errors.type}
        />
        {errors.type ? <p className="nca-chatbot__field-error" role="alert">{errors.type}</p> : null}
      </ReportField>

      <ReportField name="fileFormat" errors={errors}>
        <label className="nca-chatbot__report-label">
          File Format <span className="nca-chatbot__required">*</span>
        </label>
        <ChatDropdown
          value={form.fileFormat}
          onChange={(v) => patch({ fileFormat: v })}
          options={FILE_FORMATS}
          placeholder="Select format"
          hasError={!!errors.fileFormat}
        />
        {errors.fileFormat ? <p className="nca-chatbot__field-error" role="alert">{errors.fileFormat}</p> : null}
      </ReportField>

      <div className="nca-chatbot__report-date-row">
        <ReportField name="startDate" errors={errors}>
          <label htmlFor="report-start" className="nca-chatbot__report-label">
            Start Date <span className="nca-chatbot__required">*</span>
          </label>
          <input
            id="report-start"
            type="date"
            value={form.startDate}
            onChange={(e) => patch({ startDate: e.target.value })}
            aria-invalid={!!errors.startDate}
            className={fieldClass("startDate")}
          />
          {errors.startDate ? <p className="nca-chatbot__field-error" role="alert">{errors.startDate}</p> : null}
        </ReportField>
        <ReportField name="endDate" errors={errors}>
          <label htmlFor="report-end" className="nca-chatbot__report-label">
            End Date <span className="nca-chatbot__required">*</span>
          </label>
          <input
            id="report-end"
            type="date"
            value={form.endDate}
            min={form.startDate || undefined}
            onChange={(e) => patch({ endDate: e.target.value })}
            aria-invalid={!!errors.endDate}
            className={fieldClass("endDate")}
          />
          {errors.endDate ? <p className="nca-chatbot__field-error" role="alert">{errors.endDate}</p> : null}
        </ReportField>
      </div>

      <div data-report-field="timezone">
        <label className="nca-chatbot__report-label">Timezone</label>
        <ChatTimezoneField value={form.timezone} onChange={(v) => patch({ timezone: v })} hasError={false} />
      </div>

      {lookupsLoading ? (
        <p className="nca-chatbot__report-loading" aria-live="polite">
          Loading filters…
        </p>
      ) : null}
    </>
  );
}
