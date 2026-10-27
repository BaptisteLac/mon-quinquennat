import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Profile } from "@mon-quinquennat/schema";
import { dataDir, loadProgrammes } from "./data";
import { profileLine } from "./journey";
import { decodeShare, encodeShare, type SharePayload } from "./share";
import { signProfileLine, signTicket, verifyProfileLine, verifyTicket } from "./share-sign";
import { buildTicket } from "./ticket/build";
import { CalculResponse } from "./ticket/calc-client";

const secret = "s".repeat(32); // secret de test, sans valeur réelle
const programme = loadProgrammes(dataDir()).find((p) => p.candidate.id === "c-01");
if (!programme) throw new Error("programme c-01 absent");
const raw = JSON.parse(readFileSync(new URL("./ticket/fixtures/couple-2-enfants-proprietaires.json", import.meta.url), "utf8")) as { profile: unknown; calcul: unknown };
const profile = Profile.parse(raw.profile);
const ticket = buildTicket(programme, profile, CalculResponse.parse(raw.calcul));

describe("lien de partage", () => {
  const payload: SharePayload = { v: 1, corpusId: programme.corpusId, ticket, signature: signTicket(secret, ticket, programme.corpusId) };

  it("aller-retour sans perte, et adresse de taille raisonnable", async () => {
    const text = await encodeShare(payload);
    expect(text).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(text.length).toBeLessThan(4000);
    expect(await decodeShare(text)).toEqual(payload);
  });

  it("ne contient pas les réponses du profil", async () => {
    const json = JSON.stringify(await decodeShare(await encodeShare(payload)));
    expect(json).not.toContain("revenusNetsMensuels");
    expect(json).not.toContain(String(profile.revenusNetsMensuels));
  });

  it("refuse un lien illisible", async () => {
    expect(await decodeShare("pas-un-lien")).toBeNull();
    expect(await decodeShare("@@@")).toBeNull();
  });

  it("une signature ne vaut que pour ce ticket, cette version, ce secret", () => {
    expect(verifyTicket(secret, ticket, programme.corpusId, payload.signature)).toBe(true);
    const forged = { ...ticket, solde: { ...ticket.solde, high: ticket.solde.high + 100 } };
    expect(verifyTicket(secret, forged, programme.corpusId, payload.signature)).toBe(false);
    expect(verifyTicket(secret, ticket, "autre-version", payload.signature)).toBe(false);
    expect(verifyTicket("t".repeat(32), ticket, programme.corpusId, payload.signature)).toBe(false);
    const line = profileLine(profile);
    expect(verifyProfileLine(secret, line, signProfileLine(secret, line))).toBe(true);
    expect(verifyProfileLine(secret, `${line} · millionnaire`, signProfileLine(secret, line))).toBe(false);
  });
});

describe("ligne de profil", () => {
  it("résume sans montant", () => {
    expect(profileLine(profile)).toBe("40 ans · marié ou pacsé · 2 enfants · salarié · propriétaire · périphérie · voiture");
  });
});
