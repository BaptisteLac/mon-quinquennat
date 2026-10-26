import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { Ticket } from "@mon-quinquennat/schema";

// Profil d'une retraitée seule à petite pension (concernée par le minimum vieillesse).
const { profile } = JSON.parse(readFileSync(new URL("../src/lib/ticket/fixtures/retraitee-seule-petite-pension.json", import.meta.url), "utf8")) as {
  profile: Record<string, unknown>;
};

test("profil invalide : refusé sans renvoyer ses valeurs", async ({ request }) => {
  const res = await request.post("/api/ticket", { data: { profile: { ...profile, age: 12 } } });
  expect(res.status()).toBe(400);
  expect(await res.text()).not.toContain("12");
});

test("tickets de tous les candidats", async ({ request }) => {
  const res = await request.post("/api/ticket", { data: { profile } });
  expect(res.headers()["cache-control"]).toContain("no-store");
  if (!process.env.CALC_URL) {
    // Sans service de calcul configuré, la route le dit au lieu d'inventer un résultat.
    expect(res.status()).toBe(503);
    expect((await res.json()).erreur).toBe("calcul_non_configure");
    return;
  }
  expect(res.status()).toBe(200);
  const { tickets } = (await res.json()) as { tickets: unknown[] };
  const parsed = tickets.map((t) => Ticket.parse(t));
  expect(parsed.length).toBeGreaterThan(0);
  const lisnard = parsed.find((t) => t.candidateId === "c-01");
  expect(lisnard?.lines.find((l) => l.ticketLine === "pension")?.measureIds).toEqual(["m-9dd1526ae0f6"]);
});
