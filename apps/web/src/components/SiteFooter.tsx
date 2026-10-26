import Link from "next/link";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.name}>Mon quinquennat</div>
      <nav className={styles.links} aria-label="Pied de page">
        <Link href="/#programmes">Les programmes</Link>
      </nav>
      <p className={styles.note}>Projet indépendant, sans financement politique ni commercial.</p>
    </footer>
  );
}
