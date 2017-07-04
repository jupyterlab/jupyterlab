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
  find
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
 * @param options - The execution options.
 *
 * @returns The kernel future for the execution request.
 *
 * #### Notes
 * This function handles the `IOPub` and `Reply` messages for the
 * request. The caller should not handle those messages.
 *
 * The caller is responsible for:
 *   - Disposing of the future if the output area is deleted.
 *   - Disposing of the future and clearing the output before
 *     executing more code for the same output area.
 *   - Using the `done` promise to perform any cleanup after
 *     the execution is "finished".
 *   - Handling `Stdin` messages.
 */
export
function execute(options: execute.IOptions): Kernel.IFuture {
  // Unpack the options.
  const { kernel, content, areaId, store } = options;

  // Request execution from the kernel.
  const future = kernel.requestExecute(content, false);

  // Set up the future handlers.
  future.onIOPub = onIOPub;
  future.onReply = onReply;

  // Return the future.
  return future;

  function onIOPub(msg: KernelMessage.IIOPubMessage): void {
    // Get the message type from the header.
    let mt = msg.header.msg_type;

    // Handle message which append an output.
    switch (mt) {
    case 'error':
    case 'stream':
    case 'display_data':
    case 'execute_result':
    case 'update_display_data':
      let output = { output_type: mt, ...msg.content };
      store.dispatch(new AppendOutputAction(areaId, output));
      return;
    }

    // Handle a clear output message.
    if (KernelMessage.isClearOutputMsg(msg)) {
      store.dispatch(new ClearOutputsAction(areaId, msg.content.wait));
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
    let page = find(payload, p => p.source === 'page');

    // Bail if there is no pager output.
    if (!page) {
      return;
    }

    // Extract the mime data bundle from the page.
    let data = page.data as nbformat.IMimeBundle;

    // Create the action to add the output.
    let action = new AppendOutputAction(areaId, {
      output_type: 'display_data', data, metadata: {}
    });

    // Dispatch the action to the store.
    store.dispatch(action);
  }
}


/**
 * The namespace for the `execute` function statics.
 */
export
namespace execute {
  /**
   * The options for the `execute` function.
   */
  export
  interface IOptions {
    /**
     * The kernel to use for execution.
     */
    kernel: Kernel.IKernelConnection;

    /**
     * The content for the execute request.
     */
    content: KernelMessage.IExecuteRequest;

    /**
     * The output data store to update with execution.
     */
    store: OutputStore;

    /**
     * The id of the output area to update in the store.
     */
    areaId: string;
  }
}
