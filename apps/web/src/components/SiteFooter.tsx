import Link from "next/link";
import { SOURCE_URL } from "@/lib/site";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.name}>Mon quinquennat</div>
      <nav className={styles.links} aria-label="Pied de page">
        <Link href="/methode">Méthode</Link>
        <Link href="/#programmes">Les programmes</Link>
        <Link href="/signaler">Signaler une erreur</Link>
        <Link href="/mentions-legales">Mentions légales</Link>
        <a href={SOURCE_URL}>Code source</a>
      </nav>
      <p className={styles.note}>Projet indépendant, sans financement politique ni commercial.</p>
    </footer>
  );
}
