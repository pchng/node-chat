// Application.
(function(application, $, undefined) {

  var config = window.config;

  // TODO: PC: Verify configuration present!
  if (!config) {
    console.error("No configuration present.");
    return;
  }

  var formSelector = "#input";
  var inputSelector = "#message";
  var outputSelector = "#output";
  
  var socket;
  var retryQueue = [];
  var retryIntervalId;
  var SIMPLE_RETRY_INTERVAL = 5000;
  
  function init() {
    setupWebSocketConnection();
    attachEventHandlers();

    // TODO: PC: May want to use event-triggered setTimeout() instead of interval.
    // - Only re-call setTimeout() if more on queue; initiate when putting onto the queue if intervalId not set?
    // retryIntervalId = window.setInterval(checkRetryQueue, SIMPLE_RETRY_INTERVAL);
  }
  
  // NOTE: To use Sec-WebSocket-Protocol during handshake:
  // - Client supplies list of valid sub-protcols and server responds with which one it has chosen.
  // new WebSocket(address, (sub)proctocol(s));
  // - subprotocols can be a string or an array of strings.
  function setupWebSocketConnection(callback) {
    if (!window.WebSocket) {
      window.alert("WebSocket is not supported in your browser.");
      return;
    }

    socket = new WebSocket(config.WEBSOCKET_ADDRESS);
    socket.onopen = function(event) {
      console.log(event);
      if (callback) {
        callback(event);
      }
    };
    socket.onmessage = function(event) {
      console.log(event);
      outputTextMessage(event.data);
    };
    socket.onclose = function(event) {
      console.log(event);
      outputTextMessage("Connection closed");
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
  }
  
  function sendTextMessage(message) {
    if (!socket) {
      // Or else socket would not be undefined.
      console.error("WebSocket is not supported in your browser.");
      return;
    }

    // TODO: PC: Really two problems, somewhat separate, don't confuse them:
    // 1) Retry: Assumes problem was transient and can be fixed.
    // 2) Reconnect: Should NOT be done periodically but rather on demand.
    // - If couldn't reconnect, add to retry.


    if (socket.readyState != WebSocket.OPEN) {
      retryQueue.push(message);
      console.log("Socket status was %s. Putting message on retry queue. Queue size: %s", socket.readyState, retryQueue.length);

      // NOTE: This behaviour triggers a retry immediately (typically on user action) and the 
      // periodic retry action will only take place in the absence of this trigger.
      // NOTE: No need to clear retryIntervalId if doing this!
      window.clearTimeout(retryIntervalId);
      retryIntervalId = window.setTimeout(checkRetryQueue, 0);
    } else {
      socket.send(message);
    }
  }

  // TODO: PC: How many messages to try at a time? Batch size? Stop after failure if batch?
  function checkRetryQueue() {
    console.debug("Checking retry queue at %s.", new Date());
    if (retryQueue.length <= 0) {
      console.debug("Retry queue was empty.");
      // Clear the retry ID to indicate no pending retry actions.
      retryIntervalId = null;
      return;
    }

    if (socket.readyState != WebSocket.OPEN) {
      // TODO: PC: Isn't working here.
      // If fails to connect, then retryIntervalId stays set and setTimeout() isn't called again.
      // Need to take separate action of fails: setTimeout() and try again.
      // - Think about how to refactor this!
      // - Also: When to clear intervalId? Can't at beginning, as even though JS is single-threaded,
      // code may "interleave" so if cleared at the beginning, another call to sendTextMessage()
      // could cause setTimeout() to be invoked BEFORE this function returns. (?Or is the 
      // execution of this function contiguous and NOT interleaved? Test!)
      // NEGATIVE: Results WILL NOT interleave, so can INDEED clear intervalId at the beginning of
      // this method!

      setupWebSocketConnection(retryMessage);
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
        // Try later if queue is not empty.
        retryIntervalId = window.setTimeout(checkRetryQueue, SIMPLE_RETRY_INTERVAL);
      } else {
        // Clear the retry ID to indicate no pending retry actions.
        retryIntervalId = null;
      }
    }
  }
  
  function outputTextMessage(message) {
    $(outputSelector).append(message + "\n");
  }

  init();

})(window.application = window.application || {}, jQuery);