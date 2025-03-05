<template>
  <div class="constellation-game-container">
    <div class="stars" ref="starsContainer"></div>
    <div ref="threeContainer" class="three-container"></div>
    
    <div class="game-ui" v-if="!gameOver">
      <div class="score-container">
        <span>Constellations complétées: {{ completedConstellations }} / {{ totalConstellations }}</span>
      </div>
      
      <div class="instructions" v-if="showInstructions">
        <h2>Puzzle des Constellations</h2>
        <p>Connectez les étoiles dans le bon ordre pour former les constellations.</p>
        <p>Cliquez sur les étoiles dans l'ordre correct pour tracer les lignes entre elles.</p>
        <button class="start-btn" @click="startGame">Commencer</button>
      </div>
      
      <div class="constellation-name" v-if="currentConstellation && !showInstructions">
        <h2>{{ currentConstellation.name }}</h2>
      </div>
    </div>

    <div v-else class="victory-message">
      <h2>Félicitations !</h2>
      <p>Vous avez complété toutes les constellations !</p>
      <button class="restart-btn" @click="restartGame">Recommencer</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'

// Définition des types
interface Star {
  id: number
  x: number
  y: number
  radius: number
  element?: HTMLDivElement
  isClicked: boolean
}

interface Connection {
  startStar: number
  endStar: number
  element?: HTMLDivElement
}

interface Constellation {
  name: string
  stars: Star[]
  connections: Connection[]
  completed: boolean
}

// Référence au conteneur d'étoiles
const starsContainer = ref<HTMLElement | null>(null)

// États du jeu
const showInstructions = ref(true)
const gameOver = ref(false)
const currentConstellationIndex = ref(0)
const completedConstellations = ref(0)
const selectedStars = ref<number[]>([])

// Définition des constellations
const constellations = ref<Constellation[]>([
  {
    name: "Grande Ourse",
    stars: [
      { id: 1, x: 15, y: 20, radius: 4, isClicked: false },
      { id: 2, x: 28, y: 25, radius: 4, isClicked: false },
      { id: 3, x: 40, y: 30, radius: 4, isClicked: false },
      { id: 4, x: 52, y: 40, radius: 4, isClicked: false },
      { id: 5, x: 65, y: 30, radius: 4, isClicked: false },
      { id: 6, x: 75, y: 45, radius: 4, isClicked: false },
      { id: 7, x: 60, y: 55, radius: 4, isClicked: false }
    ],
    connections: [
      { startStar: 1, endStar: 2 },
      { startStar: 2, endStar: 3 },
      { startStar: 3, endStar: 4 },
      { startStar: 4, endStar: 5 },
      { startStar: 5, endStar: 6 },
      { startStar: 6, endStar: 7 }
    ],
    completed: false
  },
  {
    name: "Orion",
    stars: [
      { id: 1, x: 50, y: 15, radius: 5, isClicked: false },
      { id: 2, x: 40, y: 25, radius: 3, isClicked: false },
      { id: 3, x: 60, y: 25, radius: 3, isClicked: false },
      { id: 4, x: 30, y: 40, radius: 4, isClicked: false },
      { id: 5, x: 50, y: 50, radius: 4, isClicked: false },
      { id: 6, x: 70, y: 40, radius: 4, isClicked: false },
      { id: 7, x: 40, y: 70, radius: 3, isClicked: false },
      { id: 8, x: 60, y: 70, radius: 3, isClicked: false }
    ],
    connections: [
      { startStar: 1, endStar: 2 },
      { startStar: 1, endStar: 3 },
      { startStar: 2, endStar: 4 },
      { startStar: 2, endStar: 5 },
      { startStar: 3, endStar: 6 },
      { startStar: 3, endStar: 5 },
      { startStar: 5, endStar: 7 },
      { startStar: 5, endStar: 8 }
    ],
    completed: false
  },
  {
    name: "Cassiopée",
    stars: [
      { id: 1, x: 20, y: 30, radius: 4, isClicked: false },
      { id: 2, x: 35, y: 20, radius: 4, isClicked: false },
      { id: 3, x: 50, y: 30, radius: 4, isClicked: false },
      { id: 4, x: 65, y: 20, radius: 4, isClicked: false },
      { id: 5, x: 80, y: 30, radius: 4, isClicked: false }
    ],
    connections: [
      { startStar: 1, endStar: 2 },
      { startStar: 2, endStar: 3 },
      { startStar: 3, endStar: 4 },
      { startStar: 4, endStar: 5 }
    ],
    completed: false
  }
])

// Propriétés calculées
const totalConstellations = constellations.value.length
const currentConstellation = ref<Constellation | null>(null)

// Fonction pour initialiser le jeu
function startGame() {
  showInstructions.value = false
  gameOver.value = false
  completedConstellations.value = 0
  currentConstellationIndex.value = 0
  selectedStars.value = []
  
  // Réinitialiser toutes les constellations
  constellations.value.forEach(constellation => {
    constellation.completed = false
    constellation.stars.forEach(star => {
      star.isClicked = false
    })
  })
  
  currentConstellation.value = constellations.value[currentConstellationIndex.value]
  renderConstellation()
}

// Fonction pour redémarrer le jeu
function restartGame() {
  clearConstellation()
  startGame()
}

// Fonction pour nettoyer la constellation actuelle
function clearConstellation() {
  if (!starsContainer.value) {
    console.error('Impossible de nettoyer: container manquant')
    return
  }
  
  try {
    // Récupérer tous les éléments enfants
    const children = Array.from(starsContainer.value.children)
    console.log(`Nettoyage de ${children.length} éléments dans le container`)
    
    // Supprimer chaque élément individuellement
    children.forEach(child => {
      starsContainer.value.removeChild(child)
    })
    
    // Vérifier que le container est bien vide
    if (starsContainer.value.childElementCount > 0) {
      console.warn(`Le container a encore ${starsContainer.value.childElementCount} enfants après nettoyage`)
      // Forcer le nettoyage complet
      starsContainer.value.innerHTML = ''
    }
  } catch (error) {
    console.error('Erreur lors du nettoyage du container:', error)
    // Tenter de réinitialiser par innerHtml comme solution de secours
    starsContainer.value.innerHTML = ''
  }
}

// Fonction pour afficher la constellation actuelle
function renderConstellation() {
  if (!starsContainer.value || !currentConstellation.value) {
    console.error('Impossible de rendre la constellation: container ou constellation manquant')
    return
  }
  
  console.log('Rendu de la constellation:', currentConstellation.value.name, 'avec', currentConstellation.value.stars.length, 'étoiles')
  
  // Nettoyer le container avant d'ajouter de nouveaux éléments
  clearConstellation()
  
  // Forçons la visibilité du container principal
  if (starsContainer.value.parentElement) {
    starsContainer.value.parentElement.style.display = 'block'
    starsContainer.value.style.display = 'block'
    starsContainer.value.style.visibility = 'visible'
    starsContainer.value.style.zIndex = '100'
    starsContainer.value.style.position = 'relative'
  }
  
  try {
    // Créer les étoiles
    currentConstellation.value.stars.forEach(star => {
      // Créer un élément étoile
      const starElement = document.createElement('div')
      
      // Appliquer la classe et les attributs par défaut
      starElement.classList.add('constellation-star')
      starElement.setAttribute('data-id', star.id.toString())
      
      // Appliquer un style direct pour s'assurer qu'il est visible
      const size = Math.max(star.radius * 2, 12) // Taille minimale augmentée
      starElement.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${star.x}%;
        top: ${star.y}%;
        background-color: #fff;
        border-radius: 50%;
        box-shadow: 0 0 10px 3px rgba(255, 255, 255, 0.8), 0 0 20px 6px rgba(100, 180, 255, 0.6);
        cursor: pointer;
        z-index: 10;
      `
      
      // Ajouter un événement de clic
      starElement.addEventListener('click', () => handleStarClick(star))
      
      // Stocker la référence à l'élément DOM
      star.element = starElement
      
      // Ajouter l'étoile au container
      starsContainer.value.appendChild(starElement)
      
      // Vérifier que l'étoile a bien été ajoutée au DOM
      if (!starElement.parentNode) {
        console.error(`L'étoile ${star.id} n'a pas pu être ajoutée au DOM`)
      }
    })
    
    // Débug: vérifier que les étoiles ont bien été ajoutées
    console.log('Nombre d\'enfants dans le container:', starsContainer.value.childElementCount)
  } catch (error) {
    console.error('Erreur lors du rendu de la constellation:', error)
  }
}

// Fonction pour gérer le clic sur une étoile
function handleStarClick(star: Star) {
  if (!currentConstellation.value || star.isClicked) return
  
  // Ajouter l'étoile à la sélection
  selectedStars.value.push(star.id)
  star.isClicked = true
  
  if (star.element) {
    star.element.classList.add('clicked')
  }
  
  // Vérifier si nous avons deux étoiles pour créer une connexion
  if (selectedStars.value.length >= 2) {
    const startStar = selectedStars.value[selectedStars.value.length - 2]
    const endStar = selectedStars.value[selectedStars.value.length - 1]
    
    // Vérifier si la connexion est valide
    const isValidConnection = currentConstellation.value.connections.some(
      conn => (conn.startStar === startStar && conn.endStar === endStar) || 
             (conn.startStar === endStar && conn.endStar === startStar)
    )
    
    if (isValidConnection) {
      createConnection(startStar, endStar)
    } else {
      // Réinitialiser si la connexion n'est pas valide
      resetSelection()
      return
    }
    
    // Vérifier si toutes les connexions sont faites
    checkCompletion()
  }
}

// Fonction pour créer une connexion visuelle entre deux étoiles
function createConnection(startStarId: number, endStarId: number) {
  if (!currentConstellation.value || !starsContainer.value) return
  
  const startStar = currentConstellation.value.stars.find(s => s.id === startStarId)
  const endStar = currentConstellation.value.stars.find(s => s.id === endStarId)
  
  if (!startStar || !endStar) return
  
  const lineElement = document.createElement('div')
  lineElement.classList.add('constellation-line')
  
  // Calculer la position et la rotation de la ligne
  const x1 = startStar.x
  const y1 = startStar.y
  const x2 = endStar.x
  const y2 = endStar.y
  
  const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
  const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI
  
  lineElement.style.width = `${length}%`
  lineElement.style.left = `${x1}%`
  lineElement.style.top = `${y1}%`
  lineElement.style.transformOrigin = '0 0'
  lineElement.style.transform = `rotate(${angle}deg)`
  
  starsContainer.value.appendChild(lineElement)
}

// Fonction pour réinitialiser la sélection
function resetSelection() {
  if (!currentConstellation.value) return
  
  selectedStars.value = []
  
  currentConstellation.value.stars.forEach(star => {
    star.isClicked = false
    if (star.element) {
      star.element.classList.remove('clicked')
    }
  })
  
  // Supprimer toutes les lignes
  if (starsContainer.value) {
    const lines = starsContainer.value.querySelectorAll('.constellation-line')
    lines.forEach(line => line.remove())
  }
}

// Fonction pour vérifier si la constellation est complétée
function checkCompletion() {
  if (!currentConstellation.value) return
  
  // Vérifier si toutes les connexions sont faites
  const allConnectionsMade = currentConstellation.value.connections.every(conn => {
    return selectedStars.value.includes(conn.startStar) && 
           selectedStars.value.includes(conn.endStar)
  })
  
  if (allConnectionsMade) {
    // Marquer comme terminé et passer à la suivante
    currentConstellation.value.completed = true
    completedConstellations.value++
    
    setTimeout(() => {
      moveToNextConstellation()
    }, 1000)
  }
}

// Fonction pour passer à la constellation suivante
function moveToNextConstellation() {
  currentConstellationIndex.value++
  selectedStars.value = []
  
  if (currentConstellationIndex.value >= constellations.value.length) {
    gameOver.value = true
    return
  }
  
  currentConstellation.value = constellations.value[currentConstellationIndex.value]
  renderConstellation()
}

// Création d'arrière-plan d'étoiles
function createBackgroundStars() {
  if (!starsContainer.value) return
  
  const starCount = 100
  
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div')
    star.classList.add('background-star')
    
    const size = 0.5 + Math.random() * 2
    const opacity = 0.4 + Math.random() * 0.6
    
    star.style.width = `${size}px`
    star.style.height = `${size}px`
    star.style.left = `${Math.random() * 100}%`
    star.style.top = `${Math.random() * 100}%`
    star.style.opacity = String(opacity)
    star.style.animationDelay = `-${Math.random() * 5}s`
    
    starsContainer.value.appendChild(star)
  }
}

// Fonction pour initialiser le DOM
function initDom() {
  // Vérifier si le starsContainer est déjà accessible
  if (!starsContainer.value) {
    console.error('Container d\'<div> manquant!')
    return false
  }
  
  // Créer un div de débogage pour vérifier que l'insertion d'<div> fonctionne
  const testDiv = document.createElement('div')
  testDiv.style.position = 'absolute'
  testDiv.style.width = '20px'
  testDiv.style.height = '20px'
  testDiv.style.backgroundColor = 'red'
  testDiv.style.top = '10px'
  testDiv.style.left = '10px'
  testDiv.style.zIndex = '1000'
  testDiv.setAttribute('data-test', 'test-div')
  starsContainer.value.appendChild(testDiv)
  
  // Vérifier si l'<div> a bien été ajouté
  const addedDiv = starsContainer.value.querySelector('[data-test="test-div"]')
  if (!addedDiv) {
    console.error('Impossible d\'ajouter des éléments au container')
    return false
  }
  
  // Nettoyer le div de test
  starsContainer.value.removeChild(addedDiv)
  return true
}

// Cycle de vie du composant
onMounted(() => {
  console.log('Composant monté - Initialisation')
  
  // Créer le fond d'étoiles
  createBackgroundStars()
  
  // S'assurer que les constellations sont correctement initialisées
  if (constellations.value.length > 0) {
    currentConstellation.value = constellations.value[0]
    console.log('Constellation initiale sélectionnée:', currentConstellation.value.name)
  } else {
    console.error('Aucune constellation disponible!')
  }
  
  // Ajouter un délai initial puis réessayer régulièrement jusqu'à ce que le rendu fonctionne
  let attempts = 0
  const maxAttempts = 5
  
  const tryRender = () => {
    attempts++
    console.log(`Tentative de rendu ${attempts}/${maxAttempts}`)
    
    if (initDom()) {
      console.log('DOM initialisé avec succès')
      renderConstellation()
    } else if (attempts < maxAttempts) {
      console.log(`Nouvelle tentative dans 300ms (${attempts}/${maxAttempts})...`)
      setTimeout(tryRender, 300)
    } else {
      console.error('Impossible de rendre la constellation après plusieurs essais')
    }
  }
  
  // Démarrer les tentatives de rendu avec un délai initial
  setTimeout(tryRender, 300)
})

onUnmounted(() => {
  clearConstellation()
})

// Observer les changements d'état
watch(showInstructions, (newValue) => {
  if (!newValue) {
    renderConstellation()
  }
})
</script>

<style scoped>
.constellation-game-container {
  height: 100vh;
  width: 100%;
  margin: 0;
  padding: 0;
  font-family: 'Orbitron', sans-serif;
  color: white;
  background: 
    radial-gradient(circle at 50% 50%, rgba(10, 10, 40, 0.7) 0%, transparent 70%),
    radial-gradient(circle at 80% 20%, rgba(20, 20, 75, 0.5) 0%, transparent 50%),
    linear-gradient(45deg, #000428 0%, #000a3a 50%, #00105c 100%);
  position: relative;
  overflow: hidden;
}

.stars {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.background-star {
  position: absolute;
  background-color: white;
  border-radius: 50%;
  animation: twinkle 3s infinite;
}

.constellation-star {
  position: absolute;
  background-color: white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 3;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
  transition: all 0.3s;
}

.constellation-star:hover {
  background-color: #aaffff;
  box-shadow: 0 0 15px rgba(170, 255, 255, 1);
}

.constellation-star.clicked {
  background-color: #AAAAFF;
  box-shadow: 0 0 15px #AAAAFF;
}

.constellation-line {
  position: absolute;
  height: 1px;
  background-color: rgba(170, 170, 255, 0.7);
  z-index: 2;
  box-shadow: 0 0 8px rgba(170, 170, 255, 0.9);
}

.game-ui {
  position: relative;
  height: 100vh;
  width: 100%;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}

.score-container {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 10, 30, 0.7);
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid rgba(170, 170, 255, 0.5);
}

.instructions {
  background: rgba(0, 10, 30, 0.8);
  border: 2px solid rgba(170, 170, 255, 0.7);
  border-radius: 10px;
  padding: 30px;
  max-width: 600px;
  text-align: center;
  margin-top: 20vh;
}

.constellation-name {
  margin-top: 30px;
  text-align: center;
}

.victory-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 10, 30, 0.8);
  border: 2px solid rgba(170, 170, 255, 0.7);
  border-radius: 10px;
  padding: 30px;
  text-align: center;
  min-width: 300px;
  z-index: 20;
}

.start-btn, .restart-btn {
  background: linear-gradient(45deg, #14144b, #1a1a6c);
  color: white;
  border: 2px solid #AAAAFF;
  border-radius: 5px;
  padding: 10px 20px;
  font-family: 'Orbitron', sans-serif;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 20px;
  transition: all 0.3s;
}

.start-btn:hover, .restart-btn:hover {
  background: #AAAAFF;
  color: #000;
}

h2 {
  color: #AAAAFF;
  margin-bottom: 20px;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
</style>
