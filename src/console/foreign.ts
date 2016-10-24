import {
  Kernel, KernelMessage
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

import {
  nbformat
} from '../notebook/notebook/nbformat';


export
class ForeignHandler implements IDisposable {
  constructor(options: ForeignHandler.IOptions) {
    this._cellRenderer = options.renderer.createCell;
    this._kernel = options.kernel;
    this._parent = options.parent;
  }

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
      this._kernel.iopubMessage.disconnect(this.onIOPubMessage, this);
    }

    this._kernel = value;
    if (this._kernel) {
      this._kernel.iopubMessage.connect(this.onIOPubMessage, this);
    }
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.kernel = null;
    this._cells = null;
  }

  /**
   * Make a new code cell for an input originated from a foreign session.
   */
  protected newCell(parentMsgId: string): CodeCellWidget {
    let cell = this._cellRenderer();
    this._cells[parentMsgId] = cell;
    this._parent.addWidget(cell);
    return;
  }

  protected onIOPubMessage(sender: Kernel.IKernel, msg: KernelMessage.IIOPubMessage) {
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
      cell = this.newCell(parentMsgId);
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
      cell = this._cells[parentMsgId];
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

  private _cells: { [key: string]: CodeCellWidget } = Object.create(null);
  private _cellRenderer: () => CodeCellWidget = null;
  private _isDisposed = false;
  private _kernel: Kernel.IKernel = null;
  private _parent: Panel = null;
}


export
namespace ForeignHandler {
  export
  interface IOptions {
    kernel: Kernel.IKernel;
    parent: Panel;
    renderer: IRenderer;
  }

  export
  interface IRenderer {
    createCell: () => CodeCellWidget;
  }
}
