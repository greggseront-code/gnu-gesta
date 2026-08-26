# Migration — refonte documentaire et routage de contexte

Date : 2026-08-26

Statut : exécutée.

Ce document conserve la correspondance des chemins. Il n'est pas une règle de
lecture ; `docs/README.md` et `AGENT.md` font foi.

| Avant | Après |
| --- | --- |
| règles dispersées dans `CLAUDE.md` | `AGENT.md`, avec `AGENTS.md` et `CLAUDE.md` comme ponts courts |
| absence d'index | `docs/README.md` |
| `docs/architecture.md` | `docs/current/architecture.md` |
| `docs/features.md` | `docs/current/features.md` |
| `docs/data-model.md` | `docs/current/data-model.md` |
| `docs/future-extensions.md` | résumé dans `docs/current/backlog.md`, analyse dans `docs/history/analyses/` |
| `docs/production-readiness.md` | `docs/operations/production-readiness.md` |
| `docs/deployment.md` | `docs/operations/deployment.md` |
| `docs/specs/<nom>.md` clos | `docs/history/phases/<nom>-spec.md` |
| `docs/plans/<nom>.md` clos | `docs/history/phases/<nom>-plan.md` |
| `docs/proposals/<nom>.md` close | `docs/history/phases/<nom>-proposal.md` |
| `docs/reviews/<nom>.md` | `docs/history/reviews/<nom>.md` |
| spec d'adresses structurées non engagée | `docs/work/active/adresses-structurees-entreprises/spec.md` |

Les suffixes ajoutés aux archives sont nécessaires dans GNU Gesta : plusieurs
specs et plans avaient exactement le même nom et ne peuvent pas cohabiter dans
`docs/history/phases/` sans cette distinction.
