"use client";

import { useMemo, useState } from "react";
import type { MeasureCard } from "@/lib/measure-card";
import { plural } from "@/lib/format";
import styles from "./MeasureList.module.css";

const PAGE_SIZE = 20;

export interface ThemeOption {
  theme: string;
  label: string;
  count: number;
}

export function MeasureList({ measures, themes }: { measures: readonly MeasureCard[]; themes: readonly ThemeOption[] }) {
  const [theme, setTheme] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE_SIZE);
  const filtered = useMemo(() => (theme ? measures.filter((m) => m.theme === theme) : measures), [measures, theme]);

  function choose(next: string | null) {
    setTheme(next);
    setShown(PAGE_SIZE);
  }

  return (
    <>
      <div className={styles.filters} role="group" aria-label="Filtrer par thème">
        <button type="button" className={styles.filter} aria-pressed={theme === null} onClick={() => choose(null)}>
          Tout
        </button>
        {themes.map((t) => (
          <button
            key={t.theme}
            type="button"
            className={styles.filter}
            aria-pressed={theme === t.theme}
            onClick={() => choose(t.theme)}
          >
            {t.label} <span className={styles.count}>{t.count}</span>
          </button>
        ))}
      </div>

      <p className={styles.status} aria-live="polite">
        {plural(filtered.length, "mesure")}
      </p>

      <ul className={styles.list}>
        {filtered.slice(0, shown).map((m) => (
          <li key={m.id} className={styles.card}>
            <div className={styles.meta}>
              <span>{m.themeLabel.toUpperCase()}</span>
              <span className={styles.nature}>
                <span className={styles.swatch} data-nature={m.nature} aria-hidden="true" />
                {m.natureLabel}
              </span>
            </div>
            <h3 className={styles.title}>{m.title}</h3>
            <p className={styles.summary}>{m.summary}</p>
            <p className={styles.quote}>
              « {m.quote} » ·{" "}
              <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer">
                {m.sourceLabel}
              </a>
            </p>
          </li>
        ))}
      </ul>

      {filtered.length > shown ? (
        <button type="button" className={styles.more} onClick={() => setShown((n) => n + PAGE_SIZE)}>
          Afficher plus ({filtered.length - shown} restantes)
        </button>
      ) : null}
    </>
  );
}
