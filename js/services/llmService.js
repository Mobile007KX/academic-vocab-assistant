/**
 * LLM服务
 * 负责与Ollama API交互生成文本内容
 */

export class LLMService {
    constructor() {
        this.apiEndpoint = 'http://localhost:11434/api/generate';
        this.model = 'llama3.2';
        this.connectionTested = false;
    }
    
    /**
     * 测试与API的连接
     * @returns {Promise<boolean>} 连接是否成功
     */
    async testConnection() {
        try {
            console.log(`测试连接到 ${this.model} 模型，API端点: ${this.apiEndpoint}`);
            
            // 使用简化的测试请求
            const requestBody = {
                model: this.model,
                prompt: 'Hello',
                stream: false
            };
            
            console.log('发送测试请求...');
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(5000) // 5秒超时
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('API测试成功');
                this.connectionTested = true;
                return true;
            }
            
            const errorText = await response.text().catch(() => '');
            console.log(`连接测试失败，状态码: ${response.status}, 错误: ${errorText}`);
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
            // 如果尚未测试连接，先测试
            if (!this.connectionTested) {
                const connected = await this.testConnection();
                if (!connected) {
                    throw new Error('无法连接到Ollama API，请检查服务是否启动');
                }
            }
            
            console.log(`向模型 ${this.model} 发送查询...`);
            
            const requestBody = {
                model: this.model,
                prompt: prompt,
                stream: false
            };
            
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(30000) // 30秒超时
            });
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                throw new Error(`API请求失败: ${response.status} ${response.statusText} ${errorText}`);
            }
            
            const data = await response.json();
            const content = data.response || '';
            
            if (!content) {
                throw new Error('API返回的内容为空');
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
        this.connectionTested = false;
    }
}