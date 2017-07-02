/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  nbformat
} from '@jupyterlab/coreutils';

import {
  Kernel, KernelMessage
} from '@jupyterlab/services';

import {
  ArrayExt
} from '@phosphor/algorithm';

import {
  AppendOutputAction, ClearOutputsAction
} from './actions';

import {
  OutputStore
} from './models';


/**
 * Execute code for an output area.
 *
 * @param code - The code to execute.
 *
 * @param kernel - The kernel to use for execution.
 *
 * @param outputAreaId - The id of the output area.
 *
 * @param store - The output data store to update with execution.
 *
 * @returns The kernel future for the execution request.
 *
 * #### Notes
 * This function handles the iopub, reply, and stdin messages for
 * the request. The caller should not handle those messages.
 *
 * The caller will typically be responsible for:
 *   - Disposing of the future and clearing the output before
 *     executing more code for the same output area.
 *   - Using the `done` promise to perform any cleanup after
 *     the execution is "finished".
 */
export
function execute(code: string, kernel: Kernel.IKernelConnection, outputAreaId: string, store: OutputStore): Kernel.IFuture {
  // Request execution from the kernel.
  const future = kernel.requestExecute({ code, stop_on_error: true }, false);

  // Set up the future handlers.
  future.onIOPub = onIOPub;
  future.onReply = onReply;
  future.onStdin = onStdin;

  // Return the future.
  return future;

  function onIOPub(msg: KernelMessage.IIOPubMessage): void {
    // Get the message type from the header.
    let mt = msg.header.msg_type;

    // Handle the simplest messages first.
    switch (mt) {
    case 'error':
    case 'stream':
    case 'display_data':
    case 'execute_result':
    case 'update_display_data':
      let output = { output_type: mt, ...msg.content };
      let action = new AppendOutputAction(outputAreaId, output);
      store.dispatch(action);
      return;
    }

    // Handle a clear output message.
    if (KernelMessage.isClearOutputMsg(msg)) {
      let action = new ClearOutputsAction(outputAreaId, msg.content.wait);
      store.dispatch(action);
      return;
    }
  }

  function onReply(msg: KernelMessage.IExecuteReplyMsg): void {
    // Ignore `error` and `abort` replies.
    if (msg.content.status !== 'ok') {
      return;
    }

    // Extract the payload from the message.
    let payload = (msg.content as KernelMessage.IExecuteOkReply).payload;

    // Bail early if there is no payload.
    if (!payload || payload.length === 0) {
      return;
    }

    // Find the first page in the payload.
    let page = ArrayExt.findFirstValue(
      payload, item => item.source === 'page'
    );

    // Bail if there is no pager output.
    if (!page) {
      return;
    }

    // Extract the mime data bundle from the page.
    let data = page.data as nbformat.IMimeBundle;

    // Create the action to add the output.
    let action = new AppendOutputAction(outputAreaId, {
      output_type: 'display_data', data, metadata: {}
    });

    // Dispatch the action to the store.
    store.dispatch(action);
  }

  function onStdin(msg: KernelMessage.IStdinMessage): void {
    // if (KernelMessage.isInputRequestMsg(msg)) {
    //   this._onInputRequest(msg, value);
    // }
  }
}
