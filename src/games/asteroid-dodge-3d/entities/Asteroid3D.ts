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
      radius: 1.5,
      points: 20,
      color: 0xffffff,  // La couleur sera fournie par la texture
      emissiveColor: 0x112233,
      emissiveIntensity: 0.1,
      hasAtmosphere: true,
      atmosphereColor: 0x6ca6ff,
      atmosphereOpacity: 0.2,
      rotationSpeed: 0.2
    },
    [PlanetType.MARS]: {
      radius: 1.2,
      points: 15,
      color: 0xffffff,
      emissiveColor: 0x331100,
      emissiveIntensity: 0.05,
      hasAtmosphere: true,
      atmosphereColor: 0xffaa88,
      atmosphereOpacity: 0.1,
      rotationSpeed: 0.18
    },
    [PlanetType.VENUS]: {
      radius: 1.4,
      points: 25,
      color: 0xffffff,
      emissiveColor: 0x553311,
      emissiveIntensity: 0.15,
      hasAtmosphere: true,
      atmosphereColor: 0xffe0a0,
      atmosphereOpacity: 0.4,
      rotationSpeed: 0.1
    },
    [PlanetType.JUPITER]: {
      radius: 2.5,
      points: 50,
      color: 0xffffff,
      emissiveColor: 0x553300,
      emissiveIntensity: 0.08,
      hasAtmosphere: true,
      atmosphereColor: 0xffcc88,
      atmosphereOpacity: 0.15,
      rotationSpeed: 0.4
    },
    [PlanetType.NEPTUNE]: {
      radius: 2.0,
      points: 35,
      color: 0xffffff,
      emissiveColor: 0x113355,
      emissiveIntensity: 0.2,
      hasAtmosphere: true,
      atmosphereColor: 0x88aaff,
      atmosphereOpacity: 0.3,
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
  private static loadTextures(): void {
    if (!this.textures.earth) {
      const textureLoader = new TextureLoader();
      
      // Charger les textures des planètes
      this.textures.earth = textureLoader.load('Kosmos/textures/planets/earth.jpg');
      this.textures.mars = textureLoader.load('Kosmos/textures/planets/mars.jpg');
      this.textures.venus = textureLoader.load('Kosmos/textures/planets/venus.jpg');
      this.textures.jupiter = textureLoader.load('Kosmos/textures/planets/jupiter.jpg');
      this.textures.neptune = textureLoader.load('Kosmos/textures/planets/neptune.jpg');
      
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
    
    // Géométrie sphérique pour la planète avec plus de segments pour éviter les artefacts
    // 32 segments en largeur et hauteur pour une bonne qualité
    const geometry = new THREE.SphereGeometry(props.radius, 32, 32);
    
    // Matériau avec la texture de la planète
    const material = new THREE.MeshStandardMaterial({
      map: planetTexture || null,
      color: props.color,
      emissive: props.emissiveColor,
      emissiveIntensity: props.emissiveIntensity,
      metalness: 0.0, // Les planètes ne sont pas métalliques par défaut
      roughness: 0.8, // Surface non lisse
      bumpScale: 0.05
    });
    
    // Créer le mesh principal de la planète
    const planetMesh = new THREE.Mesh(geometry, material);
    planetGroup.add(planetMesh);
    
    // Ajouter une atmosphère si la planète en a une
    if (props.hasAtmosphere) {
      // L'atmosphère est une sphère légèrement plus grande que la planète
      const atmosphereGeometry = new THREE.SphereGeometry(props.radius * 1.05, 32, 32);
      const atmosphereMaterial = new THREE.MeshStandardMaterial({
        color: props.atmosphereColor,
        transparent: true,
        opacity: props.atmosphereOpacity,
        side: THREE.BackSide, // Afficher l'intérieur de la sphère
        emissive: props.atmosphereColor,
        emissiveIntensity: 0.2
      });
      
      const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
      planetGroup.add(atmosphere);
    }
    
    // Ajouter un effet de halo lumineux autour de la planète
    if (props.emissiveIntensity > 0.1) {
      const glowGeometry = new THREE.SphereGeometry(props.radius * 1.2, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: props.emissiveColor,
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending
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
    // Vitesse de base dépendant du type 
    const baseSpeed = 1 / this.boundingRadius * 5;
    
    // Direction aléatoire avec une dominante vers le "bas" (vers le joueur)
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      -baseSpeed * (Math.random() + 0.8),
      (Math.random() - 0.5)
    );
    
    // Nous n'utilisons plus la rotation externe (rotationSpeed) car les planètes
    // tournent sur elles-mêmes (animées dans la méthode animatePlanet)
    this.rotationSpeed = new THREE.Vector3(0, 0, 0);
  }
  
  /**
   * Met à jour la position et la rotation de la planète
   */
  update(deltaTime: number): void {
    super.update(deltaTime);
    
    // Animer la rotation de la planète
    this.animatePlanet(deltaTime);
    
    // Si la planète sort trop loin en bas de la scène, la désactiver
    if (this.position.y < -50) {
      this.setActive(false);
    }
  }
  
  /**
   * Retourne la valeur en points de l'astéroïde
   */
  getPointValue(): number {
    return this.pointValue;
  }
}
