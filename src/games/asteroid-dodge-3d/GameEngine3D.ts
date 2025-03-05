import * as THREE from 'three';
import Ship3D from './entities/Ship3D';
import Planet3D, { PlanetType } from './entities/Planet3D';
import Bonus3D, { BonusType3D } from './entities/Bonus3D';

export default class GameEngine3D {
  // Three.js components
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;

  // Game objects
  private ship: Ship3D | null = null;
  private planets: Planet3D[] = [];
  private bonuses: Bonus3D[] = [];
  
  // Game state
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private lastTime: number = 0;
  private difficulty: number = 0;
  private spawnTimer: number = 0;
  private score: number = 0;
  private lives: number = 3;
  private gameTime: number = 60; // 60 seconds game time
  private gameContainer: HTMLElement;
  
  // Animation d'introduction
  private isIntroPlaying: boolean = false;
  private introAnimationComplete: boolean = false;
  private introStartTime: number = 0;
  
  // Callbacks
  private onScoreUpdate: (score: number) => void;
  private onTimeUpdate: (time: number) => void;
  private onLivesUpdate: (lives: number) => void;
  private onGameOver: (score: number) => void;

  // Pools d'objets pour optimiser les performances
  private planetPool: Planet3D[] = [];
  private bonusPool: Bonus3D[] = [];
  
  // Variables pour les effets de bonus
  private bonusEffects = {
    shield: {
      active: false,
      timeRemaining: 0
    },
    slowTime: {
      active: false,
      timeRemaining: 0,
      timeScale: 1.0
    },
    bonusSpawnTimer: 0,
    bonusSpawnRate: 10 // Secondes entre les apparitions de bonus
  }
  
  constructor(
    container: HTMLElement,
    onScoreUpdate: (score: number) => void,
    onTimeUpdate: (time: number) => void,
    onLivesUpdate: (lives: number) => void,
    onGameOver: (score: number) => void
  ) {
    this.gameContainer = container;
    this.onScoreUpdate = onScoreUpdate;
    this.onTimeUpdate = onTimeUpdate;
    this.onLivesUpdate = onLivesUpdate;
    this.onGameOver = onGameOver;
    
    // Initialiser la scène Three.js
    this.scene = new THREE.Scene();
    // Fond bleu nuit profond avec une ambiance spatiale
    this.scene.background = new THREE.Color(0x0a1a2f);
    
    // Configurer la caméra
    const aspectRatio = this.gameContainer.clientWidth / this.gameContainer.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspectRatio, 0.1, 1000);
    this.camera.position.set(0, 5, 30); // Position ajustée pour voir le vaisseau en bas
    this.camera.lookAt(0, 5, 0); // Regard pointé un peu plus haut pour voir le champ de jeu
    
    // Configurer le renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      logarithmicDepthBuffer: true // Ajout d'un buffer de profondeur logarithmique pour éviter les problèmes de z-fighting
    });
    this.renderer.setSize(this.gameContainer.clientWidth, this.gameContainer.clientHeight);
    this.renderer.shadowMap.enabled = true;
    // Désactiver le depth test pour que les objets se dessinent dans l'ordre d'apparition dans la scène
    this.renderer.sortObjects = true; // S'assurer que les objets sont bien triés
    this.gameContainer.appendChild(this.renderer.domElement);
    
    // Ajouter les lumières
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(this.ambientLight);
    
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    this.directionalLight.position.set(5, 10, 7.5);
    this.directionalLight.castShadow = true;
    this.scene.add(this.directionalLight);
    
    // Ajouter les étoiles en arrière-plan
    this.addStarField();
    
    // Ajouter gestionnaire de redimensionnement
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Configurer les contrôles clavier
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
  }
  
  /**
   * Crée un fond étoilé pour la scène
   */
  private addStarField(): void {
    // Créer des étoiles en arrière-plan
    const starsGeometry = new THREE.BufferGeometry();
    
    // Matériau pour les étoiles blanches classiques
    const whiteStar = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });
    
    // Matériau pour les étoiles bleues
    const blueStar = new THREE.PointsMaterial({
      color: 0x8acdff,
      size: 0.12,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true
    });
    
    // Matériau pour les étoiles rouges/oranges
    const redStar = new THREE.PointsMaterial({
      color: 0xffaa77,
      size: 0.14,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true
    });
    
    const starsCount = 3000; // Plus d'étoiles pour un ciel plus dense
    const starsPositions = new Float32Array(starsCount * 3);
    
    for (let i = 0; i < starsCount; i++) {
      const i3 = i * 3;
      // Distribuez les étoiles dans un grand espace autour de la scène
      starsPositions[i3] = (Math.random() - 0.5) * 200; // Large écart horizontal
      starsPositions[i3 + 1] = Math.random() * 100 - 10; // Plus d'étoiles au-dessus du vaisseau
      starsPositions[i3 + 2] = -5 - Math.random() * 100; // Toutes les étoiles en arrière-plan
    }
    
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
    
    // Créer trois groupes d'étoiles avec des couleurs différentes
    const whiteStarField = new THREE.Points(starsGeometry.clone(), whiteStar);
    const blueStarField = new THREE.Points(starsGeometry.clone(), blueStar);
    const redStarField = new THREE.Points(starsGeometry.clone(), redStar);
    
    // Décaler légèrement les positions des étoiles colorées
    const bluePositions = new Float32Array(starsPositions.length);
    const redPositions = new Float32Array(starsPositions.length);
    
    for (let i = 0; i < starsPositions.length; i += 3) {
      if (Math.random() > 0.7) { // Seulement certaines seront bleues
        bluePositions[i] = starsPositions[i] + (Math.random() - 0.5) * 20;
        bluePositions[i+1] = starsPositions[i+1] + (Math.random() - 0.5) * 20;
        bluePositions[i+2] = starsPositions[i+2] - Math.random() * 50;
      } else {
        bluePositions[i] = 1000; // Hors de la vue
      }
      
      if (Math.random() > 0.85) { // Encore moins seront rouges
        redPositions[i] = starsPositions[i] + (Math.random() - 0.5) * 30;
        redPositions[i+1] = starsPositions[i+1] + (Math.random() - 0.5) * 30;
        redPositions[i+2] = starsPositions[i+2] - Math.random() * 80;
      } else {
        redPositions[i] = 1000; // Hors de la vue
      }
    }
    
    blueStarField.geometry.setAttribute('position', new THREE.BufferAttribute(bluePositions, 3));
    redStarField.geometry.setAttribute('position', new THREE.BufferAttribute(redPositions, 3));
    
    this.scene.add(whiteStarField);
    this.scene.add(blueStarField);
    this.scene.add(redStarField);
  }
  
  /**
   * Gère le redimensionnement de la fenêtre
   */
  private handleResize(): void {
    if (!this.gameContainer || !this.camera || !this.renderer) return;
    
    const width = this.gameContainer.clientWidth;
    const height = this.gameContainer.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  /**
   * Définit la position cible du vaisseau en fonction de la position de la souris
   * @param mouseX Position X de la souris convertie en coordonnées du monde
   */
  public setMousePosition(mouseX: number): void {
    if (!this.isRunning || this.isPaused || !this.ship) return;
    
    // Envoyer la position cible au vaisseau
    this.ship.setTargetX(mouseX);
  }
  
  /**
   * Gère l'appui sur une touche du clavier (désactivé)
   * Conservé pour compatibilité mais n'est plus utilisé
   */
  public handleKeyDown(event: KeyboardEvent): void {
    // Désactivé - le contrôle se fait uniquement à la souris
  }
  
  /**
   * Gère le relâchement d'une touche du clavier (désactivé)
   * Conservé pour compatibilité mais n'est plus utilisé
   */
  public handleKeyUp(event: KeyboardEvent): void {
    // Désactivé - le contrôle se fait uniquement à la souris
  }
  
  /**
   * Initialise ou réinitialise le jeu
   */
  private init(): void {
    // Vider la scène des objets de jeu existants
    if (this.ship) {
      this.ship.dispose();
      this.ship = null;
    }
    
    // Nettoyer les planètes
    this.planets.forEach(planet => planet.dispose());
    this.planets = [];
    
    // Nettoyer les bonus
    this.bonuses.forEach(bonus => bonus.dispose());
    this.bonuses = [];
    
    // Réinitialiser l'état du jeu
    this.score = 0;
    this.lives = 3;
    this.difficulty = 0;
    this.gameTime = 60;
    this.spawnTimer = 0;
    
    // Réinitialiser l'animation d'introduction
    this.isIntroPlaying = false;
    this.introAnimationComplete = false;
    
    // Réinitialiser les effets de bonus
    this.bonusEffects = {
      shield: {
        active: false,
        timeRemaining: 0
      },
      slowTime: {
        active: false,
        timeRemaining: 0,
        timeScale: 1.0
      },
      bonusSpawnTimer: this.bonusEffects.bonusSpawnRate * 0.5, // Premier bonus apparaît plus tôt
      bonusSpawnRate: 10
    };
    
    // NOTE: Le vaisseau est créé dans la méthode start() pour éviter les doublons
    
    // Mettre à jour l'UI
    this.onScoreUpdate(this.score);
    this.onLivesUpdate(this.lives);
    this.onTimeUpdate(this.gameTime);
  }

  /**
   * Démarre la boucle de jeu
   */
  start(): void {
    if (this.isRunning) return;
    
    this.init();
    this.isRunning = true;
    this.isPaused = false;
    
    // Démarrer l'animation d'introduction
    this.isIntroPlaying = true;
    this.introStartTime = performance.now();
    
    // Créer le vaisseau du joueur
    this.ship = new Ship3D(this.scene);
    
    // Positionner le vaisseau en dehors de l'écran pour l'animation d'entrée
    this.ship.position = new THREE.Vector3(0, -15, 30);
    // Orienter le vaisseau vers la caméra
    this.ship.mesh.rotation.x = Math.PI / 4;
    
    this.lastTime = performance.now();
    this.animate();
  }
  
  /**
   * Met en pause le jeu
   */
  pause(): void {
    this.isPaused = true;
  }
  
  /**
   * Gère l'animation d'introduction du vaisseau
   */
  private updateIntroAnimation(): void {
    if (!this.ship || this.introAnimationComplete) return;
    
    const currentTime = performance.now();
    const elapsedTime = (currentTime - this.introStartTime) / 1000; // en secondes
    const animationDuration = 3.0; // durée totale de l'animation en secondes
    
    if (elapsedTime >= animationDuration) {
      // Animation terminée, placer le vaisseau à sa position finale
      this.ship.position = new THREE.Vector3(0, -8, 0);
      this.ship.mesh.rotation.x = 0;
      
      // Terminer l'animation et commencer le jeu réel
      this.isIntroPlaying = false;
      this.introAnimationComplete = true;
      return;
    }
    
    // Pourcentage de progression de l'animation (de 0 à 1)
    const t = elapsedTime / animationDuration;
    
    // Utiliser une fonction d'ease-out pour un mouvement plus naturel
    // La formule cubic ease-out: t => 1 - Math.pow(1 - t, 3);
    const easeOut = 1 - Math.pow(1 - t, 3);
    
    // Interpoler la position du vaisseau
    // De la position de départ (0, -15, 30) à la position finale (0, -8, 0)
    const startX = 0;
    const startY = -15;
    const startZ = 30;
    
    const endX = 0;
    const endY = -8;
    const endZ = 0;
    
    const currentX = startX + (endX - startX) * easeOut;
    const currentY = startY + (endY - startY) * easeOut;
    const currentZ = startZ + (endZ - startZ) * easeOut;
    
    // Appliquer la position interpolée
    this.ship.position = new THREE.Vector3(currentX, currentY, currentZ);
    
    // Tourner graduellement le vaisseau de sa rotation initiale à sa rotation finale
    const startRotationX = Math.PI / 4;
    const endRotationX = 0;
    
    const currentRotationX = startRotationX + (endRotationX - startRotationX) * easeOut;
    this.ship.mesh.rotation.x = currentRotationX;
  }
  
  /**
   * Reprend le jeu après une pause
   */
  resume(): void {
    if (this.isRunning) {
      this.isPaused = false;
      this.lastTime = performance.now();
      this.animate();
    }
  }
  
  /**
   * Arrête complètement le jeu
   */
  stop(): void {
    this.isRunning = false;
    this.isPaused = false;
  }
  
  /**
   * Réinitialise le jeu
   */
  reset(): void {
    this.stop();
    this.init();
  }
  
  /**
   * Boucle d'animation principale
   */
  private animate(): void {
    if (!this.isRunning) return;
    
    const now = performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1); // sec, limité à 0.1s
    this.lastTime = now;
    
    if (!this.isPaused) {
      this.update(deltaTime);
    }
    
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate.bind(this));
  }
  
  /**
   * Met à jour l'état du jeu à chaque frame
   */
  private update(deltaTime: number): void {
    // Gérer l'animation d'introduction
    if (this.isIntroPlaying) {
      this.updateIntroAnimation();
      return; // Ne pas mettre à jour le reste du jeu pendant l'intro
    }
    
    // Ajuster le deltaTime si le ralentissement du temps est actif
    if (this.bonusEffects.slowTime.active) {
      deltaTime *= this.bonusEffects.slowTime.timeScale;
    }
    
    // Augmenter la vitesse globale du jeu de 50%
    deltaTime *= 1.5;
    
    // Mettre à jour le temps de jeu
    if (this.gameTime > 0) {
      this.gameTime -= deltaTime;
      
      if (this.gameTime <= 0) {
        this.gameTime = 0;
        this.endGame();
        return; // Sortir de la fonction pour éviter tout autre traitement
      }
      
      // Arrondir pour éviter les problèmes de precision avec les nombres flottants
      const roundedTime = Math.max(Math.ceil(this.gameTime), 1); // Garantir au moins 1 seconde
      this.onTimeUpdate(roundedTime);
    }
    
    // Mettre à jour le vaisseau
    if (this.ship) {
      this.ship.update(deltaTime);
    }
    
    // Mettre à jour les planètes
    this.updatePlanets(deltaTime);
    
    // Mettre à jour les bonus
    this.updateBonuses(deltaTime);
    
    // Gérer les effets de bonus
    this.updateBonusEffects(deltaTime);
    
    // Vérifier les collisions
    this.checkCollisions();
    this.checkBonusCollisions(); // Vérifier aussi les collisions avec les bonus
    
    // Augmenter progressivement la difficulté
    this.difficulty += deltaTime * 0.05;
    
    // Spawn de nouveaux objets avec un contrôle amélioré
    this.spawnTimer -= deltaTime;
    if (this.spawnTimer <= 0) {
      // Ne pas créer de nouvelles planètes si trop de planètes sont déjà en jeu
      const maxPlanets = 15 + Math.min(15, Math.floor(this.difficulty)); // Augmentation du nombre max de planètes
      if (this.planets.length < maxPlanets) {
        this.spawnPlanet();
        
        // Chance de spawn d'une planète supplémentaire si on n'a pas atteint le maximum
        if (this.planets.length < maxPlanets && Math.random() < 0.3) {
          this.spawnPlanet();
        }
      }
      // Ajuster le temps de spawn en fonction de la difficulté
      this.spawnTimer = Math.max(2.0 - this.difficulty * 0.1, 0.5);
    }
    
    // Spawn de bonus occasionnels
    this.bonusEffects.bonusSpawnTimer -= deltaTime;
    if (this.bonusEffects.bonusSpawnTimer <= 0) {
      this.spawnRandomBonus(); // Utiliser spawnRandomBonus au lieu de spawnBonus sans paramètres
      // Réinitialiser le minuteur de spawn de bonus (toutes les 10-15 secondes)
      this.bonusEffects.bonusSpawnTimer = 10 + Math.random() * 5;
    }
  }
  
  /**
   * Met à jour les planètes et en génère de nouvelles
   */
  private updatePlanets(deltaTime: number): void {
    // Mettre à jour les planètes existantes
    for (let i = this.planets.length - 1; i >= 0; i--) {
      const planet = this.planets[i];
      
      planet.update(deltaTime);
      
      // Supprimer les planètes inactives
      if (!planet.getActive()) {
        this.planets.splice(i, 1);
        this.planetPool.push(planet); // Recycler la planète
      }
    }
    
    // Fréquence variable pour plus de planètes avec la difficulté croissante
    const baseSpawnRate = Math.max(0.3, 1 - this.difficulty * 0.1);
    const effectiveRate = baseSpawnRate + Math.random() * 0.2;
    
    // Note: la création des planètes est maintenant gérée uniquement dans la méthode update
    // donc nous ne faisons pas de création ici pour éviter le problème de boucle
    
    // Système secondaire pour ajouter des planètes surprises
    // Limité par le nombre maximum de planètes en jeu pour éviter la surcharge
    const maxPlanets = 10 + Math.min(10, Math.floor(this.difficulty));
    const surpriseChance = 0.003 + (0.002 * this.difficulty); // Réduit pour éviter trop de planètes
    
    if (this.planets.length < maxPlanets && Math.random() < surpriseChance * deltaTime) {
      // Type vraiment aléatoire
      const typeArray = [
        PlanetType.EARTH,
        PlanetType.MARS,
        PlanetType.VENUS,
        PlanetType.JUPITER,
        PlanetType.NEPTUNE
      ];
      
      const randomIndex = Math.floor(Math.random() * typeArray.length);
      const type = typeArray[randomIndex];
      
      // Position sur les côtés pour des attaques surprises
      let posX, posY;
      if (Math.random() < 0.5) {
        // Côtés gauche/droit
        posX = (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 5);
        posY = (Math.random() - 0.5) * 20;
      } else {
        // Haut/bas
        posX = (Math.random() - 0.5) * 40;
        posY = (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 5);
      }
      
      const posZ = (Math.random() - 0.5) * 5; // Ajouter de la profondeur
      this.spawnPlanet(type, new THREE.Vector3(posX, posY, posZ));
    }
  }
  
  /**
   * Crée ou récupère une planète du pool et l'ajoute à la scène
   */
  private spawnPlanet(type?: PlanetType, position?: THREE.Vector3): void {
    // Si aucun type n'est spécifié, en choisir un aléatoirement
    if (!type) {
      const typeSelector = Math.random();
      
      if (typeSelector < 0.2) {
        type = PlanetType.EARTH;
      } else if (typeSelector < 0.4) {
        type = PlanetType.MARS;
      } else if (typeSelector < 0.6) {
        type = PlanetType.VENUS;
      } else if (typeSelector < 0.8) {
        type = PlanetType.JUPITER;
      } else {
        type = PlanetType.NEPTUNE;
      }
    }
    
    // Si aucune position n'est spécifiée, en générer une aléatoire
    if (!position) {
      // Position X aléatoire sur une plage plus large pour éviter les regroupements
      const posX = (Math.random() - 0.5) * 40;
      
      // Position Y au-dessus de l'écran avec une hauteur variable
      // Éviter de créer des planètes trop proches entre elles en hauteur
      const posY = 30 + Math.random() * 10;
      
      // Position Z fixée à 0 pour être au même niveau que le vaisseau
      const posZ = 0;
      
      position = new THREE.Vector3(posX, posY, posZ);
    } else {
      // Si une position est fournie, s'assurer que la coordonnée Z est à 0
      position.z = 0;
    }
    
    let planet: Planet3D;
    
    // Utiliser une planète du pool s'il en existe une
    if (this.planetPool.length > 0) {
      planet = this.planetPool.pop()!;
      planet.setActive(true);
      planet.position = position;
    } else {
      // Créer une nouvelle planète
      planet = new Planet3D(this.scene, type, position);
    }
    
    // S'assurer que la planète a une vitesse qui varie en fonction de sa taille et de la difficulté
    const speedVariation = 0.8 + Math.random() * 0.4; // 80% à 120% de la vitesse normale
    const difficultyBoost = 1.0 + this.difficulty * 0.1; // Augmente avec la difficulté
    planet.adjustVelocity(speedVariation * difficultyBoost);
    
    this.planets.push(planet);
  }
  
  /**
   * Fait apparaître un bonus de type aléatoire à une position aléatoire
   */
  private spawnRandomBonus(): void {
    // Sélection aléatoire du type de bonus
    const bonusTypes = [
      BonusType3D.POINTS,
      BonusType3D.SHIELD,
      BonusType3D.SLOWTIME,
      BonusType3D.EXTRALIFE
    ];
    
    // Pondération des types de bonus
    // Points: 50%, Bouclier: 20%, Ralentissement: 20%, Vie supplémentaire: 10%
    let typeIndex: number;
    const rand = Math.random();
    
    if (rand < 0.5) {
      typeIndex = 0; // POINTS
    } else if (rand < 0.7) {
      typeIndex = 1; // SHIELD
    } else if (rand < 0.9) {
      typeIndex = 2; // SLOWTIME
    } else {
      typeIndex = 3; // EXTRALIFE
    }
    
    const bonusType = bonusTypes[typeIndex];
    
    // Position aléatoire (en haut de l'écran)
    const posX = (Math.random() - 0.5) * 30;
    const posY = 25 + Math.random() * 5;
    const posZ = 0; // Même niveau Z que le vaisseau
    
    this.spawnBonus(bonusType, new THREE.Vector3(posX, posY, posZ));
  }
  
  /**
   * Crée ou récupère un bonus du pool et l'ajoute à la scène
   */
  private spawnBonus(type: BonusType3D, position: THREE.Vector3): void {
    let bonus: Bonus3D;
    
    // Utiliser un bonus du pool s'il en existe un
    if (this.bonusPool.length > 0) {
      bonus = this.bonusPool.pop()!;
      bonus.setActive(true);
      bonus.position = position;
    } else {
      // Créer un nouveau bonus
      bonus = new Bonus3D(this.scene, type, position);
    }
    
    this.bonuses.push(bonus);
  }
  
  /**
   * Met à jour les bonus, gère leur apparition et leurs effets
   */
  private updateBonuses(deltaTime: number): void {
    // Mettre à jour les bonus existants
    for (let i = this.bonuses.length - 1; i >= 0; i--) {
      const bonus = this.bonuses[i];
      
      bonus.update(deltaTime);
      
      // Si le bonus n'est plus actif, le recycler dans le pool
      if (!bonus.getActive()) {
        this.bonuses.splice(i, 1);
        this.bonusPool.push(bonus);
      }
    }
    
    // Mettre à jour les effets de bonus actifs
    this.updateBonusEffects(deltaTime);
    
    // Gérer l'apparition de nouveaux bonus
    this.bonusEffects.bonusSpawnTimer -= deltaTime;
    
    if (this.bonusEffects.bonusSpawnTimer <= 0) {
      // Réinitialiser le timer avec un délai aléatoire
      this.bonusEffects.bonusSpawnTimer = this.bonusEffects.bonusSpawnRate * (0.8 + Math.random() * 0.4);
      
      // Limiter le nombre de bonus simultanés
      if (this.bonuses.length < 3) {
        this.spawnRandomBonus();
      }
    }
  }
  
  /**
   * Met à jour les effets actifs des bonus
   */
  private updateBonusEffects(deltaTime: number): void {
    // Mise à jour de l'effet de bouclier
    if (this.bonusEffects.shield.active) {
      this.bonusEffects.shield.timeRemaining -= deltaTime;
      
      if (this.bonusEffects.shield.timeRemaining <= 0) {
        this.bonusEffects.shield.active = false;
        if (this.ship) {
          this.ship.isInvulnerable = false;
        }
      }
    }
    
    // Mise à jour de l'effet de ralentissement du temps
    if (this.bonusEffects.slowTime.active) {
      this.bonusEffects.slowTime.timeRemaining -= deltaTime;
      
      if (this.bonusEffects.slowTime.timeRemaining <= 0) {
        this.bonusEffects.slowTime.active = false;
        this.bonusEffects.slowTime.timeScale = 1.0;
      }
    }
  }
  
  /**
   * Vérifie les collisions entre le vaisseau et les bonus
   */
  private checkBonusCollisions(): void {
    if (!this.ship) return;
    
    for (let i = this.bonuses.length - 1; i >= 0; i--) {
      const bonus = this.bonuses[i];
      
      if (bonus.getActive() && this.ship.isCollidingWith(bonus)) {
        this.handleBonusCollision(bonus);
        // Désactiver le bonus après l'avoir collecté
        bonus.setActive(false);
        this.bonuses.splice(i, 1);
        this.bonusPool.push(bonus);
      }
    }
  }
  
  /**
   * Gère la collecte d'un bonus par le vaisseau
   */
  private handleBonusCollision(bonus: Bonus3D): void {
    const bonusType = bonus.getType();
    const bonusValue = bonus.getValue();
    
    switch (bonusType) {
      case BonusType3D.POINTS:
        // Ajouter des points au score
        this.score += bonusValue;
        this.onScoreUpdate(this.score);
        break;
        
      case BonusType3D.SHIELD:
        // Activer le bouclier pour une durée donnée
        this.bonusEffects.shield.active = true;
        this.bonusEffects.shield.timeRemaining = bonusValue;
        if (this.ship) {
          this.ship.isInvulnerable = true;
        }
        break;
        
      case BonusType3D.SLOWTIME:
        // Ralentir le temps (les planètes bougent plus lentement)
        this.bonusEffects.slowTime.active = true;
        this.bonusEffects.slowTime.timeRemaining = bonusValue;
        this.bonusEffects.slowTime.timeScale = 0.5; // 50% de la vitesse normale
        break;
        
      case BonusType3D.EXTRALIFE:
        // Ajouter une vie supplémentaire
        this.lives += bonusValue;
        this.onLivesUpdate(this.lives);
        break;
    }
  }
  
  /**
   * Vérifie les collisions entre le vaisseau et les planètes
   */
  private checkCollisions(): void {
    if (!this.ship || this.ship.isInvulnerable) return;
    
    for (const planet of this.planets) {
      if (planet.getActive() && this.ship.isCollidingWith(planet)) {
        this.handleCollision(planet);
        break; // Une seule collision à la fois
      }
    }
  }
  
  /**
   * Gère la collision entre le vaisseau et une planète
   */
  private handleCollision(planet: Planet3D): void {
    // Retirer des points
    this.score = Math.max(0, this.score - planet.getPointValue());
    this.onScoreUpdate(this.score);
    
    // Perdre une vie
    this.lives--;
    this.onLivesUpdate(this.lives);
    
    if (this.lives <= 0) {
      this.gameOver();
      return;
    }
    
    // Rendre le vaisseau invulnérable
    if (this.ship) {
      this.ship.makeInvulnerable();
    }
    
    // Désactiver la planète (elle sera retirée dans updatePlanets)
    planet.setActive(false);
  }
  
  /**
   * Termine le jeu
   */
  private gameOver(): void {
    this.stop();
    this.onGameOver(this.score);
  }
  
  /**
   * Nettoie les ressources et événements
   */
  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize.bind(this));
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Nettoyer les objets de jeu
    if (this.ship) {
      this.ship.dispose();
    }
    
    // Nettoyer les autres ressources...
  }
}
