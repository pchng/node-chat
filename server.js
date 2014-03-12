var util = require('util');

// TODO: PC: May want to use https://www.npmjs.org/package/lodash-node
var _ = require('underscore');
var WebSocketServer = require('ws').Server;

var nodeStatic = require("node-static");
var http = require("http");

// Namespacing pattern to create an extensible object based around closure from a 
// self-executing anonymous function.
(function(application, undefined) {

  // The WebSocket server.
  var wss;

  // Subprotocol definition: Could be in a separate file, shared among server/client.
  var WS_SUBPROTOCOL = "simple-chat.unitstep.net";
  var FIELDS = {
    COMMAND: "COMMAND",
    USERNAME: "USERNAME",
    MESSAGE: "MESSAGE",
    TIMESTAMP: "TIMESTAMP",
    REASON: "REASON",
  }
  // TODO: PC: May not need in/out; direction is implicit when message received.
  var COMMANDS = {
    LOGIN: "LOGIN",
    MESSAGE_IN: "MESSAGE_IN", 
    MESSAGE_OUT: "MESSAGE_OUT",
    LOGOUT: "LOGOUT",
    USER_JOINED: "USER_JOINED",
    USER_LEFT: "USER_LEFT",
    LOGIN_SUCCESS: "LOGIN_SUCCESS",
    LOGIN_FAILURE: "LOGIN_FAILURE",
  }

  // List of connected client WebSockets.
  var wsConnections = {};
  // List of usernames; avoid using an Object so built-in properties cannot be overridden.
  var usernames = [];
  var keepAliveIntervalId;
  var config;
  var httpServer;

  application.startServer = function(conf, httpServerExtending) {
    config = conf;
    httpServer = httpServerExtending
    setupWebSocketServer();

    console.info("Started WebSocket server on port %s.", config.port);
    if (config.keepAlive && config.keepAliveInterval) {
      console.info("Enabling client keep-alive check every %s ms.", config.keepAliveInterval);
      keepAliveIntervalId = setInterval(keepAliveCheck, config.keepAliveInterval);
    }
  }

  application.stopServer = function() {
    // TODO: PC: Figure out how to do this.
  }

  function setupWebSocketServer() {
    // NOTE: This is extending an existing http.createServer() so we can use the same port.
    // Could have it operating on a separate port using 'port' in the options.

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
      server: httpServer,
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
      logoutUser(this);
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
        handleLogin(wsSender);
        break;
      case COMMANDS.MESSAGE_IN:
        if (!wsSender.chat.username) {
          console.warn("Username not set for command: %s", message);
          return;
        }
        if (m[FIELDS.MESSAGE]) {
          var outMessage = {
            COMMAND: COMMANDS.MESSAGE_OUT,
            USERNAME: wsSender.chat.username,
            MESSAGE: m[FIELDS.MESSAGE],
            TIMESTAMP: new Date(),
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

  function handleLogin(wsSender) {
    if (!m[FIELDS.USERNAME] || !m[FIELDS.USERNAME].trim()) {
      console.warn("Empty or invalid username for connection id: %s", wsSender.chat.id);
      wsSender.send(JSON.stringify(
        {COMMAND: COMMANDS.LOGIN_FAILURE, REASON: "Invalid username."}
      ));
      return;
    }

    if (wsSender.chat.username) {
      console.warn("Username already set for command: %s", message);
      wsSender.send(JSON.stringify(
        {COMMAND: COMMANDS.LOGIN_FAILURE, REASON: "Username already set."}
      ));
      return;
    }

    if (usernames.indexOf(m[FIELDS.USERNAME]) > -1) {
      // Username already in use.
      // TODO: PC: Reply with a proper message so connection "handshake" can be tried again.
      console.warn("Username %s is already in use.", m[FIELDS.USERNAME]);
      wsSender.send(JSON.stringify(
        {COMMAND: COMMANDS.LOGIN_FAILURE, REASON: "Username is already in use."}
      ));
      return;
    }

    // Set username to indicate "logged in".
    wsSender.chat.username = m[FIELDS.USERNAME];
    usernames.push(wsSender.chat.username);

    console.log("Login for id %s. Username set to %s", wsSender.chat.id, wsSender.chat.username);

    var successMessage = {COMMAND: COMMANDS.LOGIN_SUCCESS};
    wsSender.send(JSON.stringify(successMessage));

    var outMessage = {
      COMMAND: COMMANDS.USER_JOINED,
      USERNAME: wsSender.chat.username,
      TIMESTAMP: new Date(),
    }
    dispatchOutboundMessage(outMessage);
  }

  function dispatchOutboundMessage(message) {
    switch (message[FIELDS.COMMAND]) {
      case COMMANDS.USER_JOINED:
      case COMMANDS.USER_LEFT:
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
        logoutUser(wsConnections[id]);
        console.log("Removed connection with id %s because could not send out ping: %s", id, e);
      }
    }
  }

  function logoutUser(wsSender) {
    delete wsConnections[wsSender.chat.id];
    usernames = _.without(usernames, wsSender.chat.username);

    console.log("Closed connection for username %s with id: %s", wsSender.chat.username, wsSender.chat.id);
    
    if (wsSender.chat.username) {
      var outMessage = {
        COMMAND: COMMANDS.USER_LEFT,
        USERNAME: wsSender.chat.username,
        TIMESTAMP: new Date(),
      }
      dispatchOutboundMessage(outMessage);
    }
  }

  function sendChatMessage(message) {
    // Only one chat room, and everyone in it.
    for (var id in wsConnections) {

      if (!wsConnections[id].chat.username) {
        // User is not logged in.
        continue;
      }

      // TODO: PC: Check readyState and/or remove connection if fails.
      wsConnections[id].send(JSON.stringify(message));
    }
  }



})(application = (typeof application !== "undefined" ? application : {}));

// TODO: PC: Put this into an external configuration file.
// http://stackoverflow.com/questions/5869216/how-to-store-node-js-deployment-settings-configuration-files
var config = {
  port: 8080,
  keepAlive: true,
  keepAliveInterval: 5000,
};

// Static HTTP server to serve the HTML/JS client.
var staticFiles = new nodeStatic.Server("./html_client");
var httpServer = http.createServer(function(request, response) {
  request.on("end", function() {
    // Fires when the request stream has been completely read.
    staticFiles.serve(request, response);
  }).resume(); // Triggers the stream to be read completely.

  response.on("finish", function() {
    console.log('%s - [%s] "%s %s HTTP/%s" %s', 
      request.connection.remoteAddress, 
      new Date(), 
      request.method, 
      request.url, 
      request.httpVersion, 
      response.statusCode);
  });
});
httpServer.listen(config.port);
console.log("HTTP server started on port %s.", config.port);

// Start the WebSocket server, listening on the same port as the static HTTP server.
application.startServer(config, httpServer);
