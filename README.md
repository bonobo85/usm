# 🌟 Portail USM — Guide d'installation pas-à-pas

Bienvenue ! Ce guide est conçu pour quelqu'un qui débute. Suis chaque étape **dans l'ordre**.

> **🔧 Version testée contre vraie BDD Postgres** : Cette version a été validée par des tests d'intégration end-to-end. Notamment, ces bugs critiques ont été corrigés :
> - **🚨 Faille d'escalade de privilèges** : un USM pouvait s'auto-promouvoir admin via "Modifier mon profil". Bloqué par trigger.
> - Trigger `set_recruitment_date` manquant (date d'ancienneté jamais remplie). Ajouté.
> - Fonction `is_formateur()` manquante (Formateurs ne pouvaient pas valider de badges). Ajoutée.
> - Récursions RLS infinies sur `agents` (bug bloquant au login). Résolu via fonctions `SECURITY DEFINER`.
> - Policy `locker_views_select_self` manquante (Co-leader ne voyait pas ses propres logs).
> - Auth callback utilise `service_role` pour bypass RLS lors du sync des rôles Discord.
> - **Co-leader peut maintenant créer des formations** (perm `create_training` ajoutée au seed).
>
> ✅ Workflow complet testé : créer annonce, formation, badge, sanction, casier, modifier perms admin, accepter/refuser candidatures avec historique conservé — **toutes les actions UI mettent bien la BDD à jour**.

## 📋 Prérequis

Vérifie d'abord que ces logiciels sont installés sur ton PC :

- **Node.js 18 ou supérieur** : https://nodejs.org/ → bouton "LTS"
- **Git** : https://git-scm.com/downloads
- **VSCode** (recommandé) : https://code.visualstudio.com/

Pour vérifier que c'est bien installé, ouvre un terminal (PowerShell sur Windows, Terminal sur Mac) et tape :

```bash
node --version    # doit afficher v18 ou v20
git --version     # doit afficher git version 2.x
```

---

## 🚀 ÉTAPE 1 — Installation locale du projet

### 1.1 Décompresse le projet

Tu as reçu le dossier `portail-usm`. Place-le où tu veux (ex: `Documents/portail-usm`).

### 1.2 Ouvre le projet dans VSCode

```bash
cd Documents/portail-usm
code .
```

### 1.3 Installe les dépendances

Dans le terminal de VSCode (menu *Terminal > New Terminal*) :

```bash
npm install
```

Ça prend 1 à 3 minutes. C'est normal qu'il y ait quelques warnings.

---

## 🗄️ ÉTAPE 2 — Création de la base de données Supabase

### 2.1 Crée un compte Supabase

1. Va sur https://supabase.com
2. *Sign up* avec ton compte GitHub
3. Crée une nouvelle organisation (le nom n'a pas d'importance)

### 2.2 Crée un nouveau projet

1. Bouton *New Project*
2. **Name** : `portail-usm`
3. **Database password** : génère un mot de passe fort et **note-le** quelque part
4. **Region** : `West EU (Paris)` ou `West EU (London)`
5. **Pricing plan** : Free
6. Bouton *Create new project* → attends 2 min que ça démarre

### 2.3 Exécute le schéma SQL

1. Dans la sidebar Supabase, va dans **SQL Editor**
2. Clique sur *New query*
3. Ouvre le fichier `supabase/schema.sql` dans VSCode
4. **Copie tout son contenu** et colle-le dans l'éditeur SQL Supabase
5. Bouton *Run* (en bas à droite, ou Ctrl+Enter)
6. Tu dois voir "Success. No rows returned" → c'est bon ✅

### 2.4 Récupère tes clés API

1. Dans la sidebar Supabase : **Project Settings** (icône engrenage) → **API**
2. Garde cette page ouverte, tu vas en avoir besoin

Tu vois trois informations importantes :
- **Project URL** → c'est ton `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public** → c'est ton `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** (clique sur "Reveal") → c'est ton `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **NE LA PARTAGE JAMAIS**

### 2.5 Crée le bucket Storage pour les casiers

1. Sidebar Supabase → **Storage**
2. Bouton *New bucket*
3. Name : `lockers`
4. **Public bucket** : NON (laisse décoché)
5. *Create bucket*

Puis on crée les policies (qui peut uploader/lire) :

1. Clique sur le bucket `lockers` créé
2. Onglet *Policies* > *New policy* > *Create a policy from scratch*
3. **Policy 1 — Upload** :
   - Name : `Users can upload to lockers`
   - Allowed operation : INSERT
   - Target roles : `authenticated`
   - WITH CHECK expression : `auth.uid() IS NOT NULL`
4. **Policy 2 — Read** :
   - Name : `Locker access`
   - Allowed operation : SELECT
   - Target roles : `authenticated`
   - USING expression : `auth.uid() IS NOT NULL`

---

## 🤖 ÉTAPE 3 — Création de l'application Discord

### 3.1 Crée l'app Discord

1. Va sur https://discord.com/developers/applications
2. Bouton *New Application*
3. Name : `Portail USM` → *Create*

### 3.2 Récupère les credentials OAuth

1. Dans la sidebar : **OAuth2** > **General**
2. Note quelque part :
   - **CLIENT ID** → c'est ton `DISCORD_CLIENT_ID`
   - **CLIENT SECRET** → bouton *Reset Secret* pour le voir, c'est ton `DISCORD_CLIENT_SECRET`

### 3.3 Ajoute les Redirect URLs

Dans la même page OAuth2, section *Redirects* :

1. Ajoute : `https://[TON_PROJECT_REF].supabase.co/auth/v1/callback`
   (remplace `[TON_PROJECT_REF]` par ce qui est avant `.supabase.co` dans ton URL Supabase)
2. Ajoute aussi : `http://localhost:3000/auth/callback`
3. **Save Changes**

### 3.4 Crée le Bot Discord

1. Sidebar : **Bot**
2. Bouton *Add Bot* → confirme
3. **Token** : clique *Reset Token* → c'est ton `DISCORD_BOT_TOKEN` ⚠️ ultra secret
4. **Privileged Gateway Intents** : active **Server Members Intent** (obligatoire pour lire les rôles)
5. **Save Changes**

### 3.5 Invite le bot sur ton serveur Discord

1. Sidebar : **OAuth2 > URL Generator**
2. Coche : `bot`
3. Permissions bot : `Read Messages/View Channels`, `Send Messages`
4. Copie l'URL générée en bas, ouvre-la dans un nouvel onglet
5. Sélectionne ton serveur USM → autorise

### 3.6 Récupère l'ID du serveur Discord

1. Dans Discord, va dans *Paramètres utilisateur > Avancé* > active **Mode développeur**
2. Clic droit sur ton serveur dans la liste à gauche → *Copier l'identifiant*
3. Garde-le, c'est ton `DISCORD_GUILD_ID`

### 3.7 Récupère les IDs des rôles USM

Pour chaque rôle USM sur ton serveur :

1. Paramètres du serveur > *Rôles*
2. Clic droit sur le rôle → *Copier l'identifiant*
3. Note quel ID correspond à quel rôle :
   - `DISCORD_ROLE_SHERIFF`
   - `DISCORD_ROLE_LEADER`
   - `DISCORD_ROLE_COLEADER`
   - `DISCORD_ROLE_OPERATOR`
   - `DISCORD_ROLE_OPERATOR_SECOND`
   - `DISCORD_ROLE_USM`
   - `DISCORD_ROLE_USM_TEST`
   - `DISCORD_ROLE_FORMATEUR`

### 3.8 Configure Discord OAuth dans Supabase

1. Retour dans Supabase → **Authentication** > **Providers**
2. Trouve **Discord** dans la liste, clique dessus
3. Active-le (toggle)
4. **Client ID** : ton `DISCORD_CLIENT_ID`
5. **Client Secret** : ton `DISCORD_CLIENT_SECRET`
6. **Save**

---

## ⚙️ ÉTAPE 4 — Configuration locale

### 4.1 Crée le fichier `.env.local`

À la racine du projet, crée un fichier nommé `.env.local` (avec le point au début).

Copie le contenu de `.env.example` dedans, puis remplace toutes les valeurs par les tiennes (celles que tu as notées plus haut).

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...

DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=...

DISCORD_ROLE_SHERIFF=...
DISCORD_ROLE_LEADER=...
DISCORD_ROLE_COLEADER=...
DISCORD_ROLE_OPERATOR=...
DISCORD_ROLE_OPERATOR_SECOND=...
DISCORD_ROLE_USM=...
DISCORD_ROLE_USM_TEST=...
DISCORD_ROLE_FORMATEUR=...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4.2 Lance le site en local

```bash
npm run dev
```

Ouvre http://localhost:3000 → tu dois voir la page de login avec le bouton Discord.

Clique sur *Se connecter avec Discord*. Si tout va bien tu arrives sur le dashboard. 🎉

### 4.3 Te promouvoir Admin (première fois)

Pour la toute première connexion, tu auras le grade par défaut selon tes rôles Discord. Pour avoir accès à tout :

1. Dans Supabase → **Table Editor** > table `agents`
2. Trouve la ligne avec ton compte
3. Édite : `is_admin` → `true`
4. Si tu veux : `grade` → `sheriff` (pour le test)
5. Refresh la page du portail → tu vois maintenant l'Admin panel

---

## 🌍 ÉTAPE 5 — Push sur GitHub

### 5.1 Crée le repository

1. Va sur https://github.com/new
2. Repository name : `portail-usm`
3. Privé : **Private** (recommandé)
4. **Ne coche rien** d'autre (pas de README ni .gitignore)
5. *Create repository*

### 5.2 Push ton code

Dans le terminal VSCode :

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/portail-usm.git
git push -u origin main
```

⚠️ Le fichier `.env.local` ne sera **pas** envoyé (il est dans `.gitignore`), c'est normal et c'est tant mieux.

---

## ☁️ ÉTAPE 6 — Déploiement Vercel

### 6.1 Connecte ton compte Vercel à GitHub

1. https://vercel.com/login → *Continue with GitHub*

### 6.2 Importe le projet

1. Sur https://vercel.com/new
2. Trouve `portail-usm` dans la liste → *Import*
3. Framework : Next.js (détecté automatiquement)
4. **Build settings** : laisse tout par défaut

### 6.3 Ajoute les variables d'environnement

Dans la même page d'import, section *Environment Variables*, **ajoute toutes les variables** du fichier `.env.local` une par une :

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ton URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ta clé anon |
| `SUPABASE_SERVICE_ROLE_KEY` | ta service role key |
| `DISCORD_CLIENT_ID` | ... |
| `DISCORD_CLIENT_SECRET` | ... |
| `DISCORD_BOT_TOKEN` | ... |
| `DISCORD_GUILD_ID` | ... |
| `DISCORD_ROLE_*` | tous les rôles |
| `NEXT_PUBLIC_APP_URL` | https://ton-projet.vercel.app (à mettre après le 1er déploiement) |

### 6.4 Deploy

Clique *Deploy* → attends 2-3 minutes.

À la fin, tu auras une URL du genre `https://portail-usm-xxxxx.vercel.app`. C'est ton site en production ! 🎉

### 6.5 Ajoute l'URL Vercel dans Discord et Supabase

1. **Discord** : Developer Portal > ton app > OAuth2 > General > ajoute le redirect : `https://[ton-url].vercel.app/auth/callback`
2. **Supabase** : Authentication > URL Configuration > Site URL : `https://[ton-url].vercel.app`
3. **Supabase** : Redirect URLs : ajoute aussi `https://[ton-url].vercel.app/**`

### 6.6 Met à jour `NEXT_PUBLIC_APP_URL` dans Vercel

1. Vercel > ton projet > Settings > Environment Variables
2. Met à jour `NEXT_PUBLIC_APP_URL` avec ton URL Vercel
3. Onglet *Deployments* → *Redeploy* du dernier déploiement

---

## 🛠️ Quelques bonnes pratiques

### Modifier le code

Quand tu modifies un fichier :

1. `npm run dev` en local pour tester
2. Quand c'est bon :
   ```bash
   git add .
   git commit -m "ma modif"
   git push
   ```
3. Vercel redéploie automatiquement en quelques secondes

### Si quelque chose casse

- Vérifie les logs dans Vercel (onglet *Logs* du déploiement)
- Vérifie les policies RLS dans Supabase (table editor → onglet "Policies")
- Vérifie que les variables d'environnement sont bien remplies sur Vercel

---

## 📁 Architecture du projet

```
portail-usm/
├── app/                       # Pages Next.js (App Router)
│   ├── (auth)/                # Pages protégées (login requis)
│   │   ├── dashboard/         # Tableau de bord
│   │   ├── profile/           # Mon profil
│   │   ├── roster/[id]/       # Annuaire + profil d'un agent
│   │   ├── recruitment/       # Candidatures
│   │   ├── disciplinary/      # Sanctions
│   │   ├── locker/            # Casier personnel
│   │   ├── trainings/         # Formations & badges
│   │   ├── announcements/     # Annonces
│   │   ├── tickets/           # Support
│   │   ├── archives/          # Archives
│   │   ├── admin/             # Panel admin
│   │   └── layout.tsx         # Layout avec sidebar
│   ├── auth/callback/         # OAuth Discord retour
│   ├── login/                 # Page de connexion
│   ├── layout.tsx             # Layout racine
│   └── globals.css            # Styles Tailwind
├── components/
│   ├── layout/                # Sidebar, Topbar
│   ├── modules/               # Composants par module
│   └── ui/                    # Composants réutilisables
├── lib/
│   ├── supabase/              # Clients Supabase
│   ├── discord/               # API Discord
│   ├── auth/                  # Permissions
│   ├── utils/                 # Helpers
│   └── types.ts               # Types TypeScript
├── supabase/
│   └── schema.sql             # Schéma BDD complet
├── middleware.ts              # Auth check Next.js
├── .env.example               # Exemple de variables
└── package.json
```

---

## 🔐 Le système de permissions

- Les rôles Discord déterminent le **grade** d'un agent (synchro automatique)
- Chaque grade a un set de permissions par défaut (configurable dans Admin > Permissions)
- Un agent peut avoir des permissions custom (override individuel)
- Le rôle **Admin** (séparé) bypass tout

Les permissions s'appliquent à 2 niveaux :
1. **Côté client** : les boutons sont cachés si tu n'as pas la perm (UX)
2. **Côté serveur (RLS Supabase)** : tu ne peux **pas** insérer/modifier sans la perm (sécurité réelle)

---

Tout est prêt. Bon dev ! 🚀
