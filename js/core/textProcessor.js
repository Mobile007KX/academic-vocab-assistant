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
            const prompt = this.getTriModePromptForJson(word);
            const content = await this.llmService.query(prompt);
            
            if (!content) {
                throw new Error('生成词汇解释失败');
            }
            
            // 提取JSON并生成HTML
            let wordData;
            try {
                // 尝试提取JSON内容
                const jsonMatch = content.match(/```json([\s\S]*?)```/) || 
                                  content.match(/\{([\s\S]*?)\}/);
                                  
                if (jsonMatch) {
                    // 获取JSON字符串并解析
                    const jsonStr = jsonMatch[0].startsWith('{') ? jsonMatch[0] : jsonMatch[1];
                    wordData = JSON.parse(jsonStr.startsWith('{') ? jsonStr : '{' + jsonStr + '}');
                } else {
                    // 如果没有找到JSON，使用旧处理方法
                    console.warn(`未找到词汇 ${word} 的JSON格式，回退到文本处理...`);
                    const formattedContent = this.processTriModeResponse(content, word);
                    return {
                        word,
                        content: formattedContent,
                        mode: 'tri-mode',
                        timestamp: new Date().toISOString()
                    };
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
     * 获取生成JSON格式的三模式提示词
     * @param {string} word - 词汇
     * @returns {string} 提示词
     */
    getTriModePromptForJson(word) {
        return `
        请为学术词汇"${word}"创建一个结构化的JSON格式词条，包含三种不同的展示模式。
        直接返回符合以下结构的JSON数据，并用```json和```包裹，不要包含任何额外的解释、想法或思考过程。
        
        ```json
        {
          "word": "${word}",
          "modes": {
            "professional": {
              "title": "${word}",
              "definition": "详细的学术定义",
              "pronunciation": "音标",
              "academicUsage": ["学术例句1", "学术例句2", "学术例句3"],
              "everydayUse": ["日常例句1", "日常例句2"],
              "associatedVocabulary": ["相关词汇1", "相关词汇2", "相关词汇3"],
              "grammar": ["语法点1", "语法点2"],
              "collocations": {
                "搭配类型1": "搭配词组",
                "搭配类型2": "搭配词组"
              },
              "synonyms": [
                {"word": "同义词1", "explanation": "简短解释"},
                {"word": "同义词2", "explanation": "简短解释"}
              ],
              "antonyms": [
                {"word": "反义词1", "explanation": "简短解释"}
              ]
            },
            "intermediate": {
              "title": "${word}",
              "definition": "中文简明释义",
              "pronunciation": "音标",
              "academicUsage": ["英文例句1", "英文例句2"],
              "everydayUse": ["英文例句1", "英文例句2"],
              "associatedVocabulary": [{"en": "英文词1", "zh": "中文释义1"}, {"en": "英文词2", "zh": "中文释义2"}],
              "grammar": ["语法点1", "语法点2"],
              "collocations": {
                "搭配类型1": "搭配词组",
                "搭配类型2": "搭配词组"
              },
              "synonyms": [
                {"word": "同义词1", "explanation": "中文解释"},
                {"word": "同义词2", "explanation": "中文解释"}
              ]
            },
            "elementary": {
              "title": "${word}",
              "definition": "非常简单的中文解释",
              "pronunciation": "简化的发音指导",
              "usage": ["简单例句1", "简单例句2", "简单例句3"],
              "relatedWords": "简单相关词汇",
              "tips": "简单记忆方法",
              "similarWords": [
                {"word": "简单同义词1", "explanation": "简单解释"},
                {"word": "简单同义词2", "explanation": "简单解释"}
              ]
            }
          }
        }
        ```
        
        请确保JSON格式完全正确，字段名称与示例完全一致，字段值应详尽完整。绝不要在JSON外返回任何说明、注解或分析。
        所有字段必须有实质性内容，不要使用占位符或简单标记。
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
}