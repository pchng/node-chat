var CONSTANTS = require("./Constants");
var FIELDS = CONSTANTS.FIELDS;
var TYPES = CONSTANTS.TYPES;
var MessageUtil = require("./MessageUtil");
var InboundMessageRouter = require("./InboundMessageRouter");
var OutboundMessageRouter = require("./OutboundMessageRouter");

// Subprotocol definition: Could be in a separate file, shared among server/client.
var WS_SUBPROTOCOL = "simple-chat.unitstep.net";

function ChatServer() {
  // Mapping of connection ID -> connection object.
  // Connection ID will be programmatically generated and not from user input so that
  // Object built-in properties cannot be inadvertently overridden.
  this.connections = {};
  this.inboundMessageRouter = new InboundMessageRouter(this);
  this.outboundMessageRouter = new OutboundMessageRouter(this);
}

/**
 * Handles an inbound message from a connection.
 * 
 * @param {Object} connection the connection the message came from.
 * @param {Object} the message; the 'type' property determines the message routing.
 * @return {Object} the response to be sent to the client.
 */
ChatServer.prototype.handleInboundMessage = function(connection, message) {

  // NOTE: state machine might be better here.
  if (!(connection.chat && connection.chat.id) && type != TYPES.login) {
    // Only login messages are permitted for connections without an ID. (Login will assign an id)
    console.log("Message type was not login and connection id does not exist.");
    return false;
  }

  var response = this.inBoundMessageRouter.handleMessage(connection, message);
  console.log(response);
  this.handleOutboundMessage(response);
}

/**
 * Handles an outbound message.
 *
 * @param {Object} message the message; the 'type' property determines the message routing.
 */
ChatServer.prototype.handleOutboundMessage = function(message) {
  this.outboundMessageRouter.handleMessage(message);
}

/**
 * Logs a user into the server.
 *
 * @param {Object} connection the connection object associated with the user.
 * @param {string} username the username of the user logging in.
 * @return {Object} response to be sent to client.
 */
ChatServer.prototype.loginUser = function(connection, username) {
  if (!username || !username.trim()) {
    console.log("Empty or invalid username: %s", username);
    return MessageUtil.buildLoginFailureResponse("Invalid username.");
  }

  if (connection.chat && connection.chat.username) {
    console.log("Username already set for connection: %s", JSON.stringify(connection.chat));
    return MessageUtil.buildLoginFailureResponse("Username already set");
  }

  // NOTE: Could speed this up by using an Object as an associative array, but
  // then risk certain usernames overriding built-in Object properties.
  for (var i in this.connections) {
    if (this.connections[i].chat.username == username) {
      console.log("Username %s already in use by connection %s.", username, i);
      return MessageUtil.buildLoginFailureResponse("Username already in use.");
    }
  }

  // Upon successful login store the {id, username} on a 'chat' property of the connection.
  connection.chat = connection.chat || {};

  // TODO: PC: Make this a bit more random; ensure unique.
  connection.chat.id = connection.chat.id || new Date().getTime();
  connection.chat.username = username;
  this.connections[connection.chat.id] = connection;

  return {
    type: TYPES.login_success,
  };
}

/**
 * Logs out a user and closes the connection. 
 *
 * @param {Object} connection the connection of the user to logout.
 * @return {Object} response to be sent to client.
 */
ChatServer.prototype.logOutUser = function(connection) {
  if (!connection.chat || !connection.chat.id) {
    console.log("Logout failure: Connection id does not exist.");
    return MessageUtil.buildErrorResponse("Connection id doesn't exist.");
  }

  if (!(connection.chat.id in this.connections)) {
    console.log("Connection with id %s doesn't exist.", id);
    return MessageUtil.buildErrorResponse("Connection doesn't exist or not logged in.");
  }

  console.log("Logging out user %s and removing connection id %s.", 
      connection.chat.username, connection.chat.id);
  delete this.connections[connection.chat.id];
  connection.close();

  return {
    types: TYPES.user_left,
    username: connection.chat.username,
  };
}

module.exports = ChatServer;
