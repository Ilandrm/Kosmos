// Type definitions for GameFlowService
// Project: [Insert Project Name]
// Definitions by: [Insert Your Name]

// Ordre des jeux dans le flux
const gameSequence = [
  'asteroid-dodge-3d',    // 1. Évitement
  'telescope',            // 2. Explorateur
  'space-hangman',        // 3. Pendu
  'alien-hunt-3d',        // 4. Chasse aux aliens
  'koesio-quiz',          // 5. Quizz
  'maze-3d',               // 6. Labyrinthe
];

// Consignes pour chaque jeu
const gameInstructions = {
  'asteroid-dodge-3d': {
    title: "Évitement d'Astéroïdes",
    players: "1 joueurs",
    time: "30 secondes",
    instruction: "Vous débutez une course interstellaire, évitez les astéroïdes et atteignez le K"
  },
  'telescope': {
    title: "Explorateur Spatial",
    players: "2 joueurs",
    time: "30 secondes",
    instruction: "Déplacez les 2 viseurs pour trouver les planètes"
  },
  'space-hangman': {
    title: "Pendu Spatial",
    players: "1 joueurs",
    time: "60 secondes",
    instruction: "Devinez le mot en utilisant les lettres à votre disposition"
  },
  'alien-hunt-3d': {
    title: "Chasse aux Aliens",
    players: "4 joueurs",
    time: "45 secondes",
    instruction: "Visez les vaisseaux violets et évitez les vaisseaux verts"
  },
  'koesio-quiz': {
    title: "Quiz Spatial",
    players: "1 joueurs",
    time: "60 secondes",
    instruction: "Donnez la bonne réponse parmi les 4 propositions"
  },
  'maze-3d': {
    title: "Labyrinthe Spatial",
    players: "1 joueur",
    time: "60 secondes",
    instruction: "Guidez le vaisseau jusqu'à la sortie à l'aide des flèches"
  }
};

// Message de fin après le dernier jeu
const completionMessage = "Félicitations à vous l'équipage… lisez bien cette phrase qui vous sera d'une grande utilité :\n\n« La sagesse grandit là où l'harmonie réside. Elle devient la force qui éclaire notre chemin vers la liberté \"";

export function getNextGame(currentGame) {
  const currentIndex = gameSequence.indexOf(currentGame);
  if (currentIndex === -1 || currentIndex === gameSequence.length - 1) {
    return 'completion'; // Page de fin plutôt que l'accueil
  }
  return gameSequence[currentIndex + 1];
}

export function isLastGame(currentGame) {
  return gameSequence.indexOf(currentGame) === gameSequence.length - 1;
}

export function getGameInstructions(gameName) {
  return gameInstructions[gameName] || null;
}

export function getCompletionMessage() {
  return completionMessage;
}

// Function to handle high score logic
export function handleHighScore() {
  // Implementation for handling high scores
  // This is a placeholder as the actual implementation is in the game component
  console.log('High score handled in GameFlowService');
}

const GameFlowService = {
  getNextGame,
  isLastGame,
  getGameInstructions,
  getCompletionMessage,
  handleHighScore
};

export default GameFlowService;