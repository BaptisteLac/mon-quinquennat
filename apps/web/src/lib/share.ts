/**
 * Lien de partage d'un ticket : le ticket seul (et, si l'utilisateur le veut, la ligne de profil et
 * l'avatar), jamais ses réponses. Compressé dans l'adresse ; signé par le serveur au moment du calcul,
 * pour qu'un ticket modifié à la main ne puisse pas être affiché comme un résultat du site.
 */
import { Ticket } from "@mon-quinquennat/schema";
import { z } from "zod";

export const SharePayload = z.object({
  v: z.literal(1),
  corpusId: z.string(),
  ticket: Ticket,
  signature: z.string(),
  profil: z.object({ ligne: z.string(), signature: z.string() }).optional(),
  avatar: z.object({ genre: z.enum(["femme", "homme", "autre"]), age: z.number().int().min(18).max(110) }).optional(),
});
export type SharePayload = z.infer<typeof SharePayload>;

function toBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const s = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodeShare(payload: SharePayload): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(SharePayload.parse(payload)));
  return toBase64Url(await pipe(json, new CompressionStream("deflate-raw")));
}

/** `null` si le lien est illisible ou ne respecte pas le schéma. */
export async function decodeShare(text: string): Promise<SharePayload | null> {
  try {
    if (!/^[A-Za-z0-9_-]{1,8000}$/.test(text)) return null;
    const json = new TextDecoder().decode(await pipe(fromBase64Url(text), new DecompressionStream("deflate-raw")));
    const parsed = SharePayload.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
