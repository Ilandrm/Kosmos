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

    // Calcul de la distance entre les centres des objets
    const distance = this.mesh.position.distanceTo(other.mesh.position);
    
    // Collision si la distance est inférieure à la somme des rayons
    return distance < (this.boundingRadius + other.boundingRadius);
  }

  /**
   * Vérifie si cet objet est en collision avec un tableau d'objets
   * @param others Les autres objets à tester pour collision
   * @returns Le premier objet avec lequel il y a collision, ou null
   */
  checkCollisionsWithArray(others: GameObject3D[]): GameObject3D | null {
    for (const other of others) {
      if (this.isCollidingWith(other)) {
        return other;
      }
    }
    return null;
  }

  /**
   * Active ou désactive la visualisation du rayon de collision
   * @param show true pour afficher, false pour cacher
   */
  showCollisionRadius(show: boolean): void {
    if (show && !this.debugSphere) {
      // Créer une sphère de debug pour visualiser le rayon de collision
      const geometry = new THREE.SphereGeometry(this.boundingRadius, 16, 16);
      const material = new THREE.MeshBasicMaterial({ 
        color: 0xff0000, 
        wireframe: true,
        transparent: true,
        opacity: 0.3
      });
      this.debugSphere = new THREE.Mesh(geometry, material);
      this.debugSphere.position.copy(this.mesh.position);
      this.scene.add(this.debugSphere);
    } else if (!show && this.debugSphere) {
      // Supprimer la sphère de debug
      this.scene.remove(this.debugSphere);
      this.debugSphere = null;
    }
  }

  /**
   * Récupère la position de l'objet
   */
  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  /**
   * Définit la position de l'objet
   */
  set position(newPosition: THREE.Vector3) {
    this.mesh.position.copy(newPosition);
    if (this.debugSphere) {
      this.debugSphere.position.copy(newPosition);
    }
  }

  /**
   * Récupère l'objet 3D
   */
  getMesh(): THREE.Object3D {
    return this.mesh;
  }

  /**
   * Active ou désactive l'objet
   */
  setActive(active: boolean): void {
    this.isActive = active;
    this.mesh.visible = active;
    if (this.debugSphere) {
      this.debugSphere.visible = active;
    }
  }

  /**
   * Vérifie si l'objet est actif
   */
  getActive(): boolean {
    return this.isActive;
  }

  /**
   * Récupère le rayon de collision
   */
  getRadius(): number {
    return this.boundingRadius;
  }
}
