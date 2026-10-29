"use client";

import type { Ticket, TicketLineResult } from "@mon-quinquennat/schema";
import { Avatar } from "@/components/Avatar";
import { BadgeIcon } from "@/components/BadgeIcon";
import type { Badge } from "@/lib/badges";
import { effectSentence, type Catalog } from "@/lib/catalog";
import { plural } from "@/lib/format";
import { describeTime, formatMoney, LINE_LABELS } from "@/lib/ticket-labels";
import styles from "./ticket.module.css";

const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

export interface TicketHead {
  /** null : programme mystère pas encore révélé. */
  candidate: { displayName: string; badge: Badge } | null;
  profileLine: string | null;
  avatar: { genre: "femme" | "homme" | "autre"; age: number } | null;
}

/** Ticket « Ma vie en 2032 » (maquettes D-fiche et T0-vide). */
export function TicketCard({
  ticket,
  catalog,
  head,
  onLine,
  maxFacts = 6,
  children,
}: {
  ticket: Ticket;
  catalog: Catalog | null;
  head: TicketHead;
  onLine?: (line: TicketLineResult) => void;
  maxFacts?: number;
  children?: React.ReactNode;
}) {
  const money = ticket.lines.filter((l) => l.section === "portefeuille" && l.value);
  const time = ticket.lines.filter((l) => l.section === "temps" && l.value);
  const facts = ticket.lines.filter((l) => l.nature === "qualitatif");
  const sentences = facts.flatMap((l) =>
    l.measureIds.flatMap((id) => {
      const m = catalog?.measures[id];
      return m ? [{ line: l, text: effectSentence(m, l.ticketLine), id }] : [];
    }),
  );
  const shown = sentences.slice(0, maxFacts);
  const Line = ({ line, i, children: label }: { line: TicketLineResult; i: number; children: React.ReactNode }) =>
    onLine ? (
      <button type="button" className={styles.lineButton} onClick={() => onLine(line)}>
        {label}
        <span className={styles.ref} aria-label={`source ${i + 1}`}>
          {CIRCLED[i] ?? `(${i + 1})`}
        </span>
      </button>
    ) : (
      <span className={styles.lineText}>{label}</span>
    );

  return (
    <article className={styles.ticket}>
      <header className={styles.head}>
        {head.avatar ? (
          <span className={styles.avatar}>
            <Avatar genre={head.avatar.genre} age={head.avatar.age} size={60} />
          </span>
        ) : null}
        <div>
          <h2 className={styles.title}>MA VIE EN {ticket.horizonYear}</h2>
          <p className={styles.mono}>
            {head.candidate ? (
              <>
                si{" "}
                <span className={styles.nowrap}>
                  <BadgeIcon badge={head.candidate.badge} size={11} /> {head.candidate.displayName}
                </span>{" "}
                passe
              </>
            ) : (
              "si… ce programme passe :"
            )}
          </p>
        </div>
      </header>
      <p className={styles.mono}>{head.profileLine ?? "Profil masqué"}</p>
      <p className={styles.muted}>
        Comparé aux règles de {ticket.baselineRulesYear}, une fois toutes les mesures appliquées.
      </p>

      <div className={styles.rule} />
      <div className={styles.sectionHead}>
        <span>TON PORTEFEUILLE</span>
        <span className={styles.unit}>par mois · + = pour toi</span>
      </div>
      {money.length === 0 ? (
        <div className={styles.empty}>
          <b>= 0 €</b>
          <span>Aucune mesure chiffrée de ce programme ne change ton portefeuille, d&apos;après sa version actuelle.</span>
        </div>
      ) : (
        <>
          {money.map((l, i) => (
            <div key={`${l.ticketLine}-${i}`} className={styles.row}>
              <Line line={l} i={i}>
                {l.nature === "estime" ? "≈ " : ""}
                {LINE_LABELS[l.ticketLine]}
              </Line>
              <span className={styles.amount}>{l.value ? formatMoney(l.value) : ""}</span>
            </div>
          ))}
          <div className={styles.rule} />
          <div className={styles.solde}>
            <span>
              SOLDE / MOIS
              {ticket.solde.sureOnly !== ticket.solde.low || ticket.solde.low !== ticket.solde.high ? (
                <span className={styles.muted}>dont certain : {formatMoney({ low: ticket.solde.sureOnly, high: ticket.solde.sureOnly })}</span>
              ) : null}
            </span>
            <b className={styles.soldeValue}>{formatMoney({ low: ticket.solde.low, high: ticket.solde.high })}</b>
          </div>
          <p className={styles.muted}>Sur les 5 ans du mandat : {formatMoney(ticket.cumul5ans)}</p>
        </>
      )}
      {ticket.uncomputed.length > 0 ? (
        <ul className={styles.uncomputed}>
          {ticket.uncomputed.map((u, i) => (
            <li key={`${u.ticketLine}-${i}`}>
              Non calculé : {LINE_LABELS[u.ticketLine]} ({u.reason.replace(/\.$/, "")})
            </li>
          ))}
        </ul>
      ) : null}

      <div className={styles.rule} />
      <div className={styles.sectionHead}>
        <span>TON TEMPS</span>
      </div>
      {time.length === 0 ? (
        <p className={styles.mono}>Aucune mesure chiffrée sur ton temps.</p>
      ) : (
        time.map((l, i) => (
          <div key={`${l.ticketLine}-${i}`} className={styles.row}>
            <Line line={l} i={money.length + i}>
              {describeTime(l)}
            </Line>
          </div>
        ))
      )}

      {sentences.length > 0 ? (
        <>
          <div className={styles.sectionHead}>
            <span>TA VIE</span>
          </div>
          <ul className={styles.facts}>
            {shown.map((s) => (
              <li key={s.id + s.line.ticketLine}>
                {onLine ? (
                  <button type="button" className={styles.factButton} onClick={() => onLine(s.line)}>
                    {s.text}
                  </button>
                ) : (
                  s.text
                )}
              </li>
            ))}
          </ul>
          {sentences.length > shown.length ? <p className={styles.muted}>et {plural(sentences.length - shown.length, "autre mesure", "autres mesures")} qui te concernent.</p> : null}
        </>
      ) : null}

      {ticket.pendingMeasures > 0 ? (
        <p className={styles.pending}>
          <b>{plural(ticket.pendingMeasures, "mesure", "mesures")} de ce programme encore en vérification</b> n&apos;apparaissent pas ici. Le ticket se mettra à
          jour quand elles seront validées.
        </p>
      ) : null}

      <div className={styles.rule} />
      <p className={styles.foot}>
        {onLine && money.length + time.length > 1 ? `${CIRCLED[0]} à ${CIRCLED[money.length + time.length - 1] ?? ""} : touche une ligne pour voir sa source. ` : ""}
        {onLine && money.length + time.length === 1 ? `${CIRCLED[0]} : touche la ligne pour voir sa source. ` : ""}
        Chiffres pour un foyer comme le tien. Et toi, ça donne quoi ?
      </p>
      {children}
    </article>
  );
}
