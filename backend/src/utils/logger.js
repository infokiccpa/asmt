const fs = require('fs');
const path = require('path');

class Logger {
  static formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
  }

  static info(message, meta) {
    console.log(this.formatMessage('info', message, meta));
  }

  static warn(message, meta) {
    console.warn(this.formatMessage('warn', message, meta));
  }

  static error(message, error = {}) {
    console.error(this.formatMessage('error', message, {
      message: error.message,
      stack: error.stack,
      ...error
    }));
  }
}

module.exports = Logger;
