
'use strict';

var WebSocketServer   = require('websocket').server,
    http              = require('http'),
    Consologger       = require('consologger');

var startServing,
    DEBUG_FLAG        = false,
    callbacksForMessage,
    onMessage,
    offMessage,
    getId,
    CONNECTIONS_MAP,
    connections,
    pushMessage,
    checkIfCommand,
    httpHandler,
    setDebug,
    log;

log = new Consologger();

CONNECTIONS_MAP = new Map();


//  -------------------------------------------------   (connections)
connections = {};


//  -------------------------------------------------   connections.get
connections.get = (id) => {
  let value = CONNECTIONS_MAP.get(id);
  return value;
};

//  -------------------------------------------------   connections.has
connections.has = (id) => {
  let boolean = CONNECTIONS_MAP.has(id);
  return boolean;
};

//  -------------------------------------------------   connections.set
connections.set = (key, value) => {
  let setResult = CONNECTIONS_MAP.set(key, value);
  return setResult;
};

//  -------------------------------------------------   connections.delete
connections.delete = (id) => {
  let deleteResult = CONNECTIONS_MAP.delete(id);
  return deleteResult;
};


//  -------------------------------------------------   getId
//  id generator
getId = (function*() {
  var counter = 0;

  while(true) {
    yield counter;
    counter += 1;
  }
})();


//  -------------------------------------------------   checkIfCommand
//  check if an incoming message is a valid command
checkIfCommand = (command) => {

  if(typeof command === 'object' && !!command){

    let hasType = typeof command.type === 'string';
    let hasPathOrValue = Array.isArray(command.path) || command.value !== undefined;

    if( hasType && hasPathOrValue ){
      return true;
    }
  }
  //  else
  return false;
};


//  -------------------------------------------------   pushMessage
pushMessage = (connectionId, message) => {

  //  check if that connection exists
  if(!connections.has(connectionId)){
    if(DEBUG_FLAG) {
      log.bgRed(`  Connection with id ${connectionId} was not found!  `).print();
    }
    return false;
  }

  connections
  .get(connectionId)
  .sendUTF( JSON.stringify(message) );

  if(DEBUG_FLAG) {
    log.green(`[Server][Connection id ${connectionId}] Message sent`).print();
  }
};


//  keep an array with the callbacks
callbacksForMessage = [];

//  -------------------------------------------------   onMessage
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

//  -------------------------------------------------   offMessage
offMessage = (callback) => {

  var index = callbacksForMessage.indexOf(callback);

  if(typeof callback === 'function' && (index > -1)){
    callbacksForMessage
    .splice(index, 1);
  }
};


//  -------------------------------------------------   httpHandler
//  handle any HTTP requests we may have
httpHandler = (request, response) => {
  if(DEBUG_FLAG) {
    log.green((new Date()) + ' Received request for ' + request.url).print();
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
startServing = (configuration) => {

  if(typeof configuration.DEBUG_FLAG === 'boolean'){
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
  const originIsAllowed = (/*origin*/) => { return true; };

  wsServer
  .on('request', (request) => {

    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      if(DEBUG_FLAG) {
        log
        .bgRed(' '+ (new Date()) + ' Connection from origin ' + request.origin + ' rejected. ')
        .print();
      }
      return;
    }

    var connection = request.accept('echo-protocol', request.origin),
        connectionId = getId.next().value;

    //  set the new conectionId in the map,
    //  and keep the reference to that connection
    connections.set(connectionId, connection);

    if(DEBUG_FLAG) {
      log.green(`${(new Date())}\n[Server] Websocket connection accepted`).print();
    }

    connection
    .on('message', (message) => {

      var messageData;

      if (message.type === 'utf8') {

        if(DEBUG_FLAG) {
          log.grey('[Server] Received Message: ' + message.utf8Data).print();
        }

        messageData = message.utf8Data;
      }
      else if (message.type === 'binary') {

        if(DEBUG_FLAG) {
          log.grey('[Server] Received Binary Message of ' + message.binaryData.length + ' bytes').print();
        }

        messageData = message.binaryData;
      }

      onMessage.trigger({
        connectionId: connectionId,
        message: messageData
      });
    });

    connection
    .on('close', (/*reasonCode, description*/) => {
      if(DEBUG_FLAG) {
        log.yellow((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.').print();
      }
      connections.delete(connectionId);
    });
  });
};


//  -------------------------------------------------   setDebug
setDebug = (boolean) => {
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
