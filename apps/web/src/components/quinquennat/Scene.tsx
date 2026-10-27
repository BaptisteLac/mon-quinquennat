import type { ReactNode } from "react";
import type { ProfileDraft } from "@/lib/journey";
import { Avatar } from "@/components/Avatar";
import styles from "./quinquennat.module.css";

/** Case illustrée façon bande dessinée : légende, personnage, objet du moment. */
export function Scene({ caption, profile, children }: { caption?: string; profile: ProfileDraft; children?: ReactNode }) {
  return (
    <div className={styles.scene} aria-hidden="true">
      {caption ? <span className={styles.sceneCaption}>{caption}</span> : null}
      <div className={styles.sceneStage}>
        <Avatar genre={profile.genre} age={profile.age} enfants={0} size={92} />
        {children}
      </div>
    </div>
  );
}

export const BallotBox = (
  <svg width="92" height="92" viewBox="0 0 92 92" fill="none" stroke="#111" strokeWidth="3" strokeLinejoin="round">
    <rect x="16" y="34" width="60" height="54" rx="6" fill="#C7B8FF" />
    <rect x="34" y="6" width="24" height="34" rx="2" fill="#fff" />
    <path d="M40 16h12M40 24h12" strokeLinecap="round" />
  </svg>
);

export const Unplugged = (
  <svg width="120" height="70" viewBox="0 0 120 70" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 40 Q20 52 36 40" />
    <rect x="36" y="30" width="18" height="18" rx="3" fill="#fff" />
    <path d="M54 35h6M54 43h6" />
    <rect x="78" y="28" width="20" height="22" rx="3" fill="#EFEEE8" />
    <path d="M98 39 Q114 40 118 68" />
    <path d="M70 18l-5 8M78 22l7-4" />
  </svg>
);

export const Payslip = (
  <svg width="80" height="92" viewBox="0 0 80 92" fill="none" stroke="#111" strokeWidth="3" strokeLinejoin="round">
    <path d="M10 6h48l14 14v66H10z" fill="#fff" />
    <path d="M20 30h40M20 42h40M20 54h26" strokeLinecap="round" />
    <rect x="44" y="66" width="20" height="10" rx="2" fill="#9BE3C8" />
  </svg>
);

export const Clock = (
  <svg width="84" height="84" viewBox="0 0 84 84" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round">
    <circle cx="42" cy="42" r="34" fill="#9BE3C8" />
    <path d="M42 22v20l14 10" />
  </svg>
);

export const House = (
  <svg width="104" height="92" viewBox="0 0 104 92" fill="none" stroke="#111" strokeWidth="3" strokeLinejoin="round">
    <path d="M6 38L52 6l46 32" fill="#FFB38A" />
    <rect x="16" y="36" width="72" height="54" fill="#fff" />
    <rect x="44" y="58" width="18" height="32" fill="#C7B8FF" />
    <rect x="24" y="46" width="12" height="12" />
    <rect x="68" y="46" width="12" height="12" />
  </svg>
);
