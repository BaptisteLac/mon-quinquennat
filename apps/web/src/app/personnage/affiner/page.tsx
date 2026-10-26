import type { Metadata } from "next";
import { StepAffiner } from "@/components/steps/StepAffiner";

export const metadata: Metadata = { title: "Affiner mon profil" };

export default function AffinerPage() {
  return <StepAffiner />;
}
