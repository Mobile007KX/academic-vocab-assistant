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
            
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    stream: false
                })
            });
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            return data.message?.content || '';
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