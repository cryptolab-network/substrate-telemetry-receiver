export { Telemetry };

import WebSocket from 'ws';
import events from 'events';
import { loggers } from 'winston';

const logger = loggers.get('telemetry');

class Node {
    id: number
    name: string
    runtime: string
    address?: string // address could be null......, I don't understand...
    isStale: boolean

    constructor(id: number, name: string, runtime: string, address: string) {
      this.id = id;
      this.name = name;
      this.runtime = runtime;
      this.address = address;
      this.isStale = false;
    }
}

class Telemetry extends events.EventEmitter {
  url: string
  nodes: { [key:number]: Node }
  pingCount: number
  channel: string
  removingNodes: any
  isStarting: boolean
  connection?: WebSocket
  constructor(url: string, channel: string) {
    super();
    this.url = url;
    this.nodes = {};
    this.pingCount = 0;
    this.channel = channel;
    this.removingNodes = {};
    this.isStarting = true;
  }

  connect() {
    return new Promise<void>((resolve, reject)=>{
      this.isStarting = true;
      this.connection = new WebSocket(this.url);
      this.connection.on('open', () => {
        setTimeout(() => {
          this.connection!.send('subscribe:Kusama');
        }, 2000);
        setTimeout(() => {
            this.isStarting = false;
        }, 12000);
        setInterval(()=>{
          this.connection!.send('ping:' + this.pingCount++);
        }, 60000);
        resolve();
      });
      
      this.connection.on('message', (data) => {
        let array = JSON.parse(data.toString());
        while(array.length > 0) {
          const usedDataLength = this.__onMessage(array);
          array.splice(0, usedDataLength);
        }
      });

      this.connection.on('error', (err) => {
        logger.error(err);
        this.connection?.terminate();
        this.emit('error');
      });

      this.connection.on('close', () => {
        logger.error('websocket connection closed');
        this.emit('close');
      });
    });
  }

  __onMessage(message: Uint8Array) {
    const action = message[0];
    switch(action) {
      case 3: // Add Node
      logger.debug('added nodes @ ' + new Date().toUTCString());
      const addNodes = this.__onAddNode(message[1]);
      addNodes.forEach((node)=>{
        this.nodes[node.id] = node;
      });
      if(addNodes.length > 0) {
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

  __onAddNode(node: any) {
    const addNode = [];
    const id = node[0];
    const detail = node[1];
    const name = detail[0];
    const runtime = detail[2];
    const address = detail[3];
    const existNode = this.removingNodes[id];
    if(existNode !== undefined) {
      logger.debug(`${id} is waiting for removing and is recovered.`);
      clearTimeout(existNode);
      delete this.removingNodes[id];
      return [];
    } else {
      logger.debug(`${id} is online`);
      addNode.push({
        id: id,
        name: name,
        runtime: runtime,
        address: address, // address could be null......, I don't understand...
        isStale: false,
      });
      if(!this.isStarting) { // this is a node once offline
        if(name !== null) {
          this.emit('node_online', name);
        }
      }
    }
    return addNode;
  }

  __onRemoveNode(nodeId: number) {
    const timeout = setTimeout(()=>{ // wait for one minute to clear data and trigger bot event
      const info = Object.assign({}, this.nodes[nodeId]);
      delete this.nodes[nodeId];
      if(info.name !== null) {
        this.emit('node_offline', info.name);
      }
      delete this.removingNodes[nodeId];
    }, 60000);
    this.removingNodes[nodeId] = timeout;
  }
};

module.exports = Telemetry;
