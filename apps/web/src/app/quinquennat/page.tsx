import type { Metadata } from "next";
import { Quinquennat } from "@/components/quinquennat/Quinquennat";
import { getProgrammes } from "@/lib/data";
import { summarize } from "@/lib/programme-summary";

export const metadata: Metadata = { title: "Ton quinquennat" };

export default function QuinquennatPage() {
  const programmes = getProgrammes();
  return <Quinquennat programmes={programmes.map(summarize)} measureCount={programmes.reduce((n, p) => n + p.measures.length, 0)} />;
}
