import * as THREE from 'three';
import GameObject3D from './GameObject3D';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default class Ship3D extends GameObject3D {
  public isInvulnerable: boolean = false;
  private invulnerabilityTimer: number = 0;
  private invulnerabilityDuration: number = 1500; // ms
  private movementSpeed: number = 30; // Augmenté de 20 à 30 pour des contrôles plus réactifs
  private thrusterParticles: THREE.Points | null = null;
  private particleSystem: THREE.BufferGeometry | null = null;
  private particleMaterial: THREE.PointsMaterial | null = null;
  private particleCount: number = 40; // Réduit de 100 à 40 pour améliorer les performances
  private particles: Float32Array | null = null;
  private particleUpdateSkip: number = 0; // Pour mettre à jour les particules moins fréquemment
  private modelLoaded: boolean = false; // Indicateur si le modèle est chargé
  // Contrôles du vaisseau
  private inputState = {
    moveLeft: false,
    moveRight: false,
    moveUp: false,
    moveDown: false
  };
  // Positions cibles pour le contrôle à la souris
  private targetX: number | null = null;
  private targetY: number | null = null;
  // Limites de mouvement
  private bounds = {
    minX: -20,
    maxX: 20,
    minY: -10,  // Limite inférieure pour le mouvement vertical
    maxY: 10,   // Limite supérieure pour permettre un mouvement jusqu'au bord de l'écran
    minZ: -200, // Limite arrière pour le mouvement en Z (loin en profondeur)
    maxZ: 30    // Limite avant pour le mouvement en Z (près du joueur)
  };
  // Vitesse de déplacement sur l'axe Z (non utilisée dans cette configuration)
  private zMovementSpeed: number = 0;
  // Add scale and rotation properties
  public scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1); // Default scale
  public rotation: THREE.Euler = new THREE.Euler(0, 0, 0); // Default rotation

  constructor(scene: THREE.Scene) {
    // Créer un groupe temporaire pour le vaisseau en attendant le chargement du modèle
    const shipGroup = new THREE.Group();
    super(scene, shipGroup);
    // Définir le rayon de collision et la position initiale
    this.boundingRadius = 1.5;
    this.position = new THREE.Vector3(0, -8, 0); // Position initiale à Y=-8 (bas de l'écran) et Z=0
    // S'assurer que les targets sont null au départ pour éviter les mouvements automatiques
    this.targetX = null;
    this.targetY = null;
    // Initialiser la vélocité à zéro pour éviter des mouvements aléatoires au démarrage
    this.velocity = new THREE.Vector3(0, 0, 0);
    // Réinitialiser explicitement tous les états d'entrée à false
    this.inputState = {
      moveLeft: false,
      moveRight: false,
      moveUp: false,
      moveDown: false
    };
    // Charger le modèle GLB
    this.loadShipModel();
    // Créer le système de particules pour l'effet de propulsion
    this.initThrusterParticles();
    // Mettre en place les écouteurs d'événements pour les contrôles
    this.setupEventListeners();
  }

/**
 * Sets the rotation of the ship's mesh on the X-axis.
 * @param angle The angle in radians to set the rotation to.
 */
public setMeshRotationX(angle: number): void {
  this.mesh.rotation.x = angle;
}

  /**
   * Vérifie si le modèle du vaisseau est complètement chargé
   * @returns true si le modèle est chargé, false sinon
   */
  public isReady(): boolean {
    return this.modelLoaded;
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
      (gltf: THREE.GLTF) => {
        // Déterminer l'échelle et l'orientation appropriées pour le modèle
        const model = gltf.scene;
        
        // Ajuster la taille du modèle (augmentation de l'échelle - vaisseau plus gros)
        model.scale.set(4.5, 4.5, 4.5);
        
        // Ajuster la rotation pour que le vaisseau pointe dans la bonne direction
        // et reste droit (ne s'incline pas sur les côtés)
        model.rotation.y = Math.PI; // Tourner de 180 degrés si nécessaire
        model.rotation.z = 0; // Fixer la rotation Z pour empêcher l'inclinaison latérale
        
        // S'assurer que le modèle est à Z=0
        model.position.z = 0;
        
        // Optimiser le modèle pour de meilleures performances
        model.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            // Désactiver les ombres pour améliorer les performances
            child.castShadow = false;
            child.receiveShadow = false;
            
            // Améliorer la clarté et la visibilité du vaisseau
            if (child.material) {
              // Réduire la qualité des textures pour améliorer les performances
              if (child.material.map) {
                child.material.map.anisotropy = 1;
                child.material.map.minFilter = THREE.LinearFilter;
              }
              
              // Désactiver les effets avancés
              if (child.material.envMap) child.material.envMap = null;
              
              // Augmenter la luminosité du vaisseau
              if (child.material instanceof THREE.MeshStandardMaterial) {
                // Diminuer l'émission pour un effet plus subtil
                child.material.emissive = new THREE.Color(0x333344);
                child.material.emissiveIntensity = 0.4;
                
                // Réduire les réflexions pour un aspect moins brillant
                child.material.metalness = 0.5;
                child.material.roughness = 0.4;
                
                // Conserver la couleur de base avec un éclaircissement modéré
                if (!child.material.color.equals(new THREE.Color(0xffffff))) {
                  // Rendre légèrement plus clair sans exagérer
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
        
        // Remplacer le groupe temporaire par le modèle chargé
        this.mesh.clear(); // Supprimer le contenu actuel
        this.mesh.add(model); // Ajouter le modèle GLB
        
        // Indiquer que le modèle est maintenant chargé
        this.modelLoaded = true;
      },
      
      // Callback de progression (optionnel)
      (xhr: ProgressEvent) => {
      },
      
      // Callback d'erreur
      (err: unknown) => {
        
        // Créer un vaisseau de secours simple en cas d'échec de chargement
        this.createFallbackShip();
        
        // Même avec le vaisseau de secours, marquer comme chargé
        this.modelLoaded = true;
      }
    );
  }
  
  /**
   * Crée un vaisseau de secours simple en cas d'échec de chargement du modèle GLB
   */
  private createFallbackShip(): void {
    // Matériau plus lumineux pour le vaisseau de secours
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x66aaff,
      metalness: 0.6,
      emissive: 0x4466aa,
      emissiveIntensity: 0.7,
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
    // Géométrie pour les particules avec nombre réduit
    this.particleSystem = new THREE.BufferGeometry();
    this.particles = new Float32Array(this.particleCount * 3);
    
    // Initialiser les positions des particules
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      this.particles[i3] = (Math.random() * 0.4) - 0.2; // x
      this.particles[i3 + 1] = (Math.random() * 0.5) - 2; // y (derrière le vaisseau)
      this.particles[i3 + 2] = -1; // z légèrement derrière le vaisseau pour l'effet de propulsion
    }
    
    this.particleSystem.setAttribute('position', new THREE.BufferAttribute(this.particles, 3));
    
    // Matériau plus lumineux pour les particules du vaisseau
    this.particleMaterial = new THREE.PointsMaterial({
      color: 0x80dfff, // Couleur plus claire et vive
      size: 0.4, // Particules légèrement plus grandes
      transparent: true,
      opacity: 0.95, // Plus opaque pour une meilleure visibilité
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false, // Désactivation pour améliorer les performances
      depthWrite: false // Améliorer les performances
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
    if (!this.mesh) return;
    
    // Ne pas forcer la position Z à 0 pour permettre le mouvement vertical
    // this.mesh.position.z = 0;
    // this.position.z = 0;
    
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
    
    // IMPORTANT: Gérer les mouvements uniquement par les contrôles utilisateur
    // Aucun mouvement automatique ne doit se produire
    this.handleMovement(deltaTime);
    
    // Animer les particules du propulseur
    this.updateThrusterParticles(deltaTime);
    
    // FINAL: Vérification finale pour s'assurer que Z reste à 0
    // this.mesh.position.z = 0;
    // this.position.z = 0;
    // if (this.velocity) this.velocity.z = 0;
  }
  
  /**
   * Maintient le vaisseau à une position Z fixe
   * @param deltaTime Temps écoulé depuis la dernière frame
   */
  private fixPositionZ(deltaTime: number): void {
    // IMPORTANT: Cette méthode ne fait PLUS avancer le vaisseau
    // Elle s'assure uniquement que la position Z reste à 0
    if (!this.mesh) return;
    
    // Ne pas forcer la position Z à 0 pour permettre le mouvement vertical
    // this.mesh.position.z = 0;
    // this.position.z = 0;
    
    // S'assurer qu'aucune force ne peut déplacer le vaisseau sur l'axe Z
    // if (this.velocity) {
    //   this.velocity.z = 0;
    // }
  }
  
  /**
   * Met à jour l'effet de particules du propulseur moins fréquemment
   */
  private updateThrusterParticles(deltaTime: number): void {
    if (!this.particles || !this.particleSystem) return;
    
    // Utiliser un intervalle fixe pour une mise à jour plus stable
    this.particleUpdateSkip++;
    if (this.particleUpdateSkip < 3) { // Réduit de 4 à 3 pour un peu plus de fluidité
      return;
    }
    this.particleUpdateSkip = 0;
    
    // Utilisation d'un buffer temporaire et mise à jour partielle
    let needsUpdate = false;
    
    // Utiliser une portion fixe des particules pour plus de stabilité
    const updateCount = Math.floor(this.particleCount / 3);
    const startIdx = 0;
    const endIdx = updateCount;
    
    for (let i = startIdx; i < endIdx; i++) {
      const i3 = i * 3;
      
      // Utiliser des valeurs fixes de déplacement pour plus de stabilité
      this.particles[i3 + 1] -= 0.05; // Déplacement vertical plus lent
      this.particles[i3 + 2] -= 0.03; // Déplacement en Z plus lent
      
      // Réinitialiser la particule si elle est trop loin
      if (this.particles[i3 + 1] < -3 || this.particles[i3 + 2] < -4) {
        this.particles[i3] = (Math.random() * 0.4) - 0.2; // x
        this.particles[i3 + 1] = -1.2; // y (derrière le vaisseau)
        this.particles[i3 + 2] = -1; // z légèrement derrière le vaisseau
        needsUpdate = true;
      }
    }
    
    // Mettre à jour la géométrie des particules seulement si nécessaire
    if (needsUpdate) {
      this.particleSystem.setAttribute('position', new THREE.BufferAttribute(this.particles, 3));
      this.particleSystem.attributes.position.needsUpdate = true;
    }
  }
  
  /**
   * Déplace le vaisseau en fonction des entrées
   */
  private handleMovement(deltaTime: number): void {
    if (!this.mesh) return;
    
    // Ne pas forcer la position Z à 0 pour permettre le mouvement vertical
    // this.mesh.position.z = 0;
    // this.position.z = 0;
    // if (this.velocity) this.velocity.z = 0;
    
    // Sécurité: limiter deltaTime pour éviter les mouvements saccadés
    if (isNaN(deltaTime) || !isFinite(deltaTime) || deltaTime > 0.1) {
      deltaTime = 0.016; // environ 60 FPS
    }
    
    // ÉTAPE 2: Par défaut, PAS DE MOUVEMENT
    // C'est la clé pour éviter les mouvements automatiques
    let moveX = 0;
    let moveY = 0;
    let moveZ = 0; // Ajout de la variable moveZ pour le mouvement vertical
    let hasUserInput = false; // Indicateur crucial pour détecter une action utilisateur
    
    // ÉTAPE 3: Détecter les contrôles clavier (action utilisateur explicite)
    if (this.inputState.moveLeft) { moveX -= 1; hasUserInput = true; }
    if (this.inputState.moveRight) { moveX += 1; hasUserInput = true; }
    if (this.inputState.moveUp) { moveY += 1; moveZ += 1; hasUserInput = true; } // Ajout de moveZ pour le mouvement vertical
    if (this.inputState.moveDown) { moveY -= 1; moveZ -= 1; hasUserInput = true; } // Ajout de moveZ pour le mouvement vertical
    
    // ÉTAPE 4: Traiter les targets de souris UNIQUEMENT s'ils sont explicitement définis par l'utilisateur
    // Réduire le seuil pour rendre le mouvement plus fluide et précis
    const minThreshold = 0.1; // Seuil réduit pour plus de réactivité
    
    if (this.targetX !== null) {
      const diffX = this.targetX - this.mesh.position.x;
      // Mouvement plus direct pour éviter les vibrations
      moveX = Math.sign(diffX) * Math.min(Math.abs(diffX) / 5, 1.0);
      hasUserInput = true; // Marquer comme entrée utilisateur
    }
    
    if (this.targetY !== null) {
      const diffY = this.targetY - this.mesh.position.y;
      // Mouvement plus direct pour éviter les vibrations
      moveY = Math.sign(diffY) * Math.min(Math.abs(diffY) / 5, 1.0);
      hasUserInput = true; // Marquer comme entrée utilisateur
    }
    
    // ÉTAPE 5: CRUCIAL - Sortir IMMÉDIATEMENT s'il n'y a pas d'entrée utilisateur
    // C'est ce qui garantit absolument qu'il n'y aura AUCUN mouvement automatique
    if (!hasUserInput || (moveX === 0 && moveY === 0 && moveZ === 0)) {
      return;
    }
    
    // Normaliser le vecteur de mouvement pour éviter les accélérations en diagonale
    const magnitude = Math.sqrt(moveX * moveX + moveY * moveY + moveZ * moveZ);
    if (magnitude > 1) {
      moveX /= magnitude;
      moveY /= magnitude;
      moveZ /= magnitude;
    }
    
    // Vitesse de base du vaisseau augmentée pour plus de réactivité
    const speed = 20;
    
    // Calculer les nouvelles positions avec une légère interpolation pour lisser le mouvement
    // Cette approche évite les vibrations en rendant le mouvement plus progressif
    const targetX = this.mesh.position.x + moveX * speed * deltaTime;
    const targetY = this.mesh.position.y + moveY * speed * deltaTime;
    const targetZ = this.mesh.position.z + moveZ * speed * deltaTime; // Ajout de la variable targetZ pour le mouvement vertical
    
    // Appliquer les limites sur les deux axes
    const constrainedX = Math.min(this.bounds.maxX, Math.max(this.bounds.minX, targetX));
    const constrainedY = Math.min(this.bounds.maxY, Math.max(this.bounds.minY, targetY));
    const constrainedZ = Math.min(this.bounds.maxZ, Math.max(this.bounds.minZ, targetZ)); // Ajout de la variable constrainedZ pour le mouvement vertical
    
    // Lisser le mouvement pour éviter les vibrations, tout en gardant une bonne réactivité
    const smoothingFactor = 0.8; // Augmenté de 0.7 à 0.8 pour des mouvements plus directs
    const finalX = this.mesh.position.x + (constrainedX - this.mesh.position.x) * smoothingFactor;
    const finalY = this.mesh.position.y + (constrainedY - this.mesh.position.y) * smoothingFactor;
    const finalZ = this.mesh.position.z + (constrainedZ - this.mesh.position.z) * smoothingFactor; // Ajout de la variable finalZ pour le mouvement vertical
    
    // Mettre à jour la position
    this.mesh.position.x = finalX;
    this.mesh.position.y = finalY;
    this.mesh.position.z = finalZ; // Ajout de la mise à jour de la position Z
    
    this.position.x = finalX;
    this.position.y = finalY;
    this.position.z = finalZ; // Ajout de la mise à jour de la position Z
    
    // Effet d'inclinaison en fonction du mouvement horizontal
    const targetTiltZ = -moveX * 0.3;
    this.mesh.rotation.z += (targetTiltZ - this.mesh.rotation.z) * 3 * deltaTime;
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
  /**
   * Met en place les écouteurs d'événements pour les contrôles
   */
  private setupEventListeners(): void {
    // On ajoute des écouteurs d'événements seulement sur la fenêtre pour éviter les duplications
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  handleKeyDown(event: KeyboardEvent): void {
    // RÉACTIVATION des contrôles clavier
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
  }
  
  /**
   * Gestionnaire d'événements pour les touches relâchées
   */
  handleKeyUp(event: KeyboardEvent): void {
    // RÉACTIVATION des contrôles clavier
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
  }
  
  /**
   * Définit la position cible X pour le contrôle à la souris
   * @param x La position X cible dans l'espace 3D
   * @param isDragging Si true, le vaisseau suivra la position de la souris. Si false, la cible sera ignorée.
   */
  setTargetX(x: number, isDragging: boolean = false): void {
    // IMPORTANT: Ne mettre à jour la cible QUE si isDragging est true
    // Cela empêche le vaisseau de bouger tout seul sans action humaine
    if (isDragging) {
      this.targetX = x;
    } else {
      // TOUJOURS annuler la cible quand on ne glisse pas pour empêcher les mouvements automatiques
      this.targetX = null;
    }
  }
  
  /**
   * Définit la position cible Y pour le contrôle à la souris
   * @param y La position Y cible dans l'espace 3D
   * @param isDragging Si true, le vaisseau suivra la position de la souris. Si false, la cible sera ignorée.
   */
  setTargetY(y: number, isDragging: boolean = false): void {
    // IMPORTANT: Ne mettre à jour la cible QUE si isDragging est true
    // Cela empêche le vaisseau de bouger tout seul sans action humaine
    if (isDragging) {
      this.targetY = y;
    } else {
      // TOUJOURS annuler la cible quand on ne glisse pas pour empêcher les mouvements automatiques
      this.targetY = null;
    }
  }
  
  /**
   * Définit directement la position X du vaisseau sans passer par le système de cible
   * Cette méthode est utilisée pour le contrôle par glisser-déposer
   * @param x Nouvelle position X du vaisseau (limitée par les bornes min/max)
   */
  setPositionX(x: number): void {
    try {
      // Limiter la position aux bornes définies
      const clampedX = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, x));
      
      // Mettre à jour directement la position du vaisseau
      // Utiliser une légère interpolation pour adoucir le mouvement
      const currentX = this.mesh.position.x;
      const smoothX = currentX + (clampedX - currentX) * 0.7;
      
      this.mesh.position.x = smoothX;
      this.position.x = smoothX;
      
      // Mettre à jour l'inclinaison du vaisseau en fonction de sa position
      this.updateTilt();
    } catch (error) {
    }
  }
  
  /**
   * Met à jour l'inclinaison du vaisseau en fonction de sa position horizontale
   * pour donner un effet visuel de virage
   */
  private updateTilt(): void {
    // Réduire fortement l'inclinaison pour que le vaisseau reste presque droit
    // Calculer un angle d'inclinaison minimal basé sur la position X (-20 à 20)
    // Convertir en un angle de rotation maximum de ±0.05 radians (au lieu de 0.3)
    const tiltAmount = (this.position.x / this.bounds.maxX) * 0.05;
    
    // Appliquer la rotation sur l'axe Z (inclinaison latérale minimale)
    this.mesh.rotation.z = -tiltAmount; // Négatif pour incliner dans le bon sens
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
  
  /**
   * Vérifie si le vaisseau est proche d'un autre objet
   * @param otherObject L'objet à vérifier
   * @param distance La distance maximale pour considérer que l'objet est proche
   * @returns true si l'objet est proche, false sinon
   */
  public isNear(otherObject: GameObject3D, distance: number = 5): boolean {
    const dx = this.position.x - otherObject.position.x;
    const dy = this.position.y - otherObject.position.y;
    const dz = this.position.z - otherObject.position.z;
    const distanceSquared = dx * dx + dy * dy + dz * dz;
    return distanceSquared < (distance * distance);
  }

  /**
   * Method to make the ship look at a target position
   * @param target The target position
   */
  public lookAt(target: THREE.Vector3): void {
    const direction = new THREE.Vector3().subVectors(target, this.position).normalize();
    this.rotation.setFromVector3(direction);
  }
}
