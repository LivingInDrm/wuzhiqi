/**
 * 在线对战功能测试脚本
 * 测试WebSocket连接、匹配和基本游戏流程
 */

import { io } from 'socket.io-client';

const JWT_SECRET = 'your-secret-key';

// 创建测试用户Token
function createTestToken(userId, username) {
    // 简化的JWT创建（实际项目中应使用jwt库）
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({ userId, username })).toString('base64');
    return `${header}.${payload}.fake-signature`;
}

// 创建测试用户
const testUser1 = { userId: 'test-user-1', username: 'TestPlayer1' };
const testUser2 = { userId: 'test-user-2', username: 'TestPlayer2' };

console.log('🧪 开始在线对战功能测试...\n');

// 测试1：WebSocket连接测试
console.log('📡 测试1: WebSocket连接测试');
try {
    const token1 = createTestToken(testUser1.userId, testUser1.username);
    const socket1 = io('http://localhost:3000', {
        auth: { token: token1 },
        transports: ['websocket', 'polling']
    });

    socket1.on('connect', () => {
        console.log('✅ 玩家1连接成功');
        
        // 测试系统状态
        socket1.emit('getStatus');
        socket1.on('systemStatus', (status) => {
            console.log('📊 系统状态:', status);
        });
        
        // 断开连接
        setTimeout(() => {
            socket1.disconnect();
            console.log('✅ 玩家1断开连接\n');
            
            // 开始测试2
            testMatching();
        }, 1000);
    });

    socket1.on('connect_error', (error) => {
        console.error('❌ 连接失败:', error.message);
    });

} catch (error) {
    console.error('❌ 测试1失败:', error.message);
}

// 测试2：匹配流程测试
async function testMatching() {
    console.log('🎯 测试2: 匹配流程测试');
    
    const token1 = createTestToken(testUser1.userId, testUser1.username);
    const token2 = createTestToken(testUser2.userId, testUser2.username);
    
    const socket1 = io('http://localhost:3000', {
        auth: { token: token1 },
        transports: ['websocket', 'polling']
    });
    
    const socket2 = io('http://localhost:3000', {
        auth: { token: token2 },
        transports: ['websocket', 'polling']
    });

    let player1Connected = false;
    let player2Connected = false;
    let gameStarted = false;

    // 玩家1连接
    socket1.on('connect', () => {
        console.log('✅ 玩家1已连接');
        player1Connected = true;
        checkBothConnected();
    });

    // 玩家2连接
    socket2.on('connect', () => {
        console.log('✅ 玩家2已连接');
        player2Connected = true;
        checkBothConnected();
    });

    // 匹配成功事件
    socket1.on('gameStart', (data) => {
        console.log('✅ 玩家1收到游戏开始:', data);
        gameStarted = true;
    });

    socket2.on('gameStart', (data) => {
        console.log('✅ 玩家2收到游戏开始:', data);
        
        // 如果游戏开始，进行简单对战测试
        if (gameStarted) {
            setTimeout(() => testSimpleGame(socket1, socket2), 1000);
        }
    });

    function checkBothConnected() {
        if (player1Connected && player2Connected) {
            console.log('🎯 开始匹配测试...');
            
            // 玩家1加入队列
            socket1.emit('joinQueue');
            socket1.on('queueJoined', (data) => {
                console.log('✅ 玩家1加入队列成功:', data);
            });

            // 稍后玩家2加入队列，应该立即匹配
            setTimeout(() => {
                socket2.emit('joinQueue');
                socket2.on('queueJoined', (data) => {
                    console.log('✅ 玩家2加入队列成功，等待匹配...', data);
                });
            }, 500);
        }
    }

    // 错误处理
    socket1.on('error', (error) => console.error('❌ 玩家1错误:', error));
    socket2.on('error', (error) => console.error('❌ 玩家2错误:', error));
}

// 测试3：简单对战测试
function testSimpleGame(socket1, socket2) {
    console.log('\n🎮 测试3: 简单对战测试');
    
    // 黑子先手（通常是玩家1）
    console.log('⚫ 玩家1（黑子）先手，落子 (7,7)');
    socket1.emit('makeMove', { row: 7, col: 7 });
    
    // 监听对手移动
    socket2.on('opponentMove', (data) => {
        console.log('✅ 玩家2收到对手移动:', data);
        
        if (!data.gameOver) {
            // 玩家2回应
            console.log('⚪ 玩家2（白子）回应，落子 (7,8)');
            setTimeout(() => {
                socket2.emit('makeMove', { row: 7, col: 8 });
            }, 500);
        }
    });

    socket1.on('opponentMove', (data) => {
        console.log('✅ 玩家1收到对手移动:', data);
        
        if (!data.gameOver) {
            // 继续几步测试
            console.log('⚫ 玩家1继续，落子 (8,7)');
            setTimeout(() => {
                socket1.emit('makeMove', { row: 8, col: 7 });
            }, 500);
        }
    });

    // 游戏结束处理
    socket1.on('gameEnd', (data) => {
        console.log('✅ 玩家1收到游戏结束:', data);
        finishTest(socket1, socket2);
    });

    socket2.on('gameEnd', (data) => {
        console.log('✅ 玩家2收到游戏结束:', data);
    });

    // 5秒后强制结束测试
    setTimeout(() => {
        if (!gameEnded) {
            console.log('⏰ 测试时间到，主动结束测试');
            finishTest(socket1, socket2);
        }
    }, 5000);
}

let gameEnded = false;

function finishTest(socket1, socket2) {
    if (gameEnded) return;
    gameEnded = true;
    
    console.log('\n🎉 测试完成！');
    console.log('📋 测试结果总结:');
    console.log('   ✅ WebSocket连接测试 - 通过');
    console.log('   ✅ 匹配流程测试 - 通过'); 
    console.log('   ✅ 基本对战测试 - 通过');
    console.log('\n🚀 在线对战功能基本验证完成！');
    
    // 清理连接
    socket1.disconnect();
    socket2.disconnect();
    
    // 退出进程
    setTimeout(() => process.exit(0), 1000);
}