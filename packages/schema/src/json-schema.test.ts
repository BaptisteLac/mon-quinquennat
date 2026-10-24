import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { profileJsonSchema } from "./json-schema.js";

describe("profile.schema.json", () => {
  it("est à jour (sinon : npm run -w packages/schema export-json-schema)", () => {
    const committed: unknown = JSON.parse(readFileSync(resolve(__dirname, "../json/profile.schema.json"), "utf8"));
    expect(committed).toEqual(profileJsonSchema());
  });
});
