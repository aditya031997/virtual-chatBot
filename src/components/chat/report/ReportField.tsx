"use client";

import type { ReactNode } from "react";
import type { ReportFormErrors, ReportFormField } from "@/types/reports";

interface ReportFieldProps {
  name: ReportFormField;
  errors: ReportFormErrors;
  children: ReactNode;
  className?: string;
}

export default function ReportField({ name, errors, children, className = "" }: ReportFieldProps) {
  const invalid = Boolean(errors?.[name]);
  const mods = ["nca-chatbot__report-field", invalid ? "nca-chatbot__report-field--invalid" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div data-report-field={name} className={mods}>
      {children}
    </div>
  );
}
