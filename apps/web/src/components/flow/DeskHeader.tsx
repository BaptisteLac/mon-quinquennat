import Link from "next/link";
import styles from "./flow.module.css";

const STEPS = ["Ton perso", "Ta vie", "Programmes", "Ton quinquennat", "Récap"] as const;

/**
 * En-tête desktop du parcours (≥ 1024 px) : logo, les 5 étapes, « Méthode ».
 * `current` : étape en cours (1 à 5) ; les précédentes sont cochées. Masqué sur mobile.
 */
export function DeskHeader({ current }: { current: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <header className={styles.deskHeader}>
      <Link href="/" className={styles.deskBrand}>
        Mon quinquennat
      </Link>
      <ol className={styles.deskSteps} aria-label="Étapes du parcours">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const state = n < current ? "done" : n === current ? "current" : "todo";
          return (
            <li key={label} data-state={state} aria-current={state === "current" ? "step" : undefined}>
              <span className={styles.deskDot} aria-hidden="true">
                {state === "done" ? "✓" : n}
              </span>
              {label}
            </li>
          );
        })}
      </ol>
      <Link href="/methode" className={styles.deskMethod}>
        Méthode
      </Link>
    </header>
  );
}
