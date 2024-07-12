// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { KernelManager } from '@jupyterlab/services';
import { PromiseDelegate } from '@lumino/coreutils';

import { log } from './log';

export async function main(): Promise<void> {
  // Start a python kernel
  const kernelManager = new KernelManager();
  const kernel = await kernelManager.startNew({ name: 'python' });

  log('Register a comm target in the kernel');
  await kernel.requestExecute({
    code: `
kernel = get_ipython().kernel
comm = None
def comm_opened(comm, msg):
    comm = comm
kernel.comm_manager.register_target('test', comm_opened)
`
  }).done;

  log('Create a comm');
  const comm = kernel.createComm('test');

  log('Open the comm');
  await comm.open('initial state').done;
  log('Send a test message');
  await comm.send('test').done;
  log('Close the comm');
  await comm.close('bye').done;

  log('Register a comm target in the browser');
  const done = new PromiseDelegate();
  kernel.registerCommTarget('test2', (comm, commMsg) => {
    if (commMsg.content.target_name !== 'test2') {
      return;
    }
    comm.onMsg = msg => {
      log(msg.content.data);
    };
    comm.onClose = msg => {
      log(msg.content.data);
      done.resolve(undefined);
    };
  });

  log('Create a corresponding comm from the kernel');
  const code = `
from ipykernel.comm import Comm
comm = Comm(target_name="test2")
comm.send(data="comm sent message")
comm.close(data="closing comm")
`;
  await kernel.requestExecute({ code: code }).done;

  // Wait for the comm to be closed on our side
  await done.promise;
}
