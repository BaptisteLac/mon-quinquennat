/** Schémas JSON dérivés de Zod, pour les services qui ne sont pas en TypeScript (calcul OpenFisca). */
import { zodToJsonSchema } from "zod-to-json-schema";
import { Profile } from "./measure.js";

export function profileJsonSchema(): object {
  return zodToJsonSchema(Profile, { name: "Profile", $refStrategy: "none" });
}
