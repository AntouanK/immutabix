
var Immutable = require('immutable'),
    server    = require('./server'),
    immutabix = {},
    ROOT;

//  main root reference
ROOT = Immutable.Map({});


//  ----------------------------------------- get raw
immutabix.getRaw = () => {
  return ROOT;
};


//  ----------------------------------------- reset ROOT
immutabix.resetRoot = () => {
  ROOT = Immutable.Map({});
};


//  ----------------------------------------- start server
immutabix.startServer = (configuration) => {

  server.start(configuration);

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

        let ref = immutabix.ref(command.path);
        let msg = {
                    command: 'ref',
                    path: command.path,
                    error: true
                  };

        if(ref === undefined){
          console.log('pushing error')
          server
          .pushMessage(input.connectionId, msg);
        }

        break;
    }

  });
};


//  ----------------------------------------- setter
immutabix.set = (path, value) => {

  if(!Array.isArray(path)){
    throw new TypeError('.set() expects an Array as 1st argument');
  }

  if(typeof value === 'object'){
    value = Immutable.fromJS(value);
  }

  ROOT = ROOT.setIn(path, value);
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


module.exports = immutabix;
