"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Profile, TicketLineResult } from "@mon-quinquennat/schema";
import { BadgeIcon } from "@/components/BadgeIcon";
import { DeskHeader } from "@/components/flow/DeskHeader";
import { effectSentence, type Catalog } from "@/lib/catalog";
import { buildTimeline, cumulAt, END_MONTH, spread, START_MONTH, type Lane, type TimelineItem } from "@/lib/frise";
import { plural } from "@/lib/format";
import { monthsBetween, nextMonth, prevMonth } from "@/lib/term";
import { describeTime, formatMoney, formatMonth, LINE_LABELS } from "@/lib/ticket-labels";
import { Clock, House, Payslip, Scene } from "./Scene";
import { SourceSheet, type SheetTarget } from "./SourceSheet";
import styles from "./quinquennat.module.css";

type Moment = Extract<TimelineItem, { kind: "moment" }>;

const YEARS = [2027, 2028, 2029, 2030, 2031, 2032];
const SECTIONS = [
  ["portefeuille", "Ton portefeuille"],
  ["temps", "Ton temps"],
  ["vie", "Ta vie"],
] as const;
const TOTAL_MONTHS = monthsBetween(START_MONTH, END_MONTH);

function headline(m: Moment): string {
  if (m.position === "start") return "Élection. Ton quinquennat commence.";
  if (m.position === "end") return "Fin du mandat.";
  const lines = m.entries.flatMap((e) => e.lines);
  if (lines.some((l) => l.section === "portefeuille")) return "Ce qui change sur ton budget.";
  if (lines.some((l) => l.section === "temps")) return "Ce qui change pour ta retraite.";
  return "Ce qui change autour de toi.";
}

/** Libellé court du moment dans la liste latérale (desktop). */
function shortLabel(m: Moment): string {
  if (m.position === "start") return "Élection";
  if (m.position === "end") return "Fin du mandat";
  const lines = m.entries.flatMap((e) => e.lines);
  if (lines.some((l) => l.section === "portefeuille")) return "Ton budget";
  if (lines.some((l) => l.section === "temps")) return "Ta retraite";
  return "Autour de toi";
}

function chip(m: Moment): string {
  if (m.position === "start") return "Début du mandat";
  if (m.position === "end") return "Fin du mandat";
  return m.dateOrigin === "annoncee" ? "Date annoncée par le programme" : "Date estimée : le programme ne la donne pas";
}

function illustration(m: Moment) {
  const lines = m.entries.flatMap((e) => e.lines);
  if (lines.some((l) => l.section === "portefeuille")) return Payslip;
  if (lines.some((l) => l.section === "temps")) return Clock;
  return House;
}

export interface LaneView extends Lane {
  label: string;
  badge: Parameters<typeof BadgeIcon>[0]["badge"] | null;
}

function LaneHead({ lane }: { lane: LaneView }) {
  return (
    <span className={styles.laneHead}>
      {lane.mystery ? <span className={styles.mysteryMark}>?</span> : lane.badge ? <BadgeIcon badge={lane.badge} size={11} /> : null}
      {lane.label}
    </span>
  );
}

function LineText({ line, catalog }: { line: TicketLineResult; catalog: Catalog }) {
  if (line.section === "portefeuille" && line.value) {
    return (
      <span className={styles.money}>
        <span className={styles.moneyValue}>{formatMoney(line.value, false)}/mois</span>
        <span className={styles.moneyLabel}>
          {LINE_LABELS[line.ticketLine]} · dès {formatMonth(line.effectiveDate, true).toLowerCase()}
          {line.nature === "estime" ? " · estimé" : ""}
        </span>
      </span>
    );
  }
  if (line.section === "temps" && line.value) return <span className={styles.fact}>{describeTime(line)}</span>;
  const sentences = line.measureIds.flatMap((id) => {
    const m = catalog.measures[id];
    return m ? [effectSentence(m, line.ticketLine)] : [];
  });
  return (
    <>
      {sentences.map((s) => (
        <span key={s} className={styles.fact}>
          {s}
        </span>
      ))}
    </>
  );
}

export function Frise({
  lanes,
  catalog,
  profile,
  initialMonth,
  onMonth,
}: {
  lanes: readonly LaneView[];
  catalog: Catalog;
  profile: Profile;
  initialMonth: string | null;
  onMonth: (month: string) => void;
}) {
  const items = useMemo(() => buildTimeline(lanes, catalog), [lanes, catalog]);
  const moments = items.filter((i): i is Moment => i.kind === "moment");
  const [current, setCurrent] = useState(initialMonth && moments.some((m) => m.month === initialMonth) ? initialMonth : START_MONTH);
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  const refs = useRef(new Map<string, HTMLElement>());
  const byKey = useMemo(() => new Map(lanes.map((l) => [l.key, l])), [lanes]);

  // Le moment le plus haut encore visible devient le moment courant (en-tête, reprise).
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).map((e) => (e.target as HTMLElement).dataset.month ?? "");
        if (visible.length > 0) setCurrent([...visible].sort()[0] ?? START_MONTH);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const el of refs.current.values()) observer.observe(el);
    return () => observer.disconnect();
  }, [moments.length]);
  useEffect(() => onMonth(current), [current, onMonth]);
  useEffect(() => {
    if (initialMonth && initialMonth !== START_MONTH) refs.current.get(initialMonth)?.scrollIntoView();
    // Une seule fois, à l'arrivée sur la frise.
  }, []);

  const index = Math.max(0, moments.findIndex((m) => m.month === current));
  const next = moments[index + 1];
  const goTo = (month: string) => refs.current.get(month)?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Desktop : la flèche ↓ passe au moment suivant (DK-frise), sauf dans un champ ou la fiche source.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" || sheet || !window.matchMedia("(min-width: 1024px)").matches) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, select, textarea, dialog")) return;
      if (!next) return;
      e.preventDefault();
      goTo(next.month);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const progress = Math.min(1, Math.max(0, monthsBetween(START_MONTH, current) / TOTAL_MONTHS));
  const gapNow = spread(lanes, current);

  return (
    <>
    <DeskHeader current={4} />
    <div className={styles.frisePage}>
      <h1 className="visually-hidden">Ton quinquennat</h1>
      <nav className={styles.momentNav} aria-label="Moments du quinquennat">
        <b>Ton quinquennat</b>
        {YEARS.map((y) => {
          const inYear = moments.filter((m) => m.month.startsWith(String(y)));
          if (inYear.length === 0) return null;
          return (
            <div key={y} className={styles.navYear}>
              <span>{y}</span>
              {inYear.map((m) => (
                <button key={m.month} type="button" aria-current={m.month === current ? "step" : undefined} onClick={() => goTo(m.month)}>
                  {formatMonth(m.month).replace(/ \d{4}$/, "")} · {shortLabel(m)}
                </button>
              ))}
            </div>
          );
        })}
      </nav>

      <aside className={styles.counter}>
      <header className={styles.friseHeader}>
        <div className={styles.friseTop}>
          <span className={styles.brandOnInk}>Mon quinquennat</span>
          <a href={`#moment-${END_MONTH}`} className={styles.jump}>
            Aller à 2032
          </a>
        </div>
        <div className={styles.friseNow}>
          <span className={styles.friseMonth}>{formatMonth(current)}</span>
          <span className={styles.friseCount}>
            moment {index + 1} sur {moments.length}
          </span>
        </div>
        <div className={styles.track} role="img" aria-label={`Avancement : ${Math.round(progress * 100)} % du mandat`}>
          <div className={styles.trackFill} style={{ width: `${progress * 100}%` }} />
        </div>
        <div className={styles.years} aria-hidden="true">
          {YEARS.map((y) => (
            <span key={y}>{y}</span>
          ))}
        </div>
        <p className={styles.friseCaption}>Ce que tu as gagné ou perdu depuis mai 2027</p>
        <div className={styles.totals}>
          {lanes.map((l) => (
            <div key={l.key} className={styles.total} data-mystery={l.mystery}>
              <LaneHead lane={l} />
              <span className={styles.totalValue}>{formatMoney(cumulAt(l.ticket, current), false)}</span>
            </div>
          ))}
        </div>
      </header>

      {next ? (
        <footer className={styles.friseFooter}>
          <span className={styles.remaining}>
            Plus que {plural(moments.length - index - 1, "moment")}
          </span>
          <button type="button" className={styles.next} onClick={() => goTo(next.month)}>
            <span className={styles.nextMobile}>Suite ↓</span>
            <span className={styles.nextDesk}>Moment suivant ↓</span>
          </button>
          <span className={styles.keyHint}>
            ou touche <kbd>↓</kbd>
          </span>
        </footer>
      ) : null}
      </aside>

      <ol className={styles.timeline}>
        {items.map((item) => {
          if (item.kind === "gap") {
            const first = formatMonth(nextMonth(item.from)).toLowerCase();
            const last = formatMonth(prevMonth(item.to)).toLowerCase();
            return (
              <li key={`gap-${item.from}`} className={styles.gap}>
                <span className={styles.gapDots} aria-hidden="true" />
                <b>{plural(item.months, "mois passe", "mois passent")}…</b>
                <span>{item.months === 1 ? `Rien ne change pour toi en ${first}.` : `Rien ne change pour toi de ${first} à ${last}.`}</span>
              </li>
            );
          }
          const hasLines = item.entries.some((e) => e.lines.length > 0);
          return (
            <li
              key={item.month}
              id={`moment-${item.month}`}
              data-month={item.month}
              ref={(el) => {
                if (el) refs.current.set(item.month, el);
              }}
              className={styles.moment}
              data-position={item.position}
            >
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.momentChip}>{chip(item)}</span>
              <h2 className={styles.momentTitle}>
                {formatMonth(item.month)}.{" "}
                <br />
                {headline(item)}
              </h2>
              {hasLines ? <Scene profile={profile}>{illustration(item)}</Scene> : null}
              {hasLines || item.position === "end" ? (
                <div className={styles.cards}>
                  {item.entries.map((e) => {
                    const lane = byKey.get(e.laneKey);
                    if (!lane) return null;
                    if (item.position === "end") {
                      const c = cumulAt(lane.ticket, END_MONTH);
                      return (
                        <div key={e.laneKey} className={styles.card} data-mystery={lane.mystery}>
                          <LaneHead lane={lane} />
                          <span className={styles.money}>
                            <span className={styles.moneyValue}>{formatMoney(c, false)}</span>
                            <span className={styles.moneyLabel}>
                              en 5 ans · puis {formatMoney({ low: lane.ticket.solde.low, high: lane.ticket.solde.high })}/mois une fois tout appliqué
                            </span>
                          </span>
                        </div>
                      );
                    }
                    if (e.lines.length === 0) {
                      return (
                        <div key={e.laneKey} className={styles.card} data-empty="true" data-mystery={lane.mystery}>
                          <LaneHead lane={lane} />
                          <span className={styles.moneyValue}>= 0 €</span>
                          <span className={styles.moneyLabel}>rien ne change à cette date</span>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={e.laneKey}
                        type="button"
                        className={styles.card}
                        data-mystery={lane.mystery}
                        aria-label={`${lane.label} : d'où viennent ces chiffres ?`}
                        onClick={() => setSheet({ laneLabel: `${lane.label} · ${formatMonth(item.month)}`, candidateId: lane.candidateId, mystery: lane.mystery, lines: e.lines, ticket: lane.ticket })}
                      >
                        <LaneHead lane={lane} />
                        {SECTIONS.map(([section, title]) => {
                          const lines = e.lines.filter((l) => l.section === section);
                          if (lines.length === 0) return null;
                          return (
                            <span key={section} className={styles.cardSection}>
                              {new Set(e.lines.map((l) => l.section)).size > 1 ? <span className={styles.cardSectionTitle}>{title}</span> : null}
                              {lines.map((l, i) => (
                                <LineText key={`${l.ticketLine}-${i}`} line={l} catalog={catalog} />
                              ))}
                            </span>
                          );
                        })}
                        <span className={styles.flip}>D&apos;où ça vient ?</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.quiet}>Aucune mesure de tes programmes ne s&apos;applique à cette date.</p>
              )}
              {gapNow >= 1 && item.month === current && lanes.length > 1 && item.position !== "start" ? (
                <p className={styles.insight}>
                  <b>Les trajectoires se séparent.</b> Déjà {formatMoney({ low: gapNow, high: gapNow }, false).replace("+", "")} d&apos;écart entre deux de tes
                  programmes.
                </p>
              ) : null}
              {item.position === "end" ? (
                <div className={styles.endActions}>
                  <Link href="/recap" className={styles.primary}>
                    Voir mon ticket
                  </Link>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <SourceSheet target={sheet} catalog={catalog} profile={profile} onClose={() => setSheet(null)} />
    </div>
    </>
  );
}
