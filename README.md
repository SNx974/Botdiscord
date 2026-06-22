# Matchmaking AKD

Plateforme de gestion de matchs e-sport avec synchronisation bidirectionnelle Discord (chat live, création de salons, validation de résultats par OCR).

## Architecture

Monorepo npm workspaces, 4 services indépendants + 2 packages partagés :

- `apps/web` — Next.js 14 (dashboard, création de matchs, chat live, validation), NextAuth (Discord OAuth)
- `apps/bot` — Discord.js : création de salons, relais des messages, détection de screenshot, validation par réaction
- `apps/realtime` — Socket.io + relais Redis pub/sub entre Discord et les clients web
- `apps/worker` — Worker BullMQ : OCR sur les screenshots (Google Cloud Vision ou GPT-4o vision selon `OCR_PROVIDER`), extraction du score
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
3. Un joueur poste un screenshot (Discord ou bouton 📸 sur le web) → un job BullMQ `ocr-scan` est créé → `apps/worker` scanne (Google Vision + regex, ou GPT-4o vision selon `OCR_PROVIDER`), extrait le score, crée un `MatchResult` et publie le résultat.
4. Le bot poste un embed avec réactions ✅/❌ dans le salon ; le web affiche les mêmes boutons. Chaque équipe doit valider (`ResultValidation`, contrainte unique par équipe). Accord mutuel → match `COMPLETED`. Désaccord → `DISPUTED` + ping du rôle admin.

## Déploiement (Dokploy)

Le repo est prêt pour un déploiement **Docker Compose** sur Dokploy : `docker-compose.yml` (racine) définit 4 services applicatifs — `bot`, `realtime`, `worker`, `web` — chacun avec son `Dockerfile` (`apps/*/Dockerfile`), build context = racine du repo (nécessaire pour accéder à `packages/db` et `packages/shared`) — plus `minio`/`minio-init` pour le stockage des screenshots (bundlé, pas besoin d'un service externe). Postgres et Redis **ne sont pas dans ce compose** : ce sont des ressources Dokploy séparées (onglet *Databases* du projet → *Create Database* → Postgres / Redis), comme n'importe quelle DB managée.

1. Crée les ressources **Postgres** et **Redis** dans l'onglet *Databases* du projet Dokploy ; récupère leurs connection strings internes pour `DATABASE_URL` / `REDIS_URL`.
2. **Create Project → Application → Docker Compose**, pointer sur ce repo Git, fichier `docker-compose.yml`.
3. Renseigner toutes les variables de `.env.example` dans l'onglet *Environment* de l'application Dokploy (une seule fois, injectées dans tous les services du compose via `${VAR}`). Points d'attention :
   - `DATABASE_URL` / `REDIS_URL` = les connection strings internes des ressources Dokploy créées à l'étape 1.
   - `INTERNAL_API_SECRET` = secret partagé arbitraire (ex: `openssl rand -hex 32`).
   - `API_PORT` (ex: `4000`) = port interne commun à `bot` et `realtime` ; `BOT_INTERNAL_URL`/`REALTIME_URL` en dérivent automatiquement dans le compose (`http://bot:${API_PORT}`, `http://realtime:${API_PORT}`), pas besoin de les définir toi-même.
   - `NEXT_PUBLIC_REALTIME_URL` et `NEXTAUTH_URL` doivent être les **domaines publics** exposés par Dokploy (le navigateur s'y connecte directement) — pas les hostnames internes.
   - `NEXT_PUBLIC_REALTIME_URL` est aussi un **build arg** Docker (`apps/web/Dockerfile`) car Next.js l'inline dans le bundle client à la compilation : si tu le changes, il faut redéployer (rebuild), pas juste redémarrer le conteneur.
   - `OCR_PROVIDER=gpt4o` + `OPENAI_API_KEY` pour utiliser GPT-4o vision (pas besoin de clé Google) ; `OCR_PROVIDER=vision` + `GOOGLE_APPLICATION_CREDENTIALS` pour Google Cloud Vision.
   - `S3_ENDPOINT=http://minio:9000` (hostname interne du service `minio` bundlé) ; `S3_PUBLIC_URL=http://<ton-domaine-ou-IP>:9000/<S3_BUCKET>` (le port 9000 doit être ouvert publiquement — c'est fait via `ports: "9000:9000"` dans le compose, pas besoin de domaine Dokploy pour ça). Le bucket est créé et rendu public automatiquement au premier déploiement par le service `minio-init`.
4. Exposer/domainer dans Dokploy : `web` (port 3000) et `realtime` (port `API_PORT`, ex: 4000) en HTTPS public. `bot` doit rester interne (pas de domaine public). `minio` n'a pas besoin de domaine Dokploy non plus, son port 9000 est déjà publié directement.
5. Clé Google Vision (si `OCR_PROVIDER=vision`) : monter le fichier JSON via l'onglet *Mounts* du service `worker` sur `/run/secrets/gcp-vision-key.json`.
6. Migrations Prisma : `docker-compose.yml` ne lance pas de service de migration dédié. Après le premier déploiement, exécute une fois (en local, avec `DATABASE_URL` pointée sur la DB de prod) :
   ```bash
   npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma
   ```

## Notes de sécurité

- L'API interne du bot et le endpoint `/internal/broadcast` du serveur realtime sont protégés par un secret partagé (`INTERNAL_API_SECRET`), jamais exposés au client.
- L'auth web repose sur NextAuth (Discord OAuth, sessions JWT) ; les routes de validation vérifient que l'utilisateur appartient bien à une des deux équipes du match avant d'enregistrer un vote.
