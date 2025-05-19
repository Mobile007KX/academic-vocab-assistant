/**
 * 词典管理器
 * 负责管理多个词典和词汇数据
 */

import { EventEmitter } from '../utils/eventEmitter.js';

// 创建事件发射器
export const DictionaryEvents = new EventEmitter();

export class DictionaryManager {
    constructor(storageManager) {
        this.storageManager = storageManager;
        this.dictionaries = [];
        this.currentDictionary = null;
        this.currentWords = [];
    }
    
    /**
     * 初始化词典管理器
     */
    async initialize() {
        try {
            // 获取词典列表
            this.dictionaries = this.storageManager.getDictionaryNames();
            
            // 检查是否有词典
            if (this.dictionaries.length === 0) {
                // 创建默认词典
                this.createDictionary('默认词典');
            }
            
            // 获取当前词典
            let currentDict = this.storageManager.getCurrentDictionary();
            if (!currentDict || !this.dictionaries.includes(currentDict)) {
                currentDict = this.dictionaries[0];
                this.storageManager.setCurrentDictionary(currentDict);
            }
            
            // 加载当前词典数据
            this.loadDictionary(currentDict);
            
            // 触发初始化事件
            DictionaryEvents.emit('initialized', {
                dictionaries: this.dictionaries,
                currentDictionary: this.currentDictionary
            });
            
            return true;
        } catch (error) {
            console.error('初始化词典管理器失败:', error);
            throw error;
        }
    }
    
    /**
     * 加载词典
     * @param {string} name - 词典名称
     */
    loadDictionary(name) {
        try {
            const dictData = this.storageManager.getDictionary(name);
            
            if (dictData) {
                this.currentDictionary = name;
                this.currentWords = dictData.words || [];
            } else {
                // 如果没有找到词典，创建空词典
                this.currentDictionary = name;
                this.currentWords = [];
                this.saveDictionary();
            }
            
            return true;
        } catch (error) {
            console.error(`加载词典 ${name} 失败:`, error);
            return false;
        }
    }
    
    /**
     * 保存当前词典
     */
    saveDictionary() {
        if (!this.currentDictionary) return false;
        
        try {
            const dictData = {
                name: this.currentDictionary,
                words: this.currentWords,
                lastUpdated: new Date().toISOString()
            };
            
            return this.storageManager.saveDictionary(this.currentDictionary, dictData);
        } catch (error) {
            console.error('保存词典失败:', error);
            return false;
        }
    }
    
    /**
     * 创建新词典
     * @param {string} name - 词典名称
     * @returns {boolean} 是否成功
     */
    createDictionary(name) {
        try {
            // 检查名称是否已存在
            if (this.dictionaries.includes(name)) {
                return false;
            }
            
            // 创建新词典
            this.dictionaries.push(name);
            this.storageManager.saveDictionaryNames(this.dictionaries);
            
            // 创建空数据
            const dictData = {
                name: name,
                words: [],
                lastUpdated: new Date().toISOString()
            };
            this.storageManager.saveDictionary(name, dictData);
            
            // 触发事件
            DictionaryEvents.emit('dictionaryCreated', name);
            
            return true;
        } catch (error) {
            console.error(`创建词典 ${name} 失败:`, error);
            return false;
        }
    }
    
    /**
     * 切换到指定词典
     * @param {string} name - 词典名称
     * @returns {boolean} 是否成功
     */
    switchDictionary(name) {
        try {
            // 检查名称是否存在
            if (!this.dictionaries.includes(name)) {
                return false;
            }
            
            // 先保存当前词典
            if (this.currentDictionary) {
                this.saveDictionary();
            }
            
            // 加载新词典
            const success = this.loadDictionary(name);
            if (success) {
                // 设置当前词典
                this.storageManager.setCurrentDictionary(name);
                
                // 触发事件
                DictionaryEvents.emit('dictionarySwitched', name);
            }
            
            return success;
        } catch (error) {
            console.error(`切换词典 ${name} 失败:`, error);
            return false;
        }
    }
    
    /**
     * 删除词典
     * @param {string} name - 词典名称
     * @returns {boolean} 是否成功
     */
    deleteDictionary(name) {
        try {
            // 检查名称是否存在
            if (!this.dictionaries.includes(name)) {
                return false;
            }
            
            // 如果只有一个词典，不允许删除
            if (this.dictionaries.length <= 1) {
                return false;
            }
            
            // 删除词典
            const index = this.dictionaries.indexOf(name);
            this.dictionaries.splice(index, 1);
            this.storageManager.saveDictionaryNames(this.dictionaries);
            this.storageManager.deleteDictionary(name);
            
            // 如果删除的是当前词典，切换到另一个词典
            if (name === this.currentDictionary) {
                this.switchDictionary(this.dictionaries[0]);
            }
            
            // 触发事件
            DictionaryEvents.emit('dictionaryDeleted', name);
            
            return true;
        } catch (error) {
            console.error(`删除词典 ${name} 失败:`, error);
            return false;
        }
    }
    
    /**
     * 清空当前词典
     * @returns {boolean} 是否成功
     */
    clearCurrentDictionary() {
        try {
            if (!this.currentDictionary) return false;
            
            // 清空词汇列表
            this.currentWords = [];
            this.saveDictionary();
            
            // 触发事件
            DictionaryEvents.emit('dictionaryCleared', this.currentDictionary);
            
            return true;
        } catch (error) {
            console.error('清空词典失败:', error);
            return false;
        }
    }
    
    /**
     * 导入词典
     * @param {Object} data - 词典数据
     * @returns {boolean} 是否成功
     */
    importDictionary(data) {
        try {
            if (!data || !data.name || !Array.isArray(data.words)) {
                return false;
            }
            
            const name = data.name;
            let isNewDict = false;
            
            // 检查词典是否存在
            if (!this.dictionaries.includes(name)) {
                this.dictionaries.push(name);
                this.storageManager.saveDictionaryNames(this.dictionaries);
                isNewDict = true;
            }
            
            // 当前词典先保存
            if (this.currentDictionary) {
                this.saveDictionary();
            }
            
            // 如果是新词典或者强制覆盖，直接写入
            const importData = {
                name: name,
                words: data.words,
                lastUpdated: new Date().toISOString(),
                imported: true,
                originalSize: data.words.length
            };
            
            // 保存导入的词典
            this.storageManager.saveDictionary(name, importData);
            
            // 切换到该词典
            this.switchDictionary(name);
            
            // 触发事件
            DictionaryEvents.emit('dictionaryImported', name);
            
            return true;
        } catch (error) {
            console.error('导入词典失败:', error);
            return false;
        }
    }
    
    /**
     * 导出当前词典
     * @returns {Object|null} 词典数据
     */
    exportDictionary() {
        try {
            if (!this.currentDictionary) return null;
            
            // 先保存当前状态
            this.saveDictionary();
            
            // 获取词典数据
            return this.storageManager.getDictionary(this.currentDictionary);
        } catch (error) {
            console.error('导出词典失败:', error);
            return null;
        }
    }
    
    /**
     * 获取当前词典名称
     * @returns {string|null} 当前词典名称
     */
    getCurrentDictionaryName() {
        return this.currentDictionary;
    }
    
    /**
     * 获取词典列表
     * @returns {Array<string>} 词典名称数组
     */
    getDictionaryList() {
        return [...this.dictionaries];
    }
    
    /**
     * 获取当前词典中的所有词汇
     * @returns {Array<Object>} 词汇对象数组
     */
    getWords() {
        return [...this.currentWords];
    }
    
    /**
     * 获取当前词典中的所有词汇名称
     * @returns {Array<string>} 词汇名称数组
     */
    getWordList() {
        return this.currentWords.map(word => word.word);
    }
    
    /**
     * 获取词汇详情
     * @param {string} word - 词汇名称
     * @returns {Object|null} 词汇详情
     */
    getWordDetails(word) {
        if (!word) return null;
        
        try {
            return this.currentWords.find(w => w.word.toLowerCase() === word.toLowerCase()) || null;
        } catch (error) {
            console.error(`获取词汇 ${word} 详情失败:`, error);
            return null;
        }
    }
    
    /**
     * 添加词汇
     * @param {Object} wordData - 词汇数据
     * @returns {boolean} 是否成功
     */
    addWord(wordData) {
        try {
            if (!wordData || !wordData.word) return false;
            
            // 检查是否已存在
            const existingIndex = this.currentWords.findIndex(
                w => w.word.toLowerCase() === wordData.word.toLowerCase()
            );
            
            if (existingIndex !== -1) {
                // 更新现有词汇
                this.currentWords[existingIndex] = {
                    ...this.currentWords[existingIndex],
                    ...wordData,
                    updatedAt: new Date().toISOString()
                };
                
                DictionaryEvents.emit('wordUpdated', wordData.word);
            } else {
                // 添加新词汇
                this.currentWords.push({
                    ...wordData,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                
                DictionaryEvents.emit('wordAdded', wordData.word);
            }
            
            // 保存词典
            this.saveDictionary();
            
            return true;
        } catch (error) {
            console.error(`添加词汇 ${wordData?.word || '(unknown)'} 失败:`, error);
            return false;
        }
    }
    
    /**
     * 更新词汇
     * @param {string} word - 词汇名称
     * @param {Object} updates - 更新的内容
     * @returns {boolean} 是否成功
     */
    updateWord(word, updates) {
        try {
            if (!word) return false;
            
            // 查找词汇
            const index = this.currentWords.findIndex(
                w => w.word.toLowerCase() === word.toLowerCase()
            );
            
            if (index === -1) {
                // 如果不存在，创建一个新的
                return this.addWord({ word, ...updates });
            }
            
            // 更新词汇
            this.currentWords[index] = {
                ...this.currentWords[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            // 保存词典
            this.saveDictionary();
            
            // 触发事件
            DictionaryEvents.emit('wordUpdated', word);
            
            return true;
        } catch (error) {
            console.error(`更新词汇 ${word} 失败:`, error);
            return false;
        }
    }
    
    /**
     * 删除词汇
     * @param {string} word - 词汇名称
     * @returns {boolean} 是否成功
     */
    deleteWord(word) {
        try {
            if (!word) return false;
            
            // 查找词汇
            const index = this.currentWords.findIndex(
                w => w.word.toLowerCase() === word.toLowerCase()
            );
            
            if (index === -1) return false;
            
            // 删除词汇
            this.currentWords.splice(index, 1);
            
            // 保存词典
            this.saveDictionary();
            
            // 触发事件
            DictionaryEvents.emit('wordDeleted', word);
            
            return true;
        } catch (error) {
            console.error(`删除词汇 ${word} 失败:`, error);
            return false;
        }
    }
    
    /**
     * 搜索词汇
     * @param {string} query - 搜索查询
     * @returns {Array<Object>} 匹配的词汇数组
     */
    searchWords(query) {
        try {
            if (!query) return [];
            
            const lowercaseQuery = query.toLowerCase();
            
            return this.currentWords.filter(word => {
                return (
                    word.word.toLowerCase().includes(lowercaseQuery) || 
                    (word.content && word.content.toLowerCase().includes(lowercaseQuery))
                );
            });
        } catch (error) {
            console.error(`搜索词汇 "${query}" 失败:`, error);
            return [];
        }
    }
}