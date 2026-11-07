import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import env from './env.js';

const isTest = env.nodeEnv === 'test';

const transports = [];
if (!isTest) {
  const common = {
    dirname: env.logDir,
    datePattern: 'YYYY-MM-DD',
    maxFiles: env.logMaxFiles,
    maxSize: env.logMaxSize,
  };
  transports.push(
    new DailyRotateFile({ ...common, filename: 'app-%DATE%.log' }),
    new DailyRotateFile({ ...common, filename: 'error-%DATE%.log', level: 'error' }),
  );
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  );
}

const logger = winston.createLogger({
  level: env.logLevel,
  silent: isTest,
  format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
  transports,
});

export default logger;
