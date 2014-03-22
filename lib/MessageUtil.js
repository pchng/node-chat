var CONSTANTS = require("./Constants");

// TODO: PC: Unit test these functions.
module.exports = {
  parseMessage: function(message) {
    if (typeof(message) === "string") {
      try {
        return JSON.parse(message);
      } catch(e) {
        console.warn("Invalid JSON: %s", message);
        return false;
      }
    }
    return message;
  },
  buildAnnouncement: function(message) {
    var r = {};
    r[CONSTANTS.FIELDS.type] = CONSTANTS.TYPES.message;
    r[CONSTANTS.FIELDS.message] = message;
    return r;
  },
  buildUserJoinedMessage: function(username) {
    var r = {};
    r[CONSTANTS.FIELDS.type] = CONSTANTS.TYPES.user_joined;
    r[CONSTANTS.FIELDS.username] = username;
    return r;
  },
  buildUserLeftMessage: function(username, isTimeout) {
    var r = {};
    r[CONSTANTS.FIELDS.type] = CONSTANTS.TYPES.user_left;
    r[CONSTANTS.FIELDS.username] = username;
    if (isTimeout) {
      r[CONSTANTS.FIELDS.message] = "Timed out"
    }
    return r;
  },
  buildMessageResponse : function(username, message) {
    var r = {};
    r[CONSTANTS.FIELDS.type] = CONSTANTS.TYPES.message;
    r[CONSTANTS.FIELDS.username] = username;
    r[CONSTANTS.FIELDS.message] = message;
    return r;
  },
  buildImageResponse: function(username, imageData) {
    var r = {};
    r[CONSTANTS.FIELDS.type] = CONSTANTS.TYPES.image;
    r[CONSTANTS.FIELDS.username] = username;
    r[CONSTANTS.FIELDS.data] = imageData;
    return r;
  },
  buildErrorResponse: function(reason) {
    var r = {};
    r[CONSTANTS.FIELDS.type] = CONSTANTS.TYPES.error;
    r[CONSTANTS.FIELDS.reason] = reason;
    return r;
  },
  buildLoginSuccessResponse: function(username) {
    var r = {};
    r[CONSTANTS.FIELDS.type] = CONSTANTS.TYPES.login_success;
    r[CONSTANTS.FIELDS.username] = username;
    return r;
  },
  buildLoginFailureResponse: function(reason) {
    var r = {};
    r[CONSTANTS.FIELDS.type] = CONSTANTS.TYPES.login_failure;
    r[CONSTANTS.FIELDS.reason] = reason;
    return r;
  },
  marshalMessage: function(message) {
    message[CONSTANTS.FIELDS.timestamp] = new Date();
    return JSON.stringify(message);
  },
}
