#!/bin/bash

# Script pour faciliter l'utilisation de Docker avec Kosmos

# Créer le répertoire de scripts s'il n'existe pas
mkdir -p $(dirname "$0")

# Couleurs pour les messages
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Afficher un message de bienvenue
echo -e "${GREEN}==== Kosmos Docker Setup Utility ====${NC}"
echo -e "Ce script va vous aider à configurer et lancer Kosmos avec Docker"
echo ""

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
  echo -e "${RED}Docker n'est pas installé. Veuillez l'installer avant de continuer.${NC}"
  exit 1
fi

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
  echo -e "${RED}Docker Compose n'est pas installé. Veuillez l'installer avant de continuer.${NC}"
  exit 1
fi

# Demander à l'utilisateur ce qu'il souhaite faire
echo -e "${YELLOW}Que souhaitez-vous faire ?${NC}"
echo "1) Construire et lancer l'application en mode production"
echo "2) Construire et lancer l'application en mode développement"
echo "3) Arrêter tous les conteneurs en cours d'exécution"
echo "4) Afficher les logs des conteneurs en cours d'exécution"
echo "5) Nettoyer tous les conteneurs, images et volumes Docker liés à Kosmos"
echo "6) Quitter"

read -p "Votre choix (1-6): " choice

case $choice in
  1)
    echo -e "${GREEN}Construction et lancement de l'application en mode production...${NC}"
    docker-compose up --build -d kosmos-app
    echo -e "${GREEN}L'application est accessible à l'adresse http://localhost:8080${NC}"
    ;;
  2)
    echo -e "${GREEN}Construction et lancement de l'application en mode développement...${NC}"
    docker-compose up --build kosmos-dev
    echo -e "${GREEN}L'application est accessible à l'adresse http://localhost:5173${NC}"
    ;;
  3)
    echo -e "${YELLOW}Arrêt des conteneurs en cours d'exécution...${NC}"
    docker-compose down
    echo -e "${GREEN}Tous les conteneurs ont été arrêtés.${NC}"
    ;;
  4)
    echo -e "${YELLOW}Affichage des logs (Ctrl+C pour quitter)...${NC}"
    docker-compose logs -f
    ;;
  5)
    echo -e "${YELLOW}Nettoyage des ressources Docker...${NC}"
    docker-compose down --rmi all --volumes --remove-orphans
    echo -e "${GREEN}Nettoyage terminé.${NC}"
    ;;
  6)
    echo -e "${GREEN}Au revoir !${NC}"
    exit 0
    ;;
  *)
    echo -e "${RED}Choix invalide. Veuillez choisir un nombre entre 1 et 6.${NC}"
    exit 1
    ;;
esac
