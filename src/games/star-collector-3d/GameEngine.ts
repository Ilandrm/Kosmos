import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Star } from './entities/Star';
import { Asteroid } from './entities/Asteroid';
import { Ship } from './entities/Ship';

export class GameEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private clock: THREE.Clock;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  
  // Entités du jeu
  private ship: Ship | null = null;
  private stars: Star[] = [];
  private asteroids: Asteroid[] = [];
  
  // Gestionnaires d'événements
  private mousePosition: THREE.Vector2 = new THREE.Vector2();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private mouseStartX: number = 0;
  
  // Paramètres du jeu
  private spawnTimer: number = 0;
  private starSpawnRate: number = 1.0;  // Temps en secondes entre chaque spawn d'étoile
  private asteroidSpawnRate: number = 2.0;  // Temps en secondes entre chaque spawn d'astéroïde
  private starsCollected: number = 0;
  private maxStars: number = 5;  // Nombre maximum d'étoiles à l'écran
  private maxAsteroids: number = 10;  // Nombre maximum d'astéroïdes à l'écran
  
  // Callbacks
  private getScore: () => number;
  private setScore: (score: number) => void;
  private onVictory: () => void;
  private onGameOver: () => void;
  
  constructor(
    container: HTMLElement,
    getScore: () => number,
    setScore: (score: number) => void,
    onVictory: () => void,
    onGameOver: () => void
  ) {
    this.container = container;
    this.getScore = getScore;
    this.setScore = setScore;
    this.onVictory = onVictory;
    this.onGameOver = onGameOver;
    
    // Initialiser Three.js
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75, 
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0x000000, 1);
    this.container.appendChild(this.renderer.domElement);
    
    this.clock = new THREE.Clock();
    
    // Positionner la caméra
    this.camera.position.set(0, 10, 15);
    this.camera.lookAt(0, 0, 0);
    
    // Ajouter les gestionnaires d'événements
    this.setupEventListeners();
  }
  
  /**
   * Initialise le moteur de jeu
   */
  public initialize(): void {
    // Créer les lumières
    this.setupLights();
    
    // Créer le fond étoilé
    this.createStarryBackground();
    
    // Créer le vaisseau
    this.ship = new Ship(this.scene);
    
    // Animation loop
    this.animate();
  }
  
  /**
   * Configure les écouteurs d'événements
   */
  private setupEventListeners(): void {
    // Gestionnaire de redimensionnement de fenêtre
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Gestionnaires d'événements souris
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    // Gestionnaire de visibilité
    document.addEventListener('visibilitychange', this.onVisibilityChange.bind(this));
  }
  
  /**
   * Configure les lumières de la scène
   */
  private setupLights(): void {
    // Lumière ambiante
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);
    
    // Lumière directionnelle (soleil)
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(10, 20, 10);
    this.scene.add(sunLight);
    
    // Lumière ponctuelle bleue pour effet spatial
    const blueLight = new THREE.PointLight(0x0077ff, 1, 100);
    blueLight.position.set(-10, 5, 10);
    this.scene.add(blueLight);
    
    // Lumière ponctuelle rose/violette pour effet spatial
    const purpleLight = new THREE.PointLight(0xcc00ff, 0.8, 100);
    purpleLight.position.set(10, 5, -10);
    this.scene.add(purpleLight);
  }
  
  /**
   * Crée un fond étoilé
   */
  private createStarryBackground(): void {
    // Créer des géométries pour les étoiles d'arrière-plan
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });
    
    // Générer positions aléatoires pour 1000 étoiles d'arrière-plan
    const positions = new Float32Array(3000);
    
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = (Math.random() - 0.5) * 100;     // x
      positions[i + 1] = (Math.random() - 0.5) * 100; // y
      positions[i + 2] = (Math.random() - 0.5) * 100; // z
    }
    
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(starField);
    
    // Ajouter une skybox
    const textureLoader = new THREE.TextureLoader();
    const skyboxMaterials = [
      new THREE.MeshBasicMaterial({
        map: textureLoader.load('/textures/skybox/right.jpg'),
        side: THREE.BackSide
      }),
      new THREE.MeshBasicMaterial({
        map: textureLoader.load('/textures/skybox/left.jpg'),
        side: THREE.BackSide
      }),
      new THREE.MeshBasicMaterial({
        map: textureLoader.load('/textures/skybox/top.jpg'),
        side: THREE.BackSide
      }),
      new THREE.MeshBasicMaterial({
        map: textureLoader.load('/textures/skybox/bottom.jpg'),
        side: THREE.BackSide
      }),
      new THREE.MeshBasicMaterial({
        map: textureLoader.load('/textures/skybox/front.jpg'),
        side: THREE.BackSide
      }),
      new THREE.MeshBasicMaterial({
        map: textureLoader.load('/textures/skybox/back.jpg'),
        side: THREE.BackSide
      }),
    ];
    
    const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
    this.scene.add(skybox);
  }
  
  /**
   * Boucle d'animation principale
   */
  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    
    if (!this.isRunning || this.isPaused) return;
    
    const deltaTime = this.clock.getDelta();
    
    // Mettre à jour les entités
    this.update(deltaTime);
    
    // Rendu de la scène
    this.renderer.render(this.scene, this.camera);
  }
  
  /**
   * Met à jour toutes les entités du jeu
   */
  private update(deltaTime: number): void {
    // Spawner des étoiles et astéroïdes périodiquement
    this.spawnTimer -= deltaTime;
    
    if (this.spawnTimer <= 0) {
      // Réinitialiser le timer avec un délai aléatoire
      this.spawnTimer = 0.5 + Math.random() * 0.5;
      
      // Spawner des étoiles si nécessaire
      if (this.stars.length < this.maxStars) {
        this.spawnStar();
      }
      
      // Spawner des astéroïdes si nécessaire
      if (this.asteroids.length < this.maxAsteroids) {
        this.spawnAsteroid();
      }
    }
    
    // Mettre à jour le vaisseau
    if (this.ship) {
      this.ship.update(deltaTime);
    }
    
    // Mettre à jour les étoiles
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const star = this.stars[i];
      star.update(deltaTime);
      
      // Vérifier si l'étoile est en dehors de l'écran
      if (star.position.z > 20) {
        this.scene.remove(star.mesh);
        this.stars.splice(i, 1);
      }
      
      // Vérifier la collision avec le vaisseau
      if (this.ship && this.isColliding(this.ship, star)) {
        // Collecter l'étoile
        this.collectStar(i);
      }
    }
    
    // Mettre à jour les astéroïdes
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const asteroid = this.asteroids[i];
      asteroid.update(deltaTime);
      
      // Vérifier si l'astéroïde est en dehors de l'écran
      if (asteroid.position.z > 20) {
        this.scene.remove(asteroid.mesh);
        this.asteroids.splice(i, 1);
      }
      
      // Vérifier la collision avec le vaisseau
      if (this.ship && this.isColliding(this.ship, asteroid)) {
        // Collision avec un astéroïde = game over
        this.onGameOver();
      }
    }
  }
  
  /**
   * Spawne une nouvelle étoile
   */
  private spawnStar(): void {
    // Créer une nouvelle étoile
    const star = new Star(this.scene);
    
    // Positionner l'étoile au loin
    star.position.x = (Math.random() * 40) - 20;  // Entre -20 et 20
    star.position.y = 0;  // Même plan que le vaisseau
    star.position.z = -100;  // Au loin
    
    // Ajouter au tableau
    this.stars.push(star);
  }
  
  /**
   * Spawne un nouvel astéroïde
   */
  private spawnAsteroid(): void {
    // Créer un nouvel astéroïde
    const asteroid = new Asteroid(this.scene);
    
    // Positionner l'astéroïde au loin avec une position aléatoire sur X
    asteroid.position.x = (Math.random() * 40) - 20;  // Entre -20 et 20
    asteroid.position.y = 0;  // Même plan que le vaisseau
    asteroid.position.z = -100;  // Au loin
    
    // Ajouter au tableau
    this.asteroids.push(asteroid);
  }
  
  /**
   * Collect une étoile et met à jour le score
   */
  private collectStar(index: number): void {
    // Retirer l'étoile de la scène
    const star = this.stars[index];
    this.scene.remove(star.mesh);
    this.stars.splice(index, 1);
    
    // Mettre à jour le score
    const currentScore = this.getScore();
    this.setScore(currentScore + 10);
    
    // Vérifier la victoire (20 étoiles = 200 points)
    if (currentScore + 10 >= 200) {
      this.onVictory();
    }
  }
  
  /**
   * Vérifie si deux entités sont en collision
   */
  private isColliding(entity1: { position: THREE.Vector3, boundingRadius: number }, 
                      entity2: { position: THREE.Vector3, boundingRadius: number }): boolean {
    // Calculer la distance entre les centres
    const dx = entity1.position.x - entity2.position.x;
    const dy = entity1.position.y - entity2.position.y;
    const dz = entity1.position.z - entity2.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Vérifier si la distance est inférieure à la somme des rayons
    return distance < (entity1.boundingRadius + entity2.boundingRadius);
  }
  
  /**
   * Gestionnaire d'événement de redimensionnement de fenêtre
   */
  private onWindowResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }
  
  /**
   * Gestionnaire d'événement de clic souris
   */
  private onMouseDown(event: MouseEvent): void {
    if (!this.isRunning || this.isPaused || !this.ship) return;
    
    // Calculer les coordonnées de la souris
    this.updateMousePosition(event);
    
    // Vérifier si le clic est sur le vaisseau
    if (this.isClickOnShip()) {
      this.isDragging = true;
      this.dragStartX = this.ship.position.x;
      this.mouseStartX = event.clientX;
    }
  }
  
  /**
   * Gestionnaire d'événement de mouvement souris
   */
  private onMouseMove(event: MouseEvent): void {
    if (!this.isRunning || this.isPaused || !this.ship || !this.isDragging) return;
    
    // Calculer le déplacement de la souris par rapport à sa position initiale
    const mouseDeltaX = event.clientX - this.mouseStartX;
    
    // Calculer le facteur d'échelle pour convertir les pixels en unités du monde
    const scaleFactor = 40 / this.container.clientWidth; // 40 unités monde = largeur du canvas
    
    // Calculer la nouvelle position du vaisseau
    const newShipX = this.dragStartX + (mouseDeltaX * scaleFactor);
    
    // Limiter la position aux bornes du jeu
    const clampedX = Math.max(-20, Math.min(20, newShipX));
    
    // Appliquer la position au vaisseau
    this.ship.setPosition(clampedX, 0, 0);
  }
  
  /**
   * Gestionnaire d'événement de relâchement souris
   */
  private onMouseUp(): void {
    this.isDragging = false;
  }
  
  /**
   * Met à jour la position de la souris pour le raycasting
   */
  private updateMousePosition(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    
    this.mousePosition.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mousePosition.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Mettre à jour le raycaster
    this.raycaster.setFromCamera(this.mousePosition, this.camera);
  }
  
  /**
   * Vérifie si le clic est sur le vaisseau
   */
  private isClickOnShip(): boolean {
    if (!this.ship) return false;
    
    // Lancer un rayon depuis la caméra vers la souris
    const intersects = this.raycaster.intersectObject(this.ship.mesh, true);
    
    // Si le rayon intersecte le vaisseau, le clic est sur le vaisseau
    return intersects.length > 0;
  }
  
  /**
   * Gestionnaire d'événement de changement de visibilité de page
   */
  private onVisibilityChange(): void {
    if (document.hidden) {
      this.isPaused = true;
    } else {
      this.isPaused = false;
    }
  }
  
  /**
   * Démarre le jeu
   */
  public start(): void {
    this.isRunning = true;
    this.isPaused = false;
    this.reset();
    this.clock.start();
  }
  
  /**
   * Arrête le jeu
   */
  public stop(): void {
    this.isRunning = false;
  }
  
  /**
   * Met le jeu en pause
   */
  public pause(): void {
    this.isPaused = true;
  }
  
  /**
   * Reprend le jeu
   */
  public resume(): void {
    this.isPaused = false;
    this.clock.start();
  }
  
  /**
   * Réinitialise le jeu
   */
  public reset(): void {
    // Réinitialiser le vaisseau
    if (this.ship) {
      this.ship.reset();
    }
    
    // Supprimer toutes les étoiles
    for (const star of this.stars) {
      this.scene.remove(star.mesh);
    }
    this.stars = [];
    
    // Supprimer tous les astéroïdes
    for (const asteroid of this.asteroids) {
      this.scene.remove(asteroid.mesh);
    }
    this.asteroids = [];
    
    // Réinitialiser les variables
    this.spawnTimer = 0;
  }
  
  /**
   * Nettoie les ressources
   */
  public dispose(): void {
    // Arrêter le jeu
    this.stop();
    
    // Nettoyer les écouteurs d'événements
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown.bind(this));
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    window.removeEventListener('mouseup', this.onMouseUp.bind(this));
    document.removeEventListener('visibilitychange', this.onVisibilityChange.bind(this));
    
    // Nettoyer le rendu
    this.container.removeChild(this.renderer.domElement);
    this.renderer.dispose();
    
    // Nettoyer la scène
    this.scene.clear();
  }
}
