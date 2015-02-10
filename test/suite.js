

var should            = require('should'),
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

    it('should have a .resetRoot function', function(){
      should(immutabix.resetRoot).be.a.Function;
    });

  });



  describe('immutabix.getRaw()', function(){

    //  ------------------------------------------------------------------------
    it('should return the root immutable map', function(){

      var rawMap = immutabix.getRaw();

      should(rawMap).be.an.Object;
      should(rawMap.toString()).equal('Map {}');
    });
    //  ------------------------------------------------------------------------
  });



  describe('immutabix.resetRoot()', function(){

    //  ------------------------------------------------------------------------
    it('should reset the root immutable map', function(){

      var rawMap = immutabix.getRaw(),
          path   = ['foo', 'bar',' baz'],
          fooValue;

      immutabix.set(path, 'foo-value');
      fooValue = immutabix.getRaw().getIn(path);
      should(fooValue).equal('foo-value');

      immutabix.resetRoot();
      //  get again the root
      fooValue = immutabix.getRaw().getIn(path);
      should(fooValue).not.equal('foo-value');

    });
    //  ------------------------------------------------------------------------
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
        whenConnected,
        immuServer,
        resolveConnection;

    whenConnected = Promise.defer();

    configuration = {
      port: 44444,
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

      client.connect('ws://localhost:44444/', 'echo-protocol');

      whenConnected
      .promise
      .then(done);
    });
    //  ------------------------------------------------------------------------

    //  ------------------------------------------------------------------------
    it( 'should listen to a set command to trigger the set function', function(done){

      console.log('---- starting test for `set` command');
      var command,
          path,
          value;

      path = ['aList', 1, 'title'];
      value = Math.random();

      command = {
        type: 'set',
        path: ['aList'],
        value: [{ title: 'thing0' }, { bla: 'bla' }]
      };

      whenConnected
      .promise
      .then(function(){

        connection.sendUTF(JSON.stringify(command));

        setTimeout(function(){
          var rawMap = immutabix.getRaw();
          var fooValue = immutabix.getRaw().getIn(path);
          should(fooValue).not.exist;

          //  send 2nd command
          command = {
            type: 'set',
            path: ['aList'],
            value: [{ title: 'thing0' }, { title: 'thing1'}, { title: 'thing2'}]
          };

          connection.sendUTF(JSON.stringify(command));

        }, 20);

        setTimeout(function(){

          var rawMap = immutabix.getRaw();
          var valueGiven = rawMap.getIn(path);
          valueGiven.should.equal('thing1');

          console.log('---- end test for `set` command');
          done();
        }, 40);

      });
    });
    //  ------------------------------------------------------------------------


    //  ------------------------------------------------------------------------
    it( 'should listen to a ref command and return error '+
        'with a wrong path', function(done){

      console.log('---- starting test for `ref` command with error');
      var command,
          path,
          value;

      path = ['events', 'list', '1'];

      command = {
        type: 'ref',
        path: path
      };

      whenConnected
      .promise
      .then(function(){

        var onMessage = function(message) {

          var messageObj = JSON.parse(message.utf8Data);

          should(messageObj.command).equal('ref');
          should(messageObj.path).be.an.Array;
          should(messageObj.path[0]).equal(path[0]);
          should(messageObj.error).be.True;

          connection.removeListener('message', onMessage);

          console.log('---- ending test for `ref` command with error');
          done();
        };

        connection.on('message', onMessage);

        connection.sendUTF(JSON.stringify(command));
      });
    });
    //  ------------------------------------------------------------------------


    //  ------------------------------------------------------------------------
    it( 'should listen to a ref command and return the ref', function(done){

      console.log('---- starting test for `ref` command with changes');
      var command,
          path,
          value,
          count = 0;

      path = ['events', 'list', '1'];

      whenConnected
      .promise
      .then(function(){

        var onMessage = function(message) {

          count += 1;

          if(count === 3){
            var objMessage = JSON.parse(message.utf8Data).value;
            should(objMessage).have.a.property('test', 'haha');
            connection.removeListener('message', onMessage);
            console.log('---- ending test for `ref` command with changes');
            done();
          }
        };

        connection.on('message', onMessage);

        connection.sendUTF(JSON.stringify(command));
      });

      immutabix.set(path, {
        id: 1,
        list: ['foo', 'bar'],
        time: Date.now()
      });

      setTimeout(function(){
        immutabix.set(path, {
          id: 1,
          list: null,
          time: Date.now()
        });
      }, 10);

      setTimeout(function(){
        immutabix.set(path, {
          id: 1,
          test: 'haha',
          list: null,
          time: Date.now()
        });
      }, 10);

      command = {
        type: 'ref',
        path: path
      };

    });
    //  ------------------------------------------------------------------------



  });

});
