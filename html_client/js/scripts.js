// Application.
(function(application, $, undefined) {

  console.log(window.config);
  var config = window.config;

  // TODO: PC: Verify configuration present!

  var formSelector = "#input";
  var inputSelector = "#message";
  var outputSelector = "#output";
  
  var socket;
  
  function init() {
    setupWebSocketConnection();
  }
  
  // TODO: PC: How to use Sec-WebSocket-Protocol during handshake?
  // - Client supplies list of valid sub-protcols and server responds with which one it has chosen.
  function setupWebSocketConnection() {
    if (window.WebSocket) {
      socket = new WebSocket(config.WEBSOCKET_ADDRESS);
      socket.onopen = outputTextMessage;
      socket.onmessage = outputTextMessage;
      socket.onclose = outputTextMessage;
      
      // UI event handlers.
      $(formSelector).submit(function(e) {
        e.preventDefault();
        var message = $(inputSelector).val();
        
        if (message) {
          sendTextMessage(message);
        }
      });
      
    } else {
      window.alert("WebSocket is not supported in your browser.");
    }
  }
  
  function sendTextMessage(message) {
    if (socket && socket.readyState == WebSocket.OPEN) {
      socket.send(message);
    } else {
      console.error("WebSocket is not open.");
    }
  }
  
  function outputTextMessage(event) {
    console.log(event);
    $(outputSelector).append(event.data + "\n");
  }
  
  init();
  

})(window.application = window.application || {}, jQuery);