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
} from '@jupyterlab/codeeditor';

import {
  MimeModel, RenderMime
} from '@jupyterlab/rendermime';

import {
  IInspector
} from './';


/**
 * An object that handles code inspection.
 */
export
class InspectionHandler implements IDisposable, IInspector.IInspectable {
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
  get inspected(): ISignal<InspectionHandler, IInspector.IInspectorUpdate> {
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
   * Indicates whether the handler makes API inspection requests or stands by.
   *
   * #### Notes
   * The use case for this attribute is to limit the API traffic when no
   * inspector is visible.
   */
  get standby(): boolean {
    return this._standby;
  }
  set standby(value: boolean) {
    this._standby = value;
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
    // If the handler is in standby mode, bail.
    if (this._standby) {
      return;
    }

    const editor = this.editor;
    const code = editor.model.value.text;
    const position = editor.getCursorPosition();
    const offset = editor.getOffsetAt(position);
    let update: IInspector.IInspectorUpdate = { content: null, type: 'hints' };

    // Clear hints if the new text value is empty or kernel is unavailable.
    if (!code || !this._kernel) {
      this._inspected.emit(update);
      return;
    }

    const contents: KernelMessage.IInspectRequest = {
      code,
      cursor_pos: offset,
      detail_level: 0
    };
    const pending = ++this._pending;

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

      const data = value.data;
      const trusted = true;
      const model = new MimeModel({ data, trusted });

      update.content =  this._rendermime.render(model);
      this._inspected.emit(update);
    });
  }

  private _disposed = new Signal<this, void>(this);
  private _editor: CodeEditor.IEditor = null;
  private _ephemeralCleared = new Signal<InspectionHandler, void>(this);
  private _inspected = new Signal<this, IInspector.IInspectorUpdate>(this);
  private _kernel: Kernel.IKernel = null;
  private _pending = 0;
  private _rendermime: RenderMime = null;
  private _standby = true;
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
