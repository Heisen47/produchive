import log from 'electron-log';
import path from 'path';
import { app } from 'electron';

// Configure electron-log
log.transports.file.level = 'debug';
log.transports.console.level = 'debug';

// Set custom log file location
const logPath = path.join(app.getPath('userData'), 'logs');
log.transports.file.resolvePathFn = () => path.join(logPath, 'produchive.log');

// Add timestamp format
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
log.transports.console.format = '[{h}:{i}:{s}.{ms}] [{level}] {text}';

// Create custom logger with context
export const createLogger = (context: string) => {
    return {
        debug: (message: string, ...args: any[]) => log.debug(`[${context}] ${message}`, ...args),
        info: (message: string, ...args: any[]) => log.info(`[${context}] ${message}`, ...args),
        warn: (message: string, ...args: any[]) => log.warn(`[${context}] ${message}`, ...args),
        error: (message: string, ...args: any[]) => log.error(`[${context}] ${message}`, ...args),
    };
};

// Export the log path for display
export const getLogPath = () => log.transports.file.getFile().path;

export default log;
