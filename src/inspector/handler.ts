// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel, KernelMessage
} from 'jupyter-js-services';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  ISignal, Signal, clearSignalData
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';

import {
  Inspector
} from './';

import {
  BaseCellWidget
} from '../notebook/cells/widget';

import {
  CellEditorWidget, ITextChange
} from '../notebook/cells/editor';

import {
  RenderMime, MimeMap
} from '../rendermime';

export
class InspectionHandler implements IDisposable, Inspector.IInspectable {
  /**
   * Construct a new inspection handler for a widget.
   */
  constructor(rendermime: RenderMime<Widget>) {
    this._rendermime = rendermime;
  }

  /**
   * The cell widget used by the completion handler.
   */
  get activeCell(): BaseCellWidget {
    return this._activeCell;
  }
  set activeCell(newValue: BaseCellWidget) {
    if (newValue === this._activeCell) {
      return;
    }

    if (this._activeCell && !this._activeCell.isDisposed) {
      this._activeCell.editor.textChanged.disconnect(this.onTextChanged, this);
    }
    this._activeCell = newValue;
    if (this._activeCell) {
      // Clear ephemeral inspectors in preparation for a new editor.
      this.clearEphemeral.emit(void 0);
      this._activeCell.editor.textChanged.connect(this.onTextChanged, this);
    }
  }

  /**
   * The kernel used by the inspection handler.
   */
  get kernel(): IKernel {
    return this._kernel;
  }
  set kernel(value: IKernel) {
    this._kernel = value;
  }

  /**
   * A signal emitted when inspector should clear all items with no history.
   */
  get clearEphemeral(): ISignal<InspectionHandler, void> {
    return Private.clearEphemeralSignal.bind(this);
  }

  /**
   * A signal emitted when the handler is disposed.
   */
  get disposed(): ISignal<InspectionHandler, void> {
    return Private.disposedSignal.bind(this);
  }

  /**
   * A signal emitted when an inspector value is generated.
   */
  get inspected(): ISignal<InspectionHandler, Inspector.IInspectorUpdate> {
    return Private.inspectedSignal.bind(this);
  }

  /**
   * Get whether the inspection handler is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources used by the handler.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._activeCell = null;
    this.disposed.emit(void 0);
    clearSignalData(this);
  }

  /**
   * Update the inspector based on page outputs from the kernel.
   *
   * #### Notes
   * Payloads are deprecated and there are no official interfaces for them in
   * the kernel type definitions.
   * See [Payloads (DEPRECATED)](http://jupyter-client.readthedocs.io/en/latest/messaging.html#payloads-deprecated).
   */
  execute(content: KernelMessage.IExecuteOkReply): void {
    let update: Inspector.IInspectorUpdate = {
      content: null,
      type: 'details'
    };

    if (!content || !content.payload || !content.payload.length) {
      this.inspected.emit(update);
      return;
    }

    let details = content.payload.filter(i => (i as any).source === 'page')[0];
    if (details) {
      let bundle = (details as any).data as MimeMap<string>;
      update.content = this._rendermime.render(bundle);
      this.inspected.emit(update);
      return;
    }

    this.inspected.emit(update);
  }

  /**
   * Handle a text changed signal from an editor.
   *
   * #### Notes
   * Update the hints inspector based on a text change.
   */
  protected onTextChanged(editor: CellEditorWidget, change: ITextChange): void {
    let update: Inspector.IInspectorUpdate = {
      content: null,
      type: 'hints'
    };

    // Clear hints if the new text value is empty or kernel is unavailable.
    if (!change.newValue || !this._kernel) {
      this.inspected.emit(update);
      return;
    }

    let contents: KernelMessage.IInspectRequest = {
      code: change.newValue,
      cursor_pos: change.position,
      detail_level: 0
    };
    let pending = ++this._pending;

    this._kernel.inspect(contents).then(msg => {
      let value = msg.content;

      // If handler has been disposed, bail.
      if (this.isDisposed) {
        this.inspected.emit(update);
        return;
      }

      // If a newer text change has created a pending request, bail.
      if (pending !== this._pending) {
        this.inspected.emit(update);
        return;
      }

      // Hint request failures or negative results fail silently.
      if (value.status !== 'ok' || !value.found) {
        this.inspected.emit(update);
        return;
      }

      let bundle = value.data as MimeMap<string>;
      update.content = this._rendermime.render(bundle);
      this.inspected.emit(update);
    });
  }

  private _activeCell: BaseCellWidget = null;
  private _isDisposed = false;
  private _kernel: IKernel = null;
  private _pending = 0;
  private _rendermime: RenderMime<Widget> = null;
}


/**
 * A namespace for inspector handler private data.
 */
namespace Private {
  /**
   * A signal emitted when inspector should clear all items with no history.
   */
  export
  const clearEphemeralSignal = new Signal<InspectionHandler, void>();

  /**
   * A signal emitted when the handler is disposed.
   */
  export
  const disposedSignal = new Signal<InspectionHandler, void>();

  /**
   * A signal emitted when an inspector value is generated.
   */
  export
  const inspectedSignal = new Signal<InspectionHandler, Inspector.IInspectorUpdate>();
}

// editor.textChanged.connect(this.onTextChange, this);
