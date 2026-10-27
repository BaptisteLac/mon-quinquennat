import type { Metadata } from "next";
import Link from "next/link";
import { ReportForm } from "@/components/report/ReportForm";
import { SiteFooter } from "@/components/SiteFooter";
import { findReportedMeasure, reportToken } from "@/lib/report-server";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Signaler une erreur",
  description: "Une citation, un résumé, un chiffre ou un calcul qui ne correspond pas au programme officiel : signale-le.",
  robots: { index: false },
};

type Props = { searchParams: Promise<{ mesure?: string | string[] }> };

export default async function SignalerPage({ searchParams }: Props) {
  const { mesure } = await searchParams;
  const measure = typeof mesure === "string" ? findReportedMeasure(mesure) : null;

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <nav className={styles.top}>
          <Link href="/" className={styles.home}>
            Mon quinquennat
          </Link>
          <Link href="/methode">Méthode</Link>
        </nav>
        <header className={styles.header}>
          <h1 className={styles.title}>Signaler une erreur</h1>
          <p className={styles.lead}>
            Chaque signalement est vérifié. Si l&apos;erreur se confirme, la mesure est corrigée et le cas est ajouté aux tests
            automatiques, pour qu&apos;il ne revienne pas.
          </p>
        </header>
        {measure ? (
          <div className={styles.context}>
            <span>À propos de la mesure</span>
            <Link href={measure.path}>{measure.title}</Link>
            <span>
              {measure.candidate} · {measure.party}
            </span>
          </div>
        ) : null}
        <ReportForm measure={measure} direct={reportToken() !== null} />
      </main>
      <SiteFooter />
    </div>
  );
}
