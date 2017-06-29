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
  AppendOutputAction
} from './actions';

import {
  OutputArea, OutputStore
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

  function getArea(): OutputArea | null {
    // Fetch the area from the data store.
    let area = store.state.outputAreaTable[outputAreaId] || null;

    // If the area has been deleted, dispose the future.
    if (!area) {
      future.dispose();
    }

    // Return the area.
    return area;
  }

  function onIOPub(msg: KernelMessage.IIOPubMessage): void {

  }

  function onReply(msg: KernelMessage.IExecuteReplyMsg): void {
    // Bail if the output area has been deleted.
    if (!getArea()) {
      return;
    }

    // Ignore `error` and `abort` replies.
    if (msg.content.status !== 'okay') {
      return;
    }

    // Extract the payload from the message.
    let payload = (msg.content as KernelMessage.IExecuteOkReply).payload;

    // Bail early if there is no payload.
    if (!payload || payload.length === 0) {
      return;
    }

    // Find the first page in the payload.
    let page = payload.find(item => item.source === 'page');

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

  function onStdin(msg: msg: KernelMessage.IStdinMessage): void {
    // if (KernelMessage.isInputRequestMsg(msg)) {
    //   this._onInputRequest(msg, value);
    // }
  }
}
