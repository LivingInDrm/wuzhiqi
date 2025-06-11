import * as config from './config.js';
import { Renderer } from './renderer.js';
import { AI } from './ai.js';

export class Gomoku {
    constructor() {
        console.log('开始初始化五子棋游戏...');
        
        try {
            // 获取DOM元素
            this.canvas = document.getElementById('gameCanvas');
            this.currentPlayerSpan = document.getElementById('currentPlayer');
            this.gameStatusSpan = document.getElementById('gameStatus');
            this.resetBtn = document.getElementById('resetBtn');
            this.undoBtn = document.getElementById('undoBtn');
            this.difficultyButtons = document.querySelectorAll('.difficulty-btn');
            this.currentDifficultySpan = document.getElementById('currentDifficulty');
            this.firstPlayerInfoSpan = document.getElementById('firstPlayerInfo');
            
            // 初始化AI定时器ID，用于清理
            this.aiTimerId = null;

            console.log('DOM元素获取成功', {
                canvas: !!this.canvas,
                currentPlayerSpan: !!this.currentPlayerSpan,
                gameStatusSpan: !!this.gameStatusSpan,
                firstPlayerInfoSpan: !!this.firstPlayerInfoSpan
            });

            // 初始化渲染器
            this.renderer = new Renderer(this.canvas);
            console.log('渲染器初始化成功');
            
            // 初始化游戏状态（第一次初始化，设置默认难度）
            this.init(true);
            
            // 最后初始化AI（确保游戏状态已就绪）
            this.ai = new AI(this);
            console.log('AI初始化成功');
            
            console.log('五子棋游戏初始化完成');
        } catch (error) {
            console.error('游戏初始化失败:', error);
            throw error;
        }
    }
    
    init(isFirstInit = false) {
        console.log('初始化游戏状态...');
        
        this.board = Array(config.BOARD_SIZE).fill(0).map(() => Array(config.BOARD_SIZE).fill(0));
        this.gameOver = false;
        this.moveHistory = [];
        this.isAIThinking = false;
        this.winInfo = null;

        // 随机决定先手方：1=用户执黑先手，2=AI执黑先手
        this.randomizeFirstPlayer();

        // 只在第一次初始化时设置默认难度
        if (isFirstInit) {
            this.difficulty = 'simple';
        }
        // 重新开始时保持当前难度设置

        this.bindEvents();
        this.updateUI();
        
        if (this.renderer) {
            this.renderer.drawBoard(this.board);
        }
        
        // 立即更新先手信息
        this.updateFirstPlayerDisplay();
        
        // 如果AI先手，启动AI思考
        if (this.currentPlayer === this.aiPlayer) {
            this.triggerAIMove();
        }
        
        console.log('游戏状态初始化完成', { 
            difficulty: this.difficulty,
            isFirstInit,
            humanPlayer: this.humanPlayer,
            aiPlayer: this.aiPlayer,
            currentPlayer: this.currentPlayer,
            firstMover: this.currentPlayer === this.humanPlayer ? '用户先手' : 'AI先手'
        });
    }
    
    bindEvents() {
        this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
        this.canvas.addEventListener('mousemove', this.handleCanvasMousemove.bind(this));
        this.canvas.addEventListener('mouseleave', () => this.renderer.drawBoard(this.board));
        
        this.resetBtn.addEventListener('click', () => this.resetGame());
        this.undoBtn.addEventListener('click', () => this.undoMove());
        
        this.difficultyButtons.forEach(button => {
            button.addEventListener('click', () => this.changeDifficulty(button.dataset.difficulty));
        });
    }

    handleCanvasClick(e) {
        if (this.gameOver || this.isAIThinking || this.currentPlayer !== this.humanPlayer) return;

        const { row, col } = this.getBoardCoordinates(e);
        
        if (this.isValidMove(row, col)) {
            this.makeMove(row, col);
        }
    }

    handleCanvasMousemove(e) {
        if (this.gameOver || this.isAIThinking || this.currentPlayer !== this.humanPlayer) return;
        
        const { row, col } = this.getBoardCoordinates(e);

        this.renderer.drawBoard(this.board);
        if (this.isValidMove(row, col)) {
            this.renderer.showPreview(row, col, this.currentPlayer);
        }
    }

    getBoardCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const col = Math.round((x - config.OFFSET) / config.CELL_SIZE);
        const row = Math.round((y - config.OFFSET) / config.CELL_SIZE);
        return { row, col };
    }
    
    isValidPosition(row, col) {
        return row >= 0 && row < config.BOARD_SIZE &&
               col >= 0 && col < config.BOARD_SIZE;
    }

    isValidMove(row, col) {
        return this.isValidPosition(row, col) && this.board[row][col] === 0;
    }
    
    makeMove(row, col) {
        this.board[row][col] = this.currentPlayer;
        this.moveHistory.push({row, col, player: this.currentPlayer});
        
        this.renderer.drawBoard(this.board);

        if (this.checkWin(row, col, this.currentPlayer)) {
            this.endGame(false);
        } else if (this.isBoardFull()) {
            this.endGame(true);
        } else {
            this.switchPlayer();
        }
        
        this.updateUI();
    }

    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        if (this.currentPlayer === this.aiPlayer) {
            this.triggerAIMove();
        }
    }

    endGame(isDraw) {
        this.gameOver = true;
        
        // 清理AI定时器
        this.clearAITimer();
        
        if (isDraw) {
            this.gameStatusSpan.textContent = '平局！';
            this.gameStatusSpan.style.color = '#f39c12';
        } else {
            const isHumanWin = this.currentPlayer === this.humanPlayer;
            this.gameStatusSpan.textContent = isHumanWin ? '恭喜您获胜！' : 'AI获胜！';
            this.gameStatusSpan.style.color = '#e74c3c';
            this.canvas.classList.add('win-animation');
            this.renderer.drawWinLine(this.winInfo);
        }
        this.updateUI();
    }

    checkWin(row, col, player) {
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        
        for (let [dx, dy] of directions) {
            let count = 1;
            let line = [{row, col}];
            
            for (let i = 1; i < 5; i++) {
                const newRow = row + dx * i, newCol = col + dy * i;
                if (this.isValidPosition(newRow, newCol) && this.board[newRow][newCol] === player) {
                    count++;
                    line.push({row: newRow, col: newCol});
                } else break;
            }
            
            for (let i = 1; i < 5; i++) {
                const newRow = row - dx * i, newCol = col - dy * i;
                if (this.isValidPosition(newRow, newCol) && this.board[newRow][newCol] === player) {
                    count++;
                    line.push({row: newRow, col: newCol});
                } else break;
            }
            
            if (count >= 5) {
                line.sort((a,b) => a.row === b.row ? a.col - b.col : a.row - b.row);
                this.winInfo = { start: line[0], end: line[line.length - 1] };
                return true;
            }
        }
        return false;
    }
    
    isBoardFull() {
        return this.board.every(row => row.every(cell => cell !== 0));
    }
    
    undoMove() {
        if (this.moveHistory.length === 0 || this.gameOver || this.isAIThinking) return;
        
        // 清理AI定时器
        this.clearAITimer();
        
        // 判断撤销逻辑：
        // 1. 如果当前轮到用户，说明最后一步是AI走的，需要撤销AI+用户两步
        // 2. 如果当前轮到AI，说明最后一步是用户走的，只撤销用户一步
        let stepsToUndo = 1; // 默认撤销1步（用户的步骤）
        
        if (this.currentPlayer === this.humanPlayer && this.moveHistory.length >= 2) {
            // 当前轮到用户，说明AI刚走完，需要撤销AI这步和之前用户的那步
            stepsToUndo = 2;
        }
        
        console.log(`🔄 悔棋操作: 当前玩家=${this.currentPlayer}, 用户=${this.humanPlayer}, 撤销${stepsToUndo}步`);

        for (let i = 0; i < stepsToUndo; i++) {
            const lastMove = this.moveHistory.pop();
            if(lastMove) {
               this.board[lastMove.row][lastMove.col] = 0;
               console.log(`↩️ 撤销第${i+1}步: (${lastMove.row}, ${lastMove.col})`);
            }
        }
        
        // 撤销后，确保轮到用户
        this.currentPlayer = this.humanPlayer;
        this.gameOver = false;
        this.winInfo = null;
        this.canvas.classList.remove('win-animation');
        this.renderer.drawBoard(this.board);
        this.updateUI();
        this.gameStatusSpan.textContent = '游戏进行中';
        this.gameStatusSpan.style.color = '#27ae60';
    }
    
    resetGame() {
        console.log('🔄 重新开始游戏，保持当前难度:', this.difficulty);
        
        // 清理之前的AI定时器，防止在新棋盘上落子
        this.clearAITimer();
        
        // 传入false表示不是第一次初始化，保持当前难度设置
        this.init(false);
        
        this.gameStatusSpan.textContent = '游戏进行中';
        this.gameStatusSpan.style.color = '#27ae60';
        this.canvas.classList.remove('win-animation');
        
        // 确保UI显示正确的难度
        this.updateDifficultyDisplay();
        
        // 确保先手信息正确显示
        this.updateFirstPlayerDisplay();
    }
    
    changeDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.updateDifficultyDisplay();

        if (this.moveHistory.length > 0 && !this.gameOver) {
            if (confirm('改变难度后建议重新开始游戏，是否重新开始？')) {
                this.resetGame();
            }
        }
        console.log(`🎯 AI难度已切换到: ${config.DIFFICULTY_LEVELS[this.difficulty]}`);
    }
    
    updateDifficultyDisplay() {
        // 更新按钮激活状态
        this.difficultyButtons.forEach(btn => btn.classList.remove('active'));
        const activeButton = document.querySelector(`[data-difficulty="${this.difficulty}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
        
        // 更新难度显示文本
        this.currentDifficultySpan.textContent = config.DIFFICULTY_LEVELS[this.difficulty];
        
        console.log('📊 UI难度显示已更新:', {
            difficulty: this.difficulty,
            displayText: config.DIFFICULTY_LEVELS[this.difficulty]
        });
    }

    updateUI() {
        if (this.isAIThinking) {
            this.currentPlayerSpan.textContent = 'AI思考中...';
            this.currentPlayerSpan.style.color = '#e67e22';
        } else {
            const isHumanTurn = this.currentPlayer === this.humanPlayer;
            const playerColor = this.humanPlayer === 1 ? '黑' : '白';
            const aiColor = this.aiPlayer === 1 ? '黑' : '白';
            
            this.currentPlayerSpan.textContent = isHumanTurn 
                ? `您的回合 (${playerColor}子)` 
                : `AI回合 (${aiColor}子)`;
            this.currentPlayerSpan.style.color = isHumanTurn ? '#2c3e50' : '#e67e22';
        }
        this.undoBtn.disabled = this.moveHistory.length === 0 || this.isAIThinking;
    }

    // =============== 新增功能：随机先手系统 ===============
    
    /**
     * 随机决定谁先手（执黑）
     * 1 = 黑子，2 = 白子
     */
    randomizeFirstPlayer() {
        const isHumanFirst = Math.random() < 0.5; // 50% 概率
        
        if (isHumanFirst) {
            // 用户先手执黑
            this.humanPlayer = 1; // 黑子
            this.aiPlayer = 2;    // 白子
            this.currentPlayer = 1;
            console.log('🎯 随机先手结果: 用户执黑先手');
        } else {
            // AI先手执黑
            this.humanPlayer = 2; // 白子
            this.aiPlayer = 1;    // 黑子
            this.currentPlayer = 1; // AI先行
            console.log('🎯 随机先手结果: AI执黑先手');
        }
    }
    
    /**
     * 触发AI思考和落子
     */
    triggerAIMove() {
        // 清理之前的定时器
        this.clearAITimer();
        
        this.isAIThinking = true;
        this.updateUI();
        
        // 设置新的定时器并保存ID
        this.aiTimerId = setTimeout(() => {
            // 确保游戏还在进行且轮到AI
            if (!this.gameOver && this.currentPlayer === this.aiPlayer && this.isAIThinking) {
                const move = this.ai.getMove(this.difficulty);
                if (move) {
                    this.makeMove(move.row, move.col);
                }
            }
            this.isAIThinking = false;
            this.updateUI();
            this.aiTimerId = null; // 清空定时器ID
        }, config.AI_THINKING_TIME);
    }
    
    /**
     * 清理AI定时器
     */
    clearAITimer() {
        if (this.aiTimerId) {
            clearTimeout(this.aiTimerId);
            this.aiTimerId = null;
            console.log('🧹 已清理AI定时器');
        }
    }
    
    /**
     * 更新先手信息显示
     */
    updateFirstPlayerDisplay() {
        console.log('🔍 开始更新先手信息显示');
        
        // 确保游戏状态已正确初始化
        if (typeof this.humanPlayer === 'undefined' || typeof this.aiPlayer === 'undefined') {
            console.error('❌ 游戏状态未正确初始化');
            return;
        }
        
        // 每次都重新获取元素，确保获取到最新的
        const firstPlayerInfoElement = document.getElementById('firstPlayerInfo');
        
        if (!firstPlayerInfoElement) {
            console.error('❌ 找不到firstPlayerInfo元素');
            return;
        }
        
        console.log('✅ 找到firstPlayerInfo元素');
        
        // 生成显示文本
        const isHumanFirst = this.humanPlayer === 1;
        const firstPlayerText = isHumanFirst ? '您执黑先手' : 'AI执黑先手';
        const colorText = isHumanFirst ? '您(黑) vs AI(白)' : 'AI(黑) vs 您(白)';
        const displayText = `${firstPlayerText} - ${colorText}`;
        
        // 更新显示
        firstPlayerInfoElement.textContent = displayText;
        firstPlayerInfoElement.style.fontWeight = 'bold';
        firstPlayerInfoElement.style.color = isHumanFirst ? '#2c3e50' : '#e67e22';
        
        console.log('✅ 先手信息更新完成:', {
            humanPlayer: this.humanPlayer,
            aiPlayer: this.aiPlayer,
            isHumanFirst: isHumanFirst,
            displayText: displayText
        });
        
        // 更新缓存的引用
        this.firstPlayerInfoSpan = firstPlayerInfoElement;
    }
} 