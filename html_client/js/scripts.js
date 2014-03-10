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
  var inputSelector = "#message";
  var outputSelector = "#output";
  var closeSelector = "#close";

  // Subprotocol definition: Could be in a separate file, shared among server/client.
  var WS_SUBPROTOCOL = "simple-chat.unitstep.net";
  var FIELDS = {
    COMMAND: "COMMAND",
    USERNAME: "USERNAME",
    MESSAGE: "MESSAGE",
  }
  var COMMANDS = {
    LOGIN: "LOGIN",
    MESSAGE_IN: "MESSAGE_IN", 
    MESSAGE_OUT: "MESSAGE_OUT",
    LOGOUT: "LOGOUT",
  }

  var username;
  var socket;
  var retryQueue = [];
  var retryPendingId;

  // How often to retry when they are failed messages.
  var SIMPLE_RETRY_INTERVAL = 5000;
  // When checking the retry queue, this is the maximum number of messages that will be processed.
  // Set to 0 for no limit.
  var RETRY_BATCH_SIZE = 5;
  
  function init() {
    // setupWebSocketConnection();
    attachEventHandlers();
  }

  function attachEventHandlers() {
    $(loginFormSelector).submit(login);
    $(formSelector).submit(sendChatMessage);

    // $(closeSelector).click(function(e) {
    //   if (socket) {
    //     socket.close();
    //   }
    // });
  }

  function login(e) {
    e.preventDefault();

    var usernameInput = $(userNameSelector).val();
    if (!usernameInput) {
      return;
    }

    // TODO: PC: UI indicator that process of "Logging in" is taking place.
    var loginForm = $(this);
    loginForm.append("<p>Logging in...</p>");

    setupWebSocketConnection(function(event) {
      sendMessage({COMMAND: COMMANDS.LOGIN, USERNAME: usernameInput});
      username = usernameInput;
      loginForm.slideUp();
      $(chatSelector).slideDown();
    }, function(event) {
      console.error("Could not connect to WebSocket server.");
    });
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
      outputChatMessage(JSON.parse(event.data));
    };
  }

  function sendChatMessage(e) {
    e.preventDefault();
    var input = $(inputSelector);
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

  // TODO: PC: How many messages to try at a time? Batch size? Stop after failure if batch?
  function checkRetryQueue() {

    console.log("Checking retry queue (n=%s) at %s.", retryQueue.length, new Date());

    if (retryQueue.length <= 0) {
      console.log("Retry queue was empty: Take no action.");
      // Clear the retry ID to indicate no pending retry actions.
      retryPendingId = null;
      return;
    }

    if (socket.readyState != WebSocket.OPEN) {
      // TODO: PC: Login with username again; put this functionality into a separate function of
      // post-WebSocket open functionality to execute.
      setupWebSocketConnection(retryMessage, failedToConnect);
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
  
  function outputChatMessage(message) {
    // TODO: PC: Optional timestamp; just client side for now.
    // TODO: PC: Use handlebars or similar to prevent XSS/injection.
    var span = $(document.createElement("span"));
    var message = message.USERNAME + ": " + message.MESSAGE;
    span.text(message + "\n");
    $(outputSelector).append(span);
  }

  function outputRawTextMessage(message) {
    $(outputSelector).append(message + "\n");
  }

  init();

})(window.application = window.application || {}, jQuery);