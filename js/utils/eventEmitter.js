/**
 * 事件发射器
 * 提供简单的事件注册和触发功能
 */

export class EventEmitter {
    constructor() {
        this.events = {};
    }
    
    /**
     * 监听事件
     * @param {string} event - 事件名称
     * @param {Function} listener - 事件监听器
     * @returns {Function} 取消监听的函数
     */
    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        
        this.events[event].push(listener);
        
        // 返回用于移除监听器的函数
        return () => this.off(event, listener);
    }
    
    /**
     * 取消事件监听
     * @param {string} event - 事件名称
     * @param {Function} listener - 要移除的监听器
     */
    off(event, listener) {
        if (!this.events[event]) return;
        
        this.events[event] = this.events[event].filter(l => l !== listener);
        
        // 如果没有监听器了，删除该事件
        if (this.events[event].length === 0) {
            delete this.events[event];
        }
    }
    
    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {any} data - 事件数据
     */
    emit(event, data) {
        if (!this.events[event]) return;
        
        this.events[event].forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                console.error(`事件监听器错误(${event}):`, error);
            }
        });
    }
    
    /**
     * 只监听一次事件
     * @param {string} event - 事件名称
     * @param {Function} listener - 事件监听器
     */
    once(event, listener) {
        const onceListener = data => {
            this.off(event, onceListener);
            listener(data);
        };
        
        return this.on(event, onceListener);
    }
    
    /**
     * 清除所有事件监听器
     * @param {string} [event] - 可选，指定要清除的事件
     */
    clear(event) {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }
}