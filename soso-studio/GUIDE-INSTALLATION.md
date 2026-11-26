# Soso Studio : guide d'installation (étape 1)

Compte environ 30 minutes. Fais les parties dans l'ordre. Tout est gratuit sauf Google, qui demande une carte bancaire mais offre 1 000 recherches par mois (et l'appli limite les dépenses).

---

## A. GitHub : le dépôt de l'appli

1. Sur **github.com**, en haut à droite **+** → **New repository**
   - Repository name : `soso-studio`
   - Coche **Private**, ne coche rien d'autre → **Create repository**
2. Donne accès à Claude : **https://github.com/apps/claude/installations/select_target** → ton compte → **Only select repositories** → ajoute `soso-studio` (garde `mes-boutiques`) → **Save**.
3. Dis-moi « dépôt créé » dans le chat : j'y dépose le code.

---

## B. Supabase : la base de données (nouveau projet, séparé de Soso)

1. **supabase.com** → **New project**
   - Name : `soso-studio`, Database password : **Generate**, Region : **Europe (Paris)** → **Create new project** (1 à 2 minutes).
2. Crée les tables : sur GitHub, dépôt `soso-studio` → `supabase/schema.sql` → bouton **Copy raw file**.
   Dans Supabase : **SQL Editor** → **New query** → colle → **Run** → tu dois voir **Success**.
3. Ton compte : **Authentication** → **Users** → **Add user** → **Create new user** → ton e-mail + un mot de passe, coche **Auto Confirm User**.
4. Ferme la porte : **Authentication** → **Sign In / Providers** → désactive **Allow new users to sign up** → **Save**.
5. Garde l'onglet ouvert : **Project Settings** → **Data API** (Project URL) et **API Keys** (Publishable key `sb_publishable_…`).

---

## C. Google : la clé pour trouver les commerces

1. **console.cloud.google.com** → connecte-toi → en haut, sélecteur de projet → **Nouveau projet** → nom `soso-studio` → **Créer**.
2. Menu ☰ → **Facturation** → associe un compte de facturation (carte bancaire). Google ne prélève rien tant que tu restes sous les 1 000 recherches gratuites du mois.
3. **Alerte de budget** (conseillé) : **Facturation** → **Budgets et alertes** → **Créer un budget** → 5 € → alertes à 50 %, 90 %, 100 %.
4. Active l'API : barre de recherche en haut → **Places API (New)** → **Activer**.
5. Crée la clé : **API et services** → **Identifiants** → **Créer des identifiants** → **Clé API**. Copie-la.
6. Protège-la : clique sur la clé → **Restrictions relatives aux API** → **Restreindre la clé** → coche seulement **Places API (New)** → **Enregistrer**.

Ne colle jamais cette clé dans le chat : elle va seulement dans Vercel (partie D).

---

## D. Vercel : mettre l'appli en ligne (nouveau projet)

1. **vercel.com** → **Add New…** → **Project** → à côté de `soso-studio`, **Import**.
   (S'il n'apparaît pas : **Adjust GitHub App Permissions** → autorise `soso-studio`.)
2. **Environment Variables**, ajoute ces 4 lignes :

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL Supabase (B.5) |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key Supabase (B.5) |
   | `ALLOWED_EMAIL` | l'e-mail du compte créé en B.3 |
   | `GOOGLE_PLACES_API_KEY` | la clé Google (C.5) |

3. **Deploy** → tu obtiens une adresse `soso-studio-xxxx.vercel.app`.
4. Supabase → **Authentication** → **URL Configuration** → **Site URL** : colle cette adresse → **Save**.

Sur ton téléphone : ouvre l'adresse → **Partager** → **Sur l'écran d'accueil**.

---

## Test de l'étape 1

1. Connecte-toi. **Réglages** : mets ton prénom → Enregistrer. « Ta journée » doit dire « Bonjour, … ».
2. **Carte** : Coiffeurs + Centre → **Chercher**. Des points apparaissent sur Lille, avec la liste à côté.
3. Filtre **Sans site** → clique un commerce → **＋ À contacter**.
4. **Clients** : il est dans « À contacter ». Ouvre sa fiche, clique « 📞 Appelé » : il passe à « Contacté ». Mets une relance « Demain ».
5. **Ta journée** : l'appel apparaît dans « Fait aujourd'hui ». Demain, la relance apparaîtra dans tes tâches.
