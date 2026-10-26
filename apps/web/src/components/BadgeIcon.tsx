import type { Badge } from "@/lib/badges";

const SHAPES: Record<Badge, React.ReactNode> = {
  rond: <circle cx="6" cy="6" r="5" />,
  triangle: <path d="M6 1 L11 11 H1 Z" />,
  carre: <rect x="1" y="1" width="10" height="10" />,
  losange: <path d="M6 0.5 L11.5 6 L6 11.5 L0.5 6 Z" />,
  hexagone: <path d="M3.25 1.2 H8.75 L11.5 6 L8.75 10.8 H3.25 L0.5 6 Z" />,
  pentagone: <path d="M6 0.8 L11.4 4.7 L9.3 11.2 H2.7 L0.6 4.7 Z" />,
  demi_cercle: <path d="M1 8.5 A5 5 0 0 1 11 8.5 Z" />,
  anneau: <circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="2" />,
};

/** Badge de forme tiré au sort : seul repère visuel d'un candidat (jamais de couleur de parti). */
export function BadgeIcon({ badge, size = 12 }: { badge: Badge; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" style={{ flex: "none" }}>
      {SHAPES[badge]}
    </svg>
  );
}
