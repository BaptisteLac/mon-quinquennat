import type { Metadata } from "next";
import { StepToi } from "@/components/steps/StepToi";

export const metadata: Metadata = { title: "Ton perso" };

export default function PersonnagePage() {
  return <StepToi />;
}
