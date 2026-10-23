/** Rapport Markdown d'une exécution : indicateurs, feu vert, coût, exemples d'erreurs. */
import { totalCost, type CostSummary } from "./cost.js";
import type { ResolvedGroundTruth } from "./ground-truth.js";
import { gate, GATES, type GateStatus, type Metrics, type Rate } from "./metrics.js";
import type { RunFile } from "./run.js";

const GATE_LABEL: Record<GateStatus, string> = { ok: "✅", echec: "❌", indetermine: "—" };

function pct(r: Rate): string {
  return r.value === null ? "n/a" : `${(r.value * 100).toFixed(1)} % (${r.num}/${r.den})`;
}

function money(n: number | null, unit: string): string {
  return n === null ? "n/a" : `${n.toFixed(3)} ${unit}`;
}

export interface CostReport extends CostSummary {
  /** Facteur d'extrapolation au programme complet (caractères du corpus / caractères traités). */
  factor: number;
  eurPerProgramme: number | null;
  usdPerProgramme: number;
}

export function costReport(run: RunFile, env: NodeJS.ProcessEnv): CostReport {
  const summary = totalCost(run.calls, env);
  const factor = run.corpus.totalChars / run.charsProcessed;
  const complete = summary.unpricedModels.length === 0;
  return {
    ...summary,
    factor,
    usdPerProgramme: summary.usd * factor,
    eurPerProgramme: summary.eur !== null && complete ? summary.eur * factor : null,
  };
}

export function renderReport(run: RunFile, resolved: ResolvedGroundTruth, m: Metrics, cost: CostReport): string {
  const gt = resolved.gt;
  const rows: [string, string, string, GateStatus][] = [
    ["Citations exactes (mesures publiées)", pct(m.exactCitations.published), "100 %", gate(m.exactCitations.published.value, GATES.exactCitationsPublished)],
    ["Précision (mesures auto-validées)", pct(m.precision.published), "≥ 95 %", gate(m.precision.published.value, GATES.precisionPublished)],
    ["Rappel (extraction)", pct(m.recall.raw), "≥ 80 %", gate(m.recall.raw.value, GATES.recallRaw)],
    ["Paramètres justes (auto-validées chiffrées)", pct(m.parameters.published), "≥ 95 %", gate(m.parameters.published.value, GATES.parametersPublished)],
    ["Auto-validation", pct(m.autoValidation), "≥ 60 %", gate(m.autoValidation.value, GATES.autoValidation)],
    ["Coût par programme (extrapolé)", money(cost.eurPerProgramme, "€"), "< 5 €", gate(cost.eurPerProgramme, GATES.costEurPerProgramme, "max")],
  ];

  const lines: string[] = [];
  const push = (...l: string[]) => lines.push(...l);

  push(
    `# Score — exécution ${run.runId}`,
    "",
    `- Corpus : \`${run.corpus.id}\` (${run.corpus.documents} documents, ${run.corpus.totalPages} pages, manifeste \`${run.corpus.manifestSha256.slice(0, 12)}…\`)`,
    `- Pages traitées : ${run.pagesProcessed.length} ; sections annotées : ${gt.sections.map((s) => s.label).join(", ")} (${resolved.scope.size} pages)`,
    `- Extraction A : \`${run.config.models.extractA}\` ; B : \`${run.config.models.extractB ?? "—"}\` ; relecture : \`${run.config.models.crossCheck ?? "—"}\``,
    `- Prompt : \`${run.config.promptVersion}\` (\`${run.config.promptSha256.slice(0, 12)}\`), effort \`${run.config.effort}\`, lots de ${run.config.batchPages} pages`,
    "",
    "## Feu vert",
    "",
    "| Indicateur | Valeur | Seuil | |",
    "|---|---|---|---|",
    ...rows.map(([label, value, threshold, g]) => `| ${label} | ${value} | ${threshold} | ${GATE_LABEL[g]} |`),
    "",
    "Pour information :",
    `- Rappel des mesures publiées : ${pct(m.recall.published)}`,
    `- Précision de l'extraction brute : ${pct(m.precision.raw)}`,
    `- Citations exactes, extraction brute : ${pct(m.exactCitations.raw)}`,
    `- Mesures à adjudiquer (hors vérité terrain, exclues de la précision) : ${m.toAdjudicate}`,
    `- Mesures comptées correctes sans relecture humaine (appariées, non adjudiquées) : ${m.provisional}`,
    "",
    "## Coût",
    "",
    `- Exécution : ${money(cost.usd, "$")} / ${money(cost.eur, "€")}${cost.unpricedModels.length > 0 ? ` — incomplet, tarif inconnu : ${cost.unpricedModels.join(", ")}` : ""}`,
    `- Programme complet (× ${cost.factor.toFixed(2)}, proportionnel au nombre de caractères) : ${money(cost.usdPerProgramme, "$")} / ${money(cost.eurPerProgramme, "€")}`,
    "",
    "| Rôle | Modèle | Appels | Échecs | Jetons entrée | Jetons sortie |",
    "|---|---|---|---|---|---|",
  );
  const groups = new Map<string, RunFile["calls"]>();
  for (const c of run.calls) groups.set(`${c.role}|${c.model}`, [...(groups.get(`${c.role}|${c.model}`) ?? []), c]);
  for (const [k, cs] of groups) {
    const [role, model] = k.split("|");
    const sum = (f: (c: RunFile["calls"][number]) => number) => cs.reduce((n, c) => n + f(c), 0);
    push(`| ${role} | \`${model}\` | ${cs.length} | ${cs.filter((c) => c.error).length} | ${sum((c) => c.inputTokens)} | ${sum((c) => c.outputTokens)} |`);
  }

  const section = (title: string, items: string[]) => {
    push("", `## ${title} (${items.length})`, "");
    push(...(items.length > 0 ? items : ["Aucune."]));
  };
  const where = (s: Metrics["scored"][number]) => {
    const src = s.record.measure?.sources[0];
    return src ? `${src.documentId} p. ${src.page}` : `page ${s.record.raw.sources[0]?.page ?? "?"} du corpus`;
  };
  const title = (s: Metrics["scored"][number]) => `${s.record.raw.title} (${where(s)}, \`${s.record.key}\`)`;
  const failed = (s: Metrics["scored"][number], id: string) => s.record.review.checks.find((c) => c.id === id && !c.passed);

  section(
    "Citations introuvables (mesures rejetées)",
    m.scored.flatMap((s) => {
      const c = failed(s, "citation_exacte");
      return c ? [`- ${title(s)} — ${c.detail ?? ""}`] : [];
    }),
  );
  section(
    "Format invalide",
    m.scored.filter((s) => s.record.formatErrors.length > 0).map((s) => `- ${title(s)} — ${s.record.formatErrors.join(" ; ")}`),
  );
  section(
    "Mesures de la vérité terrain manquées",
    m.missed.map((g) => `- \`${g.id}\` ${g.documentId} p. ${g.page} — ${g.description}`),
  );
  section(
    "Paramètres faux",
    m.scored
      .filter((s) => s.values && !s.values.ok)
      .map((s) => {
        const v = s.values;
        const missing = v?.missing.map((e) => `${e.label} = ${e.value}`).join(", ") || "—";
        const extra = [...(v?.unexpectedNumbers ?? []), ...(v?.unexpectedDates ?? [])].join(", ") || "—";
        return `- ${title(s)} ↔ \`${s.gt?.id}\` — attendu non trouvé : ${missing} ; en trop : ${extra}`;
      }),
  );
  section(
    "Relecture croisée non fidèle",
    m.scored.flatMap((s) => {
      const c = failed(s, "relecture_croisee");
      return c ? [`- ${title(s)} — ${c.detail ?? ""}`] : [];
    }),
  );
  section(
    "Jugées incorrectes par adjudication",
    m.scored
      .filter((s) => s.adjudication && s.adjudication.verdict !== "correcte")
      .map((s) => `- ${title(s)} — ${s.adjudication?.verdict}${s.adjudication?.note ? ` : ${s.adjudication.note}` : ""}`),
  );
  section(
    "À adjudiquer (à reporter dans adjudications.json)",
    m.scored
      .filter((s) => s.correct === null)
      .map((s) => `- \`${s.record.key}\` — ${title(s)} — ${s.record.raw.summary.normal} [${s.record.review.status}]`),
  );
  return lines.join("\n") + "\n";
}
