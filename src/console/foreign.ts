// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel, KernelMessage, nbformat
} from '@jupyterlab/services';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  Panel
} from 'phosphor/lib/ui/panel';

import {
  CodeCellWidget
} from '../notebook/cells';


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
    this._renderer = options.renderer.createCell;
    this._kernel = options.kernel;
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
   * Test whether the handler is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * The kernel used by the foreign handler.
   */
  get kernel(): Kernel.IKernel {
    return this._kernel;
  }
  set kernel(value: Kernel.IKernel) {
    if (this._kernel === value) {
      return;
    }

    // Disconnect previously connected kernel.
    if (this._kernel) {
      this._cells.clear();
      this._kernel.iopubMessage.disconnect(this.onIOPubMessage, this);
    }

    this._kernel = value;
    if (this._kernel) {
      this._kernel.iopubMessage.connect(this.onIOPubMessage, this);
    }
  }

  /**
   * Dispose the resources held by the handler.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.kernel = null;
    this._cells.clear();
    this._cells = null;
  }

  /**
   * Handler IOPub messages.
   */
  protected onIOPubMessage(sender: Kernel.IKernel, msg: KernelMessage.IIOPubMessage) {
    // Only process messages if foreign cell injection is enabled.
    if (!this._enabled) {
      return;
    }
    // Check whether this message came from an external session.
    let parent = this._parent;
    let session = (msg.parent_header as KernelMessage.IHeader).session;
    if (session === this._kernel.clientId) {
      return;
    }
    let msgType = msg.header.msg_type;
    let parentHeader = msg.parent_header as KernelMessage.IHeader;
    let parentMsgId = parentHeader.msg_id as string;
    let cell: CodeCellWidget;
    switch (msgType) {
    case 'execute_input':
      let inputMsg = msg as KernelMessage.IExecuteInputMsg;
      cell = this._newCell(parentMsgId);
      cell.model.executionCount = inputMsg.content.execution_count;
      cell.model.source = inputMsg.content.code;
      cell.trusted = true;
      parent.update();
      break;
    case 'execute_result':
    case 'display_data':
    case 'stream':
    case 'error':
      if (!(parentMsgId in this._cells)) {
        // This is an output from an input that was broadcast before our
        // session started listening. We will ignore it.
        console.warn('Ignoring output with no associated input cell.');
        break;
      }
      cell = this._cells.get(parentMsgId);
      let output = msg.content as nbformat.IOutput;
      output.output_type = msgType as nbformat.OutputType;
      cell.model.outputs.add(output);
      parent.update();
      break;
    case 'clear_output':
      let wait = (msg as KernelMessage.IClearOutputMsg).content.wait;
      cell.model.outputs.clear(wait);
      break;
    default:
      break;
    }
  }

  /**
   * Create a new code cell for an input originated from a foreign session.
   */
  private _newCell(parentMsgId: string): CodeCellWidget {
    let cell = this._renderer();
    this._cells.set(parentMsgId, cell);
    this._parent.addWidget(cell);
    return cell;
  }

  private _cells = new Map<string, CodeCellWidget>();
  private _enabled = true;
  private _isDisposed = false;
  private _kernel: Kernel.IKernel = null;
  private _parent: Panel = null;
  private _renderer: () => CodeCellWidget = null;
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
     * The kernel that the handler will listen to.
     */
    kernel: Kernel.IKernel;

    /**
     * The parent into which the handler will inject code cells.
     */
    parent: Panel;

    /**
     * The renderer for creating cells to inject into the parent.
     */
    renderer: IRenderer;
  }

  /**
   * A renderer for foreign handlers.
   */
  export
  interface IRenderer {
    /**
     * Create a code cell.
     */
    createCell: () => CodeCellWidget;
  }
}
