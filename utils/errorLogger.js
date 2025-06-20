const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../logs');
const ERROR_JSON = path.join(LOG_DIR, 'error.json');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
if (!fs.existsSync(ERROR_JSON)) {
  fs.writeFileSync(ERROR_JSON, '[]', 'utf-8');
}

const errorLogger = {
  logErrorToJson: (error, context = '') => {
    const timestamp = new Date().toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const errorData = {
      '🌸 時間': timestamp,
      '🦋 錯誤類型': error?.name || typeof error,
      '💀 錯誤訊息': error?.message || String(error),
      '📌 發生位置': error?.stack ? error.stack.split('\n')[1]?.trim() : '無堆疊追蹤',
      '🍵 上下文': context || '未提供'
    };
    try {
      const currentLogs = JSON.parse(fs.readFileSync(ERROR_JSON, 'utf-8'));
      currentLogs.push(errorData);
      fs.writeFileSync(ERROR_JSON, JSON.stringify(currentLogs, null, 2), 'utf-8');
    } catch (err) {
      console.error('記錄錯誤時發生問題:', err);
    }
  },
  register: (client) => {
    process.on('unhandledRejection', (error) => {
      errorLogger.logErrorToJson(error, '[未處理的Promise拒絕]');
      console.error('🦋 冥蝶捕捉到未處理的異變:', error);
    });

    process.on('uncaughtException', (error) => {
      errorLogger.logErrorToJson(error, '[未捕獲的異常]');
      console.error('💢 嚴重錯誤導致冥界震動:', error);
      process.exit(1);
    });
  }
};

module.exports = errorLogger;