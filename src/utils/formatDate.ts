export function formatChatTimestamp(): string {
  const d = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${days[d.getDay()]} ${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}
