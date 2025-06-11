/**
 * 游戏数据记录修复
 * 简化版本，直接修复游戏记录问题
 */

import apiClient from './api-client.js';

export class GameRecordFix {
    static async recordGame(gameResult) {
        try {
            if (!apiClient.isLoggedIn()) {
                console.log('👤 用户未登录，不记录游戏数据');
                return;
            }

            console.log('🎮 开始记录游戏结果:', gameResult);

            // 确保数据格式正确
            const gameData = {
                result: gameResult.result,                    // 必需: 'win', 'lose', 'draw'
                difficulty: gameResult.difficulty || 'advanced', // 必需: 'simple', 'advanced', 'professional'
                moves: gameResult.moves || 20,               // 必需: 步数 (数字)
                duration: gameResult.duration || 60,         // 必需: 时长 (数字)
                userColor: gameResult.userColor || 'black',  // 可选: 用户颜色
                finalScore: gameResult.finalScore || null    // 可选: 最终分数
            };

            console.log('📤 发送游戏数据:', gameData);

            const response = await apiClient.recordGame(gameData);
            
            console.log('✅ 游戏记录成功:', response);
            
            // 显示成功消息
            if (response.user_stats) {
                console.log('📊 更新用户统计:', response.user_stats);
            }

            return response;

        } catch (error) {
            console.error('❌ 记录游戏失败:', error);
            
            // 显示友好的错误消息
            if (error.message.includes('请求参数错误')) {
                console.error('参数错误详情:', error);
            }
            
            throw error;
        }
    }

    static createGameResult(result, difficulty, moveCount, duration, userColor = 'black') {
        return {
            result,           // 'win', 'lose', 'draw'
            difficulty,       // 'simple', 'advanced', 'professional'
            moves: moveCount, // 步数
            duration,         // 秒数
            userColor,        // 'black' 或 'white'
            finalScore: null  // 暂时为null
        };
    }
}

// 添加到全局作用域
window.GameRecordFix = GameRecordFix;

export default GameRecordFix;