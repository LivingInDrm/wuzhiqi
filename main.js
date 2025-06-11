import { Gomoku } from './src/game.js';
import * as config from './src/config.js';

document.addEventListener('DOMContentLoaded', () => {
    const game = new Gomoku();
    
    // 添加键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R') {
            game.resetGame();
        } else if (e.key === 'u' || e.key === 'U') {
            game.undoMove();
        }
    });
    
    // 添加触摸支持
    let touchStartX, touchStartY;
    
    game.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = game.canvas.getBoundingClientRect();
        touchStartX = touch.clientX - rect.left;
        touchStartY = touch.clientY - rect.top;
    }, { passive: false });
    
    game.canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (game.gameOver || game.isAIThinking || game.currentPlayer !== game.humanPlayer) return;
        
        const col = Math.round((touchStartX - config.OFFSET) / config.CELL_SIZE);
        const row = Math.round((touchStartY - config.OFFSET) / config.CELL_SIZE);
        
        if (game.isValidMove(row, col)) {
            game.makeMove(row, col);
        }
    }, { passive: false });
}); 