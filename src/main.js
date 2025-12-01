import { GameManager } from './game/GameManager';

window.addEventListener('DOMContentLoaded', () => {
    const game = new GameManager();
    game.start();
});
