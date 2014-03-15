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
  buildMessageResponse : function(username, message) {
    var r= {};
    r[CONSTANTS.FIELDS.type] = CONSTANTS.TYPES.message;
    r[CONSTANTS.FIELDS.username] = username;
    r[CONSTANTS.FIELDS.message] = message;
    return r;
  },
  buildErrorResponse: function(reason) {
    var r = {};
    r[CONSTANTS.FIELDS.type] = CONSTANTS.TYPES.error;
    r[CONSTANTS.FIELDS.reason] = reason;
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
