/**
 * Calculs du récap à partir des tickets (aucun nouveau chiffre : des sommes et des comptes de lignes).
 * Pas de classement : les programmes restent dans l'ordre du choix, le mystère en dernier.
 */
import type { Ticket, TicketLineResult } from "@mon-quinquennat/schema";
import type { Catalog } from "./catalog";
import { plural } from "./format";
import type { NatureKind } from "./nature";
import { effectSentence } from "./catalog";
import { LINE_LABELS } from "./ticket-labels";

type TicketLine = TicketLineResult["ticketLine"];
const AIDES: readonly TicketLine[] = ["prime_activite", "apl", "allocations_familiales", "pension"];

const mid = (v: { low: number; high: number }) => (v.low + v.high) / 2;
const round = (n: number) => Math.round(n * 100) / 100 + 0;

function sumAnnual(t: Ticket, lines: readonly TicketLine[] | null): number {
  return round(
    t.lines
      .filter((l) => l.section === "portefeuille" && l.value && (lines === null || lines.includes(l.ticketLine)))
      .reduce((s, l) => s + mid(l.value as { low: number; high: number }) * 12, 0),
  );
}

export interface Glance {
  /** Solde annuel, milieu de la fourchette, effets estimés compris. */
  annual: number;
  /** Écart d'âge de départ en années (null : aucune mesure chiffrée). */
  retraite: { low: number; high: number } | null;
  impot: number;
  aides: number;
  /** Chiffres sûrs / chiffres affichés. */
  sure: number;
  figures: number;
}

export function glance(t: Ticket): Glance {
  const figures = t.lines.filter((l) => l.value);
  const time = t.lines.find((l) => l.ticketLine === "age_depart_retraite" && l.value);
  return {
    annual: round(mid({ low: t.solde.low, high: t.solde.high }) * 12),
    retraite: time?.value ?? null,
    impot: sumAnnual(t, ["impot_revenu"]),
    aides: sumAnnual(t, AIDES),
    sure: figures.filter((l) => l.nature === "sur").length,
    figures: figures.length,
  };
}

export interface ThemeRow {
  ticketLine: TicketLine;
  label: string;
  estimated: boolean;
  unit: "euros_an" | "annees";
  /** Une valeur par ticket, dans l'ordre donné (0 : rien ne change). */
  values: number[];
}

/** Sujets où au moins un programme change quelque chose, du plus grand écart au plus petit. */
export function themes(tickets: readonly Ticket[]): ThemeRow[] {
  const keys = new Set<TicketLine>();
  for (const t of tickets) for (const l of t.lines) if (l.value) keys.add(l.ticketLine);
  const rows: ThemeRow[] = [...keys].map((k) => {
    const lines = tickets.map((t) => t.lines.filter((l) => l.ticketLine === k && l.value));
    const unit = lines.some((ls) => ls.some((l) => l.section === "temps")) ? "annees" : "euros_an";
    return {
      ticketLine: k,
      label: LINE_LABELS[k],
      estimated: lines.some((ls) => ls.some((l) => l.nature === "estime")),
      unit,
      values: lines.map((ls) => round(ls.reduce((s, l) => s + mid(l.value as { low: number; high: number }) * (unit === "annees" ? 1 : 12), 0))),
    };
  });
  const spread = (r: ThemeRow) => Math.max(...r.values, 0) - Math.min(...r.values, 0);
  return rows.filter((r) => r.values.some((v) => v !== 0)).sort((a, b) => spread(b) - spread(a));
}

/** Mesures qui te concernent, par nature (chiffrées, qualitatives, floues). */
export function certainty(t: Ticket, catalog: Catalog): Record<NatureKind, number> {
  const counts: Record<NatureKind, number> = { chiffree: 0, qualitative: 0, floue: 0 };
  for (const id of new Set(t.lines.flatMap((l) => l.measureIds))) {
    const m = catalog.measures[id];
    if (m) counts[m.nature]++;
  }
  return counts;
}

/** Ce qui change le plus pour toi dans un programme : le plus grand montant, sinon la première phrase. */
export function biggestChange(t: Ticket, catalog: Catalog): { text: string; line: TicketLineResult } | null {
  const money = t.lines
    .filter((l) => l.section === "portefeuille" && l.value)
    .sort((a, b) => Math.abs(mid(b.value as { low: number; high: number })) - Math.abs(mid(a.value as { low: number; high: number })))[0];
  const line = money ?? t.lines.find((l) => l.value) ?? t.lines[0];
  if (!line) return null;
  const m = line.measureIds.map((id) => catalog.measures[id]).find((x) => x !== undefined);
  if (!m) return null;
  return { text: line.nature === "qualitatif" ? effectSentence(m, line.ticketLine) : m.title, line };
}

/** « 1 chiffrée · 27 qualitatives · 1 floue » : la légende se lit sans renvoi. */
export function certaintyLabel(c: Record<NatureKind, number>): string {
  return [plural(c.chiffree, "chiffrée"), plural(c.qualitative, "qualitative"), plural(c.floue, "floue")].join(" · ");
}
