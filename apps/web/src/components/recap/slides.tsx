"use client";

import type { ReactNode } from "react";
import { BadgeIcon } from "@/components/BadgeIcon";
import type { Badge } from "@/lib/badges";
import type { Catalog } from "@/lib/catalog";
import { certainty, certaintyLabel, glance, themes, type ThemeRow } from "@/lib/recap";
import { formatDuration, formatMoney } from "@/lib/ticket-labels";
import type { Ticket } from "@mon-quinquennat/schema";
import styles from "./recap.module.css";

export interface RecapLane {
  key: string;
  candidateId: string;
  mystery: boolean;
  /** Nom affiché ; pour le mystère, révélé seulement à la fin. */
  label: string;
  badge: Badge | null;
  party: string;
  slug: string;
  ticket: Ticket;
}

export function LaneMark({ lane }: { lane: RecapLane }) {
  return lane.mystery && !lane.badge ? <span className={styles.mysteryMark}>?</span> : lane.badge ? <BadgeIcon badge={lane.badge} size={14} /> : null;
}

const euro = (n: number) => formatMoney({ low: n, high: n }, false);

/** R3 : en un coup d'œil. Pas de classement : l'ordre est celui du choix. */
export function GlanceSlide({ lanes }: { lanes: readonly RecapLane[] }) {
  const rows = lanes.map((l) => ({ lane: l, g: glance(l.ticket) }));
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.g.annual)));
  return (
    <>
      <h1 className={styles.h1}>
        {lanes.length > 1 ? `Tes ${lanes.length} programmes,` : "Ton programme,"}{" "}
        <br />
        en un coup d&apos;œil
      </h1>
      <div className={styles.table} role="table" aria-label="Comparaison des programmes">
        <div className={styles.tr} role="row">
          <span role="columnheader" />
          {rows.map(({ lane }) => (
            <span key={lane.key} role="columnheader" className={styles.th}>
              <LaneMark lane={lane} />
              {lane.label}
            </span>
          ))}
        </div>
        <div className={styles.tr} role="row">
          <span role="rowheader" className={styles.rh}>
            Pour toi, par an
          </span>
          {rows.map(({ lane, g }) => (
            <span key={lane.key} role="cell" className={styles.cellBar}>
              <span className={styles.bar} data-sign={g.annual < 0 ? "neg" : "pos"} style={{ height: `${(Math.abs(g.annual) / max) * 48}px` }} aria-hidden="true" />
              <b>{euro(g.annual)}</b>
            </span>
          ))}
        </div>
        <Row label="Départ à la retraite" values={rows.map(({ lane, g }) => [lane.key, g.retraite ? `+${formatDuration(g.retraite.low)}` : "inchangé"])} />
        <Row label="Impôt sur le revenu" values={rows.map(({ lane, g }) => [lane.key, euro(g.impot)])} />
        <Row label="Aides & allocations" values={rows.map(({ lane, g }) => [lane.key, euro(g.aides)])} />
        <Row label="Part de chiffres sûrs" values={rows.map(({ lane, g }) => [lane.key, g.figures > 0 ? `${g.sure} / ${g.figures}` : "—"])} />
      </div>
      <p className={styles.note}>Valeurs annuelles au milieu de la fourchette, effets estimés compris. Pas de classement : même ordre que ton choix.</p>
    </>
  );
}

function Row({ label, values }: { label: string; values: [string, string][] }) {
  return (
    <div className={styles.tr} role="row">
      <span role="rowheader" className={styles.rh}>
        {label}
      </span>
      {values.map(([key, v]) => (
        <span key={key} role="cell" className={styles.td}>
          {v}
        </span>
      ))}
    </div>
  );
}

/** R4 : ce qui bouge le plus pour toi. */
export function ThemesSlide({ lanes }: { lanes: readonly RecapLane[] }) {
  const rows = themes(lanes.map((l) => l.ticket));
  return (
    <>
      <h1 className={styles.h1}>
        Ce qui bouge{" "}
        <br />
        le plus pour toi
      </h1>
      <div className={styles.legend}>
        {lanes.map((l) => (
          <span key={l.key}>
            <LaneMark lane={l} /> {l.label}
          </span>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className={styles.lead}>Aucun montant ni aucune durée ne change pour toi avec ces programmes, d&apos;après leur version actuelle.</p>
      ) : (
        rows.map((r) => <ThemeScale key={r.ticketLine} row={r} lanes={lanes} />)
      )}
      <p className={styles.note}>
        Le trait vertical marque « rien ne change ». Ligne pointillée = estimation pour un foyer comme le tien. Seuls les sujets où au moins un programme change
        quelque chose pour toi, du plus grand écart au plus petit.
      </p>
    </>
  );
}

function ThemeScale({ row, lanes }: { row: ThemeRow; lanes: readonly RecapLane[] }) {
  const lo = Math.min(0, ...row.values);
  const hi = Math.max(0, ...row.values);
  const span = hi - lo || 1;
  const pos = (v: number) => `${((v - lo) / span) * 92 + 4}%`;
  const fmt = (v: number) => (row.unit === "annees" ? `${v >= 0 ? "+" : "−"}${formatDuration(v)}` : `${euro(v)} / an`);
  return (
    <div className={styles.theme}>
      <div className={styles.themeHead}>
        <b>
          {row.estimated ? "≈ " : ""}
          {row.label}
        </b>
        <span>
          {Math.min(...row.values) === Math.max(...row.values)
            ? fmt(row.values[0] ?? 0)
            : `de ${fmt(Math.min(...row.values))} à ${fmt(Math.max(...row.values))}`}
        </span>
      </div>
      <div className={styles.scale} data-estimated={row.estimated}>
        <span className={styles.zero} style={{ left: pos(0) }} aria-hidden="true" />
        {row.values.map((v, i) => {
          const lane = lanes[i];
          return lane ? (
            <span key={lane.key} className={styles.marker} style={{ left: pos(v) }} title={`${lane.label} : ${fmt(v)}`}>
              <LaneMark lane={lane} />
            </span>
          ) : null;
        })}
      </div>
    </div>
  );
}

/** R6 : ton résultat est-il solide ? */
export function CertaintySlide({ lanes, catalog }: { lanes: readonly RecapLane[]; catalog: Catalog }) {
  return (
    <>
      <h1 className={styles.h1}>
        Ton résultat{" "}
        <br />
        est-il solide ?
      </h1>
      <p className={styles.lead}>Les mesures qui te concernent, selon leur niveau de précision dans chaque programme.</p>
      <div className={styles.legend}>
        <span>
          <i className={styles.swatch} data-nature="chiffree" /> Chiffrées
        </span>
        <span>
          <i className={styles.swatch} data-nature="qualitative" /> Qualitatives
        </span>
        <span>
          <i className={styles.swatch} data-nature="floue" /> Floues
        </span>
      </div>
      {lanes.map((l) => {
        const c = certainty(l.ticket, catalog);
        const total = c.chiffree + c.qualitative + c.floue || 1;
        return (
          <div key={l.key} className={styles.cert}>
            <div className={styles.certHead}>
              <b>
                <LaneMark lane={l} /> {l.label}
              </b>
              <span>
                {certaintyLabel(c)}
              </span>
            </div>
            <div className={styles.certBar} role="img" aria-label={certaintyLabel(c)}>
              {(["chiffree", "qualitative", "floue"] as const).map((k) =>
                c[k] > 0 ? <i key={k} className={styles.swatch} data-nature={k} style={{ flexGrow: c[k] / total }} /> : null,
              )}
            </div>
          </div>
        );
      })}
      <p className={styles.box}>Une mesure floue n&apos;est pas forcément mauvaise : elle n&apos;est simplement pas assez précise pour être chiffrée sur ton profil.</p>
    </>
  );
}

export function Slide({ tone, children }: { tone: "ink" | "yellow" | "cream"; children: ReactNode }) {
  return (
    <section className={styles.slide} data-tone={tone}>
      {children}
    </section>
  );
}

