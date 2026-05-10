# USM Portal — Guide de setup CRITIQUE

## ⚠️ Variables d'environnement obligatoires

Pour que le portail fonctionne, tu dois configurer **toutes** ces variables dans Vercel
(Settings → Environment Variables) :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...           # ← service_role key (secret !)
SUPABASE_JWT_SECRET=ton-jwt-secret-supabase   # ← TRÈS IMPORTANT (voir ci-dessous)

NEXTAUTH_URL=https://ton-app.vercel.app
NEXTAUTH_SECRET=une-longue-chaine-aleatoire   # genere avec: openssl rand -base64 32

DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
```

### 🔑 Où trouver SUPABASE_JWT_SECRET ?

Dans le dashboard Supabase :
1. **Settings → API** 
2. Section **JWT Settings**
3. Copie la valeur **JWT Secret**

**C'est cette clé que Supabase utilise pour vérifier les JWT.** Sans elle, toutes les
requêtes authentifiées sont refusées par RLS et tu vois "rien ne se sauvegarde".

Si tu ne la configures pas, le portail utilisera `NEXTAUTH_SECRET` comme fallback,
mais Supabase rejettera les tokens et **les RLS bloqueront toutes les écritures**.

## 📋 Migrations SQL à exécuter

Dans **Supabase SQL Editor**, dans cet ordre :

1. **`supabase/schema.sql`** — Schema initial complet (tables + RLS de base)
2. **`supabase/migration_rls_fix.sql`** — Fixes des RLS (DELETE policies, profile_notes, realtime)

## 🔧 Comment ça marche maintenant

Le portail utilise **2 mécanismes** pour les opérations :

### Lecture (SELECT)
- Client browser avec JWT signé → Supabase valide → RLS applique les policies
- Si JWT_SECRET n'est pas bon, les SELECT marchent quand même grâce à `auth.role() = 'authenticated'`

### Écriture (INSERT / UPDATE / DELETE)
- **Toutes** les mutations passent par `/api/data` (route serveur)
- La route serveur utilise **service_role** (bypass RLS)
- Les permissions sont vérifiées en code avant d'exécuter
- Donc même si Supabase JWT_SECRET n'est pas configuré, **les écritures fonctionnent**

## 🐛 Si ça ne fonctionne toujours pas

1. Ouvre la console navigateur (F12) → onglet Network
2. Clique sur le bouton qui ne fonctionne pas
3. Regarde la requête `/api/data` :
   - **Status 401** → tu n'es pas connecté, recharge
   - **Status 403** → ton rang est trop bas pour cette action
   - **Status 500** → regarde la réponse JSON, le message d'erreur est dedans

4. Vérifie les logs Vercel : Dashboard → ton projet → Logs

## 👤 Donner les permissions admin

Pour devenir Shériff (rang 9) au premier login :

```sql
-- Dans Supabase SQL Editor
UPDATE users 
SET rank_level = 9 
WHERE discord_id = 'ton_discord_id';
```

Puis déconnecte-toi et reconnecte-toi pour que le JWT soit régénéré.
