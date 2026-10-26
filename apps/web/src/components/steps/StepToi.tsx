"use client";

import { useEffect } from "react";
import type { Profile } from "@mon-quinquennat/schema";
import { Avatar } from "@/components/Avatar";
import { Choice, FlowTop, formStyles as styles, NextAction, NumberStepper, YesNo, type Option } from "@/components/form/fields";
import { asksBusiness, asksCareerEnd, asksPartTime, missingStep1, type ProfileDraft } from "@/lib/journey";
import { useJourney } from "@/lib/use-journey";

const GENRES: Option<Profile["genre"]>[] = [
  { value: "femme", label: "Femme" },
  { value: "homme", label: "Homme" },
  { value: "autre", label: <>Autre ou<br />ne pas dire</> },
];
const FAMILLE: Option<Profile["situationFamiliale"]>[] = [
  { value: "seul", label: "Seul·e" },
  { value: "marie_pacse", label: <>Marié·e<br />ou pacsé·e</> },
  { value: "couple_non_marie", label: <>En couple<br />non marié</> },
];
export const SITUATIONS: Option<Profile["situationPro"]>[] = [
  { value: "salarie_prive", label: "Salarié·e du privé" },
  { value: "fonctionnaire", label: "Fonctionnaire" },
  { value: "independant", label: "Indépendant·e" },
  { value: "chef_entreprise", label: "Chef·fe d'entreprise" },
  { value: "demandeur_emploi", label: "Demandeur·se d'emploi" },
  { value: "etudiant", label: "Étudiant·e" },
  { value: "retraite", label: "Retraité·e" },
  { value: "sans_activite", label: "Sans activité" },
];
const ENFANTS: Option<"0" | "1" | "2" | "3">[] = [
  { value: "0", label: "0" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3+" },
];
const TEMPS: Option<"plein" | "partiel">[] = [
  { value: "plein", label: "À temps plein" },
  { value: "partiel", label: "À temps partiel" },
];
type Entreprise = NonNullable<Profile["entreprise"]>;
const STATUTS: Option<Entreprise["statut"]>[] = [
  { value: "micro", label: "Micro-entreprise" },
  { value: "independant", label: "Entreprise individuelle" },
  { value: "societe", label: "Société" },
];
const SALARIES: Option<Entreprise["salaries"]>[] = [
  { value: "0", label: "Aucun" },
  { value: "1_9", label: "1 à 9" },
  { value: "10_49", label: "10 à 49" },
  { value: "50_plus", label: "50 et +" },
];
const ACTIVITES: Option<NonNullable<Entreprise["activite"]>>[] = [
  { value: "vente", label: "Vente" },
  { value: "services", label: "Services" },
  { value: "liberale", label: "Profession libérale" },
];

/** Enfants à charge : nés au plus tôt 25 ans avant 2027, au plus tard en 2027. */
const CHILD_YEARS = Array.from({ length: 2027 - 2002 + 1 }, (_, i) => 2027 - i);
const MAX_CHILDREN = 10;

export function StepToi() {
  const { journey, update } = useJourney();

  // Le service de calcul est éteint au repos : on le réveille dès le début du personnage.
  useEffect(() => {
    fetch("/api/sante", { cache: "no-store" }).catch(() => undefined);
  }, []);

  if (!journey) return <div className={styles.page} aria-busy="true" />;
  const p = journey.profile;
  const set = (patch: ProfileDraft) => update((j) => ({ ...j, profile: { ...j.profile, ...patch } }));
  const enfants = p.enfants ?? [];
  const setChildCount = (n: number) => set({ enfants: Array.from({ length: n }, (_, i) => enfants[i] ?? {}) });
  const countChoice = p.enfants === undefined ? undefined : enfants.length >= 3 ? "3" : (String(enfants.length) as "0" | "1" | "2");
  const setEntreprise = (patch: Partial<Entreprise>) => set({ entreprise: { ...p.entreprise, ...patch } });

  return (
    <main className={styles.page}>
      <FlowTop back={null} pill="Étape 1 / 2" />
      <div className={styles.intro}>
        <div className={styles.introText}>
          <h1 className={styles.title}>
            Qui es-tu
            <br />
            en 2027 ?
          </h1>
          <p className={styles.lead}>Une minute. Rien n&apos;est enregistré sur nos serveurs.</p>
        </div>
        <Avatar genre={p.genre} age={p.age} enfants={enfants.length} caption="Ton perso" />
      </div>

      <NumberStepper label="Âge" value={p.age} onChange={(age) => set({ age })} min={18} max={110} start={35} unit="ans" />
      <Choice legend="Genre" hint="pour ton avatar" options={GENRES} value={p.genre} onChange={(genre) => set({ genre })} columns={3} />
      <Choice legend="Situation familiale" options={FAMILLE} value={p.situationFamiliale} onChange={(situationFamiliale) => set({ situationFamiliale })} columns={3} />

      <div className={styles.field}>
        <Choice legend="Enfants à charge" options={ENFANTS} value={countChoice} onChange={(v) => setChildCount(v === "3" ? Math.max(3, enfants.length) : Number(v))} columns={4} />
        {enfants.length > 0 ? (
          <div className={styles.subBox}>
            {enfants.length >= 3 ? (
              <NumberStepper inline label="Combien ?" value={enfants.length} onChange={setChildCount} min={3} max={MAX_CHILDREN} start={3} unit="" />
            ) : null}
            <div className={styles.subTitle}>Leur année de naissance ?</div>
            {enfants.map((e, i) => (
              <div className={styles.row} key={i}>
                <label className={styles.rowLabel} htmlFor={`enfant-${i}`}>
                  Enfant {i + 1}
                </label>
                <select
                  id={`enfant-${i}`}
                  className={styles.select}
                  value={e?.anneeNaissance ?? ""}
                  onChange={(ev) => set({ enfants: enfants.map((x, k) => (k === i ? { anneeNaissance: Number(ev.target.value) } : x)) })}
                >
                  <option value="" disabled>
                    Choisir…
                  </option>
                  {CHILD_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y === 2027 ? "2027 (à naître)" : y}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className={styles.help}>L&apos;année suffit : certaines aides changent avec l&apos;âge de l&apos;enfant.</div>
          </div>
        ) : null}
      </div>

      <div className={styles.field}>
        <Choice legend="Ta situation" options={SITUATIONS} value={p.situationPro} onChange={(situationPro) => set({ situationPro })} columns={2} />
        {asksPartTime(p) ? (
          <Choice
            legend="Et tu travailles"
            inlineLegend
            shape="pill"
            options={TEMPS}
            value={p.tempsPartiel === undefined ? undefined : p.tempsPartiel ? "partiel" : "plein"}
            onChange={(v) => set({ tempsPartiel: v === "partiel" })}
          />
        ) : null}
        {asksBusiness(p) ? (
          <div className={styles.subBox}>
            <Choice legend="Ton entreprise" inlineLegend size="small" options={STATUTS} value={p.entreprise?.statut} onChange={(statut) => setEntreprise({ statut })} columns={3} />
            <Choice legend="Salariés" inlineLegend size="small" options={SALARIES} value={p.entreprise?.salaries} onChange={(salaries) => setEntreprise({ salaries })} columns={4} />
            {p.entreprise?.statut === "micro" ? (
              <>
                <Choice legend="Activité" inlineLegend size="small" options={ACTIVITES} value={p.entreprise.activite} onChange={(activite) => setEntreprise({ activite })} columns={3} />
                <label className={styles.subTitle} htmlFor="ca">
                  Chiffre d&apos;affaires annuel (€)
                </label>
                <input
                  id="ca"
                  className={styles.textInput}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={p.entreprise.chiffreAffairesAnnuel ?? ""}
                  onChange={(e) => e.target.value !== "" && setEntreprise({ chiffreAffairesAnnuel: Math.max(0, Math.round(Number(e.target.value))) })}
                />
                <div className={styles.help}>Pour une micro-entreprise, l&apos;impôt et la prime d&apos;activité se calculent sur le chiffre d&apos;affaires.</div>
              </>
            ) : null}
          </div>
        ) : null}
        {p.situationPro === "demandeur_emploi" ? (
          <YesNo legend="Tu touches l'allocation chômage ?" value={p.indemnise} onChange={(indemnise) => set({ indemnise })} />
        ) : null}
        {p.situationPro === "etudiant" ? <YesNo legend="Tu es boursier·e ?" value={p.boursier} onChange={(boursier) => set({ boursier })} /> : null}
        {asksCareerEnd(p) ? (
          <div className={styles.subBox}>
            <NumberStepper inline label="À quel âge penses-tu partir à la retraite ?" hint="facultatif" value={p.ageDepartPrevu} onChange={(ageDepartPrevu) => set({ ageDepartPrevu })} min={55} max={75} start={64} unit="ans" />
            <NumberStepper inline label="À quel âge as-tu commencé à travailler ?" hint="facultatif" value={p.agePremierEmploi} onChange={(agePremierEmploi) => set({ agePremierEmploi })} min={14} max={40} start={20} unit="ans" />
          </div>
        ) : null}
      </div>

      <div className={styles.actions}>
        <NextAction href="/personnage/vie" missing={missingStep1(p)}>
          Continuer
        </NextAction>
      </div>
    </main>
  );
}
