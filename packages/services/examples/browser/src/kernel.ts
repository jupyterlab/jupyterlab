// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { KernelAPI, KernelManager, KernelMessage } from '@jupyterlab/services';

import { log } from './log';

export async function main() {
  // Start a python kernel
  let kernelManager = new KernelManager();
  let kernel = await kernelManager.startNew({ name: 'python' });

  // Register a callback for when the kernel changes state.
  kernel.statusChanged.connect((_, status) => {
    log(`Status: ${status}`);
  });

  log('Executing code');
  let future = kernel.requestExecute({ code: 'a = 1' });
  // Handle iopub messages
  future.onIOPub = msg => {
    if (msg.header.msg_type !== 'status') {
      log(msg.content);
    }
  };
  await future.done;
  log('Execution is done');

  log('Send an inspect message');
  let request: KernelMessage.IInspectRequestMsg['content'] = {
    code: 'hello',
    cursor_pos: 4,
    detail_level: 0
  };
  let inspectReply = await kernel.requestInspect(request);
  log('Looking at reply');
  if (inspectReply.content.status === 'ok') {
    log('Inspect reply:');
    log(inspectReply.content.data);
  }

  log('Interrupting the kernel');
  await kernel.interrupt();

  log('Send an completion message');
  let reply = await kernel.requestComplete({ code: 'impor', cursor_pos: 4 });
  if (reply.content.status === 'ok') {
    log(reply.content.matches);
  }

  log('Restarting kernel');
  await kernel.restart();

  log('Shutting down kernel');
  await kernel.shutdown();

  log('Finding all existing kernels');
  let kernelModels = await KernelAPI.listRunning();
  log(kernelModels);
  if (kernelModels.length > 0) {
    log(`Connecting to ${kernelModels[0].name}`);
    kernelManager.connectTo({ model: kernelModels[0] });
  }
}
