import type { Metadata } from "next";
import Link from "next/link";
import { ForgetJourney } from "@/components/ForgetJourney";
import { SiteFooter } from "@/components/SiteFooter";
import { dataDir } from "@/lib/data";
import { assertPublishable, loadLegalInfo } from "@/lib/legal";
import { SOURCE_URL } from "@/lib/site";
import styles from "@/components/text-page.module.css";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Éditeur, hébergement, données personnelles, cookies, sources et licences.",
};

export default function MentionsLegalesPage() {
  const info = loadLegalInfo(dataDir());
  assertPublishable(info);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <nav className={styles.top}>
          <Link href="/" className={styles.home}>
            Mon quinquennat
          </Link>
        </nav>
        <h1 className={styles.title}>Mentions légales</h1>

        {info.editeur ? (
          <section className={styles.section} aria-labelledby="editeur">
            <h2 id="editeur">Éditeur</h2>
            <p>
              {info.editeur.nom}
              <br />
              Contact : {info.editeur.contact}
              {info.editeur.directeurPublication ? (
                <>
                  <br />
                  Directeur ou directrice de la publication : {info.editeur.directeurPublication}
                </>
              ) : null}
            </p>
          </section>
        ) : null}

        {info.hebergeurs.length > 0 ? (
          <section className={styles.section} aria-labelledby="hebergement">
            <h2 id="hebergement">Hébergement</h2>
            {info.hebergeurs.map((h) => (
              <p key={`${h.role}-${h.nom}`}>
                <b>{h.role}</b> : {h.nom}, {h.adresse}
                {h.telephone ? `, ${h.telephone}` : ""} (<a href={h.source}>mentions de l&apos;hébergeur</a>)
              </p>
            ))}
          </section>
        ) : null}

        <section className={styles.section} aria-labelledby="donnees">
          <h2 id="donnees">Données personnelles</h2>
          <p>
            Le site n&apos;a pas de compte et ne garde aucune donnée personnelle sur ses serveurs. Ton profil est envoyé au serveur du
            site, qui le transmet au service de calcul et renvoie les résultats de tous les programmes : il n&apos;est ni enregistré
            ni écrit dans un journal. Le code postal que tu saisis pour trouver ta commune ne quitte pas ton navigateur.
          </p>
          <p>
            Ta progression (profil, choix, résultats) est gardée dans le stockage local de ton navigateur, sur ton appareil seulement,
            pour que tu puisses reprendre. Tu peux l&apos;effacer à tout moment depuis l&apos;accueil, ou ci-dessous
            si une partie est gardée sur cet appareil.
          </p>
          <ForgetJourney className={styles.secondary} />
          <p>
            Un lien de partage contient ton ticket, et ta ligne de profil seulement si tu choisis de l&apos;y mettre : toute personne
            qui a le lien peut les voir. Un signalement d&apos;erreur est publié dans le suivi public du projet, sur GitHub.
          </p>
          <p>
            Les hébergeurs peuvent conserver des journaux techniques de connexion (adresse IP, page demandée, date) pour la sécurité
            de leurs services. Ces journaux ne contiennent pas ton profil.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="cookies">
          <h2 id="cookies">Cookies</h2>
          <p>Le site ne dépose aucun cookie.</p>
        </section>

        <section className={styles.section} aria-labelledby="contenus">
          <h2 id="contenus">Contenus</h2>
          <p>
            Les mesures sont tirées des programmes officiels des candidats. Les extraits reproduits sont de courtes citations, au sens
            de l&apos;article L122-5 du code de la propriété intellectuelle, chacune avec sa source et un lien vers l&apos;original.
          </p>
          <p>
            Ce site n&apos;est pas un sondage et n&apos;en publie aucun. Il ne classe pas les candidats et ne donne aucune consigne de
            vote. Une simulation n&apos;est pas une prévision : voir la <Link href="/methode">méthode</Link> et ses limites.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="licences">
          <h2 id="licences">Logiciels et données réutilisés</h2>
          <ul className={styles.checks}>
            <li>OpenFisca-France, moteur des règles fiscales et sociales (licence GNU AGPL v3).</li>
            <li>Codes postaux et communes : paquet codes-postaux de la Base Adresse Nationale (licence MIT).</li>
            <li>Polices Bricolage Grotesque, DM Sans et DM Mono (SIL Open Font License 1.1).</li>
            <li>Next.js (licence MIT).</li>
          </ul>
          <p>
            Le code du site est public : <a href={SOURCE_URL}>voir le code source</a>.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
