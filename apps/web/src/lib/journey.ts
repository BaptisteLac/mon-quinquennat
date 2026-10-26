/**
 * Parcours de l'utilisateur : brouillon de profil, choix des programmes, versions des programmes vues.
 * Tout reste dans le navigateur (règle de confidentialité). Ce module est pur : la lecture et l'écriture
 * du stockage sont dans `journey-store.ts`.
 */
import { avatarAgeBand, Profile } from "@mon-quinquennat/schema";
import { z } from "zod";

export const ProfileDraft = Profile.deepPartial();
export type ProfileDraft = z.infer<typeof ProfileDraft>;
export type SituationPro = Profile["situationPro"];

export const MAX_CANDIDATES = 3;

export const Choice = z.object({
  candidats: z.array(z.string()).max(MAX_CANDIDATES),
  mystere: z.boolean(),
  /** Tiré au sort dans le navigateur au moment du choix, parmi les programmes non choisis. */
  mystereId: z.string().nullable(),
});
export type Choice = z.infer<typeof Choice>;

export const JOURNEY_VERSION = 1;
export const Journey = z.object({
  version: z.literal(JOURNEY_VERSION),
  savedAt: z.string().datetime(),
  profile: ProfileDraft,
  choix: Choice,
  /** Corpus de chaque programme choisi au moment du choix : signale une mise à jour au retour. */
  versions: z.record(z.string(), z.string()),
  /** Commune choisie, pour la réafficher (le profil ne garde que son code INSEE). */
  commune: z.object({ codePostal: z.string().regex(/^\d{5}$/), nom: z.string() }).optional(),
});
export type Journey = z.infer<typeof Journey>;

export function emptyJourney(now = new Date()): Journey {
  return { version: JOURNEY_VERSION, savedAt: now.toISOString(), profile: {}, choix: { candidats: [], mystere: true, mystereId: null }, versions: {} };
}

/* ------------------------------------------------------------------ */
/* Cohérence du brouillon : une réponse qui ne s'applique plus est retirée */
/* ------------------------------------------------------------------ */

export const WORKING: readonly SituationPro[] = ["salarie_prive", "fonctionnaire", "independant", "chef_entreprise"];
const PART_TIME: readonly SituationPro[] = ["salarie_prive", "fonctionnaire"];
const BUSINESS: readonly SituationPro[] = ["independant", "chef_entreprise"];
export const AGE_FIN_CARRIERE = 50;

export function isCouple(p: ProfileDraft): boolean {
  return p.situationFamiliale === "marie_pacse" || p.situationFamiliale === "couple_non_marie";
}
export function isTenant(p: ProfileDraft): boolean {
  return p.logement === "locataire_prive" || p.logement === "locataire_hlm";
}
export function asksPartTime(p: ProfileDraft): boolean {
  return p.situationPro !== undefined && PART_TIME.includes(p.situationPro);
}
export function asksBusiness(p: ProfileDraft): boolean {
  return p.situationPro !== undefined && BUSINESS.includes(p.situationPro);
}
export function asksCareerEnd(p: ProfileDraft): boolean {
  return p.situationPro !== undefined && WORKING.includes(p.situationPro) && (p.age ?? 0) >= AGE_FIN_CARRIERE;
}

/** Retire les réponses devenues sans objet (ex. le loyer d'un propriétaire). */
export function normalize(p: ProfileDraft): ProfileDraft {
  const out: ProfileDraft = { ...p };
  if (!isCouple(out)) {
    delete out.revenusConjointNetsMensuels;
    delete out.situationProConjoint;
  }
  if (!isTenant(out)) delete out.loyerMensuel;
  if (!asksPartTime(out)) delete out.tempsPartiel;
  if (!asksBusiness(out)) delete out.entreprise;
  else if (out.entreprise && out.entreprise.statut !== "micro") {
    const { chiffreAffairesAnnuel: _ca, activite: _act, ...rest } = out.entreprise;
    out.entreprise = rest;
  }
  if (out.situationPro !== "demandeur_emploi") delete out.indemnise;
  if (out.situationPro !== "etudiant") delete out.boursier;
  if (out.situationPro !== "retraite") delete out.pensionMensuelle;
  if (!asksCareerEnd(out)) {
    delete out.ageDepartPrevu;
    delete out.agePremierEmploi;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Étapes                                                              */
/* ------------------------------------------------------------------ */

/** Réponses manquantes de l'étape « Toi », en clair pour l'utilisateur. */
export function missingStep1(p: ProfileDraft): string[] {
  const missing: string[] = [];
  if (p.age === undefined) missing.push("ton âge");
  if (!p.genre) missing.push("ton genre");
  if (!p.situationFamiliale) missing.push("ta situation familiale");
  if (!p.enfants) missing.push("tes enfants à charge");
  else if (p.enfants.some((e) => e?.anneeNaissance === undefined)) missing.push("l'année de naissance de chaque enfant");
  if (!p.situationPro) missing.push("ta situation");
  if (asksPartTime(p) && p.tempsPartiel === undefined) missing.push("ton temps de travail");
  if (asksBusiness(p)) {
    const e = p.entreprise;
    if (!e?.statut) missing.push("le statut de ton entreprise");
    if (!e?.salaries) missing.push("le nombre de salariés");
    if (e?.statut === "micro") {
      if (e.chiffreAffairesAnnuel === undefined) missing.push("ton chiffre d'affaires");
      if (!e.activite) missing.push("ton type d'activité");
    }
  }
  if (p.situationPro === "demandeur_emploi" && p.indemnise === undefined) missing.push("si tu es indemnisé·e");
  if (p.situationPro === "etudiant" && p.boursier === undefined) missing.push("si tu es boursier·e");
  return missing;
}

/** Réponses manquantes de l'étape « Ta vie ». Loyer et commune sont facultatifs (calcul alors estimé ou absent). */
export function missingStep2(p: ProfileDraft): string[] {
  const missing: string[] = [];
  if (p.revenusNetsMensuels === undefined) missing.push(p.situationPro === "retraite" ? "ta pension" : "tes revenus");
  if (isCouple(p)) {
    if (p.revenusConjointNetsMensuels === undefined) missing.push("les revenus de ton/ta conjoint·e");
    if (!p.situationProConjoint) missing.push("la situation de ton/ta conjoint·e");
  }
  if (!p.logement) missing.push("ton logement");
  if (!p.lieuDeVie) missing.push("où tu vis");
  if (!p.mobilite) missing.push("comment tu te déplaces");
  return missing;
}

export function completeProfile(p: ProfileDraft): Profile | null {
  const parsed = Profile.safeParse(normalize(p));
  return parsed.success ? parsed.data : null;
}

export type Step = "toi" | "vie" | "candidats";
export const STEP_ROUTES: Record<Step, string> = { toi: "/personnage", vie: "/personnage/vie", candidats: "/candidats" };
export const STEP_LABELS: Record<Step, string> = { toi: "Ton perso", vie: "Ta vie au quotidien", candidats: "Le choix des programmes" };

/** Étape où reprendre : la première qui n'est pas complète. */
export function resumeStep(j: Journey): Step {
  if (missingStep1(j.profile).length > 0) return "toi";
  if (missingStep2(j.profile).length > 0 || !completeProfile(j.profile)) return "vie";
  return "candidats";
}

export function hasStarted(j: Journey): boolean {
  return Object.keys(j.profile).length > 0;
}

/* ------------------------------------------------------------------ */
/* Choix des programmes                                                */
/* ------------------------------------------------------------------ */

export function toggleCandidate(choice: Choice, id: string): Choice {
  if (choice.candidats.includes(id)) return { ...choice, candidats: choice.candidats.filter((c) => c !== id) };
  if (choice.candidats.length >= MAX_CANDIDATES) return choice;
  return { ...choice, candidats: [...choice.candidats, id] };
}

/** Programmes que le mystère peut tirer : ceux qui ne sont pas déjà choisis. */
export function mysteryPool(allIds: readonly string[], choice: Pick<Choice, "candidats">): string[] {
  return allIds.filter((id) => !choice.candidats.includes(id));
}

export function drawMystery(allIds: readonly string[], choice: Choice, random: () => number): Choice {
  const pool = mysteryPool(allIds, choice);
  if (!choice.mystere || pool.length === 0) return { ...choice, mystereId: null };
  if (choice.mystereId && pool.includes(choice.mystereId)) return choice; // déjà tiré : on ne retire pas au sort
  return { ...choice, mystereId: pool[Math.floor(random() * pool.length)] ?? null };
}

/** Programmes choisis dont le corpus a changé depuis le choix. */
export function updatedProgrammes(j: Journey, current: Readonly<Record<string, string>>): string[] {
  return Object.entries(j.versions)
    .filter(([id, corpus]) => current[id] !== undefined && current[id] !== corpus)
    .map(([id]) => id);
}

/* ------------------------------------------------------------------ */
/* Textes                                                              */
/* ------------------------------------------------------------------ */

type Genre = Profile["genre"];
function inflect(genre: Genre | undefined, masc: string, fem: string, neutral: string): string {
  return genre === "femme" ? fem : genre === "homme" ? masc : neutral;
}

const SITUATION_WORDS: Record<SituationPro, [string, string, string]> = {
  salarie_prive: ["salarié", "salariée", "salarié·e"],
  fonctionnaire: ["fonctionnaire", "fonctionnaire", "fonctionnaire"],
  independant: ["indépendant", "indépendante", "indépendant·e"],
  chef_entreprise: ["chef d'entreprise", "cheffe d'entreprise", "chef·fe d'entreprise"],
  demandeur_emploi: ["demandeur d'emploi", "demandeuse d'emploi", "demandeur·se d'emploi"],
  etudiant: ["étudiant", "étudiante", "étudiant·e"],
  retraite: ["retraité", "retraitée", "retraité·e"],
  sans_activite: ["sans activité", "sans activité", "sans activité"],
};

/** « 34 ans, mariée, 2 enfants, salariée ». */
export function describeProfile(p: ProfileDraft): string {
  const parts: string[] = [];
  if (p.age !== undefined) parts.push(`${p.age} ans`);
  if (p.situationFamiliale === "marie_pacse") parts.push(inflect(p.genre, "marié ou pacsé", "mariée ou pacsée", "marié·e ou pacsé·e"));
  if (p.situationFamiliale === "couple_non_marie") parts.push("en couple");
  if (p.situationFamiliale === "seul") parts.push(inflect(p.genre, "seul", "seule", "seul·e"));
  if (p.enfants) parts.push(p.enfants.length === 0 ? "sans enfant à charge" : p.enfants.length === 1 ? "1 enfant" : `${p.enfants.length} enfants`);
  if (p.situationPro) {
    const [m, f, n] = SITUATION_WORDS[p.situationPro];
    parts.push(inflect(p.genre, m, f, n));
  }
  return parts.join(", ");
}

export { avatarAgeBand };
