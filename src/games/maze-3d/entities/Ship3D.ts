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
  
  constructor(scene: THREE.Scene, collisionObjects: THREE.Object3D[] = []) {
    // Créer un groupe temporaire pour le vaisseau en attendant le chargement du modèle
    const shipGroup = new THREE.Group();
    
    super(scene, shipGroup);
    
    // Définir le rayon de collision et la position initiale
    this.boundingRadius = 1.2; // Augmentation du rayon de collision
    this.rayLength = 1.5; // Augmentation de la longueur des rayons de détection
    this.position = new THREE.Vector3(0, 1, 0);
    
    // Enregistrer les objets pour la détection de collision
    this.collisionObjects = collisionObjects;
    
    // Initialiser les rayons de détection de collision
    this.initCollisionDetection();
    
    // Charger le modèle GLB
    this.loadShipModel();
  }
  
  /**
   * Charge le modèle 3D du vaisseau à partir d'un fichier GLB
   */
  private loadShipModel(): void {
    const loader = new GLTFLoader();
    
    // Charger le modèle
    loader.load(
      // URL du modèle
      '/textures/Créer_un_vaisseau_sp_0305092734_texture.glb',
      
      // Callback appelé lorsque le modèle est chargé
      (gltf) => {
        // Déterminer l'échelle et l'orientation appropriées pour le modèle
        const model = gltf.scene;
        
        // Ajuster la taille du modèle
        model.scale.set(2.0, 2.0, 2.0);
        
        // Ajuster la rotation pour que le vaisseau pointe dans la bonne direction
        model.rotation.y = Math.PI; // Tourner de 180 degrés
        
        // Parcourir tous les maillages pour configurer correctement les matériaux
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // Activer les ombres
            child.castShadow = true;
            child.receiveShadow = true;
            
            // S'assurer que le maillage utilise correctement la profondeur
            if (child.material) {
              child.material.depthWrite = true;
              child.material.depthTest = true;
            }
          }
        });
        
        // Remplacer le groupe temporaire par le modèle chargé
        this.mesh.clear(); // Supprimer le contenu actuel
        this.mesh.add(model); // Ajouter le modèle GLB
        
        console.log("Modèle de vaisseau chargé avec succès");
      },
      
      // Callback de progression (optionnel)
      (xhr) => {
        const percentComplete = (xhr.loaded / xhr.total) * 100;
        console.log('Chargement du modèle de vaisseau: ' + Math.round(percentComplete) + '%');
      },
      
      // Callback d'erreur
      (error) => {
        console.error('Erreur lors du chargement du modèle:', error);
        // Créer un vaisseau de secours en cas d'échec du chargement
        this.createFallbackShip();
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
    
    console.log("Vaisseau de secours créé");
  }
  
  /**
   * Initialise la détection de collision avec rayons
   */
  private initCollisionDetection(): void {
    // Définir les directions des rayons pour la détection de collision
    // Inverser avant/arrière pour correspondre aux contrôles corrigés
    this.rayDirections = [
      new THREE.Vector3(0, 0, -1),   // avant (inversé)
      new THREE.Vector3(0, 0, 1),    // arrière (inversé)
      new THREE.Vector3(1, 0, 0),    // droite
      new THREE.Vector3(-1, 0, 0),   // gauche
      new THREE.Vector3(0, 1, 0),    // haut
      new THREE.Vector3(0, -1, 0)    // bas
    ];
    
    // Créer les rayons de collision
    for (let i = 0; i < this.rayDirections.length; i++) {
      const raycaster = new THREE.Raycaster();
      this.collisionRays.push(raycaster);
      
      if (this.showDebugRays) {
        // Créer des flèches de visualisation pour le débogage
        const arrowHelper = new THREE.ArrowHelper(
          this.rayDirections[i].clone().normalize(),
          this.position,
          this.rayLength,
          0xff0000
        );
        this.scene.add(arrowHelper);
        this.collisionHelpers.push(arrowHelper);
      }
    }
  }
  
  /**
   * Vérifie les collisions avec les objets du labyrinthe
   * @returns Un tableau de booléens indiquant s'il y a collision dans chaque direction
   */
  private checkCollisions(): void {
    // Noms des directions correspondant aux indices du tableau rayDirections
    // Ces indices doivent correspondre à l'ordre des rayDirections définis dans initCollisionDetection
    const directions = ['front', 'back', 'right', 'left', 'up', 'down'];
    
    // Réinitialiser l'état des collisions
    this.collisionState.front = false;
    this.collisionState.back = false;
    this.collisionState.left = false;
    this.collisionState.right = false;
    this.collisionState.up = false;
    this.collisionState.down = false;
    
    // Vérifier les collisions dans chaque direction
    for (let i = 0; i < this.collisionRays.length; i++) {
      // Mettre à jour la position et la direction du rayon
      this.collisionRays[i].set(
        this.position, 
        this.rayDirections[i].clone().normalize()
      );
      
      // Mettre à jour la visualisation des rayons si activée
      if (this.showDebugRays && this.collisionHelpers[i]) {
        this.collisionHelpers[i].position.copy(this.position);
        this.collisionHelpers[i].setDirection(this.rayDirections[i].clone().normalize());
      }
      
      // Détecter les intersections
      const intersects = this.collisionRays[i].intersectObjects(this.collisionObjects, true);
      
      // S'il y a une intersection proche
      if (intersects.length > 0 && intersects[0].distance < this.rayLength) {
        // Marquer cette direction comme ayant une collision
        this.collisionState[directions[i] as keyof typeof this.collisionState] = true;
        
        // Changer la couleur du rayon en rouge si visualisation activée
        if (this.showDebugRays && this.collisionHelpers[i]) {
          this.collisionHelpers[i].setColor(new THREE.Color(0xff0000));
        }
      } else if (this.showDebugRays && this.collisionHelpers[i]) {
        // Remettre la couleur du rayon en vert s'il n'y a pas de collision
        this.collisionHelpers[i].setColor(new THREE.Color(0x00ff00));
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
    
    // Appliquer une légère rotation en fonction du mouvement pour un effet visuel
    if (this.inputState.moveLeft) {
      this.mesh.rotation.z = Math.min(this.mesh.rotation.z + 0.1, 0.3);
    } else if (this.inputState.moveRight) {
      this.mesh.rotation.z = Math.max(this.mesh.rotation.z - 0.1, -0.3);
    } else {
      // Retour progressif à la rotation neutre
      if (this.mesh.rotation.z > 0) {
        this.mesh.rotation.z = Math.max(this.mesh.rotation.z - 0.05, 0);
      } else if (this.mesh.rotation.z < 0) {
        this.mesh.rotation.z = Math.min(this.mesh.rotation.z + 0.05, 0);
      }
    }
    
    // Rotation en fonction du mouvement avant/arrière
    if (this.inputState.moveForward) {
      this.mesh.rotation.x = Math.min(this.mesh.rotation.x + 0.1, 0.2);
    } else if (this.inputState.moveBackward) {
      this.mesh.rotation.x = Math.max(this.mesh.rotation.x - 0.1, -0.2);
    } else {
      // Retour progressif à la rotation neutre
      if (this.mesh.rotation.x > 0) {
        this.mesh.rotation.x = Math.max(this.mesh.rotation.x - 0.05, 0);
      } else if (this.mesh.rotation.x < 0) {
        this.mesh.rotation.x = Math.min(this.mesh.rotation.x + 0.05, 0);
      }
    }
  }
  
  /**
   * Récupère la référence au mesh du vaisseau
   */
  getShipMesh(): THREE.Object3D {
    return this.mesh;
  }
}
