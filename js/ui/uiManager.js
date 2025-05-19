/**
 * UI管理器
 * 负责管理界面元素、模态窗口和UI状态
 */

export class UIManager {
    constructor() {
        this.dictionaryModal = document.getElementById('dictionaryModal');
        this.wordDetailModal = document.getElementById('wordDetailModal');
        this.overlay = document.getElementById('overlay');
        this.events = null; // 事件总线，将在初始化时设置
        
        // 设置ESC键全局监听
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideWordDetailModal();
                this.hideDictionaryModal();
            }
        });
    }
    
    /**
     * 设置事件总线
     * @param {Object} eventEmitter - 事件总线实例
     */
    setEventEmitter(eventEmitter) {
        this.events = eventEmitter;
    }
    
    /**
     * 显示词典管理模态窗口
     */
    showDictionaryModal() {
        // 确保模态窗口元素存在
        if (!this.dictionaryModal || !this.overlay) {
            console.error('模态窗口元素未找到');
            return;
        }
        
        // 移除hidden类显示模态窗口和遮罩层
        this.dictionaryModal.classList.remove('hidden');
        this.overlay.classList.remove('hidden');
        
        // 添加事件监听，点击遮罩层时关闭模态窗口
        const self = this;
        const closeOnOverlayClick = function(e) {
            if (e.target === self.overlay) {
                self.hideDictionaryModal();
                self.overlay.removeEventListener('click', closeOnOverlayClick);
            }
        };
        this.overlay.addEventListener('click', closeOnOverlayClick);
    }
    
    /**
     * 隐藏词典管理模态窗口
     */
    hideDictionaryModal() {
        if (this.dictionaryModal && this.overlay) {
            this.dictionaryModal.classList.add('hidden');
            this.overlay.classList.add('hidden');
        }
    }
    
    /**
     * 显示词汇详情模态窗口
     */
    showWordDetailModal() {
        // 确保模态窗口元素存在
        if (!this.wordDetailModal || !this.overlay) {
            console.error('模态窗口元素未找到');
            return;
        }
        
        // 移除hidden类显示模态窗口和遮罩层
        this.wordDetailModal.classList.remove('hidden');
        this.overlay.classList.remove('hidden');
        
        // 添加事件监听，点击遮罩层时关闭模态窗口
        const self = this;
        const closeOnOverlayClick = function(e) {
            if (e.target === self.overlay) {
                self.hideWordDetailModal();
                self.overlay.removeEventListener('click', closeOnOverlayClick);
            }
        };
        this.overlay.addEventListener('click', closeOnOverlayClick);
        
        // 为Esc键添加关闭功能
        const closeOnEsc = function(e) {
            if (e.key === 'Escape') {
                self.hideWordDetailModal();
                document.removeEventListener('keydown', closeOnEsc);
            }
        };
        document.addEventListener('keydown', closeOnEsc);
    }
    
    /**
     * 隐藏词汇详情模态窗口
     */
    hideWordDetailModal() {
        if (this.wordDetailModal && this.overlay) {
            this.wordDetailModal.classList.add('hidden');
            this.overlay.classList.add('hidden');
        }
    }
    
    /**
     * 设置词汇详情加载状态
     * @param {boolean} isLoading - 是否正在加载
     */
    setWordDetailLoading(isLoading) {
        const content = document.getElementById('wordDetailContent');
        const buttons = document.querySelectorAll('#wordDetailModal .modal-footer button');
        
        if (isLoading) {
            content.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">正在生成内容...</p></div>';
            buttons.forEach(button => button.disabled = true);
        } else {
            buttons.forEach(button => button.disabled = false);
        }
    }
    
    /**
     * 创建提示框
     * @param {string} message - 提示消息
     * @param {string} type - 提示类型
     * @returns {HTMLElement} 创建的提示框元素
     */
    createToast(message, type = 'info') {
        const toastContainer = this.getToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-header">
                ${this.getToastIcon(type)}
                <strong class="me-auto">${this.getToastTitle(type)}</strong>
                <button type="button" class="btn-close" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
            <div class="toast-body">${message}</div>
        `;
        
        toastContainer.appendChild(toast);
        
        // 设置自动消失
        setTimeout(() => {
            toast.classList.add('toast-hide');
            setTimeout(() => toast.remove(), 500);
        }, 5000);
        
        return toast;
    }
    
    /**
     * 获取提示框容器
     * @returns {HTMLElement} 提示框容器
     */
    getToastContainer() {
        let container = document.getElementById('toast-container');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(container);
            
            // 添加提示框样式
            if (!document.getElementById('toast-styles')) {
                const style = document.createElement('style');
                style.id = 'toast-styles';
                style.textContent = `
                    .toast-container { z-index: 1050; }
                    .toast { max-width: 350px; opacity: 1; transition: opacity 0.5s ease; margin-bottom: 0.5rem; }
                    .toast-hide { opacity: 0; }
                    .toast-info { background-color: #f8f9fa; border-left: 4px solid #0d6efd; }
                    .toast-success { background-color: #f8f9fa; border-left: 4px solid #198754; }
                    .toast-warning { background-color: #f8f9fa; border-left: 4px solid #ffc107; }
                    .toast-error { background-color: #f8f9fa; border-left: 4px solid #dc3545; }
                    .dark-theme .toast { background-color: #2c2c2c; color: #e9ecef; border-color: #495057; }
                    .dark-theme .toast-header { background-color: #343a40; color: #e9ecef; border-color: #495057; }
                `;
                document.head.appendChild(style);
            }
        }
        
        return container;
    }
    
    /**
     * 获取提示框图标
     * @param {string} type - 提示类型
     * @returns {string} 提示框图标HTML
     */
    getToastIcon(type) {
        const icons = {
            info: '<i class="bi bi-info-circle text-primary"></i>',
            success: '<i class="bi bi-check-circle text-success"></i>',
            warning: '<i class="bi bi-exclamation-triangle text-warning"></i>',
            error: '<i class="bi bi-x-circle text-danger"></i>'
        };
        
        return icons[type] || icons.info;
    }
    
    /**
     * 获取提示框标题
     * @param {string} type - 提示类型
     * @returns {string} 提示框标题
     */
    getToastTitle(type) {
        const titles = {
            info: '信息',
            success: '成功',
            warning: '警告',
            error: '错误'
        };
        
        return titles[type] || titles.info;
    }
    
    /**
     * 更新词汇列表
     * @param {Array} words - 词汇列表
     */
    updateWordList(words) {
        const wordListContainer = document.getElementById('wordListContainer');
        
        // 清空现有内容
        wordListContainer.innerHTML = '';
        
        if (words.length === 0) {
            wordListContainer.innerHTML = '<div class="word-list-empty">当前词典为空，请处理文本添加词汇</div>';
            return;
        }
        
        // 创建表格结构
        const table = document.createElement('table');
        table.className = 'word-list-table';
        
        // 添加表头
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th class="word-number">序号</th>
                <th class="word-name">词汇</th>
                <th class="word-preview">预览</th>
                <th class="word-time">添加时间</th>
                <th class="word-actions">操作</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // 创建表格主体
        const tbody = document.createElement('tbody');
        
        // 对词汇按时间倒序排序
        const sortedWords = [...words].sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeB - timeA; // 倒序排列
        });
        
        // 添加词汇行
        sortedWords.forEach((word, index) => {
            const row = document.createElement('tr');
            
            // 格式化时间戳
            const timestamp = word.timestamp ? 
                new Date(word.timestamp).toLocaleString('zh-CN', {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'}) : 
                '未知时间';
            
            // 提取前50个字符作为预览
            const preview = word.content ? this.stripHtml(word.content).substring(0, 50) + '...' : '无内容';
            
            row.innerHTML = `
                <td class="word-number">${index + 1}</td>
                <td class="word-name" data-word="${word.word}">${word.word}</td>
                <td class="word-preview">${preview}</td>
                <td class="word-time">${timestamp}</td>
                <td class="word-actions">
                    <button class="btn-view" data-word="${word.word}" title="查看详情"><i class="bi bi-eye"></i> 查看</button>
                    <button class="btn-delete" data-word="${word.word}" title="删除词汇"><i class="bi bi-trash"></i> 删除</button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        wordListContainer.appendChild(table);
        
        // 添加点击事件
        table.querySelectorAll('.word-name, .btn-view').forEach(el => {
            el.addEventListener('click', (e) => {
                const word = el.dataset.word;
                this.showWordDetail(word);
            });
        });
        
        // 添加删除按钮点击事件
        table.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // 防止触发其他点击事件
                const word = btn.dataset.word;
                if (confirm(`确定要删除词汇"${word}"吗？`)) {
                    this.events.emit('deleteWord', word);
                }
            });
        });
    }
    
    /**
     * 移除HTML标签
     * @param {string} html - 包含HTML标签的字符串
     * @returns {string} 移除HTML标签后的字符串
     */
    stripHtml(html) {
        if (!html) return '';
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || '';
    }
    
    /**
     * 显示词汇详情
     * @param {string} word - 词汇名称
     */
    showWordDetail(word) {
        if (!this.events) {
            console.error('事件总线未设置');
            return;
        }
        
        // 设置标题
        document.getElementById('wordDetailTitle').textContent = `词汇详情: ${word}`;
        document.getElementById('wordDetailTitle').dataset.word = word;
        
        // 显示模态窗口并设置加载状态
        this.showWordDetailModal();
        this.setWordDetailLoading(true);
        
        // 发送获取词汇详情的事件
        this.events.emit('showWordDetail', word);
    }
}