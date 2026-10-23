/**
 * Indicateur « paramètres justes » : les valeurs chiffrées d'une mesure extraite
 * (taux, montants, âges, dates annoncées) doivent être exactement celles relevées à la main.
 */
import type { ExpectedValue } from "./ground-truth.js";
import type { MeasureDraft } from "./llm-schema.js";

export interface ExtractedValues {
  numbers: number[];
  dates: string[];
}

/** Valeurs portées par les effets et le calendrier. Une date estimée n'est pas une valeur du programme. */
export function extractedValues(m: Pick<MeasureDraft, "effects" | "schedule">): ExtractedValues {
  const numbers: number[] = [];
  for (const e of m.effects) {
    const c = e.computation;
    if (c.kind === "bareme") {
      for (const r of c.reform) if (typeof r.value === "number") numbers.push(r.value);
    } else if (c.kind === "formule" || c.kind === "estimation") {
      numbers.push(...Object.values(c.params));
    }
  }
  const dates = m.schedule.dateOrigin === "annoncee" ? [m.schedule.effectiveDate] : [];
  return { numbers, dates };
}

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
}

function matchesNumber(expected: ExpectedValue, x: number): boolean {
  if (typeof expected.value !== "number") return false;
  // Un taux peut être écrit 9 (en %) ou 0,09 (en fraction) : les deux sont justes.
  return close(x, expected.value) || (expected.unit === "pourcent" && close(x, expected.value / 100));
}

function matchesDate(expected: ExpectedValue, d: string): boolean {
  return typeof expected.value === "string" && d.startsWith(expected.value);
}

export interface ValueComparison {
  ok: boolean;
  missing: ExpectedValue[];
  unexpectedNumbers: number[];
  unexpectedDates: string[];
}

/** Juste si chaque valeur attendue est retrouvée et qu'aucune valeur extraite n'est en trop. */
export function compareValues(expected: readonly ExpectedValue[], got: ExtractedValues): ValueComparison {
  const missing = expected.filter(
    (e) => !got.numbers.some((x) => matchesNumber(e, x)) && !got.dates.some((d) => matchesDate(e, d)),
  );
  const unexpectedNumbers = got.numbers.filter((x) => !expected.some((e) => matchesNumber(e, x)));
  const unexpectedDates = got.dates.filter((d) => !expected.some((e) => matchesDate(e, d)));
  return {
    ok: missing.length === 0 && unexpectedNumbers.length === 0 && unexpectedDates.length === 0,
    missing,
    unexpectedNumbers,
    unexpectedDates,
  };
}

/** Deux extractions portent-elles les mêmes valeurs ? (contrôle « double extraction ») */
export function sameValues(a: ExtractedValues, b: ExtractedValues): boolean {
  const sameNumbers = (xs: number[], ys: number[]) => xs.every((x) => ys.some((y) => close(x, y)));
  return (
    sameNumbers(a.numbers, b.numbers) &&
    sameNumbers(b.numbers, a.numbers) &&
    a.dates.every((d) => b.dates.includes(d)) &&
    b.dates.every((d) => a.dates.includes(d))
  );
}
