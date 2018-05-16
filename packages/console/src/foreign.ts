// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IClientSession
} from '@jupyterlab/apputils';

import {
  Cell, CodeCell
} from '@jupyterlab/cells';

import {
  nbformat
} from '@jupyterlab/coreutils';

import {
  KernelMessage
} from '@jupyterlab/services';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  Signal
} from '@phosphor/signaling';


/**
 * A handler for capturing API messages from other sessions that should be
 * rendered in a given parent.
 */
export
class ForeignHandler implements IDisposable {
  /**
   * Construct a new foreign message handler.
   */
  constructor(options: ForeignHandler.IOptions) {
    this.session = options.session;
    this.session.iopubMessage.connect(this.onIOPubMessage, this);
    this._factory = options.cellFactory;
    this._parent = options.parent;
  }

  /**
   * Set whether the handler is able to inject foreign cells into a console.
   */
  get enabled(): boolean {
    return this._enabled;
  }
  set enabled(value: boolean) {
    this._enabled = value;
  }

  /**
   * The client session used by the foreign handler.
   */
  readonly session: IClientSession;

  /**
   * The foreign handler's parent receiver.
   */
  get parent(): ForeignHandler.IReceiver {
    return this._parent;
  }

  /**
   * Test whether the handler is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose the resources held by the handler.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._cells.clear();
    Signal.clearData(this);
  }

  /**
   * Handler IOPub messages.
   *
   * @returns `true` if the message resulted in a new cell injection or a
   * previously injected cell being updated and `false` for all other messages.
   */
  protected onIOPubMessage(sender: IClientSession, msg: KernelMessage.IIOPubMessage): boolean {
    // Only process messages if foreign cell injection is enabled.
    if (!this._enabled) {
      return false;
    }
    let kernel = this.session.kernel;
    if (!kernel) {
      return false;
    }

    // Check whether this message came from an external session.
    let parent = this._parent;
    let session = (msg.parent_header as KernelMessage.IHeader).session;
    if (session === kernel.clientId) {
      return false;
    }
    let msgType = msg.header.msg_type;
    let parentHeader = msg.parent_header as KernelMessage.IHeader;
    let parentMsgId = parentHeader.msg_id as string;
    let cell: CodeCell | undefined;
    switch (msgType) {
    case 'execute_input':
      let inputMsg = msg as KernelMessage.IExecuteInputMsg;
      cell = this._newCell(parentMsgId);
      let model = cell.model;
      model.executionCount = inputMsg.content.execution_count;
      model.value.text = inputMsg.content.code;
      model.trusted = true;
      parent.update();
      return true;
    case 'execute_result':
    case 'display_data':
    case 'stream':
    case 'error':
      if (!this._cells.has(parentMsgId)) {
        // This is an output from an input that was broadcast before our
        // session started listening. We will ignore it.
        console.warn('Ignoring output with no associated input cell.');
        return false;
      }
      let output = msg.content as nbformat.IOutput;
      cell = this._cells.get(parentMsgId);
      if (cell) {
        output.output_type = msgType as nbformat.OutputType;
        cell.model.outputs.add(output);
      }
      parent.update();
      return true;
    case 'clear_output':
      let wait = (msg as KernelMessage.IClearOutputMsg).content.wait;
      cell = this._cells.get(parentMsgId);
      if (cell) {
        cell.model.outputs.clear(wait);
      }
      return true;
    default:
      return false;
    }
  }

  /**
   * Create a new code cell for an input originated from a foreign session.
   */
  private _newCell(parentMsgId: string): CodeCell {
    let cell = this._factory();
    this._cells.set(parentMsgId, cell);
    this._parent.addCell(cell);
    return cell;
  }

  private _cells = new Map<string, CodeCell>();
  private _enabled = false;
  private _parent: ForeignHandler.IReceiver;
  private _factory: () => CodeCell;
  private _isDisposed = false;
}


/**
 * A namespace for `ForeignHandler` statics.
 */
export
namespace ForeignHandler {
  /**
   * The instantiation options for a foreign handler.
   */
  export
  interface IOptions {
    /**
     * The client session used by the foreign handler.
     */
    session: IClientSession;

    /**
     * The parent into which the handler will inject code cells.
     */
    parent: IReceiver;

    /**
     * The cell factory for foreign handlers.
     */
    cellFactory: () => CodeCell;
  }

  /**
   * A receiver of newly created foreign cells.
   */
  export
  interface IReceiver {
    /**
     * Add a newly created foreign cell.
     */
    addCell(cell: Cell): void;

    /**
     * Trigger a rendering update on the receiver.
     */
    update(): void;
  }
}
