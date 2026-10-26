"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Profile } from "@mon-quinquennat/schema";
import { Avatar } from "@/components/Avatar";
import { CommunePicker } from "@/components/CommunePicker";
import { Choice, FlowTop, formStyles as styles, MoneyField, NextAction, type Option } from "@/components/form/fields";
import { isCouple, isTenant, missingStep1, missingStep2, type ProfileDraft } from "@/lib/journey";
import { useJourney } from "@/lib/use-journey";
import { SITUATIONS } from "./StepToi";

const LOGEMENTS: Option<Profile["logement"]>[] = [
  { value: "locataire_prive", label: "Locataire privé" },
  { value: "locataire_hlm", label: "Locataire HLM" },
  { value: "proprio_credit", label: "Proprio avec crédit" },
  { value: "proprio_sans_credit", label: "Proprio sans crédit" },
  { value: "heberge", label: "Hébergé·e" },
];
const LIEUX: Option<Profile["lieuDeVie"]>[] = [
  { value: "grande_ville", label: "En grande ville" },
  { value: "ville_moyenne", label: "En ville moyenne" },
  { value: "peripherie", label: "En périphérie" },
  { value: "rural", label: "À la campagne" },
  { value: "outre_mer", label: "En outre-mer" },
];
const MOBILITES: Option<Profile["mobilite"]>[] = [
  { value: "voiture_thermique", label: "Voiture essence / diesel" },
  { value: "voiture_electrique", label: "Voiture électrique" },
  { value: "transports", label: "Transports en commun" },
  { value: "velo_pied", label: "Vélo, à pied" },
];

export function StepVie() {
  const router = useRouter();
  const { journey, update } = useJourney();
  const step1Missing = journey ? missingStep1(journey.profile).length > 0 : false;

  useEffect(() => {
    if (step1Missing) router.replace("/personnage");
  }, [step1Missing, router]);

  if (!journey || step1Missing) return <div className={styles.page} aria-busy="true" />;
  const p = journey.profile;
  const set = (patch: ProfileDraft) => update((j) => ({ ...j, profile: { ...j.profile, ...patch } }));
  const retired = p.situationPro === "retraite";

  return (
    <main className={styles.page}>
      <FlowTop back="/personnage" pill="Étape 2 / 2" />
      <div className={styles.intro}>
        <h1 className={styles.title} style={{ flex: 1 }}>
          Ta vie au
          <br />
          quotidien
        </h1>
        <Avatar genre={p.genre} age={p.age} enfants={p.enfants?.length ?? 0} size={64} />
      </div>

      <MoneyField
        label={retired ? "Ta pension nette / mois" : "Tes revenus nets / mois"}
        value={p.revenusNetsMensuels}
        onChange={(v) => set(retired ? { revenusNetsMensuels: v, pensionMensuelle: v } : { revenusNetsMensuels: v })}
        rangeMax={8000}
        step={50}
        help={retired ? undefined : "Avant impôt sur le revenu, comme sur ta fiche de paie."}
      />

      {isCouple(p) ? (
        <div className={styles.subBox}>
          <MoneyField
            inline
            label="Et ceux de ton/ta conjoint·e"
            value={p.revenusConjointNetsMensuels}
            onChange={(revenusConjointNetsMensuels) => set({ revenusConjointNetsMensuels })}
            rangeMax={8000}
            step={50}
          />
          <Choice
            legend="Sa situation"
            inlineLegend
            size="small"
            columns={2}
            options={SITUATIONS}
            value={p.situationProConjoint}
            onChange={(situationProConjoint) => set({ situationProConjoint })}
          />
          <div className={styles.help}>
            {p.situationFamiliale === "marie_pacse"
              ? "Parce que tu es marié·e ou pacsé·e : l'impôt se calcule sur le foyer."
              : "Parce que tu es en couple : les aides (prime d'activité, aides au logement) se calculent sur le couple."}
          </div>
        </div>
      ) : null}

      <div className={styles.field}>
        <Choice legend="Logement" options={LOGEMENTS} value={p.logement} onChange={(logement) => set({ logement })} />
        {isTenant(p) ? (
          <div className={styles.subBox}>
            <MoneyField
              inline
              label="Ton loyer hors charges / mois"
              value={p.loyerMensuel}
              onChange={(loyerMensuel) => set({ loyerMensuel })}
              rangeMax={2500}
              step={10}
              help="Facultatif, mais sans loyer les aides au logement ne sont pas calculées."
            />
          </div>
        ) : null}
      </div>

      <CommunePicker
        codePostal={journey.commune?.codePostal}
        codeCommune={p.codeCommune}
        onChange={(value) =>
          update((j) => {
            const { codeCommune: _old, ...profile } = j.profile;
            if (!value) {
              const { commune: _c, ...rest } = j;
              return { ...rest, profile };
            }
            return {
              ...j,
              profile: { ...profile, codeCommune: value.commune.codeCommune },
              commune: { codePostal: value.codePostal, nom: value.commune.nom },
            };
          })
        }
      />

      <Choice legend="Tu vis" options={LIEUX} value={p.lieuDeVie} onChange={(lieuDeVie) => set({ lieuDeVie })} />
      <Choice legend="Tu te déplaces surtout" options={MOBILITES} value={p.mobilite} onChange={(mobilite) => set({ mobilite })} columns={2} />

      <div className={styles.actions}>
        <NextAction href="/candidats" missing={missingStep2(p)}>
          Vivre mon quinquennat
        </NextAction>
        <Link href="/personnage/affiner" className={styles.secondaryLink}>
          Affiner mon profil (facultatif, 2 questions)
        </Link>
      </div>
    </main>
  );
}
