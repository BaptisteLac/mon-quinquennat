"use client";

import { useState } from "react";
import { Choice, formStyles } from "@/components/form/fields";
import { MESSAGE_MAX, MESSAGE_MIN, newIssueUrl, Report, REPORT_KINDS, reportIssue, type ReportedMeasure, type ReportKind } from "@/lib/report";
import styles from "./report.module.css";

const KIND_OPTIONS = (Object.keys(REPORT_KINDS) as ReportKind[]).map((value) => ({ value, label: REPORT_KINDS[value] }));

type Sent = { kind: "issue"; url: string | null } | { kind: "github"; url: string };

function messageOf(body: unknown): string | null {
  return body && typeof body === "object" && "message" in body && typeof body.message === "string" ? body.message : null;
}

function urlOf(body: unknown): string | null {
  return body && typeof body === "object" && "url" in body && typeof body.url === "string" ? body.url : null;
}

/**
 * Formulaire de signalement. `direct` : le serveur du site crée l'issue (jeton configuré) ;
 * sinon, ou si le serveur répond que l'envoi direct n'est pas configuré, la personne ouvre un lien
 * GitHub pré-rempli avec son propre compte.
 */
export function ReportForm({ measure, direct }: { measure: ReportedMeasure | null; direct: boolean }) {
  const [kind, setKind] = useState<ReportKind | undefined>(undefined);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);

  const report = Report.safeParse({ kind, message, ...(measure ? { measureId: measure.id } : {}), ...(website ? { website } : {}) });
  const missing = [...(kind ? [] : ["le type d'erreur"]), ...(message.trim().length >= MESSAGE_MIN ? [] : ["quelques mots d'explication"])];

  async function submit() {
    if (!report.success || busy) return;
    setError(null);
    const githubUrl = newIssueUrl(reportIssue(report.data, measure));
    if (!direct) {
      setSent({ kind: "github", url: githubUrl });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/signalement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report.data),
      });
      const body: unknown = await res.json().catch(() => null);
      if (res.ok) setSent({ kind: "issue", url: urlOf(body) });
      else if (res.status === 503) setSent({ kind: "github", url: githubUrl });
      else setError(messageOf(body) ?? "L'envoi n'a pas abouti.");
    } catch {
      setError("L'envoi n'a pas abouti. Vérifie ta connexion et réessaie.");
    } finally {
      setBusy(false);
    }
  }

  if (sent?.kind === "issue") {
    return (
      <div className={styles.done} role="status">
        <b>Merci, ton signalement est envoyé.</b>
        <span>Il sera vérifié, et la mesure corrigée si l&apos;erreur se confirme.</span>
        {sent.url ? (
          <a href={sent.url} target="_blank" rel="noopener noreferrer">
            Suivre le signalement sur GitHub
          </a>
        ) : null}
      </div>
    );
  }
  if (sent?.kind === "github") {
    return (
      <div className={styles.done} role="status">
        <b>Ton signalement est prêt.</b>
        <span>Il s&apos;envoie depuis GitHub, avec ton compte : le titre et le texte sont déjà remplis.</span>
        <a href={sent.url} target="_blank" rel="noopener noreferrer" className={formStyles.primary}>
          Ouvrir sur GitHub
        </a>
      </div>
    );
  }

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Choice legend="Quel genre d'erreur ?" options={KIND_OPTIONS} value={kind} onChange={setKind} columns={1} />

      <label className={formStyles.field}>
        <span className={formStyles.label}>
          <span>Ce qui ne va pas</span>
          <span className={formStyles.labelHint}>
            {message.trim().length} / {MESSAGE_MAX}
          </span>
        </span>
        <textarea
          className={styles.textarea}
          value={message}
          maxLength={MESSAGE_MAX}
          rows={6}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Par exemple : la page 12 du programme dit autre chose que le résumé."
        />
      </label>

      {/* Champ piège : invisible pour les personnes, rempli par les robots. */}
      <label className={styles.trap} aria-hidden="true">
        Site web
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </label>

      <p className={styles.public}>
        Ton message sera publié tel quel dans le suivi public du projet, sur GitHub. N&apos;y mets aucune information personnelle (nom,
        adresse, revenus…).
        {direct ? null : " L'envoi se fait depuis GitHub : un compte GitHub est nécessaire."}
      </p>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={formStyles.actions}>
        <button type="submit" className={formStyles.primary} aria-disabled={!report.success || busy}>
          {busy ? "Envoi…" : direct ? "Envoyer le signalement" : "Préparer le signalement"}
        </button>
        {missing.length > 0 ? <p className={formStyles.missing}>Il manque {missing.join(" et ")}.</p> : null}
      </div>
    </form>
  );
}
