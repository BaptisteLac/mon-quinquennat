/**
 * Contrôle « chiffres fidèles » : chaque nombre écrit dans une fiche (titre, résumés, sous-mesures,
 * phrases, paramètres de calcul, date annoncée) doit figurer dans les citations de la mesure.
 * C'est la garantie mécanique qu'une reformulation ne change aucun chiffre du programme.
 */
import type { CheckResult } from "./checks.js";
import { allQuotes, type MeasureDraft } from "./llm-schema.js";
import { normalizeText } from "./normalize.js";

/**
 * Nombres d'un texte, au format français : « 3 417 », « 55,6 », « 120 % », « 1.000 ».
 * Les séparateurs de milliers (espace, espace fine, point) sont retirés ; la virgule est décimale.
 */
export function numbersIn(text: string): number[] {
  const t = normalizeText(text);
  const out: number[] = [];
  for (const m of t.matchAll(/\d{1,3}(?:[ .]\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g)) {
    const raw = m[0];
    // « 1.000 » ou « 3 417 » : milliers ; « 2,5 » : décimale.
    const n = Number(raw.replace(/[ .](?=\d{3}\b)/g, "").replace(",", "."));
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

const close = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

/**
 * Une valeur de fiche correspond à un nombre de la citation si elle lui est égale, ou égale
 * à une écriture équivalente : fraction ↔ pourcentage (0,09 ↔ 9 %), unités (120 milliards ↔ 120 000 000 000).
 */
export function supportedBy(value: number, quoted: readonly number[]): boolean {
  const scales = [1, 100, 0.01, 1e3, 1e6, 1e9, 1e-3, 1e-6, 1e-9];
  return quoted.some((q) => scales.some((s) => close(value, q * s)));
}

type FigureFields = Pick<MeasureDraft, "title" | "summary" | "sources" | "rationale" | "subMeasures" | "effects" | "schedule">;

/** Toutes les valeurs chiffrées que la fiche affirme, avec leur provenance (pour le détail du contrôle). */
export function claimedFigures(m: FigureFields): { where: string; value: number }[] {
  const out: { where: string; value: number }[] = [];
  const texts: [string, string][] = [
    ["titre", m.title],
    ["résumé simple", m.summary.simple],
    ["résumé", m.summary.normal],
    ...m.subMeasures.map((s, i): [string, string] => [`sous-mesure ${i + 1}`, s.text]),
    ...m.effects.flatMap((e, i): [string, string][] =>
      e.sentence ? [[`effet ${i + 1}`, e.sentence.simple], [`effet ${i + 1}`, e.sentence.normal]] : [],
    ),
  ];
  for (const [where, text] of texts) for (const value of numbersIn(text)) out.push({ where, value });
  m.effects.forEach((e, i) => {
    const c = e.computation;
    if (c.kind === "bareme") {
      for (const r of c.reform) if (typeof r.value === "number") out.push({ where: `paramètre ${i + 1}`, value: r.value });
    } else if (c.kind === "formule" || c.kind === "estimation") {
      for (const v of Object.values(c.params)) out.push({ where: `paramètre ${i + 1}`, value: v });
    }
  });
  if (m.schedule.dateOrigin === "annoncee") out.push({ where: "date annoncée", value: Number(m.schedule.effectiveDate.slice(0, 4)) });
  return out;
}

/** Début du quinquennat retenu : le mandat en cours s'achève le 13 mai 2027. */
export const START_OF_TERM = "2027-05-14";

/** Citation qui annonce une mise en œuvre dès l'entrée en fonction. */
const IMMEDIATE = /(le premier jour|le jour même|dès (son|mon|notre) arrivée au pouvoir|dès (son|mon|notre) élection|dès (l'|son |mon )entrée en fonctions?|dès le début du (quinquennat|mandat))/i;

/** La date d'effet d'une mesure annoncée « le premier jour » ne peut pas être postérieure au début du mandat. */
export function announcesImmediateStart(m: Pick<FigureFields, "sources" | "rationale" | "subMeasures">): boolean {
  return allQuotes(m).some((q) => IMMEDIATE.test(q.quote.replace(/’/g, "'")));
}

export function checkFigures(m: FigureFields): CheckResult {
  const quoted = allQuotes(m).flatMap((q) => numbersIn(q.quote));
  const missing = claimedFigures(m).filter((f) => !supportedBy(f.value, quoted));
  const problems = missing.length ? [`absent des citations : ${missing.map((f) => `${f.value} (${f.where})`).join(", ")}`] : [];
  // Erreur corrigée : « Le premier jour » publié avec la date par défaut (1er janvier 2028).
  if (announcesImmediateStart(m) && m.schedule.effectiveDate > START_OF_TERM) {
    problems.push(`date d'effet ${m.schedule.effectiveDate} postérieure au début du mandat, alors que la citation annonce une mise en œuvre immédiate`);
  }
  return problems.length === 0
    ? { id: "chiffres_fideles", passed: true }
    : { id: "chiffres_fideles", passed: false, detail: problems.join(" ; ") };
}
