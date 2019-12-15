/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, Jupyter Development Team.
|
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { PageConfig, URLExt } from '@jupyterlab/coreutils';
// @ts-ignore
__webpack_public_path__ = URLExt.join(PageConfig.getBaseUrl(), 'example/');

import { Session, KernelManager, SessionManager } from '@jupyterlab/services';

function log(text: string): void {
  let el = document.getElementById('output');
  el.textContent = el.textContent + '\n' + text;
  console.log(text);
}

async function main() {
  let kernelManager = new KernelManager();
  let sessionManager = new SessionManager({ kernelManager });

  // Start a new session.
  let options: Session.IRequest = {
    kernel: {
      name: 'python'
    },
    path: 'foo.ipynb',
    type: 'notebook',
    name: 'foo.ipynb'
  };

  try {
    log('Starting session');
    const sessionConnection = await sessionManager.startNew(options);
    log('Session started');
    await sessionConnection.setPath('bar.ipynb');
    log(`Session renamed to ${sessionConnection.path}`);
    let future = sessionConnection.kernel.requestExecute({ code: 'a = 1' });
    future.onReply = reply => {
      log('Got execute reply');
    };
    await future.done;
    log('Future is fulfilled');
    // Shut down the session.
    await sessionConnection.shutdown();
    log('Session shut down');
    log('Test Complete!');
  } catch (err) {
    console.error(err);
    log('Test Failed! See the console output for details');
  }
}

window.onload = main;
