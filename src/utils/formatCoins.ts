export function formatCoins(coins: number): string {
  if (coins >= 1_000_000) return `${Number((coins / 1_000_000).toFixed(1))}M`;
  if (coins >= 10_000) return `${Number((coins / 1_000).toFixed(1))}k`;
  return String(coins);
}
