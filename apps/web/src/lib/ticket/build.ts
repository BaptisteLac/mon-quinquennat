/**
 * Assemble le ticket « Ma vie en 2032 » de chaque candidat pour un profil.
 *
 * - Portefeuille : écart entre les montants OpenFisca du candidat et ceux des règles actuelles
 *   (réponse du service de calcul), rattaché aux mesures dont les leviers touchent ce montant.
 * - Temps : formules de la liste blanche (`@mon-quinquennat/formulas`).
 * - Qualitatif : effets dont la condition « à qui s'applique » est vraie pour le profil.
 * Aucun montant n'est produit ici autrement que par une soustraction de montants calculés.
 */
import { LegalAgeTable, retraiteAgeDepart } from "@mon-quinquennat/formulas";
import ageLegalActuel from "@mon-quinquennat/formulas/data/age-legal-actuel.json";
import { Ticket, type Measure, type Profile, type TicketLineResult } from "@mon-quinquennat/schema";
import type { Programme } from "../data";
import type { CalcOutput, CalculResponse } from "./calc-client";
import { monthsApplied, START_OF_TERM } from "../term";
import { matches } from "./conditions";

/** Règles comparées : celles du mois de calcul du service (octobre 2026). */
export const BASELINE_RULES_YEAR = 2026;
export const HORIZON_YEAR = 2032;

type TicketLine = TicketLineResult["ticketLine"];

/** Montant calculé → ligne du ticket ; `sign` : +1 si une hausse est un gain pour le portefeuille. */
const OUTPUT_LINES: Record<CalcOutput, { ticketLine: TicketLine; sign: 1 | -1 }> = {
  impot_revenu: { ticketLine: "impot_revenu", sign: -1 },
  prime_activite: { ticketLine: "prime_activite", sign: 1 },
  aides_logement: { ticketLine: "apl", sign: 1 },
  allocations_familiales: { ticketLine: "allocations_familiales", sign: 1 },
  minimum_vieillesse: { ticketLine: "pension", sign: 1 },
};

/** En dessous, l'écart est un arrondi de calcul, pas un effet. */
const MIN_DELTA = 0.5;

const AGE_TABLE = LegalAgeTable.parse(ageLegalActuel);

const round2 = (n: number) => Math.round(n * 100) / 100 + 0; // + 0 : pas de « -0 »

function latest(dates: readonly string[]): string {
  return [...dates].sort().at(-1) ?? START_OF_TERM;
}

interface Built {
  lines: TicketLineResult[];
  uncomputed: Ticket["uncomputed"];
}

function walletLines(programme: Programme, calc: CalculResponse, byId: ReadonlyMap<string, Measure>): Built {
  const out: Built = { lines: [], uncomputed: [] };
  const cand = calc.candidats[programme.candidate.id];
  if (!cand) return out;
  for (const [output, ids] of Object.entries(cand.mesures) as [CalcOutput, string[]][]) {
    const measures = ids.flatMap((id) => byId.get(id) ?? []);
    if (measures.length === 0) continue;
    const measureIds = measures.map((m) => m.id);
    const { ticketLine, sign } = OUTPUT_LINES[output];
    const base = calc.actuel.montants[output];
    const after = cand.montants[output];
    if (base === null || after === null) {
      const reason = cand.nonCalcules[output] ?? calc.actuel.nonCalcules[output] ?? "Montant non calculable pour ce profil.";
      out.uncomputed.push({ ticketLine, reason, measureIds });
      continue;
    }
    const delta = round2(sign * (after - base));
    if (Math.abs(delta) < MIN_DELTA) continue;
    out.lines.push({
      ticketLine,
      section: "portefeuille",
      nature: "sur",
      value: { low: delta, high: delta },
      baseline: base,
      measureIds,
      effectiveDate: latest(measures.map((m) => m.schedule.effectiveDate)),
    });
  }
  return out;
}

function effectLines(programme: Programme, profile: Profile): Built {
  const out: Built = { lines: [], uncomputed: [] };
  const qualitative = new Map<TicketLine, { section: TicketLineResult["section"]; measures: Measure[] }>();
  for (const m of programme.measures) {
    for (const e of m.effects) {
      if (!matches(e.appliesTo, profile)) continue;
      const c = e.computation;
      if (c.kind === "bareme") continue; // porté par la réponse du service de calcul
      if (c.kind === "qualitatif") {
        const entry = qualitative.get(e.ticketLine) ?? { section: e.section, measures: [] };
        if (!entry.measures.includes(m)) entry.measures.push(m);
        qualitative.set(e.ticketLine, entry);
        continue;
      }
      if (c.kind === "formule" && c.formulaId === "retraite_age_depart") {
        const ageLegal = c.params.ageLegal;
        if (ageLegal === undefined) throw new Error(`${m.id} : paramètre ageLegal manquant`);
        const params = c.params.ageLegalMois === undefined ? { ageLegal } : { ageLegal, ageLegalMois: c.params.ageLegalMois };
        const r = retraiteAgeDepart(profile, params, AGE_TABLE, START_OF_TERM);
        if (!r.applicable || (r.ecartMois[0] === 0 && r.ecartMois[1] === 0)) continue;
        out.lines.push({
          ticketLine: e.ticketLine,
          section: e.section,
          nature: "sur",
          value: { low: round2(r.ecartMois[0] / 12), high: round2(r.ecartMois[1] / 12) }, // en années
          measureIds: [m.id],
          effectiveDate: m.schedule.effectiveDate,
        });
        continue;
      }
      // Formule ou estimation pas encore écrite : signalée, jamais remplacée par un chiffre approché.
      out.uncomputed.push({ ticketLine: e.ticketLine, reason: "Calcul pas encore disponible pour cette mesure.", measureIds: [m.id] });
    }
  }
  for (const [ticketLine, { section, measures }] of qualitative) {
    out.lines.push({
      ticketLine,
      section,
      nature: "qualitatif",
      measureIds: measures.map((m) => m.id),
      effectiveDate: [...measures.map((m) => m.schedule.effectiveDate)].sort()[0] ?? START_OF_TERM,
    });
  }
  return out;
}

export function buildTicket(programme: Programme, profile: Profile, calc: CalculResponse): Ticket {
  const byId = new Map(programme.measures.map((m) => [m.id, m]));
  const wallet = walletLines(programme, calc, byId);
  const effects = effectLines(programme, profile);
  const lines = [...wallet.lines, ...effects.lines];

  const money = lines.filter((l) => l.section === "portefeuille" && l.value);
  const sum = (f: (l: TicketLineResult) => number) => round2(money.reduce((s, l) => s + f(l), 0));
  const cumul = money.map((l) => {
    const months = monthsApplied(l.effectiveDate);
    return { low: (l.value?.low ?? 0) * months, high: (l.value?.high ?? 0) * months };
  });
  const hypotheses = [...new Set([...calc.actuel.hypotheses, ...(calc.candidats[programme.candidate.id]?.hypotheses ?? [])])];

  return Ticket.parse({
    candidateId: programme.candidate.id,
    baselineRulesYear: BASELINE_RULES_YEAR,
    horizonYear: HORIZON_YEAR,
    lines,
    solde: { sureOnly: sum((l) => (l.nature === "sur" ? (l.value?.low ?? 0) : 0)), low: sum((l) => l.value?.low ?? 0), high: sum((l) => l.value?.high ?? 0) },
    cumul5ans: { low: round2(cumul.reduce((s, c) => s + c.low, 0)), high: round2(cumul.reduce((s, c) => s + c.high, 0)) },
    pendingMeasures: programme.pendingCount,
    hypotheses,
    uncomputed: [...wallet.uncomputed, ...effects.uncomputed],
  });
}

/** Le service et le site doivent calculer sur la même version de chaque programme. */
export function corpusMismatch(programmes: readonly Programme[], calc: CalculResponse): string[] {
  return programmes.filter((p) => calc.corpus[p.candidate.id] !== p.corpusId).map((p) => p.candidate.id);
}
