"use client";

import ChatDropdown from "@/components/chat/ChatDropdown";
import ReportField from "@/components/chat/report/ReportField";
import type { ReportFormErrors, ReportFormState } from "@/types/reports";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function splitTime(value: string): { hour: string; minute: string } {
  if (!value || !value.includes(":")) return { hour: "", minute: "" };
  const [hour, minute] = value.split(":");
  return { hour: hour ?? "", minute: minute ?? "" };
}

function joinTime(hour: string, minute: string): string {
  if (!hour || !minute) return "";
  return `${hour}:${minute}`;
}

interface ReportFormTimeWindowProps {
  form: ReportFormState;
  errors: ReportFormErrors;
  patch: (updates: Partial<ReportFormState>) => void;
}

export default function ReportFormTimeWindow({ form, errors, patch }: ReportFormTimeWindowProps) {
  const from = splitTime(form.fromTime);
  const to = splitTime(form.toTime);

  return (
    <fieldset className="nca-chatbot__report-fieldset">
      <label className="nca-chatbot__report-checkbox">
        <input
          type="checkbox"
          checked={form.showAlarmsBetweenDates}
          onChange={(e) => patch({ showAlarmsBetweenDates: e.target.checked })}
        />
        <span>Show Alarms Between Specific Times</span>
      </label>

      {form.showAlarmsBetweenDates ? (
        <div className="nca-chatbot__report-conditional nca-chatbot__report-conditional--in">
          <ReportField name="fromTime" errors={errors}>
            <span className="nca-chatbot__report-label">From time</span>
            <div className="nca-chatbot__time-row">
              <ChatDropdown
                value={from.hour}
                onChange={(h) => patch({ fromTime: joinTime(h, from.minute || "00") })}
                options={HOURS.map((h) => ({ value: h, label: h }))}
                placeholder="HH"
                hasError={!!errors.fromTime}
              />
              <span className="nca-chatbot__time-sep">:</span>
              <ChatDropdown
                value={from.minute}
                onChange={(m) => patch({ fromTime: joinTime(from.hour || "00", m) })}
                options={MINUTES.map((m) => ({ value: m, label: m }))}
                placeholder="mm"
                hasError={!!errors.fromTime}
              />
            </div>
            {errors.fromTime ? <p className="nca-chatbot__field-error" role="alert">{errors.fromTime}</p> : null}
          </ReportField>
          <ReportField name="toTime" errors={errors}>
            <span className="nca-chatbot__report-label">To time</span>
            <div className="nca-chatbot__time-row">
              <ChatDropdown
                value={to.hour}
                onChange={(h) => patch({ toTime: joinTime(h, to.minute || "00") })}
                options={HOURS.map((h) => ({ value: h, label: h }))}
                placeholder="HH"
                hasError={!!errors.toTime}
              />
              <span className="nca-chatbot__time-sep">:</span>
              <ChatDropdown
                value={to.minute}
                onChange={(m) => patch({ toTime: joinTime(to.hour || "00", m) })}
                options={MINUTES.map((m) => ({ value: m, label: m }))}
                placeholder="mm"
                hasError={!!errors.toTime}
              />
            </div>
            {errors.toTime ? <p className="nca-chatbot__field-error" role="alert">{errors.toTime}</p> : null}
          </ReportField>
        </div>
      ) : null}
    </fieldset>
  );
}
