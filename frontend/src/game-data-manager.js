/**
 * 游戏数据管理器 - 处理游戏相关的数据操作和API调用
 */

import apiClient from './api-client.js';
import { ApiUtils, ApiErrorHandler, apiLoadingManager } from './api-utils.js';

export class GameDataManager {
    constructor() {
        this.currentGameData = null;
        this.userStats = null;
        this.gameHistory = [];
        this.isRecording = false;
        
        // 事件监听器
        this.listeners = new Map();
    }

    // =================事件系统=================

    /**
     * 添加事件监听器
     */
    addEventListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    /**
     * 移除事件监听器
     */
    removeEventListener(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    /**
     * 触发事件
     */
    emit(event, data = null) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`事件监听器错误 (${event}):`, error);
                }
            });
        }
    }

    // =================游戏记录管理=================

    /**
     * 开始新游戏
     */
    startNewGame(gameConfig = {}) {
        this.currentGameData = {
            startTime: Date.now(),
            difficulty: gameConfig.difficulty || 'advanced',
            userColor: gameConfig.userColor || 'black',
            moves: [],
            gameState: 'playing'
        };

        console.log('🎮 开始新游戏:', this.currentGameData);
        this.emit('game:started', this.currentGameData);
    }

    /**
     * 记录游戏步骤
     */
    recordMove(move, player) {
        if (!this.currentGameData) return;

        const moveData = {
            row: move.row,
            col: move.col,
            player: player,
            timestamp: Date.now() - this.currentGameData.startTime
        };

        this.currentGameData.moves.push(moveData);
        console.log('📝 记录步骤:', moveData);
    }

    /**
     * 结束游戏并记录结果
     */
    async endGame(result, finalScore = null) {
        if (!this.currentGameData || this.isRecording) return;

        try {
            this.isRecording = true;
            
            const endTime = Date.now();
            const duration = Math.floor((endTime - this.currentGameData.startTime) / 1000);
            
            const gameResult = {
                result: result, // 'win', 'lose', 'draw'
                difficulty: this.currentGameData.difficulty,
                moves: this.currentGameData.moves.length,
                duration: duration,
                userColor: this.currentGameData.userColor,
                finalScore: finalScore
            };

            console.log('🏁 结束游戏:', gameResult);

            // 只有用户登录时才记录到服务器
            if (apiClient.isLoggedIn()) {
                const response = await ApiUtils.handleApiCall(
                    () => apiClient.recordGame(gameResult),
                    {
                        loadingKey: 'record-game',
                        successMessage: this.getResultMessage(result),
                        errorContext: '记录游戏结果'
                    }
                );

                // 更新用户统计
                if (response.user_stats) {
                    this.userStats = response.user_stats;
                    this.emit('stats:updated', this.userStats);
                }

                this.emit('game:recorded', response.record);
            } else {
                // 离线模式，只触发游戏结束事件
                this.emit('game:ended', gameResult);
            }

            // 清理当前游戏数据
            this.currentGameData = null;

        } catch (error) {
            console.error('记录游戏结果失败:', error);
            this.emit('game:record-failed', error);
        } finally {
            this.isRecording = false;
        }
    }

    /**
     * 获取结果消息
     */
    getResultMessage(result) {
        const messages = {
            'win': '🎉 恭喜获胜！游戏结果已记录',
            'lose': '💪 继续努力！游戏结果已记录', 
            'draw': '🤝 平局！游戏结果已记录'
        };
        return messages[result] || '游戏结果已记录';
    }

    /**
     * 取消当前游戏
     */
    cancelGame() {
        if (this.currentGameData) {
            console.log('❌ 取消游戏');
            this.currentGameData = null;
            this.emit('game:cancelled');
        }
    }

    // =================用户统计管理=================

    /**
     * 加载用户统计
     */
    async loadUserStats() {
        if (!apiClient.isLoggedIn()) {
            this.userStats = null;
            return null;
        }

        try {
            const stats = await ApiUtils.handleApiCall(
                () => apiClient.getUserStats(),
                {
                    loadingKey: 'load-stats',
                    errorContext: '加载用户统计',
                    useCache: true,
                    cacheKey: 'user-stats'
                }
            );

            this.userStats = stats.stats;
            this.emit('stats:loaded', this.userStats);
            return this.userStats;

        } catch (error) {
            console.error('加载用户统计失败:', error);
            return null;
        }
    }

    /**
     * 获取当前用户统计
     */
    getUserStats() {
        return this.userStats;
    }

    // =================游戏历史管理=================

    /**
     * 加载游戏历史
     */
    async loadGameHistory(params = {}) {
        if (!apiClient.isLoggedIn()) {
            this.gameHistory = [];
            return { data: [], pagination: {} };
        }

        try {
            const response = await ApiUtils.handleApiCall(
                () => apiClient.getGameHistory(params),
                {
                    loadingKey: 'load-history',
                    errorContext: '加载游戏历史'
                }
            );

            if (params.page === 1 || !params.page) {
                this.gameHistory = response.data;
            } else {
                this.gameHistory.push(...response.data);
            }

            this.emit('history:loaded', {
                data: response.data,
                pagination: response.pagination,
                allData: this.gameHistory
            });

            return response;

        } catch (error) {
            console.error('加载游戏历史失败:', error);
            return { data: [], pagination: {} };
        }
    }

    /**
     * 删除游戏记录
     */
    async deleteGameRecord(recordId) {
        try {
            await ApiUtils.handleApiCall(
                () => apiClient.deleteGameRecord(recordId),
                {
                    loadingKey: `delete-record-${recordId}`,
                    successMessage: '游戏记录已删除',
                    errorContext: '删除游戏记录'
                }
            );

            // 从本地数据中移除
            this.gameHistory = this.gameHistory.filter(record => record.id !== recordId);
            this.emit('history:record-deleted', recordId);

            // 重新加载统计数据
            await this.loadUserStats();

        } catch (error) {
            console.error('删除游戏记录失败:', error);
        }
    }

    /**
     * 批量删除游戏记录
     */
    async deleteGameRecords(recordIds) {
        try {
            await ApiUtils.handleApiCall(
                () => apiClient.deleteGameRecords(recordIds),
                {
                    loadingKey: 'delete-records',
                    successMessage: `已删除 ${recordIds.length} 条游戏记录`,
                    errorContext: '批量删除游戏记录'
                }
            );

            // 从本地数据中移除
            this.gameHistory = this.gameHistory.filter(record => !recordIds.includes(record.id));
            this.emit('history:records-deleted', recordIds);

            // 重新加载统计数据
            await this.loadUserStats();

        } catch (error) {
            console.error('批量删除游戏记录失败:', error);
        }
    }

    // =================全局统计=================

    /**
     * 加载全局统计
     */
    async loadGlobalStats() {
        try {
            const response = await ApiUtils.handleApiCall(
                () => apiClient.getGlobalStats(),
                {
                    loadingKey: 'load-global-stats',
                    errorContext: '加载全局统计',
                    useCache: true,
                    cacheKey: 'global-stats'
                }
            );

            this.emit('global-stats:loaded', response.stats);
            return response.stats;

        } catch (error) {
            console.error('加载全局统计失败:', error);
            return null;
        }
    }

    // =================游戏状态管理=================

    /**
     * 获取当前游戏状态
     */
    getCurrentGameData() {
        return this.currentGameData;
    }

    /**
     * 检查是否有进行中的游戏
     */
    hasActiveGame() {
        return !!this.currentGameData;
    }

    /**
     * 获取游戏时长（秒）
     */
    getGameDuration() {
        if (!this.currentGameData) return 0;
        return Math.floor((Date.now() - this.currentGameData.startTime) / 1000);
    }

    /**
     * 获取游戏步数
     */
    getGameMoves() {
        if (!this.currentGameData) return 0;
        return this.currentGameData.moves.length;
    }

    // =================数据导出=================

    /**
     * 导出游戏历史数据
     */
    exportGameHistory(format = 'json') {
        const data = {
            exportTime: new Date().toISOString(),
            userStats: this.userStats,
            gameHistory: this.gameHistory,
            totalGames: this.gameHistory.length
        };

        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        } else if (format === 'csv') {
            return this.convertToCSV(this.gameHistory);
        }

        return data;
    }

    /**
     * 转换为CSV格式
     */
    convertToCSV(data) {
        if (data.length === 0) return '';

        const headers = ['ID', '结果', '难度', '步数', '用时', '用户颜色', '创建时间'];
        const rows = data.map(record => [
            record.id,
            record.result,
            record.difficulty,
            record.moves_count,
            record.duration_formatted,
            record.user_color,
            record.created_at
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        return csvContent;
    }

    // =================工具方法=================

    /**
     * 重置所有数据
     */
    reset() {
        this.currentGameData = null;
        this.userStats = null;
        this.gameHistory = [];
        this.isRecording = false;
        
        console.log('🔄 游戏数据管理器已重置');
        this.emit('data:reset');
    }

    /**
     * 获取游戏难度配置
     */
    getDifficultyConfig(difficulty) {
        const configs = {
            simple: {
                name: '简单',
                description: '基础威胁识别',
                color: '#28a745'
            },
            advanced: {
                name: '进阶', 
                description: '复杂威胁模式',
                color: '#ffc107'
            },
            professional: {
                name: '专业',
                description: '高级威胁识别',
                color: '#dc3545'
            }
        };

        return configs[difficulty] || configs.advanced;
    }

    /**
     * 格式化游戏时长
     */
    formatDuration(seconds) {
        if (seconds < 60) {
            return `${seconds}秒`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}分${remainingSeconds}秒`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}小时${minutes}分`;
        }
    }

    /**
     * 获取胜率颜色
     */
    getWinRateColor(winRate) {
        if (winRate >= 70) return '#28a745'; // 绿色
        if (winRate >= 50) return '#ffc107'; // 黄色
        if (winRate >= 30) return '#fd7e14'; // 橙色
        return '#dc3545'; // 红色
    }
}

// 创建全局游戏数据管理器实例
const gameDataManager = new GameDataManager();

export default gameDataManager;