"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Profile } from "@mon-quinquennat/schema";
import { Choice, DeskBack, FlowTop, formStyles as styles, NextAction, type Option } from "@/components/form/fields";
import { DeskHeader } from "@/components/flow/DeskHeader";
import { PersoCard } from "@/components/flow/PersoCard";
import { completeProfile } from "@/lib/journey";
import { useJourney } from "@/lib/use-journey";
import card from "./StepAffiner.module.css";

const HANDICAP: Option<NonNullable<Profile["handicapOuAidant"]>>[] = [
  { value: "non", label: "Non" },
  { value: "moi", label: "Moi" },
  { value: "proche", label: "Un proche dont je m'occupe" },
];
const PATRIMOINE: Option<NonNullable<Profile["patrimoine"]>>[] = [
  { value: "moins_100k", label: "− 100 k€" },
  { value: "100k_1m", label: "100 k – 1 M€" },
  { value: "plus_1m", label: "+ 1 M€" },
  { value: "ne_sait_pas", label: "Je ne sais pas" },
];

export function StepAffiner() {
  const router = useRouter();
  const { journey, update } = useJourney();
  const incomplete = journey ? completeProfile(journey.profile) === null : false;

  useEffect(() => {
    if (incomplete) router.replace("/personnage/vie");
  }, [incomplete, router]);

  if (!journey || incomplete) return <div className={styles.page} aria-busy="true" />;
  const p = journey.profile;

  return (
    <main className={styles.page}>
      <DeskHeader current={2} />
      <FlowTop back="/personnage/vie" pill="Facultatif" />
      <div className={styles.layout}>
      <PersoCard profile={p} />
      <div className={styles.form}>
      <div className={styles.intro}>
        <div className={styles.introText}>
          <div className={styles.deskKicker}>Facultatif</div>
          <h1 className={styles.title}>
            Affiner{" "}
            <br />
            mon profil
          </h1>
          <p className={styles.lead}>Ces questions changent le résultat pour certaines personnes. Réponds seulement si tu veux.</p>
        </div>
        <DeskBack href="/personnage/vie" />
      </div>

      <section className={card.card}>
        <h2 className={card.title}>Handicap ou perte d&apos;autonomie</h2>
        <p className={card.why}>Pourquoi : certaines mesures touchent l&apos;AAH ou l&apos;aide aux aidants.</p>
        <Choice
          legend={<span className="visually-hidden">Handicap ou perte d&apos;autonomie</span>}
          inlineLegend
          size="small"
          options={HANDICAP}
          value={p.handicapOuAidant}
          onChange={(handicapOuAidant) => update((j) => ({ ...j, profile: { ...j.profile, handicapOuAidant } }))}
        />
      </section>

      <section className={card.card}>
        <h2 className={card.title}>Patrimoine, hors logement principal</h2>
        <p className={card.why}>Pourquoi : pour les mesures sur l&apos;héritage et la fortune.</p>
        <Choice
          legend={<span className="visually-hidden">Patrimoine, hors logement principal</span>}
          inlineLegend
          size="small"
          options={PATRIMOINE}
          value={p.patrimoine}
          onChange={(patrimoine) => update((j) => ({ ...j, profile: { ...j.profile, patrimoine } }))}
        />
      </section>

      <p className={`${styles.note} ${styles.mobileOnly}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        Tes réponses servent au calcul puis sont oubliées : rien n&apos;est enregistré sur nos serveurs.
      </p>

      <div className={`${styles.actions} ${styles.full}`}>
        <NextAction href="/candidats" missing={[]}>
          Vivre mon quinquennat
        </NextAction>
        <Link href="/candidats" className={styles.secondaryLink}>
          Passer ces questions
        </Link>
      </div>
      </div>
      </div>
    </main>
  );
}
