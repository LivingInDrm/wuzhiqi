/**
 * 用户管理模块 - 极简用户注册系统
 * 支持用户注册、登录、游客模式
 * 数据存储基于localStorage
 */

export class UserManager {
    constructor() {
        this.STORAGE_KEYS = {
            USERS: 'wuziqi_users',
            CURRENT_SESSION: 'wuziqi_current_session'
        };
        
        this.currentUser = null;
        this.isGuest = true;
        this.isLoggedIn = false;
        
        // 初始化时检查是否有已登录的会话
        this.loadSession();
        
        console.log('用户管理系统初始化完成', {
            isLoggedIn: this.isLoggedIn,
            isGuest: this.isGuest,
            currentUser: this.currentUser?.username || '游客'
        });
    }
    
    // =============== 用户注册 ===============
    
    /**
     * 用户注册
     * @param {string} username - 用户名
     * @param {string} password - 密码
     * @returns {Object} 注册结果
     */
    register(username, password) {
        console.log('🔐 开始用户注册:', username);
        
        // 基本验证
        const validation = this.validateUserInput(username, password);
        if (!validation.valid) {
            return { success: false, message: validation.message };
        }
        
        // 检查用户名是否已存在
        if (this.userExists(username)) {
            return { success: false, message: '用户名已存在，请选择其他用户名' };
        }
        
        // 创建新用户
        const newUser = {
            username: username.trim(),
            passwordHash: this.hashPassword(password),
            registeredAt: new Date().toISOString(),
            gamesPlayed: 0,
            gamesWon: 0,
            totalScore: 0,
            lastLoginAt: new Date().toISOString()
        };
        
        // 保存用户数据
        this.saveUser(newUser);
        
        console.log('✅ 用户注册成功:', username);
        return { success: true, message: '注册成功！', user: newUser };
    }
    
    // =============== 用户登录 ===============
    
    /**
     * 用户登录
     * @param {string} username - 用户名
     * @param {string} password - 密码
     * @returns {Object} 登录结果
     */
    login(username, password) {
        console.log('🔑 开始用户登录:', username);
        
        // 基本验证
        const validation = this.validateUserInput(username, password);
        if (!validation.valid) {
            return { success: false, message: validation.message };
        }
        
        // 获取用户数据
        const user = this.getUser(username);
        if (!user) {
            return { success: false, message: '用户名不存在' };
        }
        
        // 验证密码
        if (user.passwordHash !== this.hashPassword(password)) {
            return { success: false, message: '密码错误' };
        }
        
        // 更新最后登录时间
        user.lastLoginAt = new Date().toISOString();
        this.saveUser(user);
        
        // 设置当前会话
        this.setCurrentSession(user);
        
        console.log('✅ 用户登录成功:', username);
        return { success: true, message: '登录成功！', user: user };
    }
    
    // =============== 会话管理 ===============
    
    /**
     * 设置当前会话
     * @param {Object} user - 用户对象
     */
    setCurrentSession(user) {
        this.currentUser = user;
        this.isLoggedIn = true;
        this.isGuest = false;
        
        // 保存会话到localStorage
        const sessionData = {
            username: user.username,
            loginTime: new Date().toISOString()
        };
        localStorage.setItem(this.STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(sessionData));
        
        console.log('📱 会话已设置:', user.username);
    }
    
    /**
     * 加载已保存的会话
     */
    loadSession() {
        try {
            const sessionData = localStorage.getItem(this.STORAGE_KEYS.CURRENT_SESSION);
            if (sessionData) {
                const session = JSON.parse(sessionData);
                const user = this.getUser(session.username);
                
                if (user) {
                    this.currentUser = user;
                    this.isLoggedIn = true;
                    this.isGuest = false;
                    console.log('📱 恢复会话:', user.username);
                } else {
                    // 用户数据不存在，清除无效会话
                    this.clearSession();
                }
            }
        } catch (error) {
            console.error('❌ 加载会话失败:', error);
            this.clearSession();
        }
    }
    
    /**
     * 退出登录
     */
    logout() {
        console.log('🚪 用户退出登录:', this.currentUser?.username || '未知用户');
        this.clearSession();
    }
    
    /**
     * 清除当前会话
     */
    clearSession() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.isGuest = true;
        
        // 清除localStorage中的会话数据
        localStorage.removeItem(this.STORAGE_KEYS.CURRENT_SESSION);
        
        console.log('📱 会话已清除，切换到游客模式');
    }
    
    // =============== 数据存储 ===============
    
    /**
     * 保存用户数据
     * @param {Object} user - 用户对象
     */
    saveUser(user) {
        const users = this.getAllUsers();
        users[user.username] = user;
        localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
    }
    
    /**
     * 获取用户数据
     * @param {string} username - 用户名
     * @returns {Object|null} 用户对象
     */
    getUser(username) {
        const users = this.getAllUsers();
        return users[username] || null;
    }
    
    /**
     * 获取所有用户数据
     * @returns {Object} 用户数据字典
     */
    getAllUsers() {
        try {
            const usersData = localStorage.getItem(this.STORAGE_KEYS.USERS);
            return usersData ? JSON.parse(usersData) : {};
        } catch (error) {
            console.error('❌ 获取用户数据失败:', error);
            return {};
        }
    }
    
    /**
     * 检查用户是否存在
     * @param {string} username - 用户名
     * @returns {boolean} 是否存在
     */
    userExists(username) {
        return this.getUser(username) !== null;
    }
    
    // =============== 工具函数 ===============
    
    /**
     * 验证用户输入
     * @param {string} username - 用户名
     * @param {string} password - 密码
     * @returns {Object} 验证结果
     */
    validateUserInput(username, password) {
        if (!username || !password) {
            return { valid: false, message: '用户名和密码不能为空' };
        }
        
        username = username.trim();
        
        if (username.length < 2) {
            return { valid: false, message: '用户名至少需要2个字符' };
        }
        
        if (username.length > 20) {
            return { valid: false, message: '用户名不能超过20个字符' };
        }
        
        if (password.length < 4) {
            return { valid: false, message: '密码至少需要4个字符' };
        }
        
        if (password.length > 50) {
            return { valid: false, message: '密码不能超过50个字符' };
        }
        
        // 检查用户名是否包含特殊字符
        if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
            return { valid: false, message: '用户名只能包含字母、数字、下划线和中文' };
        }
        
        return { valid: true };
    }
    
    /**
     * 简单密码哈希（仅用于演示，实际项目应使用更安全的方法）
     * @param {string} password - 明文密码
     * @returns {string} 哈希后的密码
     */
    hashPassword(password) {
        // 使用btoa进行简单编码（仅用于演示）
        // 实际项目中应该使用更安全的哈希算法
        return btoa(password + 'wuziqi_salt');
    }
    
    // =============== 游戏集成接口 ===============
    
    /**
     * 获取当前用户显示名称
     * @returns {string} 显示名称
     */
    getCurrentUserDisplayName() {
        if (this.isLoggedIn && this.currentUser) {
            return this.currentUser.username;
        }
        return '游客';
    }
    
    /**
     * 获取当前用户类型
     * @returns {string} 用户类型
     */
    getCurrentUserType() {
        return this.isLoggedIn ? 'registered' : 'guest';
    }
    
    /**
     * 检查是否为注册用户
     * @returns {boolean} 是否为注册用户
     */
    isRegisteredUser() {
        return this.isLoggedIn && !this.isGuest;
    }
    
    // =============== 积分系统接口（预留） ===============
    
    /**
     * 记录游戏结果（为未来积分系统预留）
     * @param {Object} gameResult - 游戏结果
     */
    recordGameResult(gameResult) {
        if (!this.isRegisteredUser()) {
            console.log('🎮 游客模式，不记录游戏结果');
            return;
        }
        
        console.log('🎮 记录游戏结果:', gameResult);
        
        // 更新用户统计数据
        this.currentUser.gamesPlayed = (this.currentUser.gamesPlayed || 0) + 1;
        
        if (gameResult.isWin) {
            this.currentUser.gamesWon = (this.currentUser.gamesWon || 0) + 1;
        }
        
        // 计算积分（简单规则）
        let scoreToAdd = 0;
        if (gameResult.isWin) {
            scoreToAdd = gameResult.difficulty === 'professional' ? 30 : 
                        gameResult.difficulty === 'advanced' ? 20 : 10;
        } else {
            scoreToAdd = 5; // 参与奖励
        }
        
        this.currentUser.totalScore = (this.currentUser.totalScore || 0) + scoreToAdd;
        
        // 保存更新后的用户数据
        this.saveUser(this.currentUser);
        
        console.log('📊 用户统计已更新:', {
            gamesPlayed: this.currentUser.gamesPlayed,
            gamesWon: this.currentUser.gamesWon,
            totalScore: this.currentUser.totalScore
        });
    }
    
    /**
     * 获取用户统计信息
     * @returns {Object|null} 用户统计
     */
    getUserStats() {
        if (!this.isRegisteredUser()) {
            return null;
        }
        
        return {
            username: this.currentUser.username,
            gamesPlayed: this.currentUser.gamesPlayed || 0,
            gamesWon: this.currentUser.gamesWon || 0,
            totalScore: this.currentUser.totalScore || 0,
            winRate: this.currentUser.gamesPlayed > 0 ? 
                    Math.round((this.currentUser.gamesWon / this.currentUser.gamesPlayed) * 100) : 0,
            registeredAt: this.currentUser.registeredAt
        };
    }
    
    // =============== 调试接口 ===============
    
    /**
     * 清除所有用户数据（调试用）
     */
    clearAllUsers() {
        localStorage.removeItem(this.STORAGE_KEYS.USERS);
        localStorage.removeItem(this.STORAGE_KEYS.CURRENT_SESSION);
        this.clearSession();
        console.log('🧹 所有用户数据已清除');
    }
    
    /**
     * 获取系统信息（调试用）
     */
    getSystemInfo() {
        const users = this.getAllUsers();
        return {
            totalUsers: Object.keys(users).length,
            currentUser: this.currentUser?.username || null,
            isLoggedIn: this.isLoggedIn,
            isGuest: this.isGuest,
            users: Object.keys(users)
        };
    }
}