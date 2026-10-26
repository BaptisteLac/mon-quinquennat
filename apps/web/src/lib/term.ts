/** Le mandat 2027–2032 (le mandat en cours s'achève le 13 mai 2027). */
export const START_OF_TERM = "2027-05-14";
export const END_OF_TERM = "2032-05-14";

/** Mois entiers entre la date d'effet (au plus tôt le début du mandat) et `end`. */
export function monthsApplied(effectiveDate: string, start = START_OF_TERM, end = END_OF_TERM): number {
  const from = effectiveDate > start ? effectiveDate : start;
  if (from >= end) return 0;
  const [fy, fm, fd] = from.split("-").map(Number) as [number, number, number];
  const [ey, em, ed] = end.split("-").map(Number) as [number, number, number];
  return (ey - fy) * 12 + (em - fm) - (ed < fd ? 1 : 0);
}

/** « 2028-01 » → « 2028-02 ». */
export function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number) as [number, number];
  const [ty, tm] = to.split("-").map(Number) as [number, number];
  return (ty - fy) * 12 + (tm - fm);
}

/** « 2028-01 » → « 2027-12 ». */
export function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}
