import * as THREE from 'three';

export class Star {
  public mesh: THREE.Object3D;
  public position: THREE.Vector3;
  public boundingRadius: number = 0.8;
  public speed: number = 15;
  
  private scene: THREE.Scene;
  private rotationSpeed: number = 1;
  private glowMaterial: THREE.MeshBasicMaterial | null = null;
  private glowMesh: THREE.Mesh | null = null;
  private glowPulseTime: number = 0;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.position = new THREE.Vector3();
    
    // Créer la géométrie de l'étoile
    this.mesh = this.createStarMesh();
    
    // Ajouter à la scène
    this.scene.add(this.mesh);
  }
  
  /**
   * Crée le mesh de l'étoile
   */
  private createStarMesh(): THREE.Object3D {
    const group = new THREE.Group();
    
    // Créer le corps de l'étoile
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 0.5,
      metalness: 0.5,
      roughness: 0.2
    });
    
    const starMesh = new THREE.Mesh(geometry, material);
    group.add(starMesh);
    
    // Créer le halo lumineux
    const glowGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });
    
    this.glowMesh = new THREE.Mesh(glowGeometry, this.glowMaterial);
    group.add(this.glowMesh);
    
    // Créer les rayons de l'étoile
    this.createStarRays(group);
    
    return group;
  }
  
  /**
   * Crée les rayons de l'étoile
   */
  private createStarRays(group: THREE.Group): void {
    // Créer plusieurs rayons à des angles différents
    const rayCount = 8;
    const rayLength = 1.2;
    const rayWidth = 0.1;
    
    const rayGeometry = new THREE.BoxGeometry(rayWidth, rayLength, rayWidth);
    const rayMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    
    for (let i = 0; i < rayCount; i++) {
      const ray = new THREE.Mesh(rayGeometry, rayMaterial);
      
      // Positionner le rayon
      const angle = (i / rayCount) * Math.PI * 2;
      ray.position.x = Math.cos(angle) * 0.6;
      ray.position.z = Math.sin(angle) * 0.6;
      
      // Orienter le rayon
      ray.lookAt(new THREE.Vector3(
        ray.position.x * 2,
        ray.position.y,
        ray.position.z * 2
      ));
      
      // Ajouter le rayon au groupe
      group.add(ray);
    }
    
    // Ajouter des rayons verticaux
    const verticalRay1 = new THREE.Mesh(rayGeometry, rayMaterial);
    verticalRay1.position.y = 0.6;
    verticalRay1.rotation.x = Math.PI / 2;
    group.add(verticalRay1);
    
    const verticalRay2 = new THREE.Mesh(rayGeometry, rayMaterial);
    verticalRay2.position.y = -0.6;
    verticalRay2.rotation.x = Math.PI / 2;
    group.add(verticalRay2);
  }
  
  /**
   * Met à jour l'étoile
   */
  public update(deltaTime: number): void {
    if (!this.mesh) return;
    
    // Faire tourner l'étoile
    this.mesh.rotation.y += this.rotationSpeed * deltaTime;
    this.mesh.rotation.x += this.rotationSpeed * 0.5 * deltaTime;
    
    // Mettre à jour la pulsation du halo
    if (this.glowMaterial && this.glowMesh) {
      this.glowPulseTime += deltaTime * 2;
      const pulseFactor = 0.3 * Math.sin(this.glowPulseTime) + 0.7; // Entre 0.4 et 1.0
      
      this.glowMaterial.opacity = 0.3 + (0.3 * pulseFactor);
      this.glowMesh.scale.set(pulseFactor, pulseFactor, pulseFactor);
    }
    
    // Déplacer l'étoile vers l'avant
    this.position.z += this.speed * deltaTime;
    this.mesh.position.copy(this.position);
  }
}
