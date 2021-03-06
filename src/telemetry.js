"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Telemetry = void 0;
const ws_1 = __importDefault(require("ws"));
const events_1 = __importDefault(require("events"));
const winston_1 = require("winston");
const logger = winston_1.loggers.get('telemetry');
class Node {
    constructor(id, name, runtime, address) {
        this.id = id;
        this.name = name;
        this.runtime = runtime;
        this.address = address;
        this.isStale = false;
    }
}
class Telemetry extends events_1.default.EventEmitter {
    constructor(url, channel) {
        super();
        this.url = url;
        this.nodes = {};
        this.pingCount = 0;
        this.channel = channel;
        this.removingNodes = {};
        this.isStarting = true;
    }
    connect() {
        return new Promise((resolve, reject) => {
            this.isStarting = true;
            this.connection = new ws_1.default(this.url);
            this.connection.on('open', () => {
                setTimeout(() => {
                    this.connection.send('subscribe:Kusama');
                }, 2000);
                setTimeout(() => {
                    this.isStarting = false;
                }, 12000);
                setInterval(() => {
                    this.connection.send('ping:' + this.pingCount++);
                }, 60000);
                resolve();
            });
            this.connection.on('message', (data) => {
                let array = JSON.parse(data.toString());
                while (array.length > 0) {
                    const usedDataLength = this.__onMessage(array);
                    array.splice(0, usedDataLength);
                }
            });
            this.connection.on('error', (err) => {
                var _a;
                logger.error(err);
                (_a = this.connection) === null || _a === void 0 ? void 0 : _a.terminate();
                this.emit('error');
            });
            this.connection.on('close', () => {
                logger.error('websocket connection closed');
                this.emit('close');
            });
        });
    }
    __onMessage(message) {
        const action = message[0];
        switch (action) {
            case 3: // Add Node
                logger.debug('added nodes @ ' + new Date().toUTCString());
                const addNodes = this.__onAddNode(message[1]);
                addNodes.forEach((node) => {
                    this.nodes[node.id] = node;
                });
                if (addNodes.length > 0) {
                    logger.verbose(addNodes);
                }
                break;
            case 4: // Remove Node
                logger.debug('removed nodes @ ' + new Date().toUTCString());
                logger.verbose(message[1]);
                this.__onRemoveNode(message[1]);
                break;
            case 19: // Stale Node
                logger.debug('stale nodes @ ' + new Date().toUTCString());
                logger.verbose(message[1]);
                break;
        }
        return 2;
    }
    __onAddNode(node) {
        const addNode = [];
        const id = node[0];
        const detail = node[1];
        const name = detail[0];
        const runtime = detail[2];
        const address = detail[3];
        const existNode = this.removingNodes[id];
        if (existNode !== undefined) {
            logger.debug(`${id} is waiting for removing and is recovered.`);
            clearTimeout(existNode);
            delete this.removingNodes[id];
            return [];
        }
        else {
            logger.debug(`${id} is online`);
            addNode.push({
                id: id,
                name: name,
                runtime: runtime,
                address: address,
                isStale: false,
            });
            if (!this.isStarting) { // this is a node once offline
                if (name !== null) {
                    this.emit('node_online', name);
                }
            }
        }
        return addNode;
    }
    __onRemoveNode(nodeId) {
        const timeout = setTimeout(() => {
            const info = Object.assign({}, this.nodes[nodeId]);
            delete this.nodes[nodeId];
            if (info.name !== null) {
                this.emit('node_offline', info.name);
            }
            delete this.removingNodes[nodeId];
        }, 60000);
        this.removingNodes[nodeId] = timeout;
    }
}
exports.Telemetry = Telemetry;
;
module.exports = Telemetry;
