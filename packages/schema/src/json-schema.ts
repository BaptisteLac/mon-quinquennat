/** Schémas JSON dérivés de Zod, pour les services qui ne sont pas en TypeScript (calcul OpenFisca). */
import { zodToJsonSchema } from "zod-to-json-schema";
import { Profile, ReformLever } from "./measure.ts";

export function profileJsonSchema(): object {
  return zodToJsonSchema(Profile, { name: "Profile", $refStrategy: "none" });
}

/** Leviers de réforme : le service de calcul doit tous les connaître (test côté Python). */
export function reformLevers(): readonly string[] {
  return ReformLever.options;
}
