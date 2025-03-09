import * as THREE from 'three';

export class Asteroid {
  public mesh: THREE.Object3D;
  public position: THREE.Vector3;
  public boundingRadius: number = 2.0;
  public speed: number = 25;
  
  private scene: THREE.Scene;
  private rotationSpeed: THREE.Vector3;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.position = new THREE.Vector3();
    
    // Vitesse de rotation aléatoire
    this.rotationSpeed = new THREE.Vector3(
      Math.random() * 0.5 - 0.25,
      Math.random() * 0.5 - 0.25,
      Math.random() * 0.5 - 0.25
    );
    
    // Taille aléatoire
    const scale = 1 + Math.random() * 1.5;
    this.boundingRadius = scale * 1.2;
    
    // Créer le mesh de l'astéroïde
    this.mesh = this.createAsteroidMesh(scale);
    
    // Ajouter à la scène
    this.scene.add(this.mesh);
  }
  
  /**
   * Crée le mesh de l'astéroïde
   */
  private createAsteroidMesh(scale: number): THREE.Object3D {
    // Déterminer le type d'astéroïde à créer (plusieurs variantes)
    const asteroidType = Math.floor(Math.random() * 3);
    
    switch (asteroidType) {
      case 0:
        return this.createRockyAsteroid(scale);
      case 1:
        return this.createIcyAsteroid(scale);
      case 2:
      default:
        return this.createMetallicAsteroid(scale);
    }
  }
  
  /**
   * Crée un astéroïde rocheux
   */
  private createRockyAsteroid(scale: number): THREE.Object3D {
    const group = new THREE.Group();
    
    // Créer une forme de base légèrement irrégulière
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    
    // Déformer la géométrie pour la rendre plus irrégulière
    const positionAttribute = geometry.getAttribute('position');
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i);
      
      // Ajouter une déformation aléatoire
      vertex.x += (Math.random() * 0.2 - 0.1);
      vertex.y += (Math.random() * 0.2 - 0.1);
      vertex.z += (Math.random() * 0.2 - 0.1);
      
      // Mettre à jour la position
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    geometry.computeVertexNormals();
    
    // Matériau rocheux
    const material = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.9,
      metalness: 0.2,
      flatShading: true
    });
    
    const asteroid = new THREE.Mesh(geometry, material);
    
    // Ajouter quelques cratères
    this.addCraters(asteroid, scale);
    
    // Appliquer l'échelle
    group.scale.set(scale, scale, scale);
    
    group.add(asteroid);
    return group;
  }
  
  /**
   * Crée un astéroïde glacé
   */
  private createIcyAsteroid(scale: number): THREE.Object3D {
    const group = new THREE.Group();
    
    // Forme de base plus lisse
    const geometry = new THREE.IcosahedronGeometry(1, 2);
    
    // Légère déformation
    const positionAttribute = geometry.getAttribute('position');
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i);
      
      // Déformation plus subtile
      vertex.x += (Math.random() * 0.1 - 0.05);
      vertex.y += (Math.random() * 0.1 - 0.05);
      vertex.z += (Math.random() * 0.1 - 0.05);
      
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    geometry.computeVertexNormals();
    
    // Matériau glacé
    const material = new THREE.MeshStandardMaterial({
      color: 0xadd8e6,
      roughness: 0.3,
      metalness: 0.2,
      transparent: true,
      opacity: 0.9
    });
    
    const asteroid = new THREE.Mesh(geometry, material);
    
    // Appliquer l'échelle
    group.scale.set(scale, scale, scale);
    
    group.add(asteroid);
    return group;
  }
  
  /**
   * Crée un astéroïde métallique
   */
  private createMetallicAsteroid(scale: number): THREE.Object3D {
    const group = new THREE.Group();
    
    // Forme angulaire
    const geometry = new THREE.DodecahedronGeometry(1, 0);
    
    // Légère déformation
    const positionAttribute = geometry.getAttribute('position');
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i);
      
      // Déformation plus angulaire
      vertex.x += (Math.random() * 0.15 - 0.075);
      vertex.y += (Math.random() * 0.15 - 0.075);
      vertex.z += (Math.random() * 0.15 - 0.075);
      
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    geometry.computeVertexNormals();
    
    // Matériau métallique
    const material = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.4,
      metalness: 0.8
    });
    
    const asteroid = new THREE.Mesh(geometry, material);
    
    // Appliquer l'échelle
    group.scale.set(scale, scale, scale);
    
    group.add(asteroid);
    return group;
  }
  
  /**
   * Ajoute des cratères à l'astéroïde
   */
  private addCraters(asteroid: THREE.Mesh, scale: number): void {
    const numCraters = Math.floor(Math.random() * 5) + 3;
    
    for (let i = 0; i < numCraters; i++) {
      // Créer un cratère
      const craterGeometry = new THREE.SphereGeometry(0.3 + Math.random() * 0.2, 8, 8);
      const craterMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 1.0,
        metalness: 0.0,
        side: THREE.BackSide // Pour créer un effet de "creux"
      });
      
      const crater = new THREE.Mesh(craterGeometry, craterMaterial);
      
      // Positionner aléatoirement le cratère à la surface
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.sin(phi) * Math.sin(theta);
      const z = Math.cos(phi);
      
      crater.position.set(x, y, z);
      
      // Orienter le cratère pour qu'il pointe vers l'extérieur
      crater.lookAt(new THREE.Vector3(0, 0, 0));
      
      // Décaler légèrement vers l'intérieur
      crater.position.multiplyScalar(0.9);
      
      asteroid.add(crater);
    }
  }
  
  /**
   * Met à jour l'astéroïde
   */
  public update(deltaTime: number): void {
    if (!this.mesh) return;
    
    // Faire tourner l'astéroïde
    this.mesh.rotation.x += this.rotationSpeed.x * deltaTime;
    this.mesh.rotation.y += this.rotationSpeed.y * deltaTime;
    this.mesh.rotation.z += this.rotationSpeed.z * deltaTime;
    
    // Déplacer l'astéroïde vers l'avant
    this.position.z += this.speed * deltaTime;
    this.mesh.position.copy(this.position);
  }
}
