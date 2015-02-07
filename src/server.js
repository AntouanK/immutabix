
var WebSocketServer   = require('websocket').server,
    http              = require('http'),
    immutabixServer,
    callbacksForMessage,
    onMessage,
    offMessage;


//  keep an array with the callbacks
callbacksForMessage = [];

onMessage = (callback) => {

  if(typeof callback === 'function'){
    callbacksForMessage.push(callback);
  }
};


//  trigger for the callbacks
onMessage.trigger = (message) => {

  callbacksForMessage
  .forEach(callback => callback.call(onMessage, message));
};


offMessage = (callback) => {

  var index = callbacksForMessage.indexOf(callback);

  if(typeof callback === 'function' && index > -1){
    callbacksForMessage =
    callbacksForMessage
    .slice(0, index)
    .concat(callbacksForMessage.slice(index+1));
  }
};


immutabixServer = () => {

  var start;

  start = (configuration) => {

    let server = http.createServer((request, response) => {
      console.log((new Date()) + ' Received request for ' + request.url);
      response.writeHead(404);
      response.end();
    });

    //  start the HTTP server
    server
    .listen(configuration.port, () => {
      console
      .log(`${(new Date())} HTTP server is listening
            on port ${configuration.port}`);
    });

    //  start the websocket server
    let wsServer = new WebSocketServer({
      httpServer: server,
      // You should not use autoAcceptConnections for production
      // applications, as it defeats all standard cross-origin protection
      // facilities built into the protocol and the browser.  You should
      // *always* verify the connection's origin and decide whether or not
      // to accept it.
      autoAcceptConnections: false
    });

    console.log('WebSocketServer started');

    let originIsAllowed = (origin) => {
      // put logic here to detect whether the specified origin is allowed.
      return true;
    };

    wsServer
    .on('request', (request) => {

      if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
      }

      var connection = request.accept('echo-protocol', request.origin);
      console.log((new Date()) + ' Connection accepted.');

      connection
      .on('message', (message) => {

        if (message.type === 'utf8') {
          console.log('[Server] Received Message: ' + message.utf8Data);
          onMessage.trigger(message.utf8Data);
          connection.sendUTF(message.utf8Data);
        }
        else if (message.type === 'binary') {
          console.log('[Server] Received Binary Message of ' + message.binaryData.length + ' bytes');
          connection.sendBytes(message.binaryData);
        }
      });

      connection
      .on('close', (reasonCode, description) => {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
      });
    });
  };


  return {
    start: start,
    onMessage: onMessage,
    offMessage: offMessage
  };
};


module.exports = immutabixServer;
