import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/signalement/route";
import { getProgrammes } from "./data";
import { createIssue, newIssueUrl, Report, reportIssue, type ReportedMeasure } from "./report";
import { findReportedMeasure } from "./report-server";

const measure: ReportedMeasure = { id: "m-0123456789ab", title: "[titre de la mesure]", candidate: "[Candidat]", party: "[Parti]", path: "/programme/x/m-0123456789ab" };

describe("signalement : contenu de l'issue", () => {
  it("décrit la mesure et cite le message sans l'interpréter", () => {
    const issue = reportIssue({ kind: "sens", message: "Voir @quelqu-un ```code``` ici", measureId: measure.id }, measure);
    expect(issue.title).toBe("Signalement : le résumé ne dit pas ce que dit le programme · m-0123456789ab ([Candidat])");
    expect(issue.labels).toEqual(["signalement"]);
    expect(issue.body).toContain("- Fiche : /programme/x/m-0123456789ab");
    // Clôture plus longue que les accents graves du message : il reste dans son bloc de code.
    expect(issue.body).toContain("````\nVoir @quelqu-un ```code``` ici\n````");
  });

  it("refuse un message vide, trop long ou un champ inconnu", () => {
    expect(Report.safeParse({ kind: "autre", message: "court" }).success).toBe(false);
    expect(Report.safeParse({ kind: "autre", message: "x".repeat(2001) }).success).toBe(false);
    expect(Report.safeParse({ kind: "autre", message: "un message assez long", profil: {} }).success).toBe(false);
    expect(Report.safeParse({ kind: "autre", message: "un message assez long", measureId: "../../etc" }).success).toBe(false);
  });

  it("prépare un lien GitHub pré-rempli", () => {
    const url = new URL(newIssueUrl(reportIssue({ kind: "autre", message: "un message assez long" }, null)));
    expect(url.origin + url.pathname).toBe("https://github.com/BaptisteLac/mon-quinquennat/issues/new");
    expect(url.searchParams.get("labels")).toBe("signalement");
    expect(url.searchParams.get("body")).toContain("un message assez long");
  });

  it("crée l'issue par l'API GitHub", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ html_url: "https://github.com/BaptisteLac/mon-quinquennat/issues/1" }, { status: 201 }));
    const url = await createIssue(reportIssue({ kind: "autre", message: "un message assez long" }, null), "[jeton]", fetchImpl);
    expect(url).toBe("https://github.com/BaptisteLac/mon-quinquennat/issues/1");
    const [target, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(target).toBe("https://api.github.com/repos/BaptisteLac/mon-quinquennat/issues");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer [jeton]");
  });
});

describe("signalement : route", () => {
  const published = getProgrammes()[0]!.measures[0]!;
  const post = (body: unknown) => POST(new Request("http://localhost/api/signalement", { method: "POST", body: JSON.stringify(body) }));

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("retrouve une mesure publiée dans les données du site", () => {
    expect(findReportedMeasure(published.id)?.title).toBe(published.title);
    expect(findReportedMeasure("m-inconnue")).toBeNull();
  });

  it("répond 503 sans jeton, pour que le formulaire passe au lien GitHub", async () => {
    vi.stubEnv("SIGNALEMENT_GITHUB_TOKEN", "");
    const res = await post({ kind: "autre", message: "un message assez long", measureId: published.id });
    expect(res.status).toBe(503);
  });

  it("refuse une mesure non publiée", async () => {
    vi.stubEnv("SIGNALEMENT_GITHUB_TOKEN", "[jeton]");
    const res = await post({ kind: "autre", message: "un message assez long", measureId: "m-000000000000" });
    expect(res.status).toBe(400);
  });

  it("ignore un robot sans rien créer", async () => {
    vi.stubEnv("SIGNALEMENT_GITHUB_TOKEN", "[jeton]");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await post({ kind: "autre", message: "un message assez long", website: "http://spam.example" });
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("crée l'issue avec le contexte lu dans les données, pas celui du visiteur", async () => {
    vi.stubEnv("SIGNALEMENT_GITHUB_TOKEN", "[jeton]");
    const fetchMock = vi.fn(async () => Response.json({ html_url: "https://github.com/BaptisteLac/mon-quinquennat/issues/2" }, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await post({ kind: "chiffre", message: "un message assez long", measureId: published.id });
    expect(await res.json()).toEqual({ ok: true, url: "https://github.com/BaptisteLac/mon-quinquennat/issues/2" });
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(String(init.body)).body).toContain(`- Mesure : ${published.id} · ${published.title}`);
  });

  it("répond 502 si GitHub refuse", async () => {
    vi.stubEnv("SIGNALEMENT_GITHUB_TOKEN", "[jeton]");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 401 })));
    expect((await post({ kind: "autre", message: "un message assez long" })).status).toBe(502);
  });
});
