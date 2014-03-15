var CONSTANTS = require("./Constants");
var FIELDS = CONSTANTS.FIELDS;
var TYPES = CONSTANTS.TYPES;

// Subprotocol definition: Could be in a separate file, shared among server/client.
var WS_SUBPROTOCOL = "simple-chat.unitstep.net";


function ChatServer() {
  // Mapping of connection ID -> connection object.
  // Connection ID will be programmatically generated and not from user input so that
  // Object built-in properties cannot be inadvertently overridden.
  this.connections = {};
}


// TODO: PC: Separate module for this, but need a way to access connection list in parent.
var inBoundMessageRouter = {};
inBoundMessageRouter[TYPES.login] = function(server, connection, m) {
  return server.loginUser(connection, m[FIELDS.username]);
}
inBoundMessageRouter[TYPES.logout] = function(server, connection, m) {
  return server.logOutUser(connection);
}

var outBoundMessageRouter = {};
outBoundMessageRouter[TYPES.message] = function(server, m) {
  // TODO: PC: 
}

/**
 * Handles an inbound message from a connection.
 * 
 * @param {Object} connection the connection the message came from.
 * @param {Object} the message; the 'type' property determines the message routing.
 * @return {Object} the response to be sent to the client.
 */
ChatServer.prototype.handleInboundMessage(connection, message) {
  if (!message || !message[FIELDS.type] || !(message[FIELDS.type] in TYPES)) {
    console.log("Invalid chat message: %s", JSON.stringify(message));
    return false;
  }

  var type = message[FIELDS.type];

  // NOTE: state machine might be better here.
  if (!(connection.chat && connection.chat.id) && type != TYPES.login) {
    // Only login messages are permitted for connections without an ID. (Login will assign an id)
    console.log("Message type was not login and connection id does not exist.");
    return false;
  }

  if (!(type in inBoundMessageRouter)) {
    console.log("Unhandled message type: %s", type);
    return false;
  }

  var response = inBoundMessageRouter[type](this, connection, message);
  console.log(response);
  
  return response;
}

/**
 * Handles an outbound message.
 *
 * @param {Object} message the message; the 'type' property determines the message routing.
 */
ChatServer.prototype.handleOutboundMessage(message) {
  if (!message || !message[FIELDS.type] || !(message[FIELDS.type] in TYPES)) {
    console.log("Invalid chat message: %s", JSON.stringify(message));
    return false;
  }

  var type = message[FIELDS.type];
  outBoundMessageRouter[type](this, message);
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
    return buildLoginFailureResponse("Invalid username.");
  }

  if (connection.chat && connection.chat.username) {
    console.log("Username already set for connection: %s", JSON.stringify(connection.chat));
    return buildLoginFailureResponse("Username already set");
  }

  // NOTE: Could speed this up by using an Object as an associative array, but
  // then risk certain usernames overriding built-in Object properties.
  for (var i in this.connections) {
    if (this.connections[i].chat.username == username) {
      console.log("Username %s already in use by connection %s.", username, i);
      return buildLoginFailureResponse("Username already in use.");
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
    return buildErrorResponse("Connection id doesn't exist.");
  }

  if (!(connection.chat.id in this.connections)) {
    console.log("Connection with id %s doesn't exist.", id);
    return buildErrorResponse("Connection doesn't exist or not logged in.");
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

function buildLoginFailureResponse(reason) {
  var r = {}
  r[FIELDS.type] = TYPES.login_failure;
  r[FIELDS.reason] = reason;
  return r;
}

function buildErrorResponse(reason) {
  var r = {}
  r[FIELDS.type] = TYPES.error;
  r[FIELDS.reason] = reason;
  return r;
}