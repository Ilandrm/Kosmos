# Guide de contribution à Kosmos

## Introduction

Merci de votre intérêt pour contribuer au projet Kosmos ! Ce document fournit des lignes directrices pour contribuer au projet de manière efficace.

## Configuration de l'environnement de développement

### Prérequis
- Node.js (version 16 ou supérieure)
- npm (inclus avec Node.js)
- Git

### Installation
1. Clonez ce dépôt : `git clone [URL_DU_DEPOT]`
2. Accédez au répertoire du projet : `cd Kosmos`
3. Installez les dépendances : `npm install`
4. Lancez le serveur de développement : `npm run dev`

### Docker (Optionnel)
Pour utiliser Docker :
1. Assurez-vous que Docker et Docker Compose sont installés
2. Utilisez le script d'aide : `./scripts/docker-setup.sh`
3. Ou exécutez directement : `docker-compose up -d kosmos-app`

## Structure du projet

```
kosmos/
├── public/            # Fichiers statiques
├── src/
│   ├── assets/        # Ressources (images, styles, etc.)
│   ├── components/    # Composants Vue réutilisables
│   ├── games/         # Jeux individuels
│   ├── router/        # Configuration du routeur Vue
│   ├── stores/        # Magasins Pinia
│   ├── App.vue        # Composant racine
│   └── main.ts        # Point d'entrée
├── Dockerfile         # Configuration Docker
└── docker-compose.yml # Configuration Docker Compose
```

## Flux de travail de contribution

1. Créez une branche pour votre fonctionnalité : `git checkout -b feature/nom-fonctionnalite`
2. Effectuez vos modifications
3. Validez vos changements : `git commit -m "Description des changements"`
4. Poussez vers la branche distante : `git push origin feature/nom-fonctionnalite`
5. Créez une Pull Request

## Conventions de codage

- Suivez les conventions Vue.js et TypeScript
- Utilisez des noms de variables significatifs
- Commentez votre code lorsque nécessaire
- Ajoutez des tests pour les nouvelles fonctionnalités

## Tests

Pour exécuter les tests :
```bash
npm run test
```

## Problèmes connus et améliorations futures

Consultez la section Issues sur le dépôt GitHub pour voir les problèmes connus et les améliorations planifiées.

## Contact

Pour toute question, n'hésitez pas à contacter les mainteneurs du projet.

Merci de contribuer à Kosmos !
