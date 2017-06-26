/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  Action
} from '@phosphor/datastore';



/**
 *
 */
export
class BeginExecute extends Action<'@jupyterlab/outputarea/BEGIN_EXECUTE'> {
  /**
   *
   */
  constructor(outputAreaId: string) {
    super('@jupyterlab/outputarea/BEGIN_EXECUTE');
    this.outputAreaId = outputAreaId;
  }

  /**
   *
   */
  readonly outputAreaId: string;
}


/**
 *
 */
export
class ReceiveExecuteIOPub extends Action<'@jupyterlab/outputarea/RECEIVE_EXECUTE_IOPUB'> {
  /**
   *
   */
  constructor(outputAreaId: string, msg: KernelMessage.IIOPubMessage) {
    super('@jupyterlab/outputarea/RECEIVE_EXECUTE_IOPUB');
    this.outputAreaId = outputAreaId;
    this.msg = msg;
  }

  /**
   *
   */
  readonly outputAreaId: string;

  /**
   *
   */
  readonly msg: KernelMessage.IIOPubMessage;
}


/**
 *
 */
export
class ReceiveExecuteReply extends Action<'@jupyterlab/outputarea/RECEIVE_EXECUTE_REPLY'> {
  /**
   *
   */
  constructor(outputAreaId: string, msg: KernelMessage.IExecuteReplyMsg) {
    super('@jupyterlab/outputarea/RECEIVE_EXECUTE_REPLY');
    this.outputAreaId = outputAreaId;
    this.msg = msg;
  }

  /**
   *
   */
  readonly outputAreaId: string;

  /**
   *
   */
  readonly msg: KernelMessage.IExecuteReplyMsg;
}


/**
 *
 */
export
class ReceiveExecuteStdin extends Action<'@jupyterlab/outputarea/RECEIVE_EXECUTE_STDIN'> {
  /**
   *
   */
  constructor(outputAreaId: string, msg: KernelMessage.IStdinMessage, reply: (content: KernelMessage.IInputReply) => void) {
    super('@jupyterlab/outputarea/RECEIVE_EXECUTE_STDIN');
    this.outputAreaId = outputAreaId;
    this.msg = msg;
    this.reply = reply;
  }

  /**
   *
   */
  readonly outputAreaId: string;

  /**
   *
   */
  readonly msg: KernelMessage.IStdinMessage;

  /**
   *
   */
  readonly reply: (content: KernelMessage.IInputReply) => void;
}


/**
 *
 */
export
class ReceiveExecuteDone extends Action<'@jupyterlab/outputarea/RECEIVE_EXECUTE_DONE'> {
  /**
   *
   */
  constructor(outputAreaId: string, msg: KernelMessage.IShellMessage) {
    super('@jupyterlab/outputarea/RECEIVE_EXECUTE_DONE');
    this.outputAreaId = outputAreaId;
    this.msg = msg;
  }

  /**
   *
   */
  readonly outputAreaId: string;

  /**
   *
   */
  readonly msg: KernelMessage.IShellMessage;
}


/**
 *
 */
export
type Actions = (
  BeginExecute |
  ReceiveExecuteIOPub |
  ReceiveExecuteReply |
  ReceiveExecuteStdin |
  ReceiveExecuteDone
);
