// Type definitions for GameFlowService
// Project: [Insert Project Name]
// Definitions by: [Insert Your Name]

// Ordre des jeux dans le flux
const gameSequence = [
  'asteroid-dodge',
  'telescope',
  'space-hangman',
  'alien-hunt',
  'maze-3d',
  'koesio-quiz'
];

export function getNextGame(currentGame) {
    const currentIndex = gameSequence.indexOf(currentGame);
    if (currentIndex === -1 || currentIndex === gameSequence.length - 1) {
      return 'home'; // Retour à l'accueil si dernier jeu ou jeu non trouvé
    }
    return gameSequence[currentIndex + 1];
}

export function isLastGame(currentGame) {
    return gameSequence.indexOf(currentGame) === gameSequence.length - 1;
}

const GameFlowService = {
  getNextGame,
  isLastGame
};

export default GameFlowService;
