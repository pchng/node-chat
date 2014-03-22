// Can be require or requirejs
requirejs.config({
  enforceDefine: true,
  baseUrl: "js/lib",
  // Non-protocol/non *.js files will be preceded by baseUrl.
  paths: {
    app: "../app",
    jquery: [
      "//code.jquery.com/jquery-2.1.0.min",
      "jquery-2.1.0.min",
    ],
    // TODO: PC: May not even need this, remove if not using Bootflat.
    // NOTE: If define() is not called, or exports is not set, then this is considered 
    // a failure to load the module, and the next fallback path is checked.
    iCheck: [
      "//cdnjs.cloudflare.com/ajax/libs/iCheck/1.0.1/icheck.min",
      "/bootflat/js/icheck.min",
    ],
  },
  shim: {
    "iCheck": {
      deps: ["jquery"],
      exports: "jQuery.fn.iCheck",
    }
  },
})

define(["/js/config.js", "app/ChatClient", "jquery", "iCheck"], function(config, ChatClient, $, iCheck) {
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
