import type { Metadata } from "next";
import Link from "next/link";
import { ForgetJourney } from "@/components/ForgetJourney";
import { Shuffled } from "@/components/Shuffled";
import { SiteFooter } from "@/components/SiteFooter";
import { dataDir, getProgrammes } from "@/lib/data";
import { formatDate, plural } from "@/lib/format";
import { CHECK_LABELS, checksOnAll, formatPercent, lastUpdate, loadEvaluations, pooledErrorRate, qualityByProgramme } from "@/lib/methode";
import { SOURCE_URL } from "@/lib/site";
import styles from "@/components/text-page.module.css";

export const metadata: Metadata = {
  title: "Méthode : comment on calcule ta vie en 2032",
  description: "D'où viennent les mesures, comment elles sont contrôlées, comment les montants sont calculés, taux d'erreur mesuré et limites.",
};

export default function MethodePage() {
  const programmes = getProgrammes();
  const summaries = loadEvaluations(dataDir());
  const quality = qualityByProgramme(programmes, summaries);
  const used = quality.flatMap((q) => (q.summary ? [q.summary] : []));
  const errorRate = pooledErrorRate(used);
  const checks = checksOnAll(programmes);
  const updated = lastUpdate(programmes, used);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <nav className={styles.top}>
          <Link href="/" className={styles.home}>
            Mon quinquennat
          </Link>
          {updated ? <span className={styles.updated}>Mis à jour le {formatDate(updated)}</span> : null}
        </nav>

        <h1 className={styles.title}>
          Comment on
          <br />
          calcule ta vie
          <br />
          en 2032
        </h1>

        <div className={styles.brief}>
          <b>En bref</b>
          <ul>
            <li>Une seule source pour les mesures : les programmes officiels.</li>
            <li>Les calculs suivent les barèmes officiels.</li>
            <li>L&apos;IA lit les programmes, des contrôles automatiques vérifient tout, le code calcule.</li>
            <li>Aucun classement, aucune recommandation de vote.</li>
          </ul>
        </div>

        <section className={styles.section} aria-labelledby="sources">
          <h2 id="sources">1. D&apos;où viennent les mesures</h2>
          <p>
            Uniquement des programmes et des sites officiels des candidats. Chaque version est archivée et datée, et nous vérifions
            chaque semaine si elle a changé. Les déclarations à l&apos;oral ou dans la presse ne sont pas prises en compte.
          </p>
          {programmes.length > 0 ? (
            <Shuffled className={styles.programmes}>
              {programmes.map((p) => (
                <li key={p.slug}>
                  <Link href={`/programme/${p.slug}`}>
                    {p.candidate.displayName} · {p.candidate.party}
                  </Link>
                  <span>
                    version collectée le {formatDate(p.collectedAt)}, {plural(p.measures.length, "mesure publiée", "mesures publiées")}
                  </span>
                </li>
              ))}
            </Shuffled>
          ) : null}
        </section>

        <section className={styles.section} aria-labelledby="lignes">
          <h2 id="lignes">2. Trois types de lignes</h2>
          <dl className={styles.kinds}>
            <div>
              <dt>Sûr</dt>
              <dd>
                La règle est précise : on l&apos;applique à ton profil avec les barèmes officiels (OpenFisca, le moteur open source des
                règles fiscales et sociales). L&apos;année des règles de référence est écrite sur chaque fiche.
              </dd>
            </div>
            <div>
              <dt>≈ Estimé</dt>
              <dd>
                Le montant dépend d&apos;une hypothèse, par exemple une consommation moyenne. L&apos;hypothèse et sa source sont écrites
                dans la fiche « d&apos;où vient ce chiffre » de la ligne.
              </dd>
            </div>
            <div>
              <dt>Qualitatif</dt>
              <dd>Pas de montant possible : une phrase factuelle à la place.</dd>
            </div>
          </dl>
          <p className={styles.note}>
            On compare toujours aux règles actuelles, une fois toutes les mesures appliquées. Le sûr et l&apos;estimé ne sont jamais
            additionnés sans le dire : c&apos;est pourquoi le solde est une fourchette, avec la part certaine à côté.
          </p>
          <p className={styles.note}>Sur les pages des programmes, chaque mesure porte aussi sa nature :</p>
          <ul className={styles.natures}>
            <li>
              <i className={styles.swatch} data-nature="chiffree" /> <b>Chiffrée</b> : au moins un effet calculé sur ton profil.
            </li>
            <li>
              <i className={styles.swatch} data-nature="qualitative" /> <b>Qualitative</b> : une règle sans montant calculable.
            </li>
            <li>
              <i className={styles.swatch} data-nature="floue" /> <b>Floue</b> : le programme ne donne pas assez de précision.
            </li>
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="ia">
          <h2 id="ia">3. Le rôle de l&apos;IA</h2>
          <p>
            Une IA lit les programmes et en extrait les mesures. Elle ne calcule aucun chiffre et ne répond à aucune question.
            {checks.length > 0 ? ` Chaque mesure publiée a passé ${plural(checks.length, "contrôle automatique", "contrôles automatiques")} :` : null}
          </p>
          {checks.length > 0 ? (
            <ol className={styles.checks}>
              {checks.map((id) => (
                <li key={id}>{CHECK_LABELS[id]}</li>
              ))}
            </ol>
          ) : null}
          <p>
            Si un contrôle échoue, la mesure n&apos;est pas publiée : elle est écartée (citation introuvable, fiche incomplète) ou mise
            en attente de vérification humaine.
          </p>

          {errorRate ? (
            <div className={styles.rate}>
              <span>
                Taux d&apos;erreur mesuré sur {plural(errorRate.n, "mesure tirée", "mesures tirées")} au sort et relues contre leurs
                citations
                <small>
                  Intervalle de confiance à 95 % : {formatPercent(errorRate.low)} – {formatPercent(errorRate.high)}
                </small>
              </span>
              <strong>{formatPercent(errorRate.k / errorRate.n)}</strong>
            </div>
          ) : null}

          {quality.length > 0 ? (
            <Shuffled className={styles.quality}>
              {quality.map(({ programme: p, summary: s, currentVersion }) => (
                <li key={p.slug}>
                  <b>
                    {p.candidate.displayName} · {p.candidate.party}
                  </b>
                  {s ? (
                    <>
                      <span>
                        Bilan du {formatDate(`${s.readOn}T12:00:00Z`)}
                        {currentVersion ? "" : ", sur une version précédente du programme"}.
                      </span>
                      <ul>
                        <li>
                          Erreurs : {s.errorFree.n - s.errorFree.k} sur {plural(s.errorFree.n, "mesure tirée", "mesures tirées")} au
                          sort ({formatPercent((s.errorFree.n - s.errorFree.k) / s.errorFree.n)}).
                        </li>
                        <li>
                          Sens fidèle à la citation : {s.precision.k} sur {s.precision.n} ({formatPercent(s.precision.k / s.precision.n)}).
                        </li>
                        {s.parameters ? (
                          <li>
                            Taux, montants et dates justes : {s.parameters.k} sur {plural(s.parameters.n, "mesure chiffrée", "mesures chiffrées")}{" "}
                            ({formatPercent(s.parameters.k / s.parameters.n)}).
                          </li>
                        ) : null}
                        <li>
                          Engagements retrouvés : {s.recall.k} sur {s.recall.n} relevés sur {plural(s.recall.pages, "page tirée", "pages tirées")}{" "}
                          au sort ({formatPercent(s.recall.k / s.recall.n)}).
                        </li>
                      </ul>
                      {s.discrepancies.length > 0 ? (
                        <details>
                          <summary>Écarts relevés ({s.discrepancies.length})</summary>
                          <ul>
                            {s.discrepancies.map((d) => (
                              <li key={d.measureId}>
                                {p.measures.some((m) => m.id === d.measureId) ? (
                                  <Link href={`/programme/${p.slug}/${d.measureId}`}>Mesure {d.measureId}</Link>
                                ) : (
                                  <>Mesure {d.measureId}</>
                                )}{" "}
                                : {d.note ?? (d.sens === "incorrect" ? "sens incorrect" : "paramètres faux")}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </>
                  ) : (
                    <span>Bilan pas encore fait pour ce programme.</span>
                  )}
                </li>
              ))}
            </Shuffled>
          ) : null}
          <p className={styles.note}>
            Limite : ce bilan est fait par une IA, le même modèle que celui qui extrait les mesures, et non par un humain. Une erreur
            qui lui échappe à l&apos;extraction peut lui échapper aussi à la relecture. Le bilan est refait pour chaque nouveau
            programme.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="neutralite">
          <h2 id="neutralite">4. Neutralité</h2>
          <p>
            Même traitement, même gabarit et mêmes contrôles pour tous les candidats. L&apos;ordre d&apos;affichage est tiré au hasard à
            chaque visite ; la forme qui accompagne chaque nom a été tirée au sort une fois pour toutes. Pas de couleurs ni de logos de parti, pas de classement, pas
            de « meilleur programme pour toi ». Le nom complet du candidat et celui de son parti sont toujours écrits.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="donnees">
          <h2 id="donnees">5. Tes données</h2>
          <p>
            Pas de compte. Ton profil est envoyé pour le calcul puis oublié : rien n&apos;est enregistré sur nos serveurs. Le calcul
            porte toujours sur tous les programmes, pour que le serveur ne sache pas lesquels tu as choisis. Ta progression est gardée
            sur ton appareil pour que tu puisses reprendre, et tu peux l&apos;effacer à tout moment.
          </p>
          <p>
            Un lien de partage contient ton ticket, et ta ligne de profil seulement si tu choisis de l&apos;y mettre : toute personne
            qui a le lien peut les voir.
          </p>
          <ForgetJourney className={styles.secondary} />
        </section>

        <section className={styles.section} aria-labelledby="limites">
          <h2 id="limites">6. Nos limites</h2>
          <p>
            Une simulation n&apos;est pas une prévision. Elle ne tient pas compte des changements de comportement, de la conjoncture ni
            de ce qui serait vraiment voté au Parlement. Des erreurs restent possibles : chacune peut être signalée et corrigée.
          </p>
        </section>

        <div className={styles.actions}>
          <Link href="/signaler" className={styles.primary}>
            Signaler une erreur
          </Link>
          <a href={SOURCE_URL} className={styles.secondary}>
            Voir le code source
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
