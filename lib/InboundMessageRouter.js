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
 * Routes an inbound message and optionally produces an outbound message response.
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

  // NOTE: state machine might be better here.
  if (!(connection.chat && connection.chat.id) && type != CONSTANTS.TYPES.login) {
    // Only login messages are permitted for connections without an ID. (Login will assign an id)
    console.log("Message type was not login and connection id does not exist.");
    return MessageUtil.buildErrorResponse("Not logged in.");
  }

  if (!type || !(type in CONSTANTS.TYPES)) {
    console.log("Invalid chat message: %s", JSON.stringify(message));
    return MessageUtil.buildErrorResponse("Invalid chat message.");
  }
  if (!(type in messageRouter)) {
    console.log("Unhandled inbound message type: %s", type);
    return MessageUtil.buildErrorResponse("Invalid chat message.");
  }

  console.log("Dispatching inbound message: %s", JSON.stringify(message));
  return messageRouter[type](this.server, connection, message);
};

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
messageRouter[CONSTANTS.TYPES.image] = function (server, connection, m) {
  if (!connection.chat.username) {
    console.log("Username not set for message.");
    return MessageUtil.buildErrorResponse("Username not set.");
  }

  var imageData = m[CONSTANTS.FIELDS.data].trim();

  // Ensure the client doesn't send an image linking to elsewhere on the interwebs.
  var startsWith = "data:image/";
  if (imageData.substring(0, startsWith.length) !== startsWith) {
    console.log("Bad image format; not sending out.");
    return MessageUtil.buildErrorResponse("Bad image format.");
  }

  // TODO: PC: Limit size!
  // Rough limit on size; image data is base64-encoded with a preamble like "data:image/jpeg;base64,"
  var limit = 102400;
  if ((imageData.length * 3)/4 > limit) {
    console.log("Image exceeded limit %s; not sending out. (Base64 size: %s)", limit, imageData.length);
    return MessageUtil.buildErrorResponse("Image too large.");
  }

  return MessageUtil.buildImageResponse(connection.chat.username, imageData);
}

module.exports = InboundMessageRouter;
