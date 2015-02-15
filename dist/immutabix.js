
"use strict";

var Immutable = require("immutable"),
    server = require("./server");

var immutabix = {},
    ROOT,
    pathConnectionMap,
    pathValueMap,
    pathPreviousValueMap,
    triggerListeners,
    toKey;

//  main root reference
ROOT = Immutable.Map({});

pathConnectionMap = new Map();
pathValueMap = new Map();
pathPreviousValueMap = new Map();

toKey = function (path) {
  return path.join("/");
};


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
triggerListeners = function () {
  Immutable.Seq(pathConnectionMap.entries()).filter(function (entry) {
    var path = entry[0],
        prevVal = pathPreviousValueMap.get(path),
        currVal = pathValueMap.get(path);

    return !Immutable.is(prevVal, currVal);
  }).forEach(function (entry) {
    var path = entry[0],
        connectionIds = entry[1],

    //  make the message to be pushed to the listener
    msg = {
      command: "ref",
      path: path,
      value: pathValueMap.get(path)
    };

    connectionIds.forEach(function (connectionId) {
      server.pushMessage(connectionId, msg);
    });
  });
};


//  ----------------------------------------- getRaw
immutabix.getRaw = function () {
  return ROOT;
};


//  ----------------------------------------- resetRoot
immutabix.resetRoot = function () {
  ROOT = Immutable.Map({});
};


//  ----------------------------------------- set
immutabix.set = function (path, value) {
  if (!Array.isArray(path)) {
    throw new TypeError(".set() expects an Array as 1st argument");
  }

  if (typeof value === "object") {
    value = Immutable.fromJS(value);
  }


  //  map the previous value
  pathPreviousValueMap.set(toKey(path), pathValueMap.get(toKey(path)));

  //  set the value
  ROOT = ROOT.setIn(path, value);

  //  map the current value
  pathValueMap.set(toKey(path), value);

  //  trigger the listeners
  triggerListeners();
};


//  ----------------------------------------- ref
immutabix.ref = function (path, connectionId) {
  if (!Array.isArray(path)) {
    throw new TypeError(".set() expects an Array as 1st argument");
  }

  if (!ROOT.hasIn(path)) {
    return undefined;
  }

  immutabix.registerOnPath(path, connectionId);
  triggerListeners();
};


//  ----------------------------------------- unref
immutabix.unref = function (path, connectionId) {
  if (!Array.isArray(path)) {
    throw new TypeError(".set() expects an Array as 1st argument");
  }

  immutabix.deregisterOnPath(path, connectionId);
};


//  ----------------------------------------- registerOnPath
immutabix.registerOnPath = function (path, connectionId) {
  if (!Array.isArray(path)) {
    throw new Error(".registerOnPath(path, connectionId) needs `path` to be an Array");
  }

  if (isNaN(connectionId)) {
    throw new Error(".registerOnPath(path, connectionId) needs `connectionId` to be an Number");
  }

  if (!ROOT.hasIn(path)) {
    throw new Error(`there is nothing in path:${ path }`);
  }

  //  convert the path array to a key string
  var key = toKey(path);

  //  if that key is already with one or more listeners...
  if (pathConnectionMap.has(key)) {
    //  add the key in the map, pointing to the connections
    //  listening to it, merged in one array
    pathConnectionMap.set(key, pathConnectionMap.get(key).concat([connectionId]));
  } else {
    //  set for the 1st time the path to that connection
    pathConnectionMap.set(key, [connectionId]);
    //  set for the 1st time, the path to it's value reference
    pathValueMap.set(key, ROOT.getIn(path));
  }
};


//  ----------------------------------------- deregisterOnPath
immutabix.deregisterOnPath = function (path, connectionId) {
  if (!Array.isArray(path)) {
    throw new Error(".deregisterOnPath(path, connectionId) needs `path` to be an Array");
  }

  if (isNaN(connectionId)) {
    throw new Error(".deregisterOnPath(path, connectionId) needs `connectionId` to be an Number");
  }

  //  convert the path array to a key string
  var key = toKey(path);

  //  if that key is already with one or more listeners...
  if (pathConnectionMap.has(key)) {
    var connectionsArray = pathConnectionMap.get(key);
    var indexOfOurConnection = connectionsArray.indexOf(connectionId);

    //  if our connection id is in that array, remove it
    if (indexOfOurConnection > -1) {
      //  remove that element
      connectionsArray.splice(indexOfOurConnection, 1);

      pathConnectionMap.set(key, connectionsArray);
    }
  }
};


//  ----------------------------------------- start server
immutabix.startServer = function (configuration) {
  server.setDebug(!!configuration.debug);

  server.startServing(configuration);

  //  when the server receives a message...
  //
  //  input : {
  //    connectionId: <number>,
  //    command: <command>
  //  }
  server.onMessage(function (input) {
    if (input.command === undefined) {
      return false;
    }

    //  break down the incoming data
    var command = input.command;

    switch (command.type) {

      case "set":
        immutabix.set(command.path, command.value);
        break;

      case "unref":
        immutabix.unref(command.path, input.connectionId);
        break;

      case "ref":
        //  when a wrong path is given, return an error message
        if (!ROOT.hasIn(command.path)) {
          //  make the error message
          var msg = {
            command: "ref",
            path: command.path,
            error: true
          };

          server.pushMessage(input.connectionId, msg);
        }

        //  go on with the referencing
        immutabix.ref(command.path, input.connectionId);

        break;
    }
  });
};


//  ===========================================================   export
module.exports = immutabix;
//# sourceMappingURL=immutabix.js.map