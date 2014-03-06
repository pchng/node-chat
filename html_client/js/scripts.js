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
  var retryQueue = [];
  var retryPendingId;
  var SIMPLE_RETRY_INTERVAL = 5000;
  
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

    socket = new WebSocket(config.WEBSOCKET_ADDRESS);
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
      retryQueue.push(message);
      console.log("Socket status was %s. Putting message on retry queue. Queue size: %s", socket.readyState, retryQueue.length);

      // NOTE: This behaviour triggers a retry immediately (typically on user action) and the 
      // periodic retry action will only take place in the absence of this trigger.
      // NOTE: No need to clear retryPendingId if doing this!

      // TODO: PC: Fix this. Seems to cause too many setTimeout events to queue up if
      // sending triggered too fast. Race condition?
      // 1) Timeout is set and then another timeout is set.
      // 2) Clear timeout fires, but only clears the SECOND timeout; the first remains in play.
      // - Only most recent stored.
      // 3) Multiple setTimeout() calls but only one clearTimeout() call so many remain in play...
      // 4) May need an array - add pendingId to array, clear all when clearing timeout.
      // - Maybe we SHOULD wait for the next retry period? Make this configurable by putting
      // this code into a function that accepts a boolean parameter, tryImmediately.
      if (!retryPendingId) {
        // NOTE: This works.
        // window.clearTimeout(retryPendingId);
        retryPendingId = window.setTimeout(checkRetryQueue, 100);
      }
    } else {
      socket.send(message);
    }
  }

  // TODO: PC: How many messages to try at a time? Batch size? Stop after failure if batch?
  function checkRetryQueue() {
    // NOTE: When this function is invoked from a JS Timer, it will BLOCK until it has 
    // completed execution, just as if was called normally. (Single-threaded)

    // TODO: PC: Because the execution of this function blocks, can probably clear
    // retryPendingId here unconditionally.

    console.debug("Checking retry queue at %s.", new Date());
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
      while (retryQueue.length > 0 && socket.readyState == WebSocket.OPEN) {
        // TODO: PC: May want to throttle the rate.
        var message = retryQueue.pop();
        console.debug("Retrying message: %s", message)
        sendTextMessage(message);
      }

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