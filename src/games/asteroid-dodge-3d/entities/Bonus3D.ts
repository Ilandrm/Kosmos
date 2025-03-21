import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import GameObject3D from './GameObject3D';

export enum BonusType3D {
  POINTS = 'points',        // Bonus de points
  SHIELD = 'shield',        // Bouclier temporaire
  SLOWTIME = 'slowtime',    // Ralentissement des planètes
  EXTRALIFE = 'extralife'   // Vie supplémentaire
}

export default class Bonus3D extends GameObject3D {
  private readonly type: BonusType3D;
  private readonly value: number;
  private rotationAxis: THREE.Vector3;
  private hoverAnimation: { 
    phase: number;
    speed: number;
    amplitude: number;
  };
  
  // Propriétés par type de bonus
  private static readonly typeProperties: Record<BonusType3D, {
    color: number;
    emissive: number;
    size: number;
    value: number;
    points: number;         // Nombre de pointes de l'étoile
    innerRadiusRatio: number; // Ratio du rayon intérieur par rapport au rayon extérieur
  }> = {
    [BonusType3D.POINTS]: {
      color: 0xFFD700,       // Or
      emissive: 0xFFA500,    // Orange
      size: 3.0,             // Augmenter la taille
      value: 200,
      points: 5,              // Étoile à 5 branches
      innerRadiusRatio: 0.4
    },
    [BonusType3D.SHIELD]: {
      color: 0x00BFFF,       // Bleu ciel
      emissive: 0x1E90FF,    // Bleu royal
      size: 3.0,
      value: 10,             // Durée du bouclier en secondes
      points: 6,              // Étoile à 6 branches
      innerRadiusRatio: 0.5
    },
    [BonusType3D.SLOWTIME]: {
      color: 0x9932CC,       // Violet
      emissive: 0x8A2BE2,    // Bleu violet
      size: 3.0,
      value: 5,              // Durée du ralentissement en secondes
      points: 7,              // Étoile à 7 branches
      innerRadiusRatio: 0.45
    },
    [BonusType3D.EXTRALIFE]: {
      color: 0xFF3030,       // Rouge vif
      emissive: 0xFF0000,    // Rouge
      size: 3.0,
      value: 1,              // Nombre de vies supplémentaires
      points: 8,              // Étoile à 8 branches
      innerRadiusRatio: 0.35
    }
  };
  
  constructor(
    scene: THREE.Scene,
    type: BonusType3D = BonusType3D.POINTS,
    position: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  ) {
    // Obtenir les propriétés du type de bonus
    const props = Bonus3D.typeProperties[type];
    
    // Créer le mesh du bonus
    const mesh = Bonus3D.createBonusMesh(type, props);
    
    super(scene, mesh);
    
    this.type = type;
    this.value = props.value;
    this.boundingRadius = props.size * 0.5;
    
    // Positionner le bonus
    this.position = position;
    
    // Initialiser l'animation de rotation
    this.rotationAxis = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();
    
    // Initialiser l'animation de flottement
    this.hoverAnimation = {
      phase: Math.random() * Math.PI * 2,
      speed: 2 + Math.random(),
      amplitude: 0.1 + Math.random() * 0.2
    };
    
    // Initialiser la vitesse
    this.initPhysics();
  }
  
  /**
   * Crée le mesh 3D pour un bonus en forme d'étoile
   */
  private static createBonusMesh(type: BonusType3D, props: any): THREE.Object3D {
    // Groupe pour contenir le bonus et ses effets
    const group = new THREE.Group();
    
    // Créer la géométrie d'étoile avec les paramètres spécifiques au type de bonus
    const geometry = this.createStarGeometry(props.size, props.points, props.innerRadiusRatio);
    
    // Matériau très brillant pour le bonus
    const material = new THREE.MeshStandardMaterial({
      color: props.color,
      emissive: props.emissive,
      emissiveIntensity: 2.5,  // Intensité ENCORE PLUS élevée pour une brillance maximale
      metalness: 1.0,          // Métalisage au maximum
      roughness: 0.0,          // Surface parfaitement lisse pour plus de réflexion
      transparent: true,
      opacity: 1.0,            // Opacité maximale
      toneMapped: false        // Désactiver le tone mapping pour des couleurs plus vives
    });
    
    // Créer le mesh principal
    const bonusMesh = new THREE.Mesh(geometry, material);
    
    // Légèrement incliner l'étoile pour un effet plus dynamique
    bonusMesh.rotation.x = Math.PI / 6;
    
    group.add(bonusMesh);
    
    // Ajouter un effet de halo (glow)
    this.addGlowEffect(group, props);
    
    // Ajouter un effet de particules scintillantes autour de l'étoile
    this.addSparkleEffect(group, props);
    
    return group;
  }
  
  /**
   * Crée une géométrie en forme d'étoile en 3D
   */
  private static createStarGeometry(size: number, points: number = 5, innerRadiusRatio: number = 0.4): THREE.BufferGeometry {
    // Créer une base d'étoile 2D
    const outerRadius = size * 0.5;
    const innerRadius = outerRadius * innerRadiusRatio;
    
    // Créer la géométrie de base avec des points en 2D
    const shape = new THREE.Shape();
    
    // Dessiner l'étoile point par point
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i / (points * 2)) * Math.PI * 2;
      
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    
    shape.closePath();
    
    // Extruder la forme 2D pour la rendre 3D avec de beaux bords
    const extrudeSettings = {
      depth: size * 0.1,           // Épaisseur de l'étoile
      bevelEnabled: true,          // Activer le biseau pour des bords plus doux
      bevelThickness: size * 0.05, // Épaisseur du biseau
      bevelSize: size * 0.02,      // Taille du biseau
      bevelSegments: 3             // Qualité du biseau
    };
    
    // Créer la géométrie 3D à partir de la forme 2D
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Appliquer une légère rotation pour un meilleur effet visuel
    geometry.rotateX(Math.PI / 2);
    
    return geometry;
  }
  adjustVelocity(factor: number): void {
    if (this.velocity) {
      // Appliquer le facteur uniquement aux composantes X et Y
      // pour ne pas affecter la vitesse d'approche en Z
      this.velocity.x *= factor;
      this.velocity.y *= factor;
    }
  }
  /**
   * Ajoute un effet de particules scintillantes autour du bonus
   */
  private static addSparkleEffect(group: THREE.Group, props: any): void {
    // Nombre de particules scintillantes - augmenté pour plus d'effets
    const particleCount = 15;
    
    // Créer un petit groupe pour contenir les particules et permettre une animation
    const sparkleGroup = new THREE.Group();
    group.add(sparkleGroup);
    
    // Créer les petites particules brillantes
    for (let i = 0; i < particleCount; i++) {
      // Taille aléatoire des particules
      const particleSize = props.size * (0.05 + Math.random() * 0.1);
      
      // Géométrie pour les particules (petites étoiles ou sphères)
      const particleGeometry = Math.random() > 0.5 ?
        new THREE.SphereGeometry(particleSize, 8, 8) :
        new THREE.OctahedronGeometry(particleSize, 0);
      
      // Matériau extrêmement brillant pour les particules
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,         // Particules blanches pour un effet plus éclatant
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,  // Mélange additif pour un éclat intense
        toneMapped: false        // Désactiver le tone mapping pour des couleurs plus vives
      });
      
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      
      // Positionner la particule autour de l'étoile
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = props.size * 0.8 * (0.8 + Math.random() * 0.4);
      
      particle.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        (Math.random() - 0.5) * props.size * 0.4
      );
      
      // Chaque particule aura sa propre animation
      particle.userData = {
        phase: Math.random() * Math.PI * 2,
        speed: 1 + Math.random() * 2,
        amplitude: 0.1 + Math.random() * 0.2,
        rotationSpeed: (Math.random() - 0.5) * 2
      };
      
      sparkleGroup.add(particle);
    }
    
    // Ajouter des données pour l'animation
    group.userData = {
      sparkleGroup: sparkleGroup,
      rotationSpeed: 0.5 + Math.random() * 0.5
    };
  }
  
  /**
   * Ajoute un effet de halo (glow) autour du bonus
   */
  private static addGlowEffect(group: THREE.Group, props: any): void {
    // Créer un matériau très lumineux pour le halo
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: props.emissive,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, // Pour un effet plus lumineux
      toneMapped: false // Désactiver le tone mapping pour des couleurs plus vives
    });
    
    // Créer une étoile légèrement plus grande pour l'effet de halo
    // On utilise la même méthode de création d'étoile mais avec une taille plus grande
    const points = props.points || 5;
    const innerRadiusRatio = props.innerRadiusRatio || 0.4;
    
    // Créer une étoile 2D plus grande que l'original pour le halo
    const outerRadius = props.size * 0.65;
    const innerRadius = outerRadius * innerRadiusRatio;
    
    const shape = new THREE.Shape();
    
    // Dessiner l'étoile point par point
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i / (points * 2)) * Math.PI * 2;
      
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    
    shape.closePath();
    
    // Créer une géométrie de base sans extrusion
    const glowGeometry = new THREE.ShapeGeometry(shape);
    
    // Créer le mesh de halo et l'ajouter au groupe
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    
    // Garantir que tous les éléments sont sur le même plan Z
    glowMesh.position.z = 0;
    
    // Rotation pour aligner sur l'étoile principale
    glowMesh.rotation.x = Math.PI / 2;
    
    // Ajouter le halo au groupe
    group.add(glowMesh);
    
    // Ajouter un second halo pour plus d'intensité
    const innerGlowMaterial = new THREE.MeshBasicMaterial({
      color: props.color,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    const innerGlowMesh = new THREE.Mesh(glowGeometry.clone(), innerGlowMaterial);
    innerGlowMesh.position.z = 0;
    innerGlowMesh.rotation.x = Math.PI / 2;
    innerGlowMesh.scale.set(0.7, 0.7, 0.7);
    
    group.add(innerGlowMesh);
  }
  
  /**
   * Initialise la physique du bonus
   */
  private initPhysics(): void {
    // Vitesse de base pour les bonus
    const baseSpeed = 40; // Vitesse élevée pour un mouvement rapide vers le joueur
    this.velocity = new THREE.Vector3(0, 0, baseSpeed); // Déplacement uniquement en Z
  }
  
  /**
   * Met à jour la position et l'animation du bonus
   */
  update(deltaTime: number): void {
    // Sécurité pour éviter les NaN et les valeurs infinies
    if (isNaN(deltaTime) || !isFinite(deltaTime) || deltaTime > 0.1) {
      deltaTime = 0.016; // Valeur par défaut raisonnable (environ 60 FPS)
    }

    // Légère déviation aléatoire sur les axes X et Y uniquement
    if (this.velocity) {
      // Ajout d'une légère déviation aléatoire (plus rarement)
      if (Math.random() < 0.05) { // 5% de chance à chaque frame
        this.velocity.x += (Math.random() - 0.5) * 0.5;
        this.velocity.y += (Math.random() - 0.5) * 0.5;

        // Limitation des vitesses latérales
        this.velocity.x = Math.max(-1, Math.min(1, this.velocity.x));
        this.velocity.y = Math.max(-1, Math.min(1, this.velocity.y));
      }

      // Ajouter une vitesse beaucoup plus élevée vers le joueur (axe Z)
      this.velocity.z = 50; // Vitesse nettement augmentée pour un jeu très dynamique
    }

    // Mise à jour de la position avec les nouvelles vélocités
    super.update(deltaTime);

    // Animation de rotation plus dynamique
    if (this.mesh) {
      this.mesh.rotation.x += 2 * deltaTime;
      this.mesh.rotation.y += 3 * deltaTime;

      // Faire "pulser" le bonus en changeant sa taille pour le rendre plus visible
      const pulseScale = 1.0 + 0.2 * Math.sin(performance.now() * 0.005);
      this.mesh.scale.set(pulseScale, pulseScale, pulseScale);
    }

    // Désactiver le bonus s'il dépasse le joueur (en Z) ou sort complètement de l'écran (X, Y)
    if (this.position.z > 30 || 
        this.position.x < -50 || this.position.x > 50 || 
        this.position.y < -50 || this.position.y > 50) {
      this.setActive(false);
    }
  }
  
  /**
   * Retourne le type de bonus
   */
  getType(): BonusType3D {
    return this.type;
  }
  
  /**
   * Retourne la valeur du bonus
   */
  getValue(): number {
    return this.value;
  }
  
  /**
   * Définit une direction spécifique pour le bonus
   * Cela permet de définir une trajectoire depuis le trou central vers le joueur
   */
  setDirection(direction: THREE.Vector3): void {
    // Normaliser pour s'assurer que la direction est correcte
    const normalizedDirection = direction.clone().normalize();
    
    // On conserve une vitesse de base élevée pour le mouvement en profondeur (axe Z)
    const zSpeed = 40; // Vitesse constante en profondeur (axe Z)
    
    // Pour les composantes X et Y, on utilise la direction normalisée mais avec une influence réduite
    // pour éviter de trop dévier de la trajectoire rectiligne vers le joueur
    this.velocity.x = normalizedDirection.x * 10; // Composante X avec influence modérée
    this.velocity.y = normalizedDirection.y * 10; // Composante Y avec influence modérée
    
    // On s'assure que la composante Z reste toujours positive et élevée
    // pour garantir que le bonus avance toujours vers le joueur en profondeur
    this.velocity.z = Math.max(zSpeed, normalizedDirection.z * 40);
  }
  
  /**
   * Définit la vitesse du bonus
   * Cette méthode est appelée par GameEngine3D
   */
  setSpeed(speed: number): void {
    // Conserver la direction actuelle
    const currentDirection = this.velocity.clone().normalize();
    
    // On préserve la vitesse en Z, qui doit rester élevée
    const currentZSpeed = this.velocity.z;
    
    // Appliquer la nouvelle vitesse aux composantes X et Y tout en conservant Z
    this.velocity.x = currentDirection.x * speed;
    this.velocity.y = currentDirection.y * speed;
    
    // S'assurer que la vitesse en Z est toujours suffisante pour avancer vers le joueur
    this.velocity.z = Math.max(currentZSpeed, 40);
  }
}
