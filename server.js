var http = require("http"),
    nodeStatic = require("node-static"),
    WebSocketServer = require("ws").Server,
    CONSTANTS = require("./lib/Constants"),
    ChatServer = require("./lib/ChatServer");

// Namespacing pattern to create an extensible object based around closure from a 
// self-executing anonymous function.
(function(application, undefined) {

  // The WebSocket server.
  var wss;

  application.startServer = function(conf, httpServerExtending) {
  };

  application.stopServer = function() {
    // TODO: PC: Figure out how to do this.
  }
  

})(application = (typeof application !== "undefined" ? application : {}));