// TODO: PC: The view logic here could be re-implmented using a MVC/MVW framework.
define(["jquery", "jquery.canvasResize", "app/Constants", "app/MessageUtil", "app/InboundMessageRouter", "app/Util"], 
function($, canvasResize, CONSTANTS, MessageUtil, InboundMessageRouter, Util) {

  var loginFormSelector = "#login";
  var userNameSelector = "#username";
  var chatSelector = "#chat";
  var formSelector = "#input";
  var messageSelector = "#message";
  var outputSelector = "#output .bottom";
  var closeSelector = "#close";
  var imgUploadButton = "#image-upload-button";
  var imgFileUpload = "#image-upload";
  var modalSelector = "#modal";

  var CHAT_BUFFER_SIZE = 100;

  // How often to retry when they are failed messages.
  var SIMPLE_RETRY_INTERVAL = 5000;
  // When checking the retry queue, this is the maximum number of messages that will be processed.
  // Set to 0 for no limit.
  var RETRY_BATCH_SIZE = 5;

  var retryQueue = [];
  var retryPendingId;

  function ChatClient(wsAddress) {
    this._inMessageRouter = new InboundMessageRouter(this);
    this._wsAddress = wsAddress;

    this._socket = null;
    this._username = null;

    this._retryQueue = [];
    this._retryPendingId = null;

    attachEventHandlers.call(this);
  }

  ChatClient.prototype._setupWebSocketConnection = function(successCallback, errorCallback) {
    if (!window.WebSocket) {
      throw new Error("WebSocket is not supported in this browser.");
    }

    if (this._socket && this._socket.readyState == WebSocket.OPEN) {
      // Already connected.
      successCallback();
      return;
    }

    var self = this;
    this._socket = new WebSocket(this._wsAddress, CONSTANTS.WS_SUBPROTOCOL);
    this._socket.onopen = function(event) {
      console.log(event);
      if (successCallback) {
        successCallback(event);
      }
    };
    this._socket.onclose = function(event) {
      console.log(event);
      // Anything other than 1000 is not a normal close event.
      if (event && event.code != 1000 && errorCallback) {
        errorCallback(event);
      }
      outputChatMessage("Connection closed.");
    };
    this._socket.onerror = function(event) {
      console.log(event);
    }
    this._socket.onmessage = function(event) {
      console.log(event);

      // TODO: PC: Workaround for iOS/Safari crashing? Seems like the socket isn't ready to send data
      // and requires a small delay to be truly "ready"?
      // http://stackoverflow.com/questions/5574385/websockets-on-ios
      window.setTimeout($.proxy(function(){
        var self = this;
        // TODO: PC: Use events instead.
        self._inMessageRouter.handleMessage(MessageUtil.parse(event.data));
      }, self), 0);

    };
  }

  ChatClient.prototype._sendLogin = function(username) {
    var message = {};
    message[CONSTANTS.FIELDS.type] = CONSTANTS.TYPES.login;
    message[CONSTANTS.FIELDS.username] = username;
    this._sendMessage(message);
  }

  ChatClient.prototype._sendImage = function(imageData) {
    var message = {};
    message[CONSTANTS.FIELDS.type] = CONSTANTS.TYPES.image;
    message[CONSTANTS.FIELDS.data] = imageData;
    this._sendMessage(message);
  }

  ChatClient.prototype._sendChatMessage = function(chatMessage) {
    var message = {};
    message[CONSTANTS.FIELDS.type] = CONSTANTS.TYPES.message;
    message[CONSTANTS.FIELDS.message] = chatMessage;
    this._sendMessage(message);
  }

  ChatClient.prototype._sendMessage = function(message) {
    if (!this._socket) {
      // Or else socket would not be undefined.
      throw new Error("WebSocket is not supported in your browser.");
    }

    message[CONSTANTS.FIELDS.timestamp] = new Date().getTime();

    // TODO: PC: Does it even make sense to retry? Maybe should display a message that the 
    // server is unreachable and wait for auto/triggered-retry to connect so user can 
    // interactively chat again. (Only put the login message into the retryQueue)
    if (this._socket.readyState != WebSocket.OPEN) {
      this._putMessageIntoRetry(message);
      return;
    }

    this._socket.send(JSON.stringify(message));
  }


  // TODO: PC: Refactor retry into a separate module.
  ChatClient.prototype._putMessageIntoRetry = function(message) {
    this._retryQueue.push(message);

    console.log("Putting message on retry queue. Socket status: %s. Queue size: %s",
      this._socket.readyState, this._retryQueue.length);

    // No need to immediately check the retryQueue if a check is pending or the retryQueue is 
    // currently being processed.
    if (!this._retryPendingId) {
      this._retryPendingId = window.setTimeout($.proxy(this._checkRetryQueue, this), 0);
    }
  }

  ChatClient.prototype._checkRetryQueue = function() {
    console.log("Checking retry queue (n=%s) at %s.", this._retryQueue.length, new Date());

    var self = this;
    if (this._retryQueue.length <= 0) {
      console.log("Retry queue was empty: Take no action.");
      // Clear the retry ID to indicate no pending retry actions.
      this._retryPendingId = null;
      return;
    }

    if (this._socket.readyState != WebSocket.OPEN) {
      this._setupWebSocketConnection(
        function(event) {
          if (self._username) {
            self._sendLogin(self._username);
          }
          self._retryMessage();
        },
        function(event) {
          // Failed to reconnect.
          self._retryPendingId = window.setTimeout($.proxy(self._checkRetryQueue, self), SIMPLE_RETRY_INTERVAL);
        }
      );
    } else {
      // Socket already open, so retry immediately.
      this._retryMessage();
    }
  }

  ChatClient.prototype._retryMessage = function() {
    var numRetriesProcessed = 0;
    while (this._retryQueue.length > 0 && this._socket.readyState == WebSocket.OPEN) {
      // TODO: PC: May want to throttle the rate.
      var message = this._retryQueue.shift();
      console.log("Retrying message: %s", JSON.stringify(message));
      this._sendMessage(message);

      ++numRetriesProcessed;

      // Logic is a bit simpler if we exclude this condition from the while condition.
      if (RETRY_BATCH_SIZE > 0 && numRetriesProcessed >= RETRY_BATCH_SIZE) {
        break;
      }
    }

    console.log("Processed %s retries. Remaining retries: %s.", numRetriesProcessed, this._retryQueue.length);

    if (this._retryQueue.length > 0) {
      // Retries remain.
      this._retryPendingId = window.setTimeout($.proxy(this._checkRetryQueue, this), SIMPLE_RETRY_INTERVAL);
    } else {
      // Clear retry pending ID to indicate no more pending retries.
      this._retryPendingId = null;
    }
  }


  ChatClient.prototype.loginSuccess = function() {
    var usernameInput = $(userNameSelector).val();
    var loginForm = $(loginFormSelector);
    loginForm.find("input").prop("disabled", false);
    loginForm.fadeOut(function() {
      $(chatSelector).fadeIn();
      $(messageSelector).focus();
    });
    this._username = usernameInput;
  }

  ChatClient.prototype.loginFailure = function(message) {
    var usernameInput = $(userNameSelector).val();
    var loginForm = $(loginFormSelector);
    loginForm.find("input").prop("disabled", false);

    // TODO: PC: Use Bootstrap Modals:
    // http://getbootstrap.com/javascript/
    showModal("Error: " + message[CONSTANTS.FIELDS.reason]);
  }

  ChatClient.prototype.outputChatRoomMessage = function(message) {
    // TODO: PC: Optional sounds, turn on/off ability.
    // TODO: PC: Use a MessageUtil functions for generating output.
    var output;
    var imageData;
    var now = new Date();
    var type = message[CONSTANTS.FIELDS.type];
    switch (type) {
      case CONSTANTS.TYPES.user_joined:
        output = message[CONSTANTS.FIELDS.username] + " has joined.";
        break;
      case CONSTANTS.TYPES.user_left:
        output = message[CONSTANTS.FIELDS.username] + " has left.";
        if (message[CONSTANTS.FIELDS.message]) {
          output += " (" + message[CONSTANTS.FIELDS.message] + ")";
        }
        break;
      case CONSTANTS.TYPES.message:
        // TODO: PC: Use some sort of String formatting:
        // http://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format
        output = message[CONSTANTS.FIELDS.username] + ": " + message[CONSTANTS.FIELDS.message];
        break;
      case CONSTANTS.TYPES.image:
        // TODO: PC: This is hacky; define instead an object that gets passed to the 
        // output() function.
        output = message[CONSTANTS.FIELDS.username] + ": ";
        imageData = message[CONSTANTS.FIELDS.data];
        break;
      default:
        console.warn("Invalid message type for output: %s", messageType);
        break;
    }
    output = Util.getChatTimestamp(now) + output;
    outputChatMessage(output, imageData);
  }

  // TODO: PC: Below functions are a bit icky...

  function attachEventHandlers() {
    var self = this;

    $(loginFormSelector).submit(function(e) {
      loginHandler.call(self, e);
    });
    $(formSelector).submit(function(e) {
      sendChatMessageHandler.call(self, e);
    })
    $(modalSelector).click(function(e) {
      $(this).fadeOut();
    });

    // TODO: PC: Hide upload image button if not FileReader.
    // - Refactor into proper module/class.
    // - Make sure is cross-browser/device compatible.
    $(imgUploadButton).click(function(e) {
      e.preventDefault();
      $(imgFileUpload).trigger("click");
    })
    $(imgFileUpload).on("change", function(e) {
      // TODO: PC: Progress bar/indicator when image is uploading.
      if (!FileReader) {
        console.log("FileReader unavailable; cannot upload image.");
      }

      if (!this.files || 0 == this.files.length) {
        console.log("No images detected.");
        return;
      }

      // TODO: PC: Possible to get height/width from this imageFile?
      var imageFile = this.files[0];
      console.log(imageFile);

      // TODO: PC: Max height/width into configuration.
      var maxWidth = 300;
      var maxHeight = 225;

      // NOTE: This plugin handles the use of FileReader and canvas to resize, as well 
      // as taking care of the iOS "image squash" bug and EXIF orientation issues.
      $.canvasResize(imageFile, {
        width: maxWidth,
        height: maxHeight,
        crop: false,
        quality: 80,
        callback: function(data, width, height) {
          self._sendImage(data);
        }
      });
    });

  }

  function loginHandler(e) {
    e.preventDefault();
    var self = this;

    var usernameInput = $(userNameSelector).val();
    if (!usernameInput) {
      console.log("Username was blank.")
      return;
    }

    // TODO: PC: UI indicator that process of "Logging in" is taking place.
    // - If encounter close event, indicate with error message and re-enable form or
    // else gets stuck in disabled state.
    var loginForm = $(loginFormSelector);

    // TODO: PC: iOS7 stays focused after prop disabled; need to defocus.

    loginForm.find("input").prop("disabled", true);

    this._setupWebSocketConnection(
      function(event) {
        self._sendLogin(usernameInput);
      },
      function(event) {
        console.error("Error connecting to WebSocket server or connection closed abnormally.");
      }
    );
  }

  function sendChatMessageHandler(e) {
    e.preventDefault();
    var input = $(messageSelector);
    var message = input.val()
    if (message) {
      this._sendChatMessage(message);
      input.val("");
    }
  }

  // TODO: PC: Refactor this; should accept an object with optional imageData and other
  // parameters; also start using handlebars templating.
  // - Allow clicking the image to open in full-screen mode.
  function outputChatMessage(output, imageData) {
    if (output) {
      var chatOutput = $(outputSelector);
      var span = $(document.createElement("span"));
      if (imageData) {
        // TODO: PC: Make sure we can trust the server at this point.
        span.text(output);
        span.append("<br><img src=" + imageData + " alt=''>\n");
      } else {
        span.text(output + "\n");
      }
      chatOutput.append(span);
      // chatOutput.scrollTop(chatOutput.prop("scrollHeight"));

      // Clear oldest entries from buffer.
      var buffer = chatOutput.find("span")
      var diff = buffer.size() - CHAT_BUFFER_SIZE;
      if (diff > 0) {
        buffer.slice(0, diff).remove();
      }
    }
  }

  function showModal(message) {
    var modal = $(modalSelector);
    modal.find(".alert").text(message);
    modal.fadeIn();
  }

  return ChatClient;
});
