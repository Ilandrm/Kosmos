<template>
  <div class="mission-introduction">
    <div class="stars-bg"></div>
    <div class="content">
      <h1>Bienvenue à bord!</h1>
      <div class="message">
        {{ missionMessage }}
      </div>
      <router-link to="/games/asteroid-dodge-3d" class="continue-btn">Continuer vers le jeu</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const missionMessage = ref("Bienvenue à bord l'équipage, vous allez effectuer plusieurs missions qui vont se succéder. Lisez bien les consignes, l'avenir de la planète K dépend de votre réussite.\n\nLe temps est compté, soyez efficaces.");
</script>

<style scoped>
.mission-introduction {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  background-color: #050a2f;
  padding: 2rem;
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

.content {
  background-color: rgba(0, 0, 50, 0.7);
  padding: 3rem;
  border-radius: 20px;
  box-shadow: 0 0 30px rgba(61, 154, 255, 0.4);
  text-align: center;
  max-width: 800px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

h1 {
  color: #8af7ff;
  font-size: 3rem;
  margin-bottom: 2rem;
  text-shadow: 0 0 10px #00ffff, 0 0 20px #0000ff;
}

.message {
  font-size: 1.5rem;
  line-height: 1.8;
  margin-bottom: 2rem;
  white-space: pre-line;
  color: #ffffff;
  padding: 1.5rem;
  background-color: rgba(0, 0, 100, 0.3);
  border-radius: 10px;
  border: 1px solid rgba(61, 154, 255, 0.3);
}

.continue-btn {
  padding: 1rem 2rem;
  font-size: 1.2rem;
  background-color: #3d9aff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  margin-top: 1rem;
  display: inline-block;
}

.continue-btn:hover {
  background-color: #5ab0ff;
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(61, 154, 255, 0.7);
}
</style>
