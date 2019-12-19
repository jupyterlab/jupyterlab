/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, Jupyter Development Team.
|
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
'use strict';

var services = require('@jupyterlab/services');

// Start a new session.
var options = {
  path: 'foo.ipynb',
  type: 'notebook',
  name: 'foo.ipynb',
  kernel: {
    name: 'python'
  }
};

/* eslint-disable no-console */
console.log('Starting session...');
var kernelManager = new services.KernelManager();
var sessionManager = new services.SessionManager({ kernelManager });
var session;
sessionManager
  .startNew(options)
  .then(function(s) {
    // Rename the session.
    session = s;
    return session.setPath('bar.ipynb');
  })
  .then(function() {
    console.log('Session renamed to', session.path);
    // Execute and handle replies on the kernel.
    var future = session.kernel.requestExecute({ code: 'a = 1' });
    future.onReply = function(reply) {
      console.log('Got execute reply', reply);
    };
    return future.done;
  })
  .then(function() {
    console.log('Future is fulfilled');
    // Shut down the session.
    return session.shutdown();
  })
  .then(function() {
    console.log('Session shut down');
    process.exit(0);
  })
  .catch(function(err) {
    console.error(err);
    process.exit(1);
  });
