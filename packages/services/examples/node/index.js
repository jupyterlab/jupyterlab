/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, Jupyter Development Team.
|
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
'use strict';

var services = require('@jupyterlab/services');
var ws = require('ws');
var xhr = require('xmlhttprequest');


// Override the global request and socket functions.
global.XMLHttpRequest = xhr.XMLHttpRequest;
global.WebSocket = ws;


// Start a new session.
var options = {
  kernelName: 'python',
  path: 'foo.ipynb'
}


var session;


services.Session.startNew(options).then(function(s) {
  // Rename the session.
  session = s;
  return session.rename('bar.ipynb');
}).then(function() {
  console.log('Session renamed to', session.path);
  // Execute and handle replies on the kernel.
  var future = session.kernel.requestExecute({ code: 'a = 1' });
  future.onReply = function(reply) {
    console.log('Got execute reply');
  }
  future.onDone = function() {
    console.log('Future is fulfilled');
    // Shut down the session.
    session.shutdown().then(function() {
      console.log('Session shut down');
      process.exit(0);
    });
  };
}).catch(function(err) {
  console.error(err);
  process.exit(1);
})

