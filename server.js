var util = require('util');

// TODO: PC: May want to use https://www.npmjs.org/package/lodash-node
var _ = require('underscore');
var WebSocketServer = require('ws').Server;

// Namespacing pattern to create an extensible object based around closure from a 
// self-executing anonymous function.
(function(application, undefined) {

  // The WebSocket server.
  var wss;

  // Subprotocol definition: Could be in a different file, shared among server/client.
  var WS_SUBPROTOCOL = "simple-chat.unitstep.net";
  var FIELDS = {
    COMMAND: "COMMAND",
    USER_NAME: "USER_NAME",
    MESSAGE: "MESSAGE",
  }
  var COMMANDS = {
    LOGIN: "LOGIN",
    MESSAGE_IN: "MESSAGE_IN", 
    MESSAGE_OUT: "MESSAGE_OUT",
  }

  // List of connected client WebSockets.
  var wsConnections = {};
  var keepAliveIntervalId;
  var config;

  application.startServer = function(conf) {
    config = conf;
    setupWebSocketServer();
    console.info("Started WebSocket server on port %s.", config.port);
    if (config.keepAlive && config.keepAliveInterval) {
      console.info("Enabling keep-alive check every %s ms.", config.keepAliveInterval);
      keepAliveIntervalId = setInterval(keepAliveCheck, config.keepAliveInterval);
    }
  }

  application.stopServer = function() {
    // TODO: PC: Figure out how to do this.
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

    wss.on("connection", addWsConnection);
  }

  function addWsConnection(ws) {
    // TODO: PC: Check Origin header to prevent CSRF:
    // http://learnitcorrect.com/blog/websocket-is-great-but-not-the-origin-policy.html

    // Add the connection to the list and setup event handlers.
    ws.chat = {
      id:  new Date().getTime(), // Just a way to uniquely identify a client.
    };
    wsConnections[ws.chat.id] = ws;

    console.log("Added WebSocket connection with id: %s", ws.chat.id);
    console.log("Number of connections: %s", Object.keys(wsConnections).length);

    ws.on("message", function(message) {
      // TODO: PC: Ignore messages greater than some limit.
      dispatchInboundMessage(this, message);
    });

    ws.on("close", function(closeCode, closeMessage) {
      var wsSender = this;
      delete wsConnections[wsSender.chat.id];
      console.log("Closed connection for id: %s", wsSender.chat.id);
    });

    ws.on("pong", function(event) {
      console.log("PONG received: %s", event);
    });

    // TODO: PC: Other ws event handlers?
    // - Look for .emit() calls in WebSocket.js.
  }

  function dispatchInboundMessage(wsSender, message) {
    m = parseCommand(message);
    if (!m || !m[FIELDS.COMMAND] || !_.contains(COMMANDS, m[FIELDS.COMMAND])) {
      console.warn("Invalid message from id %s received: %s", wsSender.chat.id, message);
      return;
    }

    // TODO: PC: Use an object name->function mapping here instead of this switch stuff.
    switch (m[FIELDS.COMMAND]) {
      case COMMANDS.LOGIN:
        if (wsSender.chat.username) {
          console.warn("Username already set for command: %s", message);
          return;
        }
        wsSender.chat.username = m[FIELDS.USER_NAME];
        console.log("Login for id %s. Username set to %s", wsSender.chat.id, wsSender.chat.username);
        break;
      case COMMANDS.MESSAGE_IN:
        if (!wsSender.chat.username) {
          console.warn("Username not set for command: %s", message);
          return;
        }
        if (m[FIELDS.MESSAGE]) {
          var outMessage = {
            COMMAND: COMMANDS.MESSAGE_OUT,
            MESSAGE: m[FIELDS.MESSAGE],
          }
          dispatchOutboundMessage(outMessage);
        }
        break;
      default:
        console.warn("Invalid command from id %s: %s", wsSender.chat.id, m[FIELDS.COMMAND]);
        break;
    }
  }

  function parseCommand(message) {
    try {
      return JSON.parse(message);
    } catch(e) {
      console.warn("Could not parse command: %s", message);
      return false;
    }
  }

  function dispatchOutboundMessage(message) {
    switch (message[FIELDS.COMMAND]) {
      case COMMANDS.MESSAGE_OUT:
        sendChatMessage(message);
        break;
      default:
        console.warn("Invalid command for outbound message: %s", message);
        break;
    }
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

  function sendChatMessage(message) {
    // Only one chat room, and everyone in it.
    for (var id in wsConnections) {
      // TODO: PC: Check readyState and/or remove connection if fails.
      wsConnections[id].send(message);
    }
  }



})(application = (typeof application !== "undefined" ? application : {}));

// Start the server.
var config = {
  port: 8080,
  keepAlive: true,
  keepAliveInterval: 5000,
};
application.startServer(config);
