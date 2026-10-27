"use client";

import { Children, useEffect, useState, type ReactNode } from "react";
import { cryptoRandom, shuffle } from "@/lib/shuffle";

/**
 * Liste d'éléments par candidat, ordre tiré au sort à chaque visite (même règle que `ProgrammeChips`) :
 * masquée tant que le tirage n'a pas eu lieu, pour ne montrer aucun ordre fixe.
 */
export function Shuffled({ children, className }: { children: ReactNode; className?: string }) {
  const items = Children.toArray(children);
  const [order, setOrder] = useState<number[] | null>(null);
  const count = items.length;
  useEffect(() => setOrder(shuffle([...Array(count).keys()], cryptoRandom)), [count]);

  return (
    <ul className={className} aria-busy={order === null} style={order === null ? { visibility: "hidden" } : undefined}>
      {(order ?? [...Array(count).keys()]).map((i) => items[i])}
    </ul>
  );
}
