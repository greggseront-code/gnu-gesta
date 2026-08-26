# Gestion des stages V1 - Spec fonctionnelle

## Objectif

Construire une application web de gestion des stages pour l'equipe
pedagogique, les etudiants et les entreprises.

La V1 couvre le depot d'offres, leur validation pedagogique, leur publication
aux etudiants et le depot de candidatures. Le workflow complet apres
candidature reste hors perimetre.

## Perimetre V1

Inclus:

- import initial des etudiants par CSV ou donnees equivalentes;
- gestion d'un referentiel d'entreprises et de contacts entreprise;
- depot d'offres par les entreprises;
- depot de propositions de stage par les etudiants;
- validation ou refus des offres et propositions par l'equipe pedagogique;
- publication des offres validees aux etudiants;
- consultation du referentiel d'entreprises par les etudiants, meme sans offre
  publiee;
- candidature des etudiants sur les offres publiees;
- selection par l'entreprise d'un etudiant ayant postule;
- marquage final d'une offre comme prise ou non disponible.

Exclus:

- SSO Microsoft;
- conventions et signatures;
- documents administratifs aval;
- workflow complet d'evaluation pedagogique;
- gestion avancee des candidatures apres depot.

## Parcours attendus

### Equipe pedagogique

Un `gestionnaire` peut importer les etudiants, consulter toutes les donnees,
creer ou corriger les entreprises et contacts, valider ou refuser une offre, et
cloturer une offre comme prise ou non disponible.

Un `lecteur` peut consulter les donnees sans les modifier.

L'espace pedagogique doit permettre:

- voir les offres a traiter avec leur origine;
- consulter entreprises, contacts, offres et candidatures;
- corriger les donnees de reference;
- superviser la publication des offres.

### Etudiant

Un etudiant peut:

- consulter les offres validees et visibles;
- consulter les entreprises, y compris sans offre publiee;
- filtrer et rechercher les offres publiees;
- postuler a une offre publiee par une entreprise;
- deposer sa propre proposition de stage.

La proposition etudiante utilise le meme niveau d'information qu'une offre
deposee par une entreprise. Si l'entreprise existe deja, l'etudiant doit la
retrouver et la reutiliser. Sinon, il peut suggerer sa creation.

### Entreprise

Une entreprise peut:

- consulter et completer son profil;
- gerer ses contacts;
- creer et modifier ses offres;
- suivre le statut de ses offres;
- consulter les etudiants ayant postule a ses offres;
- retenir un etudiant sur une offre publiee.

Une meme entreprise peut gerer plusieurs offres.

## Objets fonctionnels

### Etudiant

Un etudiant est importe dans le referentiel. Les informations minimales doivent
permettre l'identification, la consultation et la candidature.

### Entreprise

Une entreprise contient au minimum un nom, une adresse et un email general.
Elle peut etre creee par l'equipe pedagogique, suggeree par un etudiant ou
completee par l'entreprise elle-meme.

### Contact entreprise

Un contact est rattache a une entreprise. Il contient nom, prenom, email,
telephone optionnel et roles. Chaque entreprise doit disposer d'au moins un
contact exploitable en plus de son email general.

### Offre de stage

Une offre contient l'entreprise rattachee, les contacts, une description, le
lieu de stage, les technologies, les objectifs, le teletravail, les remarques
optionnelles et une piece jointe optionnelle.

Chaque offre doit etre rattachee a au moins un contact, dont un contact
prioritaire pour la candidature.

### Candidature

Une candidature relie un etudiant a une offre visible. En V1, elle enregistre
qu'un etudiant a postule. L'entreprise peut ensuite retenir un candidat.

## Statuts fonctionnels

Statuts minimaux attendus:

- `soumise`: l'offre attend validation pedagogique;
- `validee_et_visible`: l'offre est approuvee et visible aux etudiants;
- `prise`: l'offre a ete attribuee a un etudiant;
- `non_disponible`: l'offre n'est plus ouverte.

Le code actuel contient aussi `refusee`; ce statut doit etre confirme dans une
spec dediee si le refus devient un comportement produit stable.

## Regles metier

- Seuls les `gestionnaires` peuvent modifier les statuts.
- Seuls les `gestionnaires` peuvent corriger les entreprises et contacts hors
  donnees propres a une entreprise.
- Les `lecteurs` ont un acces en lecture seule.
- Les `etudiants` ne voient que les offres validees et visibles, leurs propres
  propositions, les offres auxquelles ils ont postule tant qu'elles ne sont pas
  `non_disponible`, et le referentiel d'entreprises.
- Les `entreprises` ne voient que leurs propres donnees.
- Une offre non validee n'est visible que par son auteur et l'equipe
  pedagogique.
- Une offre validee devient visible aux etudiants.
- Une offre prise n'est plus disponible pour une nouvelle attribution.
- Une offre non disponible n'est plus ouverte aux candidatures.
- Un etudiant ne doit pas pouvoir postuler deux fois a la meme offre.

## Doublons entreprise

La V1 doit limiter les doublons d'entreprises:

- recherche obligatoire avant creation;
- affichage de correspondances probables;
- correction possible par l'equipe pedagogique pour les propositions deposees
  par un etudiant.

La fusion avancee de doublons est hors perimetre V1.

## Criteres d'acceptation

- Les offres soumises ne sont pas visibles publiquement aux etudiants.
- Une offre validee devient visible et accepte les candidatures.
- Une offre `prise` ou `non_disponible` ne permet plus de nouvelle attribution.
- Une entreprise ne peut consulter que les candidatures de ses offres.
- Un lecteur ne peut pas modifier les donnees.
- Un gestionnaire peut corriger les donnees de reference et les statuts.
