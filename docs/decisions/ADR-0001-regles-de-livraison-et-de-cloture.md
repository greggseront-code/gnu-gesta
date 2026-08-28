# ADR-0001 — Règles de livraison et de clôture

Statut : acceptée.

Date : 2026-08-28.

## Contexte

La feature « gestion des stages et des conventions » a été livrée en un commit
unique, avec une suite de tests verte et des documents de clôture affirmant
qu'aucun critère n'avait été abandonné. Une relecture indépendante y a relevé
vingt-deux défauts, dont deux de conception reproductibles et deux lacunes de
couverture portant sur des critères d'acceptation explicites. L'implémentation a
été annulée.

Une introspection du processus a montré que ces défauts n'étaient pas
indépendants : ils venaient d'une validation par parcours nominal, d'un
correctif tardif promu en règle métier, d'une confusion entre présence d'un
mécanisme et preuve de son contrat, et d'une clôture pilotée par des tâches trop
larges.

## Décision

Cinq règles minimales entrent dans `AGENTS.md`, section « Livrer et clôturer ».
Elles y sont écrites sous forme d'ordres, sans justification, parce que ce
fichier est chargé à chaque session. Le présent document porte leurs raisons.

## Raisons, règle par règle

**Une tranche vérifiable par commit.** Le commit annulé touchait 56 fichiers
pour 5343 lignes : schéma, deux features existantes, une feature neuve, le
frontend, un script d'un autre langage et un artefact binaire. Aucune relecture
humaine ne tient à cette taille, et l'auteur lui-même y perd la trace de ce
qu'il a vérifié. C'est la cause structurelle la plus probable de la dispersion
des autres défauts.

**Trois tests par feature.** Ils remplacent une matrice de traçabilité tenue à
la main, parce qu'ils sont copiables d'une feature à l'autre et qu'ils échouent
tout seuls :

* les refus par rôle, parce que l'absence d'un bouton avait été prise pour une
  preuve d'autorisation, alors qu'aucune mutation n'était testée en lecteur ;
* les contraintes réellement déclenchées, parce que la traduction d'une
  violation d'unicité avait été écrite d'après une hypothèse sur le texte de
  l'erreur SQLite ; l'erreur réelle ne contient pas le nom d'index recherché, et
  aucun test ne passait par ce chemin ;
* l'idempotence, parce qu'un enregistrement sans modification détruisait la
  convention déjà générée, et qu'un test consacrait ce comportement.

**Une découverte en E2E rouvre la conception.** Le rattachement d'un dossier non
daté à l'éligibilité la plus récente a été improvisé en fin de chantier pour
réparer un écran, sans réexaminer la règle. Il en résulte qu'un dossier
disparaît de l'année en cours dès qu'une éligibilité plus récente est importée.
Un patch de clôture doit redevenir un changement de conception : nouveau cas
consigné, invariant choisi, test de régression, source documentaire mise à jour.

**L'hygiène est outillée.** Six des vingt-deux défauts étaient mécaniquement
détectables : répertoire de documents non ignoré par Git, exports morts, tests
écrivant dans l'arborescence du dépôt, fichiers système versionnés. Demander la
vigilance ne les évitera pas ; un contrôle qui échoue seul, si.

**Une clôture falsifiable.** La review de clôture annonçait une couverture des
permissions qui n'existait pas et « aucun travail restant ». Distinguer
explicitement ce qui est couvert par un test nommé, vérifié à la main, ou
seulement implémenté rend cette sur-annonce impossible sans mensonge visible.

## Alternatives écartées

**Les matrices et gates détaillés** proposés par l'introspection — traçabilité
critère par critère, espace d'états, contrat par feature propriétaire,
préconditions par transition, sept passes de clôture. Le raisonnement est juste,
mais sur un projet mené par une personne assistée d'agents, ce volume ne
survivrait pas à la deuxième feature, et une matrice remplie après coup
redeviendrait le faux signal qu'elle prétend corriger.

**La discipline mémorisée** pour l'hygiène : déjà tentée implicitement, déjà
prise en défaut.

**La relecture adverse systématique avant clôture** reste recommandée et s'est
montrée efficace — c'est elle qui a produit la revue — mais à l'échelle d'une
feature, pas d'un commit. Elle n'entre pas dans `AGENTS.md` pour ne pas
transformer une pratique ponctuelle en obligation permanente.

## Conséquences

* Les chantiers se livrent en plusieurs commits ; l'historique en portera plus.
* Trois gabarits de test sont à écrire une fois puis à reprendre ; leur absence
  devient un motif de non-clôture.
* Un contrôle d'hygiène automatisé reste à mettre en place ; tant qu'il n'existe
  pas, la règle correspondante repose sur la vigilance, donc échouera.
* Le modèle de review de clôture doit refléter les trois listes.

## Références

* `docs/history/reviews/2026-08-28-gestion-stages-conventions-quality-review.md`
* `docs/history/reviews/codex-process-introspection.md`
* `docs/work/active/gestion-stages-conventions/spec.md`
