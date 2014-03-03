// Application.
(function(application, $, undefined) {

  var WEBSOCKET_ADDRESS = "ws://localhost:8088/";
  
  var socket;
  
  function init() {
  }
  
  function setupWebSocketConnection() {
    if (window.WebSocket) {
      socket = new WebSocket(webSocketAddress);
      socket.onopen = outputTextMessage;
      socket.onmessage = outputTextMessage;
      socket.onclose = outputTextMessage;
      
      
    } else {
      window.alert("WebSocket is not supported in your browser.");
    }
  }
  
  function sendTextMessage(message) {
  }
  
  function outputTextMessage(event) {
    console.log(event);
  }
  

})(window.application = window.application || {}, jQuery);