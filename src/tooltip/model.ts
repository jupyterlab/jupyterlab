// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel, KernelMessage
} from '@jupyterlab/services';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  CodeEditor
} from '../codeeditor';

import {
  IRenderMime, RenderMime
} from '../rendermime';


/**
 * The data model for a tooltip widget.
 */
export
class TooltipModel implements IDisposable {
  /**
   * Construct a new tooltip model.
   */
  constructor(options: TooltipModel.IOptions) {
    this.editor = options.editor;
    this.kernel = options.kernel;
    this.rendermime = options.rendermime;
  }

  /**
   * A signal emitted when the model content is changed.
   */
  readonly contentChanged: ISignal<this, void>;

  /**
   * A signal emitted when the model is disposed.
   */
  readonly disposed: ISignal<this, void>;

  /**
   * The editor referent of the tooltip model.
   */
  readonly editor: CodeEditor.IEditor;

  /**
   * The kernel for the tooltip model.
   */
  readonly kernel: Kernel.IKernel;

  /**
   * The rendermime instance used by the tooltip model.
   */
  readonly rendermime: IRenderMime;

  /**
   * The tooltip model's content.
   */
  get content(): Widget {
    return this._content;
  }

  /**
   * The detail level of API requests.
   *
   * #### Notes
   * The only acceptable values are 0 and 1.
   * @see http://jupyter-client.readthedocs.io/en/latest/messaging.html#introspection
   */
  get detailLevel(): 0 | 1 {
    return this._detailLevel;
  }
  set detailLevel(level: 0 | 1) {
    if (this._detailLevel !== level) {
      this._detailLevel = level;
      this.fetch();
    }
  }

  /**
   * Get whether the tooltip model is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources used by the model.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.disposed.emit(void 0);
    clearSignalData(this);
  }

  /**
   * Fetch a tooltip's content from the API server.
   */
  fetch(): void {
    let editor = this.editor;
    let kernel = this.kernel;
    let code = editor.model.value.text;
    let position = editor.getCursorPosition();
    let offset = editor.getOffsetAt(position);

    // Clear hints if the new text value is empty or kernel is unavailable.
    if (!code || !this.kernel) {
      return;
    }

    let contents: KernelMessage.IInspectRequest = {
      code,
      cursor_pos: offset,
      detail_level: this._detailLevel
    };
    let pending = ++this._pending;

    kernel.requestInspect(contents).then(msg => {
      let value = msg.content;

      // If model has been disposed, bail.
      if (this._isDisposed) {
        return;
      }

      // If a newer text change has created a pending request, bail.
      if (pending !== this._pending) {
        return;
      }

      // Hint request failures or negative results fail silently.
      if (value.status !== 'ok' || !value.found) {
        return;
      }

      // Set the content to a rendered widget.
      let data = value.data;
      let trusted = true;
      let model = new RenderMime.MimeModel({ data, trusted });
      this._content = this.rendermime.render(model);

      // Notify listeners of content change.
      this.contentChanged.emit(void 0);
    });
  }

  private _content: Widget = null;
  private _detailLevel: 0 | 1 = 0;
  private _isDisposed = false;
  private _pending = 0;
}


// Define the signals for the `TooltipModel` class.
defineSignal(TooltipModel.prototype, 'contentChanged');
defineSignal(TooltipModel.prototype, 'disposed');


/**
 * A namespace for tooltip model statics.
 */
export
namespace TooltipModel {
  /**
   * The instantiation options for a tooltip model.
   */
  export
  interface IOptions {
    /**
     * The editor referent of the tooltip model.
     */
    editor: CodeEditor.IEditor;

    /**
     * The kernel for the tooltip model.
     */
    kernel: Kernel.IKernel;

    /**
     * The rendermime instance used by the tooltip model.
     */
    rendermime: IRenderMime;
  }
}
