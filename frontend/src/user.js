/**
 * 用户管理模块 - 处理用户认证、状态管理等
 * 集成API通信系统，支持在线和离线模式
 */

import authManager from './auth-manager.js';
import userStatus from './user-status.js';
import loginComponent from './login-component.js';
import gameDataManager from './game-data-manager.js';

/**
 * 用户管理器 - 统一管理用户相关功能
 */
export class UserManager {
    constructor() {
        this.isInitialized = false;
        this.autoLoginAttempted = false;
        
        // 兼容旧版本的属性
        this.currentUser = null;
        this.isGuest = true;
        this.isLoggedIn = false;
    }

    /**
     * 初始化用户管理系统
     */
    async init(options = {}) {
        if (this.isInitialized) return;

        const {
            showUserStatus = true,
            autoLogin = true,
            userStatusContainer = 'userStatus'
        } = options;

        try {
            console.log('🔧 初始化用户管理系统...');

            // 等待认证管理器初始化
            await this.waitForAuthInit();

            // 初始化用户状态组件
            if (showUserStatus) {
                userStatus.init(userStatusContainer);
                console.log('✅ 用户状态组件初始化完成');
            }

            // 监听认证状态变化，更新兼容属性
            authManager.addEventListener('auth:state-changed', (state) => {
                this.updateCompatibleProperties(state);
            });

            // 尝试自动登录
            if (autoLogin && !this.autoLoginAttempted) {
                await this.attemptAutoLogin();
            }

            this.isInitialized = true;
            console.log('🎉 用户管理系统初始化完成');

        } catch (error) {
            console.error('❌ 用户管理系统初始化失败:', error);
        }
    }

    /**
     * 等待认证管理器初始化
     */
    async waitForAuthInit() {
        return new Promise((resolve) => {
            if (authManager.isInitialized) {
                resolve();
                return;
            }

            const checkInit = () => {
                if (authManager.isInitialized) {
                    resolve();
                } else {
                    setTimeout(checkInit, 100);
                }
            };

            checkInit();
        });
    }

    /**
     * 更新兼容属性（保持与旧版本的兼容性）
     */
    updateCompatibleProperties(authState) {
        if (authState.isLoggedIn) {
            this.currentUser = authState.user;
            this.isLoggedIn = true;
            this.isGuest = false;
        } else {
            this.currentUser = null;
            this.isLoggedIn = false;
            this.isGuest = true;
        }
    }

    /**
     * 尝试自动登录
     */
    async attemptAutoLogin() {
        this.autoLoginAttempted = true;

        try {
            const token = authManager.getToken();
            if (token) {
                console.log('🔑 检测到存储的token，尝试自动登录...');
                // authManager 会自动验证token并更新状态
            }
        } catch (error) {
            console.warn('⚠️ 自动登录失败:', error.message);
        }
    }

    // =============== 用户认证接口 ===============

    /**
     * 用户注册
     */
    async register(username, password, email = null) {
        try {
            const userData = {
                username: username.trim(),
                password: password,
                email: email || `${username}@example.com`
            };

            const response = await authManager.register(userData);
            console.log('✅ 用户注册成功:', username);
            return { success: true, message: '注册成功！', user: response.user };

        } catch (error) {
            console.error('❌ 用户注册失败:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * 用户登录
     */
    async login(username, password) {
        try {
            const credentials = {
                username: username.trim(),
                password: password
            };

            const response = await authManager.login(credentials);
            console.log('✅ 用户登录成功:', username);
            return { success: true, message: '登录成功！', user: response.user };

        } catch (error) {
            console.error('❌ 用户登录失败:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * 显示登录界面
     */
    showLogin() {
        loginComponent.showLoginModal();
    }

    /**
     * 显示注册界面
     */
    showRegister() {
        loginComponent.showRegisterModal();
    }

    /**
     * 登出用户
     */
    async logout() {
        try {
            await authManager.logout();
            console.log('👋 用户已登出');
            return { success: true, message: '登出成功' };
        } catch (error) {
            console.error('❌ 登出失败:', error);
            return { success: false, message: error.message };
        }
    }

    // =============== 用户信息接口 ===============

    /**
     * 获取当前用户信息
     */
    getCurrentUser() {
        return authManager.getCurrentUser();
    }

    /**
     * 检查是否已登录
     */
    isRegisteredUser() {
        return authManager.isLoggedIn();
    }

    /**
     * 获取当前用户显示名称
     */
    getCurrentUserDisplayName() {
        return authManager.getUserDisplayName();
    }

    /**
     * 获取当前用户类型
     */
    getCurrentUserType() {
        return this.isRegisteredUser() ? 'registered' : 'guest';
    }

    /**
     * 获取用户显示信息
     */
    getUserDisplayInfo() {
        if (!this.isRegisteredUser()) {
            return {
                name: '访客',
                level: 0,
                levelName: '访客',
                avatar: '👤'
            };
        }

        const user = this.getCurrentUser();
        return {
            name: user.username,
            level: authManager.getUserLevel(),
            levelName: authManager.getUserLevelName(),
            avatar: this.getUserAvatar(),
            winRate: authManager.getUserWinRate(),
            totalGames: user.total_games || 0
        };
    }

    /**
     * 获取用户头像
     */
    getUserAvatar() {
        if (!this.isRegisteredUser()) return '👤';

        const level = authManager.getUserLevel();
        const avatars = {
            1: '🐣',  // 新手
            2: '🐤',  // 进阶
            3: '🐓',  // 高手
            4: '🦅',  // 专家
            5: '👑'   // 大师
        };

        return avatars[level] || '👤';
    }

    // =============== 游戏数据接口 ===============

    /**
     * 开始新游戏
     */
    startNewGame(gameConfig = {}) {
        gameDataManager.startNewGame(gameConfig);
        
        if (this.isRegisteredUser()) {
            console.log('🎮 已登录用户开始新游戏，将记录游戏数据');
        } else {
            console.log('🎮 访客开始新游戏，游戏数据不会保存');
        }
    }

    /**
     * 记录游戏结果
     */
    async recordGameResult(gameResult) {
        try {
            if (this.isRegisteredUser()) {
                // 转换格式以兼容新API
                const apiGameData = {
                    result: gameResult.isWin ? 'win' : 'lose',
                    difficulty: gameResult.difficulty || 'advanced',
                    moves: gameResult.moves || 0,
                    duration: gameResult.duration || 0,
                    userColor: gameResult.userColor || 'black',
                    finalScore: gameResult.score || null
                };

                await gameDataManager.endGame(apiGameData.result, apiGameData.finalScore);
                console.log('📊 游戏结果已记录到服务器');
            } else {
                console.log('🎮 游客模式，不记录游戏结果');
            }
        } catch (error) {
            console.error('❌ 记录游戏失败:', error);
        }
    }

    /**
     * 结束游戏
     */
    async endGame(result, finalScore = null) {
        try {
            if (gameDataManager.hasActiveGame()) {
                await gameDataManager.endGame(result, finalScore);
                
                if (this.isRegisteredUser()) {
                    console.log('🏁 游戏已结束并保存记录');
                } else {
                    console.log('🏁 游戏已结束（访客模式）');
                }
            }
        } catch (error) {
            console.error('❌ 结束游戏失败:', error);
        }
    }

    /**
     * 获取用户统计信息
     */
    async getUserStats() {
        if (!this.isRegisteredUser()) {
            return null;
        }

        try {
            const stats = await gameDataManager.loadUserStats();
            
            // 兼容旧格式
            if (stats && stats.basic) {
                return {
                    username: this.getCurrentUser().username,
                    gamesPlayed: stats.basic.total_games || 0,
                    gamesWon: stats.basic.wins || 0,
                    totalScore: stats.basic.total_games * 10, // 简单计算
                    winRate: stats.basic.win_rate || 0,
                    registeredAt: this.getCurrentUser().created_at
                };
            }

            return null;
        } catch (error) {
            console.error('❌ 获取用户统计失败:', error);
            return null;
        }
    }

    /**
     * 获取游戏历史
     */
    async getGameHistory(params = {}) {
        try {
            if (this.isRegisteredUser()) {
                return await gameDataManager.loadGameHistory(params);
            } else {
                return { data: [], pagination: {} };
            }
        } catch (error) {
            console.error('❌ 获取游戏历史失败:', error);
            return { data: [], pagination: {} };
        }
    }

    // =============== 事件监听接口 ===============

    /**
     * 监听用户状态变化
     */
    onUserStateChange(callback) {
        authManager.addEventListener('auth:state-changed', callback);
    }

    /**
     * 监听游戏数据更新
     */
    onGameDataUpdate(callback) {
        gameDataManager.addEventListener('stats:updated', callback);
    }

    // =============== 兼容性接口 ===============

    /**
     * 验证用户输入（兼容旧版本）
     */
    validateUserInput(username, password) {
        const validation = authManager.validateLoginForm({ username, password });
        
        if (validation.isValid) {
            return { valid: true };
        } else {
            const firstError = Object.values(validation.errors)[0];
            return { valid: false, message: firstError };
        }
    }

    /**
     * 检查用户是否存在（兼容旧版本）
     */
    async userExists(username) {
        try {
            // 在线模式下无法直接检查，返回false让注册接口处理
            return false;
        } catch (error) {
            return false;
        }
    }

    // =============== 系统管理接口 ===============

    /**
     * 重置用户系统
     */
    reset() {
        authManager.reset();
        gameDataManager.reset();
        this.isInitialized = false;
        this.autoLoginAttempted = false;
        
        // 重置兼容属性
        this.currentUser = null;
        this.isGuest = true;
        this.isLoggedIn = false;
        
        console.log('🔄 用户系统已重置');
    }

    /**
     * 获取系统信息
     */
    getSystemInfo() {
        const authState = authManager.getAuthState();
        
        return {
            isInitialized: this.isInitialized,
            isLoggedIn: authState.isLoggedIn,
            currentUser: authState.user?.username || null,
            userLevel: authManager.getUserLevel(),
            levelName: authManager.getUserLevelName(),
            isOnlineMode: true, // 新版本主要使用在线模式
            hasToken: !!authManager.getToken()
        };
    }

    /**
     * 清除所有用户数据（调试用）
     */
    clearAllUsers() {
        this.reset();
        localStorage.clear(); // 清除所有本地存储
        console.log('🧹 所有用户数据已清除');
    }
}

// 创建全局用户管理器实例
const userManager = new UserManager();

// 导出
export default userManager;

// 添加到全局作用域
window.userManager = userManager;

console.log('✅ 用户管理模块已加载（集成API通信版本）');