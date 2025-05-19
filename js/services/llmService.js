/**
 * LLM服务
 * 负责与Ollama API交互生成文本内容
 */

// 日志功能
export const LLMLogger = {
  logElement: null,
  
  // 初始化日志区域
  init() {
    this.logElement = document.getElementById('llmLogArea');
    
    // 添加清除日志按钮事件
    const clearBtn = document.getElementById('clearLogs');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clear());
    }
    
    // 添加初始状态日志
    this.clear();
    this.info('日志系统已初始化');
    this.info('准备就绪，等待操作...');
  },

  // 确保日志元素存在
  ensureLogElement() {
    if (!this.logElement) {
      this.logElement = document.getElementById('llmLogArea');
      if (!this.logElement) {
        console.warn('找不到日志元素，将使用控制台输出日志');
        return false;
      }
    }
    return true;
  },
  
  // 添加日志条目
  log(message, type = 'info') {
    // 确保日志元素存在
    if (!this.ensureLogElement()) {
      this.init();
      if (!this.ensureLogElement()) {
        console.warn('无法找到或创建日志元素');
        console.log(`[${type}] ${message}`);
        return;
      }
    }
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    
    const entry = document.createElement('div');
    entry.className = `log-entry`;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = `[${timeStr}]`;
    
    const msgSpan = document.createElement('span');
    msgSpan.className = `log-${type}`;
    msgSpan.textContent = ` ${message}`; // 添加空格使文本更清晰
    
    entry.appendChild(timeSpan);
    entry.appendChild(msgSpan);
    
    this.logElement.appendChild(entry);
    this.logElement.scrollTop = this.logElement.scrollHeight;
  },
  
  // 添加信息日志
  info(message) {
    this.log(message, 'info');
    console.log(message);
  },
  
  // 添加错误日志
  error(message) {
    this.log(message, 'error');
    console.error(message);
  },
  
  // 添加成功日志
  success(message) {
    this.log(message, 'success');
    console.log(message);
  },
  
  // 添加警告日志
  warning(message) {
    this.log(message, 'warning');
    console.warn(message);
  },
  
  // 清除日志
  clear() {
    if (this.logElement) {
      this.logElement.innerHTML = '';
    }
  }
};

export class LLMService {
    constructor() {
        this.apiEndpoint = 'http://localhost:11434';
        this.model = 'qwen3:8b';
        this.connectionTested = false;
    }
    
    /**
     * 测试与API的连接
     * @returns {Promise<boolean>} 连接是否成功
     */
    async testConnection() {
        try {
            LLMLogger.info(`测试连接到 ${this.model} 模型，基础URL: ${this.apiEndpoint}`);
            
            // 测试基础服务是否运行
            try {
                LLMLogger.info(`检查Ollama基础服务...`);
                const baseResponse = await fetch(this.apiEndpoint, {
                    method: 'GET',
                    signal: AbortSignal.timeout(3000) // 3秒超时
                });
                
                if (baseResponse.ok) {
                    const text = await baseResponse.text();
                    LLMLogger.success(`Ollama基础服务已连接，响应: ${text.substring(0, 50)}...`);
                } else {
                    LLMLogger.warning(`基础服务连接失败: 状态码 ${baseResponse.status}`);
                    return false;
                }
            } catch (baseError) {
                LLMLogger.error(`连接基础服务失败: ${baseError.message}`);
                return false;
            }
            
            // 使用简化的测试请求
            const generateEndpoint = `${this.apiEndpoint}/api/generate`;
            const requestBody = {
                model: this.model,
                prompt: 'Hello',
                stream: false
            };
            
            LLMLogger.info(`发送测试请求到: ${generateEndpoint}`);
            LLMLogger.info(`请求体: ${JSON.stringify(requestBody)}`);
            
            const startTime = Date.now();
            const response = await fetch(generateEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(8000) // 8秒超时
            });
            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000;
            
            if (response.ok) {
                const data = await response.json();
                LLMLogger.success(`API测试成功 (${duration.toFixed(2)}秒)`);
                LLMLogger.info(`响应数据包含字段: ${Object.keys(data).join(', ')}`);
                this.connectionTested = true;
                return true;
            }
            
            const errorText = await response.text().catch(() => '');
            LLMLogger.error(`连接测试失败，状态码: ${response.status}, 错误: ${errorText}`);
            return false;
        } catch (error) {
            LLMLogger.error(`测试LLM连接失败: ${error.message}`);
            this.connectionTested = false;
            return false;
        }
    }
    
    /**
     * 向LLM发送查询
     * @param {string} prompt - 提示语
     * @returns {Promise<string>} LLM响应
     */
    async query(prompt) {
        try {
            // 如果尚未测试连接，先测试
            if (!this.connectionTested) {
                console.log(`尚未测试连接，先进行连接测试...`);
                const connected = await this.testConnection();
                if (!connected) {
                    const errorMsg = '无法连接到Ollama API，请检查服务是否启动';
                    console.error(errorMsg);
                    throw new Error(errorMsg);
                }
            }
            
            console.log(`向模型 ${this.model} 发送查询...`);
            
            // 构建正确的API端点
            const generateEndpoint = `${this.apiEndpoint}/api/generate`;
            
            const requestBody = {
                model: this.model,
                prompt: prompt,
                stream: false
            };
            
            console.log(`发送请求到: ${generateEndpoint}`);
            const startTime = Date.now();
            
            const response = await fetch(generateEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(120000) // 120秒超时
            });
            
            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000;
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                const errorMsg = `API请求失败: ${response.status} ${response.statusText} ${errorText}`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }
            
            console.log(`收到响应 - 处理响应数据中...`);
            const data = await response.json();
            const content = data.response || '';
            
            if (!content) {
                const errorMsg = 'API返回的内容为空';
                console.error(errorMsg);
                throw new Error(errorMsg);
            }
            
            // 记录耗时和响应的前50个字符
            const truncatedContent = content.substring(0, 50) + 
                (content.length > 50 ? `... (${content.length}字符)` : '');
            console.log(`获取到响应 (耗时${duration.toFixed(2)}秒): ${truncatedContent}`);
            
            if (duration > 30) {
                console.warn(`响应时间较长 (${duration.toFixed(2)}秒)，可能需要检查Ollama性能或配置`);
            }
            
            return content;
            
        } catch (error) {
            console.error(`查询LLM失败: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * 设置API端点
     * @param {string} endpoint - API端点URL
     */
    setApiEndpoint(endpoint) {
        this.apiEndpoint = endpoint;
        this.connectionTested = false;
    }
    
    /**
     * 设置模型名称
     * @param {string} model - 模型名称
     */
    setModel(model) {
        this.model = model;
        this.connectionTested = false;
    }
}