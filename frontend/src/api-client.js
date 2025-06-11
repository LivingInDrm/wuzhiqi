/**
 * API客户端 - 前端与后端通信的基础设施
 * 提供统一的HTTP请求接口，处理认证、错误、响应等
 */

class ApiClient {
    constructor(baseURL = 'http://localhost:3000/api') {
        this.baseURL = baseURL;
        this.token = this.getStoredToken();
        
        // 请求拦截器配置
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
        
        // 响应状态码配置
        this.statusMessages = {
            400: '请求参数错误',
            401: '未授权，请重新登录',
            403: '权限不足',
            404: '资源不存在',
            500: '服务器内部错误',
            502: '网关错误',
            503: '服务不可用'
        };
    }

    /**
     * 获取存储的token
     */
    getStoredToken() {
        return localStorage.getItem('wuziqi_token');
    }

    /**
     * 设置认证token
     */
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('wuziqi_token', token);
        } else {
            localStorage.removeItem('wuziqi_token');
        }
    }

    /**
     * 获取认证headers
     */
    getAuthHeaders() {
        const headers = { ...this.defaultHeaders };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    /**
     * 通用HTTP请求方法
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            method: 'GET',
            headers: this.getAuthHeaders(),
            ...options
        };

        // 如果有body数据，转换为JSON
        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            console.log(`🌐 API请求: ${config.method} ${url}`);
            
            const response = await fetch(url, config);
            
            // 处理响应
            return await this.handleResponse(response, endpoint);
            
        } catch (error) {
            console.error('🚨 API请求失败:', error);
            throw this.createApiError('网络连接失败', 'NETWORK_ERROR', error);
        }
    }

    /**
     * 处理HTTP响应
     */
    async handleResponse(response, endpoint) {
        const contentType = response.headers.get('content-type');
        
        // 解析响应数据
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        // 成功响应
        if (response.ok) {
            console.log(`✅ API响应成功: ${endpoint}`, data);
            return data;
        }

        // 处理认证失败
        if (response.status === 401) {
            console.warn('🔒 认证失败，清除token');
            this.setToken(null);
            window.dispatchEvent(new CustomEvent('auth:logout'));
        }

        // 创建错误对象
        const errorMessage = data.message || this.statusMessages[response.status] || '未知错误';
        const error = this.createApiError(errorMessage, 'HTTP_ERROR', {
            status: response.status,
            data,
            endpoint
        });

        console.error(`❌ API响应错误: ${endpoint}`, error);
        throw error;
    }

    /**
     * 创建标准化的API错误对象
     */
    createApiError(message, type, details = null) {
        const error = new Error(message);
        error.type = type;
        error.details = details;
        error.timestamp = new Date().toISOString();
        return error;
    }

    // =================HTTP方法封装=================

    /**
     * GET请求
     */
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    /**
     * POST请求
     */
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: data
        });
    }

    /**
     * PUT请求
     */
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: data
        });
    }

    /**
     * DELETE请求
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // =================认证API=================

    /**
     * 用户注册
     */
    async register(userData) {
        const response = await this.post('/auth/register', userData);
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    /**
     * 用户登录
     */
    async login(credentials) {
        const response = await this.post('/auth/login', credentials);
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    /**
     * 用户登出
     */
    async logout() {
        this.setToken(null);
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return { message: '登出成功' };
    }

    /**
     * 获取用户信息
     */
    async getProfile() {
        return this.get('/auth/profile');
    }

    /**
     * 更新用户信息
     */
    async updateProfile(userData) {
        return this.put('/auth/profile', userData);
    }

    // =================游戏记录API=================

    /**
     * 记录游戏结果
     */
    async recordGame(gameData) {
        return this.post('/games/record', gameData);
    }

    /**
     * 获取游戏历史
     */
    async getGameHistory(params = {}) {
        const defaultParams = {
            page: 1,
            limit: 20,
            sortBy: 'created_at',
            sortOrder: 'DESC'
        };
        return this.get('/games/history', { ...defaultParams, ...params });
    }

    /**
     * 获取用户统计
     */
    async getUserStats() {
        return this.get('/games/stats');
    }

    /**
     * 获取全局统计
     */
    async getGlobalStats() {
        return this.get('/games/global-stats');
    }

    /**
     * 删除游戏记录
     */
    async deleteGameRecord(recordId) {
        return this.delete(`/games/record/${recordId}`);
    }

    /**
     * 批量删除游戏记录
     */
    async deleteGameRecords(recordIds) {
        return this.delete('/games/records', { recordIds });
    }

    /**
     * 获取指定用户的游戏历史（公开接口）
     */
    async getUserGameHistory(userId, params = {}) {
        const defaultParams = {
            page: 1,
            limit: 10
        };
        return this.get(`/games/history/${userId}`, { ...defaultParams, ...params });
    }

    /**
     * 获取排行榜
     */
    async getLeaderboard(params = {}) {
        const defaultParams = {
            type: 'win_rate',
            limit: 20,
            difficulty: 'all'
        };
        return this.get('/games/leaderboard', { ...defaultParams, ...params });
    }

    // =================健康检查和工具方法=================

    /**
     * 健康检查
     */
    async healthCheck() {
        return this.get('/health');
    }

    /**
     * 检查用户是否已登录
     */
    isLoggedIn() {
        return !!this.token;
    }

    /**
     * 获取当前用户token
     */
    getToken() {
        return this.token;
    }

    /**
     * 重置API客户端状态
     */
    reset() {
        this.setToken(null);
    }
}

// 创建全局API客户端实例
const apiClient = new ApiClient();

// 导出API客户端
export default apiClient;