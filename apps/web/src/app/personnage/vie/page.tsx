import type { Metadata } from "next";
import { StepVie } from "@/components/steps/StepVie";

export const metadata: Metadata = { title: "Ta vie au quotidien" };

export default function ViePage() {
  return <StepVie />;
}
