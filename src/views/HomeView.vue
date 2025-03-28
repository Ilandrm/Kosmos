<template>
  <div class="home">
    <div class="stars-bg"></div>
    <div class="container">
      <header class="header">
        <h1 class="neon-text">Démarrez l'expérience</h1>
        <p class="subtitle">Une expérience spatiale immersive</p>
      </header>
      
      <div class="start-container">
        <button @click="startSequence" class="start-btn">Commencer</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function startSequence() {
  // Afficher la consigne puis rediriger vers le premier jeu
  const message = "Bienvenue à bord l'équipage, vous allez effectuer plusieurs missions qui vont se succéder. Lisez bien les consignes, l'avenir de la planète K dépend de votre réussite.\n\nLe temps est compté, soyez efficaces."
  if (document.fullscreenEnabled) {
  const element = document.querySelector('.kosmos-app');
  element?.requestFullscreen();
  }
  // Redirect to the mission introduction view
  router.push({ name: 'mission-introduction' });
  

}
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

.start-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 2rem;
}

.start-btn {
  padding: 1.5rem 3rem;
  font-size: 1.8rem;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 0 20px rgba(61, 154, 255, 0.6);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: bold;
}

.start-btn:hover {
  background-color: #5ab0ff;
  transform: scale(1.05);
  box-shadow: 0 0 30px rgba(61, 154, 255, 0.8);
}
</style>
