var CONSTANTS = require("./Constants");
var MessageUtil = require("./MessageUtil");

// TODO: PC: Refactor to exploit commonality with OutboundMessageRouter.
/**
 * Creates a message router using the specified server.

 * @param {ChatServer} server the server using this message router.
 */
function InboundMessageRouter(server) {
  this.server = server;
}

/**
 * Routes an inbound message and produces an outbound message response.
 * 
 * @param {Object} connection the connection the message originated from.
 * @param {Object} message the message.
 */
InboundMessageRouter.prototype.handleMessage = function(connection, message) {
  if (!message) {
    console.log("Invalid or null chat message.");
    return MessageUtil.buildErrorResponse("Invalid chat message.");
  }

  var type = message[CONSTANTS.FIELDS.type];
  if (!type || !(type in CONSTANTS.TYPES)) {
    console.log("Invalid chat message: %s", JSON.stringify(message));
    return MessageUtil.buildErrorResponse("Invalid chat message.");
  }
  if (!(type in messageRouter)) {
    console.log("Unhandled message type: %s", type);
    return MessageUtil.buildErrorResponse("Invalid chat message.");
  }

  console.log("Dispatching inbound message: %s", JSON.stringify(message));

  return messageRouter[type](this.server, connection, message);
}

// Internal map of supported message types.
var messageRouter = {};
messageRouter[CONSTANTS.TYPES.login] = function(server, connection, m) {
  return server.loginUser(connection, m[CONSTANTS.FIELDS.username]);
}
messageRouter[CONSTANTS.TYPES.logout] = function(server, connection, m) {
  return server.logOutUser(connection);
}
messageRouter[CONSTANTS.TYPES.message] = function (server, connection, m) {
  if (!connection.chat.username) {
    console.log("Username not set for message: %s", JSON.stringify(m));
    return MessageUtil.buildErrorResponse("Username not set.");
  }

  return MessageUtil.buildMessageResponse(connection.chat.username, m[CONSTANTS.FIELDS.message]);
}

module.exports = InboundMessageRouter;
