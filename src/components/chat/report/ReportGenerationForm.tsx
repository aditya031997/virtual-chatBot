"use client";

import { useRef, type FormEvent } from "react";
import ChatToast from "@/components/chat/ChatToast";
import ReportFormConditionalFields from "@/components/chat/report/ReportFormConditionalFields";
import ReportFormOptionalFilters from "@/components/chat/report/ReportFormOptionalFilters";
import ReportFormPermanentFields from "@/components/chat/report/ReportFormPermanentFields";
import ReportFormTimeWindow from "@/components/chat/report/ReportFormTimeWindow";
import { useReportForm } from "@/hooks/useReportForm";
import { REPORT_TYPES, FILE_FORMATS } from "@/utils/reports/constants";
import { scrollToFirstReportError } from "@/utils/reports/scrollToReportError";
import type { ReportFormState } from "@/types/reports";

export interface ReportSuccessMessages {
  reportName: string;
  filename: string;
  botMessage: string;
  userSummary: string;
}

interface ReportGenerationFormProps {
  onSuccess?: (data: ReportSuccessMessages) => void;
}

function buildReportSuccessMessages(form: ReportFormState, serverFilename: string): ReportSuccessMessages {
  const reportName = form.name.trim();
  const typeLabel = REPORT_TYPES.find((t) => t.value === form.type)?.label ?? form.type;
  const formatLabel = FILE_FORMATS.find((f) => f.value === form.fileFormat)?.label ?? form.fileFormat;
  const successLine = `${reportName} file downloaded successfully.`;

  return {
    reportName,
    filename: serverFilename,
    botMessage: successLine,
    userSummary: `Report: ${reportName}\nType: ${typeLabel}\nFormat: ${formatLabel}\nPeriod: ${form.startDate} – ${form.endDate}\n${successLine}`,
  };
}

export default function ReportGenerationForm({ onSuccess }: ReportGenerationFormProps) {
  const rf = useReportForm();
  const formRef = useRef<HTMLDivElement | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (rf.submitting) return;
    const result = await rf.submit();
    if (result?.ok === false && result.errors) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToFirstReportError(result.errors!, formRef.current ?? document);
        });
      });
      return;
    }
    if (!result?.ok) return;
    onSuccess?.(buildReportSuccessMessages(rf.form, result.filename));
  };

  return (
    <div ref={formRef} className="nca-chatbot__appointment-shell nca-chatbot__report-shell">
      <ChatToast message={rf.toast} onDismiss={() => rf.setToast("")} />
      <form onSubmit={handleSubmit} className="nca-chatbot__form-vertical" noValidate>
        <ReportFormPermanentFields
          form={rf.form}
          errors={rf.errors}
          patch={rf.patch}
          onTypeChange={rf.handleTypeChange}
          lookupsLoading={rf.lookupsLoading}
        />
        <ReportFormOptionalFilters
          form={rf.form}
          patch={rf.patch}
          locationOptions={rf.locationOptions}
          clientOptions={rf.clientOptions}
          alarmTypeOptions={rf.alarmTypeOptions}
          shiftOptions={rf.shiftOptions}
          disabled={rf.lookupsLoading}
        />
        <ReportFormConditionalFields
          form={rf.form}
          errors={rf.errors}
          patch={rf.patch}
          type={rf.form.type}
          loading={rf.typeFieldsLoading}
        />
        <ReportFormTimeWindow form={rf.form} errors={rf.errors} patch={rf.patch} />
        <button
          type="submit"
          disabled={rf.submitting || rf.lookupsLoading}
          aria-busy={rf.submitting}
          className="nca-chatbot__btn-primary-block"
        >
          {rf.submitting ? (
            <>
              <svg className="nca-chatbot__spinner-sm nca-chatbot__spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="nca-chatbot__opacity-25" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Generating report…
            </>
          ) : (
            "Generate report"
          )}
        </button>
      </form>
    </div>
  );
}
