# Architecture du backend

Le code du serveur est organisé sous `src/`, par responsabilité :

- `src/domain/` : règles et modèles métier purs, sans dépendance au framework HTTP ou à SQL.
- `src/application/` : cas d'usage et ports (interfaces) qui décrivent les dépendances nécessaires.
- `src/drivers/` : adaptateurs vers MySQL et les services du Five.
- `src/infra/` : démarrage, authentification, composition des dépendances et adaptateur HTTP Fastify.
- `src/utils/` : fonctions et données utilitaires partagées.
- `tests/` : tests groupés par domaine technique (`domain/`, `drivers/`, `infra/`, `utils/`).

Les types propres à une fonctionnalité restent à côté de son modèle métier ; un dossier `src/types/`
n'est ajouté que si des types transverses le justifient.

## Boucle TDD

1. Écrire ou compléter un test dans le dossier correspondant sous `tests/`, en utilisant un faux port
   en mémoire pour tester un cas d'usage.
2. Implémenter la règle dans `src/domain/` ou le cas d'usage dans `src/application/`.
3. Brancher l'adaptateur concret dans `src/drivers/` et `src/infra/composition/`.
4. Vérifier localement avec `npm run check` depuis la racine.

Cette réorganisation ne change pas les routes ni le comportement métier. Les imports TypeScript
`App/*` pointent vers `src/*` et sont résolus au build.
