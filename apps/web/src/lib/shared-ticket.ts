/** Lecture d'un lien de partage côté serveur : décodage, vérification de la signature, données d'affichage. */
import type { Ticket } from "@mon-quinquennat/schema";
import { buildCatalog, type Catalog } from "./catalog";
import { getProgrammes } from "./data";
import { decodeShare, type SharePayload } from "./share";
import { shareSecret, verifyProfileLine, verifyTicket } from "./share-sign";

export type SharedTicket =
  | {
      ok: true;
      payload: SharePayload;
      ticket: Ticket;
      candidate: { displayName: string; party: string; badge: ReturnType<typeof getProgrammes>[number]["candidate"]["badge"]; slug: string };
      profileLine: string | null;
      /** La version du programme a changé depuis le calcul de ce ticket. */
      outdated: { collectedAt: string } | null;
      catalog: Catalog;
    }
  | { ok: false; reason: "illisible" | "non_verifie" | "inconnu" };

export async function readSharedTicket(code: string): Promise<SharedTicket> {
  const payload = await decodeShare(code);
  if (!payload) return { ok: false, reason: "illisible" };
  const secret = shareSecret();
  if (!secret || !verifyTicket(secret, payload.ticket, payload.corpusId, payload.signature)) return { ok: false, reason: "non_verifie" };
  const programme = getProgrammes().find((p) => p.candidate.id === payload.ticket.candidateId);
  if (!programme) return { ok: false, reason: "inconnu" };
  const profileLine = payload.profil && verifyProfileLine(secret, payload.profil.ligne, payload.profil.signature) ? payload.profil.ligne : null;

  // Catalogue réduit aux mesures de ce ticket : la page n'embarque pas tout le programme.
  const full = buildCatalog([programme]);
  const ids = new Set(payload.ticket.lines.flatMap((l) => l.measureIds));
  const catalog: Catalog = {
    programmes: full.programmes,
    measures: Object.fromEntries(Object.entries(full.measures).filter(([id]) => ids.has(id))),
  };
  return {
    ok: true,
    payload,
    ticket: payload.ticket,
    candidate: { displayName: programme.candidate.displayName, party: programme.candidate.party, badge: programme.candidate.badge, slug: programme.slug },
    profileLine,
    outdated: payload.corpusId === programme.corpusId ? null : { collectedAt: programme.collectedAt },
    catalog,
  };
}
