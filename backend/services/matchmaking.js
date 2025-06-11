/**
 * 在线对战匹配服务
 * 实现简单的先进先出匹配队列
 */

class MatchmakingService {
    constructor() {
        this.waitingQueue = [];  // 等待匹配的玩家队列
        this.activeGames = new Map();  // 活跃游戏记录 gameId -> gameInfo
        this.playerGameMap = new Map();  // 玩家到游戏的映射 socketId -> gameId
    }

    /**
     * 添加玩家到匹配队列
     * @param {Object} socket - Socket.IO连接对象
     * @param {Object} userInfo - 用户信息 {userId, username}
     */
    joinQueue(socket, userInfo) {
        const player = {
            socketId: socket.id,
            socket: socket,
            userId: userInfo.userId,
            username: userInfo.username,
            joinTime: Date.now()
        };

        this.waitingQueue.push(player);
        console.log(`🎯 玩家 ${userInfo.username} 加入匹配队列，当前队列长度: ${this.waitingQueue.length}`);

        // 尝试匹配
        this.tryMatch();

        return {
            success: true,
            message: '已加入匹配队列',
            queuePosition: this.waitingQueue.length
        };
    }

    /**
     * 移除玩家从匹配队列
     * @param {string} socketId - Socket连接ID
     */
    leaveQueue(socketId) {
        const index = this.waitingQueue.findIndex(player => player.socketId === socketId);
        if (index !== -1) {
            const player = this.waitingQueue.splice(index, 1)[0];
            console.log(`❌ 玩家 ${player.username} 离开匹配队列`);
            return true;
        }
        return false;
    }

    /**
     * 尝试匹配玩家
     */
    tryMatch() {
        while (this.waitingQueue.length >= 2) {
            const player1 = this.waitingQueue.shift();
            const player2 = this.waitingQueue.shift();

            // 创建游戏
            const gameId = this.createGame(player1, player2);
            
            console.log(`🎮 匹配成功! ${player1.username} vs ${player2.username} (游戏ID: ${gameId})`);
        }
    }

    /**
     * 创建新游戏
     * @param {Object} player1 - 玩家1
     * @param {Object} player2 - 玩家2
     * @returns {string} - 游戏ID
     */
    createGame(player1, player2) {
        const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const gameInfo = {
            gameId,
            player1: {
                socketId: player1.socketId,
                socket: player1.socket,
                userId: player1.userId,
                username: player1.username,
                piece: 'black'  // 黑子先手
            },
            player2: {
                socketId: player2.socketId,
                socket: player2.socket,
                userId: player2.userId,
                username: player2.username,
                piece: 'white'  // 白子后手
            },
            board: Array(15).fill().map(() => Array(15).fill(0)), // 15x15棋盘，0=空，1=黑，2=白
            currentPlayer: 'black',  // 当前应该落子的玩家
            startTime: Date.now(),
            lastMoveTime: Date.now(),
            status: 'playing'  // playing, finished, abandoned
        };

        this.activeGames.set(gameId, gameInfo);
        this.playerGameMap.set(player1.socketId, gameId);
        this.playerGameMap.set(player2.socketId, gameId);

        // 通知双方玩家游戏开始
        player1.socket.emit('gameStart', {
            gameId,
            opponent: { username: player2.username },
            yourPiece: 'black',
            isYourTurn: true
        });

        player2.socket.emit('gameStart', {
            gameId,
            opponent: { username: player1.username },
            yourPiece: 'white',
            isYourTurn: false
        });

        return gameId;
    }

    /**
     * 获取玩家的游戏信息
     * @param {string} socketId - Socket连接ID
     * @returns {Object|null} - 游戏信息
     */
    getPlayerGame(socketId) {
        const gameId = this.playerGameMap.get(socketId);
        return gameId ? this.activeGames.get(gameId) : null;
    }

    /**
     * 结束游戏
     * @param {string} gameId - 游戏ID
     * @param {string} result - 游戏结果 ('win', 'draw', 'abandon')
     * @param {string} winner - 获胜者 ('black', 'white', null)
     */
    endGame(gameId, result, winner = null) {
        const gameInfo = this.activeGames.get(gameId);
        if (!gameInfo) return false;

        gameInfo.status = 'finished';
        gameInfo.result = result;
        gameInfo.winner = winner;
        gameInfo.endTime = Date.now();

        // 通知双方玩家游戏结束
        const endData = { result, winner, gameId };
        gameInfo.player1.socket.emit('gameEnd', endData);
        gameInfo.player2.socket.emit('gameEnd', endData);

        // 清理资源
        this.playerGameMap.delete(gameInfo.player1.socketId);
        this.playerGameMap.delete(gameInfo.player2.socketId);
        this.activeGames.delete(gameId);

        console.log(`🏁 游戏结束: ${gameId}, 结果: ${result}, 获胜者: ${winner}`);
        return true;
    }

    /**
     * 处理玩家断线
     * @param {string} socketId - 断线的Socket ID
     */
    handleDisconnect(socketId) {
        // 从匹配队列中移除
        this.leaveQueue(socketId);

        // 处理游戏中的断线
        const gameInfo = this.getPlayerGame(socketId);
        if (gameInfo) {
            const disconnectedPlayer = gameInfo.player1.socketId === socketId ? gameInfo.player1 : gameInfo.player2;
            const otherPlayer = gameInfo.player1.socketId === socketId ? gameInfo.player2 : gameInfo.player1;

            console.log(`🔌 玩家 ${disconnectedPlayer.username} 断线，游戏 ${gameInfo.gameId} 结束`);
            
            // 通知另一个玩家
            otherPlayer.socket.emit('opponentDisconnected', {
                message: '对手已断线，您获得胜利'
            });

            // 结束游戏
            this.endGame(gameInfo.gameId, 'abandon', otherPlayer.piece);
        }
    }

    /**
     * 获取系统状态
     */
    getStatus() {
        return {
            waitingPlayers: this.waitingQueue.length,
            activeGames: this.activeGames.size,
            totalConnections: this.playerGameMap.size
        };
    }
}

export default new MatchmakingService();