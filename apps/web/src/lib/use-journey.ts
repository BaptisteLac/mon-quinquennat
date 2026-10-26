"use client";

import { useCallback, useEffect, useState } from "react";
import { emptyJourney, normalize, type Journey } from "./journey";
import { clearJourney, loadJourney, saveJourney } from "./journey-store";

/**
 * Parcours lu dans le stockage local après le premier rendu (`null` avant : la page statique ne
 * connaît pas le profil). Chaque modification est normalisée puis enregistrée.
 */
export function useJourney() {
  const [journey, setJourney] = useState<Journey | null>(null);

  useEffect(() => {
    setJourney(loadJourney() ?? emptyJourney());
  }, []);

  const update = useCallback((change: (j: Journey) => Journey) => {
    setJourney((current) => {
      const next = change(current ?? emptyJourney());
      const normalized = { ...next, profile: normalize(next.profile) };
      saveJourney(normalized);
      return normalized;
    });
  }, []);

  const reset = useCallback(() => {
    clearJourney();
    setJourney(emptyJourney());
  }, []);

  return { journey, update, reset };
}
