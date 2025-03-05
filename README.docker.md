# Kosmos - Guide Docker

## Introduction

Ce document explique comment utiliser Docker pour déployer et développer l'application Kosmos.

## Prérequis

- Docker installé sur votre machine
- Docker Compose installé sur votre machine

## Structure des fichiers Docker

- `Dockerfile` - Pour construire l'image de production
- `docker-compose.yml` - Configuration pour lancer les services
- `nginx.conf` - Configuration optimisée pour Nginx
- `.dockerignore` - Liste des fichiers à ignorer lors de la construction

## Commandes principales

### Construire et démarrer l'application en production

```bash
docker-compose up --build kosmos-app
```

L'application sera accessible à l'adresse http://localhost:8080

### Mode développement avec hot-reload

```bash
docker-compose up --build kosmos-dev
```

L'application en mode développement sera accessible à l'adresse http://localhost:5173

### Construire uniquement l'image Docker

```bash
docker build -t kosmos:latest .
```

### Exécuter un conteneur depuis l'image

```bash
docker run -p 8080:80 kosmos:latest
```

## Personnalisation

### Variables d'environnement

Vous pouvez ajouter des variables d'environnement dans le fichier `docker-compose.yml` sous la section `environment` du service concerné.

### Volumes

Pour le développement, les volumes sont configurés pour permettre le hot-reload. Vous pouvez les ajuster selon vos besoins dans le fichier `docker-compose.yml`.

## Mise en production

Pour un déploiement en production, considérez les éléments suivants :

1. Utilisez une registry Docker sécurisée
2. Configurez des limites de ressources pour les conteneurs
3. Mettez en place un proxy inversé (comme Traefik) pour gérer HTTPS
4. Utilisez des secrets Docker pour les informations sensibles

## Dépannage

### L'application ne démarre pas

Vérifiez les logs avec :

```bash
docker-compose logs kosmos-app
```

### Problèmes de performance

Assurez-vous d'avoir alloué suffisamment de ressources à Docker dans les paramètres de l'application Docker Desktop.

## Support

Pour toute question ou problème, veuillez créer une issue dans le dépôt du projet.
