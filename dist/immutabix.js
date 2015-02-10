"use strict";

var _tailCall = (function () { function Tail(func, args, context) { this.func = func; this.args = args; this.context = context; } var isRunning = false; return function (func, args, context) { var result = new Tail(func, args, context); if (!isRunning) { isRunning = true; do { result = result.func.apply(result.context, result.args); } while (result instanceof Tail); isRunning = false; } return result; }; })();

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


//  ----------------------------------------- reset ROOT
immutabix.resetRoot = function () {
  ROOT = Immutable.Map({});
};


//  ----------------------------------------- start server
immutabix.startServer = function (configuration) {
  server.start(configuration);

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

      case "ref":


        var ref = immutabix.ref(command.path);
        var msg = {
          command: "ref",
          path: command.path,
          error: true
        };

        if (ref === undefined) {
          console.log("pushing error");
          server.pushMessage(input.connectionId, msg);
        }

        break;
    }
  });
};


//  ----------------------------------------- setter
immutabix.set = function (path, value) {
  if (!Array.isArray(path)) {
    throw new TypeError(".set() expects an Array as 1st argument");
  }

  if (typeof value === "object") {
    value = Immutable.fromJS(value);
  }

  ROOT = ROOT.setIn(path, value);
};


//  ----------------------------------------- get reference
immutabix.ref = function (path) {
  if (!Array.isArray(path)) {
    throw new TypeError(".set() expects an Array as 1st argument");
  }

  if (!ROOT.hasIn(path)) {
    return undefined;
  }

  return _tailCall(ROOT.getIn, [path], ROOT);
};


module.exports = immutabix;