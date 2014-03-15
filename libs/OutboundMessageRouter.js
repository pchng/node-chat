var CONSTANTS = require("./Constants");
var MessageUtil = require("./MessageUtil");

/**
 * Creates a message router using the specified server.

 * @param {ChatServer} server the server using this message router.
 */
function OutboundMessageRouter(server) {
  this.server = server;
}

OutboundMessageRouter.prototype.handleMessage = function(message) {
  if (!message) {
    console.log("Invalid or null chat message.");
    return false;
  }

  var type = message[CONSTANTS.FIELDS.type];
  if (!type || !(type in CONSTANTS.TYPES)) {
    console.log("Invalid chat message: %s", JSON.stringify(message));
    return false;
  }
  if (!(type in messageRouter)) {
    console.log("Unhandled message type: %s", type);
    return false;
  }

  console.log("Dispatching outbound message: %s", JSON.stringify(message));


  return true;
}

// Internal map of supported message types.
var messageRouter = {};
messageRouter[CONSTANTS.TYPES.message] = function(server, message) {
  // TODO: PC: Broadcast to all connections in server.connections.

}

module.exports = OutboundMessageRouter;