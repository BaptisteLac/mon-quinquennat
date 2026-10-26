import type { Metadata } from "next";
import { StepCandidats } from "@/components/steps/StepCandidats";
import { getProgrammes } from "@/lib/data";
import { summarize } from "@/lib/programme-summary";

export const metadata: Metadata = { title: "Quels programmes veux-tu vivre ?" };

export default function CandidatsPage() {
  return <StepCandidats programmes={getProgrammes().map(summarize)} />;
}
