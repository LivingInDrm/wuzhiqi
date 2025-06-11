/**
 * 在线对战UI管理器
 * 管理模式切换和在线对战界面状态
 */

import onlineClient from './online-client.js';
import { authManager } from './auth-manager.js';

class OnlineUIManager {
    constructor() {
        this.currentMode = 'ai'; // 'ai' 或 'online'
        this.isMatchmaking = false;
        this.isInGame = false;
        this.elements = {};
        this.callbacks = {
            onModeChange: null,
            onGameStart: null,
            onGameEnd: null
        };
    }

    /**
     * 初始化UI管理器
     */
    init() {
        this.bindElements();
        this.bindEvents();
        this.setupOnlineClientCallbacks();
        this.updateModeDisplay();
    }

    /**
     * 绑定DOM元素
     */
    bindElements() {
        // 模式选择器
        this.elements.modeButtons = document.querySelectorAll('.mode-btn');
        this.elements.difficultySelector = document.getElementById('difficultySelector');
        this.elements.onlinePanel = document.getElementById('onlinePanel');

        // 在线面板元素
        this.elements.connectionStatus = document.getElementById('connectionStatus');
        this.elements.matchStatus = document.getElementById('matchStatus');
        this.elements.startMatchBtn = document.getElementById('startMatchBtn');
        this.elements.cancelMatchBtn = document.getElementById('cancelMatchBtn');
        this.elements.surrenderBtn = document.getElementById('surrenderBtn');
        this.elements.opponentInfo = document.getElementById('opponentInfo');
        this.elements.opponentName = document.getElementById('opponentName');

        // 游戏信息元素
        this.elements.currentPlayer = document.getElementById('currentPlayer');
        this.elements.gameStatus = document.getElementById('gameStatus');
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 模式切换
        this.elements.modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.switchMode(mode);
            });
        });

        // 在线面板按钮事件
        this.elements.startMatchBtn.addEventListener('click', () => {
            this.startMatching();
        });

        this.elements.cancelMatchBtn.addEventListener('click', () => {
            this.cancelMatching();
        });

        this.elements.surrenderBtn.addEventListener('click', () => {
            this.surrender();
        });
    }

    /**
     * 设置在线客户端回调
     */
    setupOnlineClientCallbacks() {
        onlineClient.setCallbacks({
            onConnected: () => {
                this.updateConnectionStatus('已连接', 'success');
                this.updateMatchStatus('准备就绪，点击开始匹配');
                this.elements.startMatchBtn.disabled = false;
            },
            onDisconnected: (reason) => {
                this.updateConnectionStatus('连接断开', 'error');
                this.updateMatchStatus(`连接断开: ${reason}`);
                this.resetOnlineState();
            },
            onQueueJoined: (data) => {
                this.isMatchmaking = true;
                this.updateMatchStatus(`匹配中... 队列位置: ${data.queuePosition || '未知'}`);
                this.elements.startMatchBtn.style.display = 'none';
                this.elements.cancelMatchBtn.style.display = 'inline-block';
            },
            onGameStart: (data) => {
                this.isMatchmaking = false;
                this.isInGame = true;
                this.updateMatchStatus('游戏开始！');
                this.showOpponentInfo(data.opponent.username);
                this.elements.cancelMatchBtn.style.display = 'none';
                this.elements.surrenderBtn.style.display = 'inline-block';
                
                // 更新游戏状态显示
                const yourPiece = data.yourPiece === 'black' ? '黑子' : '白子';
                this.elements.currentPlayer.textContent = `您执${yourPiece}`;
                this.elements.gameStatus.textContent = data.isYourTurn ? '轮到您' : '等待对手';

                if (this.callbacks.onGameStart) {
                    this.callbacks.onGameStart(data);
                }
            },
            onOpponentMove: (data) => {
                if (data.gameOver) {
                    this.handleGameEnd(data);
                } else {
                    // 更新回合显示
                    this.elements.gameStatus.textContent = '轮到您';
                }
            },
            onGameEnd: (data) => {
                this.handleGameEnd(data);
            },
            onOpponentDisconnected: (data) => {
                this.updateMatchStatus('对手断线，您获得胜利！');
                this.handleGameEnd({ result: 'win', winner: 'you' });
            },
            onError: (message) => {
                this.updateMatchStatus(`错误: ${message}`, 'error');
                console.error('在线客户端错误:', message);
            }
        });
    }

    /**
     * 切换游戏模式
     * @param {string} mode - 'ai' 或 'online'
     */
    switchMode(mode) {
        if (this.currentMode === mode) return;

        // 如果正在在线游戏中，先确认
        if (this.currentMode === 'online' && (this.isMatchmaking || this.isInGame)) {
            if (!confirm('切换模式将退出当前在线游戏，确认吗？')) {
                return;
            }
            this.disconnectFromOnline();
        }

        this.currentMode = mode;
        this.updateModeDisplay();

        // 通知外部模式变化
        if (this.callbacks.onModeChange) {
            this.callbacks.onModeChange(mode);
        }
    }

    /**
     * 更新模式显示
     */
    updateModeDisplay() {
        // 更新按钮状态
        this.elements.modeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === this.currentMode);
        });

        // 显示/隐藏相应面板
        if (this.currentMode === 'ai') {
            this.elements.difficultySelector.style.display = 'block';
            this.elements.onlinePanel.style.display = 'none';
        } else {
            this.elements.difficultySelector.style.display = 'none';
            this.elements.onlinePanel.style.display = 'block';
            this.connectToOnline();
        }
    }

    /**
     * 连接到在线服务器
     */
    async connectToOnline() {
        try {
            this.updateConnectionStatus('连接中...', 'connecting');
            
            // 确保用户已登录
            if (!authManager.isLoggedIn()) {
                this.updateConnectionStatus('需要登录', 'error');
                this.updateMatchStatus('请先登录后再使用在线对战功能');
                return;
            }

            const token = authManager.getToken();
            await onlineClient.connect(token);
            
        } catch (error) {
            this.updateConnectionStatus('连接失败', 'error');
            this.updateMatchStatus(`连接失败: ${error.message}`);
            console.error('连接在线服务器失败:', error);
        }
    }

    /**
     * 断开在线连接
     */
    disconnectFromOnline() {
        onlineClient.disconnect();
        this.resetOnlineState();
    }

    /**
     * 开始匹配
     */
    startMatching() {
        try {
            onlineClient.joinQueue();
        } catch (error) {
            this.updateMatchStatus(`开始匹配失败: ${error.message}`, 'error');
        }
    }

    /**
     * 取消匹配
     */
    cancelMatching() {
        try {
            onlineClient.leaveQueue();
            this.isMatchmaking = false;
            this.updateMatchStatus('已取消匹配');
            this.elements.startMatchBtn.style.display = 'inline-block';
            this.elements.cancelMatchBtn.style.display = 'none';
        } catch (error) {
            this.updateMatchStatus(`取消匹配失败: ${error.message}`, 'error');
        }
    }

    /**
     * 投降
     */
    surrender() {
        if (!confirm('确认要投降吗？')) return;
        
        try {
            onlineClient.surrender();
        } catch (error) {
            this.updateMatchStatus(`投降失败: ${error.message}`, 'error');
        }
    }

    /**
     * 处理游戏结束
     */
    handleGameEnd(data) {
        this.isInGame = false;
        
        let message = '游戏结束';
        if (data.result === 'win') {
            const gameInfo = onlineClient.getConnectionStatus().gameInfo;
            const isWinner = gameInfo && gameInfo.yourPiece === data.winner;
            message = isWinner ? '恭喜您获胜！' : '很遗憾，您败了';
        } else if (data.result === 'draw') {
            message = '平局';
        } else if (data.result === 'abandon' || data.result === 'surrender') {
            message = '游戏中断';
        }

        this.updateMatchStatus(message);
        this.elements.surrenderBtn.style.display = 'none';
        this.elements.startMatchBtn.style.display = 'inline-block';
        this.elements.opponentInfo.style.display = 'none';
        this.elements.gameStatus.textContent = '游戏结束';

        if (this.callbacks.onGameEnd) {
            this.callbacks.onGameEnd(data);
        }
    }

    /**
     * 重置在线状态
     */
    resetOnlineState() {
        this.isMatchmaking = false;
        this.isInGame = false;
        this.elements.startMatchBtn.style.display = 'inline-block';
        this.elements.startMatchBtn.disabled = true;
        this.elements.cancelMatchBtn.style.display = 'none';
        this.elements.surrenderBtn.style.display = 'none';
        this.elements.opponentInfo.style.display = 'none';
    }

    /**
     * 更新连接状态显示
     */
    updateConnectionStatus(text, type = 'normal') {
        this.elements.connectionStatus.textContent = text;
        this.elements.connectionStatus.className = `connection-status ${type}`;
    }

    /**
     * 更新匹配状态显示
     */
    updateMatchStatus(text, type = 'normal') {
        this.elements.matchStatus.textContent = text;
        this.elements.matchStatus.className = `match-status ${type}`;
    }

    /**
     * 显示对手信息
     */
    showOpponentInfo(opponentName) {
        this.elements.opponentName.textContent = opponentName;
        this.elements.opponentInfo.style.display = 'block';
    }

    /**
     * 设置回调函数
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * 获取当前模式
     */
    getCurrentMode() {
        return this.currentMode;
    }

    /**
     * 检查是否在线模式
     */
    isOnlineMode() {
        return this.currentMode === 'online';
    }

    /**
     * 检查是否在游戏中
     */
    isInOnlineGame() {
        return this.isInGame;
    }

    /**
     * 发送移动（由游戏逻辑调用）
     */
    sendMove(row, col) {
        if (this.isOnlineMode() && this.isInGame) {
            try {
                onlineClient.makeMove(row, col);
                this.elements.gameStatus.textContent = '等待对手';
                return true;
            } catch (error) {
                this.updateMatchStatus(`发送移动失败: ${error.message}`, 'error');
                return false;
            }
        }
        return false;
    }
}

// 导出单例
const onlineUIManager = new OnlineUIManager();
export default onlineUIManager;