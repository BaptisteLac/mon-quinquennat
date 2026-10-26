"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Ticket, type Profile } from "@mon-quinquennat/schema";
import { z } from "zod";
import type { Catalog } from "@/lib/catalog";
import { completeProfile, freshResult, profileKey } from "@/lib/journey";
import type { ProgrammeSummary } from "@/lib/programme-summary";
import { useJourney } from "@/lib/use-journey";
import { CalcScreen } from "./CalcScreen";
import { ErrorScreen } from "./ErrorScreen";
import { Frise, type LaneView } from "./Frise";

const TicketResponse = z.object({ tickets: z.array(Ticket) });
const ErrorResponse = z.object({ erreur: z.string(), message: z.string() });

type Phase = { kind: "calcul" } | { kind: "erreur"; type: "reseau" | "hors_champ"; message: string } | { kind: "frise"; tickets: Ticket[] };

/** Arrivée sur la frise : tickets déjà calculés pour ce profil, sinon calcul (X1), erreur éventuelle (X2). */
export function Quinquennat({ programmes, measureCount }: { programmes: readonly ProgrammeSummary[]; measureCount: number }) {
  const router = useRouter();
  const { journey, update } = useJourney();
  const [phase, setPhase] = useState<Phase>({ kind: "calcul" });
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [attempt, setAttempt] = useState(0);
  const versions = useMemo(() => Object.fromEntries(programmes.map((p) => [p.id, p.corpusId])), [programmes]);
  const profile: Profile | null = journey ? completeProfile(journey.profile) : null;
  const chosen = journey?.choix.candidats.filter((id) => versions[id]) ?? [];

  useEffect(() => {
    if (!journey) return;
    if (!profile) router.replace("/personnage/vie");
    else if (chosen.length === 0) router.replace("/candidats");
  }, [journey, profile, chosen.length, router]);

  useEffect(() => {
    fetch("/donnees/mesures.json")
      .then((r) => r.json() as Promise<Catalog>)
      .then(setCatalog)
      .catch(() => setPhase({ kind: "erreur", type: "reseau", message: "" }));
  }, [attempt]);

  const ready = journey !== null && profile !== null && chosen.length > 0;
  const key = profile ? profileKey(profile) : null;
  useEffect(() => {
    if (!ready || !journey || !profile) return;
    const cached = freshResult(journey, profile, versions);
    if (cached) {
      setPhase({ kind: "frise", tickets: cached });
      return;
    }
    let cancelled = false;
    setPhase({ kind: "calcul" });
    (async () => {
      try {
        const res = await fetch("/api/ticket", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile }) });
        const body: unknown = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          const err = ErrorResponse.safeParse(body);
          setPhase({ kind: "erreur", type: res.status === 422 ? "hors_champ" : "reseau", message: err.success ? err.data.message : "" });
          return;
        }
        const { tickets } = TicketResponse.parse(body);
        update((j) => ({ ...j, resultat: { profileKey: profileKey(profile), versions, tickets, calculeLe: new Date().toISOString() } }));
        setPhase({ kind: "frise", tickets });
      } catch {
        if (!cancelled) setPhase({ kind: "erreur", type: "reseau", message: "" });
      }
    })();
    return () => {
      cancelled = true;
    };
    // Recalcul seulement si le profil, les versions ou la tentative changent (pas à chaque enregistrement du parcours).
  }, [ready, key, versions, attempt]);

  const onMonth = useCallback((month: string) => update((j) => (j.frise?.month === month ? j : { ...j, frise: { month } })), [update]);

  if (!journey || !profile) return <div aria-busy="true" />;
  if (phase.kind === "erreur") return <ErrorScreen profile={profile} kind={phase.type} message={phase.message} onRetry={() => setAttempt((n) => n + 1)} />;
  if (phase.kind === "calcul" || !catalog) return <CalcScreen profile={profile} measureCount={measureCount} programmeCount={programmes.length} />;

  const byId = new Map(programmes.map((p) => [p.id, p]));
  const lanes: LaneView[] = [];
  for (const id of chosen) {
    const p = byId.get(id);
    const ticket = phase.tickets.find((t) => t.candidateId === id);
    if (p && ticket) lanes.push({ key: id, candidateId: id, mystery: false, ticket, label: p.displayName, badge: p.badge });
  }
  const mysteryId = journey.choix.mystere ? journey.choix.mystereId : null;
  const mysteryTicket = mysteryId ? phase.tickets.find((t) => t.candidateId === mysteryId) : undefined;
  if (mysteryId && mysteryTicket) lanes.push({ key: "mystere", candidateId: mysteryId, mystery: true, ticket: mysteryTicket, label: "Mystère", badge: null });

  return <Frise lanes={lanes} catalog={catalog} profile={profile} initialMonth={journey.frise?.month ?? null} onMonth={onMonth} />;
}
