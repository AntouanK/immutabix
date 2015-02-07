

var should            = require('should'),
    WebSocketClient   = require('websocket').client;


describe('Waitwhat', function(){

  var waitwhat = require('../dist/waitwhat');

  describe('library', function(){

    it('should exist', function(){
      should.exist(waitwhat);
    });

    it('should have a configure function', function(){
      should(waitwhat.configure).be.a.Function;
    });

    it('should have a configuration exposed', function(){
      should(waitwhat.configuration).be.an.Object;
    });

    it('should have a _data property', function(){
      should(waitwhat._data).exist;
    });
  });


  //  ============================================ consumers
  describe('consumers', function(){

    waitwhat.configure({});
    waitwhat._server.start();

    it('should be able to connect', function(done){

      var client1 = new WebSocketClient();
      var client2 = new WebSocketClient();
      var deferred1 = Promise.defer();
      var deferred2 = Promise.defer();
      var promises = [deferred1.promise, deferred2.promise];

      Promise
      .all(promises)
      .then(function(){ done(); });

      client1.on('connect', function(connection) {
        console.log('WebSocket Client Connected');
        deferred1.resolve();
      });

      client1.connect('ws://localhost:12321/', 'echo-protocol');

      client2.on('connect', function(connection) {
        console.log('WebSocket Client Connected');
        deferred2.resolve();
      });

      client2.connect('ws://localhost:12321/', 'echo-protocol');

    });

    it('should be able to write and read', function(done){

      var client1 = new WebSocketClient();
      var deferred1 = Promise.defer();

      deferred1
      .promise
      .then(function(){ done(); });

      client1.on('connect', function(connection) {

        console.log('WebSocket Client Connected');

        connection.on('message', function(message) {
          if (message.type === 'utf8') {
              console.log("[Client 1] Received: '" + message.utf8Data + "'");
          }
        });

        var number = Math.round(Math.random() * 0xFFFFFF);
        connection.sendUTF('1-' + number.toString());

        setTimeout(function(){
          deferred1.resolve();
        }, 100);
      });

      client1.connect('ws://localhost:12321/', 'echo-protocol');

    });

  });
});
