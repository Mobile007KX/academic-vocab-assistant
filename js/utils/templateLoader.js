/**
 * 模板加载器
 * 用于加载和处理HTML模板
 */

export class TemplateLoader {
    constructor() {
        this.templates = {};
        this.loadPromises = [];
    }
    
    /**
     * 加载HTML模板文件
     * @param {string} name - 模板名称
     * @param {string} path - 模板路径
     * @returns {Promise} 加载完成的Promise
     */
    loadTemplate(name, path) {
        const promise = fetch(path)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load template ${path}: ${response.status} ${response.statusText}`);
                }
                return response.text();
            })
            .then(html => {
                this.templates[name] = html;
                console.log(`Template '${name}' loaded`);
            })
            .catch(error => {
                console.error(`Error loading template ${name}:`, error);
                // 如果加载失败，使用空字符串作为模板内容
                this.templates[name] = '';
            });
        
        this.loadPromises.push(promise);
        return promise;
    }
    
    /**
     * 获取模板并替换变量
     * @param {string} name - 模板名称
     * @param {Object} variables - 要替换的变量
     * @returns {string} 处理后的HTML
     */
    getTemplate(name, variables = {}) {
        if (!this.templates[name]) {
            console.warn(`Template '${name}' not found`);
            return '';
        }
        
        let html = this.templates[name];
        
        // 替换所有变量
        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            html = html.replace(regex, value);
        });
        
        return html;
    }
    
    /**
     * 等待所有模板加载完成
     * @returns {Promise} 加载完成的Promise
     */
    waitForTemplates() {
        return Promise.all(this.loadPromises);
    }
}

// 创建单例实例
const templateLoader = new TemplateLoader();

// 预加载所有模板
templateLoader.loadTemplate('word-tabs', 'templates/word-tabs.html');
templateLoader.loadTemplate('academic-prof', 'templates/academic-prof.html');
templateLoader.loadTemplate('academic-inter', 'templates/academic-inter.html');
templateLoader.loadTemplate('academic-elem', 'templates/academic-elem.html');

export default templateLoader;