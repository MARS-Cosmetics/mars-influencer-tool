/**
 * Indian fiscal year helpers — April 1 to March 31.
 *
 * fiscalYearLabel(2026-05-08) → "26-27"  (May 2026 falls in FY 2026-2027)
 * fiscalYearLabel(2026-03-15) → "25-26"  (March 2026 falls in FY 2025-2026)
 */

export function fiscalYearLabel(date: Date): string {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  const yy = (n: number) => String(n).slice(-2).padStart(2, "0");
  return `${yy(startYear)}-${yy(endYear)}`;
}
