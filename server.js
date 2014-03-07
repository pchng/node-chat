var util = require('util');

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({port: 8080});

var wsConnections = {};
var KEEP_ALIVE_INTERVAL = 5000;
var keepAliveIntervalId = setInterval(keepAliveCheck, KEEP_ALIVE_INTERVAL);

// TODO: PC: Because of single-threading, if there are constantly messages coming in, 
// execution of this may be delayed. Anyway to ensure this always gets called periodically?
function keepAliveCheck() {
  console.log("Checking all current connections. Count: %s", Object.keys(wsConnections).length);
  for (var id in wsConnections) {
    // TODO: PC: Could also check readyState, but use this blunt-method for now.
    try {
      wsConnections[id].ping();
    } catch (e) {
      // TODO: PC: This may not cover all cases. In the case where the PING is sent out,
      // but a PONG is not received, the connection should be removed.
      // How to accomplish this? Make sure this is robust.
      delete wsConnections[id];
      console.log("Removed connection with id %s because could not send out ping: %s", id, e);
    }
  }
}

function sendChatMessage(wsSender, message) {
  for (var id in wsConnections) {
    if (wsSender.id == id) {
      continue;
    }
    // TODO: PC: Check readyState and/or remove connection if fails.
    wsConnections[id].send(message);
  }
}

wss.on("connection", function(ws) {

  // Add the connection to the list and setup event handlers.
  ws.id = new Date().getTime();
  wsConnections[ws.id] = ws;

  // console.log(util.inspect(ws, {depth: 1}));

  console.log("Added WebSocket connection with id: %s", ws.id);
  console.log("Number of connections: %s", Object.keys(wsConnections).length);

  ws.on("message", function(message) {
    console.log("Received message from id %s: %s", this.id, message);
    sendChatMessage(this, message);
  });

  // TODO: PC: Check source to see what callback gets passed.
  ws.on("close", function(event) {
    delete wsConnections[this.id];
    console.log("Closed connection for id: %s", this.id);
  });

  ws.on("pong", function(event) {
    console.log("PONG received: %s", event);
  });

  // TODO: PC: Other ws event handlers?

});
console.log('WebSocket server running on port 8080');

