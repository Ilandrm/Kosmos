<template>
  <div class="maze-game-container">
    <div ref="gameContainer" class="game-canvas-container"></div>
    
      
      <div v-if="gameState === 'victory'" class="victory">
        <h1>VICTOIRE!</h1>
        <p>Vous avez atteint la planète en {{ formattedTime }}!</p>
        <button @click="continueToNextGame" class="continue-btn">CONTINUER</button>
      </div>
      
      <div v-if="gameState === 'game-over'" class="game-over">
        <h1>{{gameCount > 1 ? "MISSION TERMINÉE" : "SECOND JOUEUR"}}</h1>
        <p v-if="gameCount <= 1">C'est au tour du deuxième joueur de relever le défi!</p>
        <p v-if="gameCount > 1">Vous n'avez pas atteint la planète dans le temps imparti.</p>
        <p v-if="gameCount > 1">Temps restant : {{ timeLeft }} secondes</p>
        <button @click="continueToNextGame" class="continue-btn">{{gameCount > 1 ? "Continuer la mission" : "Commencer"}}</button>
      </div>
    </div>
    <GameInstruction
        v-if="showInstructions"
        :title="gameInstructions.title"
        :players="gameInstructions.players"
        :time="gameInstructions.time"
        :instruction="gameInstructions.instruction"
        @start="onInstructionComplete"
      />

    <!-- Game HUD -->
    <div v-if="gameState === 'playing'" class="game-hud">
      <div class="timer">Temps: {{ formattedTime }}</div>
      <div class="timer">Temps restant : {{ timeLeft }} secondes</div>
    </div>
    
    <!-- Contrôles tactiles à l'écran -->
    <div v-if="gameState === 'playing'" class="touch-controls">
      <div class="d-pad">
        <button class="control-button up" @touchstart.prevent="handleTouchStart('ArrowUp')" @touchend.prevent="handleTouchEnd('ArrowUp')" @mousedown.prevent="handleTouchStart('ArrowUp')" @mouseup.prevent="handleTouchEnd('ArrowUp')">
          <span class="arrow">&#9650;</span>
        </button>
        <div class="middle-row">
          <button class="control-button left" @touchstart.prevent="handleTouchStart('ArrowLeft')" @touchend.prevent="handleTouchEnd('ArrowLeft')" @mousedown.prevent="handleTouchStart('ArrowLeft')" @mouseup.prevent="handleTouchEnd('ArrowLeft')">
            <span class="arrow">&#9664;</span>
            
          </button>
          <button class="control-button down" @touchstart.prevent="handleTouchStart('ArrowDown')" @touchend.prevent="handleTouchEnd('ArrowDown')" @mousedown.prevent="handleTouchStart('ArrowDown')" @mouseup.prevent="handleTouchEnd('ArrowDown')">
          <span class="arrow">&#9660;</span>
        </button>
          <div ></div>
          <button class="control-button right" @touchstart.prevent="handleTouchStart('ArrowRight')" @touchend.prevent="handleTouchEnd('ArrowRight')" @mousedown.prevent="handleTouchStart('ArrowRight')" @mouseup.prevent="handleTouchEnd('ArrowRight')">
            <span class="arrow">&#9654;</span>
          </button>
        </div>
        
      </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount, computed } from 'vue';

// Étendre l'interface Window pour inclure $gameFlow
declare global {
  interface Window {
    $gameFlow: any; // Remplacez 'any' par le type approprié si disponible
  }
}
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Ship3D from './entities/Ship3D';
import { useRouter } from 'vue-router';
import GameInstruction from '../../components/GameInstruction.vue';

export default defineComponent({
  name: 'Maze3DGame',
  components: {
    GameInstruction
  },
  setup() {
    // État du jeu
    const gameState = ref('menu'); // 'menu', 'playing', 'victory', 'game-over'
    const gameTime = ref(0);
    const gameTimer = ref<number | null>(null);
    const timeLeft = ref(30);
    let gameTimerId;
    const gameCount = ref(0); // Compteur de parties jouées
    
    // Formatage du temps
    const formattedTime = computed(() => {
      const minutes = Math.floor(gameTime.value / 60);
      const seconds = gameTime.value % 60;
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    });
    
    // Références aux éléments DOM
    const gameContainer = ref<HTMLElement | null>(null);
    
    // Variables Three.js
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let controls: OrbitControls;
    let ship: Ship3D;
    let goal: THREE.Mesh;
    let maze: THREE.Group;
    let raycaster: THREE.Raycaster;
    let animationFrameId: number;
    let lastTime: number = 0;
    const showInstructions = ref(true);
    const gameInstructions = {
        title: "Labyrinthe Spatial 3D",
        players: "1 joueur",
        time: "30 secondes",
        instruction: "Guidez le vaisseau jusqu’à la sortie à l’aide des flèches"
      };
    // Liste des murs pour la détection de collision
    let mazeWalls: THREE.Object3D[] = [];
    
    // Variables de jeu
    let shipSpeed = 0.1;
    let shipRotationSpeed = 0.05;
    let shipVelocity = new THREE.Vector3();
    let keysPressed: { [key: string]: boolean } = {};
    let isColliding = false;
    const moveDistance = 0.2;
    
    // Define two different maze layouts
    const mazeLayouts = [
      [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
        [1, 0, 1, 0, 0, 0, 1, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 0, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 0, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 0, 1, 0, 0, 0, 0, 1],
        [1, 2, 1, 0, 0, 0, 1, 1, 3, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      ],
      [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 1, 0, 1, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 1, 0, 1, 1, 0, 1],
        [1, 1, 1, 0, 0, 0, 1, 0, 0, 1],
        [1, 0, 0, 0, 1, 1, 1, 0, 1, 1],
        [1, 0, 1, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 0, 1, 1, 1, 1, 0, 1],
        [1, 0, 1, 0, 1, 0, 0, 0, 0, 1],
        [1, 2, 1, 0, 0, 0, 1, 1, 3, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      ],
    ];

    // Randomly select a maze layout
    let selectedMazeLayout = mazeLayouts[Math.floor(Math.random() * mazeLayouts.length)];

    // Update the mazeLayout variable to use the selected layout
    let mazeLayout = selectedMazeLayout;

    // Méthodes du jeu
    let shipStartPosition = new THREE.Vector3();
    let goalPosition = new THREE.Vector3();

    function initializeGame() {
      if (!gameContainer.value) return;
      
      // Initialiser la scène
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000020);
      
      // Ajouter un éclairage
      const ambientLight = new THREE.AmbientLight(0x404040, 1);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(5, 10, 7.5);
      scene.add(directionalLight);
      
      // Initialiser la caméra
      camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      
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
      
      // Contrôles de la caméra
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      controls.enableZoom = false;
      controls.minPolarAngle = Math.PI / 4;
      controls.maxPolarAngle = Math.PI / 2.5;
      
      // Créer le labyrinthe
      createMaze();
      
      // Créer le vaisseau
      createShip();
      
      // Positionnement et rotation du vaisseau au début
      ship.position.copy(shipStartPosition);
      ship.position.y = 1;
      camera.position.set(
        shipStartPosition.x,
        shipStartPosition.y + 5,
        shipStartPosition.z + 5
      );
      controls.target.copy(ship.position);
      
      // Créer le but (planète violette)
      createGoal();
      
      // Raycaster pour la détection de collision
      raycaster = new THREE.Raycaster();
      
      // Gestionnaire d'événements pour les touches
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      
      // Gestionnaire de redimensionnement
      window.addEventListener('resize', handleResize);
    }

    
    function createMaze() {
      maze = new THREE.Group();
      
      // Créer les murs et identifier la position de départ et d'arrivée
      for (let i = 0; i < mazeLayout.length; i++) {
        for (let j = 0; j < mazeLayout[i].length; j++) {
          const cell = mazeLayout[i][j];
          
          if (cell === 1) {
            // Mur avec design amélioré
            const wallGeometry = new THREE.BoxGeometry(3, 3 * 1.5, 3);
            
            // Matériau principal avec effet métallique
            const wallMaterial = new THREE.MeshStandardMaterial({ 
              color: 0x3366dd,
              metalness: 0.7,
              roughness: 0.3,
              emissive: 0x112299,
              emissiveIntensity: 0.4
            });
            
            // Créer le mur avec un positionnement espacé
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            
            // Position avec un espacement plus grand entre les murs
            const posX = j * (3 + 2);
            const posZ = i * (3 + 2);
            
            wall.position.set(posX, 3 / 2, posZ);
            wall.castShadow = true;
            wall.receiveShadow = true;
            wall.userData = { type: 'wall' };
            
            // Ajouter un effet de bordure lumineuse
            const edgeGeometry = new THREE.BoxGeometry(3 + 0.1, 3 * 1.5 + 0.1, 3 + 0.1);
            const edgeMaterial = new THREE.MeshBasicMaterial({
              color: 0x00aaff,
              transparent: true,
              opacity: 0.3,
              side: THREE.BackSide,
              emissive: 0x5533aa
            });
            
            const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
            edge.position.copy(wall.position);
            maze.add(edge);
            
            maze.add(wall);
          }
          else if (cell === 0) {
            // Espace vide avec sol amélioré
            const floorSize = 3 + 2;
            const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
            
            // Créer un matériau avec texture de grille
            const floorMaterial = new THREE.MeshStandardMaterial({ 
              color: 0x222266,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.7,
              metalness: 0.2,
              roughness: 0.8
            });
            
            const floor = new THREE.Mesh(floorGeometry, floorMaterial);
            floor.rotation.x = Math.PI / 2;
            floor.position.set(j * (3 + 2), 0, i * (3 + 2));
            floor.receiveShadow = true;
            
            // Ajouter des lignes de grille au sol
            const gridHelper = new THREE.GridHelper(floorSize, 4, 0x0055ff, 0x002299);
            gridHelper.position.set(
              j * (3 + 2),
              0.01, // Légèrement au-dessus du sol
              i * (3 + 2)
            );
            maze.add(gridHelper);
            
            maze.add(floor);
          }
          else if (cell === 2) {
            // Point de départ
            shipStartPosition.set(j * (3 + 2), 1, i * (3 + 2));
            
            // Plateforme de départ
            const floorSize = 3 + 2;
            const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
            const floorMaterial = new THREE.MeshStandardMaterial({ 
              color: 0x33dd55,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.8,
              metalness: 0.5,
              roughness: 0.5,
              emissive: 0x116622,
              emissiveIntensity: 0.5
            });
            
            const floor = new THREE.Mesh(floorGeometry, floorMaterial);
            floor.rotation.x = Math.PI / 2;
            floor.position.set(j * (3 + 2), 0, i * (3 + 2));
            floor.receiveShadow = true;
            
            // Lumière au point de départ
            const startLight = new THREE.PointLight(0x33ff66, 2, 8);
            startLight.position.set(j * (3 + 2), 2, i * (3 + 2));
            scene.add(startLight);
            
            maze.add(floor);
          }
          else if (cell === 3) {
            // Point d'arrivée
            goalPosition.set(j * (3 + 2), 1, i * (3 + 2));
            
            // Plateforme d'arrivée
            const floorSize = 3 + 2;
            const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
            const floorMaterial = new THREE.MeshStandardMaterial({ 
              color: 0x9944cc,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.8,
              metalness: 0.7,
              roughness: 0.3,
              emissive: 0x330066,
              emissiveIntensity: 0.7
            });
            
            const floor = new THREE.Mesh(floorGeometry, floorMaterial);
            floor.rotation.x = Math.PI / 2;
            floor.position.set(j * (3 + 2), 0, i * (3 + 2));
            floor.receiveShadow = true;
            
            // Lumière au point d'arrivée
            const goalLight = new THREE.PointLight(0xaa33ff, 3, 10);
            goalLight.position.set(j * (3 + 2), 2, i * (3 + 2));
            scene.add(goalLight);
            
            maze.add(floor);
          }
        }
      }
      
      // La position d'arrivée est déjà définie par la cellule 3 dans le labyrinthe
      
      scene.add(maze);
    }

    function onInstructionComplete() {
      showInstructions.value = false;
      startGame();
    };
    
    function createShip() {
      // Récupérer les murs pour la détection de collision
      mazeWalls = [];
      maze.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData && child.userData.type === 'wall') {
          mazeWalls.push(child);
        }
      });
      
      // Créer le vaisseau à partir de la classe Ship3D
      ship = new Ship3D(scene, mazeWalls, camera);
      
      // Positionner le vaisseau au point de départ
      ship.position = shipStartPosition.clone();
      ship.position.y = 1; // Élever légèrement le vaisseau
      
      // Activer l'affichage du rayon de collision pour le débogage (optionnel)
      // ship.showCollisionRadius(true);
      
      // Activer les rayons de détection de collision (optionnel)
      // ship.toggleDebugRays(true);
      
    }
    
    function createGoal() {
      // Créer le but (une planète en rotation avec des anneaux)
      const goalGeometry = new THREE.SphereGeometry(1, 32, 32);
      const goalMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x9933ff,
        emissive: 0x330099,
        emissiveIntensity: 0.5,
        metalness: 0.3,
        roughness: 0.7
      });
      
      const planetCore = new THREE.Mesh(goalGeometry, goalMaterial);
      planetCore.userData = { type: 'goal' };
      
      // Créer un groupe pour l'objectif
      goal = new THREE.Group();
      goal.add(planetCore);
      
      // Ajouter une atmosphère
      const atmosphereGeometry = new THREE.SphereGeometry(1.3, 32, 32);
      const atmosphereMaterial = new THREE.MeshStandardMaterial({
        color: 0xb090ff,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide,
        emissive: 0x5533aa
      });
      
      const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
      goal.add(atmosphere);
      
      // Ajouter des anneaux à la planète
      const ringGeometry = new THREE.TorusGeometry(1.8, 0.2, 16, 100);
      const ringMaterial = new THREE.MeshStandardMaterial({
        color: 0x6622aa,
        emissive: 0x220066,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.7
      });
      
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      goal.add(ring);
      
      // Ajouter un second anneau avec une rotation différente
      const ring2Geometry = new THREE.TorusGeometry(1.6, 0.1, 16, 100);
      const ring2Material = new THREE.MeshStandardMaterial({
        color: 0xaa55ff,
        emissive: 0x4400aa,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.5
      });
      
      const ring2 = new THREE.Mesh(ring2Geometry, ring2Material);
      ring2.rotation.x = Math.PI / 3;
      ring2.rotation.y = Math.PI / 4;
      goal.add(ring2);
      
      // Ajouter un système de particules autour de la planète
      const particlesGeometry = new THREE.BufferGeometry();
      const particleCount = 100;
      const positions = new Float32Array(particleCount * 3);
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const radius = 2 + Math.random() * 0.5;
        const angle = Math.random() * Math.PI * 2;
        const height = (Math.random() - 0.5) * 2;
        
        positions[i3] = Math.cos(angle) * radius;
        positions[i3 + 1] = height;
        positions[i3 + 2] = Math.sin(angle) * radius;
      }
      
      particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const particlesMaterial = new THREE.PointsMaterial({
        color: 0xaa66ff,
        size: 0.1,
        transparent: true,
        opacity: 0.7
      });
      
      const particles = new THREE.Points(particlesGeometry, particlesMaterial);
      goal.add(particles);
      
      // Ajouter un effet de lumière sur la planète
      const goalLight = new THREE.PointLight(0xaa66ff, 2, 10);
      goalLight.position.set(0, 0, 0);
      goal.add(goalLight);
      
      // Positionner le groupe à la position d'arrivée
      goal.position.copy(goalPosition);
      
      // Rendre l'objectif visible après un délai pour éviter la victoire instantanée
      goal.visible = true;
      
      // Ajouter l'objectif à la scène
      scene.add(goal);
      
      // Après 3 secondes, rendons l'objectif visible
      setTimeout(() => {
        if (goal) goal.visible = true;
      }, 3000);
    }
    
    function startGame() {
      // Mémoriser l'état courant
      gameState.value = 'initializing';
      
      // Réinitialiser le temps de jeu
      gameTime.value = 0;
      
      // Arrêter tout timer existant
      if (gameTimer.value) {
        clearInterval(gameTimer.value);
        gameTimer.value = null;
      }
      
      // Initialisation du jeu
      initializeGame();
      
      // Démarrer le timer après l'initialisation
      gameTimer.value = window.setInterval(() => {
        gameTime.value++;
        timeLeft.value--;
        if (timeLeft.value <= 0) {
          endGame();
        }
      }, 1000);
      
      // S'assurer que la position initiale est correctement enregistrée
      if (ship && shipStartPosition) {
        shipStartPosition.copy(ship.position);
      }
      
      // Changer l'état du jeu après initialisation
      gameState.value = 'playing';
      
      // Démarrer la boucle d'animation
      animate();
      
      timeLeft.value = 30; // Set timer to 30 seconds at game start
    }
    
    function restartGame() {
      // Nettoyage
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      if (gameTimer.value) {
        clearInterval(gameTimer.value);
        gameTimer.value = null;
      }
      
      // Redémarrage
      startGame();
    }
    
    function returnToMenu() {
      // Nettoyage
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      if (gameTimer.value) {
        clearInterval(gameTimer.value);
        gameTimer.value = null;
      }
      
      // Retirer le gestionnaire de redimensionnement uniquement
      window.removeEventListener('resize', handleResize);
      
      gameState.value = 'menu';
    }
    
    function endGame() {
      // Nettoyage
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      if (gameTimer.value) {
        clearInterval(gameTimer.value);
        gameTimer.value = null;
      }
      
      gameState.value = 'game-over';
    }
    
    // Gestionnaires d'événements
    function handleKeyDown(event: KeyboardEvent) {
      // Ne pas réagir aux touches si le jeu est en pause
      if (gameState.value !== 'playing' || !ship) return;
      
      // Transmettre l'événement à notre classe Ship3D
      ship.handleKeyDown(event);
    }
    
    function handleKeyUp(event: KeyboardEvent) {
      // Ne pas réagir aux touches si le jeu est en pause
      if (gameState.value !== 'playing' || !ship) return;
      
      // Transmettre l'événement à notre classe Ship3D
      ship.handleKeyUp(event);
    }
    
    // Gestionnaires améliorés pour les contrôles tactiles
    function handleTouchStart(key: string) {
      if (gameState.value !== 'playing' || !ship) return;
      
      // Créer un événement KeyboardEvent synthétique
      const keyEvent = new KeyboardEvent('keydown', { key });
      
      // Transmettre l'événement directement à notre classe Ship3D
      ship.handleKeyDown(keyEvent);
    }
    
    function handleTouchEnd(key: string) {
      if (gameState.value !== 'playing' || !ship) return;
      
      // Créer un événement KeyboardEvent synthétique
      const keyEvent = new KeyboardEvent('keyup', { key });
      
      // Transmettre l'événement directement à notre classe Ship3D
      ship.handleKeyUp(keyEvent);
    }
    
    function handleResize() {
      if (!camera || !renderer || !gameContainer.value) return;
      
      // Mettre à jour les dimensions
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // Animation et logique de jeu
    function animate(time: number) {
      animationFrameId = requestAnimationFrame(animate);
      
      if (gameState.value !== 'playing') return;
      
      // Calculer le deltaTime en secondes
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;
      
      // Mettre à jour le vaisseau (mouvement et collision)
      if (ship) {
        ship.update(deltaTime > 0 ? deltaTime : 0.016); // Utiliser 0.016 (60 FPS) comme valeur par défaut
      }
      
      // Vérifier si le joueur a atteint le but
      const shipGoalDistance = ship.position.distanceTo(goal.position);
      if (shipGoalDistance < 3) { // Adjust this value based on your goal size
        handleVictory();
        return;
      }
      
      // Vérifier si le temps est écoulé
      if (timeLeft.value <= 0) {
        handleGameOver();
        return;
      }
      
      // Mettre à jour la position de la caméra pour suivre le vaisseau
      if (ship && controls) {
        camera.position.set(
          ship.position.x,
          ship.position.y + 5,
          ship.position.z + 5
        );
        controls.target.copy(ship.position);
        controls.update();
      }
      
      // Faire tourner légèrement la planète objectif
      if (goal) {
        goal.rotation.y += 0.01;
      }
      
      // Rendu de la scène
      renderer.render(scene, camera);
    }
    
    function handleVictory() {
      cancelAnimationFrame(animationFrameId);
      if (gameTimer.value) {
        clearInterval(gameTimer.value);
        gameTimer.value = null;
      }
      
      // Incrémenter le compteur de parties
      gameCount.value++;
      
      // Si c'est la première victoire, montrer le message pour le second joueur
      if (gameCount.value === 1) {
        gameState.value = 'game-over'; // Utiliser l'écran de game-over pour le message de second joueur
      } else {
        gameState.value = 'victory';
        
        // Call game flow service to record victory uniquement après la seconde partie
        if (window.$gameFlow) {
          window.$gameFlow.completeGame('maze-3d', true);
        }
      }
    }
    
    function handleGameOver() {
      cancelAnimationFrame(animationFrameId);
      if (gameTimer.value) {
        clearInterval(gameTimer.value);
        gameTimer.value = null;
      }
      
      // Incrémenter le compteur de parties
      gameCount.value++;
      gameState.value = 'game-over';
      
      // Record game over in game flow uniquement après la seconde partie
      if (gameCount.value > 1 && window.$gameFlow) {
        window.$gameFlow.completeGame('maze-3d', false);
      }
    }
    
    const router = useRouter();
    
    function continueToNextGame() {
      // Si c'est la première partie, démarrer la seconde
      if (gameCount.value <= 1) {
        startGame();
      } else {
        // Sinon, passer à l'écran de complétion
        router.push({ name: 'DecryptionMiniGame' });

      }
    }
    
    // Cycle de vie du composant
    onMounted(() => {
      // Ne rien initialiser ici, tout sera fait au démarrage du jeu
    });
    
    onBeforeUnmount(() => {
      // Nettoyage
      if (gameTimer.value) {
        clearInterval(gameTimer.value);
      }
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      window.removeEventListener('resize', handleResize);
    });
    

    // Add a method to update the ship's position based on input state
    function updateShipMovement() {
      if (ship) {
        if (keysPressed['ArrowUp']) ship.moveForward();
        if (keysPressed['ArrowDown']) ship.moveBackward();
        if (keysPressed['ArrowLeft']) ship.rotateLeft();
        if (keysPressed['ArrowRight']) ship.rotateRight();
      }
    }

  

    return {
      gameState,
      gameTime,
      formattedTime,
      timeLeft,
      gameCount,
      gameContainer,
      startGame,
      restartGame,
      returnToMenu,
      endGame,
      continueToNextGame,
      handleTouchStart,
      handleTouchEnd,
      onInstructionComplete,
      gameInstructions,
      showInstructions
    };
  }
});
</script>

<style scoped>
.maze-game-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: #000;
}

@media (max-width: 768px) {
  .maze-game-container {
    padding: 10px;
  }
}

.game-canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
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
  background: rgba(0, 20, 40, 0.8);
  border: 2px solid #00d1ff;
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
}

h1 {
  color: #00d1ff;
  font-family: 'Orbitron', sans-serif;
  margin-bottom: 1rem;
}

h2 {
  color: #00d1ff;
  font-size: 1.2rem;
  margin: 1rem 0;
}

button {
  background: linear-gradient(to bottom, #003a66, #00588f);
  color: white;
  border: 2px solid #00d1ff;
  border-radius: 5px;
  padding: 0.7rem 1.5rem;
  font-family: 'Orbitron', sans-serif;
  margin: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

button:hover {
  background: #00d1ff;
  color: #000;
}

.instructions {
  margin-top: 2rem;
  text-align: left;
}

.instructions p {
  margin: 0.5rem 0;
}

.timer {
  font-family: 'Orbitron', sans-serif;
  background: rgba(0, 20, 40, 0.6);
  padding: 0.5rem 1rem;
  border-radius: 5px;
  border: 1px solid #00d1ff;
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
.game-over, .victory {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}
/* Styles pour les contrôles tactiles */
.touch-controls {
  position: absolute;
  bottom: 30px;
  right: 30px;
  z-index: 5;
  touch-action: none;
}

.d-pad {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 180px;
  height: 180px;
}

.middle-row {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin: 5px 0;
}

.spacer {
  width: 60px;
}

.control-button {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  background: rgba(0, 35, 70, 0.7);
  border: 2px solid #00d1ff;
  color: #00d1ff;
  font-size: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 0 10px rgba(0, 209, 255, 0.5);
  margin: 0;
  padding: 0;
}

.control-button:active,
.control-button:hover {
  background: rgba(0, 209, 255, 0.3);
  transform: scale(1.1);
  box-shadow: 0 0 15px rgba(0, 209, 255, 0.8);
}

.arrow {
  font-size: 28px;
  line-height: 1;
  color: #00d1ff;
  text-shadow: 0 0 5px rgba(0, 209, 255, 0.8);
}

/* Adapter les contrôles pour les appareils mobiles */
@media (max-width: 768px) {
  .touch-controls {
    bottom: 20px;
    right: 20px;
  }
  
  .d-pad {
    width: 150px;
    height: 150px;
  }
  
  .control-button {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }
  
  .spacer {
    width: 50px;
  }
  
  .arrow {
    font-size: 24px;
  }
}
</style>
