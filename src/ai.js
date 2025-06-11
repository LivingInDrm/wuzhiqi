import { BOARD_SIZE } from './config.js';
import { AdvancedAI } from './advanced-ai.js';

export class AI {
    constructor(gameLogic) {
        console.log('开始初始化AI...');
        
        if (!gameLogic) {
            throw new Error('游戏逻辑实例不能为空');
        }
        
        if (!gameLogic.board) {
            throw new Error('游戏棋盘不存在');
        }
        
        this.game = gameLogic; // 引用game实例以访问board和checkWin等方法
        this.board = this.game.board;
        
        // 初始化不同难度的AI实例缓存
        this.aiInstances = new Map();
        
        console.log('AI初始化完成', {
            boardSize: BOARD_SIZE,
            gameBoard: this.board.length,
            aiInstancesInitialized: 'Map created'
        });
    }

    // =================AI难度系统=================
    
    // 根据难度分发AI算法
    getMove(difficulty) {
        this.board = this.game.board; // Sync board state
        switch (difficulty) {
            case 'simple':
                return this.getBeginnerMove();
            case 'beginner':
                return this.getBeginnerMove();
            case 'advanced':
                return this.getAdvancedMove();
            case 'professional':
                return this.getProfessionalMove();
            default:
                return this.getBeginnerMove();
        }
    }
    
    // 入门难度 - 使用AdvancedAI的入门级配置
    getBeginnerMove() {
        console.log('🎯 切换到入门级AI算法...');
        const beginnerAI = this.getAIInstance('beginner');
        return beginnerAI.getAdvancedMove();
    }
    
    // 获取或创建指定难度的AI实例
    getAIInstance(difficulty) {
        if (!this.aiInstances.has(difficulty)) {
            console.log(`🧠 创建${difficulty}难度AI实例...`);
            this.aiInstances.set(difficulty, new AdvancedAI(this.game, difficulty));
        }
        return this.aiInstances.get(difficulty);
    }
    
    // 进阶难度 - 复杂威胁模式识别
    getAdvancedMove() {
        console.log('🎯 切换到进阶AI算法...');
        const advancedAI = this.getAIInstance('advanced');
        return advancedAI.getAdvancedMove();
    }
    
    // 专业难度 - 使用专业级配置
    getProfessionalMove() {
        console.log('🎯 切换到专业级AI算法...');
        const professionalAI = this.getAIInstance('professional');
        return professionalAI.getAdvancedMove();
    }

    // =================保留基础工具函数=================
    
    isValidPosition(row, col) {
        return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
    }
    
    // 查找获胜走法 - 保留此基础工具函数供调试使用
    findWinningMove(player) {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.board[row][col] === 0) {
                    this.board[row][col] = player;
                    if (this.game.checkWin(row, col, player)) {
                        this.board[row][col] = 0;
                        return {row, col};
                    }
                    this.board[row][col] = 0;
                }
            }
        }
        return null;
    }
} 