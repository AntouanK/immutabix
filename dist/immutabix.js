"use strict";

var Immutable = require("immutable"),
    server = require("./server"),
    immutabix = {},
    ROOT;

//  main root reference
ROOT = Immutable.Map({});


//  ----------------------------------------- get raw
immutabix.getRaw = function () {
  return ROOT;
};


immutabix.startServer = function (configuration) {
  console.log("configuration", configuration);

  server.start(configuration);
};


//  ----------------------------------------- setter
immutabix.set = function (path, value) {
  if (!Array.isArray(path)) {
    throw new TypeError(".set() expects an Array as 1st argument");
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