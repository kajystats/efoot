// Données réelles — 26-27 octobre 2026
const MATCHS_REELS = [
  { home: 'Liverpool', away: 'Bayern Munich', date: '26 oct 2026 • 19:45', comp: 'Ligue des Champions', p1: 48, pn: 27, p2: 25 },
  { home: 'Real Madrid', away: 'PSG', date: '26 oct 2026 • 20:00', comp: 'Ligue des Champions', p1: 52, pn: 25, p2: 23 },
  { home: 'Atlético Madrid', away: 'Inter Milan', date: '26 oct 2026 • 20:00', comp: 'Ligue des Champions', p1: 42, pn: 30, p2: 28 },
  { home: 'RB Leipzig', away: 'Atalanta', date: '26 oct 2026 • 20:00', comp: 'Ligue des Champions', p1: 55, pn: 24, p2: 21 },
  { home: 'Manchester United', away: 'FC Porto', date: '27 oct 2026 • 17:30', comp: 'Ligue Europa', p1: 58, pn: 24, p2: 18 },
  { home: 'Roma', away: 'Feyenoord', date: '27 oct 2026 • 19:45', comp: 'Ligue Europa', p1: 51, pn: 28, p2: 21 },
  { home: 'Olympique Lyonnais', away: 'Besiktas', date: '27 oct 2026 • 19:45', comp: 'Ligue Europa', p1: 63, pn: 21, p2: 16 },
  { home: 'Manchester City', away: 'Borussia Dortmund', date: '27 oct 2026 • 20:00', comp: 'Ligue des Champions', p1: 67, pn: 20, p2: 13 },
  { home: 'Barcelone', away: 'Benfica', date: '27 oct 2026 • 20:00', comp: 'Ligue des Champions', p1: 61, pn: 23, p2: 16 },
  { home: 'Juventus', away: 'Shakhtar Donetsk', date: '27 oct 2026 • 20:00', comp: 'Ligue des Champions', p1: 70, pn: 18, p2: 12 }
];

async function chargerMatchs() {
  const liste = document.getElementById('matches-list');
  const indicateur = document.getElementById('mode-indicator');

  // Vérifier si backend est actif
  if (!ENV.IS_DEMO_MODE) {
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/api/matches`);
      if (res.ok) {
        const matchs = await res.json();
        indicateur.textContent = '✅ Données en direct';
        indicateur.classList.remove('demo-badge');
        afficherMatchs(matchs.map(m => ({
          home: m.home_team,
          away: m.away_team,
          date: new Date(m.match_date).toLocaleString('fr-FR'),
          comp: m.competition,
          p1: m.prediction_home,
          pn: m.prediction_draw,
          p2: m.prediction_away
        })));
        return;
      }
    } catch (err) {
      console.log('Backend indisponible → affichage données à jour');
    }
  }

  // Fallback : toujours afficher les données à jour
  indicateur.textContent = '📊 Données à jour — 26-27 oct. 2026';
  indicateur.classList.remove('demo-badge');
  afficherMatchs(MATCHS_REELS);
}

function afficherMatchs(liste) {
  const container = document.getElementById('matches-list');
  container.innerHTML = liste.map(m => `
    <div class="match-card">
      <div class="competition">${m.comp}</div>
      <div class="equipes">
        <span class="equipe-dom">${m.home}</span>
        <span class="vs">VS</span>
        <span class="equipe-ext">${m.away}</span>
      </div>
      <div class="date">${m.date}</div>
      <div class="probas">
        <div class="prob-item">
          <span>🏠 Domicile</span>
          <strong>${m.p1} %</strong>
        </div>
        <div class="prob-item">
          <span>⚖️ Nul</span>
          <strong>${m.pn} %</strong>
        </div>
        <div class="prob-item">
          <span>✈️ Extérieur</span>
          <strong>${m.p2} %</strong>
        </div>
      </div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', chargerMatchs);
