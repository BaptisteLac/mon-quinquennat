"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TicketLineResult } from "@mon-quinquennat/schema";
import { Avatar } from "@/components/Avatar";
import { BadgeIcon } from "@/components/BadgeIcon";
import { SourceSheet, type SheetTarget } from "@/components/quinquennat/SourceSheet";
import { ShareSheet } from "@/components/share/ShareSheet";
import { TicketCard } from "@/components/ticket/TicketCard";
import type { Catalog } from "@/lib/catalog";
import { CIVIC_LINKS, ELECTION_DATES } from "@/lib/civic-links";
import { formatDate, plural } from "@/lib/format";
import { completeProfile, freshResult, mysteryPool, profileLine } from "@/lib/journey";
import type { ProgrammeSummary } from "@/lib/programme-summary";
import { biggestChange } from "@/lib/recap";
import { formatMoney } from "@/lib/ticket-labels";
import { useJourney } from "@/lib/use-journey";
import { CertaintySlide, GlanceSlide, Slide, ThemesSlide, type RecapLane } from "./slides";
import styles from "./recap.module.css";

type SlideId = { kind: "intro" } | { kind: "ticket"; lane: RecapLane; index: number } | { kind: "mystere" } | { kind: "revelation" } | { kind: "coup-oeil" } | { kind: "themes" } | { kind: "certitude" } | { kind: "fin" };

export function Recap({ programmes }: { programmes: readonly ProgrammeSummary[] }) {
  const router = useRouter();
  const { journey, update, reset } = useJourney();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [index, setIndex] = useState(0);
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  const [share, setShare] = useState<RecapLane | null>(null);
  const versions = useMemo(() => Object.fromEntries(programmes.map((p) => [p.id, p.corpusId])), [programmes]);
  const profile = journey ? completeProfile(journey.profile) : null;
  const tickets = journey && profile ? freshResult(journey, profile, versions) : null;

  useEffect(() => {
    if (journey && !tickets) router.replace("/quinquennat");
  }, [journey, tickets, router]);
  useEffect(() => {
    fetch("/donnees/mesures.json")
      .then((r) => r.json() as Promise<Catalog>)
      .then(setCatalog)
      .catch(() => undefined);
  }, []);

  if (!journey || !profile || !tickets || !catalog) return <div className={styles.loading} aria-busy="true" />;

  const byId = new Map(programmes.map((p) => [p.id, p]));
  const revealed = journey.recap?.revele ?? false;
  const lanes: RecapLane[] = [];
  for (const id of journey.choix.candidats) {
    const p = byId.get(id);
    const t = tickets.find((x) => x.candidateId === id);
    if (p && t) lanes.push({ key: id, candidateId: id, mystery: false, label: p.displayName, badge: p.badge, party: p.party, slug: p.slug, ticket: t });
  }
  const mysteryId = journey.choix.mystere ? journey.choix.mystereId : null;
  const mp = mysteryId ? byId.get(mysteryId) : undefined;
  const mt = mysteryId ? tickets.find((x) => x.candidateId === mysteryId) : undefined;
  const mystery: RecapLane | null =
    mp && mt
      ? { key: "mystere", candidateId: mp.id, mystery: true, label: revealed ? mp.displayName : "Mystère", badge: revealed ? mp.badge : null, party: mp.party, slug: mp.slug, ticket: mt }
      : null;
  const all = mystery ? [...lanes, mystery] : lanes;

  const slides: SlideId[] = [
    { kind: "intro" },
    ...lanes.map((lane, i) => ({ kind: "ticket" as const, lane, index: i })),
    ...(mystery ? [{ kind: "mystere" as const }, { kind: "revelation" as const }] : []),
    { kind: "coup-oeil" },
    { kind: "themes" },
    { kind: "certitude" },
    { kind: "fin" },
  ];
  const current = slides[Math.min(index, slides.length - 1)] ?? { kind: "intro" };
  const next = () => setIndex((i) => Math.min(slides.length - 1, i + 1));
  const reveal = (devine: string | null) => {
    update((j) => ({ ...j, recap: { revele: true, devine } }));
    setIndex(slides.findIndex((s) => s.kind === "revelation"));
  };
  const ticketCount = lanes.length + (mystery ? 1 : 0);
  const avatar = { genre: profile.genre, age: profile.age };
  const openLine = (lane: RecapLane) => (line: TicketLineResult) =>
    setSheet({ laneLabel: lane.label, candidateId: lane.candidateId, mystery: lane.mystery && !revealed, lines: [line], ticket: lane.ticket });

  const tone = current.kind === "ticket" || current.kind === "fin" ? "yellow" : current.kind === "intro" || current.kind === "mystere" || current.kind === "revelation" ? "ink" : "cream";
  const title =
    current.kind === "ticket"
      ? `Ton ticket · ${current.index + 1} sur ${ticketCount}`
      : current.kind === "mystere"
        ? `Ton ticket · ${ticketCount} sur ${ticketCount} · mystère`
        : "Ton récap";

  return (
    <div className={styles.recap} data-tone={tone}>
      <header className={styles.top}>
        <div className={styles.progress} aria-label={`Écran ${index + 1} sur ${slides.length}`}>
          {slides.map((_, i) => (
            <button key={i} type="button" className={styles.dash} data-done={i <= index} aria-label={`Aller à l'écran ${i + 1}`} onClick={() => setIndex(i)} />
          ))}
        </div>
        <div className={styles.topRow}>
          <span className={styles.topTitle}>{title}</span>
          <Link href="/quinquennat" className={styles.close} aria-label="Fermer le récap">
            ×
          </Link>
        </div>
      </header>

      {current.kind === "intro" ? (
        <Slide tone="ink">
          <p className={styles.years}>2027 → 2032</p>
          <h1 className={styles.giant}>
            Tu viens
            <br />
            de vivre
            <br />5 ans.
          </h1>
          <Avatar genre={profile.genre} age={profile.age} enfants={profile.enfants.length} size={150} />
          <p className={styles.lead}>
            Avec {lanes.length > 1 ? `les ${lanes.length} programmes que tu as choisis` : "le programme que tu as choisi"}
            {mystery ? ", et un autre tiré au hasard" : ""}. Voici ce que ça a changé pour toi.
          </p>
          <button type="button" className={styles.primaryYellow} onClick={next}>
            Voir mon récap →
          </button>
        </Slide>
      ) : null}

      {current.kind === "ticket" ? (
        <Slide tone="yellow">
          <TicketCard
            ticket={current.lane.ticket}
            catalog={catalog}
            head={{ candidate: current.lane.badge ? { displayName: current.lane.label, badge: current.lane.badge } : null, profileLine: profileLine(profile), avatar }}
            onLine={openLine(current.lane)}
          />
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={() => setShare(current.lane)}>
              Partager
            </button>
            <button type="button" className={styles.secondary} onClick={next}>
              {current.index + 1 < lanes.length || mystery ? "Ticket suivant" : "Suivant"}
            </button>
          </div>
          <Link href={`/programme/${current.lane.slug}`} className={styles.textLink}>
            Tout son programme
          </Link>
        </Slide>
      ) : null}

      {current.kind === "mystere" && mystery ? (
        <MysterySlide
          lane={mystery}
          catalog={catalog}
          profileText={profileLine(profile)}
          revealed={revealed}
          pool={mysteryPool(programmes.map((p) => p.id), journey.choix).map((id) => byId.get(id)).filter((p): p is ProgrammeSummary => p !== undefined)}
          onReveal={reveal}
          onNext={next}
        />
      ) : null}

      {current.kind === "revelation" && mystery && mp ? (
        <Slide tone="ink">
          <h1 className={styles.h1}>
            Ton {ticketCount === 1 ? "1er" : `${ticketCount}e`} ticket,
            <br />
            c&apos;était…
          </h1>
          {revealed ? (
            <>
              <div className={styles.reveal}>
                <span className={styles.kicker}>RÉVÉLATION</span>
                <span className={styles.revealName}>
                  <BadgeIcon badge={mp.badge} size={20} /> {mp.displayName}
                </span>
                <span>{mp.party}</span>
                {(() => {
                  const b = biggestChange(mystery.ticket, catalog);
                  return b ? (
                    <>
                      <span className={styles.revealRule} />
                      <span>
                        <b>Ce qui change le plus pour toi :</b> {b.text}
                      </span>
                      {b.line.value ? (
                        <span className={styles.revealValue}>
                          <span>Pour toi</span>
                          <b>{formatMoney(b.line.value)} / mois</b>
                        </span>
                      ) : null}
                    </>
                  ) : null;
                })()}
              </div>
              {journey.recap?.devine ? (
                <p className={styles.lead}>{journey.recap.devine === mp.id ? "Bien vu : c'est le programme que tu avais deviné." : "Ce n'était pas le programme que tu avais deviné."}</p>
              ) : (
                <p className={styles.lead}>Tu ne l&apos;avais pas choisi. Tu le connaissais ?</p>
              )}
              <div className={styles.actions}>
                <Link href={`/programme/${mp.slug}`} className={styles.secondaryInk}>
                  Voir son programme
                </Link>
                <button type="button" className={styles.primaryYellow} onClick={next}>
                  Suivant
                </button>
              </div>
            </>
          ) : (
            <button type="button" className={styles.primaryYellow} onClick={() => setIndex(slides.findIndex((s) => s.kind === "mystere"))}>
              Gratter le ticket mystère
            </button>
          )}
        </Slide>
      ) : null}

      {current.kind === "coup-oeil" ? (
        <Slide tone="cream">
          <GlanceSlide lanes={all} />
          <NextBar onNext={next} onShare={() => setShare(lanes[0] ?? null)} />
        </Slide>
      ) : null}
      {current.kind === "themes" ? (
        <Slide tone="cream">
          <ThemesSlide lanes={all} />
          <NextBar onNext={next} onShare={() => setShare(lanes[0] ?? null)} />
        </Slide>
      ) : null}
      {current.kind === "certitude" ? (
        <Slide tone="cream">
          <CertaintySlide lanes={all} catalog={catalog} />
          <NextBar onNext={next} onShare={() => setShare(lanes[0] ?? null)} />
        </Slide>
      ) : null}

      {current.kind === "fin" ? (
        <Slide tone="yellow">
          <h1 className={styles.giant}>
            À toi
            <br />
            de jouer.
          </h1>
          {ELECTION_DATES ? (
            <p className={styles.lead}>
              1er tour : {formatDate(ELECTION_DATES.premierTour)} · 2nd tour : {formatDate(ELECTION_DATES.secondTour)}
            </p>
          ) : null}
          {[CIVIC_LINKS.inscription, CIVIC_LINKS.procuration, CIVIC_LINKS.bureau].map((l) =>
            l ? (
              <a key={l.title} href={l.url} target="_blank" rel="noopener noreferrer" className={styles.civic}>
                <b>{l.title}</b>
                <span>{l.text}</span>
              </a>
            ) : null,
          )}
          <p className={styles.soon}>
            <b>Bientôt :</b> le ticket de la France, ce que coûte chaque programme selon plusieurs chiffrages indépendants.
          </p>
          <div className={styles.finActions}>
            <button type="button" className={styles.primary} onClick={() => setShare(lanes[0] ?? null)}>
              Partager mon ticket
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => {
                reset();
                router.push("/personnage");
              }}
            >
              Refaire avec un autre perso
            </button>
          </div>
        </Slide>
      ) : null}

      <SourceSheet target={sheet} catalog={catalog} profile={profile} onClose={() => setSheet(null)} />
      <ShareSheet
        lane={share}
        lanes={revealed && mystery ? all : lanes}
        onPick={setShare}
        partage={journey.resultat?.partage}
        versions={versions}
        avatar={avatar}
        catalog={catalog}
        onClose={() => setShare(null)}
      />
    </div>
  );
}

function NextBar({ onNext, onShare }: { onNext: () => void; onShare: () => void }) {
  return (
    <div className={styles.actions}>
      <button type="button" className={styles.primary} onClick={onShare}>
        Partager
      </button>
      <button type="button" className={styles.secondary} onClick={onNext}>
        Suivant
      </button>
    </div>
  );
}

/** R2b : ticket mystère, candidat caché sous une zone à gratter. */
function MysterySlide({
  lane,
  catalog,
  profileText,
  revealed,
  pool,
  onReveal,
  onNext,
}: {
  lane: RecapLane;
  catalog: Catalog;
  profileText: string;
  revealed: boolean;
  pool: readonly ProgrammeSummary[];
  onReveal: (devine: string | null) => void;
  onNext: () => void;
}) {
  const [scratched, setScratched] = useState(0);
  const [guessing, setGuessing] = useState(false);
  const pressed = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (scratched >= 1 && !revealed) onReveal(null);
  }, [scratched, revealed, onReveal]);

  return (
    <Slide tone="ink">
      <TicketCard ticket={lane.ticket} catalog={catalog} head={{ candidate: null, profileLine: profileText, avatar: null }}>
        {!revealed ? (
          <div
            className={styles.scratch}
            style={{ opacity: Math.max(0, 1 - scratched) }}
            role="img"
            aria-label="Zone à gratter : glisse le doigt pour révéler le candidat"
            onPointerDown={(e) => {
              pressed.current = true;
              last.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerUp={() => {
              pressed.current = false;
            }}
            onPointerLeave={() => {
              pressed.current = false;
            }}
            onPointerMove={(e) => {
              if (!pressed.current || !last.current) return;
              const d = Math.hypot(e.clientX - last.current.x, e.clientY - last.current.y);
              last.current = { x: e.clientX, y: e.clientY };
              setScratched((s) => Math.min(1, s + d / 900));
            }}
          >
            Gratte pour révéler
          </div>
        ) : null}
        <p className={styles.guessNote}>
          Tu as vu ce que ce programme change pour toi. <b>À ton avis, c&apos;est qui ?</b>
        </p>
      </TicketCard>
      {revealed ? (
        <div className={styles.actions}>
          <button type="button" className={styles.primaryYellow} onClick={onNext}>
            Voir la révélation
          </button>
        </div>
      ) : guessing ? (
        <div className={styles.guess}>
          {pool.map((p) => (
            <button key={p.id} type="button" className={styles.guessOption} onClick={() => onReveal(p.id)}>
              <BadgeIcon badge={p.badge} size={12} /> {p.displayName} · {p.party}
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.actions}>
          <button type="button" className={styles.primaryYellow} onClick={() => onReveal(null)}>
            Révéler d&apos;un coup
          </button>
          <button type="button" className={styles.secondaryInk} onClick={() => setGuessing(true)}>
            Deviner d&apos;abord
          </button>
        </div>
      )}
      <p className={styles.noteInk}>{plural(pool.length, "programme possible", "programmes possibles")}</p>
    </Slide>
  );
}
