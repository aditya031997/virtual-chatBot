"use client";

import { useEffect, useState } from "react";
import { fetchAllReportLookups, ReportsApiError } from "@/utils/api/reportsChatbot";
import type {
  ReportAlarmTypeRaw,
  ReportClientRaw,
  ReportLocationRaw,
  ReportShiftRaw,
} from "@/types/api";
import type { ReportLookupsResult, ReportSelectOption } from "@/types/reports";

function mapLocations(data: ReportLocationRaw[] | null | undefined): ReportSelectOption[] {
  return (data ?? []).map((l) => ({ value: l.id, label: l.name }));
}

function mapClients(data: ReportClientRaw[] | null | undefined): ReportSelectOption[] {
  return (data ?? []).map((c) => ({
    value: c.id,
    label: c.clientName || c.displayName || c.clientIdentifier || c.id,
  }));
}

function mapAlarmTypes(data: ReportAlarmTypeRaw[] | null | undefined): ReportSelectOption[] {
  return (data ?? []).map((a) => ({ value: a.id, label: a.name }));
}

function mapShifts(data: ReportShiftRaw[] | null | undefined): ReportSelectOption[] {
  return (data ?? []).map((s) => ({
    value: s.id,
    label: `${s.name} (${s.startTime}–${s.endTime})`,
  }));
}

export function useReportLookups(onError?: (message: string) => void): ReportLookupsResult {
  const [loading, setLoading] = useState(true);
  const [locationOptions, setLocationOptions] = useState<ReportSelectOption[]>([]);
  const [clientOptions, setClientOptions] = useState<ReportSelectOption[]>([]);
  const [alarmTypeOptions, setAlarmTypeOptions] = useState<ReportSelectOption[]>([]);
  const [shiftOptions, setShiftOptions] = useState<ReportSelectOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [locations, clients, alarmTypes, shifts] = await fetchAllReportLookups();
        if (cancelled) return;
        setLocationOptions(mapLocations(locations));
        setClientOptions(mapClients(clients));
        setAlarmTypeOptions(mapAlarmTypes(alarmTypes));
        setShiftOptions(mapShifts(shifts));
      } catch (error) {
        if (!cancelled) {
          onError?.(
            error instanceof ReportsApiError ? error.message : "Failed to load report filters.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [onError]);

  return { loading, locationOptions, clientOptions, alarmTypeOptions, shiftOptions };
}
