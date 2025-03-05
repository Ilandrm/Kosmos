import * as THREE from 'three';
import GameObject3D from './GameObject3D';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export default class Ship3D extends GameObject3D {
  public isInvulnerable: boolean = false;
  private invulnerabilityTimer: number = 0;
  private invulnerabilityDuration: number = 1500; // ms
  private movementSpeed: number = 15;
  private thrusterParticles: THREE.Points | null = null;
  private particleSystem: THREE.BufferGeometry | null = null;
  private particleMaterial: THREE.PointsMaterial | null = null;
  private particleCount: number = 100;
  private particles: Float32Array | null = null;
  
  // Contrôles du vaisseau
  private inputState = {
    moveLeft: false,
    moveRight: false,
    moveUp: false,
    moveDown: false
  };
  
  // Position cible pour le contrôle à la souris
  private targetX: number | null = null;
  
  // Limites de mouvement
  private bounds = {
    minX: -20,
    maxX: 20,
    minY: -8,  // Limite le mouvement à la partie basse de l'écran
    maxY: -8   // Fixe le vaisseau à une position Y constante
  };
  
  constructor(scene: THREE.Scene) {
    // Créer un groupe temporaire pour le vaisseau en attendant le chargement du modèle
    const shipGroup = new THREE.Group();
    
    super(scene, shipGroup);
    
    // Définir le rayon de collision et la position initiale
    this.boundingRadius = 1.5;
    this.position = new THREE.Vector3(0, 0, 0);
    
    // Charger le modèle GLB
    this.loadShipModel();
    
    // Créer le système de particules pour l'effet de propulsion
    this.initThrusterParticles();
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
        
        // Ajuster la taille du modèle (augmentation de l'échelle)
        model.scale.set(3.0, 3.0, 3.0);
        
        // Ajuster la rotation pour que le vaisseau pointe dans la bonne direction
        model.rotation.y = Math.PI; // Tourner de 180 degrés si nécessaire
        
        // S'assurer que le modèle est à Z=0
        model.position.z = 0;
        
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
        
        // Mettre à jour le rayon de collision si nécessaire après avoir examiné le modèle
        // this.boundingRadius = ...; // Ajuster en fonction de la taille réelle du modèle
      },
      
      // Callback de progression (optionnel)
      (xhr) => {
        console.log(`${(xhr.loaded / xhr.total * 100)}% chargé`);
      },
      
      // Callback d'erreur
      (error) => {
        console.error('Erreur lors du chargement du modèle:', error);
        
        // Créer un vaisseau de secours simple en cas d'échec de chargement
        this.createFallbackShip();
      }
    );
  }
  
  /**
   * Crée un vaisseau de secours simple en cas d'échec de chargement du modèle GLB
   */
  private createFallbackShip(): void {
    // Matériau simple pour le vaisseau de secours
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x3498db,
      metalness: 0.7,
      roughness: 0.3
    });
    
    // Forme simple pour le vaisseau
    const geometry = new THREE.ConeGeometry(1, 2.5, 8);
    const ship = new THREE.Mesh(geometry, material);
    ship.rotation.x = -Math.PI / 2; // Orienter correctement
    
    // Vider et ajouter ce vaisseau de secours
    this.mesh.clear();
    this.mesh.add(ship);
  }
  
  private initThrusterParticles(): void {
    // Géométrie pour les particules
    this.particleSystem = new THREE.BufferGeometry();
    this.particles = new Float32Array(this.particleCount * 3);
    
    // Initialiser les positions des particules
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      this.particles[i3] = (Math.random() * 0.4) - 0.2; // x
      this.particles[i3 + 1] = (Math.random() * 0.5) - 2; // y (derrière le vaisseau)
      this.particles[i3 + 2] = 0; // z = 0 pour aligner avec le vaisseau
    }
    
    this.particleSystem.setAttribute('position', new THREE.BufferAttribute(this.particles, 3));
    
    // Matériau pour les particules (brillant et coloré)
    this.particleMaterial = new THREE.PointsMaterial({
      color: 0x3dffff,
      size: 0.2,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    
    // Créer le système de points
    this.thrusterParticles = new THREE.Points(this.particleSystem, this.particleMaterial);
    this.mesh.add(this.thrusterParticles);
  }
  
  /**
   * Met à jour la position du vaisseau en fonction des contrôles
   * @param deltaTime Temps écoulé depuis la dernière frame en secondes
   */
  update(deltaTime: number): void {
    super.update(deltaTime);
    
    // Gérer l'invulnérabilité
    if (this.isInvulnerable) {
      this.invulnerabilityTimer += deltaTime * 1000;
      if (this.invulnerabilityTimer >= this.invulnerabilityDuration) {
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
        
        // Restaurer l'opacité normale
        this.setShipOpacity(1.0);
      } else {
        // Effet de clignotement pendant l'invulnérabilité
        const blink = Math.floor(this.invulnerabilityTimer / 100) % 2 === 0;
        this.setShipOpacity(blink ? 0.4 : 0.8);
      }
    }
    
    // Traiter les entrées pour déplacer le vaisseau
    this.handleMovement(deltaTime);
    
    // Animer les particules du propulseur
    this.updateThrusterParticles(deltaTime);
  }
  
  /**
   * Met à jour l'effet de particules du propulseur
   */
  private updateThrusterParticles(deltaTime: number): void {
    if (!this.particles || !this.particleSystem) return;
    
    // Mouvement des particules
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      
      // Déplacer la particule vers le bas
      this.particles[i3 + 1] -= (Math.random() * 5 + 2) * deltaTime;
      
      // Ajouter un peu de mouvement horizontal aléatoire
      this.particles[i3] += (Math.random() * 0.2 - 0.1) * deltaTime;
      this.particles[i3 + 2] += (Math.random() * 0.2 - 0.1) * deltaTime;
      
      // Réinitialiser la particule si elle est trop loin
      if (this.particles[i3 + 1] < -3) {
        this.particles[i3] = (Math.random() * 0.4) - 0.2; // x
        this.particles[i3 + 1] = -1.2; // y (derrière le vaisseau)
        this.particles[i3 + 2] = 0; // z = 0 pour aligner avec le vaisseau
      }
    }
    
    // Mettre à jour la géométrie des particules
    this.particleSystem.setAttribute('position', new THREE.BufferAttribute(this.particles, 3));
    this.particleSystem.attributes.position.needsUpdate = true;
  }
  
  /**
   * Déplace le vaisseau en fonction des entrées
   */
  private handleMovement(deltaTime: number): void {
    let moveX = 0;
    // Le mouvement Y est désormais ignoré pour limiter le mouvement à l'axe horizontal
    let moveY = 0;
    
    // Contrôle par clavier
    if (this.inputState.moveLeft) moveX -= 1;
    if (this.inputState.moveRight) moveX += 1;
    
    // Contrôle par souris si une position cible est définie
    if (this.targetX !== null) {
      // Calculer la différence entre la position actuelle et la cible
      const diff = this.targetX - this.mesh.position.x;
      const threshold = 0.3; // Zone de "deadzone" pour éviter les oscillations
      
      if (Math.abs(diff) > threshold) {
        // Déplacer vers la cible avec une vitesse proportionnelle à la distance
        moveX = Math.sign(diff) * Math.min(1.0, Math.abs(diff) / 3.0);
      }
    }
    
    // Normaliser le vecteur de mouvement pour une vitesse constante si nécessaire
    if (moveX !== 0) {
      moveX = moveX / Math.abs(moveX);
    }
    
    // Appliquer le mouvement horizontal uniquement
    const newX = this.mesh.position.x + moveX * this.movementSpeed * deltaTime;
    
    // Limiter la position dans les limites horizontales
    this.mesh.position.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, newX));
    
    // Incliner légèrement le vaisseau dans la direction du mouvement horizontal
    const targetRotationZ = moveX * -0.3;
    this.mesh.rotation.z += (targetRotationZ - this.mesh.rotation.z) * 5 * deltaTime;
  }
  
  /**
   * Définit l'opacité du vaisseau
   */
  private setShipOpacity(opacity: number): void {
    // Appliquer l'opacité à tous les matériaux du vaisseau
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(material => {
          material.transparent = opacity < 1;
          material.opacity = opacity;
        });
      }
    });
  }
  
  /**
   * Rend le vaisseau invulnérable pendant un certain temps
   */
  makeInvulnerable(): void {
    this.isInvulnerable = true;
    this.invulnerabilityTimer = 0;
  }
  
  /**
   * Gestionnaire d'événements pour les touches enfoncées
   */
  handleKeyDown(event: KeyboardEvent): void {
    // Désactivé pour privilégier le contrôle à la souris
    // On laisse le code commenté au cas où on voudrait réactiver les contrôles clavier
    /*
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
        this.inputState.moveUp = true;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.inputState.moveDown = true;
        break;
    }
    */
  }
  
  /**
   * Gestionnaire d'événements pour les touches relâchées
   */
  handleKeyUp(event: KeyboardEvent): void {
    // Désactivé pour privilégier le contrôle à la souris
    // On laisse le code commenté au cas où on voudrait réactiver les contrôles clavier
    /*
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
        this.inputState.moveUp = false;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.inputState.moveDown = false;
        break;
    }
    */
  }
  
  /**
   * Définit la position cible X pour le contrôle à la souris
   * @param x La position X cible dans l'espace 3D
   */
  setTargetX(x: number): void {
    this.targetX = x;
  }
  
  /**
   * Déplace le vaisseau vers l'avant (haut)
   */
  moveForward(): void {
    this.inputState.moveUp = true;
  }
  
  /**
   * Déplace le vaisseau vers l'arrière (bas)
   */
  moveBackward(): void {
    this.inputState.moveDown = true;
  }
  
  /**
   * Déplace le vaisseau vers la gauche
   */
  moveLeft(): void {
    this.inputState.moveLeft = true;
  }
  
  /**
   * Déplace le vaisseau vers la droite
   */
  moveRight(): void {
    this.inputState.moveRight = true;
  }
  
  /**
   * Arrête le mouvement vertical du vaisseau
   */
  stopVertical(): void {
    this.inputState.moveUp = false;
    this.inputState.moveDown = false;
  }
  
  /**
   * Arrête le mouvement horizontal du vaisseau
   */
  stopHorizontal(): void {
    this.inputState.moveLeft = false;
    this.inputState.moveRight = false;
  }
  
  /**
   * Nettoie les ressources lors de la suppression
   */
  dispose(): void {
    // Supprimer les systèmes de particules
    if (this.thrusterParticles && this.mesh.children.includes(this.thrusterParticles)) {
      this.mesh.remove(this.thrusterParticles);
    }
    
    if (this.particleSystem) {
      this.particleSystem.dispose();
    }
    
    if (this.particleMaterial) {
      this.particleMaterial.dispose();
    }
    
    // Appeler la méthode dispose de la classe parente
    super.dispose();
  }
}
