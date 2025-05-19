/**
 * LLM服务
 * 负责与Ollama API交互生成文本内容
 */

export class LLMService {
    constructor() {
        this.apiEndpoint = 'http://localhost:11434/api/chat';
        this.model = 'qwen3:8b';
        this.connectionTested = false;
    }
    
    /**
     * 测试与API的连接
     * @returns {Promise<boolean>} 连接是否成功
     */
    async testConnection() {
        try {
            console.log(`测试连接到 ${this.model} 模型，API端点: ${this.apiEndpoint}`);
            
            // 针对完整路径端点做处理
            let testEndpoint = this.apiEndpoint;
            if (testEndpoint.endsWith('/chat')) {
                testEndpoint = testEndpoint.replace('/chat', '/generate');
            } else if (testEndpoint.endsWith('/api/chat')) {
                testEndpoint = testEndpoint.replace('/api/chat', '/api/generate');
            }
            
            const response = await fetch(testEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: 'Hi',
                    stream: false
                }),
                // 设置较短的超时时间
                signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
                this.connectionTested = true;
                console.log('连接测试成功');
                return true;
            }
            
            console.log(`连接测试失败，状态码: ${response.status}`);
            return false;
        } catch (error) {
            console.error('测试LLM连接失败:', error);
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
            if (!this.connectionTested) {
                const connected = await this.testConnection();
                if (!connected) {
                    throw new Error('无法连接到Ollama API');
                }
            }
            
            console.log(`向模型 ${this.model} 发送查询...`);
            console.log(`API端点: ${this.apiEndpoint}`);
            
            // 根据API端点路径判断使用哪种API格式
            const isCompletionAPI = this.apiEndpoint.includes('generate') || 
                                    this.apiEndpoint.includes('completions');
            
            let requestBody;
            if (isCompletionAPI) {
                console.log('使用Completions API格式');
                requestBody = {
                    model: this.model,
                    prompt: prompt,
                    stream: false
                };
            } else {
                console.log('使用Chat API格式');
                requestBody = {
                    model: this.model,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    stream: false
                };
            }
            
            console.log(`请求体: ${JSON.stringify(requestBody).substring(0, 200)}...`);
            
            // 设置超时
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时
            
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });
            
            // 清除超时计时器
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`响应数据结构: ${JSON.stringify(Object.keys(data))}`);
            
            let content = '';
            if (isCompletionAPI) {
                content = data.response || data.choices?.[0]?.text || data.output || data.completion || '';
            } else {
                content = data.message?.content || data.choices?.[0]?.message?.content || data.content || '';
            }
            
            if (!content) {
                console.warn('API响应中未找到内容，返回原始响应数据');
                return JSON.stringify(data);
            }
            
            console.log(`获取到响应(前50字符): ${content.substring(0, 50)}...`);
            return content;
        } catch (error) {
            console.error('查询LLM失败:', error);
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
    }
}