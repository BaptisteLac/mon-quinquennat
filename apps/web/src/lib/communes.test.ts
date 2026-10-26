import { describe, expect, it } from "vitest";
import { buildChunks, chunkKey, communesFor, fetchCommunes } from "./communes";

const rows = [
  { codePostal: "75001", codeCommune: "75101", nomCommune: "Paris 1er Arrondissement" },
  { codePostal: "36000", codeCommune: "36044", nomCommune: "Châteauroux" },
  { codePostal: "36000", codeCommune: "36044", nomCommune: "Châteauroux" },
  { codePostal: "36000", codeCommune: "36002", nomCommune: "Ardentes" },
  { codePostal: "2A000", codeCommune: "x", nomCommune: "ignoré" },
];

describe("communes par code postal", () => {
  const chunks = buildChunks(rows);
  it("découpe par les deux premiers chiffres, sans doublon, trié par nom", () => {
    expect(Object.keys(chunks).sort()).toEqual(["36", "75"]);
    expect(communesFor(chunks["36"] ?? {}, "36000")).toEqual([
      { codeCommune: "36002", nom: "Ardentes" },
      { codeCommune: "36044", nom: "Châteauroux" },
    ]);
  });
  it("code postal inconnu ou invalide : aucune commune, sans appel réseau", async () => {
    expect(communesFor(chunks["36"] ?? {}, "36999")).toEqual([]);
    expect(chunkKey("97139")).toBe("97");
    let called = false;
    const fetcher = (async () => {
      called = true;
      return new Response("", { status: 404 });
    }) as typeof fetch;
    expect(await fetchCommunes("3600", fetcher)).toEqual([]);
    expect(called).toBe(false);
    expect(await fetchCommunes("99999", fetcher)).toEqual([]);
  });
  it("lit le fichier statique du bon département", async () => {
    let url = "";
    const fetcher = (async (u: string) => {
      url = u;
      return Response.json(chunks["36"]);
    }) as unknown as typeof fetch;
    expect((await fetchCommunes("36000", fetcher)).length).toBe(2);
    expect(url).toBe("/communes/36.json");
  });
});
