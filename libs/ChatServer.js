var _ = require('underscore');

// Subprotocol definition: Could be in a separate file, shared among server/client.
var WS_SUBPROTOCOL = "simple-chat.unitstep.net";
var FIELDS = {
  type: "type",
  username: "username",
  message: "message",
  timestamp: "timestamp",
  reason: "reason",
}
// TODO: PC: May not need in/out; direction is implicit when message received.
var TYPES = {
  login: "login",
  logout: "logout",
  message: "message",
  user_joined: "user_joined",
  user_left: "user_left",
  login_success: "login_success",
  login_failure: "login_failure",
}

function ChatServer() {
  // Mapping of connection ID -> {username, connection}
  // Connection ID will be programmatically generated and not from user input so that
  // Object built-in properties cannot be inadvertently overridden.
  this.connections = {};
}


var inBoundMessageRouter = {};
inBoundMessageRouter[TYPES.login] = function(id) {

}

ChatServer.prototype.handleInboundMessage(message) {
  if (!message || !message[FIELDS.type] || !(message[FIELDS.type] in TYPES)) {
    console.log("Invalid chat message: %s", JSON.stringify(message));

  }
}



/**
 * Logs a user into the server.
 *
 * @param {string} username the username of the user logging in.
 * @param {Object} connection the connection object to associate with the user.
 * @return {(Boolean|string)} false if the user could not be logged in, otherwise the unique ID of the user.
 */
ChatServer.prototype.loginUser = function(username, connection) {
  if (!username) {
    console.log("Empty username.");
    return false;
  }

  // NOTE: Could speed this up by using an Object as an associative array, but
  // then risk certain usernames overriding built-in Object properties.

  // Check if the username is already in use.
  for (var i in this.connections) {
    if (this.connections[i].username == username) {
      console.log("Username %s already exists.", username);
      return false;
    }
  }

  // TODO: PC: Make this a bit more random; ensure unique.
  var id = new Date().getTime();
  this.connections[id] = {
    username: username, 
    connection: connection,
  };
  return id;
}

/**
 * Logs out a user and closes the connection. 
 *
 * @param {string} id the connection id of the user to log out.
 * @return {Boolean} whether the user was successfully logged out.
 */
ChatServer.prototype.logOutUser = function(id) {
  if (!(id in this.connections)) {
    console.log("Connection with id %s doesn't exist.", id);
    return false;
  }

  this.connections[id].connection.close();

  delete this.connections[id];
  return true;
}

// TODO: PC: How to handle inbound message?
// - Separate functions?
// - Single function to handle an Object like {COMMAND: <>, MESSAGE: }
