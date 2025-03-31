import * as THREE from 'three';
import GameObject3D from './GameObject3D';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export default class Ship3D extends GameObject3D {
  public isInvulnerable: boolean = false;
  private movementSpeed: number = 15;
  private collisionRays: THREE.Raycaster[] = [];
  private rayLength: number = 1.0; // Longueur des rayons de détection
  private rayDirections: THREE.Vector3[] = [];
  private collisionHelpers: THREE.ArrowHelper[] = [];
  private showDebugRays: boolean = false;
  
  // État des collisions pour chaque direction
  private collisionState = {
    front: false,
    back: false,
    left: false,
    right: false,
    up: false,
    down: false
  };
  
  // Contrôles du vaisseau
  private inputState = {
    moveLeft: false,
    moveRight: false,
    moveForward: false,
    moveBackward: false,
    moveUp: false,
    moveDown: false
  };
  
  // Liste des objets du labyrinthe avec lesquels vérifier les collisions
  private collisionObjects: THREE.Object3D[] = [];
  
  private camera: THREE.Camera;
private rotation: THREE.Vector3; // Add rotation property

  constructor(scene: THREE.Scene, collisionObjects: THREE.Object3D[] = [], camera: THREE.Camera) {
    const shipGroup = new THREE.Group();
    super(scene, shipGroup);
    this.boundingRadius = 1.5;
    this.position = new THREE.Vector3(0, -8, 0);
    this.targetX = null;
    this.targetY = null;
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.inputState = {
      moveLeft: false,
      moveRight: false,
      moveUp: false,
      moveDown: false
    };
    this.createFallbackShip();
    this.modelLoaded = true;
    this.loadShipModel();
    this.initThrusterParticles();
    this.initCollisionDetection();
    
    // Ajout des objets de collision
    this.collisionObjects = collisionObjects;
    
    this.camera = camera;
    
    this.setupEventListeners();
  }
  
  /**
   * Charge le modèle 3D du vaisseau à partir d'un fichier GLB
   */
  private loadShipModel(): void {
    const loader = new GLTFLoader();
    
    loader.load(
        `${import.meta.env.BASE_URL}textures/Créer_un_vaisseau_sp_0305092734_texture.glb`,
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(2.0, 2.0, 2.0); // Augmenter la taille du vaisseau
        model.rotation.y = Math.PI;
        model.rotation.z = 0;
        model.position.z = 0;
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = false;
            child.receiveShadow = false;
            if (child.material) {
              if (child.material.map) {
                child.material.map.anisotropy = 1;
                child.material.map.minFilter = THREE.LinearFilter;
              }
              if (child.material.envMap) child.material.envMap = null;
              if (child.material instanceof THREE.MeshStandardMaterial) {
                child.material.emissive = new THREE.Color(0x333344);
                child.material.emissiveIntensity = 0.4;
                child.material.metalness = 0.5;
                child.material.roughness = 0.4;
                if (!child.material.color.equals(new THREE.Color(0xffffff))) {
                  child.material.color.r = Math.min(1, child.material.color.r * 1.2);
                  child.material.color.g = Math.min(1, child.material.color.g * 1.2);
                  child.material.color.b = Math.min(1, child.material.color.b * 1.2);
                }
              }
              child.material.depthWrite = true;
              child.material.depthTest = true;
            }
          }
        });
        this.mesh.clear();
        this.mesh.add(model);

        // Recalculer la boîte de collision après le modèle est chargé
        this.boundingBox = new THREE.Box3().setFromObject(this.mesh);

        // Trouver la dimension maximale pour créer un cube
        const size = new THREE.Vector3();
        this.boundingBox.getSize(size);
        const maxDimension = Math.max(size.x, size.y, size.z);

        // Créer un cube centré sur le modèle
        const center = new THREE.Vector3();
        this.boundingBox.getCenter(center);
        this.boundingBox = new THREE.Box3(
          new THREE.Vector3(
            center.x - maxDimension / 2, 
            center.y - maxDimension / 2, 
            center.z - maxDimension / 2
          ),
          new THREE.Vector3(
            center.x + maxDimension / 2, 
            center.y + maxDimension / 2, 
            center.z + maxDimension / 2
          )
        );

        // Mettre à jour le rayon de collision
        this.boundingRadius = maxDimension / 2;
      },
      (xhr) => {
      },
      (error) => {
        this.createFallbackShip();
        this.modelLoaded = true;
      }
    );
  }
  
  /**
   * Crée un vaisseau de secours en cas d'échec du chargement du modèle
   */
  private createFallbackShip(): void {
    // Corps du vaisseau
    const bodyGeometry = new THREE.ConeGeometry(0.5, 1.5, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x3399ff,
      emissive: 0x112244,
      shininess: 100 
    });
    
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.5;
    
    // Cabine du vaisseau
    const cabinGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const cabinMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x66ccff,
      transparent: true,
      opacity: 0.7,
      shininess: 100 
    });
    
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.y = 0.5;
    cabin.position.z = -0.2;
    
    // Ailes du vaisseau
    const wingGeometry = new THREE.BoxGeometry(1.2, 0.1, 0.5);
    const wingMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x2277aa,
      emissive: 0x001133 
    });
    
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(-0.6, 0.3, 0);
    
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(0.6, 0.3, 0);
    
    // Ajouter toutes les parties au groupe
    this.mesh.add(body);
    this.mesh.add(cabin);
    this.mesh.add(leftWing);
    this.mesh.add(rightWing);
    
  }
  
  /**
   * Initialise la détection de collision avec rayons
   */
  private initCollisionDetection(): void {
    // Initialize ray directions for collision detection
    this.rayDirections = [
        new THREE.Vector3(0, 0, -1), // Front
        new THREE.Vector3(0, 0, 1),  // Back
        new THREE.Vector3(1, 0, 0),  // Right
        new THREE.Vector3(-1, 0, 0), // Left
        new THREE.Vector3(0, 1, 0),  // Up
        new THREE.Vector3(0, -1, 0)  // Down
    ];

    // Ensure collision rays are initialized
    this.collisionRays = [];
    for (let direction of this.rayDirections) {
        const raycaster = new THREE.Raycaster();
        this.collisionRays.push(raycaster);
    }

    // Debugging: Log the initialized ray directions
  }
  
  /**
   * Vérifie les collisions avec les objets du labyrinthe
   * @returns Un tableau de booléens indiquant s'il y a collision dans chaque direction
   */
  private checkCollisions(): void {
    // Réinitialiser l'état des collisions
    for (const key in this.collisionState) {
      this.collisionState[key] = false;
    }

    // Si aucun objet de collision n'est défini, sortir de la fonction
    if (this.collisionObjects.length === 0) {
      return;
    }

    // Créer une sphère de collision autour du vaisseau
    const shipSphere = new THREE.Sphere(this.position, this.boundingRadius);

    // Vérifier la collision avec chaque objet du labyrinthe
    for (const object of this.collisionObjects) {
      if (object instanceof THREE.Mesh) {
        // Créer une boîte de collision pour l'objet
        const objectBox = new THREE.Box3().setFromObject(object);
        
        // Vérifier si la sphère du vaisseau intersecte la boîte de l'objet
        if (objectBox.intersectsSphere(shipSphere)) {
          // Déterminer la direction de la collision
          const objectCenter = new THREE.Vector3();
          objectBox.getCenter(objectCenter);
          
          const direction = new THREE.Vector3().subVectors(this.position, objectCenter).normalize();
          
          if (Math.abs(direction.x) > Math.abs(direction.z)) {
            if (direction.x > 0) this.collisionState.left = true;
            else this.collisionState.right = true;
          } else {
            if (direction.z > 0) this.collisionState.back = true;
            else this.collisionState.front = true;
          }
          
          if (direction.y > 0) this.collisionState.down = true;
          else this.collisionState.up = true;
        }
      }
    }
  }
  
  /**
   * Met à jour la liste des objets avec lesquels vérifier les collisions
   */
  updateCollisionObjects(objects: THREE.Object3D[]): void {
    this.collisionObjects = objects;
  }
  
  /**
   * Active ou désactive l'affichage des rayons de détection de collision
   */
  toggleDebugRays(show: boolean): void {
    this.showDebugRays = show;
    
    // Supprimer les visualisations existantes
    for (const helper of this.collisionHelpers) {
      this.scene.remove(helper);
    }
    this.collisionHelpers = [];
    
    if (show) {
      // Recréer les visualisations
      for (let i = 0; i < this.rayDirections.length; i++) {
        const arrowHelper = new THREE.ArrowHelper(
          this.rayDirections[i].clone().normalize(),
          this.position,
          this.rayLength,
          0x00ff00
        );
        this.scene.add(arrowHelper);
        this.collisionHelpers.push(arrowHelper);
      }
    }
  }
  
  /**
   * Gestionnaire d'événements pour les touches enfoncées
   */
  handleKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.inputState.moveLeft = true;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.inputState.moveRight = true;
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.inputState.moveForward = true;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.inputState.moveBackward = true;
        break;
      case ' ': // Espace
      case 'e':
      case 'E':
        this.inputState.moveUp = true;
        break;
      case 'Shift':
      case 'c':
      case 'C':
        this.inputState.moveDown = true;
        break;
    }
  }
  
  /**
   * Gestionnaire d'événements pour les touches relâchées
   */
  handleKeyUp(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.inputState.moveLeft = false;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.inputState.moveRight = false;
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.inputState.moveForward = false;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.inputState.moveBackward = false;
        break;
      case ' ': // Espace
      case 'e':
      case 'E':
        this.inputState.moveUp = false;
        break;
      case 'Shift':
      case 'c':
      case 'C':
        this.inputState.moveDown = false;
        break;
    }
  }
  
  /**
   * Mise à jour de la position et de l'orientation du vaisseau
   * @param deltaTime Temps écoulé depuis la dernière frame en secondes
   */
  update(deltaTime: number): void {
    if (!this.isActive) return;
    
    // Vérifier les collisions avant de bouger
    this.checkCollisions();
    
    // Stocker la position précédente
    const previousPosition = this.position.clone();
    
    // Calculer la vitesse en fonction des entrées
    this.velocity.set(0, 0, 0);
    
    // Appliquer les mouvements en fonction des entrées, en tenant compte des collisions
    // Correction des contrôles inversés: avant/arrière sont maintenant correctement orientés
    if (this.inputState.moveForward && !this.collisionState.front) {
      this.velocity.z = -this.movementSpeed * deltaTime; // Inversion de la direction Z
    }
    if (this.inputState.moveBackward && !this.collisionState.back) {
      this.velocity.z = this.movementSpeed * deltaTime; // Inversion de la direction Z
    }
    if (this.inputState.moveLeft && !this.collisionState.left) {
      this.velocity.x = -this.movementSpeed * deltaTime; // Garder la même direction X
    }
    if (this.inputState.moveRight && !this.collisionState.right) {
      this.velocity.x = this.movementSpeed * deltaTime; // Garder la même direction X
    }
    if (this.inputState.moveUp && !this.collisionState.up) {
      this.velocity.y = this.movementSpeed * deltaTime;
    }
    if (this.inputState.moveDown && !this.collisionState.down) {
      this.velocity.y = -this.movementSpeed * deltaTime;
    }
    
    // Appliquer la vélocité à la position
    this.position.add(this.velocity);
    
    // Si une collision est détectée, revenir à la position précédente
    if ((this.velocity.x > 0 && this.collisionState.right) ||
        (this.velocity.x < 0 && this.collisionState.left) ||
        (this.velocity.z > 0 && this.collisionState.front) ||
        (this.velocity.z < 0 && this.collisionState.back) ||
        (this.velocity.y > 0 && this.collisionState.up) ||
        (this.velocity.y < 0 && this.collisionState.down)) {
      this.position.copy(previousPosition);
    }
    
    this.handleRotation(deltaTime);
    this.handleMovement(deltaTime);
    this.updateCameraOrientation();
  }
  
  private handleRotation(deltaTime: number): void {
    // Rotation du vaisseau
  }
  
  private handleMovement(deltaTime: number): void {
    // Pivoter uniquement vers la direction de mouvement
    if (this.inputState.moveLeft) {
      this.mesh.rotation.y = Math.PI / 2; // Faire face à gauche
    } else if (this.inputState.moveRight) {
      this.mesh.rotation.y = -Math.PI / 2; // Faire face à droite
    } else if (this.inputState.moveForward) {
      this.mesh.rotation.y = 0; // Faire face à l'avant
    } else if (this.inputState.moveBackward) {
      this.mesh.rotation.y = Math.PI; // Faire face à l'arrière
    }
  }
  
  private updateCameraOrientation(): void {
    // Copier la rotation du vaisseau à la caméra
    this.camera.quaternion.copy(this.mesh.quaternion);
  }
  
  /**
   * Récupère la référence au mesh du vaisseau
   */
  getShipMesh(): THREE.Object3D {
    return this.mesh;
  }
  
  private initThrusterParticles(): void {
    const particleGeometry = new THREE.BufferGeometry();
    const particleMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    
    // Créer un tableau de particules
    const particles = new Float32Array(1000 * 3); // 1000 particules, 3 coordonnées par particule
    for (let i = 0; i < particles.length; i++) {
      particles[i] = Math.random() * 2 - 1; // Valeurs aléatoires pour les coordonnées
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particles, 3));
    
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    this.mesh.add(particleSystem); // Ajouter le système de particules au vaisseau
  }
  
  private setupEventListeners(): void {
    // Nous n'ajoutons plus d'écouteurs d'événements de clavier ici
    // car nous utilisons maintenant les contrôles à l'écran
  }

  moveForward() {
    this.position.z -= this.movementSpeed; // Move forward in the negative Z direction
  }

  moveBackward() {
    this.position.z += this.movementSpeed; // Move backward in the positive Z direction
  }

  rotateLeft() {
    this.rotation.y += this.movementSpeed * 0.01; // Rotate left
  }

  rotateRight() {
    this.rotation.y -= this.movementSpeed * 0.01; // Rotate right
  }
}
