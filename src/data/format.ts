/** Hours as words people use: minutes under an hour, hours under two days, then days. */
export function formatHours(h: number | null): string {
  if (h === null) return 'n/a';
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} days`;
}
