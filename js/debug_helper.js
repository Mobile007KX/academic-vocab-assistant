/**
 * 调试助手
 * 用于直接从localStorage读取和显示词条内容
 */

// 定义存储前缀
const APP_PREFIX = 'academic_vocab_';
const CURRENT_DICT_KEY = `${APP_PREFIX}current_dict`;

/**
 * 从localStorage读取driver词条内容
 */
function readDriverEntry() {
  try {
    // 获取当前词典名称
    const currentDict = localStorage.getItem(CURRENT_DICT_KEY);
    console.log('当前词典:', currentDict);
    
    if (!currentDict) {
      console.error('未找到当前词典');
      return null;
    }
    
    // 获取词典数据
    const dictKey = `${APP_PREFIX}dict_${currentDict}`;
    const dictDataStr = localStorage.getItem(dictKey);
    
    if (!dictDataStr) {
      console.error(`未找到词典数据: ${dictKey}`);
      return null;
    }
    
    const dictData = JSON.parse(dictDataStr);
    console.log('词典总词条数:', dictData.words.length);
    
    // 查找driver词条
    const driverEntry = dictData.words.find(word => 
      word.word.toLowerCase() === 'driver'
    );
    
    if (!driverEntry) {
      console.error('未找到driver词条');
      return null;
    }
    
    // 打印词条信息
    console.log('词条信息:', {
      word: driverEntry.word,
      mode: driverEntry.mode,
      timestamp: driverEntry.timestamp,
      contentLength: driverEntry.content?.length || 0
    });
    
    // 返回完整内容
    return driverEntry;
    
  } catch (error) {
    console.error('读取词条失败:', error);
    return null;
  }
}

// 执行读取并显示结果
const driverEntry = readDriverEntry();

if (driverEntry?.content) {
  // 创建预格式化显示区域
  const pre = document.createElement('pre');
  pre.style.maxHeight = '400px';
  pre.style.overflow = 'auto';
  pre.style.backgroundColor = '#f5f5f5';
  pre.style.padding = '10px';
  pre.style.borderRadius = '4px';
  pre.style.whiteSpace = 'pre-wrap';
  pre.style.wordBreak = 'break-word';
  
  // 设置内容
  pre.textContent = driverEntry.content;
  
  // 添加到页面
  const container = document.createElement('div');
  container.style.margin = '20px';
  container.style.padding = '20px';
  container.style.backgroundColor = '#fff';
  container.style.borderRadius = '8px';
  container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
  
  const title = document.createElement('h3');
  title.textContent = `词条内容: "${driverEntry.word}"`;
  container.appendChild(title);
  
  const info = document.createElement('p');
  info.textContent = `添加时间: ${new Date(driverEntry.timestamp).toLocaleString()} | 模式: ${driverEntry.mode || '未知'}`;
  container.appendChild(info);
  
  container.appendChild(pre);
  document.body.appendChild(container);
}
