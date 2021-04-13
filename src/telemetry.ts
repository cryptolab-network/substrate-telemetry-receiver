export { Telemetry };

import WebSocket from 'ws';
import events from 'events';

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
        console.error(err);
        this.connection?.terminate();
        this.emit('error');
      });

      this.connection.on('close', () => {
        console.error('websocket connection closed');
        this.emit('close');
      });
    });
  }

  __onMessage(message: Uint8Array) {
    const action = message[0];
    switch(action) {
      case 3: // Add Node
      console.log('added nodes @ ' + new Date().toUTCString());
      const addNodes = this.__onAddNode(message[1]);
      addNodes.forEach((node)=>{
        this.nodes[node.id] = node;
      });
      if(addNodes.length > 0) {
        console.log(addNodes);
      }
      break;
      case 4: // Remove Node
      console.log('removed nodes @ ' + new Date().toUTCString());
      console.log(message[1]);
      this.__onRemoveNode(message[1]);
      break;
      case 19: // Stale Node
      console.log('stale nodes @ ' + new Date().toUTCString());
      console.log(message[1]);
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
      console.log(`${id} is waiting for removing and is recovered.`);
      clearTimeout(existNode);
      delete this.removingNodes[id];
      return [];
    } else {
      console.log(`${id} is online`);
      addNode.push({
        id: id,
        name: name,
        runtime: runtime,
        address: address, // address could be null......, I don't understand...
        isStale: false,
      });
      if(!this.isStarting) { // this is a node once offline
        // TODO: send notification here
        console.log('TODO: Send Telegram message to inform node ' + name + ' is now online');
        if(address !== null) {
          this.emit('node_online', address);
        }
      }
    }
    return addNode;
  }

  __onRemoveNode(nodeId: number) {
    const timeout = setTimeout(()=>{ // wait for one minute to clear data and trigger bot event
      const info = Object.assign({}, this.nodes[nodeId]);
      delete this.nodes[nodeId];
      // TODO: send notification here
      console.log(`TODO: Send Telegram message to inform node ${info.id}: ${info.name} is now offline`);
      if(info.address !== null) {
        this.emit('node_offline', info.address);
      }
      delete this.removingNodes[nodeId];
    }, 60000);
    this.removingNodes[nodeId] = timeout;
  }
};

module.exports = Telemetry;
