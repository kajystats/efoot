// Configuration EFOOT — EURO FOOTBALL INTELLIGENCE

// 🔧 Mode démo actif si aucune URL backend n'est configurée
const ENV = {
  // URL de ton backend — mets celle que tu as déployée
  // Exemple ci-dessous : remplace par ta vraie URL sans slash final
  API_BASE_URL: 'https://ton-backend.onrender.com',

  BASE_PATH: '/efoot/',

  get IS_DEMO_MODE() {
    return !this.API_BASE_URL || this.API_BASE_URL.trim() === '';
  },

  APP_NAME: 'EURO FOOTBALL INTELLIGENCE',
  VERSION: '1.0.0',
  API_FOOTBALL_HOST: 'v3.football.api-sports.io'
};
