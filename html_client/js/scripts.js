// Application.
(function(application, $, undefined) {

  var config = window.config;

  // TODO: PC: Verify configuration present!

  var formSelector = "#input";
  var inputSelector = "#message";
  var outputSelector = "#output";
  
  var socket;
  
  function init() {
    setupWebSocketConnection();
    attachEventHandlers();
  }
  
  // TODO: PC: How to use Sec-WebSocket-Protocol during handshake?
  // - Client supplies list of valid sub-protcols and server responds with which one it has chosen.
  function setupWebSocketConnection(message) {
    if (window.WebSocket) {
      socket = new WebSocket(config.WEBSOCKET_ADDRESS);
      socket.onopen = function(event) {
        if (message) {
          // TODO: PC: Beware of recursive loops!
          sendTextMessage(message);
        }
      };
      socket.onmessage = outputTextMessage;
      socket.onclose = outputTextMessage;
      

      
    } else {
      window.alert("WebSocket is not supported in your browser.");
    }
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
    if (socket) {
      if (socket.readyState == WebSocket.OPEN) {
        socket.send(message);        
      } else if (socket.readyState == WebSocket.CLOSED) {
        // Attempt to reconnect.
        console.log("WebSocket reconnecting...");
        setupWebSocketConnection(message);
      }
      // TODO: PC: What about other readyState values? Queue up message and resend onopen?
      // - Maybe this should be the default behaviour.
    } else {
      console.error("WebSocket is not supported in your browser.");
    }
  }
  
  function outputTextMessage(event) {
    console.log(event);
    $(outputSelector).append(event.data + "\n");
  }
  
  init();
  

})(window.application = window.application || {}, jQuery);