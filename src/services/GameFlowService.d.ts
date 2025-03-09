declare module 'GameFlowService' {
  export function getNextGame(currentGame: string): string;
  export function isLastGame(currentGame: string): boolean;
}
