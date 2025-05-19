/**
 * 存储管理器
 * 响应程序数据的存储和检索
 */

export class StorageManager {
    constructor() {
        this.APP_PREFIX = 'academic_vocab_';
        this.DICTIONARIES_KEY = `${this.APP_PREFIX}dictionaries`;
        this.SETTINGS_KEY = `${this.APP_PREFIX}settings`;
        this.CURRENT_DICT_KEY = `${this.APP_PREFIX}current_dict`;
    }
    
    /**
     * 检查浏览器是否支持localStorage
     * @returns {boolean} 是否支持
     */
    isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * 获取所有词典名称
     * @returns {Array<string>} 词典名称数组
     */
    getDictionaryNames() {
        if (!this.isStorageAvailable()) return [];
        
        try {
            const dictionariesStr = localStorage.getItem(this.DICTIONARIES_KEY);
            return dictionariesStr ? JSON.parse(dictionariesStr) : [];
        } catch (error) {
            console.error('获取词典列表失败:', error);
            return [];
        }
    }
    
    /**
     * 保存词典名称列表
     * @param {Array<string>} names - 词典名称数组
     * @returns {boolean} 是否成功
     */
    saveDictionaryNames(names) {
        if (!this.isStorageAvailable()) return false;
        
        try {
            localStorage.setItem(this.DICTIONARIES_KEY, JSON.stringify(names));
            return true;
        } catch (error) {
            console.error('保存词典列表失败:', error);
            return false;
        }
    }
    
    /**
     * 获取当前词典名称
     * @returns {string|null} 当前词典名称
     */
    getCurrentDictionary() {
        if (!this.isStorageAvailable()) return null;
        
        try {
            return localStorage.getItem(this.CURRENT_DICT_KEY);
        } catch (error) {
            console.error('获取当前词典失败:', error);
            return null;
        }
    }
    
    /**
     * 设置当前词典
     * @param {string} name - 词典名称
     * @returns {boolean} 是否成功
     */
    setCurrentDictionary(name) {
        if (!this.isStorageAvailable()) return false;
        
        try {
            localStorage.setItem(this.CURRENT_DICT_KEY, name);
            return true;
        } catch (error) {
            console.error('设置当前词典失败:', error);
            return false;
        }
    }
    
    /**
     * 获取词典数据
     * @param {string} name - 词典名称
     * @returns {Object|null} 词典数据
     */
    getDictionary(name) {
        if (!this.isStorageAvailable() || !name) return null;
        
        try {
            const key = `${this.APP_PREFIX}dict_${name}`;
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`获取词典${name}失败:`, error);
            return null;
        }
    }
    
    /**
     * 保存词典数据
     * @param {string} name - 词典名称
     * @param {Object} data - 词典数据
     * @returns {boolean} 是否成功
     */
    saveDictionary(name, data) {
        if (!this.isStorageAvailable() || !name) return false;
        
        try {
            const key = `${this.APP_PREFIX}dict_${name}`;
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`保存词典${name}失败:`, error);
            return false;
        }
    }
    
    /**
     * 删除词典
     * @param {string} name - 词典名称
     * @returns {boolean} 是否成功
     */
    deleteDictionary(name) {
        if (!this.isStorageAvailable() || !name) return false;
        
        try {
            const key = `${this.APP_PREFIX}dict_${name}`;
            localStorage.removeItem(key);
            
            // 从词典列表中移除
            const names = this.getDictionaryNames();
            const index = names.indexOf(name);
            if (index !== -1) {
                names.splice(index, 1);
                this.saveDictionaryNames(names);
            }
            
            return true;
        } catch (error) {
            console.error(`删除词典${name}失败:`, error);
            return false;
        }
    }
    
    /**
     * 获取设置
     * @param {string} key - 设置键
     * @param {any} defaultValue - 默认值
     * @returns {any} 设置值
     */
    getSetting(key, defaultValue = null) {
        if (!this.isStorageAvailable()) return defaultValue;
        
        try {
            const settings = this.getAllSettings();
            return settings[key] !== undefined ? settings[key] : defaultValue;
        } catch (error) {
            console.error(`获取设置${key}失败:`, error);
            return defaultValue;
        }
    }
    
    /**
     * 保存设置
     * @param {string} key - 设置键
     * @param {any} value - 设置值
     * @returns {boolean} 是否成功
     */
    setSetting(key, value) {
        if (!this.isStorageAvailable()) return false;
        
        try {
            const settings = this.getAllSettings();
            settings[key] = value;
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error(`保存设置${key}失败:`, error);
            return false;
        }
    }
    
    /**
     * 获取所有设置
     * @returns {Object} 所有设置
     */
    getAllSettings() {
        if (!this.isStorageAvailable()) return {};
        
        try {
            const settingsStr = localStorage.getItem(this.SETTINGS_KEY);
            return settingsStr ? JSON.parse(settingsStr) : {};
        } catch (error) {
            console.error('获取所有设置失败:', error);
            return {};
        }
    }
    
    /**
     * 清除所有数据
     * @returns {boolean} 是否成功
     */
    clearAll() {
        if (!this.isStorageAvailable()) return false;
        
        try {
            // 删除所有以APP_PREFIX开头的数据
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(this.APP_PREFIX)) {
                    localStorage.removeItem(key);
                    i--; // 因为删除了一项，所以需要调整索引
                }
            }
            return true;
        } catch (error) {
            console.error('清除所有数据失败:', error);
            return false;
        }
    }
}