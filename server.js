var util = require('util');
var WebSocketServer = require('ws').Server;

// Namespacing pattern to create an extensible object based around closure from a 
// self-executing anonymous function.
(function(application, undefined) {

  // The WebSocket server.
  var wss;
  var WS_SUBPROTOCOL = "simple-chat.unitstep.net";

  // List of connected client WebSockets.
  var wsConnections = {};

  // How often to check if clients are still connected.
  var KEEP_ALIVE_INTERVAL = 5000;
  var keepAliveIntervalId;

  var config

  application.startServer = function(conf) {
    config = conf;
    setupWebSocketServer();
    keepAliveIntervalId = setInterval(keepAliveCheck, KEEP_ALIVE_INTERVAL);
  }

  application.stopServer = function() {
    // TODO: PC: Figure out how to do this.
  }

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

  function setupWebSocketServer() {
    // NOTE: Can also extend/upgrade an existing http.createServer()

    // NOTE: handleProtocols must be a function like this.
    // Callback: function(boolean result, string protocolToUse)
    // NOTE: Return value doesn't seem to be used; not sure why it was done this way,
    // could have just returned an object of {result, protocol} but a callback does
    // make it more extensible.
    var handleProtocols = function(clientProtocolsList, callback) {
      var result = false;
      if (clientProtocolsList.indexOf(WS_SUBPROTOCOL) != -1) {
        result = true;
      }
      callback(result, WS_SUBPROTOCOL);
      return result;
    }

    wss = new WebSocketServer({
      port: config.port,
      handleProtocols: handleProtocols,
    });

    console.log('WebSocket server running on port 8080');

    wss.on("connection", function(ws) {

      // TODO: PC: Check Origin header to prevent CSRF:
      // http://learnitcorrect.com/blog/websocket-is-great-but-not-the-origin-policy.html

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
      // - Look for .emit() calls in WebSocket.js.

    });
  }
})(application = (typeof application !== "undefined" ? application : {}));

// Start the server.
var config = {
  port: 8080,
};
application.startServer(config);
