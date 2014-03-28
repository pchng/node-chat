var util = require("util");
var events = require("events");
var CONSTANTS = require("./Constants");
var FIELDS = CONSTANTS.FIELDS;
var TYPES = CONSTANTS.TYPES;
var MessageUtil = require("./MessageUtil");
var _s = require('underscore.string');

/**
 * A ChatServer instance is meant to:
 * 1) Contain a list of connected clients.
 * 2) Handle inbound messages from clients and other message sources.
 * 3) Response to inbound messages by sending out messages to clients appropriately.
 */
function ChatServer() {
  // Mapping of connection ID -> connection object.
  // Connection ID will be programmatically generated and not from user input so that
  // Object built-in properties cannot be inadvertently overridden.
  // NOTE: WebSocketServer.js also maintains an internal list of clients. (options.clientTracking defaults to true)
  this.connections = {};
  this.bindHandlers();
}

util.inherits(ChatServer, events.EventEmitter);

/**
 * Define the proper actions in response to various events.
 */
ChatServer.prototype.bindHandlers = function() {
  var self = this;

  this.on(TYPES.login, function(connection, message) {
    self.loginUser(connection, message[CONSTANTS.FIELDS.username]);
  });

  this.on(TYPES.logout, function(connection, message) {
    self.logOutUser(connection);
  });

  this.on(TYPES.login_success, function(connection, message) {
    self.sendMessageToUser(connection, message);
    self.sendChatroomMessage(MessageUtil.buildUserJoinedMessage(message[CONSTANTS.FIELDS.username]));
  });

  this.on(TYPES.login_failure, function(connection, message) {
    self.sendMessageToNonLoggedInUser(connection, message);
  });

  this.on(TYPES.message, function(connection, message) {
    if (!isUserLoggedIn(connection, message)) {
      this.emit(TYPES.error,
        connection, MessageUtil.buildErrorResponse("Username not set."));
      return;
    }

    var outMessage = MessageUtil.buildMessageResponse(connection.chat.username, message[CONSTANTS.FIELDS.message]);
    self.sendChatroomMessage(outMessage);
  });

  this.on(TYPES.image, function(connection, message) {
    if (!isUserLoggedIn(connection, message)) {
      this.emit(TYPES.error, 
        connection, MessageUtil.buildErrorResponse("Username not set."));
      return;
    }

    var imageData = message[CONSTANTS.FIELDS.data].trim();

    // Ensure the client doesn't send an image linking to elsewhere on the interwebs.
    var startsWith = "data:image/";
    if (imageData.substring(0, startsWith.length) !== startsWith) {
      console.log("Bad image format; not sending out.");
      this.emit(TYPES.error,
        connection, MessageUtil.buildErrorResponse("Bad image format."));
      return;
    }

    // TODO: PC: Put image size limit into configuration.
    // Rough limit on size; image data is base64-encoded with a preamble like "data:image/jpeg;base64,"
    var limit = 102400;
    if ((imageData.length * 3)/4 > limit) {
      console.log("Image exceeded limit %s; not sending out. (Base64 size: %s)", limit, imageData.length);
      this.emit(TYPES.error,
        connection, MessageUtil.buildErrorResponse("Image too large."));
      return;
    }

    var outMessage = MessageUtil.buildImageResponse(connection.chat.username, imageData);
    self.sendChatroomMessage(outMessage);
  });

  this.on(TYPES.user_left, function(connection, message) {
    self.sendChatroomMessage(message);
  })


  // Report the error back to the client.
  this.on(TYPES.error, function(connection, message) {
    console.log("Error detected; Connection ID: %s, Message: %s", 
      connection.chat ? connection.chat.id : connection.chat, message);
    self.sendMessageToUser(connection, message);
  });
}

function isUserLoggedIn(connection, message) {
  var isLoggedIn = (connection.chat && connection.chat.username);
  if (!isLoggedIn) {
    console.log("Username not set for message: %s", JSON.stringify(m));
  }
  return isLoggedIn;
}

/**
 * Handles an inbound message from a connection.
 * 
 * @param {Object} connection the connection the message came from.
 * @param {Object} the message; the 'type' property determines the message routing.
 */
ChatServer.prototype.handleInboundMessage = function(connection, message) {
  message = MessageUtil.parseMessage(message);

  if (!message) {
    console.log("Invalid or null chat message.");
    this.emit(CONSTANTS.TYPES.error, 
      connection, MessageUtil.buildErrorResponse("Invalid chat message."));
    return;
  }

  var type = message[CONSTANTS.FIELDS.type];

  // NOTE: state machine might be better here.
  if (!(connection.chat && connection.chat.id) && type != CONSTANTS.TYPES.login) {
    // Only login messages are permitted for connections without an ID. (Login will assign an id)
    console.log("Message type was not login and connection id does not exist.");
    this.emit(CONSTANTS.TYPES.error, 
      connection, MessageUtil.buildErrorResponse("Not logged in."));
    return;
  }

  if (!type || !(type in CONSTANTS.TYPES)) {
    console.log("Invalid chat message: %s", JSON.stringify(message));
    this.emit(CONSTANTS.TYPES.error, 
      connection, MessageUtil.buildErrorResponse("Invalid chat message."));
    return;
  }

  var logMessage = _s.truncate("Dispatching inbound message: " + JSON.stringify(message), 120);
  console.log(logMessage);
  if (!this.emit(type, connection, message)) {
    console.warn("Event '%s' had no handlers.", type);
  }
};


/**
 * Logs a user into the server.
 */
ChatServer.prototype.loginUser = function(connection, username) {
  if (!username || !username.trim()) {
    console.log("Empty or invalid username: %s", username);
    this.emit(TYPES.login_failure, 
      connection, MessageUtil.buildLoginFailureResponse("Invalid username."));
    return;
  }

  username = username.trim();

  if (connection.chat && connection.chat.username) {
    console.log("Username already set for connection: %s", JSON.stringify(connection.chat));
    this.emit(TYPES.login_failure, 
      connection, MessageUtil.buildLoginFailureResponse("Username already set"));
    return;
  }

  // TODO: PC: Use the HashMap Object for faster lookup!
  // NOTE: Could speed this up by using an Object as an associative array, but
  // then risk certain usernames overriding built-in Object properties.
  for (var i in this.connections) {
    if (this.connections[i].chat.username == username) {
      console.log("Username %s already in use by connection %s.", username, i);
      this.emit(TYPES.login_failure, 
        connection, MessageUtil.buildLoginFailureResponse("Username already in use."));
      return;
    }
  }

  // Upon successful login store the {id, username} on a 'chat' property of the connection.
  connection.chat = connection.chat || {};

  // TODO: PC: Make this a bit more random; ensure unique.
  connection.chat.id = connection.chat.id || new Date().getTime();
  connection.chat.username = username.trim();
  this.connections[connection.chat.id] = connection;

  console.log("New user with id % and username %s logged in.", connection.chat.id, connection.chat.username);
  console.log("Number of users: %s.", Object.keys(this.connections).length);

  this.emit(TYPES.login_success, connection, MessageUtil.buildLoginSuccessResponse(connection.chat.username));
};

/**
 * Logs out a user and closes the connection. 
 */
ChatServer.prototype.logOutUser = function(connection, isTimeout) {
  if (!connection.chat || !connection.chat.id) {
    console.log("Logout failure: Connection id does not exist.");
    this.emit(TYPES.error, connection, 
      MessageUtil.buildErrorResponse("Connection id doesn't exist."));
    return;
  }

  if (!(connection.chat.id in this.connections)) {
    console.log("Connection with id %s doesn't exist.", id);
    this.emit(TYPES.error, connection, 
      MessageUtil.buildErrorResponse("Connection doesn't exist or not logged in."));
    return ;
  }

  if (isTimeout) {
    console.log("Connection %s was not open. Removing.", JSON.stringify(connection.chat));
  }

  delete this.connections[connection.chat.id];
  connection.close();
  console.log("Logged out user %s and removed connection id %s.", connection.chat.username, connection.chat.id);
  console.log("Number of users: %s.", Object.keys(this.connections).length);

  this.emit(TYPES.user_left, 
    connection, MessageUtil.buildUserLeftMessage(connection.chat.username, isTimeout));
};

ChatServer.prototype.sendChatroomMessage = function(message) {
  // NOTE: For now, just a single chatroom.
  sendToAllUsers.call(this, message);
};

ChatServer.prototype.sendAnnouncement = function(message) {
  sendToAllUsers.call(this, MessageUtil.buildAnnouncement(message));
};

ChatServer.prototype.sendMessageToUser = function(connection, message) {
  // NOTE: Could use connection directly, but reference the ID so that this
  // will fail if connection has not been through the login process.
  try {
    this.connections[connection.chat.id].send(MessageUtil.marshalMessage(message));
  } catch (e) {
    console.log("Sending message to user failed.");
    console.log(e);
    this.logOutUser(this.connections[connection.chat.id], true);
  }
};

ChatServer.prototype.sendMessageToNonLoggedInUser = function(connection, message) {
  connection.send(MessageUtil.marshalMessage(message));
};

// TODO: PC: Make part of prototype? No real reason not to.
function sendToAllUsers(message) {
  for (var id in this.connections) {
    try {
      this.connections[id].send(MessageUtil.marshalMessage(message));
    } catch (e) {
      this.logOutUser(this.connections[id], true);
    }
  }
}

module.exports = ChatServer;
