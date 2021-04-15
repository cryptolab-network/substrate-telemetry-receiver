import { loggers } from "winston";

const { winston } = require('winston');
const Telemetry = require('./src/telemetry');

let logLevel = 'info';

loggers.add('telemetry', {
  transports: [
    new winston.transports.Console(),
  ]
});
loggers.get('telemetry').configure({
  level: logLevel,
});

module.exports = Telemetry;
module.exports = function setLogLevel(level: string) {
  logLevel = level;
};
