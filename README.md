# Mon quinquennat

**Vis ton quinquennat 2027–2032 selon les programmes officiels des candidats à la présidentielle.**

Tu crées ton personnage (âge, famille, travail, logement…), tu choisis jusqu'à trois candidats, et tu traverses cinq années mois par mois. À la fin, un ticket de caisse « Ma vie en 2032 » montre ce qui change pour toi : ton portefeuille, ton temps, ta vie. Chaque ligne renvoie à la phrase exacte du programme qui la justifie.

> Projet en construction. Lancement visé avant le 1er tour de l'élection présidentielle 2027.

## Ce qui le distingue
- **Sourcé jusqu'à la phrase.** Une mesure n'apparaît que si elle cite mot pour mot un programme officiel, archivé et horodaté.
- **Calculé, pas deviné.** Les montants viennent d'[OpenFisca](https://openfisca.org), le moteur de calcul open source de la législation française, ou de formules publiques. L'IA lit les programmes ; elle ne calcule jamais.
- **Neutre.** Même traitement pour tous les candidats, ordre tiré au sort, aucune couleur de parti.
- **Privé.** Ton profil ne quitte pas ton navigateur. Le serveur calcule tous les candidats à chaque fois et ne sait pas lesquels tu as choisis.
- **Automatisé et vérifiable.** Les programmes sont surveillés chaque semaine ; chaque mesure passe six contrôles automatiques, et le taux d'erreur mesuré est publié sur la page Méthode.

## Comment ça marche
```
programme officiel ──► archive + empreinte ──► extraction IA ──► 6 contrôles ──► publication
                                                                      │
                                                                      └─► doute → file d'exceptions
profil (navigateur) ──► API sans état ──► OpenFisca / formules ──► ticket
```

Détails : [`docs/cadrage.md`](docs/cadrage.md).

## Développement
Prérequis : Node 22 (`.nvmrc`), Python 3.11+ pour la partie calcul.

```bash
npm install
npm run typecheck
npm test
```

Étape en cours : [tests de faisabilité](docs/faisabilite.md).

## Signaler une erreur
Une mesure mal comprise, un chiffre faux ? Ouvre une issue avec le lien de la fiche concernée. Chaque correction devient un cas de test.

## Licence
À définir.
