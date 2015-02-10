
var WebSocketServer   = require('websocket').server,
    http              = require('http'),
    log               = require('consologger'),
    immutabixServer,
    callbacksForMessage,
    onMessage,
    offMessage,
    getId,
    connectionsMap,
    pushMessage,
    checkIfCommand;



connectionsMap = new Map();

getId = (function*() {
  var counter = 0;

  while(true) {
    yield counter;
    counter += 1;
  }
})();


//  check if an incoming message is a valid command
checkIfCommand = (command) => {

  if(typeof command === 'object' && !!command){

    let hasType = command.type === 'set' || command.type === 'ref';
    let hasPathOrValue = Array.isArray(command.path) || command.value !== undefined;

    if( hasType && hasPathOrValue ){
      return true;
    }
  }
  //  else
  return false;
};


//  keep an array with the callbacks
callbacksForMessage = [];

onMessage = (callback) => {

  if(typeof callback === 'function'){
    callbacksForMessage.push(callback);
  }
};

//  trigger for the callbacks
onMessage.trigger = (input) => {

  if(typeof input !== 'object' || typeof input.message !== 'string'){
    return false;
  }

  try {
    input.message = JSON.parse(input.message);
  } catch(err) {
    throw new Error('message is not JSON!');
  }

  if(checkIfCommand(input.message)){

    let newInput = {
      connectionId: input.connectionId,
      command: input.message
    };

    callbacksForMessage
    .forEach(callback => callback.call(onMessage, newInput));
  }

};

offMessage = (callback) => {

  var isInTheArray = callbacksForMessage.contains(callback);

  if(typeof callback === 'function' && isInTheArray){
    callbacksForMessage
    .splice(index, 1);
  }
};



// =========================================================  immutabixServer
immutabixServer = () => {

  var start,
      pushMessage,
      debug = false,
      setDebug;


  pushMessage = (connectionId, message) => {

    //  check if that connection exists
    if(!connectionsMap.has(connectionId)){
      debug &&
      log.error(`Connection with id ${connectionId} was not found!`);
      return false;
    }

    var thatConnection = connectionsMap.get(connectionId);
    thatConnection.sendUTF( JSON.stringify(message) );

    debug &&
    log.info(`[Server][Connection id ${connectionId}] Message sent`);
  };

  //  start an HTTP server
  //  start a websocket server
  //
  //  - when a new websocket connection is made, the id is added on the map
  //  - when a message is received, onMessage.trigger is called
  //    with connection id and the message
  start = (configuration) => {

    if(configuration.debug){
      debug = true;
    }

    var server,
        wsServer,
        originIsAllowed;

    //  just bounce back HTTP requests
    server = http.createServer((request, response) => {
      debug &&
      log.info((new Date()) + ' Received request for ' + request.url);
      response.writeHead(404);
      response.end();
    });

    //  start the HTTP server
    server
    .listen(configuration.port, () => {
      debug &&
      log.info(`${(new Date())}\n[Server] HTTP server is listening on port ${configuration.port}`);
    });

    //  start the websocket server
    wsServer = new WebSocketServer({
      httpServer: server,
      // You should not use autoAcceptConnections for production
      // applications, as it defeats all standard cross-origin protection
      // facilities built into the protocol and the browser.  You should
      // *always* verify the connection's origin and decide whether or not
      // to accept it.
      autoAcceptConnections: false
    });

    originIsAllowed = (origin) => {
      // put logic here to detect whether the specified origin is allowed.
      return true;
    };

    wsServer
    .on('request', (request) => {

      if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        debug &&
        log.error((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
      }

      var connection = request.accept('echo-protocol', request.origin),
          connectionId = getId.next().value;

      connectionsMap.set(connectionId, connection);

      debug &&
      log.info(`${(new Date())}\n[Server] Websocket connection accepted`);

      connection
      .on('message', (message) => {

        var messageData;

        if (message.type === 'utf8') {

          debug &&
          log.data('[Server] Received Message: ' + message.utf8Data);

          messageData = message.utf8Data
        }
        else if (message.type === 'binary') {

          debug &&
          log.data('[Server] Received Binary Message of ' + message.binaryData.length + ' bytes');

          messageData = message.binaryData;
        }

        onMessage.trigger({
          connectionId: connectionId,
          message: messageData
        });
      });

      connection
      .on('close', (reasonCode, description) => {
        debug &&
        log.warning((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        connectionMap.delete(connectionId);
      });
    });
  };


  setDebug = (boolean) => {
    debug = !!boolean;
  };

  return {
    start: start,
    onMessage: onMessage,
    offMessage: offMessage,
    pushMessage: pushMessage,
    setDebug: setDebug
  };
};


module.exports = immutabixServer();