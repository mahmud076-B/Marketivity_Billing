export function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function parseMoney(value: unknown): number {
  if (typeof value === "number") return roundMoney(value);
  if (typeof value === "string") return roundMoney(Number.parseFloat(value) || 0);
  return 0;
}

/** On-screen Bangladeshi Taka, e.g. ৳ 85,450 */
export function formatTaka(n: number | string, opts?: { compact?: boolean }): string {
  const value = parseMoney(n);
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-BD", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  const sign = value < 0 ? "−" : "";
  if (opts?.compact && abs >= 100000) {
    const lakh = abs / 100000;
    return `${sign}৳ ${lakh.toFixed(lakh >= 10 ? 1 : 2)}L`;
  }
  return `${sign}৳ ${formatted}`;
}


export function formatUsd(n: number | string): string {
  const value = parseMoney(n);
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
