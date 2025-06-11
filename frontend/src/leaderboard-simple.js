/**
 * 简化排行榜功能 - 用于测试和快速展示
 */

import apiClient from './api-client.js';
import { UIComponents } from './ui-components.js';

export class SimpleLeaderboard {
    constructor() {
        this.modalElement = null;
    }

    /**
     * 显示简单排行榜
     */
    async show() {
        try {
            // 创建模态框
            this.modalElement = UIComponents.createModal({
                title: '🏆 游戏排行榜',
                size: 'medium',
                showCloseButton: true
            });

            // 添加内容
            const content = document.createElement('div');
            content.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <div class="loading-spinner" style="margin: 20px auto; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p>加载排行榜数据中...</p>
                </div>
            `;

            this.modalElement.querySelector('.ui-modal-body').appendChild(content);
            document.body.appendChild(this.modalElement);
            this.modalElement.style.display = 'flex';

            // 获取全局统计作为排行榜数据
            const response = await apiClient.getGlobalStats();
            
            // 显示简单的统计信息
            content.innerHTML = `
                <div style="padding: 20px;">
                    <h3 style="text-align: center; margin-bottom: 20px;">🎮 游戏统计</h3>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <h4>全局统计</h4>
                        <p>总游戏数: ${response.stats.global.total_games}</p>
                        <p>总玩家数: ${response.stats.global.total_players}</p>
                        <p>平均游戏时长: ${Math.round(response.stats.global.avg_game_duration)}秒</p>
                        <p>今日游戏数: ${response.stats.today.games_today}</p>
                    </div>
                    
                    <div style="background: #e3f2fd; padding: 15px; border-radius: 8px;">
                        <h4>按难度统计</h4>
                        ${response.stats.by_difficulty.map(diff => `
                            <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 5px;">
                                <strong>${this.getDifficultyName(diff.difficulty)}</strong>: 
                                ${diff.games_count}局 (人类胜率: ${diff.human_win_rate}%)
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px; color: #666; font-size: 14px;">
                        <p>🚧 详细排行榜功能正在开发中</p>
                        <p>敬请期待！</p>
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('❌ 显示排行榜失败:', error);
            if (this.modalElement) {
                const content = this.modalElement.querySelector('.ui-modal-body');
                content.innerHTML = `
                    <div style="padding: 20px; text-align: center;">
                        <p style="color: #e74c3c;">❌ 加载排行榜失败</p>
                        <p style="color: #666; font-size: 14px;">请稍后再试</p>
                    </div>
                `;
            }
        }
    }

    /**
     * 获取难度名称
     */
    getDifficultyName(difficulty) {
        const names = {
            simple: '简单',
            advanced: '进阶',
            professional: '专业'
        };
        return names[difficulty] || difficulty;
    }

    /**
     * 关闭排行榜
     */
    close() {
        if (this.modalElement) {
            document.body.removeChild(this.modalElement);
            this.modalElement = null;
        }
    }
}

// 创建实例
const simpleLeaderboard = new SimpleLeaderboard();

export default simpleLeaderboard;