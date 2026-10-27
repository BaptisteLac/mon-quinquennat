/**
 * Liens officiels de l'écran « À toi de jouer » (R7). Chaque adresse est relevée sur le site officiel
 * (capture archivée dans data/sources/), jamais écrite de mémoire ; `null` tant qu'elle n'est pas vérifiée.
 */
export interface CivicLink {
  title: string;
  text: string;
  url: string;
}

export const CIVIC_LINKS: { inscription: CivicLink | null; procuration: CivicLink | null; bureau: CivicLink | null } = {
  // Lien « Vérifier votre inscription électorale et votre bureau de vote » de la page Élections de Service-Public
  // (data/sources/service-public-N47-elections-2026-10-27.liens.json).
  inscription: {
    title: "Vérifier mon inscription",
    text: "Sur les listes électorales, avec le service officiel",
    url: "https://www.service-public.gouv.fr/particuliers/vosdroits/R51788",
  },
  // Site officiel de demande de procuration (data/sources/maprocuration-accueil-2026-10-27.txt).
  procuration: { title: "Faire une procuration", text: "Si tu n'es pas là le jour du vote", url: "https://www.maprocuration.gouv.fr/" },
  // Même service officiel que l'inscription : il indique aussi le bureau de vote.
  bureau: {
    title: "Trouver mon bureau de vote",
    text: "Il est indiqué par le même service officiel",
    url: "https://www.service-public.gouv.fr/particuliers/vosdroits/R51788",
  },
};

/** Dates des tours de scrutin, une fois fixées par décret (null avant). */
export const ELECTION_DATES: { premierTour: string; secondTour: string } | null = null;
