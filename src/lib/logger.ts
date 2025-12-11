// lib/logger.ts - Structured logging with context propagation
import { v4 as uuidv4 } from 'uuid';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  request_id?: string;
  user_id?: string;
  session_id?: string;
  path?: string;
  method?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  service: string;
  environment: string;
  version?: string;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

class Logger {
  private service: string;
  private environment: string;
  private version?: string;
  private minLevel: LogLevel;

  constructor() {
    this.service = process.env.NEXT_PUBLIC_SERVICE_NAME || 'supacrm';
    this.environment = process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV || 'development';
    this.version = process.env.NEXT_PUBLIC_VERSION || '0.1.0';
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatLog(level: LogLevel, message: string, context: LogContext, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      service: this.service,
      environment: this.environment,
      version: this.version,
    };

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    return entry;
  }

  private emit(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    // In production, this would send to New Relic, Datadog, etc.
    // For now, output structured JSON to stdout (captured by cloud providers)
    if (typeof window === 'undefined') {
      // Server-side: JSON to stdout
      console.log(JSON.stringify(entry));
    } else {
      // Client-side: formatted for browser console
      const style = this.getConsoleStyle(entry.level);
      console.log(
        `%c${entry.level.toUpperCase()}%c ${entry.message}`,
        style,
        'color: inherit',
        entry.context
      );
    }

    // Send to New Relic Browser if available
    if (typeof window !== 'undefined' && (window as any).newrelic) {
      (window as any).newrelic.addPageAction('log', {
        level: entry.level,
        message: entry.message,
        ...entry.context,
      });
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    const styles = {
      debug: 'background: #718096; color: white; padding: 2px 4px; border-radius: 2px;',
      info: 'background: #3182ce; color: white; padding: 2px 4px; border-radius: 2px;',
      warn: 'background: #d69e2e; color: white; padding: 2px 4px; border-radius: 2px;',
      error: 'background: #e53e3e; color: white; padding: 2px 4px; border-radius: 2px;',
    };
    return styles[level];
  }

  debug(message: string, context: LogContext = {}): void {
    this.emit(this.formatLog('debug', message, context));
  }

  info(message: string, context: LogContext = {}): void {
    this.emit(this.formatLog('info', message, context));
  }

  warn(message: string, context: LogContext = {}): void {
    this.emit(this.formatLog('warn', message, context));
  }

  error(message: string, error?: Error, context: LogContext = {}): void {
    this.emit(this.formatLog('error', message, context, error));
  }
}

export const logger = new Logger();

// Helper to create context-aware logger
export function createContextLogger(baseContext: LogContext) {
  return {
    debug: (message: string, meta: LogContext = {}) =>
      logger.debug(message, { ...baseContext, ...meta }),
    info: (message: string, meta: LogContext = {}) =>
      logger.info(message, { ...baseContext, ...meta }),
    warn: (message: string, meta: LogContext = {}) =>
      logger.warn(message, { ...baseContext, ...meta }),
    error: (message: string, error?: Error, meta: LogContext = {}) =>
      logger.error(message, error, { ...baseContext, ...meta }),
  };
}

// Generate request ID for correlation
export function generateRequestId(): string {
  return `req_${uuidv4()}`;
}
