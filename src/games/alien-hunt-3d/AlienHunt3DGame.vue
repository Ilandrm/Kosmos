<template>
  <div class="alien-hunt-container">
    <div ref="gameContainer" class="game-canvas-container"></div>
    
    <!-- UI overlay -->
    <div v-if="gameState !== 'playing'" class="game-overlay">
      <div v-if="gameState === 'menu'" class="menu">
        <h1>CHASSE AUX ALIENS 3D</h1>
        <button @click="startGame" class="start-btn">COMMENCER</button>
        <div class="instructions">
          <h2>Instructions</h2>
          <p>Utilisez votre souris pour viser et cliquez pour tirer.</p>
          <p>Éliminez les vaisseaux aliens violets et évitez de tirer sur les verts.</p>
          <p>Atteignez 10 points pour gagner!</p>
        </div>
      </div>
      
      <div v-if="gameState === 'victory'" class="victory">
        <h1>VICTOIRE!</h1>
        <p>Score final: {{ score }}</p>
        <p>Temps: {{ formattedTime }}</p>
        <button @click="restartGame" class="restart-btn">REJOUER</button>
        <button @click="returnToMenu" class="menu-btn">MENU PRINCIPAL</button>
        <button @click="continueToNextGame" class="continue-btn">Continuer</button>
      </div>
      
      <div v-if="gameState === 'game-over'" class="game-over">
        <h1>GAME OVER</h1>
        <p>Score final: {{ score }}</p>
        <p>Temps: {{ formattedTime }}</p>
        <button @click="restartGame" class="restart-btn">REJOUER</button>
        <button @click="returnToMenu" class="menu-btn">MENU PRINCIPAL</button>
      </div>
    </div>
    
    <!-- Game HUD -->
    <div v-if="gameState === 'playing'" class="game-hud">
      <div class="score">Score: {{ score }}</div>
      <div class="timer">Temps: {{ formattedTime }}</div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { useRouter } from 'vue-router';
import GameFlowService from '../../services/GameFlowService';

// Peut-être d'autres imports nécessaires

export default defineComponent({
  name: 'AlienHunt3DGame',
  setup() {
    // État du jeu
    const gameState = ref('menu'); // 'menu', 'playing', 'victory', 'game-over'
    const score = ref(0);
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
    let animationFrameId: number;
    let raycaster: THREE.Raycaster;
    
    // Entités du jeu
    let alienShips: THREE.Object3D[] = [];
    let friendlyShips: THREE.Object3D[] = [];
    let bullets: THREE.Object3D[] = [];
    let stars: THREE.Points;
    
    // Modèle 3D OVNI
    let ovniModel: THREE.Group | null = null;
    const ovniScale = 0.8; // Échelle pour correspondre à la taille des soucoupes originales
    
    // Variables du gameplay
    const maxAliens = 10;
    const maxFriendlyShips = 5;
    const alienSpawnTime = 2000; // ms
    const friendlySpawnTime = 3000; // ms
    const bulletSpeed = 0.5;
    const shipSpeed = 0.05;
    const shipSpawnRange = 20;
    const winScore = 10;
    
    // Timers et contrôles
    let alienSpawnTimer: number | null = null;
    let friendlySpawnTimer: number | null = null;
    const mouse = new THREE.Vector2();
    let mouseDown = false;
    let canShoot = true;
    const shootCooldown = 500; // ms
    
    // État des objets
    interface ShipData {
      speed: THREE.Vector3;
      health: number;
      value: number;
    }
    
    const objectData = new WeakMap<THREE.Object3D, ShipData>();
    
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
      
      // Charger le modèle 3D OVNI
      loadOvniModel();
      
      // Enregistrer les gestionnaires d'événements
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('resize', handleResize);
      
      // Ajouter des vaisseaux (après un délai pour s'assurer que le modèle est chargé)
      setTimeout(() => {
        scheduleAlienSpawning();
        scheduleFriendlySpawning();
      }, 1000);
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
          console.error('Impossible de charger le modèle OVNI après plusieurs tentatives');
          return;
        }
        
        console.log(`Tentative de chargement du modèle OVNI depuis: ${paths[pathIndex]}`);
        
        loader.load(
          // URL du modèle
          paths[pathIndex],
          // Callback appelé quand le modèle est chargé
          function (gltf) {
            console.log('Modèle OVNI chargé avec succès:', gltf);
            ovniModel = gltf.scene;
            
            // Analyser la structure du modèle
            console.log('Structure du modèle:');
            ovniModel.traverse((child) => {
              console.log(child.name, child.type, child.isMesh ? 'Mesh' : '');
            });
            
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
            console.log('Création d\'un vaisseau test pour vérifier le modèle');
            createAlienShip();
          },
          // Callback de progression du chargement
          function (xhr) {
            console.log(`Chargement du modèle OVNI: ${(xhr.loaded / xhr.total * 100).toFixed(0)}%`);
          },
          // Callback d'erreur
          function (error) {
            console.error(`Erreur lors du chargement du modèle OVNI depuis ${paths[pathIndex]}:`, error);
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
    
    function createBullet() {
      // Créer une balle (tir laser)
      const bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
      const bulletMaterial = new THREE.MeshPhongMaterial({
        color: 0x33aaff,
        emissive: 0x0066cc,
        shininess: 100,
      });
      
      const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
      
      // Positionner la balle devant la caméra
      bullet.position.set(0, 0, 10);
      bullet.position.copy(camera.position);
      
      // Créer un vecteur pour la direction de la balle
      const bulletDirection = new THREE.Vector3();
      bulletDirection.set(mouse.x, mouse.y, 0.5);
      bulletDirection.unproject(camera);
      bulletDirection.sub(camera.position).normalize();
      
      // Sauvegarder la direction
      objectData.set(bullet, {
        speed: bulletDirection.multiplyScalar(bulletSpeed),
        health: 1,
        value: 0
      });
      
      bullet.userData = { type: 'bullet' };
      scene.add(bullet);
      bullets.push(bullet);
      
      return bullet;
    }
    
    function scheduleAlienSpawning() {
      // Créer un vaisseau alien tout de suite
      createAlienShip();
      
      // Programmer la création de nouveaux vaisseaux
      alienSpawnTimer = window.setInterval(() => {
        if (alienShips.length < maxAliens && gameState.value === 'playing') {
          createAlienShip();
        }
      }, alienSpawnTime);
    }
    
    function scheduleFriendlySpawning() {
      // Créer un vaisseau ami tout de suite
      createFriendlyShip();
      
      // Programmer la création de nouveaux vaisseaux
      friendlySpawnTimer = window.setInterval(() => {
        if (friendlyShips.length < maxFriendlyShips && gameState.value === 'playing') {
          createFriendlyShip();
        }
      }, friendlySpawnTime);
    }
    
    function startGame() {
      // Initialiser la scène et les objets
      initializeGame();
      
      // Mettre à jour l'état du jeu
      gameState.value = 'playing';
      score.value = 0;
      gameTime.value = 0;
      
      // Démarrer le compteur de temps
      gameTimer.value = window.setInterval(() => {
        gameTime.value++;
      }, 1000);
      
      // Démarrer la boucle d'animation
      animate();
      
      // Démarrer le timer pour finir le jeu après 30 secondes
      let gameTimerId = setTimeout(() => {
        endGame();
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
      const nextGame = GameFlowService.getNextGame('alien-hunt');
      const router = useRouter();
      router.push({ name: nextGame });
    }
    
    // Gestionnaires d'événements
    function handleMouseMove(event: MouseEvent) {
      // Calculer la position de la souris normalisée
      // -1 à +1 pour x, de gauche à droite
      // -1 à +1 pour y, de bas en haut
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    
    function handleMouseDown() {
      mouseDown = true;
      if (gameState.value === 'playing' && canShoot) {
        shoot();
      }
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
      
      // Vérifier les collisions
      checkCollisions();
      
      // Faire tourner les étoiles pour un effet de mouvement
      if (stars) {
        stars.rotation.x += 0.0001;
        stars.rotation.y += 0.0001;
      }
      
      // Vérifier les conditions de victoire
      checkWinCondition();
      
      // Rendu de la scène
      renderer.render(scene, camera);
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
        
        // Vérifier les collisions avec les vaisseaux aliens
        for (let j = alienShips.length - 1; j >= 0; j--) {
          const ship = alienShips[j];
          
          // Calculer la distance entre la balle et le vaisseau
          const distance = bullet.position.distanceTo(ship.position);
          
          // Si la distance est inférieure à un seuil, c'est une collision
          if (distance < 1.2) {
            // Ajouter des points au score
            const data = objectData.get(ship);
            if (data) {
              score.value += data.value;
            }
            
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
            
            // Si la distance est inférieure à un seuil, c'est une collision
            if (distance < 1.2) {
              // Retirer des points au score
              const data = objectData.get(ship);
              if (data) {
                score.value += data.value; // Valeur négative pour les vaisseaux amis
              }
              
              // Retirer le vaisseau et la balle
              scene.remove(ship);
              scene.remove(bullet);
              friendlyShips.splice(j, 1);
              bullets.splice(i, 1);
              
              // Vérifier si le joueur a perdu
              if (score.value < 0) {
                endGame(false); // Game over
              }
              
              // Sortir de la boucle interne
              break;
            }
          }
        }
      }
    }
    
    function checkWinCondition() {
      // Le joueur gagne s'il atteint un certain score
      if (score.value >= winScore) {
        endGame(true); // Victoire
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
      
      if (alienSpawnTimer) {
        clearInterval(alienSpawnTimer);
      }
      
      if (friendlySpawnTimer) {
        clearInterval(friendlySpawnTimer);
      }
      
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
    });
    
    return {
      gameState,
      score,
      gameTime,
      formattedTime,
      gameContainer,
      startGame,
      restartGame,
      returnToMenu,
      endGame,
      continueToNextGame
    };
  }
});
</script>

<style scoped>
.alien-hunt-container {
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
}

.score, .timer {
  margin-bottom: 10px;
  background: rgba(25, 10, 41, 0.6);
  padding: 0.5rem 1rem;
  border-radius: 5px;
  border: 1px solid #b090ff;
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
</style>
