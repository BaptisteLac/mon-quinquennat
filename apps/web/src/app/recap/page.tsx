import type { Metadata } from "next";
import { Recap } from "@/components/recap/Recap";
import { getProgrammes } from "@/lib/data";
import { summarize } from "@/lib/programme-summary";

export const metadata: Metadata = { title: "Ton récap" };

export default function RecapPage() {
  return <Recap programmes={getProgrammes().map(summarize)} />;
}
