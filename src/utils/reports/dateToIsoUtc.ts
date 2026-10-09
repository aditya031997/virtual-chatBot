/** "YYYY-MM-DD" → start of day UTC */
export function startDateToIsoUtc(dateStr: string): string {
  if (!dateStr) return "";
  return `${dateStr}T00:00:00.000Z`;
}

/** "YYYY-MM-DD" → end of day UTC */
export function endDateToIsoUtc(dateStr: string): string {
  if (!dateStr) return "";
  return `${dateStr}T23:59:59.999Z`;
}
