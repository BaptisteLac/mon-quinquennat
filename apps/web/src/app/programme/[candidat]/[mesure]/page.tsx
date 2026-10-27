import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeIcon } from "@/components/BadgeIcon";
import { ForYou, Others, Share, Summary, type OtherMeasure } from "@/components/fiche/FicheClient";
import { getProgrammes } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { natureKind } from "@/lib/nature";
import { THEME_LABELS } from "@/lib/themes";
import styles from "@/components/fiche/fiche.module.css";

export const dynamicParams = false;

export function generateStaticParams(): { candidat: string; mesure: string }[] {
  return getProgrammes().flatMap((p) => p.measures.map((m) => ({ candidat: p.slug, mesure: m.id })));
}

type Props = { params: Promise<{ candidat: string; mesure: string }> };

function find(slug: string, id: string) {
  const programme = getProgrammes().find((p) => p.slug === slug);
  const index = programme?.measures.findIndex((m) => m.id === id) ?? -1;
  const measure = programme?.measures[index];
  return programme && measure ? { programme, measure, index } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { candidat, mesure } = await params;
  const f = find(candidat, mesure);
  if (!f) return {};
  return { title: `${f.measure.title} · ${f.programme.candidate.displayName}`, description: f.measure.summary.simple };
}

const NATURE = { chiffree: "Chiffrée", qualitative: "Qualitative", floue: "Floue" } as const;
const LEGAL = {
  decret: "Décret",
  loi: "Loi à voter",
  loi_de_finances: "Loi de finances",
  revision_constitutionnelle: "Révision de la Constitution",
  accord_ue: "Accord européen",
  referendum: "Référendum",
  inconnu: "Voie non précisée",
} as const;

export default async function MesurePage({ params }: Props) {
  const { candidat, mesure } = await params;
  const f = find(candidat, mesure);
  if (!f) notFound();
  const { programme: p, measure: m, index } = f;
  const year = m.schedule.effectiveDate.slice(0, 4);

  // Documents cités, numérotés dans l'ordre d'apparition.
  const quotes = [...m.sources, ...(m.rationale ? [m.rationale] : []), ...m.subMeasures.map((s) => s.source)];
  const docIds = [...new Set(quotes.map((q) => q.documentId))];
  const ref = (documentId: string) => docIds.indexOf(documentId) + 1;
  const place = (q: { documentId: string; page: number }) => (p.documents[q.documentId]?.kind === "pdf" ? `p. ${q.page}` : "page web");

  const others: OtherMeasure[] = getProgrammes()
    .filter((o) => o.candidate.id !== p.candidate.id)
    .map((o) => {
      const same = o.measures.find((x) => x.theme === m.theme);
      return {
        candidateId: o.candidate.id,
        displayName: o.candidate.displayName,
        party: o.candidate.party,
        badge: o.candidate.badge,
        measure: same ? { href: `/programme/${o.slug}/${same.id}`, title: same.title } : null,
      };
    });
  const prev = p.measures[index - 1];
  const next = p.measures[index + 1];
  const versions = Object.fromEntries(getProgrammes().map((x) => [x.candidate.id, x.corpusId]));

  return (
    <main className={styles.page}>
      <div className={styles.top}>
        <Link href="/" className={styles.brand}>
          Mon quinquennat
        </Link>
        <span className={styles.updated}>Programme collecté le {formatDate(p.collectedAt)}</span>
      </div>
      <nav aria-label="Fil d'Ariane" className={styles.crumbs}>
        <Link href="/#programmes">Programmes</Link>
        <span aria-hidden="true">›</span>
        <Link href={`/programme/${p.slug}`}>{p.candidate.displayName}</Link>
        <span aria-hidden="true">›</span>
        <span>{THEME_LABELS[m.theme]}</span>
      </nav>

      <div className={styles.candidate}>
        <span className={styles.photo} aria-hidden="true">
          <span className={styles.badge}>
            <BadgeIcon badge={p.candidate.badge} size={10} />
          </span>
        </span>
        <span className={styles.candidateText}>
          <b>{p.candidate.displayName}</b>
          <span>{p.candidate.party}</span>
        </span>
      </div>

      <div className={styles.head}>
        <div className={styles.chips}>
          <span className={styles.chip}>{THEME_LABELS[m.theme]}</span>
          <span className={styles.chip}>
            <span className={styles.swatch} data-nature={natureKind(m)} aria-hidden="true" />
            {NATURE[natureKind(m)]}
          </span>
          <span className={styles.chip}>
            {LEGAL[m.legalPath]} · dès {year}
            {m.schedule.dateOrigin === "estimee" ? " (estimé)" : ""}
          </span>
        </div>
        <h1 className={styles.title}>{m.title}</h1>
      </div>

      <Summary simple={m.summary.simple} normal={m.summary.normal} />
      <ForYou measureId={m.id} candidateId={p.candidate.id} versions={versions} />

      <section className={styles.section}>
        <h2>Le texte exact</h2>
        {m.sources.map((q, i) => (
          <figure key={i} className={styles.quoteBlock}>
            <blockquote className={styles.quote}>« {q.quote} »</blockquote>
            <figcaption className={styles.note}>
              Programme officiel, {place(q)} · version collectée le {formatDate(p.collectedAt)} [{ref(q.documentId)}]
            </figcaption>
          </figure>
        ))}
      </section>

      {m.rationale ? (
        <section className={styles.section}>
          <h2>Pourquoi, selon le candidat</h2>
          <p>
            {p.candidate.displayName} <b>justifie</b> cette mesure ainsi : « {m.rationale.quote} ».{" "}
            <span className={styles.note}>
              {place(m.rationale)} [{ref(m.rationale.documentId)}]
            </span>
          </p>
        </section>
      ) : null}

      {m.subMeasures.length > 0 ? (
        <section className={styles.section}>
          <h2>Dans le détail</h2>
          <ol className={styles.details}>
            {m.subMeasures.map((s, i) => (
              <li key={i}>
                <span className={styles.num}>{i + 1}</span>
                <span>
                  {s.text}{" "}
                  <span className={styles.note}>
                    {place(s.source)} [{ref(s.source.documentId)}]
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {m.costEstimates.length > 0 ? (
        <section className={styles.section}>
          <h2>Le coût annoncé</h2>
          <div className={styles.box}>
            {m.costEstimates.map((c, i) => (
              <div key={i} className={styles.costRow}>
                <span>{c.origin === "candidat" ? "Selon le candidat" : c.organisation}</span>
                <b>{c.billionEurPerYear.toLocaleString("fr-FR")} Md€ / an</b>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {others.length > 0 ? (
        <section className={styles.section}>
          <h2>Les autres candidats sur ce thème</h2>
          <p className={styles.note}>Ordre tiré au hasard. Chaque mesure a sa propre fiche.</p>
          <Others others={others} />
        </section>
      ) : null}

      <section className={styles.section}>
        <h2>Sources</h2>
        <ol className={styles.sources}>
          {docIds.map((id, i) => {
            const d = p.documents[id];
            return (
              <li key={id}>
                <span>[{i + 1}]</span>
                <span>
                  <b>{p.candidate.party}</b> · « {d?.title ?? "Document du programme"} » · programme officiel, {d?.kind === "pdf" ? "PDF" : "page web"} · version
                  collectée le {formatDate(p.collectedAt)} ·{" "}
                  {d ? (
                    <a href={d.officialUrl} target="_blank" rel="noopener noreferrer">
                      original
                    </a>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
        <p className={styles.note}>
          Extraite automatiquement le {formatDate(m.review.extractedBy.at)} · {m.review.checks.filter((c) => c.passed).length} contrôles automatiques passés
        </p>
      </section>

      <Share title={m.title} />

      <nav className={styles.pager} aria-label="Autres mesures du programme">
        {prev ? (
          <Link href={`/programme/${p.slug}/${prev.id}`} className={styles.pagerLink}>
            <span>‹ Mesure précédente</span>
            <b>{prev.title}</b>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/programme/${p.slug}/${next.id}`} className={styles.pagerLink} data-align="end">
            <span>Mesure suivante ›</span>
            <b>{next.title}</b>
          </Link>
        ) : null}
      </nav>
    </main>
  );
}
