import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeIcon } from "@/components/BadgeIcon";
import { MeasureList } from "@/components/MeasureList";
import { SiteFooter } from "@/components/SiteFooter";
import { getProgrammes } from "@/lib/data";
import { formatDate, plural } from "@/lib/format";
import { toMeasureCard } from "@/lib/measure-card";
import { natureKind } from "@/lib/nature";
import { THEME_LABELS, themesByCount } from "@/lib/themes";
import styles from "./page.module.css";

export const dynamicParams = false;

export function generateStaticParams(): { candidat: string }[] {
  return getProgrammes().map((p) => ({ candidat: p.slug }));
}

type Props = { params: Promise<{ candidat: string }> };

function find(slug: string) {
  return getProgrammes().find((p) => p.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = find((await params).candidat);
  if (!p) return {};
  return {
    title: `Le programme de ${p.candidate.displayName} (${p.candidate.party})`,
    description: `${plural(p.measures.length, "mesure")} du programme officiel de ${p.candidate.displayName}, chacune avec sa citation exacte.`,
  };
}

const STATUS_LABELS = { declaree: "Candidature déclarée", officielle: "Candidature officielle", retire: "Candidature retirée" } as const;

export default async function ProgrammePage({ params }: Props) {
  const p = find((await params).candidat);
  if (!p) notFound();

  const docs = Object.values(p.documents);
  const pdfCount = docs.filter((d) => d.kind === "pdf").length;
  const webCount = docs.length - pdfCount;
  const computable = p.measures.filter((m) => natureKind(m) === "chiffree").length;
  const cards = p.measures.map((m) => toMeasureCard(m, p.documents, p.slug));
  const themes = themesByCount(p.measures).map((t) => ({ theme: t.theme, label: THEME_LABELS[t.theme], count: t.count }));
  const original = p.startUrls[0];

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <nav className={styles.top}>
          <Link href="/" className={styles.home}>
            Mon quinquennat
          </Link>
          <Link href="/#programmes" className={styles.others}>
            Autres programmes
          </Link>
        </nav>

        <header className={styles.header}>
          <span className={styles.party}>
            <BadgeIcon badge={p.candidate.badge} />
            {p.candidate.party}
          </span>
          <h1 className={styles.title}>
            Le programme de
            <br />
            {p.candidate.displayName}
          </h1>
          <span className={styles.subtitle}>
            en mesures, sans le blabla · {STATUS_LABELS[p.candidate.status]}
          </span>
        </header>

        <div className={styles.version}>
          <div>
            Programme officiel, version collectée le {formatDate(p.collectedAt)} · {plural(webCount, "page web", "pages web")}
            {pdfCount > 0 ? `, ${plural(pdfCount, "PDF", "PDF")}` : null}
          </div>
          {original ? (
            <a href={original} target="_blank" rel="noopener noreferrer" className={styles.versionLink}>
              Lire l&apos;original
            </a>
          ) : null}
        </div>

        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt>mesures</dt>
            <dd>{p.measures.length}</dd>
          </div>
          <div className={styles.stat}>
            <dt>chiffrables</dt>
            <dd>{computable}</dd>
          </div>
          <div className={styles.stat}>
            <dt>en vérification</dt>
            <dd>{p.pendingCount}</dd>
          </div>
        </dl>

        <MeasureList measures={cards} themes={themes} />

        {p.pendingCount > 0 ? (
          <div className={styles.pending}>
            <div className={styles.pendingTitle}>EN VÉRIFICATION · {plural(p.pendingCount, "MESURE", "MESURES")}</div>
            <span>
              Ces mesures ont été repérées dans le programme mais n&apos;ont pas encore passé tous les contrôles. Elles ne
              comptent pas dans les tickets.
            </span>
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
