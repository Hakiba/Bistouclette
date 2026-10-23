# Bistouclette

Site du club Bistouclette : présentation, section vélo et **Five** — le jeu de
pronostics sur les matchs du club.

## Architecture

Une seule application Node sert tout :

```
pages/            front Next.js exporté en statique (output: "export") -> out/
backend/          API + serveur HTTP Fastify (MySQL / MariaDB)
  src/domain/     règles métier et modèles purs
  src/application/
                  cas d'usage et ports (interfaces)
  src/drivers/    adaptateurs MySQL et accès aux données du Five
  src/infra/      Fastify, authentification et composition des dépendances
  src/utils/      utilitaires partagés
  tests/          tests regroupés par responsabilité
lib/              client HTTP et types partagés du front
components/       briques d'interface communes (ui.tsx, SiteShell, ConfirmDialog)
```

Le front est **entièrement statique** : il n'y a plus de routes API Next. Toutes
les données passent par `/api/*`, servi par Fastify, qui sert aussi les pages
exportées.

## Développement

```bash
npm install
cp backend/.env.example backend/.env   # renseigner MYSQL_*
npm run dev:backend                    # API Fastify sur http://localhost:3333
NEXT_PUBLIC_API_URL=http://localhost:3333 npm run dev
```

Le front de développement appelle l'API sur le port 3333. L'origine
`http://localhost:3000` est autorisée par la configuration CORS du backend.

```bash
npm run check             # typage, lint et tous les tests
npm run test:backend      # tests unitaires et fonctionnels du backend
npm run build             # export statique + build backend + synchronisation
```

Les sorties de build et les fichiers d'environnement sont volontairement exclus de Git.
La convention d'architecture détaillée et la boucle TDD sont documentées dans
[`backend/ARCHITECTURE.md`](./backend/ARCHITECTURE.md).

## Le Five en deux minutes

C'est un **jeu de pronostics**, pas un jeu d'argent : aucune mise, aucun
capital, personne ne peut être éliminé.

- Chaque joueur annonce le **score exact** de chaque rencontre avant le coup
  d'envoi. Tout le monde peut pronostiquer tous les matchs ouverts.
- Barème : **3 points** pour le score exact, **1 point** pour le bon résultat
  (vainqueur ou match nul) avec un score différent, **0** sinon. On ne perd
  jamais de points.
- Un pronostic par joueur et par match, modifiable ou retirable tant que le
  coup d'envoi n'est pas passé.
- Quand le staff saisit le résultat, les points sont attribués. Corriger un
  score recalcule simplement les points : l'opération est rejouable.
- Le classement trie sur les points, puis sur le nombre de scores exacts. Les
  statistiques par joueur : pronostics joués, scores exacts, bons résultats,
  taux de réussite et moyenne de points.

Le barème vit dans
[`backend/src/domain/pronostics/pronostic-rules.ts`](./backend/src/domain/pronostics/pronostic-rules.ts)
et est couvert par les tests unitaires. Le cas d'usage d'enregistrement passe
par un port de persistance, ce qui permet de le tester sans serveur ni base de données.

## API

| Méthode | Route | Accès | Rôle |
| --- | --- | --- | --- |
| `POST` | `/api/create_user` | public | crée un compte joueur (`username`, `firstName`, `lastName`, `email`, `password`) et renvoie le compte avec un jeton |
| `POST` | `/api/login` | public | authentifie avec `email` et `password`, puis renvoie le compte et un jeton |
| `POST` | `/api/logout` | joueur | révoque le jeton de la session |
| `GET` | `/api/five` | public (jeton optionnel) | matchs, classement, et contexte du joueur s'il est connecté |
| `GET` | `/api/five/leaderboard` | public | classement seul |
| `GET` | `/api/five/me` | joueur | pronostics et statistiques |
| `POST` | `/api/five/pronostics` | joueur | enregistre ou remplace un pronostic `{ matchId, scoreHome, scoreAway }` |
| `DELETE` | `/api/five/pronostics/:id` | joueur | retire un pronostic (match encore ouvert) |
| `GET` | `/api/admin/overview` | admin | matchs, pronostics, classement et compteurs |
| `GET` `POST` | `/api/admin/matches` | admin | liste / crée un match |
| `PUT` `DELETE` | `/api/admin/matches/:id` | admin | met à jour / supprime |
| `POST` | `/api/admin/matches/:id/settle` | admin | saisit le score et attribue les points |
| `POST` | `/api/admin/matches/:id/cancel` | admin | annule le match (aucun point) |
| `POST` | `/api/admin/matches/:id/reopen` | admin | efface le résultat et rouvre les pronostics |
| `GET` | `/api/admin/pronostics` | admin | pronostics, filtrables par match |
| `GET` | `/api/admin/players` | admin | comptes et statistiques |

L'authentification utilise un jeton opaque transmis dans l'en-tête
`Authorization: Bearer votre-jeton`. Le jeton est renvoyé par
`POST /api/create_user` ou `POST /api/login` ; `POST /api/logout` le révoque.
Le rôle vient de la colonne `users.role` : une inscription crée toujours un
compte joueur, la promotion se fait en base.

Les erreurs `/api/*` ont toujours la même forme :

```json
{ "message": "Les pronostics sont fermés sur ce match : le coup d’envoi est passé.", "code": "MATCH_CLOSED" }
```

## Schéma

Les tables du Five sont créées et mises à niveau automatiquement au démarrage
(`backend/src/drivers/five/five-schema.ts`), car le serveur de production ne peut pas
lancer les migrations.

| Table | Contenu |
| --- | --- |
| `five_matches` | rencontres : `kickoff_at`, équipes, lieu, score, statut |
| `five_pronostics` | un pronostic par `(user_id, match_id)` : score annoncé et points obtenus (`NULL` tant que le match n'est pas réglé) |

## Déploiement

Le front et le backend sont construits **en CI** (`npm run build`), puis
`backend/build/` est envoyé sur le serveur. Rien n'est compilé sur place.

**Pourquoi le build ne peut pas se faire sur le serveur :**

- Le Node.js Selector de CloudLinux impose que `node_modules` soit un symlink
  vers le virtualenv. Il refuse toute commande `npm` tant que la racine
  contient un vrai dossier de ce nom.
- `backend/node_modules` ne contient que les dépendances de production : les
  outils de build (`typescript`, `tsc-alias`) n'y sont pas, donc
  `npm --prefix backend run build` est impossible.
- Passenger lance `backend/build/server.js`, qui est du JavaScript compilé et
  non du TypeScript. Sans `backend/build`, l'application ne démarre pas.
