/**
 * API工具类 - 提供API相关的工具函数和错误处理
 */

/**
 * API错误处理器
 */
export class ApiErrorHandler {
    /**
     * 处理API错误并显示用户友好的消息
     */
    static handleError(error, context = '') {
        console.error(`API错误 ${context}:`, error);

        // 获取错误消息
        const message = this.getErrorMessage(error);
        
        // 显示错误通知
        this.showErrorNotification(message, error.type);
        
        // 记录错误日志
        this.logError(error, context);
        
        return message;
    }

    /**
     * 获取用户友好的错误消息
     */
    static getErrorMessage(error) {
        if (error.type === 'NETWORK_ERROR') {
            return '网络连接失败，请检查网络设置';
        }
        
        if (error.type === 'HTTP_ERROR') {
            switch (error.details?.status) {
                case 400:
                    return error.message || '请求参数错误';
                case 401:
                    return '登录已过期，请重新登录';
                case 403:
                    return '权限不足，无法执行此操作';
                case 404:
                    return '请求的资源不存在';
                case 500:
                    return '服务器内部错误，请稍后重试';
                case 502:
                case 503:
                    return '服务暂时不可用，请稍后重试';
                default:
                    return error.message || '未知错误';
            }
        }
        
        return error.message || '操作失败';
    }

    /**
     * 显示错误通知
     */
    static showErrorNotification(message, type = 'error') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `api-notification api-notification-${type}`;
        notification.innerHTML = `
            <div class="api-notification-content">
                <span class="api-notification-icon">${type === 'error' ? '❌' : '⚠️'}</span>
                <span class="api-notification-message">${message}</span>
                <button class="api-notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // 添加样式（如果没有的话）
        this.ensureNotificationStyles();

        // 显示通知
        document.body.appendChild(notification);

        // 自动消失
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * 确保通知样式存在
     */
    static ensureNotificationStyles() {
        if (document.getElementById('api-notification-styles')) return;

        const style = document.createElement('style');
        style.id = 'api-notification-styles';
        style.textContent = `
            .api-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                margin-bottom: 10px;
                animation: slideInRight 0.3s ease-out;
            }

            .api-notification-content {
                display: flex;
                align-items: center;
                padding: 12px 16px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                background: white;
                border-left: 4px solid #dc3545;
            }

            .api-notification-error .api-notification-content {
                border-left-color: #dc3545;
                background: #fff5f5;
            }

            .api-notification-warning .api-notification-content {
                border-left-color: #ffc107;
                background: #fffbf0;
            }

            .api-notification-icon {
                margin-right: 8px;
                font-size: 16px;
            }

            .api-notification-message {
                flex: 1;
                color: #333;
                font-size: 14px;
                line-height: 1.4;
            }

            .api-notification-close {
                background: none;
                border: none;
                font-size: 18px;
                color: #999;
                cursor: pointer;
                margin-left: 8px;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .api-notification-close:hover {
                color: #666;
            }

            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * 记录错误日志
     */
    static logError(error, context) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            context,
            type: error.type,
            message: error.message,
            details: error.details,
            stack: error.stack
        };

        // 存储到本地存储（用于调试）
        const logs = JSON.parse(localStorage.getItem('wuziqi_error_logs') || '[]');
        logs.push(logEntry);
        
        // 只保留最近100条错误日志
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('wuziqi_error_logs', JSON.stringify(logs));
    }

    /**
     * 获取错误日志
     */
    static getErrorLogs() {
        return JSON.parse(localStorage.getItem('wuziqi_error_logs') || '[]');
    }

    /**
     * 清除错误日志
     */
    static clearErrorLogs() {
        localStorage.removeItem('wuziqi_error_logs');
    }
}

/**
 * API响应处理器
 */
export class ApiResponseHandler {
    /**
     * 处理成功响应
     */
    static handleSuccess(response, message = null) {
        if (message) {
            this.showSuccessNotification(message);
        }
        return response;
    }

    /**
     * 显示成功通知
     */
    static showSuccessNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'api-notification api-notification-success';
        notification.innerHTML = `
            <div class="api-notification-content">
                <span class="api-notification-icon">✅</span>
                <span class="api-notification-message">${message}</span>
                <button class="api-notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // 确保样式存在
        this.ensureSuccessStyles();

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }

    /**
     * 确保成功通知样式
     */
    static ensureSuccessStyles() {
        if (document.getElementById('api-success-styles')) return;

        const style = document.createElement('style');
        style.id = 'api-success-styles';
        style.textContent = `
            .api-notification-success .api-notification-content {
                border-left-color: #28a745;
                background: #f8fff9;
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * 处理分页响应
     */
    static handlePaginatedResponse(response) {
        return {
            data: response.data || [],
            pagination: response.pagination || {
                page: 1,
                limit: 20,
                total: 0,
                pages: 0
            },
            ...response
        };
    }
}

/**
 * API请求状态管理器
 */
export class ApiLoadingManager {
    constructor() {
        this.loadingStates = new Map();
    }

    /**
     * 设置加载状态
     */
    setLoading(key, isLoading) {
        this.loadingStates.set(key, isLoading);
        this.updateLoadingUI(key, isLoading);
    }

    /**
     * 获取加载状态
     */
    isLoading(key) {
        return this.loadingStates.get(key) || false;
    }

    /**
     * 更新加载UI
     */
    updateLoadingUI(key, isLoading) {
        // 发送自定义事件，组件可以监听此事件来更新UI
        window.dispatchEvent(new CustomEvent('api:loading', {
            detail: { key, isLoading }
        }));

        // 更新按钮状态
        const button = document.querySelector(`[data-api-key="${key}"]`);
        if (button) {
            button.disabled = isLoading;
            if (isLoading) {
                button.classList.add('api-loading');
                if (!button.dataset.originalText) {
                    button.dataset.originalText = button.textContent;
                }
                button.textContent = '加载中...';
            } else {
                button.classList.remove('api-loading');
                if (button.dataset.originalText) {
                    button.textContent = button.dataset.originalText;
                }
            }
        }
    }

    /**
     * 清除所有加载状态
     */
    clearAll() {
        for (const key of this.loadingStates.keys()) {
            this.setLoading(key, false);
        }
    }
}

// 创建全局加载管理器实例
export const apiLoadingManager = new ApiLoadingManager();

/**
 * API缓存管理器
 */
export class ApiCacheManager {
    constructor(maxAge = 5 * 60 * 1000) { // 默认5分钟
        this.cache = new Map();
        this.maxAge = maxAge;
    }

    /**
     * 获取缓存key
     */
    getCacheKey(endpoint, params = {}) {
        const paramString = JSON.stringify(params);
        return `${endpoint}:${paramString}`;
    }

    /**
     * 设置缓存
     */
    set(endpoint, params, data) {
        const key = this.getCacheKey(endpoint, params);
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * 获取缓存
     */
    get(endpoint, params = {}) {
        const key = this.getCacheKey(endpoint, params);
        const cached = this.cache.get(key);
        
        if (!cached) return null;
        
        // 检查是否过期
        if (Date.now() - cached.timestamp > this.maxAge) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }

    /**
     * 清除缓存
     */
    clear(endpoint = null) {
        if (endpoint) {
            // 清除特定端点的所有缓存
            for (const key of this.cache.keys()) {
                if (key.startsWith(endpoint)) {
                    this.cache.delete(key);
                }
            }
        } else {
            // 清除所有缓存
            this.cache.clear();
        }
    }

    /**
     * 清除过期缓存
     */
    clearExpired() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.maxAge) {
                this.cache.delete(key);
            }
        }
    }
}

// 创建全局缓存管理器实例
export const apiCacheManager = new ApiCacheManager();

/**
 * API工具函数
 */
export const ApiUtils = {
    /**
     * 格式化API错误消息
     */
    formatErrorMessage: (error) => ApiErrorHandler.getErrorMessage(error),

    /**
     * 处理API调用（带错误处理和加载状态）
     */
    async handleApiCall(apiCall, options = {}) {
        const {
            loadingKey = null,
            successMessage = null,
            errorContext = '',
            useCache = false,
            cacheKey = null
        } = options;

        try {
            // 设置加载状态
            if (loadingKey) {
                apiLoadingManager.setLoading(loadingKey, true);
            }

            // 检查缓存
            if (useCache && cacheKey) {
                const cached = apiCacheManager.get(cacheKey);
                if (cached) {
                    return cached;
                }
            }

            // 执行API调用
            const response = await apiCall();

            // 缓存响应
            if (useCache && cacheKey) {
                apiCacheManager.set(cacheKey, {}, response);
            }

            // 处理成功响应
            return ApiResponseHandler.handleSuccess(response, successMessage);

        } catch (error) {
            // 处理错误
            ApiErrorHandler.handleError(error, errorContext);
            throw error;
        } finally {
            // 清除加载状态
            if (loadingKey) {
                apiLoadingManager.setLoading(loadingKey, false);
            }
        }
    },

    /**
     * 防抖API调用
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * 节流API调用
     */
    throttle(func, wait) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, wait);
            }
        };
    }
};