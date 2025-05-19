/**
 * Toast提示框模块
 * 提供全局通知功能
 */

/**
 * 创建一个提示框
 * @param {string} message - 提示消息
 * @param {string} type - 提示类型 (info, success, warning, error)
 * @param {number} duration - 显示时长（毫秒）
 */
export function showToast(message, type = 'info', duration = 5000) {
    // 获取或创建提示框容器
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
        
        // 添加样式
        if (!document.getElementById('toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                .toast-container {
                    z-index: 1050;
                }
                .toast {
                    max-width: 350px;
                    margin-bottom: 10px;
                    opacity: 1;
                    transition: opacity 0.3s ease;
                }
                .toast-hide {
                    opacity: 0;
                }
                .toast-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 20px;
                    height: 20px;
                    margin-right: 8px;
                }
                .toast-info {
                    background-color: #f8f9fa;
                    border-left: 4px solid #0d6efd;
                }
                .toast-success {
                    background-color: #f8f9fa;
                    border-left: 4px solid #198754;
                }
                .toast-warning {
                    background-color: #f8f9fa;
                    border-left: 4px solid #ffc107;
                }
                .toast-error {
                    background-color: #f8f9fa;
                    border-left: 4px solid #dc3545;
                }
                .dark-theme .toast {
                    background-color: #2c2c2c;
                    color: #e9ecef;
                }
                .dark-theme .toast-header {
                    background-color: #343a40;
                    color: #e9ecef;
                    border-color: #495057;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // 根据类型设置图标和标题
    let icon, title;
    switch (type) {
        case 'success':
            icon = '<i class="bi bi-check-circle text-success"></i>';
            title = '成功';
            break;
        case 'warning':
            icon = '<i class="bi bi-exclamation-triangle text-warning"></i>';
            title = '警告';
            break;
        case 'error':
            icon = '<i class="bi bi-x-circle text-danger"></i>';
            title = '错误';
            break;
        default: // info
            icon = '<i class="bi bi-info-circle text-primary"></i>';
            title = '信息';
    }
    
    // 创建提示框元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-header">
            <span class="toast-icon">${icon}</span>
            <strong class="me-auto">${title}</strong>
            <button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
        <div class="toast-body">${message}</div>
    `;
    
    // 添加到容器
    container.appendChild(toast);
    
    // 设置自动消失
    setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
    
    return toast;
}