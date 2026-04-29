# USM Portal — United States Marshal (GTA RP)

Portail interne de l'unité USM. Stack :

- **Next.js 14** (App Router, TypeScript strict)
- **Supabase** (Postgres + Storage + RLS)
- **NextAuth v4** avec **Discord OAuth uniquement** — récupère :
  - le profil de l'utilisateur (username, avatar, email)
  - la liste de ses **serveurs Discord**
  - ses **rôles** sur chacun de ces serveurs
- **Tailwind CSS** + thème sombre / or / bleu marine
- Déploiement **Vercel**

---

## 1. Prérequis

- Node.js ≥ 18
- Un compte [GitHub](https://github.com)
- Un compte [Supabase](https://supabase.com) (gratuit)
- Une application [Discord Developer](https://discord.com/developers/applications) (gratuit)
- Un compte [Vercel](https://vercel.com) (gratuit, connecté à GitHub)

---

## 2. Setup Supabase

### 2.1. Créer le projet
1. Aller sur https://supabase.com → **New project**
2. Choisir un nom, un mot de passe (à garder), une région proche
3. Attendre la fin du provisioning (~2 min)

### 2.2. Exécuter le schéma
1. Dans le projet Supabase → **SQL Editor** → **New query**
2. Coller **tout le contenu** de [`supabase/schema.sql`](./supabase/schema.sql)
3. **Run** — ça crée toutes les tables, les rangs / badges seedés, les triggers, les buckets storage et toutes les policies RLS.

### 2.3. Récupérer les clés
**Settings → API**, noter :
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` (secret !) → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ Le `service_role` ne doit **jamais** être exposé côté client. Il n'est utilisé que dans les routes API serveur.

---

## 3. Setup Discord OAuth

1. https://discord.com/developers/applications → **New Application**
2. Nom : `USM Portal` (ou ce que tu veux)
3. Onglet **OAuth2** :
   - `Client ID` → `DISCORD_CLIENT_ID`
   - `Client Secret` → `Reset Secret`, copier → `DISCORD_CLIENT_SECRET`
4. **OAuth2 → Redirects** → ajouter :
   - `http://localhost:3000/api/auth/callback/discord` (dev)
   - `https://<ton-app>.vercel.app/api/auth/callback/discord` (prod, à ajouter après le 1er deploy)

> Les **scopes** sont déjà codés dans `lib/auth.ts` :
> `identify email guilds guilds.members.read`
> Pas besoin de les configurer dans Discord — ils sont demandés à la connexion.

---

## 4. Setup local

```bash
git clone <ton-repo>
cd usm-site
npm install
cp .env.example .env.local
# remplir .env.local avec tes valeurs
```

Générer un secret NextAuth :
```bash
openssl rand -base64 32
```
→ coller dans `NEXTAUTH_SECRET`.

Lancer :
```bash
npm run dev
```
→ http://localhost:3000

À la 1ère connexion Discord, le user est créé en BDD avec le rang **BCSO (1)**. Pour te promouvoir Shériff (rang 9), va dans Supabase → **Table editor → users**, et passe ton `rank_level` à `9` manuellement (à faire **une seule fois** pour le 1er admin).

---

## 5. Push sur GitHub

```bash
cd usm-site
git init
git add .
git commit -m "Initial commit — USM portal"
git branch -M main
git remote add origin git@github.com:<ton-user>/usm-site.git
git push -u origin main
```

---

## 6. Deploy sur Vercel

1. https://vercel.com → **Add new… → Project**
2. Importer le repo GitHub `usm-site`
3. **Framework preset** : Next.js (auto-détecté)
4. **Environment variables** — ajouter **toutes** les variables de `.env.example` :

| Variable | Valeur |
|---|---|
| `NEXTAUTH_URL` | `https://<a-définir-après-deploy>.vercel.app` |
| `NEXTAUTH_SECRET` | (le secret généré plus haut) |
| `DISCORD_CLIENT_ID` | (Discord Dev Portal) |
| `DISCORD_CLIENT_SECRET` | (Discord Dev Portal) |
| `NEXT_PUBLIC_SUPABASE_URL` | (Supabase API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (Supabase API) |
| `SUPABASE_SERVICE_ROLE_KEY` | (Supabase API — secret) |
| `DISCORD_WEBHOOK_NEW_MEMBER` | (optionnel) |

5. **Deploy**.
6. Une fois le 1er deploy fini, Vercel donne une URL `https://usm-site-xxx.vercel.app`. Reviens dans :
   - **Vercel → Settings → Environment Variables** : mettre `NEXTAUTH_URL` à cette URL et redeploy
   - **Discord Dev Portal → OAuth2 → Redirects** : ajouter `https://usm-site-xxx.vercel.app/api/auth/callback/discord`

C'est fini. ✅

---

## 7. Architecture rapide

```
app/
  api/
    auth/[...nextauth]/   ← NextAuth (Discord)
    rang/                 ← changement de rang
    sanctions/            ← création sanction
    archiver/             ← archivage d'un membre
    upload/               ← upload fichier (avatar / doc / rapport)
  dashboard/              ← stats + annonces + entraînements + drafts
  personnel/              ← liste + organigramme
  profil/[userId]/        ← profil + serveurs Discord & rôles (vue self)
  badges/                 ← gestion des badges (op-second+)
  entrainement/           ← planning + sessions passées
  entrainement/[id]/      ← détail + pointage + remise badge
  formateurs/             ← RC + résultats + attestations
  rapports/               ← liste + création
  rapports/[id]/          ← éditeur (5 templates)
  sanctions/              ← helpdesk tickets
  crash/                  ← unité CRASH (≥ co-lead OU badge CRASH)
  archives/               ← anciens membres + casier + docs
  admin/                  ← gestion rangs + connectés (≥ co-lead)
components/               ← Avatar, Modal, Tabs, RankBadge, BadgeTag, Navbar, LayoutApp, PermissionGate
lib/
  auth.ts                 ← NextAuth + Discord guilds & roles fetch + JWT Supabase signé
  supabase.ts             ← clients (browser anon, browser+JWT, admin service-role)
  constants.ts            ← rangs, badges, helpers
  useUser.ts / useSupabase.ts
supabase/
  schema.sql              ← tout le schéma (à coller dans le SQL Editor)
```

### Comment fonctionne RLS avec NextAuth

NextAuth signe un JWT custom avec `NEXTAUTH_SECRET` contenant `user_id` et `rank_level`. Ce JWT est passé via `Authorization: Bearer …` à Supabase. Les policies RLS lisent ces claims via les helpers SQL `jwt_user_id()` et `jwt_rank()` (définis dans `schema.sql`).

> ⚠️ Pour que ça marche, le **JWT secret de Supabase doit être identique à `NEXTAUTH_SECRET`**.
>
> Dans **Supabase → Settings → API → JWT Settings → JWT Secret** : remplace la valeur par ton `NEXTAUTH_SECRET`. Sinon Supabase rejette les JWT signés par NextAuth.

---

## 8. Hiérarchie & badges

**9 rangs** (du plus bas au plus haut) :
1. BCSO · 2. USM · 3. USM Confirmé · 4. Formateur · 5. Opérateur Second · 6. Opérateur · 7. Co-Leader · 8. Leader · 9. Shériff

**9 badges** (ordre fixe, codes en majuscules) :
`CRASH · FORMATEUR · INSTRUCTEUR · NEGOCIATEUR · BMO · DRONE · GAV · BRACELET · FEDERAL`

**Permissions clé** :
- voir Personnel / Entraînement : tous les membres actifs
- voir CRASH : ≥ Co-Leader **OU** badge `CRASH`
- voir Formateurs : ≥ Co-Leader **OU** badge `FORMATEUR`
- gérer les badges : ≥ Opérateur Second
- modifier les rangs : ≥ Co-Leader (et toujours strictement < son propre rang)
- archiver / sanctions : ≥ Co-Leader

---

## 9. Données Discord exposées sur le profil

À la connexion Discord, on récupère pour chaque serveur où le user est :
- `id`, `name`, `icon` du serveur
- ses **rôles** (IDs)
- son surnom (`nick`) éventuel

Ces données sont stockées dans `users.discord_guilds` (jsonb) et affichées sur **`/profil/[userId]`** quand tu consultes ton propre profil.

---

## 10. Commandes utiles

```bash
npm run dev      # dev local
npm run build    # build prod
npm run start    # run le build prod
npm run lint     # lint
```

---

## Licence

Usage interne USM — GTA RP.
