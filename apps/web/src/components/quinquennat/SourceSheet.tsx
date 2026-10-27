"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Profile, Ticket, TicketLineResult } from "@mon-quinquennat/schema";
import { effectSentence, sourceLink, sourcePlace, type Catalog } from "@/lib/catalog";
import { formatDate } from "@/lib/format";
import { AMOUNT_SIGN, describeTime, formatAmount, formatMoney, formatMonth, LINE_LABELS, NATURE_LABELS } from "@/lib/ticket-labels";
import styles from "./quinquennat.module.css";

const CHECK_LABELS: Record<string, string> = {
  format: "format",
  citation_exacte: "citation exacte",
  chiffres_fideles: "chiffres fidèles",
  relecture_sens: "relecture du sens",
  relecture_croisee: "relecture croisée",
  double_extraction: "double extraction",
  vraisemblance: "vraisemblance",
  neutralite: "neutralité",
};

export interface SheetTarget {
  laneLabel: string;
  candidateId: string;
  mystery: boolean;
  lines: TicketLineResult[];
  ticket: Ticket;
}

function household(p: Profile): string {
  const adults = p.situationFamiliale === "seul" ? 1 : 2;
  const kids = p.enfants.length;
  return `${adults} adulte${adults > 1 ? "s" : ""}${kids > 0 ? `, ${kids} enfant${kids > 1 ? "s" : ""}` : ""}`;
}

function lineTitle(l: TicketLineResult): string {
  if (l.section === "portefeuille" && l.value) return `${LINE_LABELS[l.ticketLine]} : ${formatMoney(l.value)} / mois`;
  if (l.section === "temps") return describeTime(l);
  return LINE_LABELS[l.ticketLine];
}

/** S1 « D'où vient ce chiffre ? » : la mesure citée, le calcul pour ton profil, la vérification. */
export function SourceSheet({ target, catalog, profile, onClose }: { target: SheetTarget | null; catalog: Catalog; profile: Profile; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (target && !dialog.current?.open) dialog.current?.showModal();
    if (!target && dialog.current?.open) dialog.current.close();
  }, [target]);

  const programme = target ? catalog.programmes[target.candidateId] : undefined;
  return (
    <dialog ref={dialog} className={styles.sheet} aria-labelledby="source-titre" onClose={onClose}>
      {target ? (
        <>
          <button type="button" className={styles.sheetClose} aria-label="Fermer" onClick={onClose}>
            ×
          </button>
          <div className={styles.sheetKicker}>D&apos;où vient ce chiffre ?</div>
          <h2 id="source-titre" className={styles.sheetTitle}>
            {target.laneLabel}
          </h2>
          {target.lines.map((l, i) => {
            const measures = l.measureIds.flatMap((id) => catalog.measures[id] ?? []);
            const after = l.baseline !== undefined && l.value ? l.baseline + (AMOUNT_SIGN[l.ticketLine] ?? 1) * l.value.low : null;
            return (
              <section key={`${l.ticketLine}-${i}`} className={styles.sheetLine}>
                <div className={styles.sheetLineHead}>
                  <h3>{lineTitle(l)}</h3>
                  <span className={styles.natureChip}>{NATURE_LABELS[l.nature]}</span>
                </div>

                <div className={styles.sheetStep}>
                  <span className={styles.stepNum}>1</span>
                  <div>
                    <b>La mesure</b>
                    {target.mystery ? (
                      <p className={styles.muted}>Programme mystère : sa source et sa citation seront dévoilées à la fin du quinquennat.</p>
                    ) : (
                      measures.map((m) => {
                        const src = m.sources[0];
                        const doc = src ? programme?.documents[src.documentId] : undefined;
                        return (
                          <div key={m.id} className={styles.sheetMeasure}>
                            {l.nature === "qualitatif" ? <p>{effectSentence(m, l.ticketLine)}</p> : null}
                            {src ? <blockquote className={styles.quote}>« {src.quote} »</blockquote> : null}
                            {doc && src && programme ? (
                              <>
                                <span className={styles.muted}>
                                  Programme de {programme.displayName} ({programme.party}), {sourcePlace(doc, src.page)} · version collectée le{" "}
                                  {formatDate(programme.collectedAt)}
                                </span>
                                <span className={styles.links}>
                                  <a href={sourceLink(doc, src.page)} target="_blank" rel="noopener noreferrer">
                                    Lire sur le site du candidat
                                  </a>
                                  <Link href={`/programme/${programme.slug}/${m.id}`}>Fiche de la mesure</Link>
                                </span>
                              </>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className={styles.sheetStep}>
                  <span className={styles.stepNum}>2</span>
                  <div>
                    <b>{l.nature === "qualitatif" ? "Pourquoi cette ligne te concerne" : "Le calcul pour ton profil"}</b>
                    {l.section === "portefeuille" && l.value ? (
                      <>
                        <div className={styles.calcBox}>
                          Foyer : {household(profile)}
                          <br />
                          Revenus : {formatAmount(profile.revenusNetsMensuels + (profile.revenusConjointNetsMensuels ?? 0))} / mois
                          <br />
                          Règles actuelles : {l.baseline !== undefined ? formatAmount(l.baseline) : "—"} / mois
                          <br />
                          Avec le programme : {after !== null ? formatAmount(after) : "—"} / mois
                          <br />
                          <b>Écart pour toi : {formatMoney(l.value)} / mois</b>
                        </div>
                        <span className={styles.muted}>
                          Barèmes officiels calculés avec OpenFisca, le moteur open source des règles fiscales et sociales, règles de {target.ticket.baselineRulesYear}.
                        </span>
                      </>
                    ) : l.section === "temps" ? (
                      <span className={styles.muted}>
                        Âge légal du programme comparé à l&apos;âge légal actuel de ta génération (barème officiel publié par Service-Public). Avec ton âge seul, ta
                        date de naissance peut tomber sur deux lignes du barème : d&apos;où une fourchette éventuelle.
                      </span>
                    ) : (
                      <span className={styles.muted}>Pas de montant : une phrase factuelle tirée du programme, retenue parce qu&apos;elle concerne ton profil.</span>
                    )}
                    {l.nature !== "qualitatif" && target.ticket.hypotheses.length > 0 ? (
                      <ul className={styles.hypotheses}>
                        {target.ticket.hypotheses.map((h) => (
                          <li key={h}>{h}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>

                <div className={styles.sheetStep}>
                  <span className={styles.stepNum}>3</span>
                  <div>
                    <b>Vérification</b>
                    {measures.map((m) => (
                      <span key={m.id} className={styles.muted}>
                        {target.mystery ? "Mesure" : m.title} : extraite le {formatDate(m.extractedAt)}, contrôles passés : {m.checks.map((c) => CHECK_LABELS[c] ?? c).join(", ")}.{" "}
                        {m.schedule.dateOrigin === "annoncee"
                          ? `Date d'effet annoncée par le programme : ${formatMonth(m.schedule.effectiveDate).toLowerCase()}.`
                          : `Date d'effet estimée (${formatMonth(m.schedule.effectiveDate).toLowerCase()}) : ${m.schedule.estimationRule ?? "date non annoncée"}.`}
                        {/* Pas de lien pour le mystère : la page de signalement nommerait le candidat. */}
                        {target.mystery ? null : (
                          <>
                            {" "}
                            <Link href={`/signaler?mesure=${m.id}`}>Signaler une erreur</Link>
                          </>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </>
      ) : null}
    </dialog>
  );
}
