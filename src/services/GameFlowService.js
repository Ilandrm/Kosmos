// Ordre des jeux dans le flux
const gameSequence = [
  'asteroid-dodge',
  'telescope',
  'space-hangman',
  'alien-hunt',
  'maze-3d',
  'koesio-quiz'
];

export default {
  // Obtenir le jeu suivant dans la séquence
  getNextGame(currentGame) {
    const currentIndex = gameSequence.indexOf(currentGame);
    if (currentIndex === -1 || currentIndex === gameSequence.length - 1) {
      return 'home'; // Retour à l'accueil si dernier jeu ou jeu non trouvé
    }
    return gameSequence[currentIndex + 1];
  },
  
  // Vérifier si c'est le dernier jeu
  isLastGame(currentGame) {
    return gameSequence.indexOf(currentGame) === gameSequence.length - 1;
  }
};
