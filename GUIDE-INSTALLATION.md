# Guide d'installation — à faire une seule fois

Tout est gratuit. Compte environ 20 minutes. Fais les parties dans l'ordre.

---

## A. GitHub : sauvegarder le code

1. Va sur **github.com** → **Sign up** → crée ton compte (e-mail, mot de passe, nom d'utilisateur) et valide le code reçu par e-mail.
2. Crée un dépôt vide : en haut à droite **+** → **New repository**
   - Repository name : `mes-boutiques`
   - Coche **Private**
   - Ne coche rien d'autre → **Create repository**
3. Autorise Claude à y déposer le code : ouvre **https://claude.ai/connect-github**, connecte ton compte GitHub et installe l'application Claude sur le dépôt `mes-boutiques`.
4. Envoie-moi ton **nom d'utilisateur GitHub** dans le chat. Je dépose le code.

---

## B. Supabase : la base de données

1. Va sur **supabase.com** → **Start your project** → connecte-toi **avec GitHub**.
2. **New project**
   - Name : `mes-boutiques`
   - Database password : clique sur **Generate** et garde-le dans un coin (tu n'en auras normalement pas besoin)
   - Region : **Europe (Paris)** ou la plus proche
   - → **Create new project**, puis attends 1 à 2 minutes.
3. Crée les tables :
   - Sur GitHub, ouvre ton dépôt `mes-boutiques` → dossier `supabase` → fichier `schema.sql` → bouton **Copy raw file** (icône de copie).
   - Dans Supabase, menu de gauche **SQL Editor** → **New query** → colle → **Run**.
   - Tu dois voir **Success. No rows returned**.
4. Crée ton compte de connexion :
   - Menu **Authentication** → **Users** → **Add user** → **Create new user**
   - Ton e-mail + un mot de passe solide, coche **Auto Confirm User** → **Create user**.
5. Ferme la porte aux inconnus :
   - **Authentication** → **Sign In / Providers** → désactive **Allow new users to sign up** → **Save**.
6. Garde cet onglet ouvert : à l'étape C, tu auras besoin de deux valeurs qui se trouvent dans **Project Settings** (roue crantée) :
   - **Project URL** (dans **Data API**), qui ressemble à `https://abcd1234.supabase.co`
   - **Publishable key** (dans **API Keys**), qui commence par `sb_publishable_…`

   Inutile de me les envoyer : tu les colles directement dans Vercel.

---

## C. Vercel : mettre l'appli en ligne

1. Va sur **vercel.com** → **Sign Up** → choisis **Hobby** → **Continue with GitHub**.
2. **Add New…** → **Project** → à côté de `mes-boutiques`, clique **Import**.
   (Si le dépôt n'apparaît pas : **Adjust GitHub App Permissions** → autorise `mes-boutiques`.)
3. Ouvre **Environment Variables** et ajoute ces 3 lignes (Key → Value) :

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | ta Project URL Supabase |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ta Publishable key Supabase |
   | `ALLOWED_EMAIL` | l'e-mail du compte créé en B.4 |

4. **Deploy** → après 1 à 2 minutes, tu obtiens une adresse du type `mes-boutiques-xxxx.vercel.app`.
5. Dans Supabase → **Authentication** → **URL Configuration** → **Site URL** : colle cette adresse → **Save**.

Ouvre l'adresse sur ton téléphone. Astuce : « Partager » → **Sur l'écran d'accueil**, et l'appli s'ouvre comme une vraie application.
