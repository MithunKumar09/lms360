/**
 * Logger Utility
 * 
 * Centralized logging utility that can be configured for different environments.
 * In production, logs can be sent to external services.
 */

/**
 * Log levels
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
};

/**
 * Logger class
 */
class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   */
  debug(message, context = {}) {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, Object.keys(context).length > 0 ? context : '');
    }
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   */
  info(message, context = {}) {
    if (this.isDevelopment || this.isProduction) {
      console.info(`[INFO] ${message}`, Object.keys(context).length > 0 ? context : '');
    }
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   */
  warn(message, context = {}) {
    console.warn(`[WARN] ${message}`, Object.keys(context).length > 0 ? context : '');
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Error|Object} [error] - Error object or context
   * @param {Object} [context] - Additional context
   */
  error(message, error = null, context = {}) {
    const errorContext = error instanceof Error 
      ? { error: error.message, stack: error.stack, ...context }
      : { ...error, ...context };

    console.error(`[ERROR] ${message}`, errorContext);

    // In production, send to error tracking service
    if (this.isProduction) {
      // TODO: Integrate with error tracking service (e.g., Sentry, Bugsnag)
      // Example: Sentry.captureException(error, { extra: errorContext });
    }
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;


