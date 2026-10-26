"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeIcon } from "@/components/BadgeIcon";
import { completeProfile, freshResult } from "@/lib/journey";
import { loadJourney } from "@/lib/journey-store";
import { cryptoRandom, shuffle } from "@/lib/shuffle";
import { describeTime, formatMoney } from "@/lib/ticket-labels";
import type { Badge } from "@/lib/badges";
import styles from "./fiche.module.css";

/** « En clair » avec sa version détaillée. */
export function Summary({ simple, normal }: { simple: string; normal: string }) {
  const [detailed, setDetailed] = useState(false);
  return (
    <section className={styles.clear}>
      <h2 className={styles.clearTitle}>En clair</h2>
      <p className={styles.clearText}>{detailed ? normal : simple}</p>
      {simple !== normal ? (
        <button type="button" className={styles.pillButton} onClick={() => setDetailed((d) => !d)} aria-pressed={detailed}>
          {detailed ? "Version simple" : "Version détaillée"}
        </button>
      ) : null}
    </section>
  );
}

/**
 * « Ce que ça change pour toi » : lu dans le résultat gardé sur l'appareil (rien n'est demandé au serveur).
 * Sans résultat, invite à créer son personnage.
 */
export function ForYou({ measureId, candidateId, versions }: { measureId: string; candidateId: string; versions: Record<string, string> }) {
  const [text, setText] = useState<string | null>(null);
  const [state, setState] = useState<"none" | "concerne" | "rien" | "valeur">("none");
  useEffect(() => {
    const j = loadJourney();
    const profile = j ? completeProfile(j.profile) : null;
    const tickets = j && profile ? freshResult(j, profile, versions) : null;
    const ticket = tickets?.find((t) => t.candidateId === candidateId);
    if (!ticket) return;
    const lines = ticket.lines.filter((l) => l.measureIds.includes(measureId));
    const money = lines.find((l) => l.section === "portefeuille" && l.value);
    const time = lines.find((l) => l.section === "temps" && l.value);
    if (money?.value) {
      setState("valeur");
      setText(`${formatMoney(money.value)} / mois`);
    } else if (time) {
      setState("valeur");
      setText(describeTime(time));
    } else setState(lines.length > 0 ? "concerne" : "rien");
  }, [measureId, candidateId, versions]);

  if (state === "none") {
    return (
      <Link href="/personnage" className={styles.forYou}>
        <span className={styles.forYouLabel}>Ce que ça change pour toi</span>
        <span className={styles.forYouValue}>Crée ton perso pour le savoir</span>
      </Link>
    );
  }
  return (
    <Link href="/quinquennat" className={styles.forYou}>
      <span className={styles.forYouLabel}>Ce que ça change pour toi</span>
      <span className={styles.forYouValue}>
        {state === "valeur" ? text : state === "concerne" ? "Elle concerne ton profil" : "Rien, d'après ton profil"}
      </span>
    </Link>
  );
}

export interface OtherMeasure {
  candidateId: string;
  displayName: string;
  party: string;
  badge: Badge;
  measure: { href: string; title: string } | null;
}

/** Les autres candidats sur ce thème, dans un ordre tiré au sort à chaque visite. */
export function Others({ others }: { others: readonly OtherMeasure[] }) {
  const [order, setOrder] = useState<OtherMeasure[] | null>(null);
  useEffect(() => setOrder(shuffle(others, cryptoRandom)), [others]);
  if (!order) return null;
  return (
    <ul className={styles.others}>
      {order.map((o) => (
        <li key={o.candidateId} className={styles.other} data-empty={o.measure === null}>
          <span className={styles.otherHead}>
            <BadgeIcon badge={o.badge} size={12} /> {o.displayName} · {o.party}
          </span>
          {o.measure ? <Link href={o.measure.href}>{o.measure.title}</Link> : <span>Pas de mesure sur ce thème dans son programme.</span>}
        </li>
      ))}
    </ul>
  );
}

export function Share({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <section className={styles.share}>
      <h2 className={styles.shareTitle}>Partager cette mesure</h2>
      <div className={styles.shareActions}>
        <button
          type="button"
          className={styles.shareMain}
          onClick={() => {
            if (navigator.share) navigator.share({ title, url: location.href }).catch(() => undefined);
            else navigator.clipboard?.writeText(location.href).then(() => setCopied(true), () => undefined);
          }}
        >
          Partager
        </button>
        <button type="button" className={styles.shareCopy} onClick={() => navigator.clipboard?.writeText(location.href).then(() => setCopied(true), () => undefined)}>
          {copied ? "Lien copié" : "Copier le lien"}
        </button>
      </div>
      <p className={styles.note}>Le lien ne contient aucune donnée personnelle.</p>
    </section>
  );
}
