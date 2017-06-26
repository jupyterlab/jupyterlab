/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/



/**
 *
 */
export
function execute(code: string, kernel: Kernel.IKernelConnection, outputAreaId: string, store: OutputStore): void {
  //
  store.dispatch(new BeginExecute(outputAreaId));

  //
  const future = kernel.requestExecute({ code, stop_on_error: true }, false);

  //
  future.onIOPub = msg => {
    store.dispatch(new ReceiveExecuteIOPub(outputAreaId, msg));
  };

  //
  future.onReply = msg => {
    store.dispatch(new ReceiveExecuteReply(outputAreaId, msg));
  };

  //
  future.onStdin = msg => {
    const reply = future.sendInputReply.bind(future);
    store.dispatch(new ReceiveExecuteStdin(outputAreaId, msg, reply));
  };

  //
  future.done.then(msg => {
    store.dispatch(new ReceiveExecuteDone(outputAreaId, msg));
  });
}
