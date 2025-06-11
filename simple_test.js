/**
 * 简单的服务器连接测试
 */

import WebSocket from 'ws';

console.log('🧪 开始简单连接测试...');

// 测试WebSocket连接到Socket.IO服务器
const ws = new WebSocket('ws://localhost:3000/socket.io/?EIO=4&transport=websocket');

ws.on('open', () => {
    console.log('✅ WebSocket连接成功');
    
    // 发送Socket.IO握手
    ws.send('40'); // Socket.IO connect message
    
    setTimeout(() => {
        ws.close();
        console.log('✅ 连接测试完成');
        process.exit(0);
    }, 1000);
});

ws.on('error', (error) => {
    console.error('❌ 连接失败:', error.message);
    process.exit(1);
});

ws.on('message', (data) => {
    console.log('📩 收到消息:', data.toString());
});