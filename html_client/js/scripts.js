// Application.
(function(application, $, undefined) {

  var config = window.config;

  if (!config) {
    console.error("No configuration present.");
    return;
  }

  var formSelector = "#input";
  var inputSelector = "#message";
  var outputSelector = "#output";
  var closeSelector = "#close";
  
  var socket;
  var WS_SUBPROTOCOL = "simple-chat.unitstep.net";
  var retryQueue = [];
  var retryPendingId;

  // How often to retry when they are failed messages.
  var SIMPLE_RETRY_INTERVAL = 5000;
  // When checking the retry queue, this is the maximum number of messages that will be processed.
  // Set to 0 for no limit.
  var RETRY_BATCH_SIZE = 5;
  
  function init() {
    setupWebSocketConnection();
    attachEventHandlers();
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
      outputTextMessage("Connection closed");
    };
    // NOTE: This doesn't seem to fire.
    socket.onerror = function(event) {
      console.log(event);
    }

    socket.onmessage = function(event) {
      console.log(event);
      outputTextMessage(event.data);
    };
  }

  function attachEventHandlers() {
    // UI event handlers.
    $(formSelector).submit(function(e) {
      e.preventDefault();
      var message = $(inputSelector).val();
      
      if (message) {
        sendTextMessage(message);
      }
    });

    $(closeSelector).click(function(e) {
      if (socket) {
        socket.close();
      }
    });
  }
  
  function sendTextMessage(message) {
    if (!socket) {
      // Or else socket would not be undefined.
      console.error("WebSocket is not supported in your browser.");
      return;
    }

    if (socket.readyState != WebSocket.OPEN) {
      putMessageIntoRetry(message);
      return;
    }

    socket.send(message);
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

    console.debug("Checking retry queue (n=%s) at %s.", retryQueue.length, new Date());

    if (retryQueue.length <= 0) {
      console.debug("Retry queue was empty: Take no action.");
      // Clear the retry ID to indicate no pending retry actions.
      retryPendingId = null;
      return;
    }

    if (socket.readyState != WebSocket.OPEN) {
      setupWebSocketConnection(retryMessage, failedToConnect);
    } else {
      retryMessage();
    }

    function retryMessage() {
      var numRetriesProcessed = 0;
      while (retryQueue.length > 0 && socket.readyState == WebSocket.OPEN) {
        // TODO: PC: May want to throttle the rate.
        var message = retryQueue.pop();
        console.debug("Retrying message: %s", message)
        sendTextMessage(message);

        ++numRetriesProcessed;
        if (RETRY_BATCH_SIZE > 0 && numRetriesProcessed >= RETRY_BATCH_SIZE) {
          break;
        }
      }

      console.debug("Processed %s retries.", numRetriesProcessed);

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
  
  function outputTextMessage(message) {
    $(outputSelector).append(message + "\n");
  }

  init();

})(window.application = window.application || {}, jQuery);