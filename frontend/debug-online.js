/**
 * 在线对战调试脚本
 * 在浏览器控制台中运行来诊断问题
 */

console.log('🔍 开始在线对战诊断...');

// 检查全局对象
console.log('📋 检查全局对象:');
console.log('- game对象:', typeof window.game !== 'undefined' ? '✅ 存在' : '❌ 不存在');
console.log('- onlineUIManager:', typeof window.onlineUIManager !== 'undefined' ? '✅ 存在' : '❌ 不存在');
console.log('- onlineClient:', typeof window.onlineClient !== 'undefined' ? '✅ 存在' : '❌ 不存在');

// 检查游戏状态
if (typeof window.game !== 'undefined') {
    console.log('\n🎮 游戏状态:');
    console.log('- 游戏模式:', window.game.gameMode || '未设置');
    console.log('- 在线游戏数据:', window.game.onlineGameData);
    console.log('- 当前玩家:', window.game.currentPlayer);
    console.log('- 人类玩家:', window.game.humanPlayer);
    console.log('- AI玩家:', window.game.aiPlayer);
    console.log('- 游戏结束:', window.game.gameOver);
}

// 检查在线UI管理器状态
if (typeof window.onlineUIManager !== 'undefined') {
    console.log('\n🌐 在线UI管理器状态:');
    console.log('- 当前模式:', window.onlineUIManager.currentMode);
    console.log('- 正在匹配:', window.onlineUIManager.isMatchmaking);
    console.log('- 游戏中:', window.onlineUIManager.isInGame);
}

// 检查在线客户端状态
if (typeof window.onlineClient !== 'undefined') {
    console.log('\n📡 在线客户端状态:');
    const status = window.onlineClient.getConnectionStatus();
    console.log('- 连接状态:', status.isConnected ? '✅ 已连接' : '❌ 未连接');
    console.log('- 活跃游戏:', status.hasActiveGame ? '✅ 有游戏' : '❌ 无游戏');
    console.log('- 游戏信息:', status.gameInfo);
}

console.log('\n💡 如果发现问题，请检查:');
console.log('1. 确保已切换到在线对战模式');
console.log('2. 确保已成功连接到服务器');
console.log('3. 确保游戏模式正确设置为 "online"');
console.log('4. 检查浏览器控制台是否有其他错误');