import type { Measure } from "@mon-quinquennat/schema";

/**
 * Nature d'une mesure, même vocabulaire visuel sur tous les écrans (PG1, F1, R6) :
 * - `chiffree` (motif plein) : au moins un effet calculé sur le profil (barème, formule, estimation) ;
 * - `qualitative` (motif hachuré) : règle précise ou partielle, sans montant calculable ;
 * - `floue` (motif en pointillés) : le programme ne donne pas assez de précision.
 */
export type NatureKind = "chiffree" | "qualitative" | "floue";

const LEGAL_PATH_LABELS: Record<Measure["legalPath"], string | null> = {
  decret: "décret",
  loi: "loi à voter",
  loi_de_finances: "loi de finances",
  revision_constitutionnelle: "révision de la Constitution",
  accord_ue: "accord européen",
  referendum: "référendum",
  inconnu: null,
};

const KIND_LABELS: Record<NatureKind, string> = {
  chiffree: "Chiffrée",
  qualitative: "Qualitative",
  floue: "Floue",
};

export function isComputable(m: Pick<Measure, "effects">): boolean {
  return m.effects.some((e) => e.computation.kind !== "qualitatif");
}

export function natureKind(m: Pick<Measure, "precision" | "effects">): NatureKind {
  if (m.precision === "floue") return "floue";
  return isComputable(m) ? "chiffree" : "qualitative";
}

/** Étiquette affichée : « Chiffrée · loi de finances », « Qualitative · loi à voter », « Floue ». */
export function natureLabel(m: Pick<Measure, "precision" | "effects" | "legalPath">): string {
  const kind = natureKind(m);
  const path = LEGAL_PATH_LABELS[m.legalPath];
  return path ? `${KIND_LABELS[kind]} · ${path}` : KIND_LABELS[kind];
}
