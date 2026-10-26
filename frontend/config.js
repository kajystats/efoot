// Configuration EFOOT — EURO FOOTBALL INTELLIGENCE

// 🔧 Mode démo actif si aucune URL backend n'est configurée
const ENV = {
  // Remplace par l'URL de ton backend sans slash final
  // Exemple : 'https://efoot-backend.onrender.com'
  API_BASE_URL: '',

  // Chemin de base pour GitHub Pages
  // Si ton dépôt = kajystats.github.io/efoot/ → mettre '/efoot/'
  // Si page utilisateur (racine) → mettre '/'
  BASE_PATH: '/efoot/',

  // Mode démo automatique si backend absent
  get IS_DEMO_MODE() {
    return !this.API_BASE_URL || this.API_BASE_URL.trim() === '';
  },

  // Paramètres de l'application
  APP_NAME: 'EURO FOOTBALL INTELLIGENCE',
  VERSION: '1.0.0',

  // API-Football (clé à configurer côté backend uniquement)
  API_FOOTBALL_HOST: 'v3.football.api-sports.io'
};
