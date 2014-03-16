module.exports = {
  WS_SUBPROTOCOL: "simple-chat.unitstep.net",
  FIELDS: {
    type: "type",
    username: "username",
    // chatroom: "chatroom",
    message: "message",
    timestamp: "timestamp",
    reason: "reason",
  },
  TYPES: {
    announcement: "announcement",
    login: "login",
    logout: "logout",
    message: "message",
    user_joined: "user_joined",
    user_left: "user_left",
    login_success: "login_success",
    login_failure: "login_failure",
    error: "error",
  },
};
