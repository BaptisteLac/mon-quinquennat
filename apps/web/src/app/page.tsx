import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { ProgrammeChips } from "@/components/ProgrammeChips";
import { ResumeSheet } from "@/components/ResumeSheet";
import { TicketTeaser } from "@/components/TicketTeaser";
import { SiteFooter } from "@/components/SiteFooter";
import { getProgrammes } from "@/lib/data";
import { formatDate } from "@/lib/format";
import styles from "./page.module.css";

const STEPS = [
  { title: "Crée ton perso", text: "Âge, famille, travail, logement. Une minute." },
  { title: "Vis 5 ans, mois par mois", text: "Avec jusqu'à 3 programmes de ton choix, plus un programme mystère." },
  { title: "Récupère ton ticket", text: "Ce qui change pour toi, chiffre par chiffre. À partager." },
];

const GUARANTEES = [
  { title: "Neutre", text: "Même traitement pour tous, ordre tiré au hasard, aucun classement." },
  { title: "Privé", text: "Ton profil sert au calcul puis est oublié. Rien n'est enregistré." },
  { title: "Sourcé", text: "Pas de chiffre sans source à un toucher." },
  { title: "Indicatif", text: "Une aide pour réfléchir, pas une consigne de vote." },
];

export default function HomePage() {
  const programmes = getProgrammes();
  const lastUpdate = programmes.map((p) => p.collectedAt).sort().at(-1);

  return (
    <div className={styles.page}>
      <div className={styles.banner}>Outil citoyen indépendant · sans pub · sans compte</div>

      {/* En-tête desktop (DK-accueil) ; sur mobile, l'accueil n'a pas de barre de navigation. */}
      <nav className={styles.topNav} aria-label="Navigation principale">
        <Link href="/" className={styles.brand}>
          Mon quinquennat
        </Link>
        <div className={styles.topLinks}>
          <Link href="#programmes">Les programmes</Link>
          <Link href="/methode">Méthode</Link>
          <Link href="/personnage" className={styles.topCta}>
            Commencer
          </Link>
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroText}>
        <div className={styles.kicker}>Présidentielle 2027</div>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>
            Ma vie
            <br />
            en <span className={styles.year}>2032</span>
          </h1>
          <Avatar size={86} />
        </div>
        <p className={styles.lead}>
          Au printemps 2027, un·e président·e sera élu·e pour 5 ans. Ses mesures toucheront tes impôts, tes aides, ta
          retraite. <b>Vis ces 5 ans avant de voter.</b>
        </p>
        <Link href="/personnage" className={styles.cta}>
          Vivre mon quinquennat
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
        <p className={styles.ctaNote}>4 minutes · aucune inscription</p>
        </div>
        <TicketTeaser />
      </header>

      <section className={styles.how}>
        <h2 className={styles.h2}>Comment ça marche</h2>
        <ol className={styles.steps}>
          {STEPS.map((s, i) => (
            <li key={s.title} className={styles.step}>
              <span className={styles.stepNumber} aria-hidden="true">
                {i + 1}
              </span>
              <div className={styles.stepText}>
                <b>{s.title}</b>
                <span>{s.text}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Rien d&apos;inventé</h2>
        <ul className={styles.bullets}>
          <li>
            <b>Les programmes officiels</b> de chaque candidat, archivés et vérifiés chaque semaine.
            {lastUpdate ? ` Dernière mise à jour : ${formatDate(lastUpdate)}.` : null}
          </li>
          <li>
            <b>Les barèmes officiels</b> de l&apos;impôt et des aides, calculés avec OpenFisca, le moteur open source des
            règles fiscales.
          </li>
          <li>
            <b>Les données publiques</b> de l&apos;INSEE pour les estimations, toujours signalées par un ≈.
          </li>
          <li>
            <b>Chaque chiffre</b> s&apos;ouvre sur sa source : la citation exacte et la page du programme.
          </li>
        </ul>
        <Link href="/methode" className={styles.methodLink}>
          Lire la méthode complète
        </Link>
      </section>

      <section className={styles.sectionTight}>
        <h2 className={styles.h2}>Nos garanties</h2>
        <div className={styles.guarantees}>
          {GUARANTEES.map((g) => (
            <div key={g.title} className={styles.guarantee}>
              <b>{g.title}</b>
              <span>{g.text}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.sectionTight} id="programmes">
        <h2 className={styles.h2Small}>Programmes couverts</h2>
        <p className={styles.note}>
          Tous les candidats déclarés qui ont publié un programme. Ordre tiré au hasard à chaque visite.
        </p>
        <ProgrammeChips
          programmes={programmes.map((p) => ({
            slug: p.slug,
            displayName: p.candidate.displayName,
            party: p.candidate.party,
          }))}
        />
      </section>

      <SiteFooter />
      <ResumeSheet versions={Object.fromEntries(programmes.map((p) => [p.candidate.id, p.corpusId]))} />
    </div>
  );
}
