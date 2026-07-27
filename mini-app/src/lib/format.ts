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
