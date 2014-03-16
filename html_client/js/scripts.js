 // Application.
(function(application, $, undefined) {

  // TODO: PC: require() this from a common file shared with server:
  var CONSTANTS = {
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

  var loginFormSelector = "#login";
  var userNameSelector = "#username";
  var chatSelector = "#chat";
  var formSelector = "#input";
  var messageSelector = "#message";
  var outputSelector = "#output .bottom";
  var closeSelector = "#close";

  var CHAT_BUFFER_SIZE = 100;
  // How often to retry when they are failed messages.
  var SIMPLE_RETRY_INTERVAL = 5000;
  // When checking the retry queue, this is the maximum number of messages that will be processed.
  // Set to 0 for no limit.
  var RETRY_BATCH_SIZE = 5;

  var config
  var username;
  var socket;
  var retryQueue = [];
  var retryPendingId;

  application.initialize = function(conf) {
    if (!conf) {
      throw new Error("No configuration present.");
    }

    config = conf;
    attachEventHandlers();
    $(userNameSelector).focus();
  }

  function attachEventHandlers() {
    $(loginFormSelector).submit(loginHandler);
  }

  function loginHandler(e) {
    e.preventDefault();

    var usernameInput = $(userNameSelector).val();
    if (!usernameInput) {
      return;
    }

    // TODO: PC: UI indicator that process of "Logging in" is taking place.
    // - If encounter close event, indicate with error message and re-enable form or
    // else gets stuck in disabled state.
    var loginForm = $(this);
    // loginForm.find("input").prop("disabled", true);
    // loginForm.find(".status").text("Logging in...");

    setupWebSocketConnection(function(event) {
      sendLogin(usernameInput);
    }, function(event) {
      console.error("Could not connect to WebSocket server.");
    });
  }

  function sendLogin(username) {
    sendMessage({type: CONSTANTS.TYPES.login, username: username});
  }

  function sendMessage(message) {
    console.log(message);
    if (!socket) {
      // Or else socket would not be undefined.
      throw new Error("WebSocket is not supported in your browser.");
    }

    if (socket.readyState != WebSocket.OPEN) {
      console.log("TODO: PC: Do retry here.");
      return;
    }

    message[CONSTANTS.FIELDS.timestamp] = new Date().getTime();

    socket.send(JSON.stringify(message));
  }

  function setupWebSocketConnection(successCallback, errorCallback) {
    if (!window.WebSocket) {
      throw new Error("WebSocket is not supported in this browser.");
    }

    if (socket && socket.readyState == WebSocket.OPEN) {
      // Already connected.
      successCallback();
      return;
    }

    socket = new WebSocket(config.WEBSOCKET_ADDRESS, CONSTANTS.WS_SUBPROTOCOL);
    socket.onopen = function(event) {
      console.log(event);
      if (successCallback) {
        successCallback(event);
      }
    };
    socket.onclose = function(event) {
      console.log(event);
      // Anything other than 1000 is not a normal close event.
      if (event && event.code != 1000 && errorCallback) {
        errorCallback(event);
      }
    };
    socket.onerror = function(event) {
      console.log(event);
    }
    socket.onmessage = function(event) {
      console.log(event);

      // TODO: PC: Hook up Chat Client logic here.
    };

  }

})(window.application = window.application || {}, jQuery);


application.initialize(window.config);
