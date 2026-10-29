"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DeskHeader } from "@/components/flow/DeskHeader";
import { BadgeIcon } from "@/components/BadgeIcon";
import { FlowTop, formStyles as styles } from "@/components/form/fields";
import { plural } from "@/lib/format";
import { completeProfile, MAX_CANDIDATES, mysteryPool, startQuinquennat, toggleCandidate } from "@/lib/journey";
import { STATUS_SHORT, type ProgrammeSummary } from "@/lib/programme-summary";
import { cryptoRandom, shuffle } from "@/lib/shuffle";
import { useJourney } from "@/lib/use-journey";
import own from "./StepCandidats.module.css";

const FIRST_SHOWN = 4;

export function StepCandidats({ programmes }: { programmes: readonly ProgrammeSummary[] }) {
  const router = useRouter();
  const { journey, update } = useJourney();
  // Ordre tiré au sort à chaque visite, dans le navigateur.
  const [order, setOrder] = useState<ProgrammeSummary[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const incomplete = journey ? completeProfile(journey.profile) === null : false;

  useEffect(() => setOrder(shuffle(programmes, cryptoRandom)), [programmes]);
  useEffect(() => {
    if (incomplete) router.replace("/personnage/vie");
  }, [incomplete, router]);

  if (!journey || !order || incomplete) return <div className={styles.page} aria-busy="true" />;
  const { choix } = journey;
  const allIds = programmes.map((p) => p.id);
  const poolSize = mysteryPool(allIds, choix).length;
  const mysteryOn = choix.mystere && poolSize > 0;
  const visible = showAll ? order : order.slice(0, FIRST_SHOWN);
  const hidden = order.length - visible.length;
  const known = new Set(allIds);
  const chosen = choix.candidats.filter((id) => known.has(id));

  const toggle = (p: ProgrammeSummary) =>
    update((j) => {
      const next = toggleCandidate({ ...j.choix, candidats: j.choix.candidats.filter((id) => known.has(id)) }, p.id);
      const versions = Object.fromEntries(next.candidats.map((id) => [id, programmes.find((x) => x.id === id)?.corpusId ?? ""]));
      return { ...j, choix: { ...next, mystereId: null }, versions };
    });

  const label = chosen.length === 0 ? "Choisis au moins un programme" : `Vivre ${plural(chosen.length, "programme")}${mysteryOn ? " + 1 mystère" : ""}`;

  return (
    <main className={styles.page}>
      <DeskHeader current={3} />
      <FlowTop back="/personnage/vie" pill={`${chosen.length} / ${MAX_CANDIDATES} choisis`} />
      <div className={own.layout}>
      <div className={own.main}>
      <div className={styles.introText}>
        <h1 className={styles.title}>
          Quels programmes{" "}
          <br />
          veux-tu vivre ?
        </h1>
        <p className={styles.lead}>
          Choisis jusqu&apos;à {MAX_CANDIDATES} candidats. Seuls ceux qui ont publié un programme apparaissent, dans un ordre tiré au hasard.
        </p>
      </div>

      <ul className={own.list}>
        {visible.map((p) => {
          const selected = chosen.includes(p.id);
          const full = !selected && chosen.length >= MAX_CANDIDATES;
          return (
            <li key={p.id}>
              <button type="button" className={own.card} aria-pressed={selected} disabled={full} onClick={() => toggle(p)}>
                <span className={own.photo} aria-hidden="true">
                  <span className={own.badge}>
                    <BadgeIcon badge={p.badge} size={10} />
                  </span>
                </span>
                <span className={own.text}>
                  <span className={own.name}>{p.displayName}</span>
                  <span className={own.party}>{p.party}</span>
                  <span className={own.meta}>
                    {plural(p.measureCount, "mesure")} · {STATUS_SHORT[p.status]}
                  </span>
                </span>
                {selected ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {hidden > 0 ? (
        <button type="button" className={own.more} onClick={() => setShowAll(true)}>
          Voir {hidden === 1 ? "l'autre candidat" : `les ${hidden} autres candidats`}
        </button>
      ) : null}
      </div>

      {/* Sur desktop, panneau « Ta sélection » fixe à droite (DK-candidats) ; sur mobile, la suite du flux. */}
      <aside className={own.panel} aria-label="Ta sélection">
        <div className={own.panelHead}>
          <b>Ta sélection</b>
          <span>
            {chosen.length} / {MAX_CANDIDATES}
          </span>
        </div>
        <ul className={own.picked}>
          {chosen.map((id) => {
            const c = programmes.find((x) => x.id === id);
            if (!c) return null;
            return (
              <li key={id}>
                <BadgeIcon badge={c.badge} size={12} />
                <span className={own.text}>
                  <b>{c.displayName}</b>
                  <span>{c.party}</span>
                </span>
                <button type="button" className={own.remove} onClick={() => toggle(c)} aria-label={`Retirer ${c.displayName}`}>
                  ×
                </button>
              </li>
            );
          })}
          {chosen.length < MAX_CANDIDATES ? <li className={own.slot}>{chosen.length === 0 ? "Choisis un premier programme" : "Encore une place (facultatif)"}</li> : null}
        </ul>

      <button
        type="button"
        role="switch"
        aria-checked={mysteryOn}
        disabled={poolSize === 0}
        className={own.mystery}
        onClick={() => update((j) => ({ ...j, choix: { ...j.choix, mystere: !j.choix.mystere, mystereId: null } }))}
      >
        <span className={own.mysteryIcon} aria-hidden="true">
          ?
        </span>
        <span className={own.text}>
          <span className={own.name}>+ 1 programme mystère</span>
          <span className={own.why}>
            {poolSize === 0
              ? "Tous les programmes publiés sont déjà choisis : pas de mystère possible."
              : "Tiré au hasard, anonyme pendant le quinquennat, révélé à la fin."}
          </span>
        </span>
        <span className={own.switch} aria-hidden="true" />
      </button>

      <div className={`${styles.actions} ${own.panelActions}`}>
        <button
          type="button"
          className={styles.primary}
          aria-disabled={chosen.length === 0}
          onClick={() => {
            if (chosen.length === 0) return;
            // Ordre des programmes et mystère tirés au sort dans le navigateur, au départ de la frise.
            update((j) => ({ ...j, choix: startQuinquennat(allIds, { ...j.choix, candidats: chosen }, cryptoRandom, shuffle) }));
            router.push("/quinquennat");
          }}
        >
          {label}
        </button>
      </div>
      <p className={own.serverNote}>Le serveur calcule tous les programmes : il ne sait jamais lesquels tu as choisis.</p>
      </aside>
      </div>
    </main>
  );
}
