export function formatCompactInt(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${trimZero(n / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${trimZero(n / 1_000_000)}M`;
  if (abs >= 1_000) return `${trimZero(n / 1_000)}K`;
  return Math.round(n).toString();
}

export function formatInr(n: number): string {
  return `₹${formatCompactInt(Math.round(n))}`;
}

export function formatCpv(n: number | null): string {
  if (n === null) return "—";
  return `₹${n < 1 ? n.toFixed(3) : n.toFixed(2)}`;
}

// "1.0" → "1", "1.5" → "1.5" — drops trailing zero so "500K" reads cleaner
// than "500.0K" when the value is round.
function trimZero(n: number): string {
  const fixed = n.toFixed(1);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// "2026-04-13" → "13 Apr". Compact for chart axes, no decoding needed.
export function formatChartDate(iso: string): string {
  const parts = iso.split("-");
  if (parts.length < 3) return iso;
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return iso;
  return `${day} ${MONTH_SHORT[month - 1] ?? parts[1]}`;
}

// "2026-04-13" → "13 Apr 2026". Used in tooltip headers where year matters.
export function formatChartDateFull(iso: string): string {
  const parts = iso.split("-");
  if (parts.length < 3) return iso;
  const year = parts[0];
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return iso;
  return `${day} ${MONTH_SHORT[month - 1] ?? parts[1]} ${year}`;
}
