"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cryptoRandom, shuffle } from "@/lib/shuffle";
import styles from "./ProgrammeChips.module.css";

export interface ProgrammeChip {
  slug: string;
  displayName: string;
  party: string;
}

/**
 * Liste des programmes, ordre tiré au sort à chaque visite. La liste reste masquée tant que le tirage
 * n'a pas eu lieu, pour qu'aucun ordre fixe (celui du rendu serveur) ne soit montré.
 */
export function ProgrammeChips({ programmes }: { programmes: readonly ProgrammeChip[] }) {
  const [order, setOrder] = useState<ProgrammeChip[] | null>(null);
  useEffect(() => setOrder(shuffle(programmes, cryptoRandom)), [programmes]);

  return (
    <ul className={styles.list} aria-busy={order === null} data-ready={order !== null}>
      {(order ?? programmes).map((p) => (
        <li key={p.slug}>
          <Link className={styles.chip} href={`/programme/${p.slug}`}>
            {p.displayName} <span className={styles.party}>· {p.party}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
