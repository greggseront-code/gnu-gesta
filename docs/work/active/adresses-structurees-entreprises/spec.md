# Adresses structurées des entreprises belges et étrangères

Statut : proposition non engagée et non implémentée. Le contexte minimal et les
lectures autorisées sont dans le `README.md` voisin.

## Contexte

Une entreprise possède actuellement une adresse optionnelle stockée dans le
champ texte libre `companies.address`. Ce champ ne permet pas de vérifier que
les éléments minimaux d'une adresse belge sont présents ni que le code postal
correspond à la localité indiquée.

Le même champ est utilisé dans les trois parcours de saisie existants :

* création d'une entreprise par le gestionnaire ;
* suggestion d'une nouvelle entreprise par un étudiant ;
* modification de sa fiche par une entreprise, ainsi que correction par le
  gestionnaire.

L'application doit désormais distinguer les adresses belges des adresses
étrangères. Pour une adresse belge, elle doit guider la saisie à partir du code
postal et du référentiel officiel des localités postales de bpost. Pour une
adresse étrangère, elle doit permettre une saisie internationale standard sans
tenter de déduire la ville à partir du code postal.

L'application n'est pas en production et la base SQLite utilisée pendant les
tests sera détruite puis reconstruite. Cette évolution remplace donc directement
le modèle existant et ne prévoit aucune migration ni conservation du champ
`companies.address`.

## Objectif

Garantir une adresse structurée et exploitable pour chaque nouvelle entreprise,
avec contrôle du couple code postal/localité en Belgique et saisie adaptée pour
tous les autres pays.

## Périmètre

Inclus :

* adresse obligatoire pour toute entreprise créée dans le nouveau schéma ;
* pays présélectionné sur « Belgique » dans les formulaires ;
* liste de tous les pays et territoires actuellement définis par ISO 3166-1,
  identifiés par leur code alpha-2 et affichés avec un libellé français ;
* référentiel local des codes postaux et localités postales belges provenant de
  la liste officielle publiée par bpost ;
* saisie belge séparant rue, numéro, boîte éventuelle, code postal et localité ;
* recherche des localités belges à partir d'un code postal à quatre chiffres ;
* saisie internationale avec lignes d'adresse, ville, code postal éventuel et
  région éventuelle ;
* validations frontend pour guider l'utilisateur et validations backend faisant
  autorité ;
* stockage structuré en base de données ;
* remplacement du contrat API reposant sur une chaîne `address` par un objet
  d'adresse structuré ;
* adaptation de l'unicité du couple nom/adresse d'une entreprise ;
* affichage formaté de l'adresse dans les listes, détails, écrans de modération
  et espaces entreprise ;
* adaptation des données fictives et des tests à une base reconstruite.

Exclus :

* migration, analyse ou conservation des anciennes valeurs de
  `companies.address` ;
* compatibilité temporaire avec l'ancien contrat API ;
* appel à bpost ou à un autre service externe pendant la saisie ;
* validation de l'existence réelle d'une rue ou d'un numéro de bâtiment ;
* autocomplétion des noms de rue ;
* géocodage, coordonnées GPS ou affichage cartographique ;
* déduction automatique de la ville à partir d'un code postal étranger ;
* validation des formats postaux propres à chaque pays étranger ;
* normalisation postale internationale complète ;
* mise à jour automatique à distance des référentiels après le déploiement.

## Comportement attendu

### Sélection du pays

* Chaque formulaire d'entreprise commence par un sélecteur de pays obligatoire.
* « Belgique » est sélectionnée par défaut.
* La Belgique apparaît en tête de liste, puis les autres pays sont triés par
  libellé français.
* Le sélecteur permet de rechercher un pays par son libellé afin de ne pas
  imposer le parcours d'une longue liste.
* Le code ISO alpha-2 est la valeur métier échangée avec le backend. Le libellé
  français est une valeur de présentation.
* Un changement de pays remplace le groupe de champs d'adresse affiché. Les
  valeurs devenues incompatibles sont effacées après confirmation si
  l'utilisateur avait déjà commencé à les saisir.

### Adresse belge

Lorsque le pays sélectionné est la Belgique, le formulaire présente :

* « Rue », obligatoire ;
* « Numéro », obligatoire et stocké comme texte ;
* « Boîte / complément », facultatif ;
* « Code postal », obligatoire et limité à quatre chiffres ;
* « Localité », obligatoire et sélectionnée dans le référentiel officiel.

Le numéro est un texte et non un entier afin d'accepter des valeurs légitimes
telles que `12A` ou `14-16`.

Comportement du code postal et de la localité :

* aucune recherche n'est lancée et aucune erreur « code inconnu » n'est affichée
  tant que quatre chiffres n'ont pas été saisis ;
* après la saisie de quatre chiffres, le frontend demande au backend les
  localités postales correspondantes ;
* si le code postal est inconnu, le formulaire affiche une erreur et ne peut pas
  être soumis ;
* si une seule localité correspond, elle est sélectionnée automatiquement ;
* si plusieurs localités correspondent, elles sont proposées dans un sélecteur
  et l'utilisateur doit en choisir une ;
* si le code postal change, la localité précédemment choisie est immédiatement
  effacée ;
* le formulaire n'accepte jamais une localité belge saisie librement ;
* la mutation transmet l'identifiant de la localité postale sélectionnée. Le
  backend en déduit le code postal et le libellé, ce qui empêche toute
  combinaison incohérente.

Dans cette spec, le mot « localité » désigne une localité postale du référentiel
bpost et non nécessairement une commune administrative. Un même code postal
peut proposer plusieurs localités et le modèle doit conserver cette relation
un-à-plusieurs.

### Adresse étrangère

Lorsque le pays sélectionné n'est pas la Belgique, le formulaire présente :

* « Adresse, ligne 1 », obligatoire ;
* « Adresse, ligne 2 », facultative ;
* « Code postal », facultatif ;
* « Ville / localité », obligatoire ;
* « Région / province / État », facultatif ;
* le pays sélectionné, obligatoire.

Ces champs restent libres afin de prendre en charge les différences entre les
systèmes postaux. Le système ne tente ni de proposer une ville ni de vérifier
le format du code postal étranger.

### Création et modification

* Les mêmes champs, règles et messages sont utilisés dans la création
  gestionnaire, la suggestion étudiante et la modification de l'entreprise.
* La correction d'une entreprise par le gestionnaire utilise également le même
  composant de formulaire.
* Le frontend doit factoriser ce groupe de champs dans un composant d'adresse
  réutilisable afin d'éviter des comportements différents entre les parcours.
* Lors d'une modification, l'adresse existante est préremplie dans le régime
  belge ou étranger correspondant.
* Le changement d'une seule composante en modification envoie au backend
  l'objet d'adresse complet. L'adresse est remplacée atomiquement afin qu'une
  modification partielle ne puisse pas produire un état invalide.
* Une entreprise ne peut pas supprimer son adresse sans en fournir une nouvelle
  valide.

### Affichage

Une adresse belge est affichée sur plusieurs lignes selon ce format logique :

```text
{rue} {numéro}{, boîte {boîte} si présente}
{code postal} {localité}
Belgique
```

Une adresse étrangère est affichée en omettant les lignes absentes :

```text
{adresse ligne 1}
{adresse ligne 2 si présente}
{code postal si présent} {ville}
{région si présente}
{libellé français du pays}
```

* Les vues compactes peuvent présenter ces éléments sur une seule ligne, mais
  elles utilisent le même ordre et ne reconstruisent pas l'adresse chacune de
  leur côté.
* Un utilitaire ou composant partagé assure un format homogène dans tout le
  frontend.
* L'API retourne les composantes structurées ; elle ne retourne pas une chaîne
  préformatée comme source de vérité.

## Règles métier

* Toute entreprise possède exactement un pays et une adresse valide pour ce
  pays.
* `BE` est le code pays de la Belgique et la valeur par défaut des formulaires.
* Pour la Belgique, rue, numéro et localité postale sont obligatoires. Le code
  postal est celui de la localité postale sélectionnée.
* Une boîte ou un complément belge est facultatif.
* Pour un autre pays, la ligne d'adresse 1 et la ville/localité sont
  obligatoires. La ligne 2, le code postal et la région sont facultatifs.
* Les chaînes obligatoires sont nettoyées de leurs espaces en début et fin et
  doivent rester non vides après ce nettoyage.
* Les champs facultatifs vides sont enregistrés comme `null`, pas comme des
  chaînes vides.
* Une adresse belge ne contient aucune composante du modèle étranger ; une
  adresse étrangère ne contient aucun identifiant de localité postale belge.
* La validation frontend améliore le retour utilisateur, mais le backend reste
  l'unique autorité pour les règles conditionnelles et le référentiel.
* Le rôle et les permissions existants pour créer ou modifier une entreprise ne
  changent pas.

### Unicité des entreprises

La règle existante interdisant deux entreprises de même nom à la même adresse
est conservée et adaptée aux champs structurés.

Pour une entreprise belge, la clé d'unicité normalisée comprend :

* le nom de l'entreprise ;
* le code pays `BE` ;
* la rue ;
* le numéro ;
* la boîte ou une valeur vide ;
* l'identifiant de la localité postale, qui détermine aussi le code postal.

Pour une entreprise étrangère, elle comprend :

* le nom de l'entreprise ;
* le code pays ;
* la ligne d'adresse 1 ;
* la ligne d'adresse 2 ou une valeur vide ;
* le code postal ou une valeur vide ;
* la ville/localité ;
* la région/province/État ou une valeur vide.

La normalisation ignore la casse, les espaces en début et fin et les répétitions
d'espaces internes. Elle ne supprime pas les accents et ne traduit pas les noms.
Une collision retourne `409` avec le comportement de confidentialité déjà
défini pour les doublons d'entreprises.

## Référentiels

### Pays

* Le référentiel contient toutes les entrées courantes d'ISO 3166-1.
* La clé stockée est le code alpha-2 en majuscules, recommandé par ISO pour les
  usages généraux.
* Chaque entrée contient au minimum le code alpha-2 et un libellé français issu
  de la vue française du référentiel M49 des Nations Unies, qui publie les noms
  de pays ou zones avec leurs codes ISO alpha-2.
* Les codes retirés d'ISO 3166-1 ne sont pas proposés pour une nouvelle adresse.
* Une copie versionnée est conservée dans le dépôt et chargée dans la base
  reconstruite. Le fonctionnement de l'application ne dépend pas d'un appel
  réseau.

### Localités postales belges

* La source de vérité est la liste téléchargeable « Liste des localités et
  codes postaux » publiée par bpost dans son outil officiel de validation des
  codes postaux.
* Chaque ligne locale contient au minimum un identifiant technique, un code
  postal de quatre chiffres et le libellé officiel de la localité.
* Le couple code postal/libellé est unique dans le référentiel, mais le code
  postal seul ne l'est pas nécessairement.
* Une copie versionnée du fichier transformé est conservée dans le dépôt et
  chargée dans la base reconstruite. Aucune requête vers bpost n'est effectuée
  à l'exécution ou pendant les tests.
* La date de récupération, l'URL source et, si possible, une empreinte du
  fichier source sont documentées à côté de la copie locale.
* Le remplacement manuel de cette copie et la régénération du fichier
  applicatif constituent la procédure de mise à jour. Son automatisation est
  hors périmètre.

Sources de référence :

* [Outil officiel bpost et fichiers des localités/codes postaux](https://www.bpost.be/fr/outil-de-validation-de-codes-postaux) ;
* [ISO 3166 — codes pays](https://www.iso.org/iso-3166-country-codes.html) ;
* [Nations Unies M49 — noms français et codes ISO associés](https://unstats.un.org/unsd/methodology/m49/overview/).

## Contrat API attendu

### Données de référence

Les routes sont accessibles à toute session authentifiée :

* `GET /api/reference/countries` retourne les pays actifs avec `code` et
  `name_fr`, dans l'ordre d'affichage attendu ;
* `GET /api/reference/belgian-postal-localities?postal_code=1000` retourne les
  localités correspondant exactement à un code postal belge de quatre chiffres ;
* un paramètre postal absent ou ne contenant pas exactement quatre chiffres
  retourne `400` ;
* un code postal correctement formé mais inconnu retourne une liste vide.

Réponse minimale d'une localité :

```json
{
  "id": 1,
  "postal_code": "1000",
  "name": "Bruxelles"
}
```

### Entreprises

Le champ texte `address` du contrat actuel est remplacé par un objet `address`
obligatoire. Une adresse belge envoyée à `POST /api/companies` ou dans un
`PATCH /api/companies/:id` a cette forme :

```json
{
  "address": {
    "country_code": "BE",
    "street_name": "Rue de la Loi",
    "street_number": "16",
    "box": null,
    "postal_locality_id": 1
  }
}
```

Une adresse étrangère a cette forme :

```json
{
  "address": {
    "country_code": "FR",
    "address_line_1": "10 rue de la Paix",
    "address_line_2": null,
    "postal_code": "75002",
    "city": "Paris",
    "administrative_area": "Île-de-France"
  }
}
```

Les réponses d'entreprise reprennent l'objet structuré. Pour une adresse belge,
elles enrichissent la référence sélectionnée avec les valeurs utiles à
l'affichage :

```json
{
  "address": {
    "country_code": "BE",
    "street_name": "Rue de la Loi",
    "street_number": "16",
    "box": null,
    "postal_locality_id": 1,
    "postal_code": "1000",
    "locality": "Bruxelles"
  }
}
```

* `POST /api/companies` exige un objet d'adresse complet.
* `PATCH /api/companies/:id` conserve le caractère facultatif des propriétés
  principales, mais si `address` est présent, l'objet doit être complet et
  remplacer l'adresse existante atomiquement.
* Le backend rejette un code pays inconnu, `BE` avec une forme étrangère, un
  autre pays avec une forme belge ou une localité postale absente du
  référentiel.
* Aucune route ne continue à accepter une chaîne `address`.

## Modèle de données attendu

### Référentiels

Table `countries` :

* `code` : `TEXT PRIMARY KEY`, code ISO 3166-1 alpha-2 ;
* `name_fr` : `TEXT NOT NULL` ;
* contrainte garantissant deux lettres majuscules pour `code`.

Table `belgian_postal_localities` :

* `id` : clé primaire ;
* `postal_code` : `TEXT NOT NULL`, conservé comme texte à quatre chiffres ;
* `name` : `TEXT NOT NULL` ;
* unicité du couple `postal_code`/`name` ;
* index sur `postal_code` pour la recherche du formulaire.

### Entreprises

La colonne `companies.address` est supprimée et remplacée par des colonnes
structurées. Modèle minimal proposé :

* `country_code TEXT NOT NULL REFERENCES countries(code)` ;
* `street_name TEXT` ;
* `street_number TEXT` ;
* `address_box TEXT` ;
* `belgian_postal_locality_id INTEGER REFERENCES belgian_postal_localities(id)` ;
* `address_line_1 TEXT` ;
* `address_line_2 TEXT` ;
* `foreign_postal_code TEXT` ;
* `foreign_city TEXT` ;
* `administrative_area TEXT`.

Des contraintes `CHECK` garantissent les deux formes exclusives :

* si `country_code = 'BE'`, les champs rue, numéro et localité postale belge
  sont présents et les champs réservés à l'étranger sont nuls ;
* si `country_code <> 'BE'`, la ligne 1 et la ville sont présentes, la localité
  postale belge et les champs belges sont nuls.

Deux index uniques partiels, belge et étranger, ou une solution équivalente
garantie par SQLite, remplacent `idx_companies_name_address_norm`. Les
contraintes d'unicité sont garanties par la base en plus des validations du
service.

La forme exacte des noms de colonnes peut être adaptée pendant le plan
d'implémentation, à condition de préserver le contrat métier, les contraintes
conditionnelles et l'absence d'une adresse texte comme source de vérité.

## Base de développement et données fictives

* `backend/src/db/schema.sql` définit directement les nouvelles tables, les
  nouvelles colonnes obligatoires et leurs contraintes.
* `companies.address` et l'index `idx_companies_name_address_norm` disparaissent
  du schéma reconstruit.
* Aucun `ALTER TABLE`, backfill, parseur d'adresse historique ou mécanisme de
  compatibilité n'est ajouté dans `backend/src/db/db.migrate.ts`.
* Les données de référence doivent être chargées avant les lignes d'entreprises
  afin de respecter les clés étrangères.
* `backend/src/db/seeds/seed.sql` et les autres données fictives utilisées par
  les tests fournissent des adresses structurées valides.
* La base locale existante est supprimée et recréée lors de l'application de
  cette évolution.

## Critères d’acceptation

* [ ] Le pays « Belgique » est présélectionné dans chaque formulaire de création
  d'entreprise.
* [ ] Le sélecteur contient toutes les entrées courantes d'ISO 3166-1 avec un
  libellé français et envoie un code alpha-2.
* [ ] Une adresse est obligatoire pour créer une entreprise, quel que soit le
  rôle du créateur.
* [ ] Pour la Belgique, rue, numéro, code postal et localité sont obligatoires ;
  la boîte reste facultative.
* [ ] Le code postal belge n'accepte que quatre chiffres.
* [ ] Un code postal belge inconnu bloque la soumission avec un message clair.
* [ ] Une localité unique est sélectionnée automatiquement et plusieurs
  localités donnent lieu à un choix obligatoire.
* [ ] Modifier le code postal efface toute localité précédemment choisie.
* [ ] Le backend refuse toute localité belge absente du référentiel.
* [ ] Le code postal retourné pour une adresse belge est toujours celui de la
  localité sélectionnée.
* [ ] Pour un pays étranger, la ligne 1 et la ville sont obligatoires ; la ligne
  2, le code postal et la région restent facultatifs.
* [ ] Aucun code postal étranger ne déclenche de recherche automatique de ville.
* [ ] Passer de la Belgique à un autre pays affiche le formulaire international
  et empêche la soumission de valeurs belges résiduelles, et réciproquement.
* [ ] Les mêmes règles s'appliquent à la création gestionnaire, à la suggestion
  étudiante, à la correction gestionnaire et à la modification par l'entreprise.
* [ ] Le backend refuse une adresse absente, incomplète ou incohérente même si la
  requête ne provient pas du frontend.
* [ ] Deux entreprises de même nom à la même adresse structurée sont refusées
  avec `409`, sans changer les règles existantes de visibilité des doublons.
* [ ] Deux entreprises de même nom peuvent coexister à deux adresses structurées
  différentes.
* [ ] Les listes et détails affichent correctement les adresses belges et
  étrangères sans exposer des champs vides.
* [ ] Une base vide est reconstruite avec les référentiels et des entreprises de
  démonstration valides.
* [ ] L'application et les tests ne réalisent aucun appel réseau vers bpost ou
  ISO.
* [ ] Le schéma, l'API et le frontend ne dépendent plus de la colonne texte
  historique `companies.address`.

## Impacts techniques connus

Features impactées :

* Backend : nouvelle feature de données de référence, par exemple
  `backend/src/features/reference-data` ;
* Backend : `backend/src/features/companies` ;
* Backend : `backend/src/db/schema.sql` ;
* Backend : `backend/src/db/db.migrate.ts` pour retirer l'ancienne logique
  d'unicité et initialiser les référentiels sans migration historique ;
* Backend : `backend/src/db/seeds/seed.sql` et `backend/src/db/seeds/demo.sql` ;
* Frontend : `frontend/src/features/companies` ;
* Frontend : nouveau composant partagé de saisie et de rendu d'adresse ;
* Frontend : `frontend/src/pages/admin-company-form.page.tsx` ;
* Frontend : `frontend/src/pages/student-proposal.page.tsx` ;
* Frontend : `frontend/src/pages/admin-company-detail.page.tsx` ;
* Frontend : `frontend/src/pages/company-dashboard.page.tsx` ;
* Frontend : `frontend/src/pages/companies.page.tsx` ;
* Frontend : `frontend/src/pages/admin-companies.page.tsx`.

Données impactées :

* nouvelles tables `countries` et `belgian_postal_localities` ;
* remplacement de `companies.address` par des colonnes structurées ;
* remplacement de la clé d'unicité nom/adresse ;
* reconstruction sans migration de la base de développement ;
* adaptation de toutes les données fictives d'entreprise.

Routes, API ou écrans impactés :

* nouvelles routes de lecture `/api/reference/...` ;
* `POST /api/companies` ;
* `PATCH /api/companies/:id` ;
* `GET /api/companies` et `GET /api/companies/:id` ;
* file de modération et détection de doublons d'entreprises ;
* tous les formulaires et affichages d'une entreprise.

Permissions ou rôles impactés :

* aucune nouvelle permission métier ;
* les routes de référentiel sont en lecture seule et accessibles à toute
  session authentifiée ;
* les droits existants sur la création, la consultation et la modification des
  entreprises sont conservés.

Tests à prévoir :

* initialisation et intégrité des référentiels dans une base vide ;
* présence de `BE` et contrôle de la liste ISO ;
* recherche d'un code postal belge inconnu, à une localité et à plusieurs
  localités ;
* validation backend des deux formes d'adresse et rejet des formes hybrides ;
* création et modification d'entreprises belges et étrangères pour chaque rôle
  autorisé ;
* refus d'une adresse absente ou incomplète ;
* unicité normalisée des adresses belges et étrangères ;
* formatage d'affichage des deux formes ;
* comportement du sélecteur lors du changement de code postal ou de pays ;
* mise à jour des fixtures frontend et backend utilisant encore
  `address: null` ;
* vérification qu'aucun test n'a besoin du réseau.

Documentation à mettre à jour pendant l'implémentation :

* `docs/current/data-model.md` ;
* `docs/current/features.md` ;
* `backend/src/features/companies/README.md` ;
* README de la nouvelle feature de données de référence.

## Documents liés

* Architecture : `docs/current/architecture.md`
* Modèle de données : `docs/current/data-model.md`
* README de feature : `backend/src/features/companies/README.md`
* Source bpost :
  `https://www.bpost.be/fr/outil-de-validation-de-codes-postaux`
* Source ISO : `https://www.iso.org/iso-3166-country-codes.html`
* Source des libellés français :
  `https://unstats.un.org/unsd/methodology/m49/overview/`
* Review : à créer après l'implémentation

## Incertitudes

* La copie initiale du référentiel bpost devra confirmer les colonnes et les
  libellés multilingues réellement fournis par le fichier officiel. Le produit
  doit conserver le libellé officiel disponible sans inventer une traduction.
