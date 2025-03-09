import * as THREE from 'three';

/**
 * Classe de base pour tous les objets de jeu 3D
 */
export default abstract class GameObject3D {
  protected mesh: THREE.Object3D;
  protected scene: THREE.Scene;
  protected velocity: THREE.Vector3 = new THREE.Vector3();
  protected rotationSpeed: THREE.Vector3 = new THREE.Vector3();
  protected boundingRadius: number = 1;
  protected isActive: boolean = true;
  protected debugSphere: THREE.Mesh | null = null; // Pour débugger le rayon de collision

  constructor(scene: THREE.Scene, mesh: THREE.Object3D) {
    this.scene = scene;
    this.mesh = mesh;
    this.scene.add(this.mesh);
  }

  /**
   * Mise à jour de l'objet à chaque frame
   * @param deltaTime Temps écoulé depuis la dernière frame en secondes
   */
  update(deltaTime: number): void {
    if (!this.isActive) return;

    // Appliquer la vitesse
    this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    
    // Appliquer la rotation
    this.mesh.rotation.x += this.rotationSpeed.x * deltaTime;
    this.mesh.rotation.y += this.rotationSpeed.y * deltaTime;
    this.mesh.rotation.z += this.rotationSpeed.z * deltaTime;
    
    // Mettre à jour la position de la sphère de debug si elle existe
    if (this.debugSphere) {
      this.debugSphere.position.copy(this.mesh.position);
    }
  }

  /**
   * Vérifie si cet objet est en collision avec un autre
   * @param other L'autre objet à tester pour collision
   * @returns true si collision, false sinon
   */
  isCollidingWith(other: GameObject3D): boolean {
    if (!this.isActive || !other.isActive) return false;

    // Version simplifie pour les objets sur le même plan Z=0 (selon la mémoire)
    // Si les objets ont un Z différent, on les ignore
    const dz = Math.abs(this.mesh.position.z - other.mesh.position.z);
    
    // Ignorer les objets qui sont loin en profondeur
    if (other.mesh.position.z < -3) {
      return false;
    }
    
    // Collision plus stricte - seulement quand les objets sont vraiment proches en Z
    if (dz > 3) {
      return false;
    }
    
    // Calcul de la distance horizontale et verticale (plan XY)
    const dx = this.mesh.position.x - other.mesh.position.x;
    const dy = this.mesh.position.y - other.mesh.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Réduction du rayon de collision pour que la collision corresponde mieux aux visuels
    // On réduit de 50% le rayon de collision pour éviter les collisions trop tôt
    const scaledBoundingRadius = other.boundingRadius * 0.5;
    
    // Ajustement du rayon de collision du joueur aussi pour éviter les collisions trop tôt
    const scaledPlayerRadius = this.boundingRadius * 0.5;
    
    // Rayon de collision combiné réduit pour un contact visuel plus précis
    const collisionRadius = scaledPlayerRadius + scaledBoundingRadius;
    
    // Collision plus stricte - ne se produit que lorsque les objets se touchent vraiment
    const isColliding = distance < collisionRadius;
    
    // Debug visuel : changer la couleur du sphere de debug si collision
    if (this.debugSphere && isColliding) {
      (this.debugSphere.material as THREE.MeshBasicMaterial).color.set(0xff0000); // Rouge si collision
    } else if (this.debugSphere) {
      (this.debugSphere.material as THREE.MeshBasicMaterial).color.set(0x00ff00); // Vert si pas de collision
    }
    
    return isColliding;
  }

  /**
   * Obtient la position de l'objet
   */
  get position(): THREE.Vector3 {
    return this.mesh.position;
  }
  
  /**
   * Définit la position de l'objet
   */
  set position(newPos: THREE.Vector3) {
    this.mesh.position.copy(newPos);
  }
  
  /**
   * Obtient les dimensions approximatives de l'objet
   * Pour une bounding box plus précise, les sous-classes peuvent override cette méthode
   */
  get size(): THREE.Vector3 {
    return new THREE.Vector3(
      this.boundingRadius * 2,
      this.boundingRadius * 2,
      this.boundingRadius * 2
    );
  }
  
  /**
   * Active ou désactive l'objet
   */
  setActive(active: boolean): void {
    this.isActive = active;
    this.mesh.visible = active;
  }
  
  /**
   * Vérifie si l'objet est actif
   */
  getActive(): boolean {
    return this.isActive;
  }
  
  /**
   * Supprime l'objet de la scène
   */
  dispose(): void {
    this.scene.remove(this.mesh);
    
    // Retirer la sphère de débug si elle existe
    if (this.debugSphere) {
      this.scene.remove(this.debugSphere);
      this.debugSphere = null;
    }
    
    // Si le mesh a des matériaux, les disposer aussi
    if (this.mesh instanceof THREE.Mesh) {
      const materials = Array.isArray(this.mesh.material) 
        ? this.mesh.material 
        : [this.mesh.material];
        
      materials.forEach(material => {
        if (material.map) material.map.dispose();
        material.dispose();
      });
      
      // Disposer la géométrie si elle existe
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
    }
  }
}
