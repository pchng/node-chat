var _ = require('underscore');

function ChatServer() {
  // Mapping of connection ID -> User Data. (For now, just a username)
  // Connection ID will be programmatically generated and not from user input so that
  // Object built-in properties cannot be inadvertently overridden.
  this.connections = {};
}

/**
 * Logs a user into the server.
 *
 * @param {string} username the username of the user logging in.
 * @param {Object} [connection] optional connection object to associate with the user.
 * @return {Boolean} whether the user logged in successfully.
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
      console.log("Username %s already exists.");
      return false;
    }
  }

  // TODO: PC: Make this a bit more random; ensure unique.
  var id = new Date().getTime();
  this.connections[id] = {username: username, connection: connection};
  return true;
}

