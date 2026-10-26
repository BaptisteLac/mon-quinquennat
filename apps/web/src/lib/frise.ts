/**
 * La frise 2027 → 2032 : une case par date où une mesure qui te touche s'applique, pour chacun des
 * programmes choisis (le mystère reste anonyme). Construite dans le navigateur à partir des tickets.
 */
import type { Ticket, TicketLineResult } from "@mon-quinquennat/schema";
import type { Catalog } from "./catalog";
import { END_OF_TERM, monthsApplied, monthsBetween, START_OF_TERM } from "./term";

export interface Lane {
  /** Identifiant d'affichage : l'id du candidat, ou « mystere ». */
  key: string;
  candidateId: string;
  mystery: boolean;
  ticket: Ticket;
}

export interface MomentEntry {
  laneKey: string;
  lines: TicketLineResult[];
}

export type TimelineItem =
  | { kind: "moment"; month: string; position: "start" | "middle" | "end"; entries: MomentEntry[]; dateOrigin: "annoncee" | "estimee" | null }
  | { kind: "gap"; from: string; to: string; months: number };

export const START_MONTH = START_OF_TERM.slice(0, 7);
export const END_MONTH = END_OF_TERM.slice(0, 7);

const monthOf = (date: string) => (date < START_OF_TERM ? START_MONTH : date.slice(0, 7));

export function buildTimeline(lanes: readonly Lane[], catalog: Catalog): TimelineItem[] {
  const months = new Set<string>([START_MONTH, END_MONTH]);
  for (const lane of lanes) for (const l of lane.ticket.lines) months.add(monthOf(l.effectiveDate) > END_MONTH ? END_MONTH : monthOf(l.effectiveDate));
  const sorted = [...months].sort();

  const items: TimelineItem[] = [];
  sorted.forEach((month, i) => {
    const previous = sorted[i - 1];
    if (previous && monthsBetween(previous, month) > 1) items.push({ kind: "gap", from: previous, to: month, months: monthsBetween(previous, month) - 1 });
    const entries = lanes.map((lane) => ({
      laneKey: lane.key,
      lines: lane.ticket.lines.filter((l) => {
        const m = monthOf(l.effectiveDate);
        return (m > END_MONTH ? END_MONTH : m) === month;
      }),
    }));
    const measureIds = entries.flatMap((e) => e.lines.flatMap((l) => l.measureIds));
    const origins = new Set(measureIds.map((id) => catalog.measures[id]?.schedule.dateOrigin));
    items.push({
      kind: "moment",
      month,
      position: i === 0 ? "start" : i === sorted.length - 1 ? "end" : "middle",
      entries,
      dateOrigin: measureIds.length === 0 ? null : origins.size === 1 && origins.has("annoncee") ? "annoncee" : "estimee",
    });
  });
  return items;
}

/** Ce que le programme a fait gagner (+) ou perdre (−) depuis mai 2027, au 14 du mois donné. */
export function cumulAt(ticket: Ticket, month: string): { low: number; high: number } {
  const end = month >= END_MONTH ? END_OF_TERM : `${month}-14`;
  let low = 0;
  let high = 0;
  for (const l of ticket.lines) {
    if (l.section !== "portefeuille" || !l.value) continue;
    const n = monthsApplied(l.effectiveDate, START_OF_TERM, end);
    low += l.value.low * n;
    high += l.value.high * n;
  }
  return { low: Math.round(low * 100) / 100, high: Math.round(high * 100) / 100 };
}

/** Plus grand écart de cumul entre deux programmes choisis (« les trajectoires se séparent »). */
export function spread(lanes: readonly Lane[], month: string): number {
  if (lanes.length < 2) return 0;
  const mids = lanes.map((l) => {
    const c = cumulAt(l.ticket, month);
    return (c.low + c.high) / 2;
  });
  return Math.max(...mids) - Math.min(...mids);
}
