// Application.
(function(application, $, undefined) {

  var config = window.config;

  if (!config) {
    console.error("No configuration present.");
    return;
  }

  var loginFormSelector = "#login";
  var userNameSelector = "#username";
  var chatSelector = "#chat";
  var formSelector = "#input";
  var messageSelector = "#message";
  var outputSelector = "#output .bottom";
  var closeSelector = "#close";

  // Subprotocol definition: Could be in a separate file, shared among server/client.
  var WS_SUBPROTOCOL = "simple-chat.unitstep.net";
  var FIELDS = {
    COMMAND: "COMMAND",
    USERNAME: "USERNAME",
    MESSAGE: "MESSAGE",
    TIMESTAMP: "TIMESTAMP",
    REASON: "REASON",
  }
  // TODO: PC: May not need in/out; direction is implicit when message received.
  var COMMANDS = {
    LOGIN: "LOGIN",
    MESSAGE_IN: "MESSAGE_IN", 
    MESSAGE_OUT: "MESSAGE_OUT",
    LOGOUT: "LOGOUT",
    USER_JOINED: "USER_JOINED",
    USER_LEFT: "USER_LEFT",
    LOGIN_SUCCESS: "LOGIN_SUCCESS",
    LOGIN_FAILURE: "LOGIN_FAILURE",
  }

  var username;
  var socket;
  var retryQueue = [];
  var retryPendingId;

  var CHAT_BUFFER_SIZE = 100;
  // How often to retry when they are failed messages.
  var SIMPLE_RETRY_INTERVAL = 5000;
  // When checking the retry queue, this is the maximum number of messages that will be processed.
  // Set to 0 for no limit.
  var RETRY_BATCH_SIZE = 5;
  
  function init() {
    // setupWebSocketConnection();
    attachEventHandlers();
    $(userNameSelector).focus();
  }

  function attachEventHandlers() {
    $(loginFormSelector).submit(loginUiHandler);
    $(formSelector).submit(sendChatMessage);
    $(window).resize(function(e){
      // Quick fix: Size output on window resize.
      $(outputSelector).css("height", 0.75 * $(this).height());
    });
  }

  function loginUiHandler(e) {
    e.preventDefault();

    var usernameInput = $(userNameSelector).val();
    if (!usernameInput) {
      return;
    }

    // TODO: PC: UI indicator that process of "Logging in" is taking place.
    // - If encounter close event, indicate with error message and re-enable form or
    // else gets stuck in disabled state.
    var loginForm = $(this);
    loginForm.find("input").prop("disabled", true);
    loginForm.find(".status").text("Logging in...");

    setupWebSocketConnection(function(event) {
      sendLoginToWsServer(usernameInput);
    }, function(event) {
      console.error("Could not connect to WebSocket server.");
    });
  }

  function sendLoginToWsServer(username) {
    sendMessage({COMMAND: COMMANDS.LOGIN, USERNAME: username});
  }

  // NOTE: To use Sec-WebSocket-Protocol during handshake:
  // - Client supplies list of valid sub-protcols and server responds with which one it has chosen.
  // new WebSocket(address, (sub)proctocol(s));
  // - subprotocols can be a string or an array of strings.
  function setupWebSocketConnection(successCallback, errorCallback) {
    if (!window.WebSocket) {
      window.alert("WebSocket is not supported in your browser.");
      return;
    }

    if (socket && socket.readyState == WebSocket.OPEN) {
      // Already connected.
      successCallback();
      return;
    }

    socket = new WebSocket(config.WEBSOCKET_ADDRESS, WS_SUBPROTOCOL);
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
      outputRawTextMessage("Connection closed");
    };
    // NOTE: This doesn't seem to fire.
    socket.onerror = function(event) {
      console.log(event);
    }

    socket.onmessage = function(event) {
      console.log(event);

      // TODO: PC: Workaround for iOS/Safari crashing? Seems like the socket isn't ready to send data
      // and requires a small delay to be truly "ready"?
      // http://stackoverflow.com/questions/5574385/websockets-on-ios
      window.setTimeout(function() {
        dispatchInboundMessage(JSON.parse(event.data));
      }, 0);
    };
  }

  function loginSuccess() {
    var usernameInput = $(userNameSelector).val();
    var loginForm = $(loginFormSelector);

    loginForm.find("input").prop("disabled", false);
    username = usernameInput;
    loginForm.fadeOut(function() {
      $(chatSelector).fadeIn();
      $(messageSelector).focus();
    });
  }

  function loginFailure(message) {
    var usernameInput = $(userNameSelector).val();
    var loginForm = $(loginFormSelector);

    loginForm.find("input").prop("disabled", false);
    loginForm.find(".status").text("Error: " + message.REASON);
  }

  function sendChatMessage(e) {
    e.preventDefault();
    var input = $(messageSelector);
    var message = input.val()
    if (message) {
      sendMessage({COMMAND: COMMANDS.MESSAGE_IN, MESSAGE: message});
      input.val("");
    }
  }

  // TODO: PC: Rename to indicate this is the low-level function.
  function sendMessage(message) {
    if (!socket) {
      // Or else socket would not be undefined.
      console.error("WebSocket is not supported in your browser.");
      return;
    }

    // TODO: PC: Does it even make sense to retry? Maybe should display a message that the 
    // server is unreachable and wait for auto/triggered-retry to connect so user can 
    // interactively chat again. (Only put the login message into the retryQueue)
    if (socket.readyState != WebSocket.OPEN) {
      putMessageIntoRetry(message);
      return;
    }

    socket.send(JSON.stringify(message));
  }

  function putMessageIntoRetry(message) {
    retryQueue.push(message);
    console.log(
      "Socket status was %s. Putting message on retry queue. Queue size: %s", 
      socket.readyState, retryQueue.length
    );

    // No need to immediately check the retryQueue if a check is pending or the retryQueue is 
    // currently being processed.
    if (!retryPendingId) {
      retryPendingId = window.setTimeout(checkRetryQueue, 0);
    }
  }

  function checkRetryQueue() {

    console.log("Checking retry queue (n=%s) at %s.", retryQueue.length, new Date());

    if (retryQueue.length <= 0) {
      console.log("Retry queue was empty: Take no action.");
      // Clear the retry ID to indicate no pending retry actions.
      retryPendingId = null;
      return;
    }

    if (socket.readyState != WebSocket.OPEN) {
      setupWebSocketConnection(function(event) {
        if (username) {
          sendLoginToWsServer(username);
        }
        retryMessage();
      }, failedToConnect);
    } else {
      retryMessage();
    }

    function retryMessage() {
      var numRetriesProcessed = 0;
      while (retryQueue.length > 0 && socket.readyState == WebSocket.OPEN) {
        // TODO: PC: May want to throttle the rate.
        var message = retryQueue.pop();
        console.log("Retrying message: %s", message)
        sendMessage(message);

        ++numRetriesProcessed;
        if (RETRY_BATCH_SIZE > 0 && numRetriesProcessed >= RETRY_BATCH_SIZE) {
          break;
        }
      }

      console.log("Processed %s retries.", numRetriesProcessed);

      if (retryQueue.length > 0) {
        // Couldn't empty out the queue, so try again later.
        retryPendingId = window.setTimeout(checkRetryQueue, SIMPLE_RETRY_INTERVAL);
      } else {
        // Clear the retry ID to indicate no pending retry actions.
        retryPendingId = null;
      }
    }

    function failedToConnect(event) {
      // Failed to establish connection. Wait to try again.
      retryPendingId = window.setTimeout(checkRetryQueue, SIMPLE_RETRY_INTERVAL);
    }
  }

  function dispatchInboundMessage(message) {
    switch (message.COMMAND) {
      case COMMANDS.LOGIN_SUCCESS:
        loginSuccess();
        break;
      case COMMANDS.LOGIN_FAILURE:
        loginFailure(message);
        break;
      case COMMANDS.USER_JOINED:
      case COMMANDS.USER_LEFT:
      case COMMANDS.MESSAGE_OUT:
        outputChatMessage(message);
        break;
      default:
        console.log("Invalid command: %s", message.COMMAND);
        break;
    }
  }
  
  function outputChatMessage(message) {
    // TODO: PC: Optional timestamp; just client side for now.
    // TODO: PC: Use handlebars or similar to prevent XSS/injection.
    // TODO: PC: Optional sounds, turn on/off ability.
    var output;
    var curTimestamp = new Date();
    switch (message.COMMAND) {
      case COMMANDS.USER_JOINED:
        output = message.USERNAME + " has joined.";
        break;
      case COMMANDS.USER_LEFT:
        output = message.USERNAME + " has left.";
        break;
      case COMMANDS.MESSAGE_OUT:
        // TODO: PC: Use some sort of String formatting:
        // http://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format
        output = "[" + curTimestamp.getHours() + ":" + curTimestamp.getMinutes() + ":" + curTimestamp.getSeconds() + "]" + message.USERNAME + ": " + message.MESSAGE;
        break;
      default:
        console.warn("Invalid command: %s", message.COMMAND);
        break;
    }

    if (output) {
      // TODO: PC: Clear out the "buffer" if number of lines is longer than some limit.
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

  function outputRawTextMessage(message) {
    $(outputSelector).append(message + "\n");
  }

  init();

})(window.application = window.application || {}, jQuery);