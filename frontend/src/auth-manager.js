/**
 * 认证管理器 - 处理用户认证、登录状态管理等
 */

import apiClient from './api-client.js';
import { ApiUtils, ApiErrorHandler } from './api-utils.js';
import gameDataManager from './game-data-manager.js';

export class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
        this.listeners = new Map();
        
        // 初始化
        this.init();
    }

    // =================初始化=================

    /**
     * 初始化认证管理器
     */
    async init() {
        try {
            // 检查本地存储的token
            const token = apiClient.getStoredToken();
            if (token) {
                console.log('🔑 发现存储的token，尝试自动登录...');
                await this.validateStoredToken();
            } else {
                console.log('👤 未找到登录token，进入访客模式');
                this.setGuestMode();
            }
        } catch (error) {
            console.error('初始化认证管理器失败:', error);
            this.setGuestMode();
        } finally {
            this.isInitialized = true;
            this.emit('auth:initialized', this.getAuthState());
        }
    }

    /**
     * 验证存储的token
     */
    async validateStoredToken() {
        try {
            const userProfile = await apiClient.getProfile();
            this.setUserLoggedIn(userProfile.user);
            console.log('✅ 自动登录成功:', this.currentUser.username);
        } catch (error) {
            console.warn('⚠️ 存储的token无效，清除并进入访客模式');
            apiClient.setToken(null);
            this.setGuestMode();
        }
    }

    /**
     * 设置访客模式
     */
    setGuestMode() {
        this.currentUser = null;
        this.emit('auth:guest-mode');
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
                    console.error(`认证事件监听器错误 (${event}):`, error);
                }
            });
        }
    }

    // =================用户认证=================

    /**
     * 用户登录
     */
    async login(credentials) {
        try {
            const response = await ApiUtils.handleApiCall(
                () => apiClient.login(credentials),
                {
                    loadingKey: 'user-login',
                    successMessage: `欢迎回来，${credentials.username}！`,
                    errorContext: '用户登录'
                }
            );

            this.setUserLoggedIn(response.user);
            console.log('🔓 用户登录成功:', this.currentUser.username);
            
            // 登录后加载用户数据
            await this.loadUserData();
            
            return response;

        } catch (error) {
            console.error('用户登录失败:', error);
            throw error;
        }
    }

    /**
     * 用户注册
     */
    async register(userData) {
        try {
            const response = await ApiUtils.handleApiCall(
                () => apiClient.register(userData),
                {
                    loadingKey: 'user-register',
                    successMessage: `注册成功，欢迎 ${userData.username}！`,
                    errorContext: '用户注册'
                }
            );

            this.setUserLoggedIn(response.user);
            console.log('📝 用户注册成功:', this.currentUser.username);
            
            return response;

        } catch (error) {
            console.error('用户注册失败:', error);
            throw error;
        }
    }

    /**
     * 用户登出
     */
    async logout() {
        try {
            await apiClient.logout();
            this.setUserLoggedOut();
            console.log('👋 用户登出成功');
            
        } catch (error) {
            console.error('用户登出失败:', error);
            // 即使服务器登出失败，也要清除本地状态
            this.setUserLoggedOut();
        }
    }

    /**
     * 设置用户已登录状态
     */
    setUserLoggedIn(user) {
        this.currentUser = {
            id: user.id,
            username: user.username,
            email: user.email,
            created_at: user.created_at,
            total_games: user.total_games || 0,
            wins: user.wins || 0,
            losses: user.losses || 0,
            draws: user.draws || 0,
            total_time_played: user.total_time_played || 0
        };

        this.emit('auth:login', this.currentUser);
        this.emit('auth:state-changed', this.getAuthState());
    }

    /**
     * 设置用户已登出状态
     */
    setUserLoggedOut() {
        this.currentUser = null;
        
        // 清理相关数据
        gameDataManager.reset();
        
        this.emit('auth:logout');
        this.emit('auth:state-changed', this.getAuthState());
    }

    // =================用户信息管理=================

    /**
     * 更新用户信息
     */
    async updateProfile(userData) {
        try {
            const response = await ApiUtils.handleApiCall(
                () => apiClient.updateProfile(userData),
                {
                    loadingKey: 'update-profile',
                    successMessage: '个人信息更新成功',
                    errorContext: '更新用户信息'
                }
            );

            // 更新本地用户信息
            if (response.user) {
                this.setUserLoggedIn(response.user);
            }

            return response;

        } catch (error) {
            console.error('更新用户信息失败:', error);
            throw error;
        }
    }

    /**
     * 重新加载用户信息
     */
    async refreshUserProfile() {
        if (!this.isLoggedIn()) return null;

        try {
            const response = await apiClient.getProfile();
            this.setUserLoggedIn(response.user);
            return this.currentUser;
        } catch (error) {
            console.error('刷新用户信息失败:', error);
            return null;
        }
    }

    /**
     * 加载用户相关数据
     */
    async loadUserData() {
        if (!this.isLoggedIn()) return;

        try {
            // 并行加载用户统计和游戏历史
            await Promise.allSettled([
                gameDataManager.loadUserStats(),
                gameDataManager.loadGameHistory({ limit: 10 })
            ]);
        } catch (error) {
            console.error('加载用户数据失败:', error);
        }
    }

    // =================状态查询=================

    /**
     * 检查用户是否已登录
     */
    isLoggedIn() {
        return !!this.currentUser && apiClient.isLoggedIn();
    }

    /**
     * 获取当前用户信息
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * 获取认证状态
     */
    getAuthState() {
        return {
            isLoggedIn: this.isLoggedIn(),
            user: this.currentUser,
            isInitialized: this.isInitialized
        };
    }

    /**
     * 获取用户显示名
     */
    getUserDisplayName() {
        return this.currentUser?.username || '访客';
    }

    /**
     * 获取用户等级
     */
    getUserLevel() {
        if (!this.currentUser) return 0;
        
        const totalGames = this.currentUser.total_games || 0;
        if (totalGames < 10) return 1;      // 新手
        if (totalGames < 50) return 2;      // 进阶
        if (totalGames < 200) return 3;     // 高手
        if (totalGames < 500) return 4;     // 专家
        return 5;                           // 大师
    }

    /**
     * 获取用户等级名称
     */
    getUserLevelName() {
        const level = this.getUserLevel();
        const levelNames = {
            0: '访客',
            1: '新手',
            2: '进阶',
            3: '高手', 
            4: '专家',
            5: '大师'
        };
        return levelNames[level] || '未知';
    }

    /**
     * 获取用户胜率
     */
    getUserWinRate() {
        if (!this.currentUser || this.currentUser.total_games === 0) return 0;
        return Math.round((this.currentUser.wins / this.currentUser.total_games) * 100);
    }

    // =================表单验证=================

    /**
     * 验证登录表单
     */
    validateLoginForm(data) {
        const errors = {};

        if (!data.username || data.username.trim().length === 0) {
            errors.username = '请输入用户名';
        }

        if (!data.password || data.password.length === 0) {
            errors.password = '请输入密码';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * 验证注册表单
     */
    validateRegisterForm(data) {
        const errors = {};

        // 用户名验证
        if (!data.username || data.username.trim().length === 0) {
            errors.username = '请输入用户名';
        } else if (data.username.length < 3) {
            errors.username = '用户名至少3个字符';
        } else if (data.username.length > 20) {
            errors.username = '用户名不能超过20个字符';
        } else if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(data.username)) {
            errors.username = '用户名只能包含字母、数字、下划线和中文';
        }

        // 邮箱验证
        if (!data.email || data.email.trim().length === 0) {
            errors.email = '请输入邮箱地址';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            errors.email = '请输入有效的邮箱地址';
        }

        // 密码验证
        if (!data.password || data.password.length === 0) {
            errors.password = '请输入密码';
        } else if (data.password.length < 6) {
            errors.password = '密码至少6个字符';
        } else if (data.password.length > 50) {
            errors.password = '密码不能超过50个字符';
        }

        // 确认密码验证
        if (!data.confirmPassword) {
            errors.confirmPassword = '请确认密码';
        } else if (data.password !== data.confirmPassword) {
            errors.confirmPassword = '两次输入的密码不一致';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    // =================工具方法=================

    /**
     * 格式化用户注册时间
     */
    formatUserJoinDate() {
        if (!this.currentUser?.created_at) return '';
        
        const date = new Date(this.currentUser.created_at);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * 获取用户统计摘要
     */
    getUserStatsSummary() {
        if (!this.currentUser) return null;

        return {
            totalGames: this.currentUser.total_games || 0,
            wins: this.currentUser.wins || 0,
            losses: this.currentUser.losses || 0,
            draws: this.currentUser.draws || 0,
            winRate: this.getUserWinRate(),
            level: this.getUserLevel(),
            levelName: this.getUserLevelName(),
            totalTimePlayed: this.currentUser.total_time_played || 0
        };
    }

    /**
     * 重置认证状态
     */
    reset() {
        this.currentUser = null;
        this.isInitialized = false;
        apiClient.reset();
        console.log('🔄 认证管理器已重置');
    }
}

// 创建全局认证管理器实例
const authManager = new AuthManager();

// 监听认证相关的全局事件
window.addEventListener('auth:logout', () => {
    authManager.setUserLoggedOut();
});

export default authManager;