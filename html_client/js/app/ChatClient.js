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

  ChatClient.prototype._sendMessage = function (message) {
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

  function attachEventHandlers() {
    var self = this;
    $(loginFormSelector).submit(function(e) {
      loginHandler.call(self, e);
    });
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





  return ChatClient;
});
