"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { plural } from "@/lib/format";
import { END_MONTH, START_MONTH } from "@/lib/frise";
import { monthsBetween } from "@/lib/term";
import { formatMonth } from "@/lib/ticket-labels";
import { describeProfile, hasStarted, mysteryPool, resumeStep, STEP_LABELS, STEP_ROUTES, updatedProgrammes, type Step } from "@/lib/journey";
import { clearJourney, loadJourney } from "@/lib/journey-store";
import type { Journey } from "@/lib/journey";
import styles from "./ResumeSheet.module.css";

const STEPS: readonly Step[] = ["toi", "vie", "candidats", "frise"];

/** « Content de te revoir » (maquette E0b-reprise) : proposé quand un parcours est gardé sur l'appareil. */
export function ResumeSheet({ versions }: { versions: Readonly<Record<string, string>> }) {
  const [journey, setJourney] = useState<Journey | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const j = loadJourney();
    if (j && hasStarted(j)) setJourney(j);
  }, []);
  useEffect(() => {
    if (journey && !dialog.current?.open) dialog.current?.showModal();
  }, [journey]);

  if (!journey) return null;
  const step = resumeStep(journey);
  const done = STEPS.indexOf(step);
  const month = step === "frise" ? journey.frise?.month : undefined;
  const progress = month ? monthsBetween(START_MONTH, month) / monthsBetween(START_MONTH, END_MONTH) : done / STEPS.length;
  const chosen = journey.choix.candidats.length;
  const mystery = journey.choix.mystere && mysteryPool(Object.keys(versions), journey.choix).length > 0;
  const summary = [
    chosen > 0 ? `${plural(chosen, "programme")}${mystery ? " + 1 mystère" : ""}` : null,
    describeProfile(journey.profile) ? `profil : ${describeProfile(journey.profile)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const updated = updatedProgrammes(journey, versions).length > 0;
  const close = () => {
    dialog.current?.close();
    setJourney(null);
  };
  const erase = () => {
    clearJourney();
    close();
  };

  return (
    <dialog ref={dialog} className={styles.sheet} aria-labelledby="reprise-titre" onClose={() => setJourney(null)}>
      <button type="button" className={styles.close} aria-label="Fermer" onClick={close}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div className={styles.head}>
        <Avatar genre={journey.profile.genre} age={journey.profile.age} enfants={journey.profile.enfants?.length ?? 0} size={64} />
        <div className={styles.headText}>
          <h2 id="reprise-titre" className={styles.title}>
            Content de te revoir
          </h2>
          <span className={styles.sub}>Ton quinquennat est resté en pause.</span>
        </div>
      </div>

      <div className={styles.progress}>
        <div className={styles.progressHead}>
          <span className={styles.progressLabel}>Tu en étais à</span>
          <span className={styles.progressValue}>{month ? formatMonth(month) : STEP_LABELS[step]}</span>
        </div>
        <div className={styles.bar} role="img" aria-label={month ? `Progression : ${Math.round(progress * 100)} % du quinquennat` : `Étape ${done + 1} sur ${STEPS.length}`}>
          <div className={styles.barFill} style={{ width: `${progress * 100}%` }} />
        </div>
        {summary ? <div className={styles.summary}>{summary}</div> : null}
      </div>

      {updated ? (
        <div className={styles.update}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", marginTop: 1 }}>
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 4v5h-5" />
          </svg>
          <span>
            <b>Un programme a été mis à jour</b> depuis ta dernière visite. Ton ticket sera recalculé avec la nouvelle version.
          </span>
        </div>
      ) : null}

      <Link href={STEP_ROUTES[step]} className={styles.primary}>
        Reprendre où j&apos;en étais
      </Link>
      {step === "frise" && journey.resultat ? (
        <Link href="/recap" className={styles.secondary}>
          Voir mon ticket
        </Link>
      ) : null}
      <Link
        href="/personnage"
        className={styles.secondary}
        onClick={() => {
          clearJourney();
        }}
      >
        Recommencer
      </Link>
      <p className={styles.foot}>
        Ta progression est gardée sur cet appareil seulement.{" "}
        <button type="button" className={styles.linkButton} onClick={erase}>
          L&apos;effacer
        </button>
      </p>
    </dialog>
  );
}
