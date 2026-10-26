# EURO FOOTBALL INTELLIGENCE

Site de pronostics et d'analyse football, conçu pour :
- **Frontend statique** publiable gratuitement sur GitHub Pages.
- **Backend Node.js/Express** séparé, déployable sur Render, Railway ou un serveur Node compatible.
- **PostgreSQL** pour conserver les matchs, prédictions et résultats.
- **API-Football** comme fournisseur initial optionnel de données.
- Tâches planifiées via `node-cron` côté backend.

> Important : GitHub Pages ne lance ni serveur Node.js, ni PostgreSQL, ni tâches planifiées. Le frontend peut être publié seul, mais les données réelles et l'automatisation nécessitent de déployer/configurer le backend, la base et une clé API. L'interface indique clairement lorsqu'elle utilise les données d'exemple.

## Contenu

- `frontend/` : site responsive statique, pages via URL hash pour compatibilité GitHub Pages.
- `backend/` : API Express, connexion PostgreSQL, intégration API-Football et tâches planifiées.
- `database/schema.sql` : structure de base.
- `.github/workflows/pages.yml` : publication automatique du frontend sur GitHub Pages.
- `backend/.env.example` : variables à configurer (ne jamais mettre les vraies clés dans GitHub).

## Publier le frontend sur GitHub Pages

1. Crée un dépôt GitHub, par exemple `euro-football-intelligence`.
2. Téléverse le contenu de ce dossier à la racine du dépôt.
3. Dans GitHub : **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Le workflow `pages.yml` publiera le contenu de `frontend/`.
5. Ouvre l'URL affichée dans Settings → Pages.

Les pages sont accessibles avec des liens partageables du type `/#/match/fixture-101`, compatibles avec GitHub Pages.

## Activer les données réelles

1. Crée une base PostgreSQL chez Supabase ou un fournisseur compatible.
2. Exécute `database/schema.sql` dans l'éditeur SQL de la base.
3. Déploie le dossier `backend/` sur un hébergeur Node.js.
4. Configure les variables du backend à partir de `backend/.env.example`.
5. Ajoute une clé API-Football valide dans `API_FOOTBALL_KEY`.
6. Dans `frontend/config.js`, remplace `API_BASE_URL` par l'URL publique du backend, sans `/` final.
7. Redéploie le frontend sur GitHub.

## Démarrer le backend localement

Prérequis : Node.js 20+ et PostgreSQL.

```bash
cd backend
cp .env.example .env
npm install
npm start
```

Le backend écoute sur `http://localhost:3000`. Vérifie `http://localhost:3000/api/health`.

## Limites et précautions

- Les données affichées dans l'interface sans backend configuré sont des **exemples de démonstration**, pas des pronostics réels.
- La couverture, les quotas, les blessures, les compositions et les statistiques disponibles dépendent du fournisseur et du forfait souscrit.
- Les prédictions sont des estimations probabilistes, jamais des garanties.
- Le backend d'exemple synchronise les rencontres à venir et conserve les prédictions enregistrées; adapte les compétitions et la fréquence aux quotas de ton fournisseur.
- Les tâches `node-cron` fonctionnent seulement si le processus backend est démarré et que l'hébergeur ne le met pas en veille.
- Ne publie jamais `.env`, une clé API ou un mot de passe.
