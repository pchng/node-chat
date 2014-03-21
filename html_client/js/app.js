// Can be require or requirejs
requirejs.config({
  enforceDefine: true,
  baseUrl: "js/lib",
  // Non-protocol/non *.js files will be preceded by baseUrl.
  paths: {
    jquery: [
      "//code.jquery.com/jquery-2.1.0.min",
      "jquery-2.1.0.min",
    ],
    app: "../app",
  }
})

define(["/js/config.js", "app/ChatClient", "jquery"], function(config, ChatClient, $) {
  // TODO: PC: Decide if the main app should go in here.
  // - Instantiate and bring in configuration?
  // - Best way to bring in configuration?


  // In our case, the transport used to server the static page indicates 
  // whether TLS is also supported on the WebSocket connection.
  var wsProtocol = "wss://"
  if ("http:" == window.location.protocol) {
    wsProtocol = "ws://"
  }
  var wsAddress = wsProtocol + window.location.hostname + ":" + config.wsPort;
  var client = new ChatClient(wsAddress);

  $("#login").fadeIn(function(){
    $("#username").focus();
  });
});
