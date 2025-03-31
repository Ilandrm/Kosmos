import * as THREE from 'three';
import Ship3D from './entities/Ship3D';
import Planet3D, { PlanetType } from './entities/Planet3D';
import Bonus3D, { BonusType3D } from './entities/Bonus3D';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';

/**
 * Classe principale du moteur de jeu 3D
 */
export default class GameEngine3D {
  // Three.js components
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private starField: THREE.Points | null = null; // Champ d'étoiles statique
  private hyperspaceStars: THREE.Group | null = null; // Groupe principal pour l'effet d'hypervitesse
  private hyperspaceIncoming: THREE.Group | null = null; // Traînées convergentes
  private hyperspaceOutgoing: THREE.Group | null = null; // Traînées divergentes
  private endGameObject: THREE.Object3D | null = null;
  private isPlayingEndAnimation: boolean = false;
  private kModelLoader: GLTFLoader | null = null;
  private preloadedKModel: THREE.Group | null = null;
  
  // Game objects
  private ship: Ship3D | null = null;
  private isGameOver: boolean = false;

  // Public getter for ship
  public getShip(): Ship3D | null {
    return this.ship;
  }
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
  private gameTime: number = 30; // 60 seconds game time
  private fpsCounter: number = 0;
  private lastFpsUpdate: number = 0;
  private gameContainer: HTMLElement;
  private endAnimationProgress: number = 0;

  // Animation d'introduction
  private isIntroPlaying: boolean = false;
  private introAnimationComplete: boolean = false;
  private introStartTime: number = 0;
  
  // Variables d'optimisation des performances
  private _animationCounter: number = 0;
  private _lowResMode: boolean = false;
  // Ajout des propriétés pour l'animation de fin

private endAnimationStartTime: number = 0;
  // Callbacks
  private onScoreUpdate: (score: number) => void;
  private scoreManager: any; // Référence au ScoreManager
  private onTimeUpdate: (time: number) => void;
  private onLivesUpdate: (lives: number) => void;
  private onGameOver: (score: number) => void;

  // Pools d'objets pour optimiser les performances
  private planetPool: Planet3D[] = [];
  private bonusPool: Bonus3D[] = [];
  
  // Limites pour réduire la charge et améliorer les performances
  private readonly MAX_PLANETS = 5;        // Réduit encore plus le nombre de planètes pour éviter le lag
  private readonly MAX_ACTIVE_PARTICLES = 10; // Réduire davantage le nombre de particules
  private readonly PHYSICS_STEP = 1/20;    // Taux encore plus bas pour la physique
  private readonly CULLING_DISTANCE = 25;  // Réduire la distance de culling
  private accumulatedTime = 0;             // Pour les mises à jour à pas fixe
  
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
    bonusSpawnRate: 1 // Augmenter la fréquence de spawn des bonus
  }
  
  constructor(
    container: HTMLElement,
    onScoreUpdate: (score: number) => void,
    onTimeUpdate: (time: number) => void,
    onLivesUpdate: (lives: number) => void,
    onGameOver: (score: number) => void,
    scoreManager?: any
  ) {
    this.gameContainer = container;
    this.onScoreUpdate = onScoreUpdate;
    this.onTimeUpdate = onTimeUpdate;
    this.onLivesUpdate = onLivesUpdate;
    this.onGameOver = onGameOver;
    this.scoreManager = scoreManager;
    this.preloadKModel();

    
    // Initialiser la scène Three.js
    this.scene = new THREE.Scene();
    // Fond bleu nuit profond avec une ambiance spatiale
    this.scene.background = new THREE.Color(0x0a1a2f);
    
    // Configurer la caméra
    const aspectRatio = this.gameContainer.clientWidth / this.gameContainer.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspectRatio, 0.1, 1000);
    this.camera.position.set(0, 5, 30); // Position ajustée pour voir le vaisseau en bas
    this.camera.lookAt(0, 5, 0); // Regard pointé un peu plus haut pour voir le champ de jeu
    
    // Configurer le renderer avec des options optimisées pour les performances
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: false, // Désactiver l'antialiasing pour améliorer les performances
      logarithmicDepthBuffer: false, // Désactiver pour améliorer les performances
      powerPreference: 'high-performance'
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
   * Crée un fond étoilé avec effet d'hypervitesse
   */
  private addStarField(): void {
    // 1. Créer le champ d'étoiles statique en arrière-plan (très peu visibles pendant l'hypervitesse)
    const starsGeometry = new THREE.BufferGeometry();
    
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08, // Plus petites pour moins attirer l'attention
      transparent: true,
      opacity: 0.4, // Moins visibles
      sizeAttenuation: true
    });
    
    const starsCount = 1000; // Réduction du nombre d'étoiles statiques
    const starsPositions = new Float32Array(starsCount * 3);
    
    for (let i = 0; i < starsCount; i++) {
      const i3 = i * 3;
      // Distribuer les étoiles en arrière-plan
      starsPositions[i3] = (Math.random() - 0.5) * 200;     // X
      starsPositions[i3 + 1] = Math.random() * 100 - 10;    // Y
      starsPositions[i3 + 2] = -5 - Math.random() * 50;     // Z
    }
    
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
    this.starField = new THREE.Points(starsGeometry, starMaterial);
    this.scene.add(this.starField);
    
    // 2. Créer les étoiles d'hypervitesse (l'effet principal)
    this.createHyperspaceEffect();
  }
  // Méthode pour démarrer l'animation de fin
  // Méthode pour démarrer l'animation de fin
  /** 
   * Crée l'effet d'hypervitesse/hyperespace avec uniquement des lignes lumineuses
   * moins intenses pour ne pas distraire du jeu principal
   */
  private createHyperspaceEffect(): void {
    // Créer un groupe pour contenir l'effet tunnel hyperspatial
    this.hyperspaceStars = new THREE.Group();
    
    // Groupe pour les lignes lumineuses
    this.hyperspaceOutgoing = new THREE.Group();
    this.hyperspaceIncoming = new THREE.Group();
    
    // Paramètres du tunnel
    const tunnelRadius = 30;
    const tunnelLength = 400;
    const trailsCount = 350; // Nombre total de traînées lumineuses
    
    // Palette de couleurs principalement grises et bleuâtres
    const hyperspaceColors = [
      new THREE.Color(0xcccccc), // Gris clair (dominant - 60%)
      new THREE.Color(0xbbc5d0), // Gris bleuâtre
      new THREE.Color(0xa9b2c3), // Gris acier
      new THREE.Color(0x8899aa), // Gris bleu foncé
      new THREE.Color(0x778899), // Bleu ardoise foncé
      new THREE.Color(0x5d6d7e)  // Gris bleu moyen
    ];
    
    // Augmentation du nombre de lignes pour un effet plus dense
    const enhancedTrailsCount = 550; // Plus de lignes pour un effet plus immersif
    
    // Créer le tunnel principal - avec des lignes droites qui convergent vers un trou central
    for (let i = 0; i < enhancedTrailsCount; i++) {
      // Position aléatoire sur la circonférence du tunnel
      const angle = Math.random() * Math.PI * 2; // Distribution uniforme sur 360 degrés
      
      // Créer un trou au centre en définissant un rayon minimum
      const centralHoleRadius = 15; // Taille du trou de convergence au centre
      const maxRadius = 40; // Extension maximale des lignes pour couvrir l'écran
      
      // Le rayon de départ commence au rayon du trou central minimum
      const startRadius = centralHoleRadius + Math.random() * (maxRadius - centralHoleRadius);
      
      // Position de départ de la ligne dans le tunnel
      const zPos = -tunnelLength + Math.random() * tunnelLength * 2; // Position aléatoire dans le tunnel
      
      // Paramètres des lignes - optimisés pour les performances
      const lineLength = 25 + Math.random() * 25; // Lignes plus uniformes
      const lineSegments = 2; // Réduction drastique du nombre de segments - lignes droites uniquement
      
      // Générer des points pour des lignes parfaitement droites qui convergent vers le centre
      const linePoints = [];
      for (let j = 0; j <= lineSegments; j++) {
        const segmentLength = (j / lineSegments) * lineLength;
        // Lignes parfaitement droites convergeant vers le centre
        linePoints.push(new THREE.Vector3(
          Math.cos(angle) * (startRadius - segmentLength * 0.2), // Convergence progressive vers le centre
          Math.sin(angle) * (startRadius - segmentLength * 0.2),
          zPos - segmentLength
        ));
      }
      
      // Créer la géométrie de la ligne
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
      
      // Sélection de couleur favorisant le blanc et bleu
      let lineColorIndex;
      const colorRoll = Math.random();
      if (colorRoll < 0.6) {
        lineColorIndex = 0; // 60% de chance d'avoir des lignes blanches
      } else if (colorRoll < 0.8) {
        lineColorIndex = 1; // 20% de chance d'avoir du blanc légèrement bleu
      } else {
        lineColorIndex = 2 + Math.floor(Math.random() * 4); // 20% réparti sur les différentes teintes de bleu
      }
      const lineColor = hyperspaceColors[lineColorIndex];
      
      // Matériau simple sans brillance pour des lignes sobres
      const lineMaterial = new THREE.LineBasicMaterial({
        color: lineColor,
        transparent: true,
        opacity: 0.7, // Opacité réduite pour un effet moins intense
        linewidth: 1 // Lignes encore plus fines pour un effet plus discret
      });
      
      // Désactivation des effets de brillance
      lineMaterial.toneMapped = true; // Activer le tone mapping pour atténuer les couleurs
      lineMaterial.depthWrite = true; // Permettre l'occultation normale des lignes
      
      // Réduire la luminosité pour un effet plus terne
      const mutedColor = new THREE.Color(lineColor);
      mutedColor.r = Math.min(1, mutedColor.r * 0.7);
      mutedColor.g = Math.min(1, mutedColor.g * 0.7);
      mutedColor.b = Math.min(1, mutedColor.b * 0.7);
      lineMaterial.color = mutedColor;
      
      // Créer la ligne lumineuse finale
      const line = new THREE.Line(lineGeometry, lineMaterial);
      
      // Ajouter des données utilisateur pour l'animation
      line.userData = {
        angle: angle,
        radius: startRadius,
        speed: 40 + Math.random() * 80, // Vitesse variable
        z: zPos,
        baseColor: lineColor.clone(), // Stocker la couleur de base pour les variations
        lifetime: 0,
        maxLifetime: 4 + Math.random() * 3, // Durée de vie avant réinitialisation
        animationOffset: Math.random() * Math.PI * 2 // Offset aléatoire pour l'animation
      };
      
      // Ajouter la ligne au groupe
      this.hyperspaceOutgoing.add(line);
    }
    
    // Ajouter les groupes au groupe principal
    this.hyperspaceStars.add(this.hyperspaceOutgoing);
    this.hyperspaceStars.add(this.hyperspaceIncoming);
    
    // Ajouter une inclinaison plus prononcée pour un effet plus dynamique
    this.hyperspaceStars.rotation.x = Math.PI * 0.08;
    
    if (this.scene) {
      this.scene.add(this.hyperspaceStars);
    }
  }
  
  /**
   * Anime l'effet d'hypervitesse avec un tunnel spatial dynamique uniquement composé de lignes
   * @param deltaTime Temps écoulé depuis la dernière frame
   */
  private animateStars(deltaTime: number): void {
    // Animation du champ d'étoiles arrière-plan 
    if (this.starField) {
      this.starField.rotation.y += deltaTime * 0.001; // Rotation plus rapide
      // Opacité réduite pendant l'effet d'hypervitesse
      (this.starField.material as THREE.PointsMaterial).opacity = 0.4;
    }
    
    // Animation du tunnel spatial
    if (!this.hyperspaceStars || !this.hyperspaceOutgoing) return;
    
    // Rotation simple et constante du tunnel pour un effet propre et stable
    // Seulement rotation sur l'axe Z (dans le plan de l'écran) pour éviter les bugs visuels
    this.hyperspaceStars.rotation.z += deltaTime * 0.02;
    
    // Réinitialiser les autres rotations pour éviter les effets indésirables
    this.hyperspaceStars.rotation.x = 0;
    this.hyperspaceStars.rotation.y = 0;
    
    // Parcours des lignes lumineuses
    this.hyperspaceOutgoing.children.forEach((child) => {
      if (child instanceof THREE.Line) {
        const line = child as THREE.Line;
        const userData = line.userData;
        if (userData) {
          // Incrémenter le compteur de durée de vie
          userData.lifetime += deltaTime;
          
          // Mise à jour de la position Z (déplacement vers l'avant)
          userData.z += userData.speed * deltaTime * 4.0; // Vitesse augmentée de 300%
          
          // On garde l'angle fixe pour chaque ligne - pas de variation pour éviter la dispersion
          // userData.angle reste constant tout au long de la vie de la ligne
          
          // Mise à jour de la géométrie de la ligne
          const lineGeometry = line.geometry as THREE.BufferGeometry;
          const positions = [];
          
          // Générer des points pour des lignes ABSOLUMENT droites qui convergent vers le centre
          const lineLength = 25 + Math.random() * 15; // Lignes plus courtes pour plus de détails
          const lineSegments = 2; // SEULEMENT 2 points pour garantir des lignes parfaitement droites
          
          // Angle fixe pour chaque ligne
          const angle = userData.angle;
          const radius = userData.radius;
          
          // Point central de convergence (origine visuelle du tunnel)
          const convergenceZ = -140; // Point de convergence en Z plus profond
          
          // Taille du trou central (rayon minimum pour toutes les lignes)
          const centralHoleRadius = 15;
          
          // Facteur d'échelle basé sur la distance au point de convergence - rendu plus constant
          const distanceToConvergence = Math.abs(userData.z - convergenceZ);
          const scaleFactor = Math.min(1, distanceToConvergence / 180);
          
          // Début de la ligne - point le plus proche du joueur
          const startRadius = Math.max(
            centralHoleRadius,
            radius * scaleFactor
          );
          
          // Premier point - près du joueur
          positions.push(new THREE.Vector3(
            Math.cos(angle) * startRadius,
            Math.sin(angle) * startRadius,
            userData.z
          ));
          
          // Second point - au loin, pour garantir une ligne parfaitement droite
          positions.push(new THREE.Vector3(
            Math.cos(angle) * startRadius * 0.65, // Léger rétrécissement pour l'effet de convergence
            Math.sin(angle) * startRadius * 0.65, // Léger rétrécissement pour l'effet de convergence
            userData.z - lineLength
          ));
          
          // Mise à jour de la géométrie
          lineGeometry.setFromPoints(positions);
          
          // Ajuster l'opacité et l'intensité pour un effet ULTRA BRILLANT
          const material = line.material as THREE.LineBasicMaterial;
          
          // Facteur d'intensité réduit pour un effet moins éblouissant
          const intensityFactor = Math.max(0, Math.min(0.7, (userData.z + 200) / 450)); // Réduction du facteur max
          
          // Pulsation d'opacité plus subtile
          const pulse = 0.7 + 0.1 * Math.sin(performance.now() * 0.002 + userData.animationOffset);
          
          // Opacité réduite pour un effet moins éblouissant
          material.opacity = 0.85;
          
          // Couleur de base pour les variations
          const baseColor = userData.baseColor;
          
          // Luminosité réduite pour un effet moins brillant
          const brightnessBoost = 1.3 + intensityFactor * 0.8; // Valeurs plus faibles
          
          // Appliquer une brillance plus douce à la couleur de base
          material.color.setRGB(
            Math.min(0.9, baseColor.r * brightnessBoost),
            Math.min(0.9, baseColor.g * brightnessBoost),
            Math.min(0.9, baseColor.b * brightnessBoost)
          );
          
          // Continuer à utiliser AdditiveBlending mais avec une intensité réduite
          material.blending = THREE.AdditiveBlending;
          // Réduire l'opacité des lignes plus éloignées
          if (userData.z < -100) {
            material.opacity *= 0.7; // Encore moins visible en profondeur
          }
          
          // Réinitialiser la ligne quand elle sort du champ de vision ou a atteint sa durée de vie maximale
          if (userData.z > 120 || userData.lifetime > userData.maxLifetime) {
            // Position plus éloignée pour un meilleur effet de perspective
            userData.z = -160 - Math.random() * 90; // Distance entre 160 et 250 units
            userData.lifetime = 0;
            
            // Distribution uniforme des angles pour remplir tout l'espace autour du trou central
            userData.angle = Math.random() * Math.PI * 2;
            
            // Taille du trou central (rayon minimum pour toutes les lignes)
            const centralHoleRadius = 15;
            
            // Rayon de départ basé sur la distance - les lignes plus éloignées ont un rayon plus grand
            // pour créer l'effet de perspective
            const maxRadius = 40; // Radius maximum
            userData.radius = centralHoleRadius + Math.random() * (maxRadius - centralHoleRadius);
            
            // Vitesse variable pour plus de dynamisme 
            userData.speed = 35 + Math.random() * 30;
            
            // Autres paramètres d'animation
            userData.animationOffset = Math.random() * Math.PI * 2;
            userData.maxLifetime = 2 + Math.random() * 3;
            
            // Palette de couleurs limitée à blanc et bleu pour l'effet hypervitesse
            const whiteBlueColors = [
              // Palette blanc et bleu uniquement
              new THREE.Color(0xffffff), // Blanc pur (dominant - 60%)
              new THREE.Color(0xf8f9ff), // Blanc légèrement bleu
              new THREE.Color(0xdcf0ff), // Bleu très clair
              new THREE.Color(0xc0e8ff), // Bleu ciel clair
              new THREE.Color(0x99ccff), // Bleu ciel
              new THREE.Color(0x4d94ff)  // Bleu moyen
            ];
            
            // Favoriser les teintes blanches (60%)
            let colorIndex;
            const colorRoll = Math.random();
            if (colorRoll < 0.6) {
              colorIndex = 0; // Blanc pur
            } else if (colorRoll < 0.75) {
              colorIndex = 1; // Blanc bleuté
            } else {
              colorIndex = 2 + Math.floor(Math.random() * 4); // Une des teintes bleues
            }
            
            const newColor = whiteBlueColors[colorIndex];
            material.color = newColor;
            userData.baseColor = newColor.clone();
          }
        }
      }
    });
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
   * @param mouseY Position Y de la souris convertie en coordonnées du monde
   * @param isDragging Si true, le vaisseau suivra la position de la souris. Si false, la cible sera ignorée.
   */
  public setMousePosition(mouseX: number, mouseY: number, isDragging: boolean = false): void {
    if (!this.isRunning || this.isPaused || !this.ship) return;
    
    // IMPORTANT: N'envoyer les targets que si isDragging est true
    // C'est ce qui garantit que le vaisseau ne bouge que quand l'utilisateur le déplace activement
    if (isDragging) {
      // S'assurer que les targets sont toujours transmises avec le flag isDragging=true
      // pour que Ship3D sache qu'il s'agit d'un mouvement intentionnel
      this.ship.setTargetX(mouseX, true);
      const clampedY = Math.max(-15, Math.min(15, mouseY)); // Allow higher movement on Y-axis
      this.ship.setTargetY(clampedY, true);
    } else {
      // Si isDragging est false, explicitement réinitialiser les targets
      // pour empêcher tout mouvement automatique
      this.ship.setTargetX(0, false);
      this.ship.setTargetY(0, false);
    }
  }
  
  /**
   * Retourne la position du vaisseau en coordonnées écran (pixels)
   * @returns {x: number, y: number} Position du vaisseau sur l'écran, ou null si le vaisseau n'existe pas
   */
  public getShipScreenPosition(): {x: number, y: number} | null {
    if (!this.ship || !this.camera || !this.renderer) return null;
    
    // Obtenir la position 3D du vaisseau
    const position = this.ship.position.clone();
    
    // Convertir la position 3D en coordonnées écran
    const vector = position.project(this.camera);
    
    // Obtenir les dimensions réelles du canvas
    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;
    
    // Convertir les coordonnées normalisées (-1 à 1) en pixels selon les dimensions réelles du canvas
    const x = ((vector.x + 1) / 2) * canvasWidth + rect.left;
    const y = ((-vector.y + 1) / 2) * canvasHeight + rect.top;
    
    return {x, y};
  }
  
  /**
   * Retourne la position du vaisseau en coordonnées monde (espace 3D)
   * @returns {x: number, y: number, z: number} Position du vaisseau dans l'espace 3D, ou null si le vaisseau n'existe pas
   */
  public getShipWorldPosition(): {x: number, y: number, z: number} | null {
    if (!this.ship) return null;
    
    return {
      x: this.ship.position.x,
      y: this.ship.position.y,
      z: this.ship.position.z
    };
  }
  
  /**
   * Définit directement la position X du vaisseau sans utiliser le système de position cible
   * Cette méthode est utilisée pour le glisser-déposer du vaisseau
   * @param x Nouvelle position X du vaisseau
   */
  public setShipDirectPosition(x: number): void {
    if (!this.isRunning || this.isPaused || !this.ship) return;
    
    // Mettre à jour directement la position X du vaisseau
    this.ship.setPositionX(x);
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
    this.isGameOver = false;        // S'assurer que le ScoreManager a la valeur finale correcte

    if (this.ship) {
      this.ship.dispose();
      this.ship = null;
    }
    if (this.endGameObject) {

      this.scene.remove(this.endGameObject);
      this.endGameObject = null;
    }
    
    // Nettoyer les planètes
    this.planets.forEach(planet => planet.dispose());
    this.planets = [];
    
    // Nettoyer les bonus
    this.bonuses.forEach(bonus => bonus.dispose());
    this.bonuses = [];
    
    this.endGameObject = null;
    // Réinitialiser l'état du jeu
    this.score = 0;
    this.lives = 3;
    this.difficulty = 0;
    this.gameTime = 30;
    this.spawnTimer = 0;
    
    // Réinitialiser l'animation d'introduction - préparer pour qu'elle s'exécute
    this.isIntroPlaying = true;  // Forcer l'animation à jouer
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
      bonusSpawnRate: 1
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
    
    try {
      this.init();
      this.isRunning = true;
      this.isPaused = false;
      
      // Démarrer l'animation d'introduction - forcer son activation
      this.isIntroPlaying = true;
      this.introAnimationComplete = false; // Réinitialiser pour s'assurer que l'intro joue
      this.introStartTime = performance.now();
      
      // Créer le vaisseau du joueur - avec un try/catch sécurisé
      try {
        this.ship = new Ship3D(this.scene);
        
        // Positionner le vaisseau en dehors de l'écran pour l'animation d'entrée
        this.ship.position = new THREE.Vector3(0, -20, 50); // Position encore plus éloignée pour que l'anim soit visible
        // Orienter le vaisseau vers la caméra
        (this.ship as Ship3D).setMeshRotationX(Math.PI / 3); // Incliner davantage pour mieux voir l'animation
      } catch (error) {
        // Récupération en créant un vaisseau simple
        const shipGroup = new THREE.Group();
        this.scene.add(shipGroup);
        this.ship = { 
          position: new THREE.Vector3(0, -15, 30),
          mesh: shipGroup,
          update: () => {},
          isReady: () => true, // Simuler un vaisseau prêt
          dispose: () => {},
          setTargetX: () => {},
          isInvulnerable: false
        } as any; // Cast en Ship3D (incomplet mais suffisant)
      }
      
      // Initialisation du temps de jeu avec un délai sécuritaire
      this.lastTime = performance.now();
      
      // Démarrer l'animation avec un délai pour s'assurer que tout est prêt
      setTimeout(() => {
        try {
          this.animate();
        } catch (error) {
        }
      }, 200);
    } catch (error) {
      // Tenter de récupérer de l'erreur
      setTimeout(() => {
        try {
          this.init();
          this.start();
        } catch (e) {
        }
      }, 1000);
    }
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
    
    // Forcer l'animation à jouer, peu importe les autres conditions
    this.isIntroPlaying = true;
    
    if (elapsedTime >= animationDuration) {
      // Animation terminée, placer le vaisseau à sa position finale
      // IMPORTANT: Fixer la position Y à -8 (bas de l'écran)
      this.ship.position = new THREE.Vector3(0, -8, 0);
      this.ship.mesh.rotation.x = 0;
      
      // CRUCIAL: Réinitialiser les targets à null pour éviter tout mouvement automatique
      // après l'animation d'introduction
      if (typeof this.ship.setTargetX === 'function' && typeof this.ship.setTargetY === 'function') {
        this.ship.setTargetX(0, false);
        this.ship.setTargetY(0, false);
      }
      
      
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
    (this.ship as Ship3D).setMeshRotationX(currentRotationX);
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
   * Boucle d'animation principale avec optimisation des performances et sécurité
   */
  private animate(): void {
    try {
      if (!this.isRunning) return;
      
      const now = performance.now();
      let deltaTime = 0;
      
      // Sécurité additionnelle pour la première seconde de jeu
      const timeSinceStart = now - this.introStartTime;
      if (timeSinceStart < 2000) {
        // Durant les 2 premières secondes, utiliser un deltaTime fixe très faible
        // pour éviter les problèmes de calcul qui causent le crash à 1 seconde
        deltaTime = 0.01; // 10ms, deltaTime fixe et sécuritaire
        
        // Éviter de faire des opérations complexes dans la première seconde
        this.lastTime = now;
        // Ne pas générer de planètes ni faire de collisions pendant le démarrage
        if (!this.isPaused) {
          // Les étoiles DOIVENT être animées en continu, y compris pendant l'intro
          this.animateStars(deltaTime * 2); // Augmentation de la vitesse pour un effet plus dynamique
          
          if (this.ship) {
            // Mettre à jour le vaisseau
            this.ship.update(deltaTime);
          }
          
          // Mettre à jour l'animation d'introduction si nécessaire
          if (this.isIntroPlaying) {
            this.updateIntroAnimation();
          }
        }
      } else {
        // Après 2 secondes, fonctionnement normal
        deltaTime = Math.min((now - this.lastTime) / 1000, 0.1); // sec, limité à 0.1s
        this.lastTime = now;
        
        if (!this.isPaused) {
          try {
            this.update(deltaTime);
          } catch (error) {
          }
        }
      }
      
      try {
        // Optimisation améliorée: adaptation dynamique de la qualité
        // Si le FPS est bas, réduire temporairement la qualité du rendu
        if (deltaTime > 0.05) { // Moins de 20 FPS
          // Réduire temporairement la résolution du rendu
          if (!this._lowResMode) {
            this._lowResMode = true;
            // Réduire la résolution à 75% pour gagner en performances
            const currentSize = this.renderer.getSize(new THREE.Vector2());
            this.renderer.setSize(
              Math.floor(currentSize.x * 0.75),
              Math.floor(currentSize.y * 0.75),
              false // Ne pas mettre à jour le style CSS
            );
          }
          this.renderer.render(this.scene, this.camera);
        } else { // Bon framerate
          // Restaurer la résolution normale si nécessaire
          if (this._lowResMode) {
            this._lowResMode = false;
            this.handleResize(); // Restaurer la taille normale
          }
          this.renderer.render(this.scene, this.camera);
        }
      } catch (error) {
      }
      
      requestAnimationFrame(this.animate.bind(this));
    } catch (error) {
      // Tenter de récupérer le jeu
      setTimeout(() => {
        requestAnimationFrame(this.animate.bind(this));
      }, 1000);
    }
  }
  
  /**
   * Met à jour l'état du jeu à chaque frame
   */
  private update(deltaTime: number): void {
    try {
      // Vérifier si l'animation d'introduction doit être jouée
      // Forçage de l'animation d'intro au début
      if (!this.introAnimationComplete && this.ship && this.lastTime < 5000) {
        // Forçage de l'animation pendant les 5 premières secondes
        this.isIntroPlaying = true;
      }
      if(this.isGameOver){
        console.log("gameOver")
      }
      // Animer les étoiles en arrière-plan - Toujours exécuté, même pendant l'intro
      this.animateStars(deltaTime);
      
      // Gérer l'animation d'introduction
      if (this.isIntroPlaying) {
        // Exécuter l'animation d'intro explicitement
        this.updateIntroAnimation();
        return; // Ne pas mettre à jour le reste du jeu pendant l'intro
      }
      if (this.gameTime <= 0) {
        this.gameTime = 0;
        console.log(this.isPlayingEndAnimation)
        console.log(this.isGameOver)
        // Appeler gameOver seulement si l'animation n'est pas déjà en cours
        // ET si le jeu n'est pas déjà terminé
        if (!this.isPlayingEndAnimation && !this.isGameOver) {
          this.isGameOver = true; // Ajouter ce flag
          this.gameOver();
        }
      }
      if (this.isPlayingEndAnimation) {
        // Utiliser le même système temporel que le reste du jeu
        const currentTime = performance.now();
        const elapsedTime = (currentTime - this.endAnimationStartTime) / 1000;
        this.updateEndAnimation(elapsedTime, deltaTime);
        this.animateStars(deltaTime);
        return;
      }
      
      // Sécurité supplémentaire pour éviter les problèmes de timing
      const timeSinceStart = performance.now() - this.introStartTime;
      if (timeSinceStart < 2000) {
        // Ne faire que des opérations minimales pendant les 2 premières secondes
        if (this.ship) {
          this.ship.update(deltaTime);
        }
        return;
      }
      
      // Ajuster le deltaTime si le ralentissement du temps est actif
      if (this.bonusEffects.slowTime.active) {
        deltaTime *= this.bonusEffects.slowTime.timeScale;
      }
      
      // Réduire la vitesse globale du jeu pour alléger les calculs
      deltaTime *= 1.2;
      
      // Mettre à jour le temps de jeu
      if (this.gameTime > 0) {
        this.gameTime -= deltaTime;
        
        // Mesurer et optimiser les FPS - utiliser performance.now()
        const currentTime = performance.now();
        this.fpsCounter++;
        if (currentTime - this.lastFpsUpdate > 1000) { // Mettre à jour toutes les secondes
          this.fpsCounter = 0;
          this.lastFpsUpdate = currentTime;
        }
      
    
      
      // Arrondir pour éviter les problèmes de precision avec les nombres flottants
      const roundedTime = Math.max(Math.ceil(this.gameTime), 1); // Garantir au moins 1 seconde
      this.onTimeUpdate(roundedTime);
    }
    
    try {
      // Mettre à jour le vaisseau
      if (this.ship) {
        this.ship.update(deltaTime);
      }
      
      // Mettre à jour les planètes avec sécurité
      // Ajouter un délai de sécurité avant de commencer à mettre à jour les planètes
      if (this.lastTime > 1500) {
        this.updatePlanets(deltaTime);
      }
      
      // Mettre à jour les bonus
      this.updateBonuses(deltaTime);
      
      // Gérer les effets de bonus
      this.updateBonusEffects(deltaTime);
      
      // Vérifier les collisions avec sécurité
      if (this.ship && !this.bonusEffects.shield.active) {
        this.checkCollisions();
      }
      this.checkBonusCollisions(); // Vérifier aussi les collisions avec les bonus
      
      // Augmenter progressivement la difficulté
      this.difficulty += deltaTime * 0.05;
    } catch (error) {
    }
    } catch (error) {
    }
    
    // Spawn de nouveaux objets avec un contrôle amélioré
    this.spawnTimer -= deltaTime;
    if (this.spawnTimer <= 0) {
      // Limiter strictement le nombre de planètes pour éviter la surcharge
      const maxPlanets = this.MAX_PLANETS + Math.min(3, Math.floor(this.difficulty / 2)); // Augmentation beaucoup plus lente
      // Sécurité: ajouter un délai après le démarrage pour éviter le plantage à 1 seconde
      if (this.lastTime > 1500 && this.planets.length < maxPlanets) {
        try {
          this.spawnPlanet();
          
          // Réduire la chance de spawn multiple pour éviter la surcharge
          if (this.planets.length < maxPlanets && Math.random() < 0.15) {
            this.spawnPlanet();
          }
        } catch (error) {
        }
      }
      // Ajuster le temps de spawn en fonction de la difficulté
      this.spawnTimer = Math.max(2.0 - this.difficulty * 0.1, 0.5);
    }
    
    // Spawn de bonus occasionnels - moins fréquents pour réduire la charge
    this.bonusEffects.bonusSpawnTimer -= deltaTime;
    if (this.bonusEffects.bonusSpawnTimer <= 0) {
      // Limiter le nombre total d'objets en mouvement
      if (this.bonuses.length < 2) {
        this.spawnRandomBonus();
      }
      // Réinitialiser le minuteur de spawn de bonus (toutes les 15-20 secondes)
      this.bonusEffects.bonusSpawnTimer = 15 + Math.random() * 5;
    }
  }
  
  /**
   * Met à jour les planètes et en génère de nouvelles
   */
  private updatePlanets(deltaTime: number): void {
    try {
      // Sécurité pour éviter les erreurs au début du jeu
      if (performance.now() - this.introStartTime < 3000) {
        return; // Ne pas mettre à jour les planètes dans les 3 premières secondes
      }
      
      // Mettre à jour les planètes existantes
      for (let i = this.planets.length - 1; i >= 0; i--) {
        const planet = this.planets[i];
        
        try {
          planet.update(deltaTime);
        } catch (error) {
          // Supprimer la planète en cas d'erreur pour éviter des problèmes futurs
          this.planets.splice(i, 1);
          continue;
        }
        
        // Supprimer les planètes inactives
        if (!planet.getActive()) {
          this.planets.splice(i, 1);
          this.planetPool.push(planet); // Recycler la planète
        }
      }
    } catch (error) {
    }
  }
  
  /**
   * Génère une nouvelle planète avec paramètres adaptés à la difficulté actuelle
   */
  private generatePlanet(x?: number, y?: number, z: number = 0, type?: PlanetType): void {
    // Fréquence variable pour plus de planètes avec la difficulté croissante
    const baseSpawnRate = Math.max(0.3, 1 - this.difficulty * 0.1);
    const effectiveRate = baseSpawnRate + Math.random() * 0.2;
    
    // Note: la création des planètes est maintenant gérée uniquement dans la méthode update
    // donc nous ne faisons pas de création ici pour éviter le problème de boucle
    
    // Système secondaire pour ajouter des planètes surprises
    // Limité par le nombre maximum de planètes en jeu pour éviter la surcharge
    const maxPlanets = 10 + Math.min(10, Math.floor(this.difficulty));
    const surpriseChance = 0.003 + (0.002 * this.difficulty); // Réduit pour éviter trop de planètes
    
    // Si un deltaTime est passé en paramètre (appelé depuis update)
    const deltaTime = 0.016; // Valeur par défaut si pas passée
    if (this.planets.length < maxPlanets && Math.random() < surpriseChance * deltaTime) {
      // Utiliser seulement 2 types de planètes pour réduire la charge de textures
      const typeArray = [
        PlanetType.EARTH,
        PlanetType.MARS
      ];
      
      const randomIndex = Math.floor(Math.random() * typeArray.length);
      const type = typeArray[randomIndex];
      
        // Déterminer si nous voulons faire apparaître la planète depuis le point de convergence (70% du temps)
      // ou depuis les bords pour des attaques surprises (30% du temps)
      if (Math.random() < 0.7) {
        // Point de convergence des lignes d'hypervitesse au loin
        const convergencePointY = 60;
        const posX = (Math.random() - 0.5) * 10; // Variation réduite en X au point d'origine
        const posY = convergencePointY + Math.random() * 5; // Légère variation en Y
        const posZ = 0; // Toujours sur le même plan Z
        
        this.spawnPlanet(type, new THREE.Vector3(posX, posY, posZ));
      } else {
        // Apparition surprise depuis les côtés (comme avant)
        let posX, posY;
        if (Math.random() < 0.5) {
          // Côtés gauche/droit
          posX = (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 5);
          posY = 10 + Math.random() * 20; // Un peu plus haut pour sembler venir de plus loin
        } else {
          // Haut seulement (plus de bas car cela n'a pas de sens avec le point de convergence)
          posX = (Math.random() - 0.5) * 30;
          posY = 30 + Math.random() * 10; // Toujours par le haut
        }
        
        const posZ = 0; // Toujours sur le même plan Z maintenant
        this.spawnPlanet(type, new THREE.Vector3(posX, posY, posZ));
      }
    }
  }
  
  /**
   * Crée ou récupère une planète du pool et l'ajoute à la scène
   * Les planètes apparaissent maintenant depuis le trou central de l'effet d'hypervitesse
   */
  private spawnPlanet(type?: PlanetType, position?: THREE.Vector3): void {
    try {
      // Sécurité: vérifier que le moteur est prêt avant de spawner des objets
      if (!this.isRunning || this.isPaused || this.lastTime < 1000) {
        return;
      }
      
      // Si aucun type n'est spécifié, en choisir un aléatoirement
      if (!type) {
        // Limiter à seulement deux types pour réduire la charge de textures
        if (Math.random() < 0.5) {
          type = PlanetType.EARTH;
        } else {
          type = PlanetType.MARS;
        }
      }
    } catch (error) {
      return; // Sortir pour éviter d'autres erreurs
    }
    
    // Définir les paramètres de la zone de spawn
    const spawnRadius = 15; // Zone de spawn des planètes
    
    // Générer une position aléatoire dans la zone de spawn
    const angle = Math.random() * Math.PI * 2; // Angle aléatoire (0-360 degrés)
    
    // Rayon aléatoire pour la distribution des planètes
    const randomRadius = Math.random() * (spawnRadius * 0.9);
    
    // Calculer la position X et Y
    const randomX = Math.cos(angle) * randomRadius;
    const randomY = Math.sin(angle) * randomRadius;
    
    // Position Z négative (loin du joueur dans la profondeur)
    const randomZ = -150 - Math.random() * 50; // Entre -150 et -200
    
    // Si une position est déjà spécifiée, l'utiliser pour X et Y, mais conserver Z loin du joueur
    if (position) {
      position = new THREE.Vector3(position.x, position.y, randomZ);
    } else {
      position = new THREE.Vector3(randomX, randomY, randomZ);
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
    
    // Ajuster la vitesse en fonction de la difficulté
    const difficultyBoost = 1.0 + this.difficulty * 0.1;
    planet.adjustVelocity(difficultyBoost);
    
    this.planets.push(planet);
  }
  
  /**
   * Fait apparaître un bonus de type aléatoire depuis le trou central de l'effet d'hypervitesse
   */
  private spawnRandomBonus(position?: THREE.Vector3): void {
    // Si le jeu n'est pas actif ou si le temps minimal pour afficher les bonus n'est pas atteint, sortir
    if (!this.isRunning || this.isPaused || this.lastTime < 10000) {
      return; // Sortir sans générer de bonus
    }

    // Type de bonus aléatoire
    const bonusTypes = [BonusType3D.POINTS, BonusType3D.SHIELD, BonusType3D.SLOWTIME, BonusType3D.EXTRALIFE];
    const randomType = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];

    // Définir les paramètres de la zone de spawn
    const spawnRadius = 15; // Zone de spawn dans le trou du vaisseau

    // Générer une position aléatoire dans la zone de spawn
    const angle = Math.random() * Math.PI * 2; // Angle aléatoire (0-360 degrés)

    // Rayon aléatoire pour la distribution des bonus
    // Plus proche du centre pour être plus facile à attraper
    const randomRadius = Math.random() * (spawnRadius * 0.7);

    // Calculer la position X et Y
    const randomX = Math.cos(angle) * randomRadius;
    const randomY = Math.sin(angle) * randomRadius;

    // Position Z négative (loin du joueur dans la profondeur)
    const randomZ = -150 - Math.random() * 50; // Entre -150 et -200
    
    // Si une position est spécifiée, l'utiliser pour X et Y, mais conserver Z loin du joueur
    if (position) {
      position = new THREE.Vector3(position.x, position.y, randomZ);
    } else {
      position = new THREE.Vector3(randomX, randomY, randomZ);
    }

    // Créer un bonus à cette position avec le type sélectionné
    const bonus = new Bonus3D(this.scene, randomType, new THREE.Vector3(randomX, randomY, randomZ));

    // Ajuster la vitesse du bonus en fonction de la difficulté
    const difficultyBoost = 1.0 + this.difficulty * 0.1;
    bonus.adjustVelocity(difficultyBoost);

    // Ajouter le bonus à la liste des bonus actifs
    this.bonuses.push(bonus);
  }
  
  /**
   * Crée ou récupère un bonus du pool et l'ajoute à la scène
   * Le bonus apparaît uniquement dans le trou central et sur le plan Z=0
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
    
    // S'assurer que la position Z est adaptée à la position du vaisseau
    if (this.ship) {
      // Positionner le bonus loin devant le vaisseau
      position.z = this.ship.position.z - 180;
    } else {
      // Position par défaut si le vaisseau n'existe pas encore
      position.z = -150;
    }
    
    // Mettre à jour la position du bonus
    bonus.position = position;
    
    // Ajuster la vitesse pour que les bonus se déplacent à la même vitesse que les planètes
    const speed = 8; // Vitesse constante pour un mouvement fluide
    
    // Direction simple vers le joueur (axe Z positif)
    const direction = new THREE.Vector3(0, 0, 1);
    
    // Assigner cette direction au bonus
    bonus.setDirection(direction);
    
    // Appliquer la vitesse au bonus
    bonus.setSpeed(speed);
    
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
    const bonusValue = (bonus as any).getValue();
    
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
    
    this.animateBonusCollection(bonus);
  }
  
  private animateBonusCollection(bonus: Bonus3D): void {
    // Determine the color based on the bonus type
    let bonusColor;
    switch (bonus.type) {
        case BonusType3D.YELLOW:
            bonusColor = 0xffff00; // Yellow for shield
            break;
        case BonusType3D.GREEN:
            bonusColor = 0x00ff00; // Green for speed boost
            break;
        case BonusType3D.RED:
            bonusColor = 0xff0000; // Red for extra life
            break;
        case BonusType3D.BLUE:
            bonusColor = 0x0000ff; // Blue for time slow
            break;
        case BonusType3D.PURPLE:
            bonusColor = 0x800080; // Purple for points bonus
            break;
        default:
            bonusColor = 0xffffff; // Default to white if unknown
    }

    const bonusEffect = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 16, 16),
        new THREE.MeshBasicMaterial({ color: bonusColor, transparent: true, opacity: 0.8 })
    );
    bonusEffect.position.copy(bonus.position);
    this.scene.add(bonusEffect);

    // Animation
    gsap.to(bonusEffect.scale, {
        x: 2,
        y: 2,
        z: 2,
        duration: 0.5,
        onComplete: () => {
            this.scene.remove(bonusEffect);
        }
    });
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
      } else if (planet.getActive() && planet.position.z > this.ship.position.z) {
        // Ajouter des points pour avoir esquivé la planète
        this.score += 10;
        this.onScoreUpdate(this.score)
        planet.setActive(false); // Désactiver la planète après l'esquive
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
    
    // Mettre également à jour le ScoreManager si disponible
    if (this.scoreManager) {
      this.scoreManager.updateCurrentScore(this.score);
    }
    
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
    // Ne pas arrêter le moteur tout de suite
    // this.stop(); <- Supprimer/commenter cette ligne
    
    // Lancer l'animation de fin
    this.startEndAnimation()
      .then(() => {
        // Arrêter le moteur APRÈS que l'animation soit terminée
        this.stop();
        this.isGameOver = true;        // S'assurer que le ScoreManager a la valeur finale correcte
        if (this.scoreManager) {
          this.scoreManager.updateCurrentScore(this.score);
        }
        
        this.onGameOver(this.score);
      });
  }
  
  /**
   * Nettoie les ressources et événements
   */
  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize.bind(this));
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Nettoyer les objets de jeu
    if (this.ship) {
      this.ship.dispose();
    }
    if (this.endGameObject) {
      this.scene.remove(this.endGameObject);
      this.endGameObject.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
    }
    // Nettoyer les autres ressources...
  }
// Dans GameEngine3D.ts
// Dans GameEngine3D.ts, remplace complètement la méthode startEndAnimation

private preloadKModel(): void {
  if (!this.kModelLoader) {
    this.kModelLoader = new GLTFLoader();
    console.log("🔄 Préchargement du modèle K");
    
    this.kModelLoader.load(
        `${import.meta.env.BASE_URL}textures/Purple_K_Logo_0321093104_texture.glb`,
      (gltf) => {
        this.preloadedKModel = gltf.scene.clone();
        
        // Changer la couleur du modèle K à #6e398e
        this.preloadedKModel.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => {
                if (mat.color) mat.color.set(0x6e398e);
                mat.emissive = new THREE.Color(0x6e398e); // Ajouter une lueur
                mat.emissiveIntensity = 0.5; // Ajuster l'intensité de l'émissivité pour l'aura
              });
            } else if (child.material.color) {
              child.material.color.set(0x6e398e);
              child.material.emissive = new THREE.Color(0x6e398e); // Ajouter une lueur
              child.material.emissiveIntensity = 0.5; // Ajuster l'intensité de l'émissivité pour l'aura
            }
          }
        });
        
        console.log("✅ Modèle K préchargé avec succès");
      },
      undefined,
      (error) => {
        console.error("❌ Erreur de préchargement:", error);
        this.preloadedKModel = null;
      }
    );
    
  }
}
public startEndAnimation(): Promise<void> {
  console.log("🚀 Démarrage de l'animation finale");
  
  if (this.isPlayingEndAnimation) {
    return Promise.resolve();
  }
  
  this.isPlayingEndAnimation = true;
  this.endAnimationStartTime = performance.now();
  
  // Nettoyer la scène
  this.clearGameObjects();
  
  // Créer l'objet K avant d'utiliser GSAP
  if (this.endGameObject) {
    this.scene.remove(this.endGameObject);
    this.endGameObject = null;
  }
  
  // Créer un cube K temporaire si le modèle n'est pas disponible
  const createTemporaryK = () => {
    const kGeometry = new THREE.BoxGeometry(5, 10, 2);
    const kMaterial = new THREE.MeshBasicMaterial({ color: 0x6e398e });
    return new THREE.Mesh(kGeometry, kMaterial);
  };
  
  // Utiliser le modèle préchargé ou créer un temporaire
  if (this.preloadedKModel) {
    this.endGameObject = this.preloadedKModel.clone();
  } else {
    this.endGameObject = createTemporaryK();
  }
  
  // Positionner loin du joueur
  this.endGameObject.scale.set(15, 15, 15);
  this.endGameObject.position.set(0, 0, -800);
  this.endGameObject.rotation.y = Math.PI;
  this.scene.add(this.endGameObject);
  
  // Animation avec GSAP
  return new Promise<void>((resolve) => {
    const shipPosition = this.ship ? this.ship.position : new THREE.Vector3(0, -8, 0);
    
    gsap.to(this.endGameObject.position, {
      z: shipPosition.z -20,
      duration: 3,
      ease: "power2.inOut",
      onUpdate: () => {
        // Rotation sur l'axe X
        this.endGameObject.rotation.x = 0;
        // Légère oscillation sur Y
        this.endGameObject.rotation.y = Math.PI + Math.sin(gsap.utils.normalize(0, 1, 
          gsap.getProperty(this.endGameObject.position, "z", -40, shipPosition.z + 10)) 
          * Math.PI * 2) * 0.2;
      },
      onComplete: () => {
        setTimeout(() => {
          this.isPlayingEndAnimation = false;
          resolve();
        }, 100);
      }
    });
  });
}
// Nouvelle méthode pour nettoyer la scène en gardant uniquement les éléments essentiels
private clearGameObjects(): void {
  // Supprimer les planètes
  if (this.planets) {
    for (const planet of this.planets) {
      planet.dispose();    }
    this.planets = [];
  }
  
  // Supprimer les bonus
  if (this.bonuses) {
    for (const bonus of this.bonuses) {
     bonus.dispose();
    }
    this.bonuses = [];
  }
  
  
  console.log("🧹 Nettoyage de la scène pour l'animation finale");
}
private updateEndAnimation(elapsedTime: number, deltaTime: number): void {
  if (!this.endGameObject) return;
  
  const progress = Math.min(elapsedTime / 3, 1); // 3 secondes de durée
  
  // Mise à jour de la position/rotation
  const shipPosition = this.ship ? this.ship.position : new THREE.Vector3(0, -8, 0);
  
  // Position du K
  
  // Faire avancer le vaisseau vers le K
  if (this.ship) {
    // Avancer le vaisseau progressivement
    this.ship.position.z -= deltaTime * 2; // Vitesse d'avancée ajustable

    // Ajouter une légère oscillation sur Y pour un effet de vol
  }
  
  // Particules occasionnelles
  if (Math.random() > 0.8) {
    this.addParticlesForEndAnimation();
  }
  
  // Fin de l'animation
  if (progress >= 1 && this.isPlayingEndAnimation) {
    this.isPlayingEndAnimation = false;
    this.isGameOver = true;  
    console.log("✅ Animation terminée définitivement");
  }

}
private addParticlesForEndAnimation(): void {
  if (!this.endGameObject) return;
  
  const particleGeometry = new THREE.SphereGeometry(0.2, 8, 8);
  const particleMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x9966ff,
    transparent: true,
    opacity: 0.7
  });
  
  // Ajouter quelques particules
  for (let i = 0; i < 3; i++) {
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    const x = this.endGameObject.position.x + (Math.random() - 0.5) * 5;
    const y = this.endGameObject.position.y + (Math.random() - 0.5) * 5;
    const z = this.endGameObject.position.z - 2;
    
    particle.position.set(x, y, z);
    this.scene.add(particle);
    
    // Faire disparaître les particules après un court délai
    setTimeout(() => {
      this.scene.remove(particle);
      particleGeometry.dispose();
      particleMaterial.dispose();
    }, 500);
  }
}
}