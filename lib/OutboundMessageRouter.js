var CONSTANTS = require("./Constants");
var MessageUtil = require("./MessageUtil");

/**
 * Creates a message router using the specified server.

 * @param {ChatServer} server the server using this message router.
 */
function OutboundMessageRouter(server) {
  this.server = server;
}

/**
 * Routes an outbound message.
 * 
 * @param {Object} message the message.
 * @param {Object} params optional params associated with the message.
 */
OutboundMessageRouter.prototype.handleMessage = function(message, params) {
  if (!message) {
    console.log("Invalid or null chat message.");
    return;
  }

  var type = message[CONSTANTS.FIELDS.type];
  if (!type || !(type in CONSTANTS.TYPES)) {
    console.log("Invalid chat message: %s", JSON.stringify(message));
    return;
  }
  if (!(type in messageRouter)) {
    console.log("Unhandled outbound message type: %s", type);
    return;
  }

  console.log("Dispatching outbound message: %s", JSON.stringify(message));
  messageRouter[type](this.server, message, params);
};

// Internal map of supported message types.
var messageRouter = {};
messageRouter[CONSTANTS.TYPES.message] = function(server, message, params) {
  server.sendChatroomMessage(message);
};
messageRouter[CONSTANTS.TYPES.login_success] = function(server, message, params) {
  server.sendMessageToUser(params.connection, message);
  server.sendChatroomMessage(MessageUtil.buildUserJoinedMessage(message[CONSTANTS.FIELDS.username]));
};
messageRouter[CONSTANTS.TYPES.login_failure] = function(server, message, params) {
  server.sendMessageToNonLoggedInUser(params.connection, message);
};
messageRouter[CONSTANTS.TYPES.user_left] = function(server, message, params) {
  server.sendChatroomMessage(message);
}

module.exports = OutboundMessageRouter;
