# Mes boutiques

Tableau de bord pour gérer plusieurs boutiques Vinted : ventes (lues automatiquement dans les e-mails),
bordereaux, compta, fiches rédigées par Claude avec photos portées, prévisions, tâches du jour,
notifications et connecteur pour Claude / Cowork.

> Outil indépendant, non affilié à Vinted. Aucun robot ni accès à Vinted : les données viennent des e-mails reçus.

## Pages
| Page | Rôle |
|---|---|
| `/aujourdhui` | Tâches du jour à cocher (actions directes), chiffres du jour |
| `/` | Tableau de bord : 3 cartes, prévision du mois, courbes, classement des comptes, dernières ventes |
| `/ventes` | Ventes et bordereaux, impression groupée |
| `/fiches` | Fiches produits, « ✨ Créer avec Claude » (texte + photos portées en arrière-plan) |
| `/compta` | Mois par mois, export CSV / PDF |
| `/analyses` | Marges, délais de vente, catégories, fiches qui dorment |
| `/boutiques` | Carte d'identité (avatar, fond, sol, prompt photo), objectifs, notifications, synchro e-mails |
| `/decouvrir` | Page de présentation publique |

## Variables d'environnement (Vercel → Settings → Environment Variables)
| Nom | Rôle |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Connexion à Supabase |
| `ALLOWED_EMAIL` | Seule adresse autorisée à se connecter |
| `SUPABASE_SECRET_KEY` | Accès serveur (connecteur, synchro, tâches planifiées) |
| `MCP_TOKEN` | Clé du connecteur `/api/mcp/<MCP_TOKEN>` et des tâches planifiées |
| `ICLOUD_EMAIL`, `ICLOUD_APP_PASSWORD` | Lecture (seule) de la boîte iCloud |
| `ANTHROPIC_API_KEY` (+ `ANTHROPIC_MODEL` facultatif) | Lecture des e-mails et rédaction des fiches |
| `OPENAI_API_KEY` (+ `OPENAI_IMAGE_MODEL`, `OPENAI_IMAGE_QUALITY` facultatifs) | Photos portées |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Notifications sur le téléphone |

Après tout ajout ou changement de variable : **Deployments → ⋯ → Redeploy**.

## Base de données (Supabase → SQL Editor)
`supabase/schema.sql` contient **tout** (on peut le relancer sans risque).
Les fichiers `correctif-*.sql` sont les mêmes ajouts, découpés étape par étape.

## Tâches planifiées (Supabase, extension pg_cron)
| Fichier | Quand | Rôle |
|---|---|---|
| `supabase/synchro-toutes-les-15-min.sql` | toutes les 15 min | Lit les nouveaux e-mails Vinted (Claude n'est payé que pour les nouveaux) |
| `supabase/taches-chaque-matin.sql` | 8 h | Prépare les tâches du jour et envoie la notification (gratuit) |

Voir les tâches : `select * from cron.job;` — en supprimer une : `select cron.unschedule('nom');`

## Développement
```bash
npm install
cp .env.example .env.local   # puis remplir
npm run dev
```
