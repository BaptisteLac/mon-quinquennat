import Link from "next/link";
import type { ProfileDraft } from "@/lib/journey";
import { Scene, Unplugged } from "./Scene";
import styles from "./quinquennat.module.css";

/** X2 : calcul impossible. Rien n'est perdu : tout est gardé sur l'appareil. */
export function ErrorScreen({ profile, kind, message, onRetry }: { profile: ProfileDraft; kind: "reseau" | "hors_champ"; message: string; onRetry: () => void }) {
  return (
    <main className={styles.error}>
      <div className={styles.brand}>Mon quinquennat</div>
      <Scene caption="Hmm, ça coince." profile={profile}>
        {Unplugged}
      </Scene>
      <h1 className={styles.errorTitle}>{kind === "hors_champ" ? "Ce profil sort du calcul" : "Le calcul n'a pas abouti"}</h1>
      <p className={styles.errorText}>
        {kind === "hors_champ"
          ? `${message} Rien n'est perdu : tes réponses sont gardées sur cet appareil.`
          : "La connexion a été coupée ou notre serveur met du temps à répondre. Rien n'est perdu : tes réponses sont gardées sur cet appareil."}
      </p>
      <div className={styles.errorActions}>
        {kind === "reseau" ? (
          <button type="button" className={styles.primary} onClick={onRetry}>
            Réessayer
          </button>
        ) : (
          <Link href="/personnage" className={styles.primary}>
            Revenir à ton profil
          </Link>
        )}
        <Link href="/candidats" className={styles.secondary}>
          Revenir au choix des programmes
        </Link>
      </div>
    </main>
  );
}
