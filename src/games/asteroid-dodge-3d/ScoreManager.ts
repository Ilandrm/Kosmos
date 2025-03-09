export default class ScoreManager {
  private readonly STORAGE_KEY = 'asteroidDodge3dHighScores';
  private readonly MAX_SCORES = 10;
  private currentScore: number = 0;

  /**
   * Récupère les meilleurs scores depuis le localStorage
   */
  getHighScores(): { name: string; score: number }[] {
    const scores = localStorage.getItem(this.STORAGE_KEY);
    return scores ? JSON.parse(scores) : [];
  }

  /**
   * Sauvegarde un nouveau score s'il fait partie des meilleurs
   * @param name Nom du joueur
   * @param score Score obtenu
   * @returns true si le score a été sauvegardé, false sinon
   */
  saveScore(name: string, score: number): boolean {
    const highScores = this.getHighScores();
    
    // Vérifier si le score mérite d'être dans les meilleurs scores
    const isHighScore = 
      highScores.length < this.MAX_SCORES || 
      score > highScores[highScores.length - 1].score;
    
    if (isHighScore) {
      // Ajouter le nouveau score
      highScores.push({ name, score });
      
      // Trier les scores par ordre décroissant
      highScores.sort((a, b) => b.score - a.score);
      
      // Conserver uniquement les MAX_SCORES meilleurs
      const topScores = highScores.slice(0, this.MAX_SCORES);
      
      // Sauvegarder dans le localStorage
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(topScores));
    }
    
    return isHighScore;
  }

  /**
   * Vérifie si un score peut être classé dans les meilleurs scores
   * @param score Score à vérifier
   * @returns true si c'est un high score potentiel, false sinon
   */
  isHighScore(score: number): boolean {
    const highScores = this.getHighScores();
    return highScores.length < this.MAX_SCORES || score > highScores[highScores.length - 1].score;
  }

  /**
   * Réinitialise les meilleurs scores
   */
  resetScores(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Réinitialise le score courant
   */
  resetCurrentScore(): void {
    this.currentScore = 0;
  }

  /**
   * Met à jour le score courant
   * @param score Nouveau score
   */
  updateCurrentScore(score: number): void {
    this.currentScore = score;
  }

  /**
   * Récupère le score courant
   * @returns Le score courant
   */
  getCurrentScore(): number {
    return this.currentScore;
  }

  /**
   * Ajoute un score élevé et l'enregistre s'il est valide.
   * @param name Nom du joueur
   */
  addHighScore(name: string): void {
    const score = this.getCurrentScore();
    if (this.saveScore(name, score)) {
      console.log(`Score de ${name} sauvegardé avec succès : ${score}`);
    } else {
      console.log(`Le score de ${name} n'est pas un high score.`);
    }
  }
}
