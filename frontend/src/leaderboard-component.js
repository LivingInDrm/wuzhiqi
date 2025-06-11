/**
 * 排行榜组件 - 显示用户排名和统计信息
 */

import apiClient from './api-client.js';
import { UIComponents } from './ui-components.js';
import { ApiUtils } from './api-utils.js';

export class LeaderboardComponent {
    constructor() {
        this.isInitialized = false;
        this.currentType = 'win_rate';
        this.currentDifficulty = 'all';
        this.leaderboardData = [];
        this.modalElement = null;
    }

    /**
     * 初始化排行榜组件
     */
    init() {
        if (this.isInitialized) return;
        
        console.log('🏆 初始化排行榜组件');
        this.isInitialized = true;
    }

    /**
     * 显示排行榜模态框
     */
    async showLeaderboard() {
        try {
            // 创建排行榜模态框
            this.modalElement = UIComponents.createModal({
                title: '🏆 游戏排行榜',
                size: 'large',
                showCloseButton: true,
                className: 'leaderboard-modal'
            });

            // 添加排行榜内容
            const content = this.createLeaderboardContent();
            this.modalElement.querySelector('.modal-body').appendChild(content);

            // 显示模态框
            document.body.appendChild(this.modalElement);
            this.modalElement.style.display = 'flex';

            // 加载默认排行榜数据
            await this.loadLeaderboard();

        } catch (error) {
            console.error('❌ 显示排行榜失败:', error);
            UIComponents.showNotification('显示排行榜失败', 'error');
        }
    }

    /**
     * 创建排行榜内容
     */
    createLeaderboardContent() {
        const container = document.createElement('div');
        container.className = 'leaderboard-container';
        
        container.innerHTML = `
            <!-- 排行榜控制面板 -->
            <div class="leaderboard-controls">
                <div class="control-group">
                    <label>排行榜类型:</label>
                    <select class="leaderboard-type-select">
                        <option value="win_rate">胜率排行</option>
                        <option value="total_games">游戏数量</option>
                        <option value="fastest_wins">最快获胜</option>
                    </select>
                </div>
                <div class="control-group">
                    <label>难度筛选:</label>
                    <select class="leaderboard-difficulty-select">
                        <option value="all">全部难度</option>
                        <option value="simple">简单</option>
                        <option value="advanced">进阶</option>
                        <option value="professional">专业</option>
                    </select>
                </div>
                <button class="refresh-btn" type="button">
                    🔄 刷新
                </button>
            </div>

            <!-- 排行榜内容区域 -->
            <div class="leaderboard-content">
                <div class="leaderboard-loading">
                    <div class="loading-spinner"></div>
                    <span>加载排行榜数据中...</span>
                </div>
                <div class="leaderboard-table-container" style="display: none;">
                    <table class="leaderboard-table">
                        <thead>
                            <tr class="leaderboard-header">
                                <!-- 表头将动态生成 -->
                            </tr>
                        </thead>
                        <tbody class="leaderboard-body">
                            <!-- 排行榜数据将动态生成 -->
                        </tbody>
                    </table>
                </div>
                <div class="leaderboard-empty" style="display: none;">
                    <div class="empty-icon">📊</div>
                    <p>暂无排行榜数据</p>
                    <small>开始游戏后将显示在这里</small>
                </div>
            </div>

            <!-- 排行榜统计信息 -->
            <div class="leaderboard-stats">
                <span class="stats-info">总用户数: <span class="total-users">-</span></span>
                <span class="stats-info">最后更新: <span class="last-update">-</span></span>
            </div>
        `;

        // 绑定事件
        this.bindLeaderboardEvents(container);
        
        return container;
    }

    /**
     * 绑定排行榜事件
     */
    bindLeaderboardEvents(container) {
        // 排行榜类型选择
        const typeSelect = container.querySelector('.leaderboard-type-select');
        typeSelect.addEventListener('change', async (e) => {
            this.currentType = e.target.value;
            await this.loadLeaderboard();
        });

        // 难度筛选
        const difficultySelect = container.querySelector('.leaderboard-difficulty-select');
        difficultySelect.addEventListener('change', async (e) => {
            this.currentDifficulty = e.target.value;
            await this.loadLeaderboard();
        });

        // 刷新按钮
        const refreshBtn = container.querySelector('.refresh-btn');
        refreshBtn.addEventListener('click', async () => {
            await this.loadLeaderboard();
        });
    }

    /**
     * 加载排行榜数据
     */
    async loadLeaderboard() {
        try {
            const loadingEl = this.modalElement.querySelector('.leaderboard-loading');
            const tableEl = this.modalElement.querySelector('.leaderboard-table-container');
            const emptyEl = this.modalElement.querySelector('.leaderboard-empty');

            // 显示加载状态
            loadingEl.style.display = 'flex';
            tableEl.style.display = 'none';
            emptyEl.style.display = 'none';

            console.log(`🏆 加载排行榜: ${this.currentType}, 难度: ${this.currentDifficulty}`);

            // 调用API获取排行榜数据
            const response = await ApiUtils.handleApiCall(
                () => apiClient.getLeaderboard({
                    type: this.currentType,
                    difficulty: this.currentDifficulty,
                    limit: 50
                }),
                {
                    loadingKey: 'leaderboard',
                    errorContext: '获取排行榜'
                }
            );

            this.leaderboardData = response.leaderboard || [];

            // 隐藏加载状态
            loadingEl.style.display = 'none';

            // 更新排行榜显示
            if (this.leaderboardData.length > 0) {
                this.renderLeaderboardTable();
                tableEl.style.display = 'block';
            } else {
                emptyEl.style.display = 'flex';
            }

            // 更新统计信息
            this.updateLeaderboardStats(response);

        } catch (error) {
            console.error('❌ 加载排行榜失败:', error);
            
            // 隐藏加载状态，显示空状态
            const loadingEl = this.modalElement.querySelector('.leaderboard-loading');
            const emptyEl = this.modalElement.querySelector('.leaderboard-empty');
            
            loadingEl.style.display = 'none';
            emptyEl.style.display = 'flex';
            emptyEl.querySelector('p').textContent = '加载排行榜失败';
            
            UIComponents.showNotification('获取排行榜数据失败', 'error');
        }
    }

    /**
     * 渲染排行榜表格
     */
    renderLeaderboardTable() {
        const headerEl = this.modalElement.querySelector('.leaderboard-header');
        const bodyEl = this.modalElement.querySelector('.leaderboard-body');

        // 根据排行榜类型生成表头
        const headers = this.getTableHeaders();
        headerEl.innerHTML = headers.map(header => `<th>${header}</th>`).join('');

        // 生成排行榜行
        bodyEl.innerHTML = this.leaderboardData.map(user => this.createLeaderboardRow(user)).join('');
    }

    /**
     * 获取表格表头
     */
    getTableHeaders() {
        const baseHeaders = ['排名', '用户名', '级别'];
        
        switch (this.currentType) {
            case 'win_rate':
                return [...baseHeaders, '胜率', '总游戏', '胜/负/平', '平均用时', '最快获胜'];
            case 'total_games':
                return [...baseHeaders, '总游戏', '胜率', '获胜数', '总用时', '加入时间'];
            case 'fastest_wins':
                return [...baseHeaders, '最快获胜', '步数', '获胜数', '胜率', '总游戏'];
            default:
                return baseHeaders;
        }
    }

    /**
     * 创建排行榜行
     */
    createLeaderboardRow(user) {
        const getRankClass = (rank) => {
            if (rank === 1) return 'rank-gold';
            if (rank === 2) return 'rank-silver';
            if (rank === 3) return 'rank-bronze';
            return '';
        };

        const getLevelIcon = (level) => {
            const icons = { 1: '🐣', 2: '🐤', 3: '🐓', 4: '🦅', 5: '👑' };
            return icons[level] || '👤';
        };

        const baseData = `
            <td class="rank-cell ${getRankClass(user.rank)}">
                ${user.rank <= 3 ? ['🥇', '🥈', '🥉'][user.rank - 1] : user.rank}
            </td>
            <td class="username-cell">${user.username}</td>
            <td class="level-cell">
                <span class="level-icon">${getLevelIcon(user.level)}</span>
                <span class="level-name">${user.level_name}</span>
            </td>
        `;

        let specificData = '';
        switch (this.currentType) {
            case 'win_rate':
                specificData = `
                    <td class="win-rate-cell">${user.win_rate}%</td>
                    <td class="total-games-cell">${user.total_games}</td>
                    <td class="record-cell">${user.wins}/${user.losses}/${user.draws}</td>
                    <td class="duration-cell">${user.avg_duration_formatted || '-'}</td>
                    <td class="fastest-cell">${user.fastest_win_formatted || '-'}</td>
                `;
                break;
            case 'total_games':
                specificData = `
                    <td class="total-games-cell">${user.total_games}</td>
                    <td class="win-rate-cell">${user.win_rate}%</td>
                    <td class="wins-cell">${user.wins}</td>
                    <td class="total-time-cell">${user.total_time_formatted || '-'}</td>
                    <td class="join-date-cell">${new Date(user.join_date).toLocaleDateString()}</td>
                `;
                break;
            case 'fastest_wins':
                specificData = `
                    <td class="fastest-cell">${user.fastest_win_formatted || '-'}</td>
                    <td class="moves-cell">${user.fastest_win_moves || '-'}</td>
                    <td class="wins-cell">${user.total_wins || 0}</td>
                    <td class="win-rate-cell">${user.win_rate}%</td>
                    <td class="total-games-cell">${user.total_games}</td>
                `;
                break;
        }

        return `<tr class="leaderboard-row">${baseData}${specificData}</tr>`;
    }

    /**
     * 更新排行榜统计信息
     */
    updateLeaderboardStats(response) {
        const totalUsersEl = this.modalElement.querySelector('.total-users');
        const lastUpdateEl = this.modalElement.querySelector('.last-update');

        totalUsersEl.textContent = response.total_users || 0;
        lastUpdateEl.textContent = new Date().toLocaleTimeString();
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

    /**
     * 销毁组件
     */
    destroy() {
        this.close();
        this.isInitialized = false;
        this.leaderboardData = [];
    }
}

// 创建全局排行榜组件实例
const leaderboardComponent = new LeaderboardComponent();

// 导出
export default leaderboardComponent;

// 添加到全局作用域
window.leaderboardComponent = leaderboardComponent;

console.log('✅ 排行榜组件已加载');