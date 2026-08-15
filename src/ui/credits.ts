/**
 * Compact credit formatter for the rescaled economy (values are in the
 * thousands and millions). 500_000 -> 500k, 1_250_000 -> 1.25M, 8_000 -> 8k.
 */
export function formatCredits(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const millions = (value / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${millions}M`;
  }
  if (abs >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return String(value);
}
