"use client";

import ChatMultiSelect from "@/components/chat/ChatMultiSelect";
import type { ReportFormState, ReportSelectOption } from "@/types/reports";

interface ReportFormOptionalFiltersProps {
  form: ReportFormState;
  patch: (updates: Partial<ReportFormState>) => void;
  locationOptions: ReportSelectOption[];
  clientOptions: ReportSelectOption[];
  alarmTypeOptions: ReportSelectOption[];
  shiftOptions: ReportSelectOption[];
  disabled?: boolean;
}

export default function ReportFormOptionalFilters({
  form,
  patch,
  locationOptions,
  clientOptions,
  alarmTypeOptions,
  shiftOptions,
  disabled,
}: ReportFormOptionalFiltersProps) {
  if (disabled) return null;

  return (
    <fieldset className="nca-chatbot__report-fieldset">
      <legend className="nca-chatbot__report-legend">Optional filters</legend>

      <div>
        <label className="nca-chatbot__report-label">Locations</label>
        <ChatMultiSelect
          value={form.locationIds}
          onChange={(v) => patch({ locationIds: v })}
          options={locationOptions}
          placeholder="All locations"
          searchPlaceholder="Search locations…"
        />
      </div>

      <div>
        <label className="nca-chatbot__report-label">Clients</label>
        <ChatMultiSelect
          value={form.clientIds}
          onChange={(v) => patch({ clientIds: v })}
          options={clientOptions}
          placeholder="All clients"
          searchPlaceholder="Search clients…"
        />
      </div>

      <div>
        <label className="nca-chatbot__report-label">Alarm types</label>
        <ChatMultiSelect
          value={form.alarmTypeIds}
          onChange={(v) => patch({ alarmTypeIds: v })}
          options={alarmTypeOptions}
          placeholder="All alarm types"
          searchPlaceholder="Search alarm types…"
        />
      </div>

      <div>
        <label className="nca-chatbot__report-label">Shifts</label>
        <ChatMultiSelect
          value={form.shiftIds}
          onChange={(v) => patch({ shiftIds: v })}
          options={shiftOptions}
          placeholder="All shifts"
          searchPlaceholder="Search shifts…"
        />
      </div>
    </fieldset>
  );
}
