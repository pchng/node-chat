var http = require("http"),
    nodeStatic = require("node-static"),
    WebSocketServer = require("ws").Server,
    CONSTANTS = require("./lib/Constants"),
    ChatServer = require("./lib/ChatServer"),
    ConnectionHeartBeat = require("./lib/ConnectionHeartBeat");

// Namespacing pattern to create an extensible object based around closure from a 
// self-executing anonymous function.
(function(application, undefined) {

  // The WebSocket server.
  var wss;
  var chatServer;
  var config;
  var httpServer;
  var heartBeatCheck;

  application.startServer = function(conf, httpServerExtending) {
    config = conf;
    httpServer = httpServerExtending;

    setupWebSocketServer();
    console.info("Started WebSocket server on port %s.", config.port);

    chatServer = new ChatServer();

    if (config.keepAlive && config.keepAliveInterval) {
      heartBeatCheck = new ConnectionHeartBeat(chatServer.connections, config.keepAliveInterval, 
        function(connection) {
          closeConnection(connection, true);
        }
      );
    }
  };

  application.stopServer = function() {
    // TODO: PC: Needed?
  }

  function setupWebSocketServer() {
    // NOTE: This is extending an existing http.createServer() so we can use the same port.
    // Could have it operating on a separate port using 'port' in the options.
    wss = new WebSocketServer({
      server: httpServer,
      handleProtocols: handleProtocols,
    });
    wss.on("connection", addWsConnection);
  }

  // NOTE: handleProtocols must be a function like this.
  // Callback: function(boolean result, string protocolToUse)
  // NOTE: Return value doesn't seem to be used; not sure why it was done this way,
  // could have just returned an object of {result, protocol} but a callback does
  // make it more extensible.
  function handleProtocols(clientProtocolsList, callback) {
    var result = false;
    if (clientProtocolsList.indexOf(CONSTANTS.WS_SUBPROTOCOL) != -1) {
      result = true;
    }
    callback(result, CONSTANTS.WS_SUBPROTOCOL);
    return result;
  }

  function addWsConnection(ws) {
    // TODO: PC: Check Origin header to prevent CSRF:
    // http://learnitcorrect.com/blog/websocket-is-great-but-not-the-origin-policy.html

    // NOTE: This may break, since using a designated private property.
    console.log("New WebSocket connection from %s.", ws._socket.remoteAddress);
    console.log("Number of connections: %s.", wss.clients.length);

    ws.on("message", function(message) {
      chatServer.handleInboundMessage(ws, message);
    });
    ws.on("close", function(closeCode, closeMessage) {
      var response = chatServer.logOutUser(ws);
      chatServer.handleOutboundMessage(response);
      console.log("WebSocket closed with code %s. Number of connections: %s.", closeCode, wss.clients.length);
    });
    ws.on("pong", function() {
      console.log("PONG received from connection %s", this._socket.remoteAddress);
    });

  }

  // TODO: PC: Functionality below needs to be tied to a module; don't let this file get messy.
  function closeConnection(connection, isTimeout) {
    var response = chatServer.logOutUser(connection, isTimeout);
    chatServer.handleOutboundMessage(response);
    connection.close();
    console.log("Closed connection. Number of connections: %s.", wss.clients.length);
  }

})(application = (typeof application !== "undefined" ? application : {}));


// TODO: PC: Put this into an external configuration file.
// http://stackoverflow.com/questions/5869216/how-to-store-node-js-deployment-settings-configuration-files
var config = {
  ip: process.env.OPENSHIFT_NODEJS_IP || "0.0.0.0",
  port: process.env.OPENSHIFT_NODEJS_PORT || 8080,
  keepAlive: true,
  keepAliveInterval: 30000,
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
httpServer.listen(config.port, config.ip);
console.log("HTTP server started on address %s and port %s.", config.ip, config.port);

// Start the WebSocket server, listening on the same port as the static HTTP server.
application.startServer(config, httpServer);

["exit", "SIGINT"].forEach(function(e) {
  // TODO: PC: Broadcast message to users.
  process.on(e, function() {
    if (e == "SIGINT") {
      console.log("\nServer is shutting down.");
      process.exit();
    }
  });
});
