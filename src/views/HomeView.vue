<template>
  <div class="home">
    <div class="stars-bg"></div>
    <div class="container">
      <header class="header">
        <h1 class="neon-text">KOSMOS</h1>
        <p class="subtitle">Une expérience spatiale immersive</p>
      </header>
      
      <div class="games-grid">
        <!-- Jeu d'Évitement d'Astéroïdes 3D -->
        <div class="game-card panel game-3d">
          <h2>Évitement d'Astéroïdes 3D</h2>
          <p>Découvrez une nouvelle dimension! Pilotez votre vaisseau dans l'espace en 3D et évitez les astéroïdes qui arrivent de toutes les directions.</p>
          <div class="duration">60 secondes</div>
          <RouterLink to="/games/asteroid-dodge-3d" class="btn play-btn btn-3d">Jouer en 3D</RouterLink>
        </div>

        <!-- Jeu du Télescope 2D -->
        <div class="game-card panel telescope-game">
          <h2>Explorateur Spatial</h2>
          <p>Utilisez votre télescope pour repérer et identifier des planètes colorées dans l'espace. Trouvez toutes les planètes pour compléter la mission!</p>
          <div class="duration">Sans limite</div>
          <RouterLink to="/games/telescope" class="btn play-btn telescope-btn">Explorer</RouterLink>
        </div>
        
        <!-- Jeu de Chasse aux Aliens 3D -->
        <div class="game-card panel game-3d alien-game">
          <h2>Chasse aux Aliens 3D</h2>
          <p>Chassez les vaisseaux aliens violets dans un univers spatial en 3D. Attention aux vaisseaux verts!</p>
          <div class="duration">Sans limite</div>
          <RouterLink to="/games/alien-hunt-3d" class="btn play-btn btn-3d">Chasser</RouterLink>
        </div>
        
        <!-- Jeu de Labyrinthe Spatial 3D -->
        <div class="game-card panel maze-game game-3d">
          <h2>Labyrinthe Spatial 3D</h2>
          <p>Pilotez votre vaisseau à travers un labyrinthe d'astéroïdes en 3D pour atteindre la planète violette.</p>
          <div class="duration">Sans limite</div>
          <RouterLink to="/games/maze-3d" class="btn play-btn btn-3d maze-btn">Naviguer</RouterLink>
        </div>
        
      
        <!-- Quiz Koesio -->
        <div class="game-card panel quiz-game">
          <h2>Quiz Koesio</h2>
          <p>Testez vos connaissances sur Koesio et l'espace dans ce quiz interactif aux questions variées.</p>
          <div class="duration">Sans limite</div>
          <RouterLink to="/games/koesio-quiz" class="btn play-btn quiz-btn">Répondre</RouterLink>
        </div>
        
        <!-- Lien vers le jeu Pendu Spatial -->
        <div class="game-card panel">
          <h2>Pendu Spatial</h2>
          <p>Devinez les mots liés à l'espace pour gagner!</p>
          <div class="duration">Sans limite</div>
          <RouterLink to="/games/space-hangman" class="btn play-btn">Jouer au Pendu Spatial</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.stars-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    radial-gradient(2px 2px at 20px 30px, #eee, rgba(0,0,0,0)),
    radial-gradient(2px 2px at 40px 70px, #fff, rgba(0,0,0,0)),
    radial-gradient(2px 2px at 50px 160px, #ddd, rgba(0,0,0,0)),
    radial-gradient(2px 2px at 90px 40px, #fff, rgba(0,0,0,0)),
    radial-gradient(2px 2px at 130px 80px, #fff, rgba(0,0,0,0)),
    radial-gradient(2px 2px at 160px 120px, #ddd, rgba(0,0,0,0));
  background-repeat: repeat;
  background-size: 200px 200px;
  animation: rotate 300s linear infinite;
  opacity: 0.3;
  z-index: -1;
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.header {
  text-align: center;
  margin-bottom: 3rem;
  padding: 2rem 0;
}

.header h1 {
  font-size: 4rem;
  margin-bottom: 0.5rem;
  letter-spacing: 0.15em;
  font-weight: 900;
  color: var(--primary-color);
}

.subtitle {
  font-size: 1.5rem;
  color: var(--text-dim);
  letter-spacing: 0.1em;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.game-card {
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.game-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 0 30px rgba(61, 154, 255, 0.4);
}

.game-card h2 {
  color: var(--primary-color);
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.game-card p {
  flex-grow: 1;
  margin-bottom: 1.5rem;
}

.duration {
  background-color: rgba(61, 154, 255, 0.2);
  padding: 0.5rem;
  border-radius: 0.25rem;
  display: inline-block;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  color: var(--primary-color);
}

.play-btn {
  align-self: flex-start;
  width: 100%;
  text-align: center;
}

.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.disabled:hover {
  transform: none;
  box-shadow: none;
}

.disabled .play-btn {
  background-color: var(--text-dim);
  box-shadow: none;
  cursor: not-allowed;
}

/* Styles pour le jeu 3D */
.panel.game-3d {
  background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
  border: 1px solid #4fc3f7;
  box-shadow: 0 0 15px rgba(79, 195, 247, 0.6);
}

.btn-3d {
  background-color: #3d7aff;
  box-shadow: 0 0 10px rgba(61, 122, 255, 0.8);
}

.btn-3d:hover {
  background-color: #5a8fff;
  box-shadow: 0 0 15px rgba(61, 122, 255, 1);
}

/* Styles pour les jeux de télescope */
.telescope-game {
  background: linear-gradient(135deg, #0a1721, #0d2430, #1a3a4a);
  border: 1px solid #00d1ff;
  box-shadow: 0 0 15px rgba(0, 209, 255, 0.4);
}

.alien-game {
  background: linear-gradient(135deg, #190a29, #2b0d51, #3d1a70);
  border: 1px solid #b090ff;
  box-shadow: 0 0 15px rgba(176, 144, 255, 0.4);
}

.maze-game {
  background: linear-gradient(135deg, #002040, #003a66, #00588f);
  border: 1px solid #00d1ff;
  box-shadow: 0 0 15px rgba(0, 209, 255, 0.4);
}

.star-collector-game {
  background: linear-gradient(135deg, #2a0a28, #5a0d44, #8a1a62);
  border: 1px solid #ff6eb4;
  box-shadow: 0 0 15px rgba(255, 110, 180, 0.6);
}

.quiz-game {
  background: linear-gradient(135deg, #002040, #003a66, #00588f);
  border: 1px solid #00d1ff;
  box-shadow: 0 0 15px rgba(0, 209, 255, 0.4);
}

.maze-btn {
  background-color: #00588f;
}

.constellation-btn {
  background-color: #4040aa;
}

.quiz-btn {
  background-color: #00588f;
}

.telescope-btn {
  background-color: #00a5cc;
  box-shadow: 0 0 10px rgba(0, 209, 255, 0.6);
}

.telescope-btn:hover {
  background-color: #00d1ff;
  box-shadow: 0 0 15px rgba(0, 209, 255, 0.9);
}

.telescope-game-3d {
  border: 1px solid #00d1ff;
}
</style>
