/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, Jupyter Development Team.
|
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
'use strict';

// Polyfill for ES6 Promises
import 'es6-promise';

import {
  Session, utils
} from '@jupyterlab/services';


function log(text: string): void {
  let el = document.getElementById('output');
  el.textContent = el.textContent + '\n' + text;
  console.log(text);
}

function main() {
  // Start a new session.
  let options: Session.IOptions = {
    kernelName: 'python',
    path: 'foo.ipynb'
  };
  let session: Session.ISession;

  log('Starting session');
  Session.startNew(options).then(s => {
    log('Session started');
    session = s;
    // Rename the session.
    return session.rename('bar.ipynb');
  }).then(() => {
    log(`Session renamed to ${session.path}`);
    // Execute and handle replies on the kernel.
    let future = session.kernel.requestExecute({ code: 'a = 1' });
    future.onReply = (reply) => {
      log('Got execute reply');
    };
    future.onDone = () => {
      log('Future is fulfilled');
      // Shut down the session.
      session.shutdown().then(() => {
        log('Session shut down');
        log('Test Complete!');
      });
    };
  }).catch(err => {
    console.error(err);
    log('Test Failed! See the console output for details');
  });
}

window.onload = main;
