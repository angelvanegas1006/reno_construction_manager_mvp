/**
 * Logger utility for development and production
 * Only logs in development mode to avoid performance impact in production
 */

type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

const isDevelopment = process.env.NODE_ENV === 'development';

class Logger {
  private shouldLog(level: LogLevel): boolean {
    // Always log errors, even in production
    if (level === 'error') return true;
    // Only log other levels in development
    return isDevelopment;
  }

  log(...args: any[]): void {
    if (this.shouldLog('log')) {
      console.log(...args);
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...args);
    }
  }

  error(...args: any[]): void {
    // Always log errors
    console.error(...args);
  }

  info(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(...args);
    }
  }

  debug(...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(...args);
    }
  }

  /**
   * Log with a prefix/tag for easier filtering
   */
  tagged(tag: string) {
    return {
      log: (...args: any[]) => {
        if (this.shouldLog('log')) {
          console.log(`[${tag}]`, ...args);
        }
      },
      warn: (...args: any[]) => {
        if (this.shouldLog('warn')) {
          console.warn(`[${tag}]`, ...args);
        }
      },
      error: (...args: any[]) => {
        console.error(`[${tag}]`, ...args);
      },
      info: (...args: any[]) => {
        if (this.shouldLog('info')) {
          console.info(`[${tag}]`, ...args);
        }
      },
      debug: (...args: any[]) => {
        if (this.shouldLog('debug')) {
          console.debug(`[${tag}]`, ...args);
        }
      },
    };
  }
}

export const logger = new Logger();

