/**
 * WebSocket服务器
 * 处理在线对战的实时通信
 */

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import matchmakingService from './matchmaking.js';

const JWT_SECRET = process.env.JWT_SECRET || 'wuziqi-game-super-secret-key-for-development-only-2024';

/**
 * 初始化WebSocket服务器
 * @param {Object} httpServer - HTTP服务器实例
 */
export function initializeWebSocket(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: ["http://localhost:8080", "http://localhost:8081", "http://localhost:8082"],
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // 身份验证中间件
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.userId = decoded.userId;
            socket.username = decoded.username;
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    // 连接处理
    io.on('connection', (socket) => {
        console.log(`🔗 玩家连接: ${socket.username} (${socket.id})`);

        // 加入匹配队列
        socket.on('joinQueue', () => {
            const result = matchmakingService.joinQueue(socket, {
                userId: socket.userId,
                username: socket.username
            });
            socket.emit('queueJoined', result);
        });

        // 离开匹配队列
        socket.on('leaveQueue', () => {
            const result = matchmakingService.leaveQueue(socket.id);
            socket.emit('queueLeft', { success: result });
        });

        // 落子操作
        socket.on('makeMove', (data) => {
            handleMakeMove(socket, data);
        });

        // 请求重新开始
        socket.on('requestRematch', () => {
            handleRematchRequest(socket);
        });

        // 投降
        socket.on('surrender', () => {
            handleSurrender(socket);
        });

        // 断线处理
        socket.on('disconnect', () => {
            console.log(`🔌 玩家断线: ${socket.username} (${socket.id})`);
            matchmakingService.handleDisconnect(socket.id);
        });

        // 获取系统状态（调试用）
        socket.on('getStatus', () => {
            socket.emit('systemStatus', matchmakingService.getStatus());
        });
    });

    console.log('🚀 WebSocket服务器已启动');
    return io;
}

/**
 * 处理落子操作
 * @param {Object} socket - Socket连接
 * @param {Object} data - 落子数据 {row, col}
 */
function handleMakeMove(socket, data) {
    const gameInfo = matchmakingService.getPlayerGame(socket.id);
    if (!gameInfo) {
        socket.emit('error', { message: '游戏不存在' });
        return;
    }

    const { row, col } = data;
    const isPlayer1 = gameInfo.player1.socketId === socket.id;
    const currentPlayerPiece = isPlayer1 ? gameInfo.player1.piece : gameInfo.player2.piece;

    // 验证是否轮到该玩家
    if (gameInfo.currentPlayer !== currentPlayerPiece) {
        socket.emit('error', { message: '不是您的回合' });
        return;
    }

    // 验证坐标合法性
    if (row < 0 || row >= 15 || col < 0 || col >= 15) {
        socket.emit('error', { message: '坐标超出棋盘范围' });
        return;
    }

    // 验证位置是否为空
    if (gameInfo.board[row][col] !== 0) {
        socket.emit('error', { message: '该位置已有棋子' });
        return;
    }

    // 执行落子
    const pieceValue = currentPlayerPiece === 'black' ? 1 : 2;
    gameInfo.board[row][col] = pieceValue;
    gameInfo.lastMoveTime = Date.now();

    // 检查胜负
    const winner = checkWin(gameInfo.board, row, col, pieceValue);
    
    // 准备移动数据
    const moveData = {
        row,
        col,
        piece: currentPlayerPiece,
        player: isPlayer1 ? gameInfo.player1.username : gameInfo.player2.username
    };

    if (winner) {
        // 游戏结束
        moveData.gameOver = true;
        moveData.winner = currentPlayerPiece;
        
        // 通知双方
        gameInfo.player1.socket.emit('opponentMove', moveData);
        gameInfo.player2.socket.emit('opponentMove', moveData);

        // 结束游戏
        matchmakingService.endGame(gameInfo.gameId, 'win', currentPlayerPiece);
    } else {
        // 检查平局（棋盘满）
        const isBoardFull = gameInfo.board.every(row => row.every(cell => cell !== 0));
        if (isBoardFull) {
            moveData.gameOver = true;
            moveData.winner = null; // 平局
            
            // 通知双方
            gameInfo.player1.socket.emit('opponentMove', moveData);
            gameInfo.player2.socket.emit('opponentMove', moveData);

            // 结束游戏
            matchmakingService.endGame(gameInfo.gameId, 'draw');
        } else {
            // 游戏继续，切换回合
            gameInfo.currentPlayer = gameInfo.currentPlayer === 'black' ? 'white' : 'black';
            
            // 通知双方当前移动
            gameInfo.player1.socket.emit('opponentMove', moveData);
            gameInfo.player2.socket.emit('opponentMove', moveData);
        }
    }
}

/**
 * 检查胜负
 * @param {Array} board - 棋盘状态
 * @param {number} row - 最后落子行
 * @param {number} col - 最后落子列
 * @param {number} piece - 棋子类型 1=黑 2=白
 * @returns {boolean} - 是否获胜
 */
function checkWin(board, row, col, piece) {
    const directions = [
        [0, 1],   // 水平
        [1, 0],   // 垂直
        [1, 1],   // 主对角线
        [1, -1]   // 副对角线
    ];

    for (const [dx, dy] of directions) {
        let count = 1; // 包含当前落子

        // 向一个方向计数
        for (let i = 1; i < 5; i++) {
            const newRow = row + dx * i;
            const newCol = col + dy * i;
            if (newRow >= 0 && newRow < 15 && newCol >= 0 && newCol < 15 && board[newRow][newCol] === piece) {
                count++;
            } else {
                break;
            }
        }

        // 向相反方向计数
        for (let i = 1; i < 5; i++) {
            const newRow = row - dx * i;
            const newCol = col - dy * i;
            if (newRow >= 0 && newRow < 15 && newCol >= 0 && newCol < 15 && board[newRow][newCol] === piece) {
                count++;
            } else {
                break;
            }
        }

        if (count >= 5) {
            return true;
        }
    }

    return false;
}

/**
 * 处理重新开始请求
 * @param {Object} socket - Socket连接
 */
function handleRematchRequest(socket) {
    // 简单实现：暂时不支持重新开始
    socket.emit('rematchResponse', { 
        success: false, 
        message: '暂不支持重新开始，请重新匹配' 
    });
}

/**
 * 处理投降
 * @param {Object} socket - Socket连接
 */
function handleSurrender(socket) {
    const gameInfo = matchmakingService.getPlayerGame(socket.id);
    if (!gameInfo) {
        socket.emit('error', { message: '游戏不存在' });
        return;
    }

    const isPlayer1 = gameInfo.player1.socketId === socket.id;
    const winner = isPlayer1 ? gameInfo.player2.piece : gameInfo.player1.piece;
    
    // 结束游戏
    matchmakingService.endGame(gameInfo.gameId, 'surrender', winner);
}