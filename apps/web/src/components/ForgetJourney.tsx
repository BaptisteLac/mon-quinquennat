"use client";

import { useEffect, useState } from "react";
import { clearJourney, loadJourney } from "@/lib/journey-store";

/** « Effacer ma partie » : visible seulement si une partie est gardée sur cet appareil. */
export function ForgetJourney({ className }: { className?: string }) {
  const [state, setState] = useState<"none" | "saved" | "erased">("none");
  useEffect(() => setState(loadJourney() ? "saved" : "none"), []);

  if (state === "none") return null;
  if (state === "erased") return <p role="status">Ta partie est effacée de cet appareil.</p>;
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        clearJourney();
        setState("erased");
      }}
    >
      Effacer ma partie de cet appareil
    </button>
  );
}
