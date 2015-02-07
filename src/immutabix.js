
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


immutabix.resetRoot = () => {
  ROOT = Immutable.Map({});
};


immutabix.startServer = (configuration) => {

  console.log('configuration', configuration);

  server.start(configuration);

  server.onMessage((message) => {

    var command;

    try {
      command = JSON.parse(message);
    } catch(err) {
      throw new Error('message is not JSON!');
    }

    switch(command.type){

      case 'set':
        immutabix.set(command.path, command.value);
        break;
    }

  });
};





//  ----------------------------------------- setter
immutabix.set = (path, value) => {

  if(!Array.isArray(path)){
    throw new TypeError('.set() expects an Array as 1st argument');
  }

  ROOT = ROOT.setIn(path, value);
};


//  ----------------------------------------- get reference
// immutabix.ref = (path) => {
//
//   if(!Array.isArray(path)){
//     throw new TypeError('.set() expects an Array as 1st argument');
//   }
// };


module.exports = immutabix;
