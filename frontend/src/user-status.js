/**
 * 用户状态组件 - 显示用户信息、统计数据和状态管理
 */

import authManager from './auth-manager.js';
import gameDataManager from './game-data-manager.js';
import loginComponent from './login-component.js';

export class UserStatus {
    constructor() {
        this.container = null;
        this.isExpanded = false;
        
        // 监听认证状态变化
        authManager.addEventListener('auth:state-changed', (state) => {
            this.updateDisplay(state);
        });
        
        // 监听统计数据更新
        gameDataManager.addEventListener('stats:updated', (stats) => {
            this.updateStats(stats);
        });
    }

    /**
     * 初始化用户状态组件
     */
    init(containerId = 'userStatus') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            this.container = this.createContainer(containerId);
        }
        
        this.render();
        this.addEventListeners();
        
        // 如果已经初始化认证管理器，立即更新显示
        if (authManager.isInitialized) {
            this.updateDisplay(authManager.getAuthState());
        }
    }

    /**
     * 创建容器元素
     */
    createContainer(containerId) {
        const container = document.createElement('div');
        container.id = containerId;
        container.className = 'user-status-container';
        
        // 默认添加到页面顶部
        document.body.insertBefore(container, document.body.firstChild);
        
        return container;
    }

    /**
     * 渲染用户状态组件
     */
    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="user-status-widget">
                <div class="user-status-header" onclick="userStatus.toggleExpanded()">
                    <div class="user-info">
                        <span class="user-avatar">👤</span>
                        <span class="user-name" id="userDisplayName">访客</span>
                        <span class="user-level" id="userLevel"></span>
                    </div>
                    <div class="user-actions">
                        <span class="expand-icon" id="expandIcon">▼</span>
                    </div>
                </div>
                
                <div class="user-status-body" id="userStatusBody" style="display: none;">
                    <div class="user-stats" id="userStats">
                        <div class="loading">加载中...</div>
                    </div>
                    
                    <div class="user-buttons">
                        <button class="status-btn login-btn" id="loginBtn" onclick="userStatus.showLogin()">
                            登录
                        </button>
                        <button class="status-btn register-btn" id="registerBtn" onclick="userStatus.showRegister()">
                            注册
                        </button>
                        <button class="status-btn logout-btn" id="logoutBtn" onclick="userStatus.logout()" style="display: none;">
                            登出
                        </button>
                        <button class="status-btn profile-btn" id="profileBtn" onclick="userStatus.showProfile()" style="display: none;">
                            个人资料
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.addStyles();
    }

    /**
     * 更新显示状态
     */
    updateDisplay(authState) {
        if (!this.container) return;

        const { isLoggedIn, user } = authState;
        
        // 更新用户名显示
        const userNameEl = document.getElementById('userDisplayName');
        if (userNameEl) {
            userNameEl.textContent = isLoggedIn ? user.username : '访客';
        }

        // 更新用户等级
        const userLevelEl = document.getElementById('userLevel');
        if (userLevelEl) {
            if (isLoggedIn) {
                const level = authManager.getUserLevel();
                const levelName = authManager.getUserLevelName();
                userLevelEl.textContent = `Lv.${level} ${levelName}`;
                userLevelEl.style.display = 'inline';
            } else {
                userLevelEl.style.display = 'none';
            }
        }

        // 更新按钮显示
        this.updateButtons(isLoggedIn);

        // 如果已登录，加载用户统计
        if (isLoggedIn) {
            this.loadUserStats();
        } else {
            this.clearStats();
        }
    }

    /**
     * 更新按钮显示
     */
    updateButtons(isLoggedIn) {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const profileBtn = document.getElementById('profileBtn');

        if (isLoggedIn) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (registerBtn) registerBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
            if (profileBtn) profileBtn.style.display = 'inline-block';
        } else {
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (registerBtn) registerBtn.style.display = 'inline-block';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (profileBtn) profileBtn.style.display = 'none';
        }
    }

    /**
     * 加载用户统计
     */
    async loadUserStats() {
        const statsContainer = document.getElementById('userStats');
        if (!statsContainer) return;

        try {
            statsContainer.innerHTML = '<div class="loading">加载统计中...</div>';
            
            const stats = await gameDataManager.loadUserStats();
            if (stats) {
                this.updateStats(stats);
            } else {
                statsContainer.innerHTML = '<div class="no-data">暂无游戏记录</div>';
            }
        } catch (error) {
            statsContainer.innerHTML = '<div class="error">加载统计失败</div>';
        }
    }

    /**
     * 更新统计数据显示
     */
    updateStats(stats) {
        const statsContainer = document.getElementById('userStats');
        if (!statsContainer || !stats) return;

        const basic = stats.basic || {};
        
        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${basic.total_games || 0}</div>
                    <div class="stat-label">总局数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${basic.wins || 0}</div>
                    <div class="stat-label">胜利</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${basic.win_rate || 0}%</div>
                    <div class="stat-label">胜率</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${this.formatDuration(basic.avg_duration || 0)}</div>
                    <div class="stat-label">平均用时</div>
                </div>
            </div>
            
            ${stats.by_difficulty && stats.by_difficulty.length > 0 ? `
                <div class="difficulty-stats">
                    <h4>按难度统计</h4>
                    ${stats.by_difficulty.map(diff => `
                        <div class="difficulty-item">
                            <span class="difficulty-name">${this.getDifficultyName(diff.difficulty)}</span>
                            <span class="difficulty-record">${diff.games_count}局 (胜率${diff.win_rate}%)</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    }

    /**
     * 清除统计数据
     */
    clearStats() {
        const statsContainer = document.getElementById('userStats');
        if (statsContainer) {
            statsContainer.innerHTML = '<div class="guest-message">🎮 登录后可查看游戏统计</div>';
        }
    }

    /**
     * 切换展开状态
     */
    toggleExpanded() {
        this.isExpanded = !this.isExpanded;
        const body = document.getElementById('userStatusBody');
        const icon = document.getElementById('expandIcon');
        
        if (body) {
            body.style.display = this.isExpanded ? 'block' : 'none';
        }
        
        if (icon) {
            icon.textContent = this.isExpanded ? '▲' : '▼';
        }
    }

    /**
     * 显示登录
     */
    showLogin() {
        loginComponent.showLoginModal();
    }

    /**
     * 显示注册
     */
    showRegister() {
        loginComponent.showRegisterModal();
    }

    /**
     * 登出
     */
    async logout() {
        if (confirm('确定要登出吗？')) {
            await authManager.logout();
        }
    }

    /**
     * 显示个人资料
     */
    showProfile() {
        // TODO: 实现个人资料页面
        alert('个人资料功能即将推出');
    }

    /**
     * 添加事件监听器
     */
    addEventListeners() {
        // 监听点击外部关闭展开状态
        document.addEventListener('click', (e) => {
            if (this.isExpanded && !this.container.contains(e.target)) {
                this.isExpanded = false;
                const body = document.getElementById('userStatusBody');
                const icon = document.getElementById('expandIcon');
                
                if (body) body.style.display = 'none';
                if (icon) icon.textContent = '▼';
            }
        });
    }

    /**
     * 格式化时长
     */
    formatDuration(seconds) {
        if (seconds < 60) return `${seconds}秒`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}分${remainingSeconds}秒`;
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
     * 添加样式
     */
    addStyles() {
        if (document.getElementById('user-status-styles')) return;

        const style = document.createElement('style');
        style.id = 'user-status-styles';
        style.textContent = `
            .user-status-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }

            .user-status-widget {
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                border: 1px solid #ddd;
                min-width: 200px;
            }

            .user-status-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 15px;
                cursor: pointer;
                background: #f8f9fa;
                border-radius: 8px 8px 0 0;
            }

            .user-status-header:hover {
                background: #e9ecef;
            }

            .user-info {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .user-avatar {
                font-size: 16px;
            }

            .user-name {
                font-weight: bold;
                color: #333;
                font-size: 14px;
            }

            .user-level {
                background: #007bff;
                color: white;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 10px;
                font-weight: bold;
            }

            .expand-icon {
                color: #666;
                font-size: 12px;
                transition: transform 0.2s;
            }

            .user-status-body {
                padding: 15px;
                border-top: 1px solid #eee;
            }

            .stats-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-bottom: 15px;
            }

            .stat-item {
                text-align: center;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 4px;
            }

            .stat-value {
                font-size: 18px;
                font-weight: bold;
                color: #007bff;
            }

            .stat-label {
                font-size: 12px;
                color: #666;
                margin-top: 2px;
            }

            .difficulty-stats {
                margin-bottom: 15px;
            }

            .difficulty-stats h4 {
                margin: 0 0 10px 0;
                font-size: 14px;
                color: #333;
            }

            .difficulty-item {
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                border-bottom: 1px solid #f0f0f0;
                font-size: 12px;
            }

            .difficulty-name {
                font-weight: bold;
            }

            .user-buttons {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }

            .status-btn {
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
                flex: 1;
                min-width: 60px;
            }

            .login-btn, .register-btn {
                background: #007bff;
                color: white;
            }

            .login-btn:hover, .register-btn:hover {
                background: #0056b3;
            }

            .logout-btn {
                background: #dc3545;
                color: white;
            }

            .logout-btn:hover {
                background: #c82333;
            }

            .profile-btn {
                background: #28a745;
                color: white;
            }

            .profile-btn:hover {
                background: #218838;
            }

            .loading, .no-data, .error, .guest-message {
                text-align: center;
                padding: 20px;
                color: #666;
                font-size: 14px;
            }

            .error {
                color: #dc3545;
            }

            .guest-message {
                color: #007bff;
            }
        `;

        document.head.appendChild(style);
    }
}

// 创建全局实例
const userStatus = new UserStatus();

// 导出组件
export default userStatus;

// 添加到全局作用域
window.userStatus = userStatus;