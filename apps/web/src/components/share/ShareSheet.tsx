"use client";

import { useEffect, useRef, useState } from "react";
import type { RecapLane } from "@/components/recap/slides";
import { TicketCard } from "@/components/ticket/TicketCard";
import { BadgeIcon } from "@/components/BadgeIcon";
import type { Catalog } from "@/lib/catalog";
import { encodeShare } from "@/lib/share";
import styles from "./share.module.css";

type Format = "story" | "carre" | "lien";

/**
 * P1 : partager un ticket. Le lien ne contient que ce ticket (et, si tu le choisis, la ligne de profil et
 * l'avatar), signé par le serveur au moment du calcul. Jamais tes réponses.
 */
export function ShareSheet({
  lane,
  lanes,
  onPick,
  partage,
  versions,
  avatar,
  catalog,
  onClose,
}: {
  lane: RecapLane | null;
  lanes: readonly RecapLane[];
  onPick: (lane: RecapLane) => void;
  partage: { tickets: Record<string, string>; profil: string; signatureProfil: string } | undefined;
  versions: Record<string, string>;
  avatar: { genre: "femme" | "homme" | "autre"; age: number };
  catalog: Catalog;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showAvatar, setShowAvatar] = useState(true);
  const [format, setFormat] = useState<Format>("story");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (lane && !dialog.current?.open) dialog.current?.showModal();
    if (!lane && dialog.current?.open) dialog.current.close();
  }, [lane]);

  const signature = lane && partage ? partage.tickets[lane.candidateId] : undefined;
  useEffect(() => {
    setLink(null);
    setCopied(false);
    if (!lane || !signature) return;
    let cancelled = false;
    encodeShare({
      v: 1,
      corpusId: versions[lane.candidateId] ?? "",
      ticket: lane.ticket,
      signature,
      ...(showProfile && partage ? { profil: { ligne: partage.profil, signature: partage.signatureProfil } } : {}),
      ...(showAvatar ? { avatar } : {}),
    }).then((code) => !cancelled && setLink(`/t/${code}`));
    return () => {
      cancelled = true;
    };
  }, [lane, signature, showProfile, showAvatar, partage, versions, avatar]);

  const absolute = link && typeof window !== "undefined" ? `${window.location.origin}${link}` : null;
  const title = lane ? `Ma vie en 2032 si ${lane.label} passe` : "";

  return (
    <dialog ref={dialog} className={styles.sheet} aria-labelledby="partage-titre" onClose={onClose}>
      {lane ? (
        <>
          <div className={styles.head}>
            <h2 id="partage-titre">Partager ton ticket</h2>
            <button type="button" className={styles.close} aria-label="Fermer" onClick={onClose}>
              ×
            </button>
          </div>
          {lanes.length > 1 ? (
            <div className={styles.picker} role="group" aria-label="Ticket à partager">
              {lanes.map((l) => (
                <button key={l.key} type="button" aria-pressed={l.key === lane.key} onClick={() => onPick(l)}>
                  {l.badge ? <BadgeIcon badge={l.badge} size={11} /> : null} {l.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className={styles.preview} data-format={format}>
            <span className={styles.previewBrand}>Mon quinquennat</span>
            <TicketCard
              ticket={lane.ticket}
              catalog={catalog}
              maxFacts={2}
              head={{
                candidate: lane.badge ? { displayName: lane.label, badge: lane.badge } : null,
                profileLine: showProfile && partage ? partage.profil : null,
                avatar: showAvatar ? avatar : null,
              }}
            />
          </div>
          <div className={styles.options}>
            <label className={styles.toggle}>
              <span>
                <b>Afficher mon profil</b>
                <span>Âge, famille, logement, travail</span>
              </span>
              <input type="checkbox" role="switch" checked={showProfile} onChange={(e) => setShowProfile(e.target.checked)} />
            </label>
            <label className={styles.toggle}>
              <span>
                <b>Afficher mon avatar</b>
                <span>Ton petit perso en en-tête</span>
              </span>
              <input type="checkbox" role="switch" checked={showAvatar} onChange={(e) => setShowAvatar(e.target.checked)} />
            </label>
          </div>
          <fieldset className={styles.formats}>
            <legend>FORMAT</legend>
            {(
              [
                ["story", "Story"],
                ["carre", "Carré"],
                ["lien", "Lien seul"],
              ] as const
            ).map(([value, label]) => (
              <label key={value}>
                <input type="radio" name="format" value={value} checked={format === value} onChange={() => setFormat(value)} />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          {!signature ? (
            <p className={styles.note}>Le partage par lien n&apos;est pas encore activé sur ce site.</p>
          ) : (
            <>
              <button
                type="button"
                className={styles.primary}
                disabled={!absolute}
                onClick={async () => {
                  if (!absolute) return;
                  try {
                    if (format !== "lien" && link && navigator.canShare) {
                      const blob = await fetch(`${link}/image?format=${format}`).then((r) => r.blob());
                      const file = new File([blob], "ma-vie-en-2032.png", { type: "image/png" });
                      if (navigator.canShare({ files: [file] })) {
                        await navigator.share({ title, url: absolute, files: [file] });
                        return;
                      }
                    }
                    if (navigator.share) await navigator.share({ title, url: absolute });
                    else await navigator.clipboard.writeText(absolute).then(() => setCopied(true));
                  } catch {
                    // partage annulé par l'utilisateur
                  }
                }}
              >
                Partager
              </button>
              <div className={styles.row}>
                <button type="button" className={styles.secondary} disabled={!absolute} onClick={() => absolute && navigator.clipboard?.writeText(absolute).then(() => setCopied(true), () => undefined)}>
                  {copied ? "Lien copié" : "Copier le lien"}
                </button>
                {format !== "lien" && link ? (
                  <a className={styles.secondary} href={`${link}/image?format=${format}`} download="ma-vie-en-2032.png">
                    Télécharger l&apos;image
                  </a>
                ) : null}
              </div>
            </>
          )}
          <p className={styles.note}>Le lien contient seulement ce ticket, jamais tes réponses.</p>
        </>
      ) : null}
    </dialog>
  );
}
