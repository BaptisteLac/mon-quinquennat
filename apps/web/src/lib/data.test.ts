import { describe, expect, it } from "vitest";
import { dataDir, loadProgrammes } from "./data";

// Données réelles du dépôt : le test échoue si une donnée publiée ne respecte plus le schéma.
describe("données publiées", () => {
  const programmes = loadProgrammes(dataDir());

  it("ne garde que les candidats avec des mesures publiées", () => {
    expect(programmes.length).toBeGreaterThan(0);
    for (const p of programmes) {
      expect(p.measures.length).toBeGreaterThan(0);
      expect(p.measures.every((m) => m.review.status === "auto_validee" || m.review.status === "validee_humain")).toBe(true);
      expect(p.measures.every((m) => m.candidateId === p.candidate.id)).toBe(true);
    }
  });

  it("chaque citation renvoie à un document officiel du manifeste", () => {
    for (const p of programmes) {
      for (const m of p.measures) {
        for (const q of m.sources) expect(p.documents[q.documentId]?.officialUrl).toMatch(/^https:\/\//);
      }
    }
  });

  it("donne un badge distinct et une adresse distincte à chaque candidat", () => {
    expect(new Set(programmes.map((p) => p.candidate.badge)).size).toBe(programmes.length);
    expect(new Set(programmes.map((p) => p.slug)).size).toBe(programmes.length);
  });
});
