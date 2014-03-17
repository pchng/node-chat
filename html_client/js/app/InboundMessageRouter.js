define(["app/Constants", "app/MessageUtil"], function(CONSTANTS, MessageUtil) {
  function InboundMessageRouter(client) {
    this.client = client;
  }

  InboundMessageRouter.prototype.handleMessage = function(message) {
    if (!message) {
      console.log("Invalid or null chat message.");
      return false;
    }

    var type = message[CONSTANTS.FIELDS.type];

    if (!type || !(type in CONSTANTS.TYPES)) {
      console.log("Invalid chat message: %s", JSON.stringify(message));
      return false;
    }
    if (!(type in messageRouter)) {
      console.log("Unhandled inbound message type: %s", type);
      return false;
    }

    console.log("Dispatching inbound message: %s", JSON.stringify(message));

    return messageRouter[type](this.client, message);
  }

  // Internal map of supported message types.
  var messageRouter = {};
  messageRouter[CONSTANTS.TYPES.login_success] = function(client, message) {
    client.loginSuccess();
  }

  console.log(MessageUtil.parse);

  return InboundMessageRouter;
});
