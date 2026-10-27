/**
 * Image d'un ticket partagé : aperçu du lien (og, 1200×630), story (1080×1920) ou carré (1080×1080).
 * Seuls les tickets dont la signature est valide sont dessinés.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { readSharedTicket } from "@/lib/shared-ticket";
import { describeTime, formatMoney, LINE_LABELS } from "@/lib/ticket-labels";

export const dynamic = "force-dynamic";

const SIZES = { og: [1200, 630], story: [1080, 1920], carre: [1080, 1080] } as const;
type Format = keyof typeof SIZES;

// Polices copiées dans apps/web/assets/fonts (licence OFL jointe), lues depuis le dossier de l'application.
const FONTS_DIR = join(process.cwd(), "assets", "fonts");
const FONT_FILES = {
  display: join(FONTS_DIR, "bricolage-grotesque-latin-800-normal.woff"),
  mono: join(FONTS_DIR, "dm-mono-latin-400-normal.woff"),
  sans: join(FONTS_DIR, "dm-sans-latin-700-normal.woff"),
};
async function font(path: string): Promise<ArrayBuffer> {
  const buf = await readFile(path);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

/** Les polices embarquées n'ont ni « ≈ » ni le signe moins typographique. */
const plain = (s: string) => s.replace(/≈ ?/g, "env. ").replace(/−/g, "-");

export async function GET(request: Request, { params }: { params: Promise<{ payload: string }> }): Promise<Response> {
  const { payload } = await params;
  const asked = new URL(request.url).searchParams.get("format") ?? "og";
  const format: Format = asked in SIZES ? (asked as Format) : "og";
  const [width, height] = SIZES[format];
  const shared = await readSharedTicket(payload);
  const fonts = [
    { name: "Bricolage", data: await font(FONT_FILES.display), weight: 800 as const },
    { name: "Mono", data: await font(FONT_FILES.mono), weight: 400 as const },
    { name: "Sans", data: await font(FONT_FILES.sans), weight: 700 as const },
  ];
  const headers = { "Cache-Control": "public, max-age=86400, immutable" };

  if (!shared.ok) {
    return new ImageResponse(
      (
        <div style={{ width, height, display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#FFD23F", fontFamily: "Bricolage", fontSize: 96, color: "#111" }}>
          <div>Ma vie en 2032</div>
          <div style={{ fontFamily: "Sans", fontSize: 40, marginTop: 24 }}>Et toi, ça donne quoi ?</div>
        </div>
      ),
      { width, height, fonts, headers },
    );
  }

  const t = shared.ticket;
  const money = t.lines.filter((l) => l.section === "portefeuille" && l.value).slice(0, 5);
  const time = t.lines.find((l) => l.section === "temps" && l.value);
  const scale = format === "og" ? 1 : 1.5;
  const ticket = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        border: "5px solid #111",
        boxShadow: "14px 14px 0 #111",
        padding: 36 * scale,
        width: format === "og" ? 720 : width - 160,
        fontFamily: "Mono",
        fontSize: 30 * scale,
        color: "#111",
        ...(format === "og" ? { transform: "rotate(2deg)" } : {}),
      }}
    >
      <div style={{ fontFamily: "Bricolage", fontSize: 54 * scale }}>TON TICKET</div>
      <div style={{ fontSize: 24 * scale }}>{plain(`si ${shared.candidate.displayName} passe`)}</div>
      {shared.profileLine ? <div style={{ fontSize: 20 * scale, color: "#3A3A36", marginTop: 8 }}>{plain(shared.profileLine)}</div> : null}
      <div style={{ borderTop: "4px dashed #111", margin: "20px 0" }} />
      {money.length === 0 ? <div>Portefeuille : 0 €</div> : null}
      {money.map((l, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, margin: "6px 0" }}>
          <span style={{ flex: 1 }}>{plain(`${l.nature === "estime" ? "≈ " : ""}${LINE_LABELS[l.ticketLine]}`)}</span>
          <span style={{ flexShrink: 0 }}>{l.value ? plain(formatMoney(l.value)) : ""}</span>
        </div>
      ))}
      <div style={{ borderTop: "4px dashed #111", margin: "20px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <span>SOLDE / MOIS</span>
        <span style={{ fontFamily: "Bricolage", fontSize: 56 * scale }}>{plain(formatMoney({ low: t.solde.low, high: t.solde.high }, false))}</span>
      </div>
      {time ? <div style={{ marginTop: 14, fontSize: 24 * scale }}>{plain(describeTime(time))}</div> : null}
    </div>
  );

  return new ImageResponse(
    format === "og" ? (
      <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 70px", background: "#FFD23F", color: "#111" }}>
        <div style={{ display: "flex", flexDirection: "column", width: 420 }}>
          <div style={{ fontFamily: "Sans", fontSize: 26, letterSpacing: 3 }}>PRÉSIDENTIELLE 2027</div>
          <div style={{ fontFamily: "Bricolage", fontSize: 110, lineHeight: 0.9, letterSpacing: -4, marginTop: 10 }}>Ma vie en 2032</div>
          <div style={{ marginTop: 26, background: "#111", color: "#fff", borderRadius: 24, padding: "16px 26px", fontFamily: "Sans", fontSize: 32 }}>Et toi, ça donne quoi ?</div>
        </div>
        {ticket}
      </div>
    ) : (
      <div style={{ width, height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 50, background: "#FFD23F", color: "#111" }}>
        <div style={{ fontFamily: "Bricolage", fontSize: 64 }}>Mon quinquennat</div>
        {ticket}
        <div style={{ fontFamily: "Sans", fontSize: 44 }}>Et toi, ça donne quoi ?</div>
      </div>
    ),
    { width, height, fonts, headers },
  );
}
