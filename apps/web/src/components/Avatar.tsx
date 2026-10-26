import { avatarAgeBand } from "@mon-quinquennat/schema";
import { AVATARS, type AvatarGenre } from "@/lib/avatars";
import styles from "./Avatar.module.css";

const CHILD_BODIES = ["#C7B8FF", "#FFB38A", "#9BE3C8"];

/** Enfant ajouté à côté de l'avatar : même style sticker, plus petit. */
function Child({ index }: { index: number }) {
  return (
    <svg className={styles.child} viewBox="0 0 60 60" aria-hidden="true" data-index={index}>
      <g stroke="#111" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round">
        <path d="M8 62 Q12 40 30 38 Q48 40 52 62 Z" fill={CHILD_BODIES[index % CHILD_BODIES.length]} />
        <circle cx="30" cy="24" r="15" fill="#FFD23F" />
        <path d="M15 22 Q16 8 30 8 Q44 8 45 22 Q38 15 30 16 Q22 15 15 22 Z" fill="#4A2E22" />
        <path d="M25 31 Q30 34 35 31" fill="none" />
      </g>
      <g fill="#111">
        <circle cx="24.5" cy="25" r="2.2" />
        <circle cx="35.5" cy="25" r="2.2" />
      </g>
    </svg>
  );
}

interface Props {
  genre?: AvatarGenre | undefined;
  age?: number | undefined;
  enfants?: number;
  size?: number;
  /** Légende sous l'avatar (« Ton perso »). */
  caption?: string;
}

/** Avatar du personnage : choisi par genre et tranche d'âge, avec les enfants à côté. */
export function Avatar({ genre, age, enfants = 0, size = 88, caption }: Props) {
  const key = `${genre ?? "autre"}_${avatarAgeBand(age ?? 30)}` as const;
  const art = AVATARS[key];
  const shown = Math.min(enfants, 3);
  const label = enfants > 0 ? `${art.label}, avec ${enfants} enfant${enfants > 1 ? "s" : ""}` : art.label;
  return (
    <figure className={styles.figure} style={{ width: size }}>
      <div className={styles.frame} style={{ width: size, height: size, background: art.bg }} role="img" aria-label={label}>
        <svg className={styles.bust} viewBox="0 0 160 160" aria-hidden="true" dangerouslySetInnerHTML={{ __html: art.svg }} />
        {Array.from({ length: shown }, (_, i) => (
          <Child key={i} index={i} />
        ))}
      </div>
      {caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}
    </figure>
  );
}
