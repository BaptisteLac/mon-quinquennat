/**
 * Avatars « sticker, peau jaune » (design/maquettes/DA-retenue.html) : buste par genre × tranche d'âge.
 * Dessins repris tels quels de la maquette ; les avatars neutres 18–24, 45–64 et 65+ en sont des variantes
 * (même visage, cheveux et vêtements différents). Généré depuis la maquette, ne pas modifier à la main.
 */
import type { AvatarAgeBand } from "@mon-quinquennat/schema";

export type AvatarGenre = "femme" | "homme" | "autre";
export type AvatarKey = `${AvatarGenre}_${AvatarAgeBand}`;

export interface AvatarArt {
  /** Description pour les lecteurs d'écran. */
  label: string;
  /** Fond de la case (jamais jaune : la peau est jaune). */
  bg: string;
  /** Contenu SVG, viewBox 0 0 160 160. */
  svg: string;
}

export const AVATARS: Record<AvatarKey, AvatarArt> = {
  "femme_18_24": {
    "label": "Femme 18 à 24 ans, longs cheveux lisses avec frange",
    "bg": "#C7B8FF",
    "svg": "<g stroke=\"#111\" stroke-width=\"4\" stroke-linejoin=\"round\" stroke-linecap=\"round\"> <path d=\"M36 72 Q34 22 80 20 Q126 22 124 72 L128 140 L32 140 Z\" fill=\"#2B1B14\"/> <path d=\"M28 162 Q34 118 80 112 Q126 118 132 162 Z\" fill=\"#9BE3C8\"/> <circle cx=\"80\" cy=\"74\" r=\"40\" fill=\"#FFD23F\"/> <path d=\"M40 66 Q42 28 80 28 Q118 28 120 66 Q80 50 40 66 Z\" fill=\"#2B1B14\"/> <path d=\"M70 96 Q80 104 90 96\" fill=\"none\"/> </g> <g fill=\"#111\"><circle cx=\"66\" cy=\"80\" r=\"5\"/><circle cx=\"94\" cy=\"80\" r=\"5\"/></g> <g fill=\"#fff\"><circle cx=\"67.8\" cy=\"78.2\" r=\"1.6\"/><circle cx=\"95.8\" cy=\"78.2\" r=\"1.6\"/></g>"
  },
  "femme_25_44": {
    "label": "Femme 25 à 44 ans, cheveux mi-longs au carré",
    "bg": "#9BE3C8",
    "svg": "<g stroke=\"#111\" stroke-width=\"4\" stroke-linejoin=\"round\" stroke-linecap=\"round\"> <path d=\"M38 70 Q36 22 80 20 Q124 22 122 70 L124 112 L36 112 Z\" fill=\"#4A2E22\"/> <path d=\"M28 162 Q34 118 80 112 Q126 118 132 162 Z\" fill=\"#FFB38A\"/> <circle cx=\"80\" cy=\"72\" r=\"40\" fill=\"#FFD23F\"/> <path d=\"M40 66 Q44 28 80 28 Q116 28 120 66 Q106 46 80 48 Q54 46 40 66 Z\" fill=\"#4A2E22\"/> <path d=\"M70 94 Q80 102 90 94\" fill=\"none\"/> </g> <g fill=\"#111\"><circle cx=\"66\" cy=\"76\" r=\"5\"/><circle cx=\"94\" cy=\"76\" r=\"5\"/></g> <g fill=\"#fff\"><circle cx=\"67.8\" cy=\"74.2\" r=\"1.6\"/><circle cx=\"95.8\" cy=\"74.2\" r=\"1.6\"/></g>"
  },
  "femme_45_64": {
    "label": "Femme 45 à 64 ans, cheveux ondulés mi-courts",
    "bg": "#FFB38A",
    "svg": "<g stroke=\"#111\" stroke-width=\"4\" stroke-linejoin=\"round\" stroke-linecap=\"round\"> <path d=\"M38 74 Q34 26 80 24 Q126 26 122 74 Q128 92 118 104 L42 104 Q32 92 38 74 Z\" fill=\"#8C4A2F\"/> <path d=\"M28 162 Q34 118 80 112 Q126 118 132 162 Z\" fill=\"#C7B8FF\"/> <circle cx=\"80\" cy=\"74\" r=\"40\" fill=\"#FFD23F\"/> <path d=\"M40 66 Q46 30 84 30 Q118 32 120 62 Q104 44 70 52 Q52 56 40 66 Z\" fill=\"#8C4A2F\"/> <path d=\"M70 96 Q80 103 90 96\" fill=\"none\"/> </g> <g fill=\"#111\"><circle cx=\"66\" cy=\"78\" r=\"5\"/><circle cx=\"94\" cy=\"78\" r=\"5\"/></g> <g fill=\"#fff\"><circle cx=\"67.8\" cy=\"76.2\" r=\"1.6\"/><circle cx=\"95.8\" cy=\"76.2\" r=\"1.6\"/></g>"
  },
  "femme_65_plus": {
    "label": "Femme de 65 ans et plus, chignon blanc et lunettes",
    "bg": "#C7B8FF",
    "svg": "<g stroke=\"#111\" stroke-width=\"4\" stroke-linejoin=\"round\" stroke-linecap=\"round\"> <circle cx=\"80\" cy=\"26\" r=\"15\" fill=\"#EDEDED\"/> <path d=\"M28 162 Q34 118 80 112 Q126 118 132 162 Z\" fill=\"#9BE3C8\"/> <circle cx=\"80\" cy=\"74\" r=\"40\" fill=\"#FFD23F\"/> <path d=\"M40 72 Q40 32 80 32 Q120 32 120 72 Q108 50 80 52 Q52 50 40 72 Z\" fill=\"#EDEDED\"/> <circle cx=\"65\" cy=\"78\" r=\"11\" fill=\"none\"/><circle cx=\"95\" cy=\"78\" r=\"11\" fill=\"none\"/> <path d=\"M76 78 H84 M70 98 Q80 105 90 98\" fill=\"none\"/> </g> <g fill=\"#111\"><circle cx=\"65\" cy=\"78\" r=\"4\"/><circle cx=\"95\" cy=\"78\" r=\"4\"/></g>"
  },
  "autre_25_44": {
    "label": "Avatar neutre, cheveux bouclés volumineux",
    "bg": "#EFEEE8",
    "svg": "<g stroke=\"#111\" stroke-width=\"4\" stroke-linejoin=\"round\" stroke-linecap=\"round\"> <circle cx=\"80\" cy=\"62\" r=\"50\" fill=\"#1E1E1E\"/> <path d=\"M28 162 Q34 118 80 112 Q126 118 132 162 Z\" fill=\"#9BE3C8\"/> <circle cx=\"80\" cy=\"76\" r=\"38\" fill=\"#FFD23F\"/> <path d=\"M44 66 Q48 42 62 46 Q68 32 80 36 Q92 32 98 46 Q112 42 116 66 Q100 54 80 56 Q60 54 44 66 Z\" fill=\"#1E1E1E\"/> <path d=\"M70 96 Q80 104 90 96\" fill=\"none\"/> </g> <g fill=\"#111\"><circle cx=\"67\" cy=\"80\" r=\"5\"/><circle cx=\"93\" cy=\"80\" r=\"5\"/></g> <g fill=\"#fff\"><circle cx=\"68.8\" cy=\"78.2\" r=\"1.6\"/><circle cx=\"94.8\" cy=\"78.2\" r=\"1.6\"/></g>"
  },
  "homme_18_24": {
    "label": "Homme 18 à 24 ans, cheveux courts, sweat à capuche",
    "bg": "#9BE3C8",
    "svg": "<g stroke=\"#111\" stroke-width=\"4\" stroke-linejoin=\"round\" stroke-linecap=\"round\"> <path d=\"M24 162 Q22 112 50 100 L110 100 Q138 112 136 162 Z\" fill=\"#FFB38A\"/> <circle cx=\"80\" cy=\"72\" r=\"40\" fill=\"#FFD23F\"/> <path d=\"M40 64 Q42 30 80 30 Q118 30 120 64 Q114 50 98 50 Q90 42 80 46 Q66 42 58 50 Q46 50 40 64 Z\" fill=\"#C8902F\"/> <path d=\"M70 94 Q80 101 90 94\" fill=\"none\"/> <path d=\"M62 120 L64 140 M98 120 L96 140\" fill=\"none\"/> </g> <g fill=\"#111\"><circle cx=\"66\" cy=\"76\" r=\"5\"/><circle cx=\"94\" cy=\"76\" r=\"5\"/></g> <g fill=\"#fff\"><circle cx=\"67.8\" cy=\"74.2\" r=\"1.6\"/><circle cx=\"95.8\" cy=\"74.2\" r=\"1.6\"/></g>"
  },
  "homme_25_44": {
    "label": "Homme 25 à 44 ans, cheveux courts avec une raie, barbe de quelques jours",
    "bg": "#FFB38A",
    "svg": "<g stroke=\"#111\" stroke-width=\"4\" stroke-linejoin=\"round\" stroke-linecap=\"round\"> <path d=\"M28 162 Q34 118 80 112 Q126 118 132 162 Z\" fill=\"#C7B8FF\"/> <circle cx=\"80\" cy=\"72\" r=\"41\" fill=\"#FFD23F\"/> </g> <path d=\"M46 84 Q50 118 80 118 Q110 118 114 84 Q100 100 80 100 Q60 100 46 84 Z\" fill=\"#4A2E22\" opacity=\"0.25\"/> <g stroke=\"#111\" stroke-width=\"4\" stroke-linejoin=\"round\" stroke-linecap=\"round\"> <path d=\"M40 62 Q40 30 80 28 Q120 30 120 62 Q118 48 104 46 Q86 52 62 44 Q46 48 40 62 Z\" fill=\"#4A2E22\"/> <path d=\"M70 96 Q80 103 90 96\" fill=\"none\"/> </g> <g fill=\"#111\"><circle cx=\"66\" cy=\"76\" r=\"5\"/><circle cx=\"94\" cy=\"76\" r=\"5\"/></g> <g fill=\"#fff\"><circle cx=\"67.8\" cy=\"74.2\" r=\"1.6\"/><circle cx=\"95.8\" cy=\"74.2\" r=\"1.6\"/></g>"
  },
  "homme_45_64": {
    "label": "Homme 45 à 64 ans, barbe grise et crâne dégarni",
    "bg": "#C7B8FF",
    "svg": "<g stroke=\"#111\" stroke-width=\"4\" stroke-linejoin=\"round\" stroke-linecap=\"round\"> <path d=\"M24 162 Q30 116 80 110 Q130 116 136 162 Z\" fill=\"#9BE3C8\"/> <circle cx=\"80\" cy=\"72\" r=\"42\" fill=\"#FFD23F\"/> <path d=\"M40 78 Q38 54 48 44 L52 74 Z\" fill=\"#7A7A7A\"/> <path d=\"M120 78 Q122 54 112 44 L108 74 Z\" fill=\"#7A7A7A\"/> <path d=\"M42 80 Q46 122 80 124 Q114 122 118 80 Q104 100 80 100 Q56 100 42 80 Z\" fill=\"#7A7A7A\"/> <path d=\"M70 102 Q80 108 90 102\" fill=\"none\"/> </g> <g fill=\"#111\"><circle cx=\"66\" cy=\"74\" r=\"5\"/><circle cx=\"94\" cy=\"74\" r=\"5\"/></g> <g fill=\"#fff\"><circle cx=\"67.8\" cy=\"72.2\" r=\"1.6\"/><circle cx=\"95.8\" cy=\"72.2\" r=\"1.6\"/></g>"
  },
  "homme_65_plus": {
    "label": "Homme de 65 ans et plus, cheveux blancs sur les côtés, moustache et lunettes",
    "bg": "#9BE3C8",
    "svg": "<g stroke=\"#111\" stroke-width=\"4\" stroke-linejoin=\"round\" stroke-linecap=\"round\"> <path d=\"M24 162 Q30 116 80 110 Q130 116 136 162 Z\" fill=\"#FFB38A\"/> <circle cx=\"80\" cy=\"72\" r=\"42\" fill=\"#FFD23F\"/> <path d=\"M40 80 Q36 52 50 42 L54 76 Z\" fill=\"#EDEDED\"/> <path d=\"M120 80 Q124 52 110 42 L106 76 Z\" fill=\"#EDEDED\"/> <circle cx=\"65\" cy=\"76\" r=\"11\" fill=\"none\"/><circle cx=\"95\" cy=\"76\" r=\"11\" fill=\"none\"/> <path d=\"M76 76 H84\" fill=\"none\"/> <path d=\"M64 98 Q80 88 96 98 Q80 104 64 98 Z\" fill=\"#EDEDED\"/> <path d=\"M72 110 Q80 114 88 110\" fill=\"none\"/> </g> <g fill=\"#111\"><circle cx=\"65\" cy=\"76\" r=\"4\"/><circle cx=\"95\" cy=\"76\" r=\"4\"/></g>"
  },
  "autre_18_24": {
    "label": "Avatar neutre 18 à 24 ans, cheveux bouclés volumineux, sweat à capuche",
    "bg": "#C7B8FF",
    "svg": "<g stroke=\"#111\" stroke-width=\"4\" stroke-linejoin=\"round\" stroke-linecap=\"round\"> <circle cx=\"80\" cy=\"62\" r=\"50\" fill=\"#1E1E1E\"/> <path d=\"M28 162 Q34 118 80 112 Q126 118 132 162 Z\" fill=\"#FFB38A\"/> <circle cx=\"80\" cy=\"76\" r=\"38\" fill=\"#FFD23F\"/> <path d=\"M44 66 Q48 42 62 46 Q68 32 80 36 Q92 32 98 46 Q112 42 116 66 Q100 54 80 56 Q60 54 44 66 Z\" fill=\"#1E1E1E\"/> <path d=\"M70 96 Q80 104 90 96\" fill=\"none\"/> <path d=\"M62 128 L64 146 M98 128 L96 146\" fill=\"none\"/> </g> <g fill=\"#111\"><circle cx=\"67\" cy=\"80\" r=\"5\"/><circle cx=\"93\" cy=\"80\" r=\"5\"/></g> <g fill=\"#fff\"><circle cx=\"68.8\" cy=\"78.2\" r=\"1.6\"/><circle cx=\"94.8\" cy=\"78.2\" r=\"1.6\"/></g>"
  },
  "autre_45_64": {
    "label": "Avatar neutre 45 à 64 ans, cheveux bouclés grisonnants",
    "bg": "#9BE3C8",
    "svg": "<g stroke=\"#111\" stroke-width=\"4\" stroke-linejoin=\"round\" stroke-linecap=\"round\"> <circle cx=\"80\" cy=\"62\" r=\"50\" fill=\"#7A7A7A\"/> <path d=\"M28 162 Q34 118 80 112 Q126 118 132 162 Z\" fill=\"#C7B8FF\"/> <circle cx=\"80\" cy=\"76\" r=\"38\" fill=\"#FFD23F\"/> <path d=\"M44 66 Q48 42 62 46 Q68 32 80 36 Q92 32 98 46 Q112 42 116 66 Q100 54 80 56 Q60 54 44 66 Z\" fill=\"#7A7A7A\"/> <path d=\"M70 96 Q80 104 90 96\" fill=\"none\"/> </g> <g fill=\"#111\"><circle cx=\"67\" cy=\"80\" r=\"5\"/><circle cx=\"93\" cy=\"80\" r=\"5\"/></g> <g fill=\"#fff\"><circle cx=\"68.8\" cy=\"78.2\" r=\"1.6\"/><circle cx=\"94.8\" cy=\"78.2\" r=\"1.6\"/></g>"
  },
  "autre_65_plus": {
    "label": "Avatar neutre de 65 ans et plus, cheveux bouclés blancs et lunettes",
    "bg": "#FFB38A",
    "svg": "<g stroke=\"#111\" stroke-width=\"4\" stroke-linejoin=\"round\" stroke-linecap=\"round\"> <circle cx=\"80\" cy=\"62\" r=\"50\" fill=\"#EDEDED\"/> <path d=\"M28 162 Q34 118 80 112 Q126 118 132 162 Z\" fill=\"#9BE3C8\"/> <circle cx=\"80\" cy=\"76\" r=\"38\" fill=\"#FFD23F\"/> <path d=\"M44 66 Q48 42 62 46 Q68 32 80 36 Q92 32 98 46 Q112 42 116 66 Q100 54 80 56 Q60 54 44 66 Z\" fill=\"#EDEDED\"/> <circle cx=\"67\" cy=\"80\" r=\"11\" fill=\"none\"/><circle cx=\"93\" cy=\"80\" r=\"11\" fill=\"none\"/><path d=\"M78 80 H82 M70 98 Q80 105 90 98\" fill=\"none\"/> </g> <g fill=\"#111\"><circle cx=\"67\" cy=\"80\" r=\"5\"/><circle cx=\"93\" cy=\"80\" r=\"5\"/></g> <g fill=\"#fff\"><circle cx=\"68.8\" cy=\"78.2\" r=\"1.6\"/><circle cx=\"94.8\" cy=\"78.2\" r=\"1.6\"/></g>"
  }
};
