const winston = require('winston');

const logConfiguration = {
  transports: [
    new winston.transports.File({
      level: 'verbose',
      filename: './backend/logs/test.log',
    }),
    new winston.transports.Console({
      level: 'verbose',
    }),
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => {
      return `${info.timestamp} [${info.level}]: ${info.message}`;
    })
  ),
};

const logger = winston.createLogger(logConfiguration);

module.exports = logger;
