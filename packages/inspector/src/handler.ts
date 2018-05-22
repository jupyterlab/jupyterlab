// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CodeEditor
} from '@jupyterlab/codeeditor';

import {
  IDataConnector, Text
} from '@jupyterlab/coreutils';

import {
  ReadonlyJSONObject
} from '@phosphor/coreutils';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  MimeModel, RenderMimeRegistry
} from '@jupyterlab/rendermime';

import {
  IInspector
} from './inspector';


/**
 * An object that handles code inspection.
 */
export
class InspectionHandler implements IDisposable, IInspector.IInspectable {
  /**
   * Construct a new inspection handler for a widget.
   */
  constructor(options: InspectionHandler.IOptions) {
    this._connector = options.connector;
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
  get editor(): CodeEditor.IEditor | null {
    return this._editor;
  }
  set editor(newValue: CodeEditor.IEditor | null) {
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

    if (!editor) {
      return;
    }

    const text = editor.model.value.text;
    const position = editor.getCursorPosition();
    const offset = Text.jsIndexToCharIndex(editor.getOffsetAt(position), text);
    const update: IInspector.IInspectorUpdate = {
      content: null, type: 'hints'
    };

    const pending = ++this._pending;

    this._connector.fetch({ offset, text }).then(reply => {
      // If handler has been disposed or a newer request is pending, bail.
      if (this.isDisposed || pending !== this._pending) {
        this._inspected.emit(update);
        return;
      }

      const { data } = reply;
      const mimeType = this._rendermime.preferredMimeType(data);

      if (mimeType) {
        const widget = this._rendermime.createRenderer(mimeType);
        const model = new MimeModel({ data });

        widget.renderModel(model);
        update.content = widget;
      }

      this._inspected.emit(update);
    }).catch(reason => {
      // Since almost all failures are benign, fail silently.
      this._inspected.emit(update);
    });
  }

  private _connector: IDataConnector<InspectionHandler.IReply, void, InspectionHandler.IRequest>;
  private _disposed = new Signal<this, void>(this);
  private _editor: CodeEditor.IEditor | null = null;
  private _ephemeralCleared = new Signal<InspectionHandler, void>(this);
  private _inspected = new Signal<this, IInspector.IInspectorUpdate>(this);
  private _isDisposed = false;
  private _pending = 0;
  private _rendermime: RenderMimeRegistry;
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
     * The connector used to make inspection requests.
     *
     * #### Notes
     * The only method of this connector that will ever be called is `fetch`, so
     * it is acceptable for the other methods to be simple functions that return
     * rejected promises.
     */
    connector: IDataConnector<IReply, void, IRequest>;

    /**
     * The mime renderer for the inspection handler.
     */
    rendermime: RenderMimeRegistry;
  }

  /**
   * A reply to an inspection request.
   */
  export
  interface IReply {
    /**
     * The MIME bundle data returned from an inspection request.
     */
    data: ReadonlyJSONObject;

    /**
     * Any metadata that accompanies the MIME bundle returning from a request.
     */
    metadata: ReadonlyJSONObject;
  }

  /**
   * The details of an inspection request.
   */
  export
  interface IRequest {
    /**
     * The cursor offset position within the text being inspected.
     */
    offset: number;

    /**
     * The text being inspected.
     */
    text: string;
  }
}
