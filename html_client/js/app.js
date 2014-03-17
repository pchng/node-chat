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

define(["app/ChatClient"], function(ChatClient) {
  // TODO: PC: Decide if the main app should go in here.
  // - Instantiate and bring in configuration?
  // - Best way to bring in configuration?
});
