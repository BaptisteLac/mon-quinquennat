import { Avatar } from "./Avatar";
import styles from "./TicketTeaser.module.css";

const LINES = [
  { label: "Impôt sur le revenu", ref: "①" },
  { label: "Prime d'activité", ref: "②" },
  { label: "≈ Électricité", ref: "③", estimate: true },
];

/**
 * Illustration de l'accueil desktop (DK-accueil) : la forme d'un ticket, sans aucun montant.
 * Les valeurs sont des barres, jamais des chiffres d'exemple : rien d'inventé à l'écran.
 */
export function TicketTeaser() {
  return (
    <figure className={styles.teaser} aria-hidden="true">
      <div className={styles.avatar}>
        <Avatar genre="femme" age={34} size={170} />
      </div>
      <div className={styles.ticket}>
        <div className={styles.head}>
          <b>MA VIE EN 2032</b>
          <span>
            si <i className={styles.dot} /> <i className={styles.bar} data-w="m" /> passe
          </span>
        </div>
        <div className={styles.profile}>34 ans · mariée · 2 enfants · salariée · locataire</div>
        <hr />
        {LINES.map((l) => (
          <div key={l.label} className={styles.line} data-estimate={l.estimate}>
            <span>
              {l.label} {l.ref}
            </span>
            <i className={styles.bar} data-w="s" />
          </div>
        ))}
        <hr />
        <div className={styles.total}>
          <span>SOLDE / MOIS</span>
          <i className={styles.bar} data-w="l" />
        </div>
      </div>
      <figcaption>Exemple. Ton ticket dépend de ton profil.</figcaption>
    </figure>
  );
}
