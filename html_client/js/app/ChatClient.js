// TODO: PC: The view logic here could be re-implmented using a MVC/MVW framework.
define(["jquery", "app/Constants", "app/MessageUtil", "app/InboundMessageRouter"], 
function($, CONSTANTS, MessageUtil, InboundMessageRouter) {

  var loginFormSelector = "#login";
  var userNameSelector = "#username";
  var chatSelector = "#chat";
  var formSelector = "#input";
  var messageSelector = "#message";
  var outputSelector = "#output .bottom";
  var closeSelector = "#close";

  var CHAT_BUFFER_SIZE = 5;

  // TODO: PC: Continue copying over logic from client-side.

  function ChatClient(wsAddress) {
    this._inMessageRouter = new InboundMessageRouter(this);
    this._wsAddress = wsAddress;

    this._socket = null;
    this._username = null;

    attachEventHandlers.call(this);
    $(userNameSelector).focus();
  }

  ChatClient.prototype._setupWebSocketConnection = function(successCallback, errorCallback) {
    if (!window.WebSocket) {
      throw new Error("WebSocket is not supported in this browser.");
    }

    if (this._socket && this._socket.readyState == WebSocket.OPEN) {
      // Already connected.
      successCallback();
      return;
    }

    var self = this;
    this._socket = new WebSocket(this._wsAddress, CONSTANTS.WS_SUBPROTOCOL);
    this._socket.onopen = function(event) {
      console.log(event);
      if (successCallback) {
        successCallback(event);
      }
    };
    this._socket.onclose = function(event) {
      console.log(event);
      // Anything other than 1000 is not a normal close event.
      if (event && event.code != 1000 && errorCallback) {
        errorCallback(event);
      }
    };
    this._socket.onerror = function(event) {
      console.log(event);
    }
    this._socket.onmessage = function(event) {
      console.log(event);
      self._inMessageRouter.handleMessage(MessageUtil.parse(event.data));
    };
  }

  ChatClient.prototype._sendLogin = function(username) {
    var message = {};
    message[CONSTANTS.FIELDS.type] = CONSTANTS.TYPES.login;
    message[CONSTANTS.FIELDS.username] = username;
    this._sendMessage(message);
  }

  ChatClient.prototype._sendChatMessage = function(chatMessage) {
    var message = {};
    message[CONSTANTS.FIELDS.type] = CONSTANTS.TYPES.message;
    message[CONSTANTS.FIELDS.message] = chatMessage;
    this._sendMessage(message);
  }

  ChatClient.prototype._sendMessage = function(message) {
    console.log(message);
    if (!this._socket) {
      // Or else socket would not be undefined.
      throw new Error("WebSocket is not supported in your browser.");
    }

    if (this._socket.readyState != WebSocket.OPEN) {
      // TODO: PC: Do retry here.
      console.log("Socket not open!");
      return;
    }

    message[CONSTANTS.FIELDS.timestamp] = new Date().getTime();

    this._socket.send(JSON.stringify(message));
  }

  ChatClient.prototype.loginSuccess = function() {
    var usernameInput = $(userNameSelector).val();
    var loginForm = $(loginFormSelector);
    this._username = usernameInput;
    loginForm.find("input").prop("disabled", false);
    loginForm.fadeOut(function() {
      $(chatSelector).fadeIn();
      $(messageSelector).focus();
    });
  }

  ChatClient.prototype.loginFailure = function(message) {
    var usernameInput = $(userNameSelector).val();
    var loginForm = $(loginFormSelector);
    loginForm.find("input").prop("disabled", false);
    loginForm.find(".status").text("Error: " + message[CONSTANTS.FIELDS.reason]);
  }

  ChatClient.prototype.outputChatMessage = function(message) {
    // TODO: PC: Optional timestamp; just client side for now.
    // TODO: PC: Use handlebars or similar to prevent XSS/injection.
    // TODO: PC: Optional sounds, turn on/off ability.
    var output;
    var timestamp = new Date();
    var type = message[CONSTANTS.FIELDS.type];
    switch (type) {
      case CONSTANTS.TYPES.message:
        // TODO: PC: Use some sort of String formatting:
        // http://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format
        output = "[" + timestamp.getHours() + ":" + timestamp.getMinutes() + ":" + timestamp.getSeconds() + "]" + message[CONSTANTS.FIELDS.username] + ": " + message[CONSTANTS.FIELDS.message];
        break;
      default:
        console.log("Invalid message type for output: %s", messageType)
    }

    if (output) {
      var chatOutput = $(outputSelector);
      var span = $(document.createElement("span"));
      span.text(output + "\n");
      chatOutput.append(span);
      chatOutput.scrollTop(chatOutput.prop("scrollHeight"));

      // Clear oldest entries from buffer.
      var buffer = chatOutput.find("span")
      var diff = buffer.size() - CHAT_BUFFER_SIZE;
      if (diff > 0) {
        buffer.slice(0, diff).remove();
      }
    }
  }

  function attachEventHandlers() {
    var self = this;
    $(loginFormSelector).submit(function(e) {
      loginHandler.call(self, e);
    });
    $(formSelector).submit(function(e) {
      sendChatMessageHandler.call(self, e);
    })

  }

  function loginHandler(e) {
    e.preventDefault();
    var self = this;

    var usernameInput = $(userNameSelector).val();
    if (!usernameInput) {
      console.log("Username was blank.")
      return;
    }

    // TODO: PC: UI indicator that process of "Logging in" is taking place.
    // - If encounter close event, indicate with error message and re-enable form or
    // else gets stuck in disabled state.
    var loginForm = $(loginFormSelector);
    loginForm.find("input").prop("disabled", true);
    loginForm.find(".status").text("Logging in...");

    this._setupWebSocketConnection(
      function(event) {
        self._sendLogin(usernameInput);
      },
      function(event) {
        console.error("Could not connect to WebSocket server.");
      }
    );
  }

  function sendChatMessageHandler(e) {
    e.preventDefault();
    var input = $(messageSelector);
    var message = input.val()
    if (message) {
      this._sendChatMessage(message);
      input.val("");
    }
  }





  return ChatClient;
});
