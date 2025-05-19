/**
 * 文本处理器
 * 负责从输入文本中提取学术词汇并处理词汇解释
 */

export class TextProcessor {
    constructor(llmService) {
        this.llmService = llmService;
        this.commonWords = new Set([
            'the', 'and', 'a', 'to', 'of', 'in', 'is', 'it', 'that', 'you', 
            'was', 'for', 'on', 'are', 'with', 'as', 'have', 'be', 'this', 'at',
            'from', 'or', 'had', 'by', 'but', 'not', 'what', 'all', 'were', 'when',
            'we', 'there', 'can', 'an', 'your', 'which', 'their', 'said', 'if', 'do',
            'will', 'each', 'about', 'how', 'up', 'out', 'them', 'then', 'she', 'many',
            'some', 'so', 'these', 'would', 'other', 'into', 'has', 'more', 'her', 'two',
            'like', 'him', 'see', 'time', 'could', 'no', 'make', 'than', 'first', 'been',
            'its', 'who', 'now', 'people', 'my', 'made', 'over', 'did', 'down', 'only',
            'way', 'find', 'use', 'may', 'water', 'long', 'little', 'very', 'after', 'words',
            'called', 'just', 'where', 'most', 'know', 'get', 'through', 'back', 'much', 'go',
            'good', 'new', 'write', 'our', 'me', 'man', 'too', 'any', 'day', 'same',
            'right', 'look', 'think', 'also', 'around', 'another', 'came', 'come', 'work', 'three',
            'must', 'because', 'does', 'part', 'even', 'place', 'well', 'such', 'here', 'take',
            'why', 'help', 'put', 'different', 'away', 'again', 'off', 'went', 'old', 'number',
            'great', 'tell', 'men', 'say', 'small', 'every', 'found', 'still', 'between', 'name',
            'should', 'home', 'big', 'give', 'air', 'line', 'set', 'own', 'under', 'read',
            'last', 'never', 'us', 'left', 'end', 'along', 'while', 'might', 'next', 'sound',
            'below', 'saw', 'something', 'thought', 'both', 'few', 'those', 'having', 'near', 'ask'
        ]);
    }
    
    /**
     * 从文本中提取学术词汇
     * @param {string} text - 输入文本
     * @returns {Promise<Array<string>>} 提取的词汇数组
     */
    async extractWords(text) {
        try {
            // 先对文本进行预处理
            text = text.replace(/[^\w\s\-']/g, ' ').toLowerCase();
            
            // 拆分为单词
            const allWords = text.split(/\s+/).filter(word => word.length > 1);
            
            // 过滤常见词
            const filteredWords = allWords.filter(word => !this.commonWords.has(word));
            
            // 统计词频
            const wordCount = {};
            filteredWords.forEach(word => {
                wordCount[word] = (wordCount[word] || 0) + 1;
            });
            
            // 排序并去重
            const sortedWords = Object.keys(wordCount)
                .sort((a, b) => wordCount[b] - wordCount[a]);
                
            // 如果输入已经是词汇列表，直接返回
            if (allWords.length === filteredWords.length && allWords.length < 50) {
                return allWords.filter((word, index, self) => 
                    self.indexOf(word) === index && word.length > 1
                );
            }
            
            // 使用LLM进一步筛选学术词汇
            if (sortedWords.length > 10) {
                const academicWords = await this.filterAcademicWords(sortedWords.slice(0, 100));
                return academicWords;
            }
            
            return sortedWords;
        } catch (error) {
            console.error('提取词汇失败:', error);
            throw error;
        }
    }
    
    /**
     * 使用LLM过滤学术词汇
     * @param {Array<string>} words - 待过滤的词汇
     * @returns {Promise<Array<string>>} 学术词汇数组
     */
    async filterAcademicWords(words) {
        try {
            const prompt = `
            Please identify and extract academic or valuable vocabulary words from the following list. 
            Focus on words that are important in academic contexts, specialized terminology, or words 
            that would be valuable for a language learner to study. Exclude common everyday words, 
            simple words, proper nouns, and non-academic terms.
            
            List of words: ${words.join(', ')}
            
            Please return ONLY a comma-separated list of the academic words, with no other text or explanations.
            `;
            
            const response = await this.llmService.query(prompt);
            
            if (!response) return words.slice(0, 30); // 失败时返回原表的前30个词
            
            // 从响应中提取词汇
            const extractedWords = response.split(',').map(word => word.trim().toLowerCase())
                .filter(word => word.length > 1 && /^[a-z\-']+$/.test(word));
            
            return extractedWords.length > 0 ? extractedWords : words.slice(0, 30);
        } catch (error) {
            console.error('过滤学术词汇失败:', error);
            return words.slice(0, 30); // 失败时返回原表的前30个词
        }
    }
    
    /**
     * 生成词汇解释
     * @param {string} word - 要生成解释的词汇
     * @param {string} mode - 解释模式
     * @returns {Promise<Object>} 词汇解释结果
     */
    async processWord(word) {
        try {
            // 发送请求获取词汇的三模式内容
            const prompt = this.getSimplifiedPrompt(word);
            const content = await this.llmService.query(prompt);
            
            if (!content) {
                throw new Error('生成词汇解释失败');
            }
            
            // 提取JSON并生成HTML
            let wordData;
            try {
                console.log(`原始内容(前100字符): ${content.substring(0, 100)}...`);
                
                // 尝试多种方式提取JSON
                let jsonStr = null;
                
                // 方法1: 检查整个响应是否是有效JSON
                if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
                    try {
                        const parsedData = JSON.parse(content.trim());
                        if (parsedData && typeof parsedData === 'object') {
                            jsonStr = content.trim();
                            console.log('整个响应是有效的JSON对象');
                        }
                    } catch (e) {
                        console.log('整个响应不是有效JSON，尝试其他提取方法');
                    }
                }
                
                // 方法2: 寻找```json```块
                if (!jsonStr) {
                    const codeBlockMatch = content.match(/```(?:json)?([\s\S]*?)```/);
                    if (codeBlockMatch) {
                        try {
                            const cleanBlock = codeBlockMatch[1].trim();
                            JSON.parse(cleanBlock);
                            jsonStr = cleanBlock;
                            console.log('从代码块中提取JSON成功');
                        } catch (e) {
                            console.log('代码块不是有效JSON');
                        }
                    }
                }
                
                // 方法3: 尝试查找完整的JSON对象
                if (!jsonStr) {
                    // 寻找最外层的大括号包含的内容
                    const jsonObjectMatch = content.match(/\{([\s\S]*?)\}(?=[^{}]*$)/);
                    if (jsonObjectMatch) {
                        try {
                            const fullJson = '{' + jsonObjectMatch[1] + '}';
                            JSON.parse(fullJson);
                            jsonStr = fullJson;
                            console.log('从内容中提取完整JSON对象成功');
                        } catch (e) {
                            console.log('提取的JSON对象无效');
                        }
                    }
                }
                
                // 如果找到了JSON字符串，尝试清理和解析
                if (jsonStr) {
                    // 清理JSON字符串，移除不必要的字符和转义
                    jsonStr = jsonStr.replace(/\\n/g, '\n')
                                    .replace(/\\\\/g, '/')
                                    .replace(/\r/g, '') // 移除回车符
                                    .replace(/\t/g, ' '); // 制表符替换为空格
                    
                    // 尝试修复常见JSON格式问题
                    jsonStr = jsonStr.replace(/,\s*\}/g, '}') // 移除对象末尾的逗号
                                    .replace(/,\s*\]/g, ']'); // 移除数组末尾的逗号
                                     
                    console.log(`尝试解析JSON: ${jsonStr.substring(0, 50)}...`);
                    
                    try {
                        wordData = JSON.parse(jsonStr);
                        console.log('JSON解析成功');
                    } catch (parseError) {
                        console.error(`JSON解析失败: ${parseError.message}，尝试修复后再解析`);
                        
                        // 最后尝试一些常见的修复方法
                        try {
                            // 移除不可见字符
                            const fixedJson = jsonStr.replace(/[\u0000-\u001F]/g, '');
                            wordData = JSON.parse(fixedJson);
                            console.log('修复后JSON解析成功');
                        } catch (finalError) {
                            console.error('所有JSON解析方法都失败，回退到文本处理模式');
                            throw finalError;
                        }
                    }
                } else {
                    // 没有找到JSON
                    console.warn(`未找到词汇 ${word} 的JSON格式，回退到文本处理...`);
                    throw new Error('未找到有效的JSON格式');
                }
                
                // 验证JSON数据的有效性
                if (!wordData || !wordData.modes) {
                    console.warn(`词汇 ${word} 的JSON数据结构无效，回退到文本处理...`);
                    throw new Error('JSON数据结构无效');
                }
                
                // 从JSON生成HTML
                const formattedContent = this.processJsonToHTML(wordData, word);
                
                return {
                    word,
                    content: formattedContent,
                    mode: 'tri-mode',
                    timestamp: new Date().toISOString()
                };
                
            } catch (jsonError) {
                console.error(`解析 ${word} 的JSON失败:`, jsonError);
                // 回退到旧的处理方式
                const formattedContent = this.processTriModeResponse(content, word);
                return {
                    word,
                    content: formattedContent,
                    mode: 'tri-mode',
                    timestamp: new Date().toISOString()
                };
            }
            
        } catch (error) {
            console.error(`处理词汇 ${word} 失败:`, error);
            throw error;
        }
    }
    
    /**
     * 获取简化的提示词，避免复杂JSON结构导致错误
     */
    getSimplifiedPrompt(word) {
        return `为词汇"${word}"创建三模式词典条目，以简单JSON格式返回。只返回JSON，不要解释或使用代码块。

格式：
{
  "word": "${word}",
  "modes": {
    "professional": {
      "title": "${word}",
      "definition": "英文学术定义",
      "pronunciation": "音标",
      "academicUsage": ["学术例句"],
      "everydayUse": ["日常例句"],
      "associatedVocabulary": ["相关词汇"],
      "grammar": ["语法点"],
      "collocations": {"搭配类型": "搭配词组"},
      "synonyms": [{"word": "同义词", "explanation": "解释"}],
      "antonyms": [{"word": "反义词", "explanation": "解释"}]
    },
    "intermediate": {
      "title": "${word}",
      "definition": "中文释义",
      "pronunciation": "发音",
      "academicUsage": ["学术例句"],
      "everydayUse": ["日常例句"],
      "associatedVocabulary": [{"en": "英文词", "zh": "中文释义"}],
      "grammar": ["语法点"],
      "collocations": {"搭配类型": "搭配词组"},
      "synonyms": [{"word": "同义词", "explanation": "解释"}]
    },
    "elementary": {
      "title": "${word}",
      "definition": "简单中文解释",
      "pronunciation": "简化发音",
      "usage": ["简单例句"],
      "relatedWords": "相关词汇",
      "tips": "记忆方法",
      "similarWords": [{"word": "简单同义词", "explanation": "解释"}]
    }
  }
}`;
    }
    
    /**
     * 获取三模式提示词
     * @param {string} word - 词汇
     * @returns {string} 提示词
     */
    getTriModePrompt(word) {
        return `
        请为学术词汇"${word}"创建一个完整的词条，按以下格式包含三种不同的展示模式。每个模式之间使用###MODE_SEPARATOR作为分隔符。

        模式1: 专业英文模式 (完全英文，学术性强)
        词条格式:
        📘 Word: ${word}
        🧠 Definition: [详细的学术定义]
        🔊 Pronunciation: [音标]
        🎯 Academic Usage:
        • [学术例句1]
        • [学术例句2]
        • [学术例句3]
        💬 Everyday Use:
        • [日常例句1]
        • [日常例句2]
        🔗 Associated Academic Vocabulary:
        [相关学术词汇，每行4个词汇]
        🧭 Grammar & Usage:
        • [语法点1]
        • [语法点2]
        🔄 Collocations:
        • [常见搭配类型1]: [搭配词组]
        • [常见搭配类型2]: [搭配词组]
        📝 Synonyms:
        • [同义词1] ([简短解释])
        • [同义词2] ([简短解释])
        🚫 Antonyms:
        • [反义词1] ([简短解释])
        • [反义词2] ([简短解释])

        ###MODE_SEPARATOR

        模式2: 中文解说模式 (中英双语)
        词条格式:
        📘 词汇: ${word}
        🧠 定义: [中文简明释义]
        🔊 发音: [音标]
        🎯 学术用法:
        • [英文例句1]
        • [英文例句2]
        💬 日常用法:
        • [英文例句1]
        • [英文例句2]
        🔗 相关学术词汇:
        [中英对照词汇列表]
        🧭 语法与用法:
        • [中文解释的语法点1]
        • [中文解释的语法点2]
        🔄 常见搭配:
        • [搭配类型1]: [搭配词组]
        • [搭配类型2]: [搭配词组]
        📝 同义词:
        • [同义词1] ([中文解释])
        • [同义词2] ([中文解释])

        ###MODE_SEPARATOR

        模式3: 儿童启蒙模式 (简单易懂)
        词条格式:
        📘 词汇: ${word}
        🧠 意思: [非常简单的中文解释]
        🔊 怎么读: [简化的发音指导]
        🎯 怎么用:
        • [简单例句1]
        • [简单例句2]
        • [简单例句3]
        🔗 相关词汇: [简单相关词汇]
        🧭 小贴士: [简单记忆方法]
        📝 类似的词:
        • [简单同义词1] ([简单解释])
        • [简单同义词2] ([简单解释])

        请确保严格遵循上述格式，使用emoji标识各部分，并保持三种模式的内容相互独立且完整。
        `;
    }
    
    /**
     * 将JSON数据处理为HTML
     * @param {Object} data - 词汇数据
     * @param {string} word - 词汇
     * @returns {string} HTML字符串
     */
    processJsonToHTML(data, word) {
        try {
            // 创建随机ID，避免模态窗口中的ID冲突
            const randomId = Math.random().toString(36).substring(2, 8);
            
            // 处理专业英文模式
            const professional = data.modes?.professional || {};
            const professionalHTML = `
                <div class="section-title">📘 Word: ${professional.title || word}</div>
                <div class="section-title">🧠 Definition:</div>
                <p>${professional.definition || '无定义'}</p>
                <div class="section-title">🔊 Pronunciation: ${professional.pronunciation || ''}</div>
                <div class="section-title">🎯 Academic Usage:</div>
                <ul>
                    ${(professional.academicUsage || []).map(item => `<li>${item}</li>`).join('')}
                </ul>
                <div class="section-title">💬 Everyday Use:</div>
                <ul>
                    ${(professional.everydayUse || []).map(item => `<li>${item}</li>`).join('')}
                </ul>
                <div class="section-title">🔗 Associated Academic Vocabulary:</div>
                <p>${(professional.associatedVocabulary || []).join(', ')}</p>
                <div class="section-title">🧭 Grammar & Usage:</div>
                <ul>
                    ${(professional.grammar || []).map(item => `<li>${item}</li>`).join('')}
                </ul>
                <div class="section-title">🔄 Collocations:</div>
                <ul>
                    ${Object.entries(professional.collocations || {}).map(([key, value]) => `<li>${key}: ${value}</li>`).join('')}
                </ul>
                <div class="section-title">📝 Synonyms:</div>
                <ul>
                    ${(professional.synonyms || []).map(item => `<li>${item.word} (${item.explanation})</li>`).join('')}
                </ul>
                <div class="section-title">🚫 Antonyms:</div>
                <ul>
                    ${(professional.antonyms || []).map(item => `<li>${item.word} (${item.explanation})</li>`).join('')}
                </ul>
            `;
            
            // 处理中级模式
            const intermediate = data.modes?.intermediate || {};
            const intermediateHTML = `
                <div class="section-title">📘 词汇: ${intermediate.title || word}</div>
                <div class="section-title">🧠 定义:</div>
                <p>${intermediate.definition || '无定义'}</p>
                <div class="section-title">🔊 发音: ${intermediate.pronunciation || ''}</div>
                <div class="section-title">🎯 学术用法:</div>
                <ul>
                    ${(intermediate.academicUsage || []).map(item => `<li>${item}</li>`).join('')}
                </ul>
                <div class="section-title">💬 日常用法:</div>
                <ul>
                    ${(intermediate.everydayUse || []).map(item => `<li>${item}</li>`).join('')}
                </ul>
                <div class="section-title">🔗 相关学术词汇:</div>
                <p>
                    ${(intermediate.associatedVocabulary || []).map(item => 
                        `${item.en || ''} (${item.zh || ''})`).join(', ')}
                </p>
                <div class="section-title">🧭 语法与用法:</div>
                <ul>
                    ${(intermediate.grammar || []).map(item => `<li>${item}</li>`).join('')}
                </ul>
                <div class="section-title">🔄 常见搭配:</div>
                <ul>
                    ${Object.entries(intermediate.collocations || {}).map(([key, value]) => `<li>${key}: ${value}</li>`).join('')}
                </ul>
                <div class="section-title">📝 同义词:</div>
                <ul>
                    ${(intermediate.synonyms || []).map(item => `<li>${item.word} (${item.explanation})</li>`).join('')}
                </ul>
            `;
            
            // 处理启蒙模式
            const elementary = data.modes?.elementary || {};
            const elementaryHTML = `
                <div class="section-title">📘 词汇: ${elementary.title || word}</div>
                <div class="section-title">🧠 意思:</div>
                <p>${elementary.definition || '无定义'}</p>
                <div class="section-title">🔊 怎么读: ${elementary.pronunciation || ''}</div>
                <div class="section-title">🎯 怎么用:</div>
                <ul>
                    ${(elementary.usage || []).map(item => `<li>${item}</li>`).join('')}
                </ul>
                <div class="section-title">🔗 相关词汇:</div>
                <p>${elementary.relatedWords || ''}</p>
                <div class="section-title">🧭 小贴士:</div>
                <p>${elementary.tips || ''}</p>
                <div class="section-title">📝 类似的词:</div>
                <ul>
                    ${(elementary.similarWords || []).map(item => `<li>${item.word} (${item.explanation})</li>`).join('')}
                </ul>
            `;
            
            // 组合成完整的HTML
            return `
            <div class="word-tabs">
                <ul class="nav nav-tabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="prof-tab-${randomId}" data-bs-toggle="tab" data-bs-target="#prof-${randomId}" type="button" role="tab">专业英文</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="inter-tab-${randomId}" data-bs-toggle="tab" data-bs-target="#inter-${randomId}" type="button" role="tab">中文解说</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="elem-tab-${randomId}" data-bs-toggle="tab" data-bs-target="#elem-${randomId}" type="button" role="tab">儿童启蒙</button>
                    </li>
                </ul>
                <div class="tab-content">
                    <div class="tab-pane fade show active" id="prof-${randomId}" role="tabpanel">
                        <div class="content-section">${professionalHTML}</div>
                    </div>
                    <div class="tab-pane fade" id="inter-${randomId}" role="tabpanel">
                        <div class="content-section">${intermediateHTML}</div>
                    </div>
                    <div class="tab-pane fade" id="elem-${randomId}" role="tabpanel">
                        <div class="content-section">${elementaryHTML}</div>
                    </div>
                </div>
            </div>`;
            
        } catch (error) {
            console.error('处理JSON到HTML失败:', error);
            return `<div class="alert alert-danger">处理词汇 "${word}" 失败: ${error.message}</div>`;
        }
    }
    
    /**
     * 处理三模式响应并生成HTML
     * @param {string} content - LLM返回的内容
     * @param {string} word - 词汇
     * @returns {string} 格式化的HTML内容
     */
    processTriModeResponse(content, word) {
        try {
            // 分离三种模式的内容
            const modes = content.split('###MODE_SEPARATOR').map(text => text.trim());
            
            if (modes.length < 3) {
                console.warn(`词汇 ${word} 的响应格式不完整，仅包含 ${modes.length} 个模式`);
                // 填充缺失的模式
                while (modes.length < 3) {
                    modes.push(`📘 ${modes.length === 0 ? 'Word' : '词汇'}: ${word}\n🧠 ${modes.length === 0 ? 'Definition' : (modes.length === 1 ? '定义' : '意思')}: 无法获取内容`);
                }
            }
            
            // 创建随机ID，避免模态窗口中的ID冲突
            const randomId = Math.random().toString(36).substring(2, 8);
            
            // 处理每种模式的内容
            const professionalHTML = this.formatModeContent(modes[0]);
            const intermediateHTML = this.formatModeContent(modes[1]);
            const elementaryHTML = this.formatModeContent(modes[2]);
            
            return `
            <div class="word-tabs">
                <ul class="nav nav-tabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="prof-tab-${randomId}" data-bs-toggle="tab" data-bs-target="#prof-${randomId}" type="button" role="tab">专业英文</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="inter-tab-${randomId}" data-bs-toggle="tab" data-bs-target="#inter-${randomId}" type="button" role="tab">中文解说</button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="elem-tab-${randomId}" data-bs-toggle="tab" data-bs-target="#elem-${randomId}" type="button" role="tab">儿童启蒙</button>
                    </li>
                </ul>
                <div class="tab-content">
                    <div class="tab-pane fade show active" id="prof-${randomId}" role="tabpanel">
                        <div class="content-section">${professionalHTML}</div>
                    </div>
                    <div class="tab-pane fade" id="inter-${randomId}" role="tabpanel">
                        <div class="content-section">${intermediateHTML}</div>
                    </div>
                    <div class="tab-pane fade" id="elem-${randomId}" role="tabpanel">
                        <div class="content-section">${elementaryHTML}</div>
                    </div>
                </div>
            </div>`;
        } catch (error) {
            console.error('处理三模式响应失败:', error);
            return `<div class="alert alert-danger">处理词汇 "${word}" 失败: ${error.message}</div>`;
        }
    }
    
    /**
     * 格式化模式内容为HTML
     * @param {string} content - 原始内容
     * @returns {string} 格式化的HTML内容
     */
    formatModeContent(content) {
        if (!content) return '<p>无内容</p>';
        
        // 处理emoji标题
        let formatted = content.replace(/^([\p{Emoji}\p{Emoji_Presentation}].*?):(.*?)$/gmu, 
            '<div class="section-title">$1:</div><p>$2</p>');
            
        // 处理列表项
        formatted = formatted.replace(/^• (.*)$/gm, '<li>$1</li>');
        
        // 将连续的列表项包装在ul标签中
        formatted = formatted.replace(/(<li>.*<\/li>\s*)+/g, '<ul>$&</ul>');
        
        // 将换行符转换为<br>或段落
        formatted = formatted.replace(/\n{2,}/g, '</p><p>');
        formatted = formatted.replace(/\n/g, '<br>');
        
        // 确保所有文本在段落内
        if (!formatted.startsWith('<')) {
            formatted = '<p>' + formatted + '</p>';
        }
        
        return formatted;
    }
    
    /**
     * 从文本内容中提取专业模式数据
     * @param {string} content - LLM返回的内容
     * @param {string} word - 词汇
     * @returns {Object} 提取的结构化数据
     */
    extractProfessionalMode(content, word) {
        try {
            // 如果内容包含模式分隔符，尝试提取第一个模式
            let professionalContent = content;
            if (content.includes('###MODE_SEPARATOR')) {
                const parts = content.split('###MODE_SEPARATOR');
                professionalContent = parts[0];
            }
            
            // 提取定义
            const definitionMatch = professionalContent.match(/Definition:([^\n]*)/i) || 
                                   professionalContent.match(/🧠([^\n]*)/i);
            const definition = definitionMatch ? definitionMatch[1].trim() : '';
            
            // 提取发音
            const pronunciationMatch = professionalContent.match(/Pronunciation:([^\n]*)/i) || 
                                      professionalContent.match(/🔊([^\n]*)/i);
            const pronunciation = pronunciationMatch ? pronunciationMatch[1].trim() : '';
            
            // 提取学术用法例句
            const academicUsage = this.extractListItems(professionalContent, 'Academic Usage', '🎯');
            
            // 提取日常用法例句
            const everydayUse = this.extractListItems(professionalContent, 'Everyday Use', '💬');
            
            // 提取相关词汇
            const vocabularyMatch = professionalContent.match(/Associated Academic Vocabulary:([^\n]*)/i) || 
                                   professionalContent.match(/🔗([^\n]*)/i);
            const associatedVocabulary = vocabularyMatch ? 
                vocabularyMatch[1].trim().split(/[,，、]/).map(w => w.trim()).filter(w => w) : [];
            
            // 提取语法点
            const grammar = this.extractListItems(professionalContent, 'Grammar & Usage', '🧭');
            
            // 提取搭配
            const collocations = {};
            const collocationMatches = [...professionalContent.matchAll(/• ([^:]+): ([^\n]*)/g)];
            collocationMatches.forEach(match => {
                if (match[1] && match[2]) {
                    collocations[match[1].trim()] = match[2].trim();
                }
            });
            
            // 提取同义词
            const synonyms = [];
            const synonymMatches = [...professionalContent.matchAll(/• ([^(]+) \(([^)]+)\)/g)];
            synonymMatches.forEach(match => {
                if (match[1] && match[2]) {
                    synonyms.push({
                        word: match[1].trim(),
                        explanation: match[2].trim()
                    });
                }
            });
            
            // 提取反义词
            const antonyms = [];
            const antonymMatches = [...professionalContent.matchAll(/• ([^(]+) \(([^)]+)\)/g)];
            antonymMatches.forEach(match => {
                if (match[1] && match[2] && 
                    (professionalContent.includes('Antonyms') || professionalContent.includes('🚫'))) {
                    antonyms.push({
                        word: match[1].trim(),
                        explanation: match[2].trim()
                    });
                }
            });
            
            return {
                title: word,
                definition,
                pronunciation,
                academicUsage,
                everydayUse,
                associatedVocabulary,
                grammar,
                collocations,
                synonyms,
                antonyms
            };
        } catch (error) {
            console.error('提取专业模式数据失败:', error);
            return { title: word };
        }
    }
    
    /**
     * 从文本内容中提取中级模式数据
     * @param {string} content - LLM返回的内容
     * @param {string} word - 词汇
     * @returns {Object} 提取的结构化数据
     */
    extractIntermediateMode(content, word) {
        try {
            // 如果内容包含模式分隔符，尝试提取第二个模式
            let intermediateContent = content;
            if (content.includes('###MODE_SEPARATOR')) {
                const parts = content.split('###MODE_SEPARATOR');
                intermediateContent = parts.length > 1 ? parts[1] : content;
            }
            
            // 提取定义
            const definitionMatch = intermediateContent.match(/定义:([^\n]*)/i) || 
                                   intermediateContent.match(/🧠([^\n]*)/i);
            const definition = definitionMatch ? definitionMatch[1].trim() : '';
            
            // 提取发音
            const pronunciationMatch = intermediateContent.match(/发音:([^\n]*)/i) || 
                                      intermediateContent.match(/🔊([^\n]*)/i);
            const pronunciation = pronunciationMatch ? pronunciationMatch[1].trim() : '';
            
            // 提取学术用法例句
            const academicUsage = this.extractListItems(intermediateContent, '学术用法', '🎯');
            
            // 提取日常用法例句
            const everydayUse = this.extractListItems(intermediateContent, '日常用法', '💬');
            
            // 提取相关词汇
            const associatedVocabulary = [];
            const vocabularyMatch = intermediateContent.match(/相关学术词汇:([^\n]*)/i) || 
                                   intermediateContent.match(/🔗([^\n]*)/i);
            if (vocabularyMatch) {
                const vocabText = vocabularyMatch[1].trim();
                const vocabItems = vocabText.split(/[,，、]/);
                vocabItems.forEach(item => {
                    const parts = item.trim().match(/([^(]+)\(([^)]+)\)/i);
                    if (parts) {
                        associatedVocabulary.push({
                            en: parts[1].trim(),
                            zh: parts[2].trim()
                        });
                    } else {
                        associatedVocabulary.push({
                            en: item.trim(),
                            zh: ''
                        });
                    }
                });
            }
            
            // 提取语法点
            const grammar = this.extractListItems(intermediateContent, '语法与用法', '🧭');
            
            // 提取搭配
            const collocations = {};
            const collocationMatches = [...intermediateContent.matchAll(/• ([^:]+): ([^\n]*)/g)];
            collocationMatches.forEach(match => {
                if (match[1] && match[2]) {
                    collocations[match[1].trim()] = match[2].trim();
                }
            });
            
            // 提取同义词
            const synonyms = [];
            const synonymMatches = [...intermediateContent.matchAll(/• ([^(]+) \(([^)]+)\)/g)];
            synonymMatches.forEach(match => {
                if (match[1] && match[2] && 
                    (intermediateContent.includes('同义词') || intermediateContent.includes('📝'))) {
                    synonyms.push({
                        word: match[1].trim(),
                        explanation: match[2].trim()
                    });
                }
            });
            
            return {
                title: word,
                definition,
                pronunciation,
                academicUsage,
                everydayUse,
                associatedVocabulary,
                grammar,
                collocations,
                synonyms
            };
        } catch (error) {
            console.error('提取中级模式数据失败:', error);
            return { title: word };
        }
    }
    
    /**
     * 从文本内容中提取初级模式数据
     * @param {string} content - LLM返回的内容
     * @param {string} word - 词汇
     * @returns {Object} 提取的结构化数据
     */
    extractElementaryMode(content, word) {
        try {
            // 如果内容包含模式分隔符，尝试提取第三个模式
            let elementaryContent = content;
            if (content.includes('###MODE_SEPARATOR')) {
                const parts = content.split('###MODE_SEPARATOR');
                elementaryContent = parts.length > 2 ? parts[2] : content;
            }
            
            // 提取定义
            const definitionMatch = elementaryContent.match(/意思:([^\n]*)/i) || 
                                   elementaryContent.match(/🧠([^\n]*)/i);
            const definition = definitionMatch ? definitionMatch[1].trim() : '';
            
            // 提取发音
            const pronunciationMatch = elementaryContent.match(/怎么读:([^\n]*)/i) || 
                                      elementaryContent.match(/🔊([^\n]*)/i);
            const pronunciation = pronunciationMatch ? pronunciationMatch[1].trim() : '';
            
            // 提取用法例句
            const usage = this.extractListItems(elementaryContent, '怎么用', '🎯');
            
            // 提取相关词汇
            const relatedWordsMatch = elementaryContent.match(/相关词汇:([^\n]*)/i) || 
                                     elementaryContent.match(/🔗([^\n]*)/i);
            const relatedWords = relatedWordsMatch ? relatedWordsMatch[1].trim() : '';
            
            // 提取小贴士
            const tipsMatch = elementaryContent.match(/小贴士:([^\n]*)/i) || 
                              elementaryContent.match(/🧭([^\n]*)/i);
            const tips = tipsMatch ? tipsMatch[1].trim() : '';
            
            // 提取类似词
            const similarWords = [];
            const similarMatches = [...elementaryContent.matchAll(/• ([^(]+) \(([^)]+)\)/g)];
            similarMatches.forEach(match => {
                if (match[1] && match[2] && 
                    (elementaryContent.includes('类似的词') || elementaryContent.includes('📝'))) {
                    similarWords.push({
                        word: match[1].trim(),
                        explanation: match[2].trim()
                    });
                }
            });
            
            return {
                title: word,
                definition,
                pronunciation,
                usage,
                relatedWords,
                tips,
                similarWords
            };
        } catch (error) {
            console.error('提取初级模式数据失败:', error);
            return { title: word };
        }
    }
    
    /**
     * 从文本中提取列表项
     * @param {string} content - 文本内容
     * @param {string} sectionName - 章节名称
     * @param {string} emoji - 章节对应的emoji
     * @returns {Array} 提取的列表项
     */
    extractListItems(content, sectionName, emoji) {
        const items = [];
        
        // 根据章节名称或emoji定位章节
        let sectionContent = '';
        const sectionRegex = new RegExp(`${sectionName}:[^\n]*|${emoji}[^\n]*`, 'i');
        const sectionMatch = content.match(sectionRegex);
        
        if (sectionMatch) {
            // 找到章节开始位置
            const startIndex = content.indexOf(sectionMatch[0]);
            if (startIndex !== -1) {
                // 章节内容是从章节标题开始到下一个emoji章节或文档结束
                const restContent = content.substring(startIndex + sectionMatch[0].length);
                const nextEmojiMatch = restContent.match(/[\p{Emoji}\p{Emoji_Presentation}][^:\n]*:/u);
                const endIndex = nextEmojiMatch ? restContent.indexOf(nextEmojiMatch[0]) : restContent.length;
                sectionContent = restContent.substring(0, endIndex).trim();
                
                // 提取列表项
                const listMatches = [...sectionContent.matchAll(/• ([^\n]+)/g)];
                listMatches.forEach(match => {
                    if (match[1]) {
                        items.push(match[1].trim());
                    }
                });
            }
        }
        
        return items;
    }
}