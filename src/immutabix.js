
var Immutable = require('immutable'),
    server    = require('./server'),
    immutabix = {},
    ROOT,
    pathConnectionMap,
    pathValueMap,
    pathPreviousValueMap,
    triggerListeners;

//  main root reference
ROOT = Immutable.Map({});

pathConnectionMap     = new Map();
pathValueMap          = new Map();
pathPreviousValueMap  = new Map();

//  ----------------------------------------- triggerListeners
triggerListeners = () => {

  Immutable.Seq( pathConnectionMap.entries() )
    .filter( entry => {

      let path = entry[0];

      return pathPreviousValueMap.get(path) !== pathValueMap.get(path);
    })
    .forEach( entry => {

      let path = entry[1];
      let connectionId = entry[0];
      //  make the message to be pushed to the listener
      let msg = {
                  command: 'ref',
                  path: path,
                  value: pathValueMap.get(path)
                };

      server
      .pushMessage(connectionId, msg);

    });

};


//  ----------------------------------------- get raw
immutabix.getRaw = () => {
  return ROOT;
};


//  ----------------------------------------- reset ROOT
immutabix.resetRoot = () => {
  ROOT = Immutable.Map({});
};


//  ----------------------------------------- setter
immutabix.set = (path, value) => {

  if(!Array.isArray(path)){
    throw new TypeError('.set() expects an Array as 1st argument');
  }

  if(typeof value === 'object'){
    value = Immutable.fromJS(value);
  }


  //  map the previous value
  pathPreviousValueMap.set(path, value);

  //  set the value
  ROOT = ROOT.setIn(path, value);

  //  map the current value
  pathValueMap.set(path, value);

  //  trigger the listeners
  triggerListeners(pathConnectionMap, pathValueMap);
};


//  ----------------------------------------- get reference
immutabix.ref = (path) => {

  if(!Array.isArray(path)){
    throw new TypeError('.set() expects an Array as 1st argument');
  }

  if(!ROOT.hasIn(path)){
    return undefined;
  }

  return ROOT.getIn(path);
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

  var key = path.join('/');

  if(pathConnectionMap.has(key)){
    pathConnectionMap.set(
      key,
      pathConnectionMap.get(key).concat([connectionId])
    );
  } else {
    //  set for the 1st time the path to that connection
    pathConnectionMap.set(key, [connectionId]);
    //  set for the 1st time, the path to it's value reference
    pathValueMap.set(key, ROOT.getIn(path));
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

  //  TODO <<<<-------------
};



//  ----------------------------------------- start server
immutabix.startServer = (configuration) => {

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

      case 'ref':

        if( !ROOT.hasIn(command.path) ){

          //  make the error message
          let msg = {
                      command: 'ref',
                      path: command.path,
                      error: true
                    };

          server
          .pushMessage(input.connectionId, msg);
        }

        let ref = immutabix.ref(command.path);

        break;
    }

  });
};


//  ===========================================================   export
module.exports = immutabix;
