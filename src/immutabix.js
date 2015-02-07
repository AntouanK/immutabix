
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


immutabix.startServer = (configuration) => {

  console.log('configuration', configuration);

  server.start(configuration);
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
