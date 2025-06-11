/**
 * UI组件库 - 通用UI组件和工具函数
 */

export class UIComponents {
    /**
     * 创建模态对话框
     */
    static createModal(options = {}) {
        const {
            title = '对话框',
            content = '',
            showCloseButton = true,
            className = ''
        } = options;

        const modal = document.createElement('div');
        modal.className = `ui-modal ${className}`;
        modal.innerHTML = `
            <div class="ui-modal-backdrop" onclick="this.parentElement.remove()"></div>
            <div class="ui-modal-content">
                <div class="ui-modal-header">
                    <h3 class="ui-modal-title">${title}</h3>
                    ${showCloseButton ? '<button class="ui-modal-close" onclick="this.closest(\'.ui-modal\').remove()">×</button>' : ''}
                </div>
                <div class="ui-modal-body">
                    ${content}
                </div>
            </div>
        `;

        // 添加样式
        this.ensureModalStyles();
        
        return modal;
    }

    /**
     * 创建按钮
     */
    static createButton(text, options = {}) {
        const {
            type = 'primary',
            size = 'normal',
            disabled = false,
            onclick = null,
            className = ''
        } = options;

        const button = document.createElement('button');
        button.className = `ui-btn ui-btn-${type} ui-btn-${size} ${className}`;
        button.textContent = text;
        button.disabled = disabled;
        
        if (onclick) {
            button.addEventListener('click', onclick);
        }

        return button;
    }

    /**
     * 创建输入框
     */
    static createInput(options = {}) {
        const {
            type = 'text',
            placeholder = '',
            value = '',
            required = false,
            className = ''
        } = options;

        const input = document.createElement('input');
        input.type = type;
        input.placeholder = placeholder;
        input.value = value;
        input.required = required;
        input.className = `ui-input ${className}`;

        return input;
    }

    /**
     * 创建表单组
     */
    static createFormGroup(label, input, error = '') {
        const group = document.createElement('div');
        group.className = 'ui-form-group';
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.className = 'ui-label';
        
        const errorEl = document.createElement('div');
        errorEl.className = 'ui-error';
        errorEl.textContent = error;
        errorEl.style.display = error ? 'block' : 'none';
        
        group.appendChild(labelEl);
        group.appendChild(input);
        group.appendChild(errorEl);
        
        return group;
    }

    /**
     * 确保模态框样式存在
     */
    static ensureModalStyles() {
        if (document.getElementById('ui-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'ui-modal-styles';
        style.textContent = `
            .ui-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .ui-modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
            }

            .ui-modal-content {
                position: relative;
                background: white;
                border-radius: 8px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                max-width: 90%;
                max-height: 90%;
                overflow: auto;
                min-width: 300px;
            }

            .ui-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px;
                border-bottom: 1px solid #eee;
            }

            .ui-modal-title {
                margin: 0;
                color: #333;
                font-size: 18px;
            }

            .ui-modal-close {
                background: none;
                border: none;
                font-size: 24px;
                color: #999;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .ui-modal-close:hover {
                color: #666;
            }

            .ui-modal-body {
                padding: 20px;
            }

            .ui-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
                margin-right: 10px;
                margin-bottom: 10px;
            }

            .ui-btn-primary {
                background: #007bff;
                color: white;
            }

            .ui-btn-primary:hover {
                background: #0056b3;
            }

            .ui-btn-secondary {
                background: #6c757d;
                color: white;
            }

            .ui-btn-secondary:hover {
                background: #545b62;
            }

            .ui-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .ui-input {
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                box-sizing: border-box;
            }

            .ui-input:focus {
                outline: none;
                border-color: #007bff;
                box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
            }

            .ui-form-group {
                margin-bottom: 20px;
            }

            .ui-label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
                color: #555;
            }

            .ui-error {
                color: #dc3545;
                font-size: 12px;
                margin-top: 5px;
            }
        `;

        document.head.appendChild(style);
    }
}