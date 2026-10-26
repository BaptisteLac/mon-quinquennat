import type { TicketLineResult } from "@mon-quinquennat/schema";

type TicketLine = TicketLineResult["ticketLine"];

/** Libellé d'une ligne du ticket. */
export const LINE_LABELS: Record<TicketLine, string> = {
  impot_revenu: "Impôt sur le revenu",
  prime_activite: "Prime d'activité",
  allocations_familiales: "Allocations familiales",
  apl: "Aides au logement",
  salaire_net: "Salaire net",
  pension: "Pension et minimum vieillesse",
  taxe_fonciere: "Taxe foncière",
  succession: "Succession",
  energie: "Énergie",
  tva: "TVA",
  age_depart_retraite: "Âge de départ à la retraite",
  temps_travail: "Temps de travail",
  ecole: "École",
  sante: "Santé",
  logement: "Logement",
  transport: "Transports",
};

/**
 * Sens d'une ligne du portefeuille : la valeur du ticket est un gain (+) ou une perte (−) ; le montant
 * calculé, lui, est un impôt payé (−1) ou une aide reçue (+1). Sert à retrouver « avec le programme ».
 */
export const AMOUNT_SIGN: Partial<Record<TicketLine, 1 | -1>> = { impot_revenu: -1 };

export const NATURE_LABELS: Record<TicketLineResult["nature"], string> = { sur: "Sûr", estime: "Estimé ≈", qualitatif: "Qualitatif" };

const EUR = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const EUR0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

function signed(n: number, f: Intl.NumberFormat): string {
  const s = f.format(Math.abs(n));
  return n > 0 ? `+${s}` : n < 0 ? `−${s}` : s;
}

/** « +12,30 € » ; une fourchette devient « ≈ +10,00 à +14,00 € ». */
export function formatMoney(v: { low: number; high: number }, decimals = true): string {
  const f = decimals ? EUR : EUR0;
  if (Math.abs(v.low - v.high) < 0.005) return `${signed(v.low, f)} €`;
  return `≈ ${signed(v.low, f)} à ${signed(v.high, f)} €`;
}

export function formatAmount(n: number): string {
  return `${EUR.format(n)} €`;
}

/** Années (décimales) → « 1 an », « 1 an et 3 mois », « 9 mois ». */
export function formatDuration(years: number): string {
  const total = Math.round(Math.abs(years) * 12);
  const y = Math.floor(total / 12);
  const m = total % 12;
  const parts = [y > 0 ? `${y} an${y > 1 ? "s" : ""}` : null, m > 0 ? `${m} mois` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(" et ") : "0 mois";
}

/** Phrase d'une ligne « temps » : « 1 an de travail en plus avant la retraite ». */
export function describeTime(line: Pick<TicketLineResult, "ticketLine" | "value">): string {
  if (!line.value) return LINE_LABELS[line.ticketLine];
  const { low, high } = line.value;
  const range = Math.abs(low - high) < 1 / 24 ? formatDuration(low) : `${formatDuration(low)} à ${formatDuration(high)}`;
  if (line.ticketLine === "age_depart_retraite") {
    return low >= 0 ? `${range} de travail en plus avant la retraite` : `${range} de travail en moins avant la retraite`;
  }
  return `${LINE_LABELS[line.ticketLine]} : ${range}`;
}

const MONTH = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const MONTH_SHORT = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" });

/** « 2028-01 » ou « 2028-01-01 » → « Janvier 2028 ». */
export function formatMonth(isoMonth: string, short = false): string {
  const s = (short ? MONTH_SHORT : MONTH).format(new Date(`${isoMonth.slice(0, 7)}-01T00:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}
