import type { ProfileDraft } from "@/lib/journey";
import { describeProfile } from "@/lib/journey";
import { plural } from "@/lib/format";
import { BallotBox, Scene } from "./Scene";
import styles from "./quinquennat.module.css";

/** X1 : calcul en cours. Les étapes cochées sont celles réellement faites. */
export function CalcScreen({ profile, measureCount, programmeCount }: { profile: ProfileDraft; measureCount: number; programmeCount: number }) {
  return (
    <main className={styles.calc} aria-busy="true">
      <div className={styles.brand}>Mon quinquennat</div>
      <Scene caption="Mai 2027. Les bureaux de vote ferment." profile={profile}>
        {BallotBox}
      </Scene>
      <h1 className={styles.calcTitle}>
        On calcule
        <br />
        tes 5 prochaines années…
      </h1>
      <ul className={styles.steps}>
        <li data-state="done">Ton profil : {describeProfile(profile)}</li>
        <li data-state="done">
          {plural(measureCount, "mesure publiée", "mesures publiées")} dans {plural(programmeCount, "programme")}
        </li>
        <li data-state="active">
          <b>Application des barèmes officiels</b>
        </li>
        <li data-state="todo">Préparation de ta frise</li>
      </ul>
      <div className={styles.indeterminate} role="progressbar" aria-label="Calcul en cours" />
      <p className={styles.calcFoot}>Ton profil sert au calcul puis est oublié. Rien n&apos;est enregistré sur nos serveurs.</p>
    </main>
  );
}
