import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
// Polices auto-hébergées : aucun appel à un service tiers depuis le navigateur du visiteur.
import "@fontsource/bricolage-grotesque/600.css";
import "@fontsource/bricolage-grotesque/800.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/dm-sans/400-italic.css";
import "@fontsource/dm-mono/400.css";
import "@fontsource/dm-mono/500.css";
import "./globals.css";

export const metadata: Metadata = {
  // Adresse publique du site (images d'aperçu des liens partagés) ; fixée à la mise en ligne.
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: { default: "Mon quinquennat · Ma vie en 2032", template: "%s · Mon quinquennat" },
  description:
    "Vis 2027–2032 avec les programmes officiels des candidats à la présidentielle : ce qui change pour toi, chiffre par chiffre, chaque chiffre relié à sa source.",
};

export const viewport: Viewport = { themeColor: "#111111", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
