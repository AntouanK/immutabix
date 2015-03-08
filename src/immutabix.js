
'use strict';

var Immutable = require('immutable'),
    server    = require('./server');

var immutabix = {},
    ROOT,
    pathConnectionMap,
    pathPreviousValueMap,
    triggerListeners,
    toKey,
    fromKey;

//  main root reference
ROOT = Immutable.Map({});

pathConnectionMap     = new Map();
pathPreviousValueMap  = new Map();

toKey = (path) => { return path.join('/'); };

fromKey = (path) => { return path.split('/'); };

/**
*                         API
* .getRaw()
* .resetRoot()
* .set(path, value)
* .ref(path, connectionId)
* .unref(path, connectionId)
* .registerOnPath(path, connectionId)
* .deregisterOnPath(path, connectionId)
* .startServer(configuration)
*
*/


//  ----------------------------------------- triggerListeners
triggerListeners = () => {

  Immutable.Seq( pathConnectionMap.entries() )
    .filter( entry => {

      var path = entry[0],
          prevVal = pathPreviousValueMap.get(path),
          currVal = ROOT.getIn( fromKey(path) ),
          areSame = Immutable.is(prevVal, currVal);

      //  if the values are NOT the same,
      if(!areSame){
        //  set the previous to see what the current does,
        //  so we don't end up triggering a change again
        pathPreviousValueMap.set(path, currVal);
      }

      return !areSame;
    })
    .forEach( entry => {

      var path = entry[0],
          connectionIds = entry[1],
      //  make the message to be pushed to the listener
          msg = {
                  command: 'ref',
                  path: path,
                  value: ROOT.getIn( fromKey(path) ).toJS()
                };

      connectionIds
      .forEach( (connectionId) => {
        server.pushMessage(connectionId, msg);
      });
    });
};


//  ----------------------------------------- getRaw
immutabix.getRaw = () => {
  return ROOT;
};


//  ----------------------------------------- resetRoot
immutabix.resetRoot = () => {
  ROOT = Immutable.Map({});
};


//  ----------------------------------------- set
immutabix.set = (path, value) => {

  if(!Array.isArray(path)){
    throw new TypeError('.set() expects an Array as 1st argument');
  }

  if(typeof value === 'object'){
    value = Immutable.fromJS(value);
  }


  //  map the previous value
  pathPreviousValueMap.set(toKey(path), ROOT.getIn(path));

  //  set the value
  ROOT = ROOT.setIn(path, value);

  //  trigger the listeners
  triggerListeners();
};


//  ----------------------------------------- ref
immutabix.ref = (path, connectionId) => {

  if(!Array.isArray(path)){
    throw new TypeError('.set() expects an Array as 1st argument');
  }

  //  when a wrong path is given, return an error message
  if( !ROOT.hasIn(path) ){

    //  make the error message
    let msg = {
                command: 'ref',
                path: path,
                error: true
              };

    server.pushMessage(connectionId, msg);
    return false;
  }

  immutabix.registerOnPath(path, connectionId);
  triggerListeners();
};


//  ----------------------------------------- unref
immutabix.unref = (path, connectionId) => {

  if(!Array.isArray(path)){
    throw new TypeError('.set() expects an Array as 1st argument');
  }

  immutabix.deregisterOnPath(path, connectionId);
};


//  ----------------------------------------- registerOnPath
immutabix.registerOnPath = (path, connectionId) => {

  if( !Array.isArray(path)){
    throw new Error('.registerOnPath(path, connectionId) needs `path` to be an Array');
  }

  if( isNaN(connectionId) ){
    throw new Error('.registerOnPath(path, connectionId) needs `connectionId` to be an Number');
  }

  if( !ROOT.hasIn(path) ){
    throw new Error(`there is nothing in path:${path}`);
  }

  //  convert the path array to a key string
  var key = toKey(path);

  //  if that key is already with one or more listeners...
  if(pathConnectionMap.has(key)){
    //  add the key in the map, pointing to the connections
    //  listening to it, merged in one array
    pathConnectionMap.set(
      key,
      pathConnectionMap.get(key).concat([connectionId])
    );
  } else {
    //  set for the 1st time the path to that connection
    pathConnectionMap.set(key, [connectionId]);
  }

};


//  ----------------------------------------- deregisterOnPath
immutabix.deregisterOnPath = (path, connectionId) => {

  if( !Array.isArray(path)){
    throw new Error('.deregisterOnPath(path, connectionId) needs `path` to be an Array');
  }

  if( isNaN(connectionId) ){
    throw new Error('.deregisterOnPath(path, connectionId) needs `connectionId` to be an Number');
  }

  //  convert the path array to a key string
  var key = toKey(path);

  //  if that key is already with one or more listeners...
  if(pathConnectionMap.has(key)){

    let connectionsArray = pathConnectionMap.get(key);
    let indexOfOurConnection = connectionsArray.indexOf(connectionId);

    //  if our connection id is in that array, remove it
    if(indexOfOurConnection > -1){

      //  remove that element
      connectionsArray.splice(indexOfOurConnection, 1);

      pathConnectionMap
      .set(
        key,
        connectionsArray
      );
    }
  }
};


//  ----------------------------------------- start server
immutabix.startServer = (configuration) => {

  server.setDebug(!!configuration.debug);

  server.startServing(configuration);

  //  when the server receives a message...
  //
  //  input : {
  //    connectionId: <number>,
  //    command: <command>
  //  }
  server.onMessage((input) => {

    if(input.command === undefined){
      return false;
    }

    //  break down the incoming data
    var command = input.command;

    switch(command.type){

      case 'set':
        immutabix.set(command.path, command.value);
        break;

      case 'unref':
        immutabix.unref(command.path, input.connectionId);
        break;

      case 'ref':
        //  go on with the referencing
        immutabix.ref(command.path, input.connectionId);

        break;
    }

  });
};


//  ===========================================================   export
module.exports = immutabix;
