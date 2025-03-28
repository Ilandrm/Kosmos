<template>
  <div class="alien-hunt-container">
    <div 
      ref="gameContainer" 
      class="game-canvas-container"
    ></div>
    <!-- reste du template inchangé -->
    <GameInstruction
        v-if="showInstructions"
        :title="gameInstructions.title"
        :players="gameInstructions.players"
        :time="gameInstructions.time"
        :instruction="gameInstructions.instruction"
        @start="onInstructionComplete"
      />
    
      
      <div v-if="gameState === 'victory'" class="victory">
        <h1>VICTOIRE!</h1>
        <p>Temps: {{ formattedTime }}</p>
        <button @click="continueToNextGame" class="continue-btn">Continuer</button>
      </div>
      
      <div v-if="gameState === 'game-over'" class="game-over">
        <h1>Mission Accomplie!</h1>
        <p>Temps: {{ formattedTime }}</p>
        <button @click="continueToNextGame" class="continue-btn">Continuer</button>
      </div>
    
    <!-- Game HUD -->
    <div v-if="gameState === 'playing'" class="game-hud">
      <div class="timer">Temps: {{ formattedTime }}</div>
    </div>
    
 
<!-- Cannon controls -->
<div 
  v-for="(cannon, index) in cannons" 
  :key="index"
  class="cannon" 
  :class="[ {'active': selectedCannon === index, 'reloading': !cannon.canShoot}]"
  :style="{
    left: `${index === 0 ? 30 : index === 1 ? 70 : index === 2 ? 30 : 70}%`,
    top: `${index < 2 ? 'auto' : '0'}`,
    bottom: `${index < 2 ? '0' : 'auto'}`,
    transform: `rotate(${cannon.rotation}deg) ${index >= 2 ? 'rotate(180deg)' : ''}`,
    borderColor: cannon.color
  }"
  @mousedown="selectCannon(index, $event)"
  @touchstart.prevent="selectCannonTouch(index, $event)"
>
  <div class="cannon-base" :style="{ backgroundColor: cannon.color }"></div>
  <div class="cannon-barrel" :style="{ backgroundColor: cannon.color }"></div>
  <div v-if="!cannon.canShoot" class="reload-indicator" :style="{ borderColor: cannon.color }"></div>
</div>

   <!-- Aim Tracers - un par canon -->
   <div 
      v-for="(cannon, index) in cannons" 
      :key="'tracer-'+index"
      v-if="cannon && cannon.isAiming && gameState === 'playing'" 
      class="aim-tracer" 
      :style="{
        left: cannon.aimPosition.x + 'px',
        top: cannon.aimPosition.y + 'px',
        transform: `translate(-50%, -50%)`,
        backgroundColor: cannon.color,
        boxShadow: `0 0 8px 2px ${cannon.color}`
      }">
      <div class="aim-tracer-inner"></div>
    </div>


    <!-- Player Names -->
    
  </div>

</template>


<script lang="ts">
import { defineComponent, ref, computed, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { useRouter } from 'vue-router';
import GameFlowService from '../../services/GameFlowService';
import GameInstruction from '../../components/GameInstruction.vue';

// Peut-être d'autres imports nécessaires

export default defineComponent({
  name: 'AlienHunt3DGame',
  components: {
    GameInstruction
  },
  setup() {
    const router = useRouter();
    // En haut de votre setup()
    const activeTouches = ref<{[identifier: number]: {
  cannonIndex: number,
  touchId: number
}}>({});
    // État du jeu
    const gameState = ref('menu'); // 'menu', 'playing', 'victory', 'game-over'
    const gameTime = ref(0);
    const gameTimer = ref<number | null>(null);
    const score = ref(0);
    
    // Formatage du temps
    const formattedTime = computed(() => {
      const minutes = Math.floor(gameTime.value / 60);
      const seconds = gameTime.value % 60;
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    });
    
    // Gestion des canons et joueurs
    const playerColors = ['#FF5252', '#4CAF50', '#2196F3', '#FFC107'];
    const playerNames = ['Joueur Rouge', 'Joueur Vert', 'Joueur Bleu', 'Joueur Jaune'];
    
    // Gestion des canons - tous les joueurs peuvent jouer en même temps
    const cannons = ref([
      { rotation: 0, color: '#FF5252', isAiming: false, canShoot: true, aimPosition: { x: 0, y: 0 }, aimRotation: 0 },
      { rotation: 0, color: '#4CAF50', isAiming: false, canShoot: true, aimPosition: { x: 0, y: 0 }, aimRotation: 0 },
      { rotation: 0, color: '#2196F3', isAiming: false, canShoot: true, aimPosition: { x: 0, y: 0 }, aimRotation: 0 },
      { rotation: 0, color: '#FFC107', isAiming: false, canShoot: true, aimPosition: { x: 0, y: 0 }, aimRotation: 0 }
    ]);
    
    // Canon sélectionné actuellement par l'utilisateur
    const selectedCannon = ref(-1);
    
    // Références aux éléments DOM
    const gameContainer = ref<HTMLElement | null>(null);
    
    // Variables Three.js
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let controls: OrbitControls;
    let animationFrameId: number;
    let raycaster: THREE.Raycaster;
    
    // Entités du jeu
    let alienShips: THREE.Object3D[] = [];
    let friendlyShips: THREE.Object3D[] = [];
    let bullets: THREE.Object3D[] = [];
    let stars: THREE.Points;
    let tracers: THREE.Object3D[] = [];
    let cannonsObjects: THREE.Object3D[] = [];
    
    // Modèle 3D OVNI
    let ovniModel: THREE.Group | null = null;
    const ovniScale = 0.8; // Échelle pour correspondre à la taille des soucoupes originales
    
    // Variables du gameplay
    const maxAliens = 20; // Increased from 10
    const maxFriendlyShips = 7; // Increased from 5
    const alienSpawnTime = 1500; // ms - Decreased from 2000
    const friendlySpawnTime = 3000; // ms
    const bulletSpeed = 0.5;
    const shipSpeed = 0.05;
    const shipSpawnRange = 20;
    const winScore = 20; // Increased from 10
    
    // Timers et contrôles
    let alienSpawnTimer: number | null = null;
    let friendlySpawnTimer: number | null = null;
    const mouse = new THREE.Vector2();
    let mouseDown = false;
    let canShoot = true;
    const shootCooldown = 700; // ms - Increased from 500ms for 4-player game
    const showInstructions = ref(true);
    const gameInstructions = ref({
      title: "Chasses aux aliens",
      players: "4 joueurs",
      time: "30 secondes",
      instruction: "Visez les vaisseaux violets et évitez les vaisseaux verts"
    });
    // État des objets
    interface ShipData {
      speed: THREE.Vector3;
      health: number;
      value: number;
    }
    
    interface BulletData {
      speed: THREE.Vector3;
      health: number;
      value: number;
      playerIndex: number;
    }
    
    interface TracerData {
      player: number;
      timeToLive: number;
    }
    
    const objectData = new WeakMap<THREE.Object3D, ShipData | BulletData | TracerData>();
    
    // Fonction pour sélectionner un canon
    function selectCannon(index: number, event: MouseEvent) {
      // Vérifier si le canon peut tirer
      if (!cannons.value[index].canShoot) {
        return; // Canon en recharge
      }
      
      selectedCannon.value = index;
      cannons.value[index].isAiming = true;
      
      // Créer un tracer immédiatement pour le feedback visuel
      if (scene && cannonsObjects[index]) {
        const angle = cannons.value[index].rotation;
        createTracer(index, angle);
      }
      
      // Initialiser la position de visée avec RequestAnimationFrame pour suivi fluide
      updateAimRotation(index, event);
      
      // Ajouter les écouteurs d'événements pour le mouvement et le relâchement
      const handleMove = (e: MouseEvent) => handleAiming(index, e);
      const handleRelease = (e: MouseEvent) => {
        // Tirer dans la direction où l'utilisateur relâche
        handleShoot(index);
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleRelease);
        window.removeEventListener('mouseleave', handleMouseLeave);
        
        // Arrêter le suivi de la souris pour ce canon
        stopMouseTracking(index);
      };
      
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleRelease);
      
      // Ajouter un événement mouseleave pour gérer le cas où la souris quitte la fenêtre
      const handleMouseLeave = () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleRelease);
        window.removeEventListener('mouseleave', handleMouseLeave);
        
        // Annuler le visage et arrêter le suivi
        cannons.value[index].isAiming = false;
        selectedCannon.value = -1;
        stopMouseTracking(index);
      };
      
      window.addEventListener('mouseleave', handleMouseLeave);
    }
    function selectCannonTouch(index: number, event: TouchEvent) {
  event.preventDefault();
  
  // Check if cannon can shoot
  if (!cannons.value[index].canShoot) return;
  
  // Get the touch that triggered this event
  if (event.touches.length === 0) return;
  
  // Find the touch that triggered this event
  const touch = event.changedTouches[0];
  const touchId = touch.identifier;
  
  // Store this touch as controlling this cannon
  activeTouches.value[touchId] = {
    cannonIndex: index,
    touchId: touchId
  };
  
  // Update cannon state
  cannons.value[index].isAiming = true;
  selectedCannon.value = index;  // Make sure to select this cannon
  
  // Set initial aim position
  updateAimRotationTouch(index, touch);
  
  // Initial tracer
  createTracer(index, cannons.value[index].rotation);
  
  // Add touch event listeners
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd);
  document.addEventListener('touchcancel', handleTouchEnd);
}

function handleTouchMove(event: TouchEvent) {
  event.preventDefault();
  
  // Process each changed touch
  for (let i = 0; i < event.changedTouches.length; i++) {
    const touch = event.changedTouches[i];
    const touchId = touch.identifier;
    
    // Check if this touch is controlling a cannon
    if (activeTouches.value[touchId]) {
      const cannonIndex = activeTouches.value[touchId].cannonIndex;
      
      // Update aiming for this cannon
      updateAimRotationTouch(cannonIndex, touch);
      
      // Update tracer
      updateTracer(cannonIndex, cannons.value[cannonIndex].aimRotation);
    }
  }
}

function handleTouchEnd(event: TouchEvent) {
  // Process each changed touch
  for (let i = 0; i < event.changedTouches.length; i++) {
    const touch = event.changedTouches[i];
    const touchId = touch.identifier;
    
    // Check if this touch was controlling a cannon
    if (activeTouches.value[touchId]) {
      const cannonIndex = activeTouches.value[touchId].cannonIndex;
      
      // Fire the cannon
      handleShoot(cannonIndex);
      
      // Clear the aiming state
      cannons.value[cannonIndex].isAiming = false;
      if (selectedCannon.value === cannonIndex) {
        selectedCannon.value = -1;
      }
      
      // Remove this touch from active touches
      delete activeTouches.value[touchId];
    }
  }
  
  // If no more active touches, remove event listeners
  if (Object.keys(activeTouches.value).length === 0) {
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    document.removeEventListener('touchcancel', handleTouchEnd);
  }
}

function updateTracer(cannonIndex, angle) {
  // Remove old tracers for this cannon
  for (let i = tracers.length - 1; i >= 0; i--) {
    const tracer = tracers[i];
    const data = objectData.get(tracer) as TracerData;
    if (data && data.player === cannonIndex) {
      scene.remove(tracer);
      tracers.splice(i, 1);
    }
  }
  
  // Create a new tracer
  createTracer(cannonIndex, angle);
}

    function onInstructionComplete() {
      showInstructions.value = false;
      startGame();
    };
    // Fonction pour gérer le mouvement de la souris pendant le visage
    function handleAiming(cannonIndex: number, event: MouseEvent) {
      if (!cannons.value[cannonIndex].isAiming) return;
      
      // Utiliser notre système de suivi fluide pour une mise à jour plus fluide
      updateAimRotation(cannonIndex, event);
      
      // Mettre à jour le tracer pour montrer la direction de tir
      // Supprimer les anciens tracers de ce canon
      for (let i = tracers.length - 1; i >= 0; i--) {
        const tracer = tracers[i];
        const data = objectData.get(tracer) as TracerData;
        if (data && data.player === cannonIndex) {
          scene.remove(tracer);
          tracers.splice(i, 1);
        }
      }
      
      // Créer un nouveau tracer dans la direction actuelle
      const angle = cannons.value[cannonIndex].aimRotation;
      createTracer(cannonIndex, angle);
    }
    
    // Fonction pour gérer le mouvement tactile pendant le visage
    function handleAimingTouch(cannonIndex: number, event: TouchEvent) {
      event.preventDefault(); // Empêcher le défilement
      
      if (!cannons.value[cannonIndex].isAiming) return;
      
      // Utiliser le premier toucher
      const touch = event.touches[0];
      
      // Mettre à jour la rotation avec les coordonnées tactiles
      updateAimRotationTouch(cannonIndex, touch);
      
      // Mettre à jour le tracer pour montrer la direction de tir
      // Supprimer les anciens tracers de ce canon
      for (let i = tracers.length - 1; i >= 0; i--) {
        const tracer = tracers[i];
        const data = objectData.get(tracer) as TracerData;
        if (data && data.player === cannonIndex) {
          scene.remove(tracer);
          tracers.splice(i, 1);
        }
      }
      
      // Créer un nouveau tracer dans la direction actuelle
      const angle = cannons.value[cannonIndex].aimRotation;
      createTracer(cannonIndex, angle);
    }
    
    // Variables pour le suivi fluide de la souris
    let mouseMoveCallbacks = new Map(); // Pour suivre les callbacks par canon
    let lastMousePosition = { x: 0, y: 0 }; // Dernière position de la souris
    let isMouseUpdateRunning = false; // Indicateur pour éviter les mises à jour redondantes
    let requestAnimationId = null; // Pour le suivi fluide de la souris

    // Fonction pour calculer l'angle de rotation - version ultra fluide avec RAF
    function updateAimRotation(cannonIndex: number, event: MouseEvent) {
      if (cannonIndex < 0 || cannonIndex >= cannons.value.length) return;
      
      // Mettre à jour la dernière position de la souris
      lastMousePosition = {
        x: event.clientX,
        y: event.clientY
      };
      
      // Stockage de la position exacte de la souris pour le viseur
      cannons.value[cannonIndex].aimPosition = {
        x: event.clientX,
        y: event.clientY
      };
      
      // Créer ou mettre à jour la fonction de mise à jour pour ce canon
      const updateFunction = () => {
        // Position fixe des canons en bas de l'écran
       // Position des canons - les deux premiers en bas, les deux derniers en haut
const cannonPositions = [
  { x: window.innerWidth * 0.3, y: window.innerHeight - 50 }, // Bottom left
  { x: window.innerWidth * 0.7, y: window.innerHeight - 50 }, // Bottom right
  { x: window.innerWidth * 0.3, y: 50 },                     // Top left
  { x: window.innerWidth * 0.7, y: 50 }                      // Top right
];
        
        const cannonPos = cannonPositions[cannonIndex];
        
        // Calculer l'angle entre le canon et la dernière position de la souris
        // Calculer l'angle entre le canon et la dernière position de la souris
const dx = lastMousePosition.x - cannonPos.x;
let dy;

// Inverser la direction Y pour les canons du haut (index 2 et 3)
if (cannonIndex < 2) {
  // Bottom cannons
  dy = cannonPos.y - lastMousePosition.y; // Y decreases upward
} else {
  // Top cannons
  dy = lastMousePosition.y - cannonPos.y; // Y increases downward for top cannons
}

const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        // Limiter l'angle pour que le canon ne puisse pas tirer vers le bas
        const clampedAngle = Math.min(Math.max(angle, 0), 180);
        
        // Application directe sans lissage pour une réponse immédiate
        cannons.value[cannonIndex].rotation = clampedAngle - 90;
        
        // Mettre à jour la rotation du tracer
        cannons.value[cannonIndex].aimRotation = angle;
        
        // Appliquer immédiatement à l'objet 3D
        if (cannonIndex < cannonsObjects.length) {
          const cannon = cannonsObjects[cannonIndex];
          if (cannon && cannon.children && cannon.children.length > 1) {
            const rotationRadians = (clampedAngle - 90) * (Math.PI / 180);
            cannon.children[1].rotation.z = rotationRadians;
          }
        }
      };
      
      // Stocker le callback pour ce canon
      mouseMoveCallbacks.set(cannonIndex, updateFunction);
      
      // Exécuter immédiatement la première mise à jour
      updateFunction();
      
      // Démarrer la boucle de mise à jour si ce n'est pas déjà fait
      startMouseTracking();
    }
    
    // Fonction pour calculer l'angle de rotation à partir d'un événement tactile
    function updateAimRotationTouch(cannonIndex: number, touch: Touch) {
      if (cannonIndex < 0 || cannonIndex >= cannons.value.length) return;
      
      // Mettre à jour la dernière position tactile
      lastMousePosition = {
        x: touch.clientX,
        y: touch.clientY
      };
      
      // Stockage de la position exacte du toucher pour le viseur
      cannons.value[cannonIndex].aimPosition = {
        x: touch.clientX,
        y: touch.clientY
      };
      
      // Créer ou mettre à jour la fonction de mise à jour pour ce canon
      const updateFunction = () => {
        // Position fixe des canons en bas de l'écran
      const cannonPositions = [
  { x: window.innerWidth * 0.3, y: window.innerHeight - 50 }, // Bottom left
  { x: window.innerWidth * 0.7, y: window.innerHeight - 50 }, // Bottom right
  { x: window.innerWidth * 0.3, y: 50 },                     // Top left
  { x: window.innerWidth * 0.7, y: 50 }                      // Top right
];
        
        const cannonPos = cannonPositions[cannonIndex];
        
        // Calculer l'angle entre le canon et la position tactile
        // Calculer l'angle entre le canon et la dernière position de la souris
const dx = lastMousePosition.x - cannonPos.x;
let dy;

// Inverser la direction Y pour les canons du haut (index 2 et 3)
if (cannonIndex < 2) {
  // Bottom cannons
  dy = cannonPos.y - lastMousePosition.y; // Y decreases upward
} else {
  // Top cannons
  dy = lastMousePosition.y - cannonPos.y; // Y increases downward for top cannons
}

const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        // Limiter l'angle pour que le canon ne puisse pas tirer vers le bas
        const clampedAngle = Math.min(Math.max(angle, 0), 180);
        
        // Application directe sans lissage pour une réponse immédiate
        cannons.value[cannonIndex].rotation = clampedAngle - 90;
        
        // Mettre à jour la rotation du tracer
        cannons.value[cannonIndex].aimRotation = angle;
        
        // Appliquer immédiatement à l'objet 3D
        if (cannonIndex < cannonsObjects.length) {
          const cannon = cannonsObjects[cannonIndex];
          if (cannon && cannon.children && cannon.children.length > 1) {
            const rotationRadians = (clampedAngle - 90) * (Math.PI / 180);
            cannon.children[1].rotation.z = rotationRadians;
          }
        }
      };
      
      // Stocker le callback pour ce canon
      mouseMoveCallbacks.set(cannonIndex, updateFunction);
      
      // Exécuter immédiatement la première mise à jour
      updateFunction();
      
      // Démarrer la boucle de mise à jour si ce n'est pas déjà fait
      startMouseTracking();
    }
    
    // Fonction pour démarrer le suivi fluide de la souris
    function startMouseTracking() {
      if (isMouseUpdateRunning) return;
      
      isMouseUpdateRunning = true;
      
      // Fonction de boucle d'animation pour un suivi ultra fluide
      const animateMouseTracking = () => {
        // Exécuter toutes les callbacks de mise à jour
        mouseMoveCallbacks.forEach(callback => callback());
        
        // Continuer la boucle si au moins un canon est en mode visée
        if (mouseMoveCallbacks.size > 0) {
          requestAnimationId = requestAnimationFrame(animateMouseTracking);
        } else {
          isMouseUpdateRunning = false;
        }
      };
      
      // Démarrer la boucle d'animation
      requestAnimationId = requestAnimationFrame(animateMouseTracking);
    }
    
    // Fonction pour arrêter le suivi de la souris pour un canon spécifique
    function stopMouseTracking(cannonIndex: number) {
      mouseMoveCallbacks.delete(cannonIndex);
      
      // Si plus aucun canon n'est suivi, arrêter la boucle d'animation
      if (mouseMoveCallbacks.size === 0 && requestAnimationId) {
        cancelAnimationFrame(requestAnimationId);
        isMouseUpdateRunning = false;
      }
    }
    
    // Fonction pour tirer - appelée lors du relâchement du clic
    function handleShoot(cannonIndex: number) {
      if (!cannons.value[cannonIndex].isAiming) return;
      
      // Récupérer l'angle de rotation au moment du relâchement pour un tir précis
      const angle = cannons.value[cannonIndex].aimRotation;
      
      // Désactiver le mode de visée
      cannons.value[cannonIndex].isAiming = false;
      
      // Créer un effet visuel de tir (éclair, flash, etc.)
      if (cannonsObjects[cannonIndex]) {
        const cannon = cannonsObjects[cannonIndex];
        // Ajouter un effet d'éclair au canon
        if (cannon.children.length > 1) {
          const barrel = cannon.children[1];
          if (barrel.material) {
            // Sauvegarder l'état original
            const originalEmissive = barrel.material.emissive ? barrel.material.emissive.clone() : new THREE.Color(0);
            const originalEmissiveIntensity = barrel.material.emissiveIntensity || 0;
            
            // Appliquer un flash
            barrel.material.emissive = new THREE.Color(0xffffff);
            barrel.material.emissiveIntensity = 1;
            
            // Revenir à l'état normal après un court délai
            setTimeout(() => {
              if (barrel.material) {
                barrel.material.emissive = originalEmissive;
                barrel.material.emissiveIntensity = originalEmissiveIntensity;
              }
            }, 100);
          }
        }
      }
      
      // Créer la balle en fonction de l'angle de tir au moment du relâchement
      shootFromCannon(cannonIndex);
      
      // Nettoyer les tracers de visée pour ce canon
      for (let i = tracers.length - 1; i >= 0; i--) {
        const tracer = tracers[i];
        const data = objectData.get(tracer) as TracerData;
        if (data && data.player === cannonIndex) {
          scene.remove(tracer);
          tracers.splice(i, 1);
        }
      }
      
      // Désactiver le tir pour ce canon pendant le temps de recharge
      cannons.value[cannonIndex].canShoot = false;
      setTimeout(() => {
        cannons.value[cannonIndex].canShoot = true;
      }, shootCooldown);
      
      // Désélectionner le canon
      if (selectedCannon.value === cannonIndex) {
        selectedCannon.value = -1;
      }
      
      // Arrêter explicitement le suivi de la souris pour ce canon
      stopMouseTracking(cannonIndex);
    }
    
    // Fonction pour créer et afficher le tracer de visée
    function createTracer(cannonIndex: number, angle: number) {
      // Créer une ligne pour représenter le traceur - ligne plus nette et plus visible
      const tracerGeometry = new THREE.BufferGeometry();
      
      // Utiliser un matériau de ligne plus visible
      const tracerMaterial = new THREE.LineBasicMaterial({
        color: 0xFFFFFF, // Blanc lumineux pour une meilleure visibilité
        linewidth: 3, // Largeur de ligne maximale supportée par WebGL
        opacity: 1.0,
        transparent: false
      });
      
      // Appliquer la couleur du joueur comme une teinte
      const playerColor = new THREE.Color(playerColors[cannonIndex]);
      tracerMaterial.color.lerp(playerColor, 0.7); // Mélange de blanc et de la couleur du joueur
      
      // Récupérer la position du canon
      const cannon = cannonsObjects[cannonIndex];
      const cannonPos = new THREE.Vector3();
      cannon.getWorldPosition(cannonPos);
      
      // Récupérer la position de la souris
      const mousePos = cannons.value[cannonIndex].aimPosition;
      
      // Créer un vecteur depuis la position de la souris sur l'écran
      const mouse = new THREE.Vector2(
        (mousePos.x / window.innerWidth) * 2 - 1,
        -(mousePos.y / window.innerHeight) * 2 + 1
      );
      
      // Utiliser le raycaster pour projeter un rayon depuis la position de la souris
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      
      // Calculer la direction à partir du rayon (plus précis pour viser en 3D)
      const rayDirection = raycaster.ray.direction.clone();
      
      // Calculer l'angle en radians
      const angleRadians = angle * (Math.PI / 180);
      
      // Créer une direction hybride qui mélange le raycaster et l'angle calculé
      const direction = new THREE.Vector3(
        rayDirection.x * 0.7 + Math.cos(angleRadians) * 0.3,
        rayDirection.y * 0.7 + Math.sin(angleRadians) * 0.3,
        rayDirection.z * 0.7 - 0.3
      ).normalize();
      
      // Ajuster la longueur du traceur
      const length = 50;
      direction.multiplyScalar(length);
      
      // Calculer le point final
      const endPosition = cannonPos.clone().add(direction);
      
      // Créer une ligne droite simple avec seulement deux points - plus propre
      const positions = new Float32Array(6); // Seulement deux points (début et fin) pour une ligne parfaitement droite
      
      // Point de départ (position du canon)
      positions[0] = cannonPos.x;
      positions[1] = cannonPos.y;
      positions[2] = cannonPos.z;
      
      // Point d'arrivée
      positions[3] = endPosition.x;
      positions[4] = endPosition.y;
      positions[5] = endPosition.z;
      
      tracerGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const tracer = new THREE.Line(tracerGeometry, tracerMaterial);
      
      // Ajouter un léger effet de lueur
      tracer.material.emissive = new THREE.Color(playerColors[cannonIndex]);
      tracer.material.emissiveIntensity = 0.7;
      
      // Sauvegarder les données du traceur
      objectData.set(tracer, {
        player: cannonIndex,
        timeToLive: 15 // Durée de vie un peu plus courte pour éviter les confusions
      } as TracerData);
      
      // Ajouter un point plus visible à l'extrémité pour mieux visualiser la destination
      const endPointGeometry = new THREE.SphereGeometry(0.4, 12, 12); // Légèrement plus grand et plus détaillé
      
      // Utiliser MeshPhongMaterial qui supporte l'émissivité pour un effet lumineux
      const endPointMaterial = new THREE.MeshPhongMaterial({
        color: 0xFFFFFF, // Blanc lumineux pour une meilleure visibilité
        specular: 0xFFFFFF,
        shininess: 100,
        emissive: new THREE.Color(playerColors[cannonIndex]),
        emissiveIntensity: 0.7
      });
      
      const endPoint = new THREE.Mesh(endPointGeometry, endPointMaterial);
      endPoint.position.copy(endPosition);
      
      // Grouper le tracer et le point d'extrémité
      const tracerGroup = new THREE.Group();
      tracerGroup.add(tracer);
      tracerGroup.add(endPoint);
      
      // Sauvegarder les mêmes données pour le groupe
      objectData.set(tracerGroup, {
        player: cannonIndex,
        timeToLive: 15
      } as TracerData);
      
      scene.add(tracerGroup);
      tracers.push(tracerGroup);
      
      return tracerGroup;
    }
    
    // Fonction pour mettre à jour les traceurs
    function updateTracers() {
      for (let i = tracers.length - 1; i >= 0; i--) {
        const tracer = tracers[i];
        const data = objectData.get(tracer) as TracerData;
        
        if (data) {
          data.timeToLive--;
          
          // Si ce traceur est lié à un canon en cours de visée, le garder complètement visible
          const cannonIsAiming = cannons.value[data.player]?.isAiming || false;
          
          if (cannonIsAiming) {
            // Garder la ligne de visée bien visible
            if (tracer instanceof THREE.Group) {
              tracer.children.forEach(child => {
                if (child.material) {
                  child.material.opacity = 1.0;
                }
              });
            } else if (tracer.material) {
              tracer.material.opacity = 1.0;
            }
          } else {
            // Faire disparaître progressivement les traceurs qui ne sont pas actifs
            if (tracer instanceof THREE.Group) {
              // Gérer les éléments du groupe
              tracer.children.forEach(child => {
                if (child.material) {
                  child.material.opacity = data.timeToLive / 15;
                }
              });
            } else if (tracer.material) {
              // Cas simple pour les tracers qui ne sont pas dans un groupe
              tracer.material.opacity = data.timeToLive / 15;
            }
          }
          
          // Supprimer le traceur s'il a expiré ou si le joueur n'est plus en train de viser
          if (data.timeToLive <= 0 || !cannons.value[data.player].isAiming) {
            scene.remove(tracer);
            tracers.splice(i, 1);
          }
        }
      }
    }
    
    // Méthodes du jeu
    function initializeGame() {
      if (!gameContainer.value) return;
      
      // Initialiser la scène
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000020);
      
      // Initialiser la caméra
      camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      camera.position.set(0, 0, 15);
      
      // Initialiser le rendu
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      
      // Configurations pour éviter les problèmes de z-fighting
      renderer.sortObjects = true;
      const logDepthBuf = true;
      if (logDepthBuf) {
        renderer.capabilities.logarithmicDepthBuffer = true;
      }
      
      // Ajouter le rendu au DOM
      if (gameContainer.value.firstChild) {
        gameContainer.value.removeChild(gameContainer.value.firstChild);
      }
      gameContainer.value.appendChild(renderer.domElement);
      
      // Ajouter de l'éclairage
      const ambientLight = new THREE.AmbientLight(0x404040, 1);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(5, 10, 7.5);
      scene.add(directionalLight);
      
      // Initialiser le raycaster pour la détection des clics
      raycaster = new THREE.Raycaster();
      
      // Créer le fond avec des étoiles
      createStars();
      
      // Créer les cannons 3D
      createCannons();
      
      // Charger le modèle 3D OVNI
      loadOvniModel();
      
      // Réinitialiser le score et les vaisseaux
      score.value = 0;
      selectedCannon.value = -1;
      
      // Ajouter des vaisseaux (après un délai pour s'assurer que le modèle est chargé)
      setTimeout(() => {
        scheduleAlienSpawning();
        scheduleFriendlySpawning();
      }, 1000);
    }
    
    function createCannons() {
  // Créer 4 cannons 3D, 2 en bas et 2 en haut de l'écran
  cannonsObjects = [];
  
  for (let i = 0; i < 4; i++) {
    const cannonGroup = new THREE.Group();
    
    // Base du canon
    const baseGeometry = new THREE.CylinderGeometry(1, 1.5, 0.5, 16);
    const baseMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color(playerColors[i]),
      shininess: 50
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    
    // Canon (tube)
    const barrelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
    const barrelMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      shininess: 70
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI / 2; // Orienter le canon horizontalement
    barrel.position.set(0, 0.5, 0.5); // Positionner au-dessus de la base
    
    // Ajouter les éléments au groupe
    cannonGroup.add(base);
    cannonGroup.add(barrel);
    
    // Positionner le canon
    const x = (i % 2 === 0 ? -3 : 3); // Positionner les canons plus près du centre
    const y = (i < 2 ? -5 : 5); // Deux canons en bas, deux en haut
    
    cannonGroup.position.set(x, y, 10);
    
    // Orienter les canons du haut vers le bas
    if (i >= 2) {
      cannonGroup.rotation.z = Math.PI; // Retourner les canons du haut
    }
    
    // Ajouter le canon à la scène
    scene.add(cannonGroup);
    cannonsObjects.push(cannonGroup);
  }
}
    
    function createStars() {
      const starsGeometry = new THREE.BufferGeometry();
      const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1,
      });
      
      const starsVertices = [];
      for (let i = 0; i < 1000; i++) {
        const x = THREE.MathUtils.randFloatSpread(100);
        const y = THREE.MathUtils.randFloatSpread(100);
        const z = THREE.MathUtils.randFloatSpread(100) - 50; // Place mainly behind
        starsVertices.push(x, y, z);
      }
      
      starsGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(starsVertices, 3)
      );
      
      stars = new THREE.Points(starsGeometry, starsMaterial);
      scene.add(stars);
    }
    
    // Fonction pour charger le modèle 3D OVNI
    function loadOvniModel() {
      const loader = new GLTFLoader();
      
      // Essayer plusieurs chemins d'accès possibles au modèle
      const paths = [
        './Créer_un_ovni_0306092554_texture (1).glb',
        '/src/games/alien-hunt-3d/Créer_un_ovni_0306092554_texture (1).glb',
        '../alien-hunt-3d/Créer_un_ovni_0306092554_texture (1).glb'
      ];
      
      let pathIndex = 0;
      
      const tryLoadModel = () => {
        if (pathIndex >= paths.length) {
          return;
        }
        
        
        loader.load(
          // URL du modèle
          paths[pathIndex],
          // Callback appelé quand le modèle est chargé
          function (gltf) {
            ovniModel = gltf.scene;
            
           
            
            // Mettre à l'échelle le modèle à une taille appropriée
            ovniModel.scale.set(ovniScale, ovniScale, ovniScale);
            
            // Ajouter un matériau émissif violet pour le faire briller
            ovniModel.traverse((node) => {
              if (node.isMesh) {
                // Conserver la texture mais ajouter une couleur émissive
                node.material.emissive = new THREE.Color(0x330066);
                node.material.emissiveIntensity = 0.5;
              }
            });
            
            // Cacher le modèle original (utilisé comme template)
            ovniModel.visible = false;
            
            // Créer un vaisseau test pour vérifier le modèle
            createAlienShip();
          },
          // Callback de progression du chargement
          function (xhr) {
          },
          // Callback d'erreur
          function (error) {
            pathIndex++;
            tryLoadModel(); // Essayer le prochain chemin
          }
        );
      };
      
      // Lancer le chargement du modèle
      tryLoadModel();
    }
    
    function createAlienShip() {
      // Si le modèle 3D n'est pas chargé, créer une soucoupe simple de secours
      if (!ovniModel) {
        // Créer un groupe pour le vaisseau alien (backup)
        const ship = new THREE.Group();
        
        // Corps principal - soucoupe
        const bodyGeometry = new THREE.SphereGeometry(0.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const bodyMaterial = new THREE.MeshPhongMaterial({
          color: 0x9933ff,
          emissive: 0x330066,
          shininess: 50,
        });
        
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.scale.set(1, 0.4, 1);
        ship.add(body);
        
        // Partie supérieure - dôme
        const domeGeometry = new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMaterial = new THREE.MeshPhongMaterial({
          color: 0xb090ff,
          transparent: true,
          opacity: 0.7,
          shininess: 100,
        });
        
        const dome = new THREE.Mesh(domeGeometry, domeMaterial);
        dome.position.set(0, 0.2, 0);
        ship.add(dome);
        
        // Lumières du vaisseau
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const lightGeometry = new THREE.SphereGeometry(0.1, 8, 8);
          const lightMaterial = new THREE.MeshPhongMaterial({
            color: 0xff33ee, 
            emissive: 0xcc00aa
          });
          
          const light = new THREE.Mesh(lightGeometry, lightMaterial);
          const radius = 0.7;
          light.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
          ship.add(light);
        }
        return finishShipSetup(ship);
      }
      
      // Utiliser le modèle 3D OVNI
      const ship = new THREE.Group();
      
      // Cloner le modèle OVNI pour chaque vaisseau
      const ovniClone = ovniModel.clone();
      ovniClone.visible = true;
      
      // Ajouter une légère animation de rotation pour le modèle
      ovniClone.rotation.y = Math.random() * Math.PI * 2; // Rotation aléatoire
      
      // Ajouter le modèle au groupe du vaisseau
      ship.add(ovniClone);
      
      return finishShipSetup(ship);
    }
    
    function finishShipSetup(ship) {
      
      // Positionnement aléatoire
      const x = THREE.MathUtils.randFloatSpread(shipSpawnRange);
      const y = THREE.MathUtils.randFloatSpread(shipSpawnRange / 2) + 5; // Plus en hauteur
      const z = -20; // Derrière la caméra
      
      ship.position.set(x, y, z);
      
      // Définir les propriétés du vaisseau
      const speedX = THREE.MathUtils.randFloatSpread(shipSpeed);
      const speedY = THREE.MathUtils.randFloatSpread(shipSpeed / 2);
      const speedZ = shipSpeed + THREE.MathUtils.randFloat(0, shipSpeed / 2);
      
      objectData.set(ship, {
        speed: new THREE.Vector3(speedX, speedY, speedZ),
        health: 1,
        value: 1 // Points gagnés pour l'avoir détruit
      });
      
      ship.userData = { type: 'alien' };
      scene.add(ship);
      alienShips.push(ship);
      
      return ship;
    }
    
    function createFriendlyShip() {
      // Créer un groupe pour le vaisseau ami
      const ship = new THREE.Group();
      
      // Corps principal - design différent pour les différencier
      const bodyGeometry = new THREE.ConeGeometry(0.7, 1.5, 5);
      const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0x33cc77,
        emissive: 0x115533,
        shininess: 50,
      });
      
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.rotation.z = Math.PI;
      ship.add(body);
      
      // Ailes
      const wingGeometry = new THREE.BoxGeometry(1.8, 0.1, 0.5);
      const wingMaterial = new THREE.MeshPhongMaterial({
        color: 0x33aa77,
        shininess: 30,
      });
      
      const wing = new THREE.Mesh(wingGeometry, wingMaterial);
      wing.position.set(0, 0.3, 0);
      ship.add(wing);
      
      // Lumières vertes
      const lightGeometry = new THREE.SphereGeometry(0.1, 8, 8);
      const lightMaterial = new THREE.MeshPhongMaterial({
        color: 0x33ff77,
        emissive: 0x00cc33,
      });
      
      const lightLeft = new THREE.Mesh(lightGeometry, lightMaterial);
      lightLeft.position.set(-0.8, 0.3, 0);
      ship.add(lightLeft);
      
      const lightRight = new THREE.Mesh(lightGeometry, lightMaterial);
      lightRight.position.set(0.8, 0.3, 0);
      ship.add(lightRight);
      
      // Positionnement aléatoire
      const x = THREE.MathUtils.randFloatSpread(shipSpawnRange);
      const y = THREE.MathUtils.randFloatSpread(shipSpawnRange / 2) + 5; // Plus en hauteur
      const z = -20; // Derrière la caméra
      
      ship.position.set(x, y, z);
      
      // Définir les propriétés du vaisseau
      const speedX = THREE.MathUtils.randFloatSpread(shipSpeed);
      const speedY = THREE.MathUtils.randFloatSpread(shipSpeed / 2);
      const speedZ = shipSpeed + THREE.MathUtils.randFloat(0, shipSpeed / 2);
      
      objectData.set(ship, {
        speed: new THREE.Vector3(speedX, speedY, speedZ),
        health: 1,
        value: -2 // Points perdus pour l'avoir détruit
      });
      
      ship.userData = { type: 'friendly' };
      scene.add(ship);
      friendlyShips.push(ship);
      
      return ship;
    }
    
    function shootFromCannon(cannonIndex: number) {
      // Vérifier que le canon existe
      if (cannonIndex < 0 || cannonIndex >= cannonsObjects.length) return;
      
      // Récupérer la rotation non clampée du canon (angle de visée exact)
      const angle = cannons.value[cannonIndex].aimRotation;
      
      // Créer un tracer pour visualiser le tir en utilisant l'angle exact
      createTracer(cannonIndex, angle);
      
      // Créer la balle avec l'angle exact
      createBulletFromCannon(cannonIndex, angle);
    }
    
    function createBulletFromCannon(cannonIndex: number, angle: number) {
      // Créer une balle (tir laser)
      const bulletGeometry = new THREE.SphereGeometry(0.3, 8, 8); // Légèrement plus grosse pour faciliter les collisions
      const bulletMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color(playerColors[cannonIndex]),
        emissive: new THREE.Color(playerColors[cannonIndex]),
        shininess: 100,
      });
      
      const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
      
      // Récupérer la position du canon
      const cannon = cannonsObjects[cannonIndex];
      const cannonPos = new THREE.Vector3();
      cannon.getWorldPosition(cannonPos);
      
      // Récupérer aussi la position de la souris pour mieux viser
      const mousePos = cannons.value[cannonIndex].aimPosition;
      
      // Créer un vecteur depuis la position de la souris sur l'écran
      const mouse = new THREE.Vector2(
        (mousePos.x / window.innerWidth) * 2 - 1,
        -(mousePos.y / window.innerHeight) * 2 + 1
      );
      
      // Utiliser le raycaster pour projeter un rayon depuis la position de la souris
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      
      // Calculer la direction à partir du rayon (plus précis pour viser en 3D)
      const direction = raycaster.ray.direction.clone();
      
      // Ajuster la position de départ de la balle - la faire partir du canon
      bullet.position.copy(cannonPos);
      
      // Ajuster la direction avec l'angle pour plus de contrôle
      const angleRadians = angle * (Math.PI / 180);
      
      // Mélanger le raycaster avec l'angle calculé pour un meilleur contrôle
      const hybridDirection = new THREE.Vector3(
        direction.x * 0.7 + Math.cos(angleRadians) * 0.3, 
        direction.y * 0.7 + Math.sin(angleRadians) * 0.3,
        direction.z * 0.7 - 0.3  // Légèrement orienté vers l'avant
      ).normalize();
      
      // Sauvegarder la direction et le joueur
      objectData.set(bullet, {
        speed: hybridDirection.multiplyScalar(bulletSpeed * 1.2), // Vitesse légèrement augmentée
        health: 1,
        value: 0,
        playerIndex: cannonIndex
      } as BulletData);
      
      bullet.userData = { type: 'bullet', player: cannonIndex };
      scene.add(bullet);
      bullets.push(bullet);
      
      return bullet;
    }
    
    // Ancienne fonction maintenue pour compatibilité
    function createBullet() {
      return createBulletFromCannon(0, 90); // Default to first player
    }
    
    function scheduleAlienSpawning() {
      // Créer plusieurs vaisseaux aliens tout de suite (3 au lieu de 1)
      for (let i = 0; i < 3; i++) {
        createAlienShip();
      }
      
      // Programmer la création de nouveaux vaisseaux plus fréquemment
      alienSpawnTimer = window.setInterval(() => {
        if (alienShips.length < maxAliens && gameState.value === 'playing') {
          // Créer 1-2 vaisseaux à la fois
          const count = Math.random() < 0.3 ? 2 : 1;
          for (let i = 0; i < count; i++) {
            if (alienShips.length < maxAliens) {
              createAlienShip();
            }
          }
        }
      }, alienSpawnTime);
    }
    // Ajoutez cette fonction près de votre fonction selectCannonTouch
function updateAimRotationTouch(cannonIndex: number, touch: Touch) {
  // Stockage de la position exacte du toucher pour le viseur
  cannons.value[cannonIndex].aimPosition = {
    x: touch.clientX,
    y: touch.clientY
  };
  
  // Position fixe des canons en bas de l'écran
  const cannonPos = {
    x: window.innerWidth * ((cannonIndex + 1) * 0.2),
    y: window.innerHeight - 50
  };
  
  // Calculer l'angle
  const dx = touch.clientX - cannonPos.x;
  const dy = cannonPos.y - touch.clientY;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const clampedAngle = Math.min(Math.max(angle, 0), 180);
  
  // Mettre à jour la rotation du canon
  cannons.value[cannonIndex].rotation = clampedAngle - 90;
  cannons.value[cannonIndex].aimRotation = clampedAngle;
}
    function scheduleFriendlySpawning() {
      // Créer un vaisseau ami tout de suite
      createFriendlyShip();
      
      // Programmer la création de nouveaux vaisseaux moins fréquemment
      friendlySpawnTimer = window.setInterval(() => {
        if (friendlyShips.length < maxFriendlyShips && gameState.value === 'playing') {
          // 70% de chance de créer un vaisseau ami
          if (Math.random() < 0.7) {
            createFriendlyShip();
          }
        }
      }, friendlySpawnTime);
    }
    
    function startGame() {
      // Initialiser la scène et les objets
      initializeGame();
      
      // Mettre à jour l'état du jeu
      gameState.value = 'playing';
      gameTime.value = 0;
      score.value = 0;
      
      // Réinitialiser tous les canons
      cannons.value.forEach(cannon => {
        cannon.isAiming = false;
        cannon.canShoot = true;
        cannon.rotation = 0;
      });
      
      selectedCannon.value = -1;
      
      // Démarrer le compteur de temps
      gameTimer.value = window.setInterval(() => {
        gameTime.value++;
      }, 1000);
      
      // Démarrer la boucle d'animation
      animate();
      
      // Démarrer le timer pour finir le jeu après 60 secondes (augmenté pour partie 4 joueurs)
      let gameTimerId = setTimeout(() => {
        // Si le score n'est pas atteint quand le timer s'arrête, c'est une défaite
        if (score.value < winScore) {
          endGame(false);
        } else {
          endGame(true);
        }
      }, 30000);
      
      onBeforeUnmount(() => {
        clearTimeout(gameTimerId);
      });
    }
    
    function restartGame() {
      // Nettoyer les ressources existantes
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      if (alienSpawnTimer) {
        clearInterval(alienSpawnTimer);
        alienSpawnTimer = null;
      }
      
      if (friendlySpawnTimer) {
        clearInterval(friendlySpawnTimer);
        friendlySpawnTimer = null;
      }
      
      if (gameTimer.value) {
        clearInterval(gameTimer.value);
        gameTimer.value = null;
      }
      
      // Nettoyer la scène
      if (scene) {
        alienShips.forEach(ship => scene.remove(ship));
        friendlyShips.forEach(ship => scene.remove(ship));
        bullets.forEach(bullet => scene.remove(bullet));
        alienShips = [];
        friendlyShips = [];
        bullets = [];
      }
      
      // Redémarrer le jeu
      startGame();
    }
    
    function returnToMenu() {
      // Nettoyer les ressources
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      if (alienSpawnTimer) {
        clearInterval(alienSpawnTimer);
        alienSpawnTimer = null;
      }
      
      if (friendlySpawnTimer) {
        clearInterval(friendlySpawnTimer);
        friendlySpawnTimer = null;
      }
      
      if (gameTimer.value) {
        clearInterval(gameTimer.value);
        gameTimer.value = null;
      }
      
      // Retirer les écouteurs d'événements
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      
      gameState.value = 'menu';
    }
    
    function endGame(win: boolean = true) {
      // Nettoyer les ressources
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      if (alienSpawnTimer) {
        clearInterval(alienSpawnTimer);
        alienSpawnTimer = null;
      }
      
      if (friendlySpawnTimer) {
        clearInterval(friendlySpawnTimer);
        friendlySpawnTimer = null;
      }
      
      if (gameTimer.value) {
        clearInterval(gameTimer.value);
        gameTimer.value = null;
      }
      
      // Retirer les écouteurs d'événements
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      
      gameState.value = win ? 'victory' : 'game-over';
    }
    
    function continueToNextGame() {
      const nextGame = GameFlowService.getNextGame('alien-hunt-3d');
      if (nextGame === 'koesio-quiz') {
        router.push('/games/koesio-quiz').catch(err => {
        });
      } else if (nextGame === 'completion') {
        router.push('/completion').catch(err => {
        });
      } else if (nextGame) {
        router.push(`/games/${nextGame}`).catch(err => {
        });
      } else {
        router.push('/').catch(err => {
        });
      }
    }
    
    // Gestionnaires d'événements
    function handleMouseMove(event: MouseEvent) {
      // Calculer la position de la souris normalisée
      // -1 à +1 pour x, de gauche à droite
      // -1 à +1 pour y, de bas en haut
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    
    function handleMouseDown(event: MouseEvent) {
      mouseDown = true;
      
      // Dans le nouveau système, les clics sont gérés par les fonctions de sélection de canon
      // Le tir manuel n'est plus utilisé
    }
    
    function handleMouseUp() {
      mouseDown = false;
    }
    
    function handleResize() {
      if (!camera || !renderer) return;
      
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // Ancienne fonction de tir maintenue pour compatibilité
    function shoot() {
      if (!canShoot) return;
      
      // Créer une balle
      createBullet();
      
      // Désactiver le tir pendant un instant
      canShoot = false;
      setTimeout(() => {
        canShoot = true;
      }, shootCooldown);
    }
    
    // Vérifier si les conditions de victoire sont remplies
    function checkWinCondition() {
      if (score.value >= winScore) {
        endGame(true);
      }
    }
    
    // Animation et Logique de jeu
    function animate() {
      if (gameState.value !== 'playing') return;
      
      animationFrameId = requestAnimationFrame(animate);
      
      // Mettre à jour la position des vaisseaux aliens
      updateAlienShips();
      
      // Mettre à jour la position des vaisseaux amis
      updateFriendlyShips();
      
      // Mettre à jour la position des balles
      updateBullets();
      
      // Mettre à jour les traceurs
      updateTracers();
      
      // Mettre à jour les effets visuels des canons (mais pas leurs rotations qui sont gérées en temps réel)
      updateCannonEffects();
      
      // Vérifier les collisions
      checkCollisions();
      
      // Vérifier les conditions de victoire
      checkWinCondition();
      
      // Faire tourner les étoiles pour un effet de mouvement
      if (stars) {
        stars.rotation.x += 0.0001;
        stars.rotation.y += 0.0001;
      }
      
      // Forcer un rendu de haute priorité pour les canons actifs
      // Cela assurera que les canons suivent le curseur avec la plus grande fluidité possible
      for (let i = 0; i < cannons.value.length; i++) {
        if (cannons.value[i].isAiming && i < cannonsObjects.length) {
          const cannon = cannonsObjects[i];
          if (cannon.children.length > 1) {
            const rotationRadians = (cannons.value[i].rotation * Math.PI) / 180;
            cannon.children[1].rotation.z = rotationRadians;
          }
        }
      }
      
      // Rendu de la scène
      renderer.render(scene, camera);
    }
    
    function updateCannonEffects() {
      // Mettre à jour uniquement les effets visuels des canons (pas les rotations)
      for (let i = 0; i < cannonsObjects.length; i++) {
        if (i >= cannons.value.length) continue;
        
        const cannon = cannonsObjects[i];
        
        // Appliquer des effets visuels au canon
        if (cannon.children.length > 1) {
          // Si le canon est en mode visée, ajouter un effet visuel
          if (cannons.value[i].isAiming) {
            // Changer la couleur ou ajouter un effet de brillance
            if (cannon.children[1].material) {
              cannon.children[1].material.emissive = new THREE.Color(0x555555);
              cannon.children[1].material.emissiveIntensity = 0.7;
            }
          } else {
            // Remettre l'apparence normale
            if (cannon.children[1].material) {
              cannon.children[1].material.emissive = new THREE.Color(0x000000);
              cannon.children[1].material.emissiveIntensity = 0;
            }
          }
        }
      }
    }
    
    function updateAlienShips() {
      // Mettre à jour la position des vaisseaux aliens
      for (let i = alienShips.length - 1; i >= 0; i--) {
        const ship = alienShips[i];
        const data = objectData.get(ship);
        
        if (data) {
          // Ajouter la vitesse à la position
          ship.position.add(data.speed);
          
          // Faire tourner le vaisseau pour un effet visuel
          ship.rotation.y += 0.01;
          
          // Vérifier si le vaisseau est derrière la caméra
          if (ship.position.z > 20) {
            // Retirer le vaisseau de la scène et du tableau
            scene.remove(ship);
            alienShips.splice(i, 1);
          }
        }
      }
    }
    
    function updateFriendlyShips() {
      // Mettre à jour la position des vaisseaux amis
      for (let i = friendlyShips.length - 1; i >= 0; i--) {
        const ship = friendlyShips[i];
        const data = objectData.get(ship);
        
        if (data) {
          // Ajouter la vitesse à la position
          ship.position.add(data.speed);
          
          // Faire tourner le vaisseau pour un effet visuel
          ship.rotation.z += 0.005;
          
          // Vérifier si le vaisseau est derrière la caméra
          if (ship.position.z > 20) {
            // Retirer le vaisseau de la scène et du tableau
            scene.remove(ship);
            friendlyShips.splice(i, 1);
          }
        }
      }
    }
    
    function updateBullets() {
      // Mettre à jour la position des balles
      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        const data = objectData.get(bullet);
        
        if (data) {
          // Ajouter la vitesse à la position
          bullet.position.add(data.speed);
          
          // Vérifier si la balle est trop loin
          if (bullet.position.length() > 100) {
            // Retirer la balle de la scène et du tableau
            scene.remove(bullet);
            bullets.splice(i, 1);
          }
        }
      }
    }
    
    function checkCollisions() {
      // Vérifier les collisions entre les balles et les vaisseaux
      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        const bulletData = objectData.get(bullet) as BulletData;
        
        if (!bulletData) continue;
        
        // Vérifier les collisions avec les vaisseaux aliens
        for (let j = alienShips.length - 1; j >= 0; j--) {
          const ship = alienShips[j];
          
          // Calculer la distance entre la balle et le vaisseau
          const distance = bullet.position.distanceTo(ship.position);
          
          // Augmenter la zone de collision pour faciliter les tirs
          const hitRadius = 2.0; // Rayon de collision encore plus grand pour faciliter les hits
          
          // Si la distance est inférieure à un seuil, c'est une collision
          if (distance < hitRadius) {
            // Ajouter des points au score
            score.value += 1;
            
            // Créer un effet d'explosion
            createExplosion(ship.position.clone(), 0x9933ff);
            
            // Retirer le vaisseau et la balle
            scene.remove(ship);
            scene.remove(bullet);
            alienShips.splice(j, 1);
            bullets.splice(i, 1);
            
            // Sortir de la boucle interne
            break;
          }
        }
        
        // Vérifier les collisions avec les vaisseaux amis (seulement si la balle est encore active)
        if (bullets[i] === bullet) {
          for (let j = friendlyShips.length - 1; j >= 0; j--) {
            const ship = friendlyShips[j];
            
            // Calculer la distance entre la balle et le vaisseau
            const distance = bullet.position.distanceTo(ship.position);
            
            // Rayon de collision plus petit pour les vaisseaux amis afin de rendre le jeu plus équilibré
            const hitRadius = 1.2; // Collision plus précise pour les vaisseaux amis, facilitant le jeu
            
            // Si la distance est inférieure à un seuil, c'est une collision
            if (distance < hitRadius) {
              // Créer un effet d'explosion
              createExplosion(ship.position.clone(), 0x33cc77);
              
              // Retirer le vaisseau et la balle
              scene.remove(ship);
              scene.remove(bullet);
              friendlyShips.splice(j, 1);
              bullets.splice(i, 1);
              
              // Pénalité pour avoir touché un vaisseau ami
              score.value = Math.max(0, score.value - 2);
              
              // Sortir de la boucle interne
              break;
            }
          }
        }
      }
    }
    
    function createExplosion(position: THREE.Vector3, color: number) {
      // Créer une explosion temporaire
      const particleCount = 15;
      const explosionGeometry = new THREE.BufferGeometry();
      const explosionMaterial = new THREE.PointsMaterial({
        color: color,
        size: 0.3,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 1
      });
      
      const positions = new Float32Array(particleCount * 3);
      const velocities: THREE.Vector3[] = [];
      
      // Initialiser les particules
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3] = position.x;
        positions[i3 + 1] = position.y;
        positions[i3 + 2] = position.z;
        
        // Créer une vitesse aléatoire pour chaque particule
        velocities.push(new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2
        ));
      }
      
      explosionGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
      );
      
      const explosion = new THREE.Points(explosionGeometry, explosionMaterial);
      
      scene.add(explosion);
      
      // Animer l'explosion et la supprimer après
      let frame = 0;
      const maxFrames = 30;
      
      const animateExplosion = () => {
        frame++;
        
        // Mettre à jour la position des particules
        const positions = explosion.geometry.attributes.position.array as Float32Array;
        
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          positions[i3] += velocities[i].x;
          positions[i3 + 1] += velocities[i].y;
          positions[i3 + 2] += velocities[i].z;
        }
        
        explosion.geometry.attributes.position.needsUpdate = true;
        
        // Faire disparaître progressivement
        if (explosion.material instanceof THREE.PointsMaterial) {
          explosion.material.opacity = 1 - (frame / maxFrames);
        }
        
        // Continuer l'animation ou supprimer
        if (frame < maxFrames) {
          requestAnimationFrame(animateExplosion);
        } else {
          scene.remove(explosion);
        }
      };
      
      // Démarrer l'animation
      animateExplosion();
    }
    
    // Cycle de vie du composant
    onMounted(() => {
      // Ne rien initialiser ici, tout sera fait au démarrage du jeu
       // Global touch move handler
  window.addEventListener('touchmove', (e: TouchEvent) => {
    e.preventDefault();
    
    // Process all active touches
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const touchId = touch.identifier;
      
      // If this touch is controlling a cannon
      if (activeTouches.value[touchId]) {
        const cannonIndex = activeTouches.value[touchId].cannonIndex;
        
        // Update aim position
        cannons.value[cannonIndex].aimPosition = {
          x: touch.clientX,
          y: touch.clientY
        };
        
        // Calculate new rotation angle
        const cannonPos = {
          x: window.innerWidth * (cannonIndex * 0.2 + 0.2),
          y: window.innerHeight - 50
        };
        
        const dx = touch.clientX - cannonPos.x;
        const dy = cannonPos.y - touch.clientY;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const clampedAngle = Math.min(Math.max(angle, 0), 180);
        
        // Update cannon rotation
        cannons.value[cannonIndex].rotation = clampedAngle - 90;
        cannons.value[cannonIndex].aimRotation = angle;
        
        // Update 3D model if available
        if (cannonIndex < cannonsObjects.length && cannonsObjects[cannonIndex]) {
          const cannon = cannonsObjects[cannonIndex];
          if (cannon && cannon.children && cannon.children.length > 1) {
            const rotationRadians = (clampedAngle - 90) * (Math.PI / 180);
            cannon.children[1].rotation.z = rotationRadians;
          }
        }
        
        // Update tracer (remove old ones first)
        for (let j = tracers.length - 1; j >= 0; j--) {
          const tracer = tracers[j];
          const data = objectData.get(tracer) as TracerData;
          if (data && data.player === cannonIndex) {
            scene.remove(tracer);
            tracers.splice(j, 1);
          }
        }
        
        // Create new tracer
        createTracer(cannonIndex, angle);
      }
    }
  }, { passive: false });
  
  // Global touch end handler
  window.addEventListener('touchend', (e: TouchEvent) => {
    // Process all ended touches
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const touchId = touch.identifier;
      
      // If this touch was controlling a cannon
      if (activeTouches.value[touchId]) {
        const cannonIndex = activeTouches.value[touchId].cannonIndex;
        
        // Fire the cannon
        handleShoot(cannonIndex);
        
        // Reset cannon state
        cannons.value[cannonIndex].isAiming = false;
        
        // Remove this touch from tracking
        delete activeTouches.value[touchId];
      }
    }
  });
  
  // Handle touch cancel similarly
  window.addEventListener('touchcancel', (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const touchId = touch.identifier;
      
      if (activeTouches.value[touchId]) {
        const cannonIndex = activeTouches.value[touchId].cannonIndex;
        cannons.value[cannonIndex].isAiming = false;
        delete activeTouches.value[touchId];
      }
    }
  });
});
    
    onBeforeUnmount(() => {
      // Nettoyage
      if (gameTimer.value) {
        clearInterval(gameTimer.value);
      }
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      if (requestAnimationId) {
        cancelAnimationFrame(requestAnimationId);
      }
      
      if (alienSpawnTimer) {
        clearInterval(alienSpawnTimer);
      }
      
      if (friendlySpawnTimer) {
        clearInterval(friendlySpawnTimer);
      }
      
      // Nettoyer les callbacks de suivi de souris
      mouseMoveCallbacks.clear();
      isMouseUpdateRunning = false;
      
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('touchmove', null);
  window.removeEventListener('touchend', null);
  window.removeEventListener('touchcancel', null);

    });
    

// Fonction d'aide pour nettoyer les traceurs d'un joueur
function cleanPlayerTracers(playerIndex: number) {
  for (let i = tracers.length - 1; i >= 0; i--) {
    const tracer = tracers[i];
    const data = objectData.get(tracer) as TracerData;
    if (data && data.player === playerIndex) {
      scene.remove(tracer);
      tracers.splice(i, 1);
    }
  }
}
    function getCannonIndexFromTouch(touch: Touch): number {
      const rect = gameContainer.value.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const cannonWidth = rect.width / 4; // Assuming 4 cannons
      return Math.floor(x / cannonWidth);
    }
    
    return {
      gameState,
      gameTime,
      score,
      formattedTime,
      gameContainer,
      startGame,
      restartGame,
      returnToMenu,
      endGame,
      continueToNextGame,
      // Cannons management
      cannons,
      selectedCannon,
      selectCannon,
      playerColors,
      playerNames,
      showInstructions,
      gameInstructions ,
      onInstructionComplete,
      selectCannonTouch,
      handleShoot, // Ajoutez-le s'il n'est pas déjà présent
      createTracer,
      activeTouches
    };
  }
});
</script>



<style scoped>
.alien-hunt-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: #050a2f;
}

@media (max-width: 768px) {
  .alien-hunt-container {
    padding: 10px;
  }
}

.game-canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  touch-action: none; /* Prevent default touch actions */
  overflow: hidden;
}

.game-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 10;
}

.menu, .victory, .game-over {
  background: rgba(25, 10, 41, 0.8);
  border: 2px solid #b090ff;
  border-radius: 10px;
  padding: 2rem;
  text-align: center;
  color: white;
  max-width: 500px;
}

.game-hud {
  position: absolute;
  top: 20px;
  left: 20px;
  color: white;
  font-size: 1.2rem;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.game-over {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}
.timer, .score, .current-player {
  background: rgba(25, 10, 41, 0.6);
  padding: 0.5rem 1rem;
  border-radius: 5px;
  border: 1px solid #b090ff;
}

.current-player {
  font-weight: bold;
}

h1 {
  color: #b090ff;
  font-family: 'Orbitron', sans-serif;
  margin-bottom: 1rem;
}

h2 {
  color: #b090ff;
  font-size: 1.2rem;
  margin: 1rem 0;
}
.game-instructions {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 20, 50, 0.9);
  padding: 30px;
  border-radius: 15px;
  border: 2px solid #00d1ff;
  text-align: center;
  max-width: 80%;
  z-index: 15;
}
button {
  background: linear-gradient(to bottom, #3d1a70, #2b0d51);
  color: white;
  border: 2px solid #b090ff;
  border-radius: 5px;
  padding: 0.7rem 1.5rem;
  font-family: 'Orbitron', sans-serif;
  margin: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

button:hover {
  background: #b090ff;
  color: #000;
}

.instructions {
  margin-top: 2rem;
  text-align: left;
}

.instructions p {
  margin: 0.5rem 0;
}

.cannons-container {
  position: absolute;
  left: 0;
  width: 100%;
  height: 100%; /* Étendre sur toute la hauteur pour contenir les canons haut et bas */
  pointer-events: none;
}

.cannon {
  position: absolute;
  width: 50px;
  height: 80px;
  transform-origin: bottom center;
  cursor: pointer;
  transition: transform 0.3s ease;
  pointer-events: auto;
}

.cannon:nth-child(1),
.cannon:nth-child(2) {
  bottom: 0;
}

.cannon:nth-child(3),
.cannon:nth-child(4) {
  top: 0;
  transform-origin: top center;
}

.cannon-base {
  position: absolute;
  bottom: 0;
  left: 10px;
  width: 30px;
  height: 20px;
  border-radius: 50% 50% 0 0;
  background: #333;
}

.cannon-barrel {
  position: absolute;
  bottom: 15px;
  left: 17.5px;
  width: 15px;
  height: 50px;
  background: #555;
  border-radius: 15px 15px 0 0;
  transform-origin: bottom center;
}

.cannon.active .cannon-base, 
.cannon:hover .cannon-base {
  box-shadow: 0 0 15px 5px rgba(255, 255, 255, 0.7);
}

.cannon:nth-child(1) .cannon-base {
  background: #FF5252;
}

.cannon:nth-child(2) .cannon-base {
  background: #4CAF50;
}

.cannon:nth-child(3) .cannon-base {
  background: #2196F3;
}

.cannon:nth-child(4) .cannon-base {
  background: #FFC107;
}

/* Indicator pour le rechargement des canons */
.reload-indicator {
  position: absolute;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.8);
  border-top: 3px solid transparent;
  top: -10px;
  left: 10px;
  animation: spin 1s linear infinite;
  z-index: 6;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.cannon.reloading .cannon-base {
  opacity: 0.6;
}

/* Aim tracer */
.aim-tracer {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  z-index: 4;
  pointer-events: none;
  animation: pulse 0.7s infinite alternate;
}

.aim-tracer-inner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: white;
  box-shadow: 0 0 6px 2px white;
}

@keyframes pulse {
  0% { transform: translate(-50%, -50%) scale(0.8); }
  100% { transform: translate(-50%, -50%) scale(1.2); }
}

/* Style pour les canons en mode visée */
.cannon.active .cannon-barrel {
  /* Montrer visuellement que le canon est actif pour le tir */
  box-shadow: 0 0 15px 5px rgba(255, 255, 255, 0.5);
  transform-origin: bottom center;
  transition: all 0.1s ease-out;
}

/* Player names display */
.player-names {
  position: absolute;
  display: flex;
  justify-content: space-around;
  top: 10px;
  right: 20px;
  z-index: 5;
  background: rgba(0, 0, 0, 0.6);
  padding: 10px;
  border-radius: 5px;
}

.player-name {
  font-weight: bold;
  margin: 0 10px;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.7);
  font-size: 1rem;
}

@keyframes popup {
  0% { transform: scale(0.7); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
