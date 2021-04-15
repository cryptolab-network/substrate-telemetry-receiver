import { loggers, transports } from "winston";

const Telemetry = require('./src/telemetry');

let logLevel = 'info';

loggers.add('telemetry');
loggers.get('telemetry').configure({
  level: logLevel,
  transports: [
    new transports.Console(),
  ],
});

module.exports = Telemetry;
