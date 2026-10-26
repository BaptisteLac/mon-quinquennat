# Journal des décisions

Ce qui a été tranché pendant la conception, pour ne pas le rediscuter. Les idées **écartées** ne doivent pas être reproposées sans élément nouveau.
Toute nouvelle décision s'ajoute ici (date, décision, raison).

## Produit
- **Nom : « Mon quinquennat ».** Le ticket final s'appelle « Ma vie en 2032 ». (L'ancien nom de travail « Ma vie en 2028 » est abandonné.)
- **Concept** : simulation vécue mois par mois façon frise (inspiration : expérience narrative à la « 1 sur 8 milliards »), pas un questionnaire.
- **Choix des candidats** : jusqu'à 3 + option « mystère » (programme tiré au sort, ticket à gratter, révélé **avant** le comparatif).
- **Récap style « Wrapped »** : intro → tickets → mystère → coup d'œil → thèmes → certitude → fin.
- **Reprise** : progression sauvegardée dans le navigateur.
- **Duel d'entre-deux-tours** prévu dans le MVP.
- **Questions du profil** : âge, genre, famille, enfants, travail, revenus, logement, lieu de vie, mobilité, puis questions conditionnelles ; étape « Affiner » facultative limitée à handicap/aidant et patrimoine.
- **Genre** : demandé, sert à l'avatar ; n'entre dans un calcul que si une mesure en dépend explicitement.
- **Hypothèse** : l'utilisateur est un électeur français (pas de question de nationalité).
- **Ticket** : sections portefeuille / temps / vie ; fourchette + « dont certain » ; comparé aux règles actuelles ; horizon « une fois tout appliqué » + cumul 5 ans ; financement visible (ex. hausse de TVA).
- **Candidats retenus** : déclarés **et** avec un programme publié. Les marchés de prédiction ne servent que de liste de veille.
- **V1, pas MVP** : « ticket de la France » (dette, coût, plusieurs chiffrages), scénarios « Et si… ».

## Données et automatisation
- **Seule source des mesures : les programmes officiels des candidats.** Pas de collecte sur le reste du web.
- **Le programme fait foi** (2026-10-24). Sur le site officiel, le programme (pages programme et documents qu'elles publient : livrets, carnets, discours) prime sur les autres pages (questions-réponses, prises de position). Celles-ci peuvent préciser ou compléter une mesure, jamais la contredire : en cas d'écart, on garde la version du programme et on retire l'élément contradictoire. Si le programme ne tranche pas et que les autres pages se contredisent, on publie seulement ce qu'elles ont en commun, sans préciser le point contesté (2026-10-24).
- **Questions de profil pour le calcul** (2026-10-26) : loyer hors charges (locataire) ; commune, choisie à partir du code postal (code INSEE, zone des aides au logement) ; année de naissance de chaque enfant, au lieu d'une tranche d'âge ; pour un micro-entrepreneur, chiffre d'affaires annuel et type d'activité ; situation professionnelle du conjoint. Sans réponse, le montant n'est pas calculé ou devient estimé (≈), avec l'hypothèse affichée. La maquette « Enfants à charge » (boutons de tranche) est à adapter.
- **Mesures publiées en JSON statique** (2026-10-26), livrées avec le site, plutôt que lues dans une base de données. Postgres reste possible plus tard si le volume l'exige.
- **Archives brutes dans Supabase Storage** (2026-10-26) ; texte extrait, manifeste et extractions restent dans Git.
- **Leviers de réforme** (2026-10-26) : une mesure ne modifie la législation qu'à travers une liste fermée de leviers nommés en clair (`ReformLever`), traduits en paramètres OpenFisca par le service de calcul, conversions d'unité comprises. Le ticket compare « une fois tout appliqué » : la réforme s'applique sur toutes les années du calcul, la date d'effet sert à la frise.
- **Archive immuable** (2026-10-24) : un corpus archivé puis exploité n'est jamais recollecté ni réécrit ; une nouvelle collecte prend un nouvel identifiant (`<parti>-<aaaa-mm>[-n]`). La veille compare la nouvelle collecte à l'ancienne.
- **Aucune validation manuelle par défaut.** Six contrôles automatiques ; l'humain ne traite que la file d'exceptions (issues GitHub, commandes `/approuver`, `/rejeter`, `/corriger`).
- **Le LLM ne calcule jamais** : OpenFisca, formules sur liste blanche, estimations INSEE marquées ≈.
- **Taux d'erreur mesuré** par audit d'échantillon, publié sur la page Méthode.
- **Confidentialité** : API sans état qui calcule tous les candidats ; profil dans le navigateur ; mesure d'audience sans cookie.

- **Programme en cours de réécriture (2026-10-26)** : quand le site officiel annonce une nouvelle version (cas de Jean-Luc Mélenchon : « L'Avenir en commun est en cours de réactualisation », version 2027 présentée les 6 et 7 novembre), on archive l'état actuel sans l'extraire, et la veille compare les collectes suivantes à cette archive. L'extraction se fait une fois, sur la version publiée. Raison : ne pas publier de mesures d'une version que la campagne a déclarée obsolète.
- **Périmètre d'un programme (2026-10-26)** : documents publiés par la campagne pour l'élection de 2027 (programme, plans thématiques, documents de chiffrage). Un document d'une autre élection lié depuis le site (ex. programme du Nouveau Front populaire de 2024) n'en fait pas partie.

- **Référence pour l'impôt sur le revenu (2026-10-26)** : le code de calcul publié par la DGFiP (sources M), exécuté par Mlang dans GitHub Actions, sur la dernière année de revenus publiée et exécutable (2023 aujourd'hui). Raison : le simulateur d'impots.gouv.fr n'est pas joignable depuis GitHub Actions, et aucune saisie manuelle. Le contrôle se relance sans intervention quand une nouvelle année est publiée.

- **Pas de question « pension alimentaire » (2026-10-26)** : le profil ne la demande pas ; le calcul d'un parent isolé suppose qu'aucune pension n'est reçue (allocation de soutien familial versée), et cette hypothèse est écrite dans la fiche « d'où vient ce chiffre » (≈ 215 €/mois d'effet sur la prime d'activité d'un parent de deux enfants, `calc/FAISABILITE.md`).
- **Un engagement chiffré s'applique tel qu'il est écrit, pour tous les candidats (2026-10-26)** : le montant cité est appliqué littéralement, même s'il produit une baisse par rapport au droit actuel (ex. minimum vieillesse « à hauteur de 1000 euros par mois », sous les 12 523,14 € par an en vigueur), sans revalorisation ni correction supposée. La fiche du chiffre indique le montant actuel et l'hypothèse. Raison : le simulateur doit être le plus réaliste possible, et la même règle vaut pour chaque programme. Un écart avec le droit actuel n'est pas un motif de mise en file d'exceptions.

- **Hébergement du service de calcul : éteint au repos, réveillé pendant la création du personnage (2026-10-26)** : conteneur serverless (Scaleway Serverless Containers à Paris, hébergeur et données en France) avec 0 instance minimale. Le front appelle `/sante` dès le début de la création du personnage, pour que le démarrage (≈ 13 s mesurées en local) soit fini quand la frise demande les montants. Coût : 0 € dans le quota gratuit (≈ 100 000 calculs par mois), ≈ 2,2 € par 100 000 calculs au-delà. Raison : pas de dépense tant que le trafic ne la justifie pas. Une instance toujours allumée (≈ 28 € HT/mois) ne sera envisagée que si le trafic l'exige (ex. dernières semaines de campagne). Temps de réveil réel à mesurer au déploiement.

- **Bilan du test n°1 sans saisie manuelle (2026-10-26)** : rappel mesuré par une lecture indépendante de pages tirées au sort (engagements relevés avant de voir les mesures), précision et paramètres par la relecture d'un échantillon de mesures tiré au sort, coût estimé sur les volumes réels (`npm run evaluate`, `data/evaluations/`). Limite assumée et affichée sur la page Méthode : le bilan est fait par le même modèle que l'extraction. Le bilan est refait pour chaque nouveau programme.
- **Date d'une mesure annoncée pour l'entrée en fonction (2026-10-26)** : « le premier jour », « dès son arrivée au pouvoir » → début du mandat (14 mai 2027, le mandat en cours s'achevant le 13 mai 2027), date estimée ; le contrôle `chiffres_fideles` bloque la date par défaut dans ce cas.

- **Feu vert des deux tests de faisabilité (2026-10-26)** : test n°1 avec réserve (paramètres justes 92,9 % sur 14 mesures chiffrées, cause corrigée ; bilan refait sur le programme suivant), test n°2 sur ses quatre critères. `apps/web` peut commencer.

- **Plan de construction du site (2026-10-26)** : `docs/plan.md`, jalons 0 à 6, tranche verticale (personnage → candidats → frise → ticket) avant les écrans secondaires.
- **Socle du site (2026-10-26)** : Next.js 16 (Turbopack), pages statiques générées au build à partir des JSON publiés, validés par Zod (une donnée invalide fait échouer le build). Le paquet `schema` importe ses fichiers avec l'extension `.ts` (`allowImportingTsExtensions`, tous les paquets sont en `noEmit`) : Turbopack ne sait pas résoudre `./x.js` vers `./x.ts`.
- **Polices auto-hébergées (2026-10-26)** : Bricolage Grotesque, DM Sans et DM Mono servies par le site (`@fontsource`), aucun appel à Google Fonts depuis le navigateur du visiteur.
- **Badges de forme (2026-10-26)** : tirés au sort une seule fois par candidat (générateur cryptographique, formes libres seulement), écrits dans `data/badges.json` et jamais modifiés ensuite. Le tirage est fait par le workflow de collecte quand un candidat entre dans l'outil ; le build échoue si un candidat publié n'a pas de badge.
- **Nature d'une mesure (2026-10-26)**, même vocabulaire sur tous les écrans : **Chiffrée** (motif plein, au moins un effet calculé : barème, formule ou estimation), **Qualitative** (motif hachuré, règle sans montant calculable), **Floue** (pointillés, `precision: floue`), suivie de la voie juridique quand elle est connue (« Chiffrée · loi de finances »). La légende « Loi à voter » de la maquette `R6-certitude` devient « Qualitatives ».
- **Pas d'emplacement fictif à l'écran (2026-10-26)** : une donnée absente masque son bloc (compte à rebours du 1er tour tant que la date n'est pas fixée par décret, compteur de quinquennats vécus tant qu'il n'existe pas), un lien vers un écran pas encore construit n'est pas affiché (« Copie archivée », « Historique », pages Méthode et Mentions légales).

- **Parcours dans le navigateur (2026-10-26)** : brouillon de profil, choix des programmes et versions des programmes vues gardés dans le stockage local (`apps/web/src/lib/journey.ts`, schéma Zod versionné). Une réponse devenue sans objet est retirée (loyer d'un propriétaire, revenus du conjoint d'une personne seule…). On ne peut pas sauter une étape incomplète.
- **Questions sans maquette (2026-10-26)**, dans le style des écrans validés : à l'étape « Toi », sous « Ta situation », entreprise (statut, salariés ; chiffre d'affaires et activité pour une micro-entreprise), allocation chômage, bourse, et pour un actif de 50 ans et plus âge de départ prévu et âge du premier emploi (facultatifs) ; à l'étape « Ta vie », pension pour un retraité, revenus et situation du conjoint pour les deux formes de couple, loyer hors charges (facultatif) et commune (facultative). L'année de naissance des enfants se choisit dans une liste (adaptation de la maquette `Main`).
- **Commune par code postal sans service tiers (2026-10-26)** : fichier des codes postaux d'Etalab (paquet npm `codes-postaux`, issu du Code officiel géographique de l'INSEE), découpé au build en fichiers statiques par département et servi par le site. Le code postal saisi ne quitte pas le navigateur.
- **Réveil du calcul par le serveur du site (2026-10-26)** : le navigateur appelle `/api/sante` sans aucune donnée ; c'est le serveur du site qui joint le service de calcul (`CALC_URL`). Le visiteur ne se connecte jamais directement au service.
- **Avatars neutres (2026-10-26)** : `DA-retenue` n'en dessine qu'un ; les tranches 18–24, 45–64 et 65+ en sont des variantes (même visage ; capuche, cheveux grisonnants, cheveux blancs et lunettes).
- **« Rien n'est enregistré sur nos serveurs »** remplace « Rien n'est enregistré » (maquette `Main`) : la progression est gardée sur l'appareil, ce que dit l'écran de reprise.
- **« Vivre la vie d'un Français tiré au hasard » (maquette `Main`) n'est pas affiché** tant que le tirage ne s'appuie pas sur une distribution publique sourcée (INSEE) : pas de profil inventé.

- **Service de calcul `calc/` (2026-10-26)** : le test n°2 devient le service. Au démarrage, il lit les mesures publiées (`data/measures`) au lieu d'un fichier de réformes généré ; son image embarque les mesures du même commit que le site. `/calcul` renvoie la version (corpus) de chaque programme : si elle diffère de celle du site, `/api/ticket` répond « mise à jour en cours » plutôt que de mélanger deux versions.
- **Déploiement du calcul automatisé (2026-10-26)** : le workflow `calc-image.yml` construit l'image, vérifie qu'elle démarre, calcule et ne journalise pas les requêtes ; sur `main`, il la publie et la déploie sur Scaleway dès que la clé et l'identifiant du conteneur sont dans les réglages GitHub (`calc/README.md`). Seule étape manuelle : créer le compte, le registre, le conteneur et la clé une fois.
- **Lignes du ticket (2026-10-26)** : une ligne du portefeuille est l'écart, pour le profil, d'un montant calculé par OpenFisca entre les règles actuelles et celles du candidat (impôt sur le revenu, prime d'activité, aides au logement, allocations familiales, minimum vieillesse), rattachée aux mesures dont les leviers touchent ce montant ; un écart de moins de 0,50 €/mois n'est pas une ligne. Le cumul sur le mandat part de la date d'effet la plus tardive de ces mesures (mois entiers jusqu'au 14 mai 2032). L'âge de départ est donné en années (formule `retraite_age_depart`). Les effets qualitatifs sont regroupés par ligne quand leur condition est vraie pour le profil. Un montant non calculable (loyer manquant) ou une formule pas encore écrite est listé avec son motif (`uncomputed`), jamais remplacé par un chiffre approché.
- **Tests du ticket sur des réponses réelles (2026-10-26)** : les jeux d'essai du site sont des réponses enregistrées du vrai service de calcul pour les profils de référence (`calc/scripts/record_web_fixtures.py`) ; aucun montant n'est écrit à la main.

## Design
- Interface Pop BD, illustrations sticker à peau jaune unique — voir `docs/design-system.md`.
- Avatar petit, par tranche d'âge × genre, bustes uniquement.

## Écarté (ne pas reproposer)
- Vote ou choix « à l'aveugle » des programmes : déjà fait ailleurs.
- Questionnaire de positionnement classique : déjà fait ailleurs.
- Ligne « carburant » sur le ticket : chiffre non fondé.
- Gestion des non-votants ; question de nationalité.
- Couleurs ou logos de partis ; caricatures.
- Fauteuil roulant, avatars en pied, âges détaillés : bustes et tranches d'âge seulement.
- Bouton « changer de look ».
- Validation manuelle de chaque mesure dans un back-office.
- Variantes de maquettes B, C, D et « fusion » : seules les versions A sont retenues.

## Proposé, à valider
- **Hébergement du site** : Vercel, offre gratuite (Next.js et images OG natifs, aperçu de chaque PR). À confirmer au jalon 6 avec les conditions d'usage de l'offre gratuite.
- **Collecte web des programmes** (les partis publient des sites à onglets, pas de PDF) : robot Playwright limité au domaine officiel, clic sur les onglets, extraction du texte avec ses titres, archivage par page (HTML, texte, capture, sha256, Internet Archive), diff par section.
- **Citation localisée par page web + chemin de section** au lieu d'un numéro de page PDF ; lien vers le site officiel avec la phrase surlignée (`#:~:text=`).
- **Contrôle des chiffres** : tout nombre d'une mesure doit figurer dans sa citation, sinon la mesure est `floue`.
