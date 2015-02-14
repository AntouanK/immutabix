

var should            = require('should'),
    WebSocketClient   = require('websocket').client;


describe('immutabix', function(){

  var immutabix = require('../index');

  describe('immutabix.startServer(configuration)', function(){

    var configuration,
        client,
        connection,
        whenConnected,
        immuServer,
        resolveConnection;

    whenConnected = Promise.defer();

    configuration = {
      port: 44445,
      debug: true
    };

    client = new WebSocketClient();

    resolveConnection = function(thisConnection) {
      connection = thisConnection;
      whenConnected.resolve();
    };

    client.on('connect', resolveConnection);


    beforeEach(function(){
      immutabix.resetRoot();
    });


    //  ------------------------------------------------------------------------
    it('should start a server with the given configuration', function(done){

      immuServer = immutabix.startServer(configuration);

      client.connect('ws://localhost:44445/', 'echo-protocol');

      whenConnected
      .promise
      .then(done);
    });
    //  ------------------------------------------------------------------------


    //  ------------------------------------------------------------------------
    it( 'should listen to a unref command', function(done){

      console.log('\n---- starting test for `unref` command with changes');
      var command,
          path,
          value,
          count = 0;

      path = ['events', 'list', '1'];

      command = {
        type: 'ref',
        path: path
      };

      whenConnected
      .promise
      .then(function(){

        var onMessage = function(message) {

          count += 1;

          if(count === 1){
            (function(){

              var unrefCommand = {
                type: 'unref',
                path: path
              };
              connection.sendUTF(JSON.stringify(unrefCommand));
            })();
          }

          if(count > 1){
            throw new Error('we shouldn\'t be here!');
          }

          setTimeout(function(){
            done();
          }, 200);
        };

        connection.on('message', onMessage);

        //  send ref command
        connection.sendUTF(JSON.stringify(command));
      });

      immutabix.set(path, {
        id: 1,
        list: ['foo', 'bar', 'SOME CRAZY STUFF'],
        time: Date.now()
      });

      setTimeout(function(){
        console.log('[ 10 ms passed]\nSetting new values...\n');
        immutabix.set(path, {
          id: 1,
          list: null,
          time: Date.now()
        });
      }, 10);

    });
    //  ------------------------------------------------------------------------

  });

});
