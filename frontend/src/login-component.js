/**
 * 登录组件 - 处理用户登录和注册界面
 */

import { UIComponents } from './ui-components.js';
import authManager from './auth-manager.js';

export class LoginComponent {
    constructor() {
        this.currentModal = null;
        this.isLoading = false;
        
        // 监听认证状态变化
        authManager.addEventListener('auth:login', () => this.closeModal());
        authManager.addEventListener('auth:logout', () => this.handleLogout());
    }

    /**
     * 显示登录模态框
     */
    showLoginModal() {
        if (this.currentModal) {
            this.currentModal.remove();
        }

        const modalContent = this.createLoginForm();
        this.currentModal = UIComponents.createModal({
            title: '🔑 用户登录',
            content: modalContent,
            className: 'login-modal'
        });

        document.body.appendChild(this.currentModal);
        
        // 聚焦到用户名输入框
        setTimeout(() => {
            const usernameInput = this.currentModal.querySelector('#loginUsername');
            if (usernameInput) usernameInput.focus();
        }, 100);
    }

    /**
     * 显示注册模态框
     */
    showRegisterModal() {
        if (this.currentModal) {
            this.currentModal.remove();
        }

        const modalContent = this.createRegisterForm();
        this.currentModal = UIComponents.createModal({
            title: '📝 用户注册',
            content: modalContent,
            className: 'register-modal'
        });

        document.body.appendChild(this.currentModal);
        
        // 聚焦到用户名输入框
        setTimeout(() => {
            const usernameInput = this.currentModal.querySelector('#regUsername');
            if (usernameInput) usernameInput.focus();
        }, 100);
    }

    /**
     * 创建登录表单
     */
    createLoginForm() {
        return `
            <form id="loginForm" class="auth-form">
                <div class="ui-form-group">
                    <label class="ui-label">用户名</label>
                    <input type="text" id="loginUsername" class="ui-input" placeholder="请输入用户名" required>
                    <div class="ui-error" id="loginUsernameError"></div>
                </div>
                
                <div class="ui-form-group">
                    <label class="ui-label">密码</label>
                    <input type="password" id="loginPassword" class="ui-input" placeholder="请输入密码" required>
                    <div class="ui-error" id="loginPasswordError"></div>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="ui-btn ui-btn-primary" id="loginSubmitBtn">
                        登录
                    </button>
                    <button type="button" class="ui-btn ui-btn-secondary" onclick="loginComponent.showRegisterModal()">
                        没有账号？注册
                    </button>
                </div>
                
                <div class="auth-tips">
                    <p>💡 提示：登录后可以保存游戏记录和查看统计数据</p>
                    <p>🎮 也可以选择<button type="button" class="link-btn" onclick="loginComponent.closeModal()">跳过登录</button>直接开始游戏</p>
                </div>
            </form>
        `;
    }

    /**
     * 创建注册表单
     */
    createRegisterForm() {
        return `
            <form id="registerForm" class="auth-form">
                <div class="ui-form-group">
                    <label class="ui-label">用户名</label>
                    <input type="text" id="regUsername" class="ui-input" placeholder="3-20个字符，支持中英文" required>
                    <div class="ui-error" id="regUsernameError"></div>
                </div>
                
                <div class="ui-form-group">
                    <label class="ui-label">邮箱</label>
                    <input type="email" id="regEmail" class="ui-input" placeholder="请输入邮箱地址" required>
                    <div class="ui-error" id="regEmailError"></div>
                </div>
                
                <div class="ui-form-group">
                    <label class="ui-label">密码</label>
                    <input type="password" id="regPassword" class="ui-input" placeholder="至少6个字符" required>
                    <div class="ui-error" id="regPasswordError"></div>
                </div>
                
                <div class="ui-form-group">
                    <label class="ui-label">确认密码</label>
                    <input type="password" id="regConfirmPassword" class="ui-input" placeholder="请再次输入密码" required>
                    <div class="ui-error" id="regConfirmPasswordError"></div>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="ui-btn ui-btn-primary" id="registerSubmitBtn">
                        注册
                    </button>
                    <button type="button" class="ui-btn ui-btn-secondary" onclick="loginComponent.showLoginModal()">
                        已有账号？登录
                    </button>
                </div>
                
                <div class="auth-tips">
                    <p>📝 注册后可以保存游戏记录，与其他玩家比较成绩</p>
                </div>
            </form>
        `;
    }

    /**
     * 初始化事件监听器
     */
    initEventListeners() {
        // 使用事件委托处理表单提交
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'loginForm') {
                e.preventDefault();
                this.handleLogin();
            } else if (e.target.id === 'registerForm') {
                e.preventDefault();
                this.handleRegister();
            }
        });

        // 处理回车键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.currentModal) {
                const activeForm = this.currentModal.querySelector('form');
                if (activeForm) {
                    e.preventDefault();
                    activeForm.dispatchEvent(new Event('submit'));
                }
            }
        });
    }

    /**
     * 处理登录
     */
    async handleLogin() {
        if (this.isLoading) return;

        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        // 清除之前的错误
        this.clearErrors(['loginUsername', 'loginPassword']);

        // 验证表单
        const validation = authManager.validateLoginForm({ username, password });
        if (!validation.isValid) {
            this.showErrors(validation.errors);
            return;
        }

        // 设置加载状态
        this.setLoading(true, 'loginSubmitBtn', '登录中...');

        try {
            await authManager.login({ username, password });
            // 登录成功，模态框会被自动关闭
        } catch (error) {
            // 显示错误消息
            this.showErrors({ general: error.message });
        } finally {
            this.setLoading(false, 'loginSubmitBtn', '登录');
        }
    }

    /**
     * 处理注册
     */
    async handleRegister() {
        if (this.isLoading) return;

        const userData = {
            username: document.getElementById('regUsername').value.trim(),
            email: document.getElementById('regEmail').value.trim(),
            password: document.getElementById('regPassword').value,
            confirmPassword: document.getElementById('regConfirmPassword').value
        };

        // 清除之前的错误
        this.clearErrors(['regUsername', 'regEmail', 'regPassword', 'regConfirmPassword']);

        // 验证表单
        const validation = authManager.validateRegisterForm(userData);
        if (!validation.isValid) {
            this.showErrors(validation.errors);
            return;
        }

        // 设置加载状态
        this.setLoading(true, 'registerSubmitBtn', '注册中...');

        try {
            await authManager.register(userData);
            // 注册成功，模态框会被自动关闭
        } catch (error) {
            // 显示错误消息
            this.showErrors({ general: error.message });
        } finally {
            this.setLoading(false, 'registerSubmitBtn', '注册');
        }
    }

    /**
     * 显示表单错误
     */
    showErrors(errors) {
        for (const [field, message] of Object.entries(errors)) {
            if (field === 'general') {
                // 显示通用错误消息
                this.showGeneralError(message);
            } else {
                const errorElement = document.getElementById(`${field}Error`);
                if (errorElement) {
                    errorElement.textContent = message;
                    errorElement.style.display = 'block';
                }
            }
        }
    }

    /**
     * 清除表单错误
     */
    clearErrors(fields) {
        fields.forEach(field => {
            const errorElement = document.getElementById(`${field}Error`);
            if (errorElement) {
                errorElement.textContent = '';
                errorElement.style.display = 'none';
            }
        });

        // 清除通用错误
        const generalError = this.currentModal?.querySelector('.general-error');
        if (generalError) {
            generalError.remove();
        }
    }

    /**
     * 显示通用错误消息
     */
    showGeneralError(message) {
        // 移除之前的通用错误
        const existingError = this.currentModal?.querySelector('.general-error');
        if (existingError) {
            existingError.remove();
        }

        // 添加新的错误消息
        const errorDiv = document.createElement('div');
        errorDiv.className = 'general-error';
        errorDiv.style.cssText = `
            background: #f8d7da;
            color: #721c24;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 15px;
            border: 1px solid #f5c6cb;
        `;
        errorDiv.textContent = message;

        const form = this.currentModal?.querySelector('form');
        if (form) {
            form.insertBefore(errorDiv, form.firstChild);
        }
    }

    /**
     * 设置加载状态
     */
    setLoading(loading, buttonId, text) {
        this.isLoading = loading;
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = loading;
            button.textContent = text;
        }
    }

    /**
     * 关闭模态框
     */
    closeModal() {
        if (this.currentModal) {
            this.currentModal.remove();
            this.currentModal = null;
        }
    }

    /**
     * 处理登出
     */
    handleLogout() {
        // 登出时可以执行的清理操作
        console.log('用户已登出');
    }
}

// 创建全局实例
const loginComponent = new LoginComponent();

// 页面加载后初始化
document.addEventListener('DOMContentLoaded', () => {
    loginComponent.initEventListeners();
});

// 导出组件
export default loginComponent;

// 添加到全局作用域（用于HTML中的事件处理）
window.loginComponent = loginComponent;