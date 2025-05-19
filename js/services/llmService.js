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
            
            // 简化：直接测试/api/tags端点，这是最可靠的
            const baseUrl = this.apiEndpoint.includes('localhost:11434') ? 
                'http://localhost:11434' : 
                this.apiEndpoint.split('/api')[0];
                
            const tagsUrl = `${baseUrl}/api/tags`;
            console.log(`测试基础连接: ${tagsUrl}`);
            
            // 先测试基本连接
            try {
                const tagsResponse = await fetch(tagsUrl, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000)
                });
                
                if (tagsResponse.ok) {
                    const tagsData = await tagsResponse.json();
                    console.log('Ollama服务连接成功，可用模型:', tagsData.models?.map(m => m.name).join(', '));
                    
                    // 检查模型是否可用
                    const modelAvailable = tagsData.models?.some(m => m.name === this.model);
                    if (!modelAvailable) {
                        console.warn(`警告: 模型 ${this.model} 未找到，可用模型: ${tagsData.models?.map(m => m.name).join(', ')}`);
                    }
                } else {
                    console.warn(`Ollama服务返回错误: ${tagsResponse.status} ${tagsResponse.statusText}`);
                }
            } catch (tagsError) {
                console.error('连接到Ollama服务失败:', tagsError);
                // 继续测试实际API端点
            }
            
            // 测试实际API端点
            let testEndpoint;
            let requestBody;
            
            // 根据端点判断应该使用哪种API格式
            if (this.apiEndpoint.includes('/generate') || this.apiEndpoint.includes('/completions')) {
                // 已经是generate端点
                testEndpoint = this.apiEndpoint;
                requestBody = {
                    model: this.model,
                    prompt: 'Hi',
                    stream: false
                };
            } else if (this.apiEndpoint.includes('/chat')) {
                // 聊天API
                testEndpoint = this.apiEndpoint;
                requestBody = {
                    model: this.model,
                    messages: [
                        { role: 'user', content: 'Hi' }
                    ],
                    stream: false
                };
            } else {
                // 默认使用generate端点
                testEndpoint = `${baseUrl}/api/generate`;
                requestBody = {
                    model: this.model,
                    prompt: 'Hi',
                    stream: false
                };
            }
            
            console.log(`测试API端点: ${testEndpoint}`);
            console.log(`请求体: ${JSON.stringify(requestBody)}`);
            
            const response = await fetch(testEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                // 设置较短的超时时间
                signal: AbortSignal.timeout(8000)
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('API测试成功，响应数据:', Object.keys(data));
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
            // 每次查询前都测试连接
            const connected = await this.testConnection();
            if (!connected) {
                throw new Error('无法连接到Ollama API，请检查服务是否启动');
            }
            
            console.log(`向模型 ${this.model} 发送查询...`);
            console.log(`API端点: ${this.apiEndpoint}`);
            
            // 根据API端点路径判断使用哪种API格式
            let useEndpoint = this.apiEndpoint;
            const baseUrl = this.apiEndpoint.includes('localhost:11434') ? 
                'http://localhost:11434' : 
                this.apiEndpoint.split('/api')[0];
            
            // 智能判断API端点类型
            const isCompletionAPI = this.apiEndpoint.includes('generate') || 
                                   this.apiEndpoint.includes('completions');
                                   
            // 如果是不明确的端点，重置为默认安全值
            if (!this.apiEndpoint.includes('/api/')) {
                if (isCompletionAPI) {
                    useEndpoint = `${baseUrl}/api/generate`;
                } else {
                    useEndpoint = `${baseUrl}/api/chat`;
                }
                console.log(`重置为标准端点: ${useEndpoint}`);
            }
            
            let requestBody;
            if (isCompletionAPI) {
                console.log('使用Completions API格式');
                requestBody = {
                    model: this.model,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        top_p: 0.9,
                        num_predict: 2048
                    }
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
                    stream: false,
                    options: {
                        temperature: 0.7,
                        top_p: 0.9
                    }
                };
            }
            
            console.log(`请求体: ${JSON.stringify(requestBody).substring(0, 200)}...`);
            
            // 设置超时和重试
            const maxRetries = 2;
            let retryCount = 0;
            let lastError = null;
            
            while (retryCount <= maxRetries) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90秒超时
                    
                    console.log(`尝试请求(${retryCount}/${maxRetries})...`);
                    const response = await fetch(useEndpoint, {
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
                        const errorText = await response.text().catch(() => '');
                        throw new Error(`API请求失败: ${response.status} ${response.statusText} ${errorText}`);
                    }
                    
                    const data = await response.json();
                    console.log(`响应数据结构: ${JSON.stringify(Object.keys(data))}`);
                    
                    let content = '';
                    if (isCompletionAPI) {
                        content = data.response || data.choices?.[0]?.text || data.output || data.generation || data.completion || '';
                    } else {
                        content = data.message?.content || data.choices?.[0]?.message?.content || data.content || '';
                    }
                    
                    if (!content && data) {
                        // 尝试从任何地方提取内容
                        console.warn('标准字段中未找到内容，尝试从整个响应中提取...');
                        const dataStr = JSON.stringify(data);
                        
                        // 如果至少有某些内容，就返回整个响应
                        if (dataStr.length > 10) {
                            if (typeof data === 'object') {
                                // 尝试找到最长的字符串属性
                                let longestStrValue = '';
                                for (const key in data) {
                                    if (typeof data[key] === 'string' && data[key].length > longestStrValue.length) {
                                        longestStrValue = data[key];
                                    }
                                }
                                
                                if (longestStrValue.length > 0) {
                                    console.log('找到最长的字符串内容:', longestStrValue.substring(0, 50) + '...');
                                    content = longestStrValue;
                                } else {
                                    content = dataStr;
                                }
                            } else {
                                content = dataStr;
                            }
                        }
                    }
                    
                    console.log(`获取到响应(前50字符): ${content.substring(0, 50)}...`);
                    return content;
                    
                } catch (retryError) {
                    lastError = retryError;
                    console.warn(`尝试 ${retryCount + 1}/${maxRetries + 1} 失败:`, retryError.message);
                    retryCount++;
                    
                    if (retryCount <= maxRetries) {
                        // 如果是最后一次重试，尝试切换API格式
                        if (retryCount === maxRetries) {
                            if (isCompletionAPI) {
                                useEndpoint = `${baseUrl}/api/chat`;
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
                                console.log('切换到Chat API格式重试...');
                            } else {
                                useEndpoint = `${baseUrl}/api/generate`;
                                requestBody = {
                                    model: this.model,
                                    prompt: prompt,
                                    stream: false
                                };
                                console.log('切换到Completions API格式重试...');
                            }
                        }
                        
                        // 等待一段时间后重试
                        const waitTime = retryCount * 1000;
                        console.log(`等待 ${waitTime}ms 后重试...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    }
                }
            }
            
            // 所有重试都失败了
            throw lastError || new Error('所有请求尝试均失败');
            
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