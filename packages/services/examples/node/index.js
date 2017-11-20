/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, Jupyter Development Team.
|
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
'use strict';

var services = require('@jupyterlab/services');
var ws = require('ws');
var xhr = require('xmlhttprequest');


// Set the request and socket functions.
var serverSettings = services.ServerConnection.makeSettings({
  xhrFactory: function () { return new xhr.XMLHttpRequest(); },
  wsFactory: function (url, protocol) { return new ws(url, protocol); }
});

// Start a new session.

var options = {
  kernelName: 'python',
  path: 'foo.ipynb',
  serverSettings: serverSettings
}


var session;


console.log('Starting session...');
services.Session.startNew(options).then(function(s) {
  // Rename the session.
  session = s;
  return session.setPath('bar.ipynb');
}).then(function() {
  console.log('Session renamed to', session.path);
  // Execute and handle replies on the kernel.
  var future = session.kernel.requestExecute({ code: 'a = 1' });
  future.onReply = function(reply) {
    console.log('Got execute reply');
  }
  return future.done;
}).then(function() {
  console.log('Future is fulfilled');
  // Shut down the session.
  return session.shutdown();
}).then(function() {
  console.log('Session shut down');
  process.exit(0);
}).catch(function(err) {
  console.error(err);
  process.exit(1);
})

