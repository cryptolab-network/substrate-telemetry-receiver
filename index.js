"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = require("winston");
const Telemetry = require('./src/telemetry');
let logLevel = 'info';
winston_1.loggers.add('telemetry');
winston_1.loggers.get('telemetry').configure({
    level: logLevel,
    transports: [
        new winston_1.transports.Console(),
    ],
});
module.exports = Telemetry;
