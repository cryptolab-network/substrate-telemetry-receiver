"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = require("winston");
const { winston } = require('winston');
const Telemetry = require('./src/telemetry');
let logLevel = 'info';
winston_1.loggers.add('telemetry', {
    transports: [
        new winston.transports.Console(),
    ]
});
winston_1.loggers.get('telemetry').configure({
    level: logLevel,
});
module.exports = Telemetry;
module.exports = function setLogLevel(level) {
    logLevel = level;
};
