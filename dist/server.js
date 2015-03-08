"use strict";

var WebSocketServer = require("websocket").server,
    http = require("http"),
    log = require("consologger");

var startServing,
    DEBUG_FLAG = false,
    callbacksForMessage,
    onMessage,
    offMessage,
    getId,
    CONNECTIONS_MAP,
    connections,
    pushMessage,
    checkIfCommand,
    httpHandler,
    setDebug;

CONNECTIONS_MAP = new Map();

//  -------------------------------------------------   (connections)
connections = {};

//  -------------------------------------------------   connections.get
connections.get = function (id) {
  var value = CONNECTIONS_MAP.get(id);
  return value;
};

//  -------------------------------------------------   connections.has
connections.has = function (id) {
  var boolean = CONNECTIONS_MAP.has(id);
  return boolean;
};

//  -------------------------------------------------   connections.set
connections.set = function (key, value) {
  var setResult = CONNECTIONS_MAP.set(key, value);
  return setResult;
};

//  -------------------------------------------------   connections.delete
connections["delete"] = function (id) {
  var deleteResult = CONNECTIONS_MAP["delete"](id);
  return deleteResult;
};

//  -------------------------------------------------   getId
//  id generator
getId = (function* () {
  var counter = 0;

  while (true) {
    yield counter;
    counter += 1;
  }
})();

//  -------------------------------------------------   checkIfCommand
//  check if an incoming message is a valid command
checkIfCommand = function (command) {

  if (typeof command === "object" && !!command) {

    var hasType = typeof command.type === "string";
    var hasPathOrValue = Array.isArray(command.path) || command.value !== undefined;

    if (hasType && hasPathOrValue) {
      return true;
    }
  }
  //  else
  return false;
};

//  -------------------------------------------------   pushMessage
pushMessage = function (connectionId, message) {

  //  check if that connection exists
  if (!connections.has(connectionId)) {
    if (DEBUG_FLAG) {
      log.error(`Connection with id ${ connectionId } was not found!`);
    }
    return false;
  }

  connections.get(connectionId).sendUTF(JSON.stringify(message));

  if (DEBUG_FLAG) {
    log.info(`[Server][Connection id ${ connectionId }] Message sent`);
  }
};

//  keep an array with the callbacks
callbacksForMessage = [];

//  -------------------------------------------------   onMessage
onMessage = function (callback) {

  if (typeof callback === "function") {
    callbacksForMessage.push(callback);
  }
};

//  trigger for the callbacks
onMessage.trigger = function (input) {

  if (typeof input !== "object" || typeof input.message !== "string") {
    return false;
  }

  try {
    input.message = JSON.parse(input.message);
  } catch (err) {
    throw new Error("message is not JSON!");
  }

  if (checkIfCommand(input.message)) {
    (function () {

      var newInput = {
        connectionId: input.connectionId,
        command: input.message
      };

      callbacksForMessage.forEach(function (callback) {
        return callback.call(onMessage, newInput);
      });
    })();
  }
};

//  -------------------------------------------------   offMessage
offMessage = function (callback) {

  var index = callbacksForMessage.indexOf(callback);

  if (typeof callback === "function" && index > -1) {
    callbacksForMessage.splice(index, 1);
  }
};

//  -------------------------------------------------   httpHandler
//  handle any HTTP requests we may have
httpHandler = function (request, response) {
  if (DEBUG_FLAG) {
    log.info(new Date() + " Received request for " + request.url);
  }
  response.writeHead(404);
  response.end();
};

//  -------------------------------------------------   startServing
//  start an HTTP server
//  start a websocket server
//
//  - when a new websocket connection is made, the id is added on the map
//  - when a message is received, onMessage.trigger is called
//    with connection id and the message
startServing = function (configuration) {

  if (typeof configuration.DEBUG_FLAG === "boolean") {
    DEBUG_FLAG = configuration.debug;
  }

  //  just bounce back HTTP requests
  const server = http.createServer(httpHandler);

  //  start the HTTP server
  server.listen(configuration.port);

  //  start the websocket server
  const wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
  });

  // put logic here to detect whether the specified origin is allowed.
  const originIsAllowed = function () {
    return true;
  };

  wsServer.on("request", function (request) {

    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      if (DEBUG_FLAG) {
        log.error(new Date() + " Connection from origin " + request.origin + " rejected.");
      }
      return;
    }

    var connection = request.accept("echo-protocol", request.origin),
        connectionId = getId.next().value;

    //  set the new conectionId in the map,
    //  and keep the reference to that connection
    connections.set(connectionId, connection);

    if (DEBUG_FLAG) {
      log.info(`${ new Date() }\n[Server] Websocket connection accepted`);
    }

    connection.on("message", function (message) {

      var messageData;

      if (message.type === "utf8") {

        if (DEBUG_FLAG) {
          log.data("[Server] Received Message: " + message.utf8Data);
        }

        messageData = message.utf8Data;
      } else if (message.type === "binary") {

        if (DEBUG_FLAG) {
          log.data("[Server] Received Binary Message of " + message.binaryData.length + " bytes");
        }

        messageData = message.binaryData;
      }

      onMessage.trigger({
        connectionId: connectionId,
        message: messageData
      });
    });

    connection.on("close", function () {
      if (DEBUG_FLAG) {
        log.warning(new Date() + " Peer " + connection.remoteAddress + " disconnected.");
      }
      connections["delete"](connectionId);
    });
  });
};

//  -------------------------------------------------   setDebug
setDebug = function (boolean) {
  DEBUG_FLAG = !!boolean;
};

//  =================================================================== exports
module.exports = {
  startServing: startServing,
  onMessage: onMessage,
  offMessage: offMessage,
  pushMessage: pushMessage,
  setDebug: setDebug
};
/*origin*/ /*reasonCode, description*/