// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel, KernelMessage
} from '@jupyterlab/services';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  CodeEditor
} from '../codeeditor';

import {
  MimeModel, RenderMime
} from '../rendermime';

import {
  Inspector
} from './';


/**
 * An object that handles code inspection.
 */
export
class InspectionHandler implements IDisposable, Inspector.IInspectable {
  /**
   * Construct a new inspection handler for a widget.
   */
  constructor(options: InspectionHandler.IOptions) {
    this._kernel = options.kernel || null;
    this._rendermime = options.rendermime;
  }

  /**
   * A signal emitted when the handler is disposed.
   */
  get disposed(): ISignal<InspectionHandler, void> {
    return this._disposed;
  }

  /**
   * A signal emitted when inspector should clear all items with no history.
   */
  get ephemeralCleared(): ISignal<InspectionHandler, void> {
    return this._ephemeralCleared;
  }

  /**
   * A signal emitted when an inspector value is generated.
   */
  get inspected(): ISignal<InspectionHandler, Inspector.IInspectorUpdate> {
    return this._inspected;
  }

  /**
   * The editor widget used by the inspection handler.
   */
  get editor(): CodeEditor.IEditor {
    return this._editor;
  }
  set editor(newValue: CodeEditor.IEditor) {
    if (newValue === this._editor) {
      return;
    }

    if (this._editor && !this._editor.isDisposed) {
      this._editor.model.value.changed.disconnect(this.onTextChanged, this);
    }
    let editor = this._editor = newValue;
    if (editor) {
      // Clear ephemeral inspectors in preparation for a new editor.
      this._ephemeralCleared.emit(void 0);
      editor.model.value.changed.connect(this.onTextChanged, this);
    }
  }

  /**
   * The kernel used by the inspection handler.
   */
  get kernel(): Kernel.IKernel {
    return this._kernel;
  }
  set kernel(value: Kernel.IKernel) {
    this._kernel = value;
  }

  /**
   * Get whether the inspection handler is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._editor === null;
  }

  /**
   * Dispose of the resources used by the handler.
   */
  dispose(): void {
    if (this._editor === null) {
      return;
    }
    this._editor = null;
    this._kernel = null;
    this._rendermime = null;
    this._disposed.emit(void 0);
    Signal.clearData(this);
  }

  /**
   * Handle a text changed signal from an editor.
   *
   * #### Notes
   * Update the hints inspector based on a text change.
   */
  protected onTextChanged(): void {
    let editor = this.editor;
    let code = editor.model.value.text;
    let position = editor.getCursorPosition();
    let offset = editor.getOffsetAt(position);
    let update: Inspector.IInspectorUpdate = { content: null, type: 'hints' };

    // Clear hints if the new text value is empty or kernel is unavailable.
    if (!code || !this._kernel) {
      this._inspected.emit(update);
      return;
    }

    let contents: KernelMessage.IInspectRequest = {
      code,
      cursor_pos: offset,
      detail_level: 0
    };
    let pending = ++this._pending;

    this._kernel.requestInspect(contents).then(msg => {
      let value = msg.content;

      // If handler has been disposed, bail.
      if (this.isDisposed) {
        this._inspected.emit(update);
        return;
      }

      // If a newer text change has created a pending request, bail.
      if (pending !== this._pending) {
        this._inspected.emit(update);
        return;
      }

      // Hint request failures or negative results fail silently.
      if (value.status !== 'ok' || !value.found) {
        this._inspected.emit(update);
        return;
      }

      let data = value.data;
      let trusted = true;
      let model = new MimeModel({ data, trusted });
      update.content =  this._rendermime.render(model);
      this._inspected.emit(update);
    });
  }

  private _editor: CodeEditor.IEditor = null;
  private _kernel: Kernel.IKernel = null;
  private _pending = 0;
  private _rendermime: RenderMime = null;
  private _disposed = new Signal<InspectionHandler, void>(this);
  private _ephemeralCleared = new Signal<InspectionHandler, void>(this);
  private _inspected = new Signal<InspectionHandler, Inspector.IInspectorUpdate>(this);

}


/**
 * A namespace for inspection handler statics.
 */
export
namespace InspectionHandler {
  /**
   * The instantiation options for an inspection handler.
   */
  export
  interface IOptions {
    /**
     * The kernel for the inspection handler.
     */
    kernel?: Kernel.IKernel;

    /**
     * The mime renderer for the inspection handler.
     */
    rendermime: RenderMime;
  }
}
