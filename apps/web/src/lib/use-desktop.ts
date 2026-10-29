"use client";

import { useEffect, useState } from "react";

/** Largeur desktop (≥ 1024 px, docs/design-system.md). Faux au premier rendu : le serveur rend la version mobile. */
export function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return desktop;
}
