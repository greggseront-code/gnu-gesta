# Backlog — sujets non engagés

Ce registre recense ce qui est identifié hors d'un travail engagé. Rien ici
n'est ordonné ni promis. Une entrée quitte ce document lorsqu'elle rejoint un
dossier de `docs/work/active/` ou lorsqu'elle est abandonnée.

## Départements d'une entreprise

Statut : à étudier.

Une entreprise peut regrouper plusieurs unités internes à une même adresse. Si
ce besoin est confirmé, les départements doivent devenir une entité rattachée à
`companies`, et non des entreprises dupliquées contournant l'unicité sur le nom
et l'adresse.

Questions à trancher avant toute spec :

- rattachement facultatif ou obligatoire des contacts et offres ;
- appartenance d'un contact ou d'une offre à plusieurs départements ;
- adresse, email et validation propres au département ;
- migration des données existantes sans département artificiel.

L'analyse d'origine est conservée dans
`docs/history/analyses/company-departments.md`.

## Décisions produit et techniques à engager

- Confirmer si `refusee`, déjà présent dans le code et le schéma SQL, devient
  un statut produit officiel.
- Définir le cycle de vie et le stockage durable des pièces jointes avant un
  usage réel ; le risque opérationnel est détaillé dans
  `docs/operations/production-readiness.md`.
- Définir une stratégie de migration vers PostgreSQL seulement si SQLite ne
  répond plus au besoin.
