# Matchmaking AKD

Plateforme de gestion de matchs e-sport avec synchronisation bidirectionnelle Discord (chat live, création de salons, validation de résultats par OCR).

## Architecture

Monorepo npm workspaces, 4 services indépendants + 2 packages partagés :

- `apps/web` — Next.js 14 (dashboard, création de matchs, chat live, validation), NextAuth (Discord OAuth)
- `apps/bot` — Discord.js : création de salons, relais des messages, détection de screenshot, validation par réaction
- `apps/realtime` — Socket.io + relais Redis pub/sub entre Discord et les clients web
- `apps/worker` — Worker BullMQ : OCR (Google Cloud Vision) sur les screenshots, extraction du score
- `packages/db` — Schéma Prisma (PostgreSQL) + client partagé
- `packages/shared` — Types/contrats partagés (événements Socket.io, canaux Redis, jobs BullMQ, API interne)

## Prérequis

- Node.js 20+
- Docker (pour Postgres + Redis via `docker-compose.dev.yml` en local, ou la stack complète via `docker-compose.yml`)
- Une application Discord (bot token + OAuth2 client id/secret) avec les intents `Guilds`, `GuildMessages`, `MessageContent`, `GuildMessageReactions`, `GuildMembers`
- Des identifiants Google Cloud Vision (fichier de clé JSON)

## Installation (développement local)

```bash
npm install
docker compose -f docker-compose.dev.yml up -d   # Postgres + Redis uniquement
cp .env.example apps/web/.env.local
cp .env.example apps/bot/.env
cp .env.example apps/realtime/.env
cp .env.example apps/worker/.env
# éditer chaque .env avec les vraies valeurs (token Discord, clés OAuth, GCP, S3...)

npm run db:push             # applique le schéma Prisma (ou npm run db:migrate en dev itératif)
```

## Lancer les services (en parallèle, un terminal par service)

```bash
npm run dev:web        # http://localhost:3000
npm run dev:bot        # API interne sur :4001
npm run dev:realtime   # Socket.io sur :4002
npm run dev:worker     # worker OCR (BullMQ)
```

## Flux principal

1. Un admin crée un match sur le web (`/`) en choisissant deux équipes → `POST /api/matches` crée la ligne `Match`, appelle l'API interne du bot qui crée le salon Discord, les permissions par joueur et un webhook de relais.
2. Le salon Discord et la page `/matches/[id]` sont synchronisés en temps réel via `apps/realtime` (Socket.io ↔ Redis pub/sub), dans les deux sens.
3. Un joueur poste un screenshot (Discord ou bouton 📸 sur le web) → un job BullMQ `ocr-scan` est créé → `apps/worker` scanne via Google Vision, extrait le score, crée un `MatchResult` et publie le résultat.
4. Le bot poste un embed avec réactions ✅/❌ dans le salon ; le web affiche les mêmes boutons. Chaque équipe doit valider (`ResultValidation`, contrainte unique par équipe). Accord mutuel → match `COMPLETED`. Désaccord → `DISPUTED` + ping du rôle admin.

## Déploiement (Dokploy)

Le repo est prêt pour un déploiement **Docker Compose** sur Dokploy : `docker-compose.yml` (racine) définit les 6 services — `postgres`, `redis`, `bot`, `realtime`, `worker`, `web` — chacun avec son `Dockerfile` (`apps/*/Dockerfile`), build context = racine du repo (nécessaire pour accéder à `packages/db` et `packages/shared`).

1. Sur Dokploy : **Create Project → Application → Docker Compose**, pointer sur ce repo Git, fichier `docker-compose.yml`.
2. Renseigner toutes les variables de `.env.example` dans l'onglet *Environment* du projet Dokploy (Dokploy les injecte dans tous les services du compose). Points d'attention :
   - `DATABASE_URL` et `REDIS_URL` doivent pointer sur les services internes : `postgresql://postgres:postgres@postgres:5432/matchmaking_akd` et `redis://redis:6379` (voir les commentaires `# Dokploy:` dans `.env.example`).
   - `BOT_INTERNAL_URL=http://bot:4001` et `REALTIME_URL=http://realtime:4002` (hostnames internes, jamais exposés).
   - `NEXT_PUBLIC_REALTIME_URL` et `NEXTAUTH_URL` doivent être les **domaines publics** exposés par Dokploy (le navigateur s'y connecte directement) — pas les hostnames internes.
   - `NEXT_PUBLIC_REALTIME_URL` est aussi un **build arg** Docker (`apps/web/Dockerfile`) car Next.js l'inline dans le bundle client à la compilation : si tu le changes, il faut redéployer (rebuild), pas juste redémarrer le conteneur.
3. Exposer/domainer dans Dokploy : `web` (port 3000) et `realtime` (port 4002) en HTTPS public. `bot` (4001) et `postgres`/`redis` doivent rester internes (pas de domaine public).
4. Clé Google Vision : monter le fichier JSON via l'onglet *Mounts* du service `worker` sur `/run/secrets/gcp-vision-key.json` (chemin déjà référencé par `GOOGLE_APPLICATION_CREDENTIALS` dans le compose).
5. Migrations Prisma : `docker-compose.yml` ne lance pas de service de migration dédié. Après le premier déploiement, exécute une fois (depuis le terminal Dokploy du service `bot`, ou en local avec `DATABASE_URL` pointée sur la DB de prod) :
   ```bash
   npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma
   ```

## Notes de sécurité

- L'API interne du bot et le endpoint `/internal/broadcast` du serveur realtime sont protégés par un secret partagé (`INTERNAL_API_KEY`), jamais exposés au client.
- L'auth web repose sur NextAuth (Discord OAuth, sessions JWT) ; les routes de validation vérifient que l'utilisateur appartient bien à une des deux équipes du match avant d'enregistrer un vote.
