import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ maxWidth: "var(--page-max)", margin: "0 auto", padding: "40px var(--gutter)" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 32, margin: "0 0 12px" }}>Page introuvable</h1>
      <p>
        <Link href="/">Retour à l&apos;accueil</Link>
      </p>
    </main>
  );
}
