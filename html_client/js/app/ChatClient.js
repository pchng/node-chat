define(["jquery", "app/Constants", "app/MessageUtil", "app/InboundMessageRouter"], 
function($, CONSTANTS, MessageUtil, InboundMessageRouter) {

  function ChatClient() {
    this.inMessageRouter = new InboundMessageRouter(this);
  }

  // TODO: PC: Port over functionality here!
  

  $("body").append("Loaded!");

  return ChatClient;
});
