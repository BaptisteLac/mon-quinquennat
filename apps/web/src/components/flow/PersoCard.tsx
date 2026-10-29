import type { ProfileDraft } from "@/lib/journey";
import { profileChips } from "@/lib/journey";
import { Avatar } from "../Avatar";
import styles from "./flow.module.css";

/** Carte « Ton perso », fixe à gauche des questions sur desktop (DK-toi, DK-vie, DK-affiner). Masquée sur mobile. */
export function PersoCard({ profile }: { profile: ProfileDraft }) {
  return (
    <aside className={styles.persoCard} aria-label="Ton perso">
      <Avatar genre={profile.genre} age={profile.age} enfants={profile.enfants?.length ?? 0} size={200} />
      <b className={styles.persoTitle}>Ton perso</b>
      <ul className={styles.chips}>
        {profileChips(profile).map((c) => (
          <li key={c.label} data-filled={c.filled}>
            {c.label}
          </li>
        ))}
      </ul>
      <p className={styles.privacy}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        Rien n&apos;est enregistré sur nos serveurs. Tes réponses restent sur cet appareil.
      </p>
    </aside>
  );
}
