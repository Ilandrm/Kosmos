import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Ship {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public boundingRadius: number = 1.5;
  
  private scene: THREE.Scene;
  private thrusterParticles: THREE.Points | null = null;
  private particleSystem: THREE.BufferGeometry | null = null;
  private particleMaterial: THREE.PointsMaterial | null = null;
  private particles: Float32Array | null = null;
  private particleCount: number = 40;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    this.position = new THREE.Vector3(0, 0, 0);
    
    // Ajouter le groupe à la scène
    this.scene.add(this.mesh);
    
    // Charger le modèle du vaisseau
    this.loadShipModel();
    
    // Initialiser le système de particules pour le propulseur
    this.initThrusterParticles();
  }
  
  /**
   * Charge le modèle 3D du vaisseau
   */
  private loadShipModel(): void {
    const loader = new GLTFLoader();
    
    // Tenter de charger le modèle GLB
    loader.load(
      '/textures/Créer_un_vaisseau_sp_0305092734_texture.glb',
      (gltf) => {
        const model = gltf.scene;
        
        // Ajuster l'échelle et la rotation du modèle
        model.scale.set(0.5, 0.5, 0.5);
        model.rotation.y = Math.PI; // Tourner le modèle pour qu'il regarde vers l'avant
        
        // Ajouter le modèle au groupe
        this.mesh.add(model);
      },
      (xhr) => {
        console.log(`${(xhr.loaded / xhr.total * 100)}% chargé`);
      },
      (error) => {
        console.error('Erreur lors du chargement du modèle:', error);
        this.createFallbackShip();
      }
    );
  }
  
  /**
   * Crée un vaisseau de secours si le modèle ne peut pas être chargé
   */
  private createFallbackShip(): void {
    // Matériau pour le corps du vaisseau
    const material = new THREE.MeshStandardMaterial({
      color: 0x3498db,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x1a4a8f,
      emissiveIntensity: 0.2
    });
    
    // Forme du vaisseau
    const bodyGeometry = new THREE.ConeGeometry(1, 2.5, 8);
    const body = new THREE.Mesh(bodyGeometry, material);
    body.rotation.x = -Math.PI / 2; // Orienter correctement
    
    // Ailes
    const wingGeometry = new THREE.BoxGeometry(3, 0.2, 1);
    const wing = new THREE.Mesh(wingGeometry, material);
    wing.position.set(0, 0, 0.5);
    
    // Cockpit
    const cockpitGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const cockpitMaterial = new THREE.MeshStandardMaterial({
      color: 0x99ccff,
      metalness: 0.2,
      roughness: 0.1,
      transparent: true,
      opacity: 0.8
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0, 0.5, 0);
    cockpit.scale.set(1, 0.7, 1);
    
    // Ajouter tous les éléments au vaisseau
    this.mesh.add(body);
    this.mesh.add(wing);
    this.mesh.add(cockpit);
  }
  
  /**
   * Initialise le système de particules pour le propulseur
   */
  private initThrusterParticles(): void {
    // Géométrie pour les particules
    this.particleSystem = new THREE.BufferGeometry();
    this.particles = new Float32Array(this.particleCount * 3);
    
    // Initialiser les positions des particules
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      this.particles[i3] = (Math.random() * 0.4) - 0.2; // x
      this.particles[i3 + 1] = -2; // y (derrière le vaisseau)
      this.particles[i3 + 2] = (Math.random() * 0.4) - 0.2; // z
    }
    
    this.particleSystem.setAttribute('position', new THREE.BufferAttribute(this.particles, 3));
    
    // Matériau pour les particules
    this.particleMaterial = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.1,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    // Créer le système de particules
    this.thrusterParticles = new THREE.Points(this.particleSystem, this.particleMaterial);
    this.mesh.add(this.thrusterParticles);
  }
  
  /**
   * Met à jour les particules du propulseur
   */
  private updateThrusterParticles(deltaTime: number): void {
    if (!this.particles || !this.particleSystem) return;
    
    // Mettre à jour la position des particules
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      
      // Déplacer la particule vers l'arrière
      this.particles[i3 + 1] -= 2 * deltaTime;
      
      // Ajouter un peu de mouvement aléatoire
      this.particles[i3] += (Math.random() * 0.1 - 0.05) * deltaTime;
      this.particles[i3 + 2] += (Math.random() * 0.1 - 0.05) * deltaTime;
      
      // Réinitialiser la particule si elle est trop loin
      if (this.particles[i3 + 1] < -4) {
        this.particles[i3] = (Math.random() * 0.4) - 0.2;
        this.particles[i3 + 1] = -2;
        this.particles[i3 + 2] = (Math.random() * 0.4) - 0.2;
      }
    }
    
    // Mettre à jour la géométrie
    this.particleSystem.setAttribute('position', new THREE.BufferAttribute(this.particles, 3));
    this.particleSystem.attributes.position.needsUpdate = true;
  }
  
  /**
   * Met à jour l'inclinaison du vaisseau
   */
  private updateTilt(): void {
    // Calculer l'angle d'inclinaison basé sur la position X
    const maxTilt = 0.3; // Inclinaison maximale en radians
    const maxPos = 20;   // Position maximale
    
    // Calculer l'inclinaison proportionnelle à la position X
    const tiltAmount = (this.position.x / maxPos) * maxTilt;
    
    // Appliquer la rotation sur l'axe Z (inclinaison latérale)
    this.mesh.rotation.z = -tiltAmount;
  }
  
  /**
   * Met à jour la position du vaisseau
   */
  public setPosition(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    this.mesh.position.copy(this.position);
    
    // Mettre à jour l'inclinaison du vaisseau
    this.updateTilt();
  }
  
  /**
   * Met à jour le vaisseau
   */
  public update(deltaTime: number): void {
    // Mettre à jour les particules du propulseur
    this.updateThrusterParticles(deltaTime);
  }
  
  /**
   * Réinitialise le vaisseau
   */
  public reset(): void {
    this.position.set(0, 0, 0);
    this.mesh.position.copy(this.position);
    this.mesh.rotation.set(0, 0, 0);
  }
}
