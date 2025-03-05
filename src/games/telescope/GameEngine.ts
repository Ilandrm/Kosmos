import * as THREE from 'three';

/**
 * Représente une planète dans le jeu
 */
interface Planet {
  id: number;
  name: string;
  color: string;
  gradient: string;
  hasRing: boolean;
  ringColor?: string;
  size: number;
  x: number;
  y: number;
  rotation?: number;
  rotationSpeed?: number;
}

/**
 * Moteur de jeu pour le jeu Telescope
 */
export default class GameEngine {
  private gameArea: HTMLElement;
  private gameAreaBounds: DOMRect;
  private planets: Planet[] = [];
  private isRunning: boolean = false;
  private animationFrameId: number = 0;
  private lastTime: number = 0;
  
  // Callbacks
  private onPlanetsUpdate: (planets: Planet[]) => void;
  private onTelescopeUpdate: () => void;
  
  // Couleurs disponibles pour les planètes
  private planetColors = [
    { 
      name: 'Rouge', 
      color: '#ff5c5c',
      gradient: 'radial-gradient(circle at 30% 30%, #ff9d7d 0%, #ff4040 40%, #c22121 90%)',
      hasRing: true,
      ringColor: 'linear-gradient(90deg, rgba(255, 157, 125, 0.8), rgba(255, 100, 100, 0.9), rgba(255, 157, 125, 0.8))'
    },
    { 
      name: 'Bleue', 
      color: '#5c8fff',
      gradient: 'radial-gradient(circle at 30% 30%, #72e1ff 0%, #0099cc 50%, #006699 95%)',
      hasRing: false
    },
    { 
      name: 'Verte', 
      color: '#5cff8f',
      gradient: 'radial-gradient(circle at 40% 40%, #d4ff5c 0%, #66ff99 40%, #00994d 85%)',
      hasRing: true,
      ringColor: 'linear-gradient(90deg, rgba(212, 255, 92, 0.7), rgba(102, 255, 153, 0.8), rgba(212, 255, 92, 0.7))'
    },
    { 
      name: 'Dorée', 
      color: '#ffdd5c',
      gradient: 'radial-gradient(circle at 30% 30%, #fff3b0 0%, #ffd42a 35%, #ff8c00 90%)',
      hasRing: true,
      ringColor: 'linear-gradient(90deg, rgba(255, 214, 42, 0.7), rgba(255, 140, 0, 0.9), rgba(255, 214, 42, 0.7))'
    },
    { 
      name: 'Violette', 
      color: '#c45cff',
      gradient: 'radial-gradient(circle at 30% 30%, #ea80ff 0%, #cc33ff 50%, #800080 95%)',
      hasRing: false
    }
  ];
  
  /**
   * Crée une nouvelle instance du moteur de jeu
   * @param gameArea Élément HTML contenant le jeu
   * @param onPlanetsUpdate Callback appelé quand les planètes sont mises à jour
   * @param onTelescopeUpdate Callback appelé quand la position du télescope est mise à jour
   */
  constructor(
    gameArea: HTMLElement,
    onPlanetsUpdate: (planets: Planet[]) => void,
    onTelescopeUpdate: () => void
  ) {
    this.gameArea = gameArea;
    this.gameAreaBounds = gameArea.getBoundingClientRect();
    this.onPlanetsUpdate = onPlanetsUpdate;
    this.onTelescopeUpdate = onTelescopeUpdate;
  }
  
  /**
   * Démarre le moteur de jeu
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.gameAreaBounds = this.gameArea.getBoundingClientRect();
    this.createPlanets();
    this.lastTime = performance.now();
    this.animate();
  }
  
  /**
   * Arrête le moteur de jeu
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
  
  /**
   * Boucle d'animation principale
   */
  private animate(): void {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // en secondes
    this.lastTime = currentTime;
    
    // Mettre à jour les planètes
    this.updatePlanets(deltaTime);
    
    // Appeler les callbacks
    this.onPlanetsUpdate(this.planets);
    this.onTelescopeUpdate();
    
    // Continuer la boucle d'animation
    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }
  
  /**
   * Crée les planètes pour le jeu
   */
  private createPlanets(): void {
    // Vider les planètes existantes
    this.planets = [];
    
    // Fonction pour vérifier si deux planètes se chevauchent
    const planetsOverlap = (planet1: Planet, planet2: Planet): boolean => {
      const distance = Math.sqrt(
        Math.pow(planet1.x - planet2.x, 2) + 
        Math.pow(planet1.y - planet2.y, 2)
      );
      return distance < (planet1.size/2 + planet2.size/2 + 20); // Ajouter 20px de marge
    };
    
    // Fonction pour vérifier si une position est valide pour une nouvelle planète
    const isValidPosition = (newPlanet: Planet): boolean => {
      for (let i = 0; i < this.planets.length; i++) {
        if (planetsOverlap(newPlanet, this.planets[i])) {
          return false;
        }
      }
      return true;
    };
    
    // Créer une planète pour chaque couleur
    for (let i = 0; i < this.planetColors.length; i++) {
      const planetSize = 40 + Math.random() * 40; // Planètes plus grandes
      let planet: Planet;
      let attempts = 0;
      const maxAttempts = 50;
      
      // Essayer de trouver une position valide
      do {
        planet = {
          id: i,
          name: this.planetColors[i].name,
          color: this.planetColors[i].color,
          gradient: this.planetColors[i].gradient,
          hasRing: this.planetColors[i].hasRing,
          ringColor: this.planetColors[i].ringColor,
          size: planetSize,
          x: Math.random() * (this.gameAreaBounds.width - planetSize * 2) + planetSize,
          y: Math.random() * (this.gameAreaBounds.height - planetSize * 2) + planetSize,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() * 0.5 + 0.1) * (Math.random() < 0.5 ? 1 : -1)
        };
        attempts++;
      } while (!isValidPosition(planet) && attempts < maxAttempts);
      
      // Si on a atteint le nombre maximal de tentatives, ajuster la taille
      if (attempts >= maxAttempts) {
        planet.size = Math.max(20, planet.size * 0.8);
      }
      
      this.planets.push(planet);
    }
  }
  
  /**
   * Met à jour l'état des planètes
   * @param deltaTime Temps écoulé depuis la dernière mise à jour (en secondes)
   */
  private updatePlanets(deltaTime: number): void {
    for (const planet of this.planets) {
      // Faire tourner les planètes
      if (planet.rotation !== undefined && planet.rotationSpeed !== undefined) {
        planet.rotation += planet.rotationSpeed * deltaTime;
        
        // Garder la rotation entre 0 et 2π
        if (planet.rotation > Math.PI * 2) {
          planet.rotation -= Math.PI * 2;
        } else if (planet.rotation < 0) {
          planet.rotation += Math.PI * 2;
        }
      }
    }
  }
}
