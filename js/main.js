/**
 * 学术词汇助手 - 主入口文件
 */

// 导入各个模块
import { StorageManager } from './utils/storageManager.js';
import { EventEmitter } from './utils/eventEmitter.js';
import { showToast } from './ui/toast.js';
import { UIManager } from './ui/uiManager.js';
import { LLMService } from './services/llmService.js';
import { TextProcessor } from './core/textProcessor.js';
import { DictionaryManager, DictionaryEvents } from './core/dictionaryManager.js';
import templateLoader from './utils/templateLoader.js';

// 创建一个全局事件发射器
const AppEvents = new EventEmitter();

// 应用主类
class App {
    constructor() {
        this.initialized = false;
        this.processing = false;
        this.currentMode = 'professional'; // 默认模式
        
        // 初始化各个模块
        this.storageManager = new StorageManager();
        this.llmService = new LLMService();
        this.textProcessor = new TextProcessor(this.llmService);
        this.dictionaryManager = new DictionaryManager(this.storageManager);
        this.uiManager = new UIManager();
        
        // 设置UIManager的事件总线
        this.uiManager.setEventEmitter(AppEvents);
        
        // 设置模式
        const savedMode = this.storageManager.getSetting('defaultMode', 'professional');
        this.setMode(savedMode);
        
        // 设置主题
        const savedTheme = this.storageManager.getSetting('theme', 'light');
        this.setTheme(savedTheme);
    }
    
    /**
     * 初始化应用
     */
    async initialize() {
        try {
            // 清除之前可能存在的状态显示
            document.getElementById('progressStatus').textContent = '正在初始化...'; 
            
            // 先初始化词典管理器
            await this.dictionaryManager.initialize();
            
            // 绑定UI事件
            this.bindEvents();
            
            // 更新UI状态
            this.updateUIState();
            
            // 加载LLM设置
            this.loadLlmSettings();
            
            this.initialized = true;
            console.log('应用初始化完成');
            
            // 设置初始状态为测试中
            document.getElementById('progressStatus').textContent = '准备就绪，等待处理...'; 
            
            // 测试LLM连接 - 作为一个独立的过程
            setTimeout(() => this.testLLMConnection(), 100);
            
        } catch (error) {
            console.error('应用初始化失败:', error);
            showToast(`初始化失败: ${error.message}`, 'error');
        }
    }
    
    /**
     * 加载LLM设置
     */
    loadLlmSettings() {
        try {
            // 从本地存储获取设置
            const apiEndpoint = this.storageManager.getSetting('apiEndpoint', 'http://localhost:11434/api/chat');
            const modelName = this.storageManager.getSetting('modelName', 'qwen3:8b');
            
            // 更新UI
            document.getElementById('apiEndpoint').value = apiEndpoint;
            document.getElementById('modelName').value = modelName;
            
            // 设置到服务
            this.llmService.setApiEndpoint(apiEndpoint);
            this.llmService.setModel(modelName);
        } catch (error) {
            console.error('加载LLM设置失败:', error);
        }
    }
    
    /**
     * 保存LLM设置
     */
    saveLlmSettings() {
        try {
            const apiEndpoint = document.getElementById('apiEndpoint').value.trim();
            const modelName = document.getElementById('modelName').value.trim();
            
            if (!apiEndpoint || !modelName) {
                showToast('API地址和模型名称不能为空', 'error');
                return;
            }
            
            // 保存到本地存储
            this.storageManager.setSetting('apiEndpoint', apiEndpoint);
            this.storageManager.setSetting('modelName', modelName);
            
            // 设置到服务
            this.llmService.setApiEndpoint(apiEndpoint);
            this.llmService.setModel(modelName);
            
            showToast('LLM设置已保存', 'success');
            
            // 测试新的连接
            this.testLLMConnection();
        } catch (error) {
            console.error('保存LLM设置失败:', error);
            showToast(`保存LLM设置失败: ${error.message}`, 'error');
        }
    }
    
    /**
     * 绑定事件处理程序
     */
    bindEvents() {
        // 处理按钮点击
        document.getElementById('processButton').addEventListener('click', () => this.startProcessing());
        
        // 清空输入按钮
        document.getElementById('clearInput').addEventListener('click', () => this.clearInput());
        
        // 加载示例按钮
        document.getElementById('loadExample').addEventListener('click', () => this.loadExample());
        
        // 搜索词汇按钮
        document.getElementById('searchWords').addEventListener('click', () => this.showSearchBox());
        
        // 导出词典按钮
        document.getElementById('exportDictionary').addEventListener('click', () => this.exportDictionary());
        
        // 清空词典按钮
        document.getElementById('clearDictionary').addEventListener('click', () => this.clearDictionary());
        
        // 词典管理按钮
        document.getElementById('manageDictionaries').addEventListener('click', () => this.uiManager.showDictionaryModal());
        
        // 模式选择器变化
        document.getElementById('modeSelector').addEventListener('change', (e) => {
            this.setMode(e.target.value);
        });
        
        // 主题切换按钮
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // 关闭模态窗口按钮
        document.getElementById('closeModal').addEventListener('click', () => this.uiManager.hideDictionaryModal());
        document.getElementById('closeWordDetail').addEventListener('click', () => this.uiManager.hideWordDetailModal());
        
        // 创建词典按钮
        document.getElementById('createDictionary').addEventListener('click', () => this.createDictionary());
        
        // 导入词典按钮
        document.getElementById('importDictionary').addEventListener('click', () => this.selectImportFile());
        document.getElementById('importFile').addEventListener('change', (e) => this.importDictionary(e));
        
        // 词汇详情模态窗口按钮
        document.getElementById('regenerateWord').addEventListener('click', () => this.regenerateWordDefinition());
        document.getElementById('deleteWord').addEventListener('click', () => this.deleteCurrentWord());
        
        // LLM相关按钮
        document.getElementById('testConnection').addEventListener('click', () => this.testLLMConnection());
        document.getElementById('saveLlmSettings').addEventListener('click', () => this.saveLlmSettings());
        
        // 词典事件监听
        DictionaryEvents.on('initialized', data => {
            console.log('词典初始化完成:', data);
            this.updateDictionaryUI();
            this.renderWordList();
        });
        
        DictionaryEvents.on('dictionaryCreated', name => {
            showToast(`词典 "${name}" 创建成功`, 'success');
            this.updateDictionaryUI();
        });
        
        DictionaryEvents.on('dictionarySwitched', name => {
            showToast(`已切换到词典 "${name}"`, 'success');
            this.updateDictionaryUI();
            this.renderWordList();
        });
        
        DictionaryEvents.on('dictionaryDeleted', name => {
            showToast(`词典 "${name}" 已删除`, 'success');
            this.updateDictionaryUI();
            this.renderWordList();
        });
        
        DictionaryEvents.on('dictionaryCleared', name => {
            showToast(`词典 "${name}" 已清空`, 'success');
            this.renderWordList();
        });
        
        DictionaryEvents.on('wordAdded', word => {
            showToast(`词汇 "${word}" 已添加到词典`, 'success');
            this.renderWordList();
        });
        
        DictionaryEvents.on('wordUpdated', word => {
            showToast(`词汇 "${word}" 已更新`, 'success');
            this.renderWordList();
        });
        
        DictionaryEvents.on('wordDeleted', word => {
            showToast(`词汇 "${word}" 已删除`, 'success');
            this.renderWordList();
        });
        
        DictionaryEvents.on('dictionaryImported', name => {
            showToast(`词典 "${name}" 导入成功`, 'success');
            this.updateDictionaryUI();
            this.renderWordList();
        });
        
        // 应用事件监听
        AppEvents.on('showWordDetail', word => {
            this.showWordDetail(word);
        });
        
        AppEvents.on('deleteWord', word => {
            this.dictionaryManager.deleteWord(word);
        });
    }
    
    /**
     * 更新UI状态
     */
    updateUIState() {
        // 更新词典信息
        this.updateDictionaryUI();
        
        // 更新模式选择器
        document.getElementById('modeSelector').value = this.currentMode;
    }
    
    /**
     * 更新词典UI
     */
    updateDictionaryUI() {
        // 更新当前词典名称
        const currentDictName = this.dictionaryManager.getCurrentDictionaryName() || '默认词典';
        document.getElementById('currentDictName').textContent = currentDictName;
        
        // 更新词典列表
        const dictionaryList = document.getElementById('dictionaryList');
        dictionaryList.innerHTML = '';
        
        const dictionaries = this.dictionaryManager.getDictionaryList();
        dictionaries.forEach(dictName => {
            const item = document.createElement('li');
            item.className = 'list-group-item';
            if (dictName === currentDictName) {
                item.classList.add('current-dict');
            }
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = dictName;
            item.appendChild(nameSpan);
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'dict-actions';
            
            // 切换按钮
            if (dictName !== currentDictName) {
                const switchBtn = document.createElement('button');
                switchBtn.className = 'btn btn-sm btn-outline-primary';
                switchBtn.textContent = '切换';
                switchBtn.addEventListener('click', () => this.switchDictionary(dictName));
                actionsDiv.appendChild(switchBtn);
            }
            
            // 删除按钮
            if (dictionaries.length > 1) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-sm btn-outline-danger';
                deleteBtn.textContent = '删除';
                deleteBtn.addEventListener('click', () => this.deleteDictionary(dictName));
                actionsDiv.appendChild(deleteBtn);
            }
            
            item.appendChild(actionsDiv);
            dictionaryList.appendChild(item);
        });
    }
    
    /**
     * 渲染词汇列表
     */
    renderWordList() {
        const wordList = document.getElementById('wordList');
        wordList.innerHTML = '';
        wordList.className = 'col-12'; // 确保占据整行空间
        
        // 获取所有词汇
        const words = this.dictionaryManager.getWords();
        
        if (words.length === 0) {
            wordList.innerHTML = '<div class="col-12 text-center text-muted py-5">当前词典为空，请处理文本添加词汇</div>';
            return;
        }
        
        // 创建表格的div容器
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-responsive';
        wordList.appendChild(tableContainer);
        
        // 创建表格结构
        const table = document.createElement('table');
        table.className = 'word-list-table';
        tableContainer.appendChild(table);
        
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
                    this.dictionaryManager.deleteWord(word);
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
     * @param {string} word - 词汇
     */
    async showWordDetail(word) {
        try {
            console.log(`显示词汇详情: ${word}`);
            
            // 先设置UI为加载状态
            this.uiManager.setWordDetailLoading(true);
            
            // 先显示模态窗口，使用户看到加载状态
            document.getElementById('wordDetailTitle').textContent = word;
            document.getElementById('wordDetailTitle').setAttribute('data-word', word);
            this.uiManager.showWordDetailModal();
            
            // 获取词汇详情
            const wordDetail = this.dictionaryManager.getWordDetails(word);
            if (!wordDetail) {
                document.getElementById('wordDetailContent').innerHTML = '<div class="alert alert-warning">找不到该词汇的详情</div>';
                this.uiManager.setWordDetailLoading(false);
                showToast(`找不到词汇 "${word}" 的详情`, 'error');
                return;
            }
            
            // 获取成功，显示内容
            const content = wordDetail.content || '暂无内容';
            
            // 确保内容中的换行符被正确处理
            let formattedContent = content;
            if (typeof content === 'string' && !content.includes('<')) {
                // 纯文本内容，进行HTML转换
                formattedContent = content.replace(/\n/g, '<br>');
            }
            
            // 更新显示
            document.getElementById('wordDetailContent').innerHTML = formattedContent;
            
            // 添加动画效果
            const contentEl = document.getElementById('wordDetailContent');
            contentEl.style.opacity = '0';
            contentEl.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                contentEl.style.opacity = '1';
            }, 50);
            
            // 完成加载
            this.uiManager.setWordDetailLoading(false);
            
        } catch (error) {
            console.error(`显示词汇详情失败: ${error.message}`);
            document.getElementById('wordDetailContent').innerHTML = 
                `<div class="alert alert-danger">加载词汇详情失败: ${error.message}</div>`;
            this.uiManager.setWordDetailLoading(false);
            showToast(`显示词汇详情失败: ${error.message}`, 'error');
        }
    }
    
    /**
     * 重新生成词汇定义
     */
    async regenerateWordDefinition() {
        const wordElement = document.getElementById('wordDetailTitle');
        const word = wordElement.getAttribute('data-word');
        
        if (!word) {
            showToast('无法获取词汇信息', 'error');
            return;
        }
        
        try {
            this.uiManager.setWordDetailLoading(true);
            showToast(`正在重新生成 "${word}" 的定义...`, 'info');
            
            const result = await this.textProcessor.processWord(word, this.currentMode);
            
            if (result && result.content) {
                // 更新词典中的词汇
                this.dictionaryManager.updateWord(word, {
                    content: result.content,
                    mode: this.currentMode
                });
                
                // 更新显示
                document.getElementById('wordDetailContent').innerHTML = result.content.replace(/\n/g, '<br>');
                showToast(`词汇 "${word}" 定义已更新`, 'success');
            } else {
                showToast('生成定义失败', 'error');
            }
        } catch (error) {
            console.error(`重新生成定义失败: ${error.message}`);
            showToast(`重新生成定义失败: ${error.message}`, 'error');
        } finally {
            this.uiManager.setWordDetailLoading(false);
        }
    }
    
    /**
     * 删除当前词汇
     */
    deleteCurrentWord() {
        const wordElement = document.getElementById('wordDetailTitle');
        const word = wordElement.getAttribute('data-word');
        
        if (!word) {
            showToast('无法获取词汇信息', 'error');
            return;
        }
        
        if (confirm(`确定要删除词汇 "${word}" 吗？`)) {
            try {
                this.dictionaryManager.deleteWord(word);
                this.uiManager.hideWordDetailModal();
            } catch (error) {
                console.error(`删除词汇失败: ${error.message}`);
                showToast(`删除词汇失败: ${error.message}`, 'error');
            }
        }
    }
    
    /**
     * 创建新词典
     */
    createDictionary() {
        const nameInput = document.getElementById('newDictionaryName');
        const name = nameInput.value.trim();
        
        if (!name) {
            showToast('词典名称不能为空', 'error');
            return;
        }
        
        try {
            const success = this.dictionaryManager.createDictionary(name);
            if (success) {
                nameInput.value = '';
                this.switchDictionary(name);
            } else {
                showToast(`创建词典"${name}"失败，可能已存在同名词典`, 'error');
            }
        } catch (error) {
            console.error(`创建词典失败: ${error.message}`);
            showToast(`创建词典失败: ${error.message}`, 'error');
        }
    }
    
    /**
     * 切换词典
     * @param {string} name - 词典名称
     */
    switchDictionary(name) {
        try {
            const success = this.dictionaryManager.switchDictionary(name);
            if (!success) {
                showToast(`切换词典"${name}"失败`, 'error');
            }
        } catch (error) {
            console.error(`切换词典失败: ${error.message}`);
            showToast(`切换词典失败: ${error.message}`, 'error');
        }
    }
    
    /**
     * 删除词典
     * @param {string} name - 词典名称
     */
    deleteDictionary(name) {
        if (confirm(`确定要删除词典 "${name}" 吗？其中的所有词汇将被删除。`)) {
            try {
                const success = this.dictionaryManager.deleteDictionary(name);
                if (!success) {
                    showToast(`删除词典"${name}"失败`, 'error');
                }
            } catch (error) {
                console.error(`删除词典失败: ${error.message}`);
                showToast(`删除词典失败: ${error.message}`, 'error');
            }
        }
    }
    
    /**
     * 清空当前词典
     */
    clearDictionary() {
        const currentDict = this.dictionaryManager.getCurrentDictionaryName();
        if (confirm(`确定要清空当前词典 "${currentDict}" 吗？该操作不可撤销。`)) {
            try {
                const success = this.dictionaryManager.clearCurrentDictionary();
                if (!success) {
                    showToast(`清空词典失败`, 'error');
                }
            } catch (error) {
                console.error(`清空词典失败: ${error.message}`);
                showToast(`清空词典失败: ${error.message}`, 'error');
            }
        }
    }
    
    /**
     * 选择导入文件
     */
    selectImportFile() {
        document.getElementById('importFile').click();
    }
    
    /**
     * 导入词典
     * @param {Event} event - 文件选择事件
     */
    async importDictionary(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const content = e.target.result;
                    const data = JSON.parse(content);
                    
                    if (!data.name || !data.words) {
                        showToast('无效的词典文件格式', 'error');
                        return;
                    }
                    
                    const success = this.dictionaryManager.importDictionary(data);
                    if (!success) {
                        showToast('导入词典失败', 'error');
                    }
                } catch (parseError) {
                    console.error('解析词典文件失败:', parseError);
                    showToast(`解析词典文件失败: ${parseError.message}`, 'error');
                }
            };
            reader.readAsText(file);
        } catch (error) {
            console.error(`导入词典失败: ${error.message}`);
            showToast(`导入词典失败: ${error.message}`, 'error');
        } finally {
            // 清空文件选择器的值，以便下次可以选择同一个文件
            event.target.value = '';
        }
    }
    
    /**
     * 导出当前词典
     */
    exportDictionary() {
        try {
            const data = this.dictionaryManager.exportDictionary();
            if (!data) {
                showToast('当前词典为空，无法导出', 'error');
                return;
            }
            
            const filename = `${data.name}_${new Date().toISOString().split('T')[0]}.json`;
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            showToast(`词典导出成功: ${filename}`, 'success');
            
        } catch (error) {
            console.error(`导出词典失败: ${error.message}`);
            showToast(`导出词典失败: ${error.message}`, 'error');
        }
    }
    
    /**
     * 测试LLM连接
     */
    async testLLMConnection() {
        try {
            // 查找或创建状态元素
            const llmStatusEl = document.getElementById('llmStatus');
            let llmConnectionStatus = document.getElementById('llmConnectionStatus');
            if (!llmConnectionStatus) {
                llmConnectionStatus = document.createElement('small');
                llmConnectionStatus.id = 'llmConnectionStatus';
                // 添加到状态容器内
                const container = document.querySelector('.llm-status-container');
                if (container) {
                    container.appendChild(llmConnectionStatus);
                } else {
                    // 如果找不到容器，作为备用添加到状态指示器后面
                    llmStatusEl.parentNode.appendChild(llmConnectionStatus);
                }
            }
            
            // 更新状态显示为测试中
            llmStatusEl.className = 'badge bg-warning';
            llmStatusEl.textContent = '正在连接...';
            llmConnectionStatus.className = 'text-muted d-block mt-2';
            llmConnectionStatus.textContent = '正在测试LLM连接...';
            
            // 保持底部状态区域的通用就绪状态
            document.getElementById('progressStatus').textContent = '准备就绪，等待处理...';
            
            // 暂停一下，让UI状态更新显示出来
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 测试连接
            const connected = await this.llmService.testConnection();
            
            if (connected) {
                // 更新状态显示为已连接
                llmStatusEl.className = 'badge bg-success';
                llmStatusEl.textContent = '已连接';
                llmConnectionStatus.textContent = `已成功连接到 ${this.llmService.model} 模型`;
                llmConnectionStatus.className = 'text-success d-block mt-2';
                console.log('LLM连接测试成功');
            } else {
                // 更新状态显示为未连接
                llmStatusEl.className = 'badge bg-danger';
                llmStatusEl.textContent = '未连接';
                llmConnectionStatus.textContent = 'LLM连接失败，请确保本地Ollama服务已启动';
                llmConnectionStatus.className = 'text-danger d-block mt-2';
                showToast('无法连接到LLM服务。请确保本地Ollama服务已启动并运行在http://localhost:11434', 'error');
                console.log('LLM连接测试失败');
            }
        } catch (error) {
            // 更新状态显示为错误
            const llmStatusEl = document.getElementById('llmStatus');
            llmStatusEl.className = 'badge bg-danger';
            llmStatusEl.textContent = '连接错误';
            
            // 更新连接状态提示
            let llmConnectionStatus = document.getElementById('llmConnectionStatus');
            if (!llmConnectionStatus) {
                llmConnectionStatus = document.createElement('small');
                llmConnectionStatus.id = 'llmConnectionStatus';
                const container = document.querySelector('.llm-status-container');
                if (container) {
                    container.appendChild(llmConnectionStatus);
                } else {
                    llmStatusEl.parentNode.appendChild(llmConnectionStatus);
                }
            }
            llmConnectionStatus.textContent = `连接错误: ${error.message}`;
            llmConnectionStatus.className = 'text-danger d-block mt-2';
            
            console.error('测试LLM连接失败:', error);
            showToast(`LLM连接错误: ${error.message}`, 'error');
        }
    }
    
    /**
     * 开始处理文本
     */
    async startProcessing() {
        if (this.processing) {
            showToast('正在处理中，请稍候...', 'warning');
            return;
        }
        
        const inputText = document.getElementById('textInput').value.trim();
        if (!inputText) {
            showToast('请输入文本内容', 'error');
            return;
        }
        
        try {
            this.processing = true;
            document.getElementById('processButton').disabled = true;
            document.getElementById('progressStatus').textContent = '正在提取词汇...';
            document.getElementById('progressContainer').classList.remove('hidden');
            
            // 提取词汇
            showToast('正在从文本中提取词汇...', 'info');
            const extractedWords = await this.textProcessor.extractWords(inputText);
            
            if (!extractedWords || extractedWords.length === 0) {
                showToast('未能提取到有效词汇', 'warning');
                this.processing = false;
                document.getElementById('processButton').disabled = false;
                document.getElementById('progressStatus').textContent = '已完成，未找到词汇';
                document.getElementById('progressContainer').classList.add('hidden');
                return;
            }
            
            showToast(`发现 ${extractedWords.length} 个词汇，开始处理...`, 'success');
            
            // 过滤已存在的词汇
            const autoSave = document.getElementById('autoSave').checked;
            const existingWords = this.dictionaryManager.getWordList();
            const newWords = extractedWords.filter(word => !existingWords.includes(word));
            
            if (newWords.length === 0) {
                showToast('所有词汇已存在于词典中', 'info');
                this.processing = false;
                document.getElementById('processButton').disabled = false;
                document.getElementById('progressStatus').textContent = '已完成，所有词汇已存在';
                document.getElementById('progressContainer').classList.add('hidden');
                return;
            }
            
            // 处理每个词汇
            for (let i = 0; i < newWords.length; i++) {
                const word = newWords[i];
                const progress = ((i + 1) / newWords.length * 100).toFixed(0);
                document.getElementById('progressBar').style.width = `${progress}%`;
                document.getElementById('progressStatus').textContent = `正在处理: ${word} (${i + 1}/${newWords.length})`;
                
                try {
                    const result = await this.textProcessor.processWord(word, this.currentMode);
                    
                    if (autoSave && result && result.content) {
                        this.dictionaryManager.addWord({
                            word: word,
                            content: result.content,
                            mode: this.currentMode
                        });
                    }
                    
                } catch (wordError) {
                    console.error(`处理词汇 ${word} 失败:`, wordError);
                }
            }
            
            // 完成
            showToast(`成功处理 ${newWords.length} 个词汇`, 'success');
            document.getElementById('progressStatus').textContent = `已完成处理 ${newWords.length} 个词汇`;
            
        } catch (error) {
            console.error('处理文本失败:', error);
            showToast(`处理文本失败: ${error.message}`, 'error');
            document.getElementById('progressStatus').textContent = `处理失败: ${error.message}`;
        } finally {
            this.processing = false;
            document.getElementById('processButton').disabled = false;
        }
    }
    
    /**
     * 显示搜索框
     */
    showSearchBox() {
        const query = prompt('请输入要搜索的词汇关键词：');
        if (query === null || query.trim() === '') return; // 用户取消或输入为空
        
        try {
            const searchResults = this.dictionaryManager.searchWords(query);
            
            if (searchResults.length === 0) {
                showToast(`未找到匹配 "${query}" 的词汇`, 'info');
                return;
            }
            
            // 如果只找到一个词汇，直接显示详情
            if (searchResults.length === 1) {
                showToast(`找到词汇 "${searchResults[0].word}"`, 'success');
                this.showWordDetail(searchResults[0].word);
                return;
            }
            
            // 找到多个词汇，创建选择列表
            // 创建一个自定义的模态窗口来显示搜索结果
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.style.zIndex = '1050';
            
            // 生成词汇预览，确保不包含AI思考过程
            const wordPreviews = searchResults.map(word => {
                // 提取词汇定义，避免显示AI思考过程
                let preview = '';
                
                try {
                    // 尝试检测是否是结构化内容（如HTML）
                    if (word.content && word.content.includes('<')) {
                        // 从HTML中提取有意义的文本
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = word.content;
                        
                        // 尝试提取定义部分
                        const definitions = tempDiv.querySelectorAll('.definition, p');
                        if (definitions.length > 0) {
                            preview = definitions[0].textContent.trim();
                        } else {
                            preview = tempDiv.textContent.trim();
                        }
                    } else if (word.content) {
                        // 纯文本内容，去除可能的思考过程
                        const lines = word.content.split('\n').filter(line => 
                            !line.toLowerCase().includes('okay, the user') && 
                            !line.toLowerCase().includes('comprehensive dictionary') &&
                            !line.toLowerCase().includes('user wants') &&
                            line.trim() !== '');
                        
                        preview = lines.length > 0 ? lines[0] : '点击查看详情';
                    } else {
                        preview = '点击查看详情';
                    }
                    
                    // 限制长度
                    preview = preview.substring(0, 60) + (preview.length > 60 ? '...' : '');
                    
                } catch (e) {
                    console.error('提取词汇预览失败', e);
                    preview = '点击查看详情';
                }
                
                return {
                    word: word.word,
                    preview: preview,
                    date: word.timestamp ? new Date(word.timestamp) : new Date()
                };
            });
            
            modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">搜索结果: "${query}"</h5>
                        <button type="button" class="btn-close" id="closeSearchModal"></button>
                    </div>
                    <div class="modal-body">
                        <p>找到 ${searchResults.length} 个匹配词汇：</p>
                        <div class="list-group search-results-list">
                            ${wordPreviews.map((item, index) => `
                                <button type="button" class="list-group-item list-group-item-action search-result-item" data-word="${item.word}">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <strong>${index + 1}. ${item.word}</strong>
                                        <span class="badge bg-primary rounded-pill">${item.date.toLocaleDateString()}</span>
                                    </div>
                                    <small class="text-muted">${item.preview}</small>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>`;
            
            // 创建遮罩层
            const overlay = document.createElement('div');
            overlay.className = 'overlay';
            overlay.style.display = 'block';
            overlay.style.zIndex = '1049';
            
            // 添加到页面
            document.body.appendChild(overlay);
            document.body.appendChild(modal);
            
            // 添加关闭事件
            document.getElementById('closeSearchModal').addEventListener('click', () => {
                modal.remove();
                overlay.remove();
            });
            
            // 添加点击遮罩层关闭
            overlay.addEventListener('click', () => {
                modal.remove();
                overlay.remove();
            });
            
            // 添加ESC键关闭
            const closeOnEsc = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    overlay.remove();
                    document.removeEventListener('keydown', closeOnEsc);
                }
            };
            document.addEventListener('keydown', closeOnEsc);
            
            // 添加词汇点击事件
            modal.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const word = item.dataset.word;
                    modal.remove();
                    overlay.remove();
                    this.showWordDetail(word);
                });
            });
            
            showToast(`找到 ${searchResults.length} 个匹配结果`, 'success');
            
        } catch (error) {
            console.error('搜索词汇失败:', error);
            showToast(`搜索词汇失败: ${error.message}`, 'error');
        }
    }
    
    /**
     * 清空输入框
     */
    clearInput() {
        document.getElementById('textInput').value = '';
    }
    
    /**
     * 加载示例
     */
    async loadExample() {
        // 设置示例文本
        const exampleText = `Academic writing is a formal style of writing used in universities and scholarly publications. Students develop this skill to express their ideas clearly and make claims supported by evidence. Key features include complex sentence structures, specialized vocabulary, and objective language. Academic writing differs from informal communication through precise terminology and evidence-based arguments. Despite its challenges, mastering this skill is essential for academic success. Universities provide resources to help students improve their writing abilities. With practice, anyone can become proficient in this important form of communication.`;
        document.getElementById('textInput').value = exampleText;
        
        // 预设一批单词，不需要等待LLM处理
        if (confirm('是否加载预设的示例词汇？这将向词典中添加一批已预先处理好的学术词汇。')) {
            showToast('正在加载示例词汇...', 'info');
            
            // 添加示例词汇
            await this.loadExampleWords();
        }
    }
    
    /**
     * 加载示例词汇
     */
    async loadExampleWords() {
        try {
            // 预设的示例词汇 - 使用三模式
            const exampleWords = [
                {
                    word: 'academic',
                    content: this.createTriModeWordHTML('academic', {
                        prof: {
                            title: 'Academic',
                            definition: 'Related to education, scholarship, and learning, particularly at college or university level.',
                            pronunciation: '/ˌækəˈdemɪk/',
                            usage: [
                                'The journal publishes academic papers from researchers worldwide.',
                                'Her academic achievements include numerous publications.',
                                'The university maintains rigorous academic standards.'
                            ]
                        },
                        inter: {
                            title: 'Academic',
                            definition: '与教育、学术和学习相关，特别是大学层面的。',
                            pronunciation: '/ˌækəˈdemɪk/',
                            usage: [
                                'The journal publishes academic papers from researchers worldwide.',
                                'Her academic achievements include numerous publications.'
                            ]
                        },
                        elem: {
                            title: 'Academic',
                            definition: '和学校、学习有关的。特别是大学里的学习和研究。',
                            pronunciation: '/ˌækəˈdemɪk/',
                            usage: [
                                'She is a good academic student.',
                                'The school has high academic standards.'
                            ]
                        }
                    }),
                    mode: 'tri-mode'
                },
                {
                    word: 'evidence',
                    content: this.createTriModeWordHTML('evidence', {
                        prof: {
                            title: 'Evidence',
                            definition: 'Information, signs, objects, or testimony that provides proof or knowledge about something.',
                            pronunciation: '/ˈevɪdəns/',
                            usage: [
                                'The research provides compelling evidence for the theory.',
                                'Empirical evidence is essential in the scientific method.'
                            ]
                        },
                        inter: {
                            title: 'Evidence',
                            definition: '用来证明某事存在或真实的信息、迹象或物体；证据。',
                            pronunciation: '/ˈevɪdəns/',
                            usage: [
                                'The research provides compelling evidence for the theory.',
                                'Empirical evidence is essential in the scientific method.'
                            ]
                        },
                        elem: {
                            title: 'Evidence',
                            definition: '证据，能够证明某事是真实的东西。就像侦探找到的线索一样。',
                            pronunciation: '/ˈevɪdəns/',
                            usage: [
                                'Do you have any evidence?',
                                'The footprints are evidence that someone was here.'
                            ]
                        }
                    }),
                    mode: 'tri-mode'
                },
                {
                    word: 'terminology',
                    content: this.createTriModeWordHTML('terminology', {
                        prof: {
                            title: 'Terminology',
                            definition: 'The specialized vocabulary or technical terms used in a particular field, subject, science, or art.',
                            pronunciation: '/ˌtɜːmɪˈnɒlədʒi/',
                            usage: [
                                'Students must become familiar with the terminology of their chosen field.',
                                'Medical terminology includes specific terms for anatomy, diseases, and treatments.'
                            ]
                        },
                        inter: {
                            title: 'Terminology',
                            definition: '特定学科、行业或领域中使用的专业术语或技术词汇。',
                            pronunciation: '/ˌtɜːmɪˈnɒlədʒi/',
                            usage: [
                                'Students must become familiar with the terminology of their chosen field.',
                                'The paper uses complex scientific terminology.'
                            ]
                        },
                        elem: {
                            title: 'Terminology',
                            definition: '某个特定领域使用的专门词汇。就像每个职业都有自己特殊的语言一样。',
                            pronunciation: '/ˌtɜːmɪˈnɒlədʒi/',
                            usage: [
                                'The doctor used medical terminology.',
                                'I do not understand computer terminology.'
                            ]
                        }
                    }),
                    mode: 'tri-mode'
                }
            ];
            
            // 添加到词典
            for (const wordData of exampleWords) {
                this.dictionaryManager.addWord(wordData);
            }
            
            showToast(`已成功加载 ${exampleWords.length} 个示例词汇`, 'success');
        } catch (error) {
            console.error('加载示例词汇失败:', error);
            showToast('加载示例词汇失败', 'error');
        }
    }
    
    /**
     * 创建三模式词汇HTML
     * @param {string} id - 词汇ID
     * @param {Object} data - 词汇数据
     * @returns {string} HTML字符串
     */
    createTriModeWordHTML(id, data) {
        // 创建标签页HTML
        const tabsHTML = `
        <ul class="nav nav-tabs" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="prof-tab-${id}" data-bs-toggle="tab" data-bs-target="#prof-${id}" type="button" role="tab">专业英文</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="inter-tab-${id}" data-bs-toggle="tab" data-bs-target="#inter-${id}" type="button" role="tab">中文解说</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="elem-tab-${id}" data-bs-toggle="tab" data-bs-target="#elem-${id}" type="button" role="tab">儿童启蒙</button>
            </li>
        </ul>`;
        
        // 创建内容部分
        function createModeContent(mode, info) {
            let titleText, defText, pronText, usageText;
            
            if (mode === 'prof') {
                titleText = 'Word';
                defText = 'Definition';
                pronText = 'Pronunciation';
                usageText = 'Academic Usage';
            } else if (mode === 'inter') {
                titleText = '词汇';
                defText = '定义';
                pronText = '发音';
                usageText = '学术用法';
            } else {
                titleText = '词汇';
                defText = '意思';
                pronText = '怎么读';
                usageText = '怎么用';
            }
            
            // 构建用法列表
            const usageItems = info.usage.map(item => `<li>${item}</li>`).join('');
            
            return `
            <div class="content-section">
                <div class="section-title">📘 ${titleText}: ${info.title}</div>
                <div class="section-title">🧠 ${defText}:</div>
                <p>${info.definition}</p>
                <div class="section-title">🔊 ${pronText}: ${info.pronunciation}</div>
                <div class="section-title">🎯 ${usageText}:</div>
                <ul>
                    ${usageItems}
                </ul>
            </div>`;
        }
        
        // 创建标签页内容
        const contentHTML = `
        <div class="tab-content">
            <div class="tab-pane fade show active" id="prof-${id}" role="tabpanel">
                ${createModeContent('prof', data.prof)}
            </div>
            <div class="tab-pane fade" id="inter-${id}" role="tabpanel">
                ${createModeContent('inter', data.inter)}
            </div>
            <div class="tab-pane fade" id="elem-${id}" role="tabpanel">
                ${createModeContent('elem', data.elem)}
            </div>
        </div>`;
        
        // 组合所有内容
        return `<div class="word-tabs">${tabsHTML}${contentHTML}</div>`;
    }
    
    /**
     * 设置词汇解释模式
     * @param {string} mode - 模式名称
     */
    setMode(mode) {
        this.currentMode = mode;
        this.storageManager.setSetting('defaultMode', mode);
        console.log(`已切换到${mode}模式`);
    }
    
    /**
     * 设置主题
     * @param {string} theme - 主题名称
     */
    setTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            document.getElementById('themeToggle').textContent = '\u2600\uFE0F'; // 太阳图标
        } else {
            document.body.classList.remove('dark-theme');
            document.getElementById('themeToggle').textContent = '\ud83c\udf19'; // 月亮图标
        }
        this.storageManager.setSetting('theme', theme);
    }
    
    /**
     * 切换主题
     */
    toggleTheme() {
        const currentTheme = this.storageManager.getSetting('theme', 'light');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }
}

// 初始化应用
const app = new App();
document.addEventListener('DOMContentLoaded', () => {
    app.initialize();
});