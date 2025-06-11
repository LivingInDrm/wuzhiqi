/**
 * 在线对战WebSocket客户端
 * 处理与后端的实时通信
 */

class OnlineClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.gameInfo = null;
        this.callbacks = {
            onQueueJoined: null,
            onGameStart: null,
            onOpponentMove: null,
            onGameEnd: null,
            onOpponentDisconnected: null,
            onError: null,
            onConnected: null,
            onDisconnected: null
        };
    }

    /**
     * 连接到服务器
     * @param {string} token - JWT认证令牌
     */
    connect(token) {
        return new Promise((resolve, reject) => {
            try {
                // 引入socket.io客户端
                if (typeof io === 'undefined') {
                    throw new Error('Socket.IO客户端库未加载');
                }

                this.socket = io('http://localhost:3000', {
                    auth: {
                        token: token
                    },
                    transports: ['websocket', 'polling']
                });

                // 连接成功
                this.socket.on('connect', () => {
                    console.log('🔗 已连接到游戏服务器');
                    this.isConnected = true;
                    if (this.callbacks.onConnected) {
                        this.callbacks.onConnected();
                    }
                    resolve();
                });

                // 连接失败
                this.socket.on('connect_error', (error) => {
                    console.error('❌ 连接服务器失败:', error.message);
                    this.isConnected = false;
                    if (this.callbacks.onError) {
                        this.callbacks.onError(`连接失败: ${error.message}`);
                    }
                    reject(error);
                });

                // 断开连接
                this.socket.on('disconnect', (reason) => {
                    console.log('🔌 与服务器断开连接:', reason);
                    this.isConnected = false;
                    this.gameInfo = null;
                    if (this.callbacks.onDisconnected) {
                        this.callbacks.onDisconnected(reason);
                    }
                });

                // 设置事件监听器
                this.setupEventListeners();

            } catch (error) {
                console.error('❌ 初始化连接失败:', error);
                reject(error);
            }
        });
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        if (!this.socket) return;

        // 加入队列成功
        this.socket.on('queueJoined', (data) => {
            console.log('🎯 已加入匹配队列:', data);
            if (this.callbacks.onQueueJoined) {
                this.callbacks.onQueueJoined(data);
            }
        });

        // 游戏开始
        this.socket.on('gameStart', (data) => {
            console.log('🎮 游戏开始:', data);
            this.gameInfo = {
                gameId: data.gameId,
                opponent: data.opponent,
                yourPiece: data.yourPiece,
                isYourTurn: data.isYourTurn
            };
            if (this.callbacks.onGameStart) {
                this.callbacks.onGameStart(data);
            }
        });

        // 对手移动
        this.socket.on('opponentMove', (data) => {
            console.log('👥 对手移动:', data);
            if (this.callbacks.onOpponentMove) {
                this.callbacks.onOpponentMove(data);
            }
        });

        // 游戏结束
        this.socket.on('gameEnd', (data) => {
            console.log('🏁 游戏结束:', data);
            this.gameInfo = null;
            if (this.callbacks.onGameEnd) {
                this.callbacks.onGameEnd(data);
            }
        });

        // 对手断线
        this.socket.on('opponentDisconnected', (data) => {
            console.log('🔌 对手断线:', data);
            this.gameInfo = null;
            if (this.callbacks.onOpponentDisconnected) {
                this.callbacks.onOpponentDisconnected(data);
            }
        });

        // 错误处理
        this.socket.on('error', (data) => {
            console.error('❌ 服务器错误:', data);
            if (this.callbacks.onError) {
                this.callbacks.onError(data.message);
            }
        });

        // 离开队列响应
        this.socket.on('queueLeft', (data) => {
            console.log('↩️ 已离开匹配队列:', data);
        });

        // 重新匹配响应
        this.socket.on('rematchResponse', (data) => {
            console.log('🔄 重新匹配响应:', data);
        });
    }

    /**
     * 加入匹配队列
     */
    joinQueue() {
        if (!this.isConnected) {
            throw new Error('未连接到服务器');
        }
        console.log('🎯 请求加入匹配队列...');
        this.socket.emit('joinQueue');
    }

    /**
     * 离开匹配队列
     */
    leaveQueue() {
        if (!this.isConnected) {
            throw new Error('未连接到服务器');
        }
        console.log('↩️ 请求离开匹配队列...');
        this.socket.emit('leaveQueue');
    }

    /**
     * 发送落子操作
     * @param {number} row - 行坐标
     * @param {number} col - 列坐标
     */
    makeMove(row, col) {
        if (!this.isConnected) {
            throw new Error('未连接到服务器');
        }
        if (!this.gameInfo) {
            throw new Error('当前没有进行中的游戏');
        }
        console.log(`📝 发送落子: (${row}, ${col})`);
        this.socket.emit('makeMove', { row, col });
    }

    /**
     * 投降
     */
    surrender() {
        if (!this.isConnected) {
            throw new Error('未连接到服务器');
        }
        if (!this.gameInfo) {
            throw new Error('当前没有进行中的游戏');
        }
        console.log('🏳️ 请求投降...');
        this.socket.emit('surrender');
    }

    /**
     * 请求重新开始
     */
    requestRematch() {
        if (!this.isConnected) {
            throw new Error('未连接到服务器');
        }
        console.log('🔄 请求重新匹配...');
        this.socket.emit('requestRematch');
    }

    /**
     * 断开连接
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.gameInfo = null;
        console.log('🔌 已断开连接');
    }

    /**
     * 设置回调函数
     * @param {Object} callbacks - 回调函数对象
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * 获取连接状态
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            hasActiveGame: !!this.gameInfo,
            gameInfo: this.gameInfo
        };
    }

    /**
     * 获取系统状态（调试用）
     */
    getSystemStatus() {
        if (!this.isConnected) {
            throw new Error('未连接到服务器');
        }
        this.socket.emit('getStatus');
        
        return new Promise((resolve) => {
            this.socket.once('systemStatus', (status) => {
                resolve(status);
            });
        });
    }
}

// 导出单例
const onlineClient = new OnlineClient();
export default onlineClient;