// TODO: PC: Should keep-alive operate at the WebSocketServer level or the ChatServer level?

// TODO: PC: May want to use https://www.npmjs.org/package/lodash-node
var _ = require('underscore');

function ConnectionHeartBeat(connectionsToKeepAlive, keepAliveInterval, closeCallback) {
  this._keepAliveInterval = keepAliveInterval;
  this._connections = connectionsToKeepAlive;
  this._closeCallback = closeCallback;
  this._keepAliveIntervalId = null;

  this.enableKeepAlive();
}

ConnectionHeartBeat.prototype.enableKeepAlive = function() {
  console.info("Enabling client keep-alive check every %s ms.", this._keepAliveInterval);
  this._keepAliveIntervalId = setInterval(_.bind(this.keepAliveCheck, this), this._keepAliveInterval);
}

ConnectionHeartBeat.prototype.disableKeepAlive = function() {
  console.info("Disabling keep-alive check.");
  clearInterval(this._keepAliveIntervalId);
}

ConnectionHeartBeat.prototype.keepAliveCheck = function() {
  // TODO: PC: Could use _.size() here.
  console.log("Checking all current connections. (n=%s)", Object.keys(this._connections).length);
  for (var id in this._connections) {
    try {
      this._connections[id].ping();
    } catch (e) {
      // TODO: PC: This may not cover all cases. In the case where the PING is sent out,
      // but a PONG is not received, the connection should be removed.
      // How to accomplish this? Make sure this is robust.
      console.log("PING failed for connection id %s. Error: %s", id, e);
      this._closeCallback(this._connections[id]);
    }
  }
}

module.exports = ConnectionHeartBeat;