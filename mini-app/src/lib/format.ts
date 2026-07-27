/**
 * "125000" → "125 000 so'm" — space-grouped digits, the way prices are
 * written locally (not en-US commas + "UZS").
 */
export function formatSom(amount: number): string {
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped} so'm`;
}

/** "2026-07-27T09:04:22Z" -> "27.07.2026, 14:04" — numeric, no locale dependency. */
export function formatOrderDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
