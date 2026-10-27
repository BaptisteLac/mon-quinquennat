import { describe, expect, it } from "vitest";
import { dataDir } from "./data";
import { assertPublishable, loadLegalInfo, missingLegalInfo, type LegalInfo } from "./legal";

const empty: LegalInfo = { editeur: null, hebergeurs: [] };
const complete: LegalInfo = {
  editeur: { nom: "[éditeur]", contact: "[contact]" },
  hebergeurs: [{ role: "Site", nom: "[hébergeur]", adresse: "[adresse]", source: "https://example.org/a-caler" }],
};

describe("mentions légales", () => {
  it("lit le fichier du dépôt", () => {
    expect(() => loadLegalInfo(dataDir())).not.toThrow();
  });

  it("accepte un éditeur particulier sans contact public", () => {
    expect(missingLegalInfo({ ...complete, editeur: { nom: "Particulier, non professionnel" } })).toEqual([]);
  });

  it("liste ce qui manque", () => {
    expect(missingLegalInfo(empty)).toEqual(["éditeur", "hébergeur"]);
    expect(missingLegalInfo(complete)).toEqual([]);
  });

  it("bloque la construction d'un site public incomplet, pas celle d'un site local", () => {
    expect(() => assertPublishable(empty, "https://mon-quinquennat.example")).toThrow(/éditeur, hébergeur/);
    expect(() => assertPublishable(empty, "http://localhost:3000")).not.toThrow();
    expect(() => assertPublishable(empty, undefined)).not.toThrow();
    expect(() => assertPublishable(complete, "https://mon-quinquennat.example")).not.toThrow();
  });
});
