// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';
import { Text } from '@jupyterlab/coreutils';
import { IRenderMimeRegistry, MimeModel } from '@jupyterlab/rendermime';
import { IDataConnector } from '@jupyterlab/statedb';
import { JSONExt, ReadonlyJSONObject } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { Debouncer } from '@lumino/polling';
import { ISignal, Signal } from '@lumino/signaling';
import { IInspector } from './tokens';

/**
 * An object that handles code inspection.
 */
export class InspectionHandler implements IDisposable, IInspector.IInspectable {
  /**
   * Construct a new inspection handler for a widget.
   */
  constructor(options: InspectionHandler.IOptions) {
    this._connector = options.connector;
    this._rendermime = options.rendermime;
    this._debouncer = new Debouncer(this.onEditorChange.bind(this), 250);
  }

  /**
   * A signal emitted when the inspector should clear all items.
   */
  get cleared(): ISignal<InspectionHandler, void> {
    return this._cleared;
  }

  /**
   * A signal emitted when the handler is disposed.
   */
  get disposed(): ISignal<InspectionHandler, void> {
    return this._disposed;
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
    // Remove all of our listeners.
    Signal.disconnectReceiver(this);

    const editor = (this._editor = newValue);
    if (editor) {
      // Clear the inspector in preparation for a new editor.
      this._cleared.emit(void 0);
      // Call onEditorChange to cover the case where the user changes
      // the active cell
      this.onEditorChange();
      editor.model.selections.changed.connect(this._onChange, this);
      editor.model.sharedModel.changed.connect(this._onChange, this);
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
    this._debouncer.dispose();
    this._disposed.emit(void 0);
    Signal.clearData(this);
  }

  /**
   * Handle a text changed signal from an editor.
   *
   * #### Notes
   * Update the hints inspector based on a text change.
   */
  onEditorChange(customText?: string): void {
    // If the handler is in standby mode, bail.
    if (this._standby) {
      return;
    }

    const editor = this.editor;

    if (!editor) {
      return;
    }
    const text = customText ? customText : editor.model.sharedModel.getSource();
    const position = editor.getCursorPosition();
    const offset = Text.jsIndexToCharIndex(editor.getOffsetAt(position), text);
    const update: IInspector.IInspectorUpdate = { content: null };

    const pending = ++this._pending;

    void this._connector
      .fetch({ offset, text })
      .then(reply => {
        // If handler has been disposed or a newer request is pending, bail.
        if (!reply || this.isDisposed || pending !== this._pending) {
          this._lastInspectedReply = null;
          this._inspected.emit(update);
          return;
        }

        const { data } = reply;

        // Do not update if there would be no change.
        if (
          this._lastInspectedReply &&
          JSONExt.deepEqual(this._lastInspectedReply, data)
        ) {
          return;
        }

        const mimeType = this._rendermime.preferredMimeType(data);
        if (mimeType) {
          const widget = this._rendermime.createRenderer(mimeType);
          const model = new MimeModel({ data });

          void widget.renderModel(model);
          update.content = widget;
        }

        this._lastInspectedReply = reply.data;
        this._inspected.emit(update);
      })
      .catch(reason => {
        // Since almost all failures are benign, fail silently.
        this._lastInspectedReply = null;
        this._inspected.emit(update);
      });
  }

  /**
   * Handle changes to the editor state, debouncing.
   */
  private _onChange(): void {
    void this._debouncer.invoke();
  }

  private _cleared = new Signal<InspectionHandler, void>(this);
  private _connector: IDataConnector<
    InspectionHandler.IReply,
    void,
    InspectionHandler.IRequest
  >;
  private _disposed = new Signal<this, void>(this);
  private _editor: CodeEditor.IEditor | null = null;
  private _inspected = new Signal<this, IInspector.IInspectorUpdate>(this);
  private _isDisposed = false;
  private _pending = 0;
  private _rendermime: IRenderMimeRegistry;
  private _standby = true;
  private _debouncer: Debouncer;
  private _lastInspectedReply: InspectionHandler.IReply['data'] | null = null;
}

/**
 * A namespace for inspection handler statics.
 */
export namespace InspectionHandler {
  /**
   * The instantiation options for an inspection handler.
   */
  export interface IOptions {
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
    rendermime: IRenderMimeRegistry;
  }

  /**
   * A reply to an inspection request.
   */
  export interface IReply {
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
  export interface IRequest {
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
