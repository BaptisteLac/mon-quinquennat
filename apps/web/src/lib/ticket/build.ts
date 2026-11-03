/**
 * Assemble le ticket « Ma vie en 2032 » de chaque candidat pour un profil.
 *
 * - Portefeuille : écart entre les montants OpenFisca du candidat et ceux des règles actuelles
 *   (réponse du service de calcul), rattaché aux mesures dont les leviers touchent ce montant.
 * - Temps : formules de la liste blanche (`@mon-quinquennat/formulas`).
 * - Qualitatif : effets dont la condition « à qui s'applique » est vraie pour le profil.
 * Aucun montant n'est produit ici autrement que par une soustraction de montants calculés.
 */
import {
  baisseCotisationsSalaire,
  deductionInteretsEmprunt,
  energieFacture,
  gainPourcentSalaireNet,
  impotSupprimeParDecile,
  LegalAgeTable,
  PublicData,
  retraiteAgeDepart,
  unitesDeConsommation,
  type Range,
} from "@mon-quinquennat/formulas";
import ageLegalActuel from "@mon-quinquennat/formulas/data/age-legal-actuel.json";
import donneesPubliques from "@mon-quinquennat/formulas/data/donnees-publiques.json";
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
  rsa: { ticketLine: "prime_activite", sign: 1 },
  aides_logement: { ticketLine: "apl", sign: 1 },
  allocations_familiales: { ticketLine: "allocations_familiales", sign: 1 },
  minimum_vieillesse: { ticketLine: "pension", sign: 1 },
  salaire_net: { ticketLine: "salaire_net", sign: 1 },
};

/** En dessous, l'écart est un arrondi de calcul, pas un effet. */
const MIN_DELTA = 0.5;

const AGE_TABLE = LegalAgeTable.parse(ageLegalActuel);
const PUBLIC_DATA = new Map(PublicData.parse(donneesPubliques).map((d) => [d.id, d]));

/** Donnée publique d'une hypothèse ; « programme » : le cas type vient d'une citation de la mesure. */
export function publicDatum(id: string) {
  if (id === "programme") return null;
  const d = PUBLIC_DATA.get(id);
  if (!d) throw new Error(`Donnée publique inconnue : ${id}`);
  return d;
}

/** Salaires nets mensuels des salariés du foyer (adulte et conjoint). */
function salaires(profile: Profile): number[] {
  const out: number[] = [];
  if (profile.situationPro === "salarie_prive") out.push(profile.revenusNetsMensuels);
  if (profile.situationProConjoint === "salarie_prive") out.push(profile.revenusConjointNetsMensuels ?? 0);
  return out;
}

const ACTIFS: readonly Profile["situationPro"][] = ["salarie_prive", "fonctionnaire", "independant", "chef_entreprise"];

/** Âge des enfants au début du mandat. */
function agesEnfants(profile: Profile): number[] {
  const year = Number(START_OF_TERM.slice(0, 4));
  return profile.enfants.map((e) => year - e.anneeNaissance);
}

/** Série de seuils de déciles : même identifiant, numéro de décile remplacé (`…-d3-2024` → `…-d6-2024`). */
const decileId = (dataSourceId: string, n: number) => dataSourceId.replace(/-d\d+-/, `-d${n}-`);

/**
 * Données publiques lues par une estimation en plus de `dataSourceId`, citées dans les hypothèses.
 */
function extraData(formulaId: string, params: Record<string, number>, dataSourceId: string): string[] {
  if (formulaId !== "impot_supprime_decile") return [];
  const { decileFin, decileSuivant } = params;
  return [
    decileId(dataSourceId, decileFin ?? 0),
    ...(decileSuivant === undefined ? [] : [decileId(dataSourceId, decileSuivant)]),
    "insee-unites-de-consommation",
  ];
}

function enfantsMineurs(profile: Profile): number {
  const year = Number(START_OF_TERM.slice(0, 4));
  return profile.enfants.filter((e) => year - e.anneeNaissance < 18).length;
}

/** Montant d'une estimation de la liste blanche, ou null si la formule ne s'applique pas encore. */
function estimate(
  formulaId: string,
  params: Record<string, number>,
  dataSourceId: string,
  profile: Profile,
  calc: CalculResponse,
  candidateId: string,
): Range | null {
  const datum = publicDatum(dataSourceId);
  switch (formulaId) {
    case "baisse_cotisations_salaire":
      return baisseCotisationsSalaire(salaires(profile), params, datum?.valeur ?? null);
    case "energie_facture":
      if (!datum) throw new Error("La facture d'électricité moyenne doit venir d'une donnée publique.");
      return energieFacture(params, datum.valeur);
    case "gain_pourcent_salaire_net":
      // Condition personnelle (carrière, trimestres…) : le salaire est celui de la personne, pas du conjoint.
      return gainPourcentSalaireNet(profile.situationPro === "salarie_prive" ? profile.revenusNetsMensuels : null, params);
    case "gain_salaire_reference_personne":
      // Cas type personnel (« si ton entreprise… ») : le salaire de la personne, pas celui du conjoint.
      if (!datum) throw new Error("Le salaire de référence doit venir d'une donnée publique.");
      return baisseCotisationsSalaire(profile.situationPro === "salarie_prive" ? [profile.revenusNetsMensuels] : [], params, datum.valeur);
    case "impot_supprime_decile": {
      if (!datum) throw new Error("Les seuils de déciles doivent venir de données publiques.");
      const { decileDebut, decileFin, decileSuivant } = params;
      if (decileDebut === undefined || decileFin === undefined) throw new Error("Paramètres decileDebut et decileFin manquants.");
      if (datum.id !== decileId(datum.id, decileDebut - 1)) throw new Error(`${datum.id} n'est pas le seuil du décile ${decileDebut - 1}.`);
      const valeur = (n: number) => publicDatum(decileId(datum.id, n))?.valeur ?? 0;
      const seuils = { bas: datum.valeur, haut: valeur(decileFin), suivant: decileSuivant === undefined ? null : valeur(decileSuivant) };
      // Hypothèse affichée : niveau de vie estimé par les revenus nets du foyer, sans prestations ni impôt.
      const adultes = profile.situationFamiliale === "seul" ? 1 : 2;
      const revenus = profile.revenusNetsMensuels + (adultes === 2 ? (profile.revenusConjointNetsMensuels ?? 0) : 0);
      const niveauDeVie = (12 * revenus) / unitesDeConsommation(adultes, agesEnfants(profile));
      const travaille = ACTIFS.includes(profile.situationPro) || (profile.situationProConjoint !== undefined && ACTIFS.includes(profile.situationProConjoint));
      const impot = calc.candidats[candidateId]?.montants.impot_revenu ?? calc.actuel.montants.impot_revenu ?? 0;
      return impotSupprimeParDecile(niveauDeVie, travaille, impot, params, seuils);
    }
    case "deduction_interets_emprunt":
      // Une réduction ne dépasse pas l'impôt dû une fois les autres réformes du programme appliquées.
      return deductionInteretsEmprunt(
        enfantsMineurs(profile),
        params,
        calc.candidats[candidateId]?.montants.impot_revenu ?? calc.actuel.montants.impot_revenu,
      );
    default:
      return null;
  }
}

/** Texte de l'hypothèse affichée : libellé de la mesure et donnée publique citée. */
export function hypothesisText(label: string, dataSourceId: string): string {
  const d = publicDatum(dataSourceId);
  return d ? `${label} Source : ${d.publisher}, « ${d.citation} ».` : label;
}

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
  // Plusieurs montants peuvent tenir sur une ligne (RSA et prime d'activité) : on les additionne.
  const byLine = new Map<TicketLine, { base: number; after: number; measures: Measure[]; missing: string | null }>();
  for (const [output, ids] of Object.entries(cand.mesures) as [CalcOutput, string[]][]) {
    const measures = ids.flatMap((id) => byId.get(id) ?? []);
    if (measures.length === 0) continue;
    const { ticketLine, sign } = OUTPUT_LINES[output];
    const entry = byLine.get(ticketLine) ?? { base: 0, after: 0, measures: [], missing: null };
    for (const m of measures) if (!entry.measures.includes(m)) entry.measures.push(m);
    const base = calc.actuel.montants[output];
    const after = cand.montants[output];
    if (base === null || after === null) {
      entry.missing ??= cand.nonCalcules[output] ?? calc.actuel.nonCalcules[output] ?? "Montant non calculable pour ce profil.";
    } else {
      entry.base += sign * base;
      entry.after += sign * after;
    }
    byLine.set(ticketLine, entry);
  }
  for (const [ticketLine, { base, after, measures, missing }] of byLine) {
    const measureIds = measures.map((m) => m.id);
    if (missing !== null) {
      out.uncomputed.push({ ticketLine, reason: missing, measureIds });
      continue;
    }
    const delta = round2(after - base);
    if (Math.abs(delta) < MIN_DELTA) continue;
    out.lines.push({
      ticketLine,
      section: "portefeuille",
      nature: "sur",
      value: { low: delta, high: delta },
      baseline: round2(Math.abs(base)),
      measureIds,
      effectiveDate: latest(measures.map((m) => m.schedule.effectiveDate)),
    });
  }
  return out;
}

function effectLines(programme: Programme, profile: Profile, calc: CalculResponse): Built & { hypotheses: string[] } {
  const out: Built & { hypotheses: string[] } = { lines: [], uncomputed: [], hypotheses: [] };
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
      if (c.kind === "estimation") {
        const v = estimate(c.formulaId, c.params, c.hypothesis.dataSourceId, profile, calc, programme.candidate.id);
        if (v !== null) {
          if (Math.abs(v.low) < MIN_DELTA && Math.abs(v.high) < MIN_DELTA) continue;
          out.lines.push({
            ticketLine: e.ticketLine,
            section: e.section,
            nature: "estime",
            value: v,
            measureIds: [m.id],
            effectiveDate: m.schedule.effectiveDate,
            ...(c.hypothesis.condition ? { condition: c.hypothesis.condition } : {}),
          });
          out.hypotheses.push(hypothesisText(c.hypothesis.label, c.hypothesis.dataSourceId));
          for (const id of extraData(c.formulaId, c.params, c.hypothesis.dataSourceId)) out.hypotheses.push(hypothesisText("", id).trim());
          continue;
        }
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
  const effects = effectLines(programme, profile, calc);
  const lines = [...wallet.lines, ...effects.lines];

  // Un cas type conditionnel (« si tu as 43 années cotisées ») est affiché à part : hors solde et hors cumul.
  const money = lines.filter((l) => l.section === "portefeuille" && l.value && !l.condition);
  const sum = (f: (l: TicketLineResult) => number) => round2(money.reduce((s, l) => s + f(l), 0));
  const cumul = money.map((l) => {
    const months = monthsApplied(l.effectiveDate);
    return { low: (l.value?.low ?? 0) * months, high: (l.value?.high ?? 0) * months };
  });
  const hypotheses = [
    ...new Set([...calc.actuel.hypotheses, ...(calc.candidats[programme.candidate.id]?.hypotheses ?? []), ...effects.hypotheses]),
  ];

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
