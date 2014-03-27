module.exports = {
  WS_SUBPROTOCOL: "simple-chat.unitstep.net",
  FIELDS: {
    type: "type",
    username: "username",
    // chatroom: "chatroom",
    message: "message",
    data: "data",
    timestamp: "timestamp",
    reason: "reason",
  },
  TYPES: {
    announcement: "announcement",
    login: "login",
    logout: "logout",
    message: "message",
    image: "image",
    user_joined: "user_joined",
    user_left: "user_left",
    login_success: "login_success",
    login_failure: "login_failure",
    // Since using this as an event type, don't use 'error' as it's special for EventEmitter.
    error: "chat_error",
  },
};
