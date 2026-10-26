/**
 * Interprète le mini-langage `Condition` des effets (« à qui s'applique ») sur un profil.
 * Code écrit et testé par nous : jamais de code produit par un LLM.
 */
import { childAgeBand, type Condition, type Profile } from "@mon-quinquennat/schema";

type Leaf = Extract<Condition, { field: string }>;
type Value = string | number | boolean | (string | number)[] | undefined;

/** Année où l'on se place pour les champs dérivés (âge des enfants) : celle du personnage, 2027. */
export const PROFILE_YEAR = 2027;

function fieldValue(field: Leaf["field"], p: Profile): Value {
  switch (field) {
    case "nbEnfants":
      return p.enfants.length;
    case "enfantsAgeBand":
      return p.enfants.flatMap((e) => childAgeBand(e.anneeNaissance, PROFILE_YEAR) ?? []);
    case "revenusFoyerMensuels":
      return p.revenusNetsMensuels + (p.revenusConjointNetsMensuels ?? 0);
    default:
      return p[field];
  }
}

function leafMatches(c: Leaf, p: Profile): boolean {
  const v = fieldValue(c.field, p);
  if (v === undefined) return false; // réponse non donnée : la condition n'est pas établie
  const values = Array.isArray(v) ? v : [v];
  switch (c.op) {
    case "eq":
      return values.some((x) => x === c.value);
    case "in":
      return Array.isArray(c.value) && values.some((x) => typeof x !== "boolean" && (c.value as (string | number)[]).includes(x));
    case "gte":
      return typeof c.value === "number" && values.some((x) => typeof x === "number" && x >= (c.value as number));
    case "lte":
      return typeof c.value === "number" && values.some((x) => typeof x === "number" && x <= (c.value as number));
  }
}

export function matches(c: Condition, p: Profile): boolean {
  if ("all" in c) return c.all.every((x) => matches(x, p));
  if ("any" in c) return c.any.some((x) => matches(x, p));
  if ("not" in c) return !matches(c.not, p);
  return leafMatches(c, p);
}
