

var should        = require('should'),
WebSocketClient   = require('websocket').client;


describe('immutabix', function(){

  var immutabix = require('../index');


  describe('immutabix module', function(){

    it('should exist', function(){
      should.exist(immutabix);
    });

    it('should have a .getRaw function', function(){
      should(immutabix.getRaw).be.a.Function;
    });

    it('should have a .set function', function(){
      should(immutabix.set).be.a.Function;
    });

  });



  describe('immutabix.getRaw()', function(){

    it('should return the root immutable map', function(){

      var rawMap = immutabix.getRaw();

      should(rawMap).be.an.Object;
      should(rawMap.toString()).equal('Map {}');
    });
  });



  describe('immutabix.set(path, value)', function(){

    //  ------------------------------------------------------------------------
    it('should set a value at the given path', function(){

      var rawMap = immutabix.getRaw(),
          path   = ['foo', 'bar',' baz'];

      immutabix.set(path, 'foo-value');

      var fooValue = immutabix.getRaw().getIn(path);

      should(fooValue).equal('foo-value');
    });
    //  ------------------------------------------------------------------------
  });



  describe('immutabix.startServer(configuration)', function(){

    var configuration,
        client,
        connection,
        whenConnected;

    whenConnected = Promise.defer();

    configuration = {
      port: 44444,
      debug: true
    };

    client = new WebSocketClient();

    client
    .on('connect', function(thisConnection) {
      connection = thisConnection;
      whenConnected.resolve();
    });

    //  ------------------------------------------------------------------------
    it('should start a server with the given configuration', function(done){

      immutabix.startServer(configuration);

      client.connect('ws://localhost:44444/', 'echo-protocol');

      whenConnected
      .promise
      .then(done);
    });
    //  ------------------------------------------------------------------------

    //  ------------------------------------------------------------------------
    it( 'should listen to a set command to trigger the set function'+
        ' for a number value', function(done){

      var command,
          path,
          value;

      path = ['anotherFoo', 'anotherBar'];
      value = Math.random();

      command = {
        type: 'set',
        path: path,
        value: value
      };

      whenConnected
      .promise
      .then(function(){

        connection.sendUTF(JSON.stringify(command));

        setTimeout(function(){
          var rawMap = immutabix.getRaw();
          var fooValue = immutabix.getRaw().getIn(path);
          should(fooValue).equal(value);
          done();
        }, 20);

      });
    });
    //  ------------------------------------------------------------------------

    //  ------------------------------------------------------------------------
    it( 'should listen to a set command to trigger the set function'+
        ' for a string value', function(done){

      var command,
          path,
          value;

      path = ['anotherFoo', 'anotherBar'];
      value = '' + Math.random();

      command = {
        type: 'set',
        path: path,
        value: value
      };

      whenConnected
      .promise
      .then(function(){

        connection.sendUTF(JSON.stringify(command));

        setTimeout(function(){
          var rawMap = immutabix.getRaw();
          var fooValue = immutabix.getRaw().getIn(path);
          should(fooValue).equal(value);
          done();
        }, 20);

      });

    });
    //  ------------------------------------------------------------------------


  });



});
