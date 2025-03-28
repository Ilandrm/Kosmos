import * as THREE from 'three';
import { TextureLoader } from 'three';
import GameObject3D from './GameObject3D';

export enum PlanetType {
  EARTH = 'earth',
  MARS = 'mars',
  VENUS = 'venus',
  JUPITER = 'jupiter',
  NEPTUNE = 'neptune'
}

export default class Planet3D extends GameObject3D {
  readonly type: PlanetType;
  private readonly pointValue: number;
  
  // Textures pour les planètes (chargées une seule fois)
  private static textures: {
    earth?: THREE.Texture;
    mars?: THREE.Texture;
    venus?: THREE.Texture;
    jupiter?: THREE.Texture;
    neptune?: THREE.Texture;
  } = {};
  
  // Caractéristiques par type
  private static readonly typeProperties: Record<PlanetType, {
    radius: number,
    points: number,
    color: number,
    emissiveColor: number,
    emissiveIntensity: number,
    hasAtmosphere: boolean,
    atmosphereColor: number,
    atmosphereOpacity: number,
    rotationSpeed: number
  }> = {
    [PlanetType.EARTH]: {
      radius: 4.0,  // Hitbox à 4
      points: 20,
      color: 0xffffff,
      emissiveColor: 0x1144aa,
      emissiveIntensity: 0.3,
      hasAtmosphere: true,
      atmosphereColor: 0x6ca6ff,
      atmosphereOpacity: 0.35,
      rotationSpeed: 0.2
    },
    [PlanetType.MARS]: {
      radius: 4.0,  // Hitbox à 4
      points: 15,
      color: 0xffffff,
      emissiveColor: 0x553311,
      emissiveIntensity: 0.25,
      hasAtmosphere: true,
      atmosphereColor: 0xffaa88,
      atmosphereOpacity: 0.25,
      rotationSpeed: 0.18
    },
    [PlanetType.VENUS]: {
      radius: 4.0,  // Hitbox à 4
      points: 25,
      color: 0xffffff,
      emissiveColor: 0x775533,
      emissiveIntensity: 0.35,
      hasAtmosphere: true,
      atmosphereColor: 0xffe0a0,
      atmosphereOpacity: 0.55,
      rotationSpeed: 0.1
    },
    [PlanetType.JUPITER]: {
      radius: 4.0,  // Hitbox à 4
      points: 50,
      color: 0xffffff,
      emissiveColor: 0x774411,
      emissiveIntensity: 0.28,
      hasAtmosphere: true,
      atmosphereColor: 0xffcc88,
      atmosphereOpacity: 0.3,
      rotationSpeed: 0.4
    },
    [PlanetType.NEPTUNE]: {
      radius: 4.0,  // Hitbox à 4
      points: 35,
      color: 0xffffff,
      emissiveColor: 0x114477,
      emissiveIntensity: 0.4,
      hasAtmosphere: true,
      atmosphereColor: 0x88aaff,
      atmosphereOpacity: 0.45,
      rotationSpeed: 0.3
    }
  };
  
  constructor(
    scene: THREE.Scene,
    type: PlanetType = PlanetType.EARTH,
    position: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  ) {
    // Obtenir les propriétés en fonction du type
    const props = Planet3D.typeProperties[type];
    
    // Créer la planète avec sa texture et son atmosphère
    const planetObject = Planet3D.createPlanetMesh(type, props);
    
    super(scene, planetObject);
    
    this.type = type;
    this.pointValue = props.points;
    this.boundingRadius = props.radius;
    
    // Positionner la planète
    this.position = position;
    
    // Définir la vitesse et la rotation de la planète
    this.initPhysics();
  }
  
  /**
   * Charge les textures nécessaires pour les planètes
   */
  private static async loadTextures(): Promise<void> {
    if (!this.textures.earth) {
      const textureLoader = new TextureLoader();
      
      // Charger les textures des planètes
      this.textures.earth = textureLoader.load('/textures/planets/earth.jpg');
      this.textures.mars = textureLoader.load('/textures/planets/mars.jpg');
      this.textures.venus = textureLoader.load('/textures/planets/venus.jpg');
      this.textures.jupiter = textureLoader.load('/textures/planets/jupiter.jpg');
      this.textures.neptune = textureLoader.load('/textures/planets/neptune.jpg');
      
      // Configurer les textures
      const textures = [this.textures.earth, this.textures.mars, this.textures.venus, 
                        this.textures.jupiter, this.textures.neptune];
      
      textures.forEach(texture => {
        if (texture) {
          // Pour améliorer la qualité des textures de planètes
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.anisotropy = 16;
          // Pas besoin de répétition car les textures sont sphériques
        }
      });
    }
  }

  /**
   * Crée un objet planète avec sa texture et son atmosphère
   */
  private static createPlanetMesh(type: PlanetType, props: any): THREE.Object3D {
    // Charger les textures si nécessaire
    this.loadTextures();
    
    // Créer un groupe pour contenir la planète et son atmosphère
    const planetGroup = new THREE.Group();
    
    // Sélectionner la texture en fonction du type de planète
    let planetTexture;
    switch (type) {
      case PlanetType.EARTH:
        planetTexture = this.textures.earth;
        break;
      case PlanetType.MARS:
        planetTexture = this.textures.mars;
        break;
      case PlanetType.VENUS:
        planetTexture = this.textures.venus;
        break;
      case PlanetType.JUPITER:
        planetTexture = this.textures.jupiter;
        break;
      case PlanetType.NEPTUNE:
        planetTexture = this.textures.neptune;
        break;
      default:
        planetTexture = this.textures.earth;
    }
    
    // Géométrie sphérique pour la planète avec moins de segments pour améliorer les performances
    // 16 segments en largeur et hauteur, compromis entre performance et qualité
    const geometry = new THREE.SphereGeometry(props.radius, 16, 16);
    
    // Matériau avec la texture de la planète
    const material = new THREE.MeshStandardMaterial({
      map: planetTexture || null,
      color: props.color,
      emissive: props.emissiveColor,
      emissiveIntensity: props.emissiveIntensity,
      metalness: 0.0, // Les planètes ne sont pas métalliques par défaut
      roughness: 0.8, // Surface non lisse
      bumpScale: 0.05,
      depthWrite: true, // Assure que l'objet est correctement écrit dans le depth buffer
      depthTest: true   // Assure que l'objet respecte le depth testing
    });
    
    // Créer le mesh principal de la planète
    const planetMesh = new THREE.Mesh(geometry, material);
    planetGroup.add(planetMesh);
    
    // Ajouter une atmosphère si la planète en a une
    if (props.hasAtmosphere) {
      // L'atmosphère est une sphère légèrement plus grande que la planète, avec moins de segments
      const atmosphereGeometry = new THREE.SphereGeometry(props.radius * 1.1, 12, 12);
      const atmosphereMaterial = new THREE.MeshStandardMaterial({
        color: props.atmosphereColor,
        transparent: true,
        opacity: props.atmosphereOpacity,
        side: THREE.BackSide, // Afficher l'intérieur de la sphère
        emissive: props.atmosphereColor,
        emissiveIntensity: 0.5,
        blending: THREE.AdditiveBlending, // Pour un effet plus brillant
        depthWrite: false // Pour l'atmosphère transparente, désactiver l'écriture dans le depth buffer
      });
      
      const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
      planetGroup.add(atmosphere);
      
      // Ajouter une seconde couche d'atmosphère pour un effet plus brillant
      const outerAtmosphereGeometry = new THREE.SphereGeometry(props.radius * 1.2, 10, 10);
      const outerAtmosphereMaterial = new THREE.MeshBasicMaterial({
        color: props.atmosphereColor,
        transparent: true,
        opacity: props.atmosphereOpacity * 0.5,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      const outerAtmosphere = new THREE.Mesh(outerAtmosphereGeometry, outerAtmosphereMaterial);
      planetGroup.add(outerAtmosphere);
    }
    
    // Activer l'effet de halo lumineux pour une meilleure brillance
    if (props.emissiveIntensity > 0.1) {
      const glowGeometry = new THREE.SphereGeometry(props.radius * 1.3, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: props.emissiveColor,
        transparent: true,
        opacity: 0.25,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      planetGroup.add(glowMesh);
    }
    
    return planetGroup;
  }
  
  /**
   * Animation de la planète (rotation sur elle-même)
   * @param deltaTime Temps écoulé depuis la dernière frame en secondes
   */
  private animatePlanet(deltaTime: number): void {
    if (!this.mesh) return;

    // Récupérer la vitesse de rotation du type de planète
    const props = Planet3D.typeProperties[this.type];
    
    // Appliquer la rotation à la planète (autour de son axe Y)
    this.mesh.rotation.y += props.rotationSpeed * deltaTime;
  }
  
  /**
   * Initialise la physique de la planète
   */
  private initPhysics(): void {
    // Vitesse de base qui dépend de la taille (les petites planètes sont plus rapides)
    // Cela crée une meilleure impression de profondeur
    const baseSpeed = 15 / (this.boundingRadius + 5); // Vitesse inversement proportionnelle à la taille
    
    // Pas de déplacement en Z car c'est le vaisseau qui avance maintenant
    this.velocity = new THREE.Vector3(
      0,                       // Pas de déplacement horizontal initial
      0,                       // Pas de déplacement vertical initial
      0                        // Pas de déplacement en Z
    );
    
    // Les planètes tournent sur elles-mêmes (animées dans la méthode animatePlanet)
    this.rotationSpeed = new THREE.Vector3(0, 0, 0);
  }
  
  /**
   * Met à jour la position et la rotation de la planète
   */
  update(deltaTime: number): void {
    try {
      if (!this.isActive || !this.mesh) return;
      
      // Sécurité pour éviter les NaN et les valeurs infinies
      if (isNaN(deltaTime) || !isFinite(deltaTime) || deltaTime > 0.1) {
        deltaTime = 0.016; // Valeur par défaut raisonnable (environ 60 FPS)
      }
      
      // Léger mouvement aléatoire sur les axes X et Y uniquement
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
      
      // Animer la rotation de la planète (effet visuel)
      this.animatePlanet(deltaTime);
      
      // Désactiver la planète si elle sort complètement de l'écran (X, Y) ou dépasse le joueur (Z)
      if (this.position.x < -30 || this.position.x > 30 || 
          this.position.y < -30 || this.position.y > 30 ||
          this.position.z > 20) { // Désactiver si elle passe le joueur
        this.setActive(false);
      }
    } catch (error) {
    }
  }
  
  /**
   * Ajuste la vitesse de la planète en fonction d'un facteur multiplicateur
   * @param factor Facteur multiplicateur de vitesse
   */
  adjustVelocity(factor: number): void {
    if (this.velocity) {
      // Appliquer le facteur uniquement aux composantes X et Y
      // pour ne pas affecter la vitesse d'approche en Z
      this.velocity.x *= factor;
      this.velocity.y *= factor;
    }
  }
  
  /**
   * Retourne la valeur en points de l'astéroïde
   */
  getPointValue(): number {
    return this.pointValue;
  }
}
