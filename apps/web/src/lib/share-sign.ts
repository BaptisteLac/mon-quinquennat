/** Signature des tickets partagés (serveur seulement : le secret ne quitte jamais le serveur). */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Ticket } from "@mon-quinquennat/schema";
import { canonical } from "./canonical";

export function shareSecret(): string | null {
  const s = process.env.SHARE_SECRET;
  return s && s.length >= 32 ? s : null;
}

function hmac(secret: string, kind: string, value: unknown): string {
  return createHmac("sha256", secret).update(`${kind}\n${canonical(value)}`).digest("base64url");
}

export function signTicket(secret: string, ticket: Ticket, corpusId: string): string {
  return hmac(secret, "ticket", { corpusId, ticket });
}

export function signProfileLine(secret: string, line: string): string {
  return hmac(secret, "profil", line);
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function verifyTicket(secret: string, ticket: Ticket, corpusId: string, signature: string): boolean {
  return same(signTicket(secret, ticket, corpusId), signature);
}

export function verifyProfileLine(secret: string, line: string, signature: string): boolean {
  return same(signProfileLine(secret, line), signature);
}
