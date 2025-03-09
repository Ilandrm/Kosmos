<template>
  <div class="maze-game-container">
    <div ref="gameContainer" class="game-canvas-container"></div>
    
    <!-- UI overlay -->
    <div v-if="gameState !== 'playing'" class="game-overlay">
      <div v-if="gameState === 'menu'" class="menu">
        <h1>LABYRINTHE SPATIAL 3D</h1>
        <button @click="startGame" class="start-btn">COMMENCER</button>
        <div class="instructions">
          <h2>Instructions</h2>
          <p>Utilisez les touches fléchées pour déplacer votre vaisseau.</p>
          <p>Naviguez à travers le labyrinthe pour atteindre la planète violette!</p>
        </div>
        <h1>Menu Principal</h1>
        <router-link to="/space-hangman">Pendu Spatial</router-link>
      </div>
      
      <div v-if="gameState === 'victory'" class="victory">
        <h1>VICTOIRE!</h1>
        <p>Vous avez atteint la planète en {{ formattedTime }}!</p>
        <button @click="restartGame" class="restart-btn">REJOUER</button>
        <button @click="returnToMenu" class="menu-btn">MENU PRINCIPAL</button>
      </div>
      
      <div v-if="gameState === 'game-over'" class="game-over">
        <h1>FIN DU JEU!</h1>
        <p>Vous n'avez pas atteint la planète dans le temps imparti.</p>
        <button @click="restartGame" class="restart-btn">REJOUER</button>
        <button @click="returnToMenu" class="menu-btn">MENU PRINCIPAL</button>
      </div>
    </div>
    
    <!-- Game HUD -->
    <div v-if="gameState === 'playing'" class="game-hud">
      <div class="timer">Temps: {{ formattedTime }}</div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount, computed } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Ship3D from './entities/Ship3D';

export default defineComponent({
  name: 'Maze3DGame',
  setup() {
    // État du jeu
    const gameState = ref('menu'); // 'menu', 'playing', 'victory', 'game-over'
    const gameTime = ref(0);
    const gameTimer = ref<number | null>(null);
    
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
    
    // Liste des murs pour la détection de collision
    let mazeWalls: THREE.Object3D[] = [];
    
    // Variables de jeu
    let shipSpeed = 0.1;
    let shipRotationSpeed = 0.05;
    let shipVelocity = new THREE.Vector3();
    let keysPressed: { [key: string]: boolean } = {};
    let isColliding = false;
    const moveDistance = 0.2;
    let mazeLayout: number[][] = [
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
    ];
    const mazeSize = 10;
    const wallSize = 3; // Augmentation de la taille des murs
    const corridorWidth = 2; // Espace supplémentaire entre les murs
    let shipStartPosition = new THREE.Vector3();
    let goalPosition = new THREE.Vector3();
    
    // Méthodes du jeu
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
      for (let i = 0; i < mazeSize; i++) {
        for (let j = 0; j < mazeSize; j++) {
          const cell = mazeLayout[i][j];
          
          if (cell === 1) {
            // Mur avec design amélioré
            const wallGeometry = new THREE.BoxGeometry(wallSize, wallSize * 1.5, wallSize);
            
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
            const posX = j * (wallSize + corridorWidth);
            const posZ = i * (wallSize + corridorWidth);
            
            wall.position.set(posX, wallSize / 2, posZ);
            wall.castShadow = true;
            wall.receiveShadow = true;
            wall.userData = { type: 'wall' };
            
            // Ajouter un effet de bordure lumineuse
            const edgeGeometry = new THREE.BoxGeometry(wallSize + 0.1, wallSize * 1.5 + 0.1, wallSize + 0.1);
            const edgeMaterial = new THREE.MeshBasicMaterial({
              color: 0x00aaff,
              transparent: true,
              opacity: 0.3,
              wireframe: true
            });
            
            const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
            edge.position.copy(wall.position);
            maze.add(edge);
            
            maze.add(wall);
          }
          else if (cell === 0) {
            // Espace vide avec sol amélioré
            const floorSize = wallSize + corridorWidth;
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
            floor.position.set(j * (wallSize + corridorWidth), 0, i * (wallSize + corridorWidth));
            floor.receiveShadow = true;
            
            // Ajouter des lignes de grille au sol
            const gridHelper = new THREE.GridHelper(floorSize, 4, 0x0055ff, 0x002299);
            gridHelper.position.set(
              j * (wallSize + corridorWidth),
              0.01, // Légèrement au-dessus du sol
              i * (wallSize + corridorWidth)
            );
            maze.add(gridHelper);
            
            maze.add(floor);
          }
          else if (cell === 2) {
            // Point de départ
            shipStartPosition.set(j * (wallSize + corridorWidth), 1, i * (wallSize + corridorWidth));
            
            // Plateforme de départ
            const floorSize = wallSize + corridorWidth;
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
            floor.position.set(j * (wallSize + corridorWidth), 0, i * (wallSize + corridorWidth));
            floor.receiveShadow = true;
            
            // Lumière au point de départ
            const startLight = new THREE.PointLight(0x33ff66, 2, 8);
            startLight.position.set(j * (wallSize + corridorWidth), 2, i * (wallSize + corridorWidth));
            scene.add(startLight);
            
            maze.add(floor);
          }
          else if (cell === 3) {
            // Point d'arrivée
            goalPosition.set(j * (wallSize + corridorWidth), 1, i * (wallSize + corridorWidth));
            
            // Plateforme d'arrivée
            const floorSize = wallSize + corridorWidth;
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
            floor.position.set(j * (wallSize + corridorWidth), 0, i * (wallSize + corridorWidth));
            floor.receiveShadow = true;
            
            // Lumière au point d'arrivée
            const goalLight = new THREE.PointLight(0xaa33ff, 3, 10);
            goalLight.position.set(j * (wallSize + corridorWidth), 2, i * (wallSize + corridorWidth));
            scene.add(goalLight);
            
            maze.add(floor);
          }
        }
      }
      
      // La position d'arrivée est déjà définie par la cellule 3 dans le labyrinthe
      
      scene.add(maze);
    }
    
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
      
      console.log('Vaisseau créé et positionné au point de départ');
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
      }, 1000);
      
      // S'assurer que la position initiale est correctement enregistrée
      if (ship && shipStartPosition) {
        shipStartPosition.copy(ship.position);
        console.log('Position de départ enregistrée:', shipStartPosition);
      }
      
      // Changer l'état du jeu après initialisation
      gameState.value = 'playing';
      
      // Démarrer la boucle d'animation
      animate();
      
      // Définir un timer pour terminer le jeu après 30 secondes
      let gameTimerId = setTimeout(() => {
        endGame();
      }, 30000);
      
      onBeforeUnmount(() => {
        clearTimeout(gameTimerId);
      });
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
      
      // Retirer les gestionnaires d'événements
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
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
      
      // Retirer les gestionnaires d'événements
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
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
    
    function handleResize() {
      if (!camera || !renderer || !gameContainer.value) return;
      
      // Mettre à jour les dimensions
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // Animation et logique de jeu
    function animate(time: number = 0) {
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
      checkGoal();
      
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
    
    function updateShipPosition() {
      if (!ship) return;
      
      // Réinitialiser la vélocité
      shipVelocity.set(0, 0, 0);
      
      // Rotation du vaisseau
      if (keysPressed['ArrowLeft']) {
        ship.rotation.y += shipRotationSpeed;
      }
      if (keysPressed['ArrowRight']) {
        ship.rotation.y -= shipRotationSpeed;
      }
      
      // Déplacement du vaisseau
      if (keysPressed['ArrowUp']) {
        // Ajouter une vitesse en direction de l'avant du vaisseau
        shipVelocity.x = Math.sin(-ship.rotation.y) * shipSpeed;
        shipVelocity.z = Math.cos(-ship.rotation.y) * shipSpeed;
      }
      if (keysPressed['ArrowDown']) {
        // Ajouter une vitesse en direction de l'arrière du vaisseau
        shipVelocity.x = -Math.sin(-ship.rotation.y) * shipSpeed;
        shipVelocity.z = -Math.cos(-ship.rotation.y) * shipSpeed;
      }
      
      // Sauvegarder la position actuelle au cas où nous devrions revenir en arrière
      const previousPosition = ship.position.clone();
      
      // Mettre à jour la position
      ship.position.add(shipVelocity);
      
      // Vérifier les collisions avec les murs
      checkWallCollisions(previousPosition);
      
      // Mettre à jour la position de la caméra pour qu'elle suive le vaisseau
      controls.target.copy(ship.position);
    }
    
    function checkWallCollisions(previousPosition: THREE.Vector3) {
      if (!ship || !maze) return;
      
      // Vérifier les collisions avec les murs
      const shipDirection = new THREE.Vector3();
      ship.getWorldDirection(shipDirection);
      
      raycaster.set(ship.position, shipDirection);
      
      const intersects = raycaster.intersectObjects(maze.children);
      
      // Si une collision est détectée avec un mur et qu'elle est très proche
      if (intersects.length > 0 && 
          intersects[0].object.userData && 
          intersects[0].object.userData.type === 'wall' && 
          intersects[0].distance < 1) {
        // Revenir à la position précédente
        ship.position.copy(previousPosition);
      }
    }
    
    function checkCollisions() {
      if (!ship || !maze) return;
      
      // Vérifier les collisions avec les murs
      const directions = [
        new THREE.Vector3(1, 0, 0),   // droite
        new THREE.Vector3(-1, 0, 0),  // gauche
        new THREE.Vector3(0, 0, 1),   // avant
        new THREE.Vector3(0, 0, -1),  // arrière
      ];
      
      for (const direction of directions) {
        raycaster.set(ship.position, direction);
        const intersects = raycaster.intersectObjects(maze.children);
        
        if (intersects.length > 0 && 
            intersects[0].object.userData && 
            intersects[0].object.userData.type === 'wall' && 
            intersects[0].distance < 0.5) {
          // On est trop près d'un mur dans cette direction
          isColliding = true;
          return;
        }
      }
      
      isColliding = false;
    }
    
    function checkGoal() {
      if (!ship || !goal) return;
      
      // Ne vérifier la collision que si l'objectif est visible
      if (!goal.visible) return;
      
      // Vérifier la distance entre le vaisseau et l'objectif
      const distance = ship.position.distanceTo(goal.position);
      
      // Vérifier le temps de jeu pour éviter la victoire instantanée
      const minGameTimeBeforeWin = 5; // 5 secondes minimum de jeu
      const hasPlayedEnough = gameTime.value >= minGameTimeBeforeWin;
      
      // Vérifier si le joueur a suffisamment bougé de sa position de départ
      const minDistanceFromStart = 5; // Distance minimale du point de départ
      const hasMovedEnough = ship.position.distanceTo(shipStartPosition) >= minDistanceFromStart;
      
      if (distance < 2 && hasPlayedEnough && hasMovedEnough) {
        console.log('Victoire! Distance:', distance, 'Temps:', gameTime.value, 'secondes');
        endGame();
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
      
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
    });
    
    return {
      gameState,
      gameTime,
      formattedTime,
      gameContainer,
      startGame,
      restartGame,
      returnToMenu,
      endGame
    };
  }
});
</script>

<style scoped>
.maze-game-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #000;
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
</style>
