# Projet Kosmos - Documentation du Développement

## Introduction
Ce document retrace l'évolution du projet Kosmos, une suite de mini-jeux sur le thème de l'espace développée avec Vue.js 3 et Three.js. Chaque mini-jeu dure 30 secondes maximum et présente une expérience de jeu unique en 3D.

## Technologies Utilisées
- **Frontend** : Vue.js 3 avec TypeScript
- **Rendu** : Canvas 2D
- **Gestion d'état** : Pinia
- **Routage** : Vue Router
- **Build Tool** : Vite

## Spécifications Générales
- Thème : Espace
- Style visuel : Futuriste, mature et professionnel
- Vue : Composition 3D
- Durée de chaque mini-jeu : 30 secondes maximum

## Mini-Jeu 1 : Évitement d'Astéroïdes
### Concept
Le joueur contrôle un vaisseau spatial qui se déplace uniquement horizontalement. L'objectif est d'éviter les astéroïdes qui apparaissent et se dirigent vers le joueur pour obtenir le meilleur score possible.

### Mécaniques
- Déplacement : Horizontal uniquement (gauche/droite)
- Obstacles : Astéroïdes de différentes tailles
- Bonus : Étoiles filantes qui donnent des points supplémentaires
- Système de score : Points accumulés en fonction du temps de survie et des bonus collectés

### Journal de développement
#### 04/03/2025 - Initialisation du projet
- Création du projet Vue.js 3 avec Vite
- Installation des dépendances nécessaires
- Mise en place de la structure du projet

#### 04/03/2025 - Développement du premier mini-jeu : Évitement d'Astéroïdes
- Création de l'interface utilisateur du jeu
- Implémentation du système de canvas 2D
- Développement de la classe principale du jeu
- Création des mécaniques de jeu (vaisseau, astéroïdes, étoiles filantes)
- Implémentation du système de collisions
- Système de score et de vies
- Optimisation pour les appareils mobiles (contrôles tactiles)
