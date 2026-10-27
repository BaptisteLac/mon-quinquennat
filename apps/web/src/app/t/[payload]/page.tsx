import type { Metadata } from "next";
import Link from "next/link";
import { TicketCard } from "@/components/ticket/TicketCard";
import { formatDate } from "@/lib/format";
import { readSharedTicket } from "@/lib/shared-ticket";
import styles from "./shared.module.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ payload: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { payload } = await params;
  const shared = await readSharedTicket(payload);
  if (!shared.ok) return { title: "Ticket partagé", robots: { index: false } };
  const title = `Ma vie en 2032 si ${shared.candidate.displayName} passe`;
  return {
    title,
    description: "Et toi, ça donne quoi ? Vis 2027–2032 avec les programmes officiels, chaque chiffre relié à sa source.",
    robots: { index: false },
    openGraph: { title, images: [{ url: `/t/${payload}/image?format=og`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [`/t/${payload}/image?format=og`] },
  };
}

/** E0c : arrivée par un lien partagé. */
export default async function SharedPage({ params }: Props) {
  const { payload } = await params;
  const shared = await readSharedTicket(payload);
  return (
    <main className={styles.page}>
      <div className={styles.top}>
        <Link href="/" className={styles.brand}>
          Mon quinquennat
        </Link>
        <span className={styles.pill}>Ticket partagé</span>
      </div>
      {shared.ok ? (
        <>
          <h1 className={styles.title}>
            On t&apos;a envoyé
            <br />
            un ticket de 2032
          </h1>
          <div className={styles.tilt}>
            <TicketCard
              ticket={shared.ticket}
              catalog={shared.catalog}
              maxFacts={3}
              head={{
                candidate: { displayName: shared.candidate.displayName, badge: shared.candidate.badge },
                profileLine: shared.profileLine ?? "Profil masqué par son auteur",
                avatar: shared.payload.avatar ?? null,
              }}
            />
          </div>
          {shared.outdated ? (
            <p className={styles.note}>
              Ce ticket a été calculé avec une version précédente du programme ; la version actuelle a été collectée le {formatDate(shared.outdated.collectedAt)}.
            </p>
          ) : null}
          <details className={styles.sources}>
            <summary>D&apos;où viennent ces chiffres ?</summary>
            <p>Chaque ligne vient d&apos;une mesure du programme officiel, citée mot pour mot :</p>
            <ul>
              {Object.values(shared.catalog.measures).map((m) => (
                <li key={m.id}>
                  <Link href={`/programme/${shared.candidate.slug}/${m.id}`}>{m.title}</Link>
                </li>
              ))}
            </ul>
            <p>Les montants sont calculés avec OpenFisca, le moteur open source des règles fiscales et sociales.</p>
          </details>
        </>
      ) : (
        <>
          <h1 className={styles.title}>Ce lien ne peut pas être affiché</h1>
          <p className={styles.lead}>
            {shared.reason === "non_verifie"
              ? "Ce ticket n'a pas été calculé par Mon quinquennat, ou il a été modifié : on ne l'affiche pas."
              : "Le lien est incomplet ou ne correspond à aucun programme publié."}
          </p>
        </>
      )}
      <section className={styles.cta}>
        <h2>
          Et toi,
          <br />
          ça donne quoi ?
        </h2>
        <p>Ce ticket dépend de la situation de son auteur. Le tien sera différent : ton âge, ta famille, ton travail changent tout.</p>
        <Link href="/personnage" className={styles.ctaButton}>
          Faire le mien →
        </Link>
        <span className={styles.ctaNote}>sans compte · rien n&apos;est enregistré sur nos serveurs</span>
      </section>
      <Link href="/" className={styles.about}>
        C&apos;est quoi, Mon quinquennat ?
      </Link>
    </main>
  );
}
