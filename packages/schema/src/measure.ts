/**
 * Mon quinquennat — schéma de données
 *
 * Principe : chaque chiffre affiché sur un ticket remonte à
 *   une mesure publiée → une citation exacte d'un programme archivé → un calcul déterministe.
 * Le LLM propose (extraction, réécriture), des contrôles automatiques valident, le code calcule.
 * Le LLM ne calcule jamais un montant et ne génère jamais de code exécutable.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* 1. Le profil (produit par l'onboarding, gardé sur l'appareil)        */
/* ------------------------------------------------------------------ */

export const ChildAgeBand = z.enum(["0_2", "3_10", "11_17", "18_25"]);

export const SituationPro = z.enum([
  "salarie_prive",
  "fonctionnaire",
  "independant",
  "chef_entreprise",
  "demandeur_emploi",
  "etudiant",
  "retraite",
  "sans_activite",
]);

export const Profile = z.object({
  age: z.number().int().min(18).max(110),
  /** Sert à l'avatar. N'entre dans un calcul que si une mesure en dépend explicitement. */
  genre: z.enum(["femme", "homme", "autre"]),
  situationFamiliale: z.enum(["seul", "marie_pacse", "couple_non_marie"]),
  /** Année de naissance : la tranche d'âge ne suffit pas (majoration des allocations familiales à 14 ans). */
  enfants: z.array(z.object({ anneeNaissance: z.number().int().min(1995).max(2032) })),
  situationPro: SituationPro,
  tempsPartiel: z.boolean().optional(),
  revenusNetsMensuels: z.number().min(0),
  revenusConjointNetsMensuels: z.number().min(0).optional(),
  situationProConjoint: SituationPro.optional(), // en couple
  logement: z.enum(["locataire_prive", "locataire_hlm", "proprio_credit", "proprio_sans_credit", "heberge"]),
  /** Hors charges, locataire : sans lui, pas d'aides au logement. */
  loyerMensuel: z.number().min(0).optional(),
  lieuDeVie: z.enum(["grande_ville", "ville_moyenne", "peripherie", "rural", "outre_mer"]),
  /** Code INSEE de la commune (choisie à partir du code postal) : zone des aides au logement. */
  codeCommune: z
    .string()
    .regex(/^(\d{5}|2[AB]\d{3})$/)
    .optional(),
  mobilite: z.enum(["voiture_thermique", "voiture_electrique", "transports", "velo_pied"]),
  // Questions conditionnelles
  ageDepartPrevu: z.number().int().optional(), // 50 ans et plus, en activité
  agePremierEmploi: z.number().int().optional(), // carrières longues
  pensionMensuelle: z.number().min(0).optional(), // retraité
  entreprise: z
    .object({
      statut: z.enum(["micro", "independant", "societe"]),
      salaries: z.enum(["0", "1_9", "10_49", "50_plus"]),
      /** Micro-entreprise : le revenu net ne suffit pas au calcul de l'impôt et de la prime d'activité. */
      chiffreAffairesAnnuel: z.number().min(0).optional(),
      activite: z.enum(["vente", "services", "liberale"]).optional(),
    })
    .optional(),
  indemnise: z.boolean().optional(), // demandeur d'emploi
  boursier: z.boolean().optional(), // étudiant
  // Étape « Affiner », facultative
  handicapOuAidant: z.enum(["non", "moi", "proche"]).optional(),
  patrimoine: z.enum(["moins_100k", "100k_1m", "plus_1m", "ne_sait_pas"]).optional(),
});
export type Profile = z.infer<typeof Profile>;

/** Tranche d'âge d'un enfant à une date (champ `enfantsAgeBand` des conditions) ; null au-delà de 25 ans. */
export function childAgeBand(anneeNaissance: number, annee: number): z.infer<typeof ChildAgeBand> | null {
  const age = annee - anneeNaissance;
  if (age < 0) return null;
  if (age <= 2) return "0_2";
  if (age <= 10) return "3_10";
  if (age <= 17) return "11_17";
  if (age <= 25) return "18_25";
  return null;
}

/** Tranche d'âge de l'avatar : 18–24, 25–44, 45–64, 65 et plus. */
export type AvatarAgeBand = "18_24" | "25_44" | "45_64" | "65_plus";
export function avatarAgeBand(age: number): AvatarAgeBand {
  if (age < 25) return "18_24";
  if (age < 45) return "25_44";
  if (age < 65) return "45_64";
  return "65_plus";
}

/* ------------------------------------------------------------------ */
/* 2. Les sources                                                      */
/* ------------------------------------------------------------------ */

/** Une version datée et archivée d'un programme. On ne cite jamais un document non archivé. */
export const ProgrammeDocument = z.object({
  id: z.string(),
  candidateId: z.string(),
  publisher: z.string(), // nom du parti ou de la campagne, affiché tel quel
  title: z.string(),
  docType: z.enum(["programme", "page_officielle"]),
  officialUrl: z.string().url(), // la version qui fait foi
  archiveUrl: z.string().url(), // copie figée (ex. Internet Archive)
  sha256: z.string().length(64), // empreinte du fichier archivé
  publishedAt: z.string().date().optional(),
  retrievedAt: z.string().datetime(),
  supersedes: z.string().optional(), // version précédente → suivi des changements de position
});
export type ProgrammeDocument = z.infer<typeof ProgrammeDocument>;

/** Données publiques pour les barèmes, le contexte et les hypothèses (INSEE, Légifrance…). */
export const DataSource = z.object({
  id: z.string(),
  publisher: z.string(), // « INSEE », « Légifrance »
  title: z.string(),
  docType: z.enum(["statistique_publique", "texte_de_loi", "bareme_officiel", "chiffrage_independant"]),
  url: z.string().url(),
  year: z.number().int(),
  retrievedAt: z.string().datetime(),
});
export type DataSource = z.infer<typeof DataSource>;

/** Citation exacte. Contrôle automatique : `quote` doit exister mot pour mot dans le texte archivé. */
export const SourceQuote = z.object({
  documentId: z.string(),
  /** Page du PDF (1 = première page du fichier) ; pour une page web : 1, ou le numéro de partie d'une très longue page. */
  page: z.number().int().positive(),
  quote: z.string().min(10).max(600), // court : droit de citation
});
export type SourceQuote = z.infer<typeof SourceQuote>;

/* ------------------------------------------------------------------ */
/* 3. À qui s'applique un effet : mini-langage de conditions           */
/*    (interprété par notre code, jamais du code généré par le LLM)    */
/* ------------------------------------------------------------------ */

export const ProfileField = z.enum([
  "age",
  "genre",
  "situationFamiliale",
  "nbEnfants",
  "enfantsAgeBand",
  "situationPro",
  "tempsPartiel",
  "revenusFoyerMensuels",
  "logement",
  "lieuDeVie",
  "mobilite",
  "patrimoine",
  "handicapOuAidant",
]);

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | {
      field: z.infer<typeof ProfileField>;
      op: "eq" | "in" | "gte" | "lte";
      value: string | number | boolean | (string | number)[];
    };

export const Condition: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(Condition) }),
    z.object({ any: z.array(Condition) }),
    z.object({ not: Condition }),
    z.object({
      field: ProfileField,
      op: z.enum(["eq", "in", "gte", "lte"]),
      value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))]),
    }),
  ]),
);

/* ------------------------------------------------------------------ */
/* 4. Comment on calcule : trois natures de lignes                     */
/* ------------------------------------------------------------------ */

/** Sûr : on modifie des paramètres de la législation, OpenFisca calcule l'écart. */
/**
 * Leviers de la législation qu'une mesure peut modifier (liste fermée). Le nom est clair ; le service
 * de calcul le traduit en paramètre OpenFisca et fait les conversions d'unité. La valeur vient
 * toujours d'une citation ; un levier sans valeur (suppression) prend `value: null`.
 */
export const ReformLever = z.enum([
  /** Minimum vieillesse (ASPA) d'une personne seule, en €/mois. */
  "minimum_vieillesse_personne_seule_mensuel",
  /** Suppression du plafond de l'avantage du quotient familial par demi-part pour enfant (sans valeur). */
  "quotient_familial_sans_plafond",
  /** Taux de la 2e tranche du barème de l'impôt sur le revenu, en % (ex. 11). */
  "impot_revenu_taux_tranche_2",
]);

const BaremeComputation = z.object({
  kind: z.literal("bareme"),
  engine: z.literal("openfisca"),
  reform: z.array(
    z.object({
      parameter: ReformLever,
      value: z.number().nullable(),
      from: z.string().date(),
    }),
  ),
});

/** Sûr aussi, quand OpenFisca ne couvre pas : une formule écrite et testée par nous (liste fermée). */
const FormulaComputation = z.object({
  kind: z.literal("formule"),
  formulaId: z.enum(["retraite_age_depart", "revalorisation_pension", "smic_mensuel_net"]),
  params: z.record(z.string(), z.number()),
});

/** Estimé (≈) : dépend d'une hypothèse de consommation moyenne, affichée à l'utilisateur. */
const EstimateComputation = z.object({
  kind: z.literal("estimation"),
  formulaId: z.enum(["tva_consommation", "energie_facture"]),
  params: z.record(z.string(), z.number()),
  hypothesis: z.object({
    label: z.string(), // « Consommation d'électricité moyenne d'un foyer de 4 personnes »
    dataSourceId: z.string(),
  }),
});

/** Qualitatif : pas de montant, une phrase factuelle. */
const QualitativeComputation = z.object({ kind: z.literal("qualitatif") });

export const Computation = z.discriminatedUnion("kind", [
  BaremeComputation,
  FormulaComputation,
  EstimateComputation,
  QualitativeComputation,
]);

/* ------------------------------------------------------------------ */
/* 5. La mesure et ses effets                                          */
/* ------------------------------------------------------------------ */

export const Theme = z.enum([
  "fiscalite",
  "prestations",
  "retraite",
  "travail",
  "logement",
  "energie",
  "education",
  "sante",
  "transport",
  "famille",
  "entreprise",
  "finances_publiques",
  "institutions",
  "securite",
  "justice",
  "immigration",
  "agriculture",
  "environnement",
  "international",
  "numerique",
  "autre",
]);

export const TicketLine = z.enum([
  // Ton portefeuille (€/mois)
  "impot_revenu",
  "prime_activite",
  "allocations_familiales",
  "apl",
  "salaire_net",
  "pension",
  "taxe_fonciere",
  "succession",
  "energie",
  "tva",
  // Ton temps
  "age_depart_retraite",
  "temps_travail",
  // Ta vie
  "ecole",
  "sante",
  "logement",
  "transport",
]);

const TwoLevels = z.object({ simple: z.string(), normal: z.string() });

export const Effect = z.object({
  id: z.string(),
  ticketLine: TicketLine,
  section: z.enum(["portefeuille", "temps", "vie"]),
  appliesTo: Condition,
  computation: Computation,
  sentence: TwoLevels.optional(), // pour « Ta vie » et le verso des cartes
});

/** Quand la mesure s'applique : date annoncée par le programme, ou estimée par une règle explicite. */
export const Schedule = z.object({
  effectiveDate: z.string().date(),
  dateOrigin: z.enum(["annoncee", "estimee"]),
  estimationRule: z.string().optional(), // ex. « prochaine loi de finances » si estimée
  phaseIn: z
    .array(z.object({ from: z.string().date(), share: z.number().min(0).max(1) }))
    .optional(), // mesure progressive
});

/** Un chiffre de contexte (« aujourd'hui, le taux est de 11 % »), toujours sourcé. */
export const ContextFact = z.object({
  label: z.string(),
  value: z.string(), // affiché tel quel, ex. « 11 % »
  dataSourceId: z.string(),
});

/**
 * Contrôles automatiques. Les programmes officiels font foi : les contrôles vérifient que l'extraction
 * ne change ni les phrases (citation exacte), ni les chiffres (chiffres fidèles), ni le sens (relecture du sens).
 * `relecture_croisee`, `double_extraction`, `vraisemblance` et `neutralite` sont facultatifs.
 */
export const CheckId = z.enum([
  "format",
  "citation_exacte",
  "chiffres_fideles",
  "relecture_sens",
  "relecture_croisee",
  "double_extraction",
  "vraisemblance",
  "neutralite",
]);

export const Measure = z.object({
  id: z.string(),
  candidateId: z.string(),
  theme: Theme,
  title: z.string().max(120),
  summary: TwoLevels, // « En clair »
  sources: z.array(SourceQuote).min(1), // sans citation, la mesure n'existe pas
  /** « Pourquoi, selon le candidat » : toujours une citation, jamais une reformulation présentée comme un fait. */
  rationale: SourceQuote.optional(),
  subMeasures: z.array(z.object({ text: z.string(), source: SourceQuote })).default([]),
  context: z.array(ContextFact).default([]),

  precision: z.enum(["precise", "partielle", "floue"]),
  legalPath: z.enum([
    "decret",
    "loi",
    "loi_de_finances",
    "revision_constitutionnelle",
    "accord_ue",
    "referendum",
    "inconnu",
  ]),
  schedule: Schedule,
  effects: z.array(Effect),

  /** Une hausse de TVA qui finance une baisse d'impôt : on relie les deux pour que le ticket montre qui paie. */
  financesMeasureIds: z.array(z.string()).default([]),

  /** Coût pour la France (V1, « ticket de la France ») : plusieurs chiffrages, jamais un seul. */
  costEstimates: z
    .array(
      z.object({
        origin: z.enum(["candidat", "independant"]),
        organisation: z.string(),
        billionEurPerYear: z.number(),
        url: z.string().url(),
        publishedAt: z.string().date(),
      }),
    )
    .default([]),

  /** Vérification automatique. Seul `auto_validee` ou `validee_humain` est publié. */
  review: z.object({
    status: z.enum(["auto_validee", "en_attente", "validee_humain", "rejetee"]),
    riskLevel: z.enum(["chiffre_ticket", "qualitatif"]), // fixe le seuil à atteindre
    score: z.number().min(0).max(1),
    checks: z.array(z.object({ id: CheckId, passed: z.boolean(), detail: z.string().optional() })),
    extractedBy: z.object({ model: z.string(), promptVersion: z.string(), at: z.string().datetime() }),
    crossCheckedBy: z.object({ model: z.string(), at: z.string().datetime() }).optional(),
    issueUrl: z.string().url().optional(), // file d'exceptions
    decidedBy: z.string().optional(), // commande humaine éventuelle
  }),
  version: z.number().int().positive(),
  supersededBy: z.string().optional(),
});
export type Measure = z.infer<typeof Measure>;

/** Une mesure n'apparaît dans l'outil que si sa vérification l'autorise. */
export function isPublishable(m: Pick<Measure, "review">): boolean {
  return m.review.status === "auto_validee" || m.review.status === "validee_humain";
}

export const Candidate = z.object({
  id: z.string(),
  displayName: z.string(), // nom complet, toujours affiché en clair
  party: z.string(), // nom complet du parti, toujours affiché en clair
  status: z.enum(["declaree", "officielle", "retire"]),
  withdrawnAt: z.string().date().optional(),
  /** Badge de forme tiré au sort, seul repère dans les comparaisons. Jamais de couleur de parti. */
  badge: z.enum(["rond", "triangle", "carre", "losange", "hexagone", "pentagone", "demi_cercle", "anneau"]),
  photo: z.object({ url: z.string().url(), rights: z.string() }).optional(),
  documentIds: z.array(z.string()).min(1), // sans programme publié, pas de candidat dans l'outil
});
export type Candidate = z.infer<typeof Candidate>;

/* ------------------------------------------------------------------ */
/* 6. Ce que l'API renvoie pour un ticket                              */
/* ------------------------------------------------------------------ */

export const TicketLineResult = z.object({
  ticketLine: TicketLine,
  section: z.enum(["portefeuille", "temps", "vie"]),
  nature: z.enum(["sur", "estime", "qualitatif"]),
  /** €/mois pour le portefeuille, années pour le temps, absent pour le qualitatif. */
  value: z.object({ low: z.number(), high: z.number() }).optional(),
  baseline: z.number().optional(), // valeur avec les règles actuelles
  measureIds: z.array(z.string()).min(1), // ouvre la fiche « d'où vient ce chiffre »
});

export const Ticket = z.object({
  candidateId: z.string(),
  baselineRulesYear: z.number().int(), // « comparé aux règles de 2026 »
  horizonYear: z.number().int(), // « une fois tout appliqué »
  lines: z.array(TicketLineResult),
  solde: z.object({
    sureOnly: z.number(), // « dont certain »
    low: z.number(), // fourchette, effets estimés compris
    high: z.number(),
  }),
  /** Cumul mai 2027 → mai 2032, en tenant compte des dates d'application. */
  cumul5ans: z.object({ low: z.number(), high: z.number() }),
  pendingMeasures: z.number().int().min(0), // « 3 mesures encore en vérification »
});
export type Ticket = z.infer<typeof Ticket>;
