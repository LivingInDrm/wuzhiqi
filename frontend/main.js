import { Gomoku } from './src/game.js';
import * as config from './src/config.js';
import onlineUIManager from './src/online-ui-manager.js';
import onlineClient from './src/online-client.js';

document.addEventListener('DOMContentLoaded', () => {
    const game = new Gomoku();
    
    // 暴露到全局作用域用于调试
    window.game = game;
    window.onlineUIManager = onlineUIManager;
    window.onlineClient = onlineClient;
    
    // 初始化在线UI管理器
    onlineUIManager.init();
    
    // 设置在线UI管理器回调
    onlineUIManager.setCallbacks({
        onModeChange: (mode) => {
            console.log(`模式切换到: ${mode}`);
            // 模式切换时重置游戏
            if (mode === 'ai') {
                game.setGameMode('ai');
                game.resetGame();
            } else {
                game.setGameMode('online');
                game.resetGame();
            }
        },
        onGameStart: (data) => {
            console.log('在线游戏开始:', data);
            // 开始在线游戏
            game.startOnlineGame(data);
        },
        onGameEnd: (data) => {
            console.log('在线游戏结束:', data);
            game.handleOnlineGameEnd(data);
        },
        onOpponentMove: (data) => {
            // 如果游戏结束，让onlineUIManager处理
            if (data.gameOver) return;
            
            // 否则通知游戏处理对手移动
            game.handleOpponentMove(data);
        }
    });
    
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