"use strict";

var WebSocketServer = require("websocket").server,
    http = require("http"),
    log = require("consologger"),
    immutabixServer,
    callbacksForMessage,
    onMessage,
    offMessage;


//  keep an array with the callbacks
callbacksForMessage = [];

onMessage = function (callback) {
  if (typeof callback === "function") {
    callbacksForMessage.push(callback);
  }
};


//  trigger for the callbacks
onMessage.trigger = function (message) {
  callbacksForMessage.forEach(function (callback) {
    return callback.call(onMessage, message);
  });
};


offMessage = function (callback) {
  var isInTheArray = callbacksForMessage.contains(callback);

  if (typeof callback === "function" && isInTheArray) {
    callbacksForMessage.splice(index, 1);
  }
};


immutabixServer = function () {
  var start,
      debug = false;

  start = function (configuration) {
    if (configuration.debug) {
      debug = true;
    }

    var server = http.createServer(function (request, response) {
      debug && log.info(new Date() + " Received request for " + request.url);
      response.writeHead(404);
      response.end();
    });

    //  start the HTTP server
    server.listen(configuration.port, function () {
      debug && log.info("" + new Date() + "\n[Server] HTTP server is listening on port " + configuration.port);
    });

    //  start the websocket server
    var wsServer = new WebSocketServer({
      httpServer: server,
      // You should not use autoAcceptConnections for production
      // applications, as it defeats all standard cross-origin protection
      // facilities built into the protocol and the browser.  You should
      // *always* verify the connection's origin and decide whether or not
      // to accept it.
      autoAcceptConnections: false
    });

    var originIsAllowed = function (origin) {
      // put logic here to detect whether the specified origin is allowed.
      return true;
    };

    wsServer.on("request", function (request) {
      // if (!originIsAllowed(request.origin)) {
      //   // Make sure we only accept requests from an allowed origin
      //   request.reject();
      //   console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      //   return;
      // }

      var connection = request.accept("echo-protocol", request.origin);
      debug && log.info("" + new Date() + "\n[Server] Websocket connection accepted");

      connection.on("message", function (message) {
        if (message.type === "utf8") {
          debug && log.data("[Server] Received Message: " + message.utf8Data);
          onMessage.trigger(message.utf8Data);
          connection.sendUTF(message.utf8Data);
        } else if (message.type === "binary") {
          debug && log.data("[Server] Received Binary Message of " + message.binaryData.length + " bytes");
          onMessage.trigger(message.binaryData);
          connection.sendBytes(message.binaryData);
        }
      });

      connection.on("close", function (reasonCode, description) {
        debug && log.warning(new Date() + " Peer " + connection.remoteAddress + " disconnected.");
      });
    });
  };


  return {
    start: start,
    onMessage: onMessage,
    offMessage: offMessage,
    debug: debug
  };
};


module.exports = immutabixServer();