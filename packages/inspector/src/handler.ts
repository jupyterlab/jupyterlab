// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';

import { IDataConnector, Text } from '@jupyterlab/coreutils';

import { ReadonlyJSONObject } from '@phosphor/coreutils';

import { IDisposable } from '@phosphor/disposable';

import { ISignal, Signal } from '@phosphor/signaling';

import {
  MimeModel,
  RenderMimeRegistry,
  standardRendererFactories as initialFactories
} from '@jupyterlab/rendermime';

import { IInspector } from './inspector';

import { CodeCell, CodeCellModel } from '@jupyterlab/cells';

import { IClientSession } from '@jupyterlab/apputils';

import { KernelMessage } from '@jupyterlab/services';

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
    let editor = (this._editor = newValue);
    if (editor) {
      // Clear ephemeral inspectors in preparation for a new editor.
      this._ephemeralCleared.emit(void 0);
      editor.model.value.changed.connect(
        this.onTextChanged,
        this
      );
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
      content: null,
      type: 'hints'
    };

    const pending = ++this._pending;

    this._connector
      .fetch({ offset, text })
      .then(reply => {
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
      })
      .catch(reason => {
        // Since almost all failures are benign, fail silently.
        this._inspected.emit(update);
      });
  }

  private _connector: IDataConnector<
    InspectionHandler.IReply,
    void,
    InspectionHandler.IRequest
  >;
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
 * An object that displays transient_display_message. It is defined separately
 * from KernelInfoHandler so that an extension module can use the following
 * code to display transient_display_data message without a kernel
 *
 *  import:
 *      import { IInspector, InfoHandler } from '@jupyterlab/inspector'
 *
 *  extension definition:
 *      requires: [IInspector, INotebookTracker],
 *      activate: (
 *        inspector: IInspector
 *
 *  Get an info handler:
 *
 *     let handler = InfoHandler(inspector);
 *
 *  Display transient_display_data message:
 *
 *     handler.displayTransientMessage(msg);
 */
export class InfoHandler implements IDisposable, IInspector.IInspectable {
  /**
   * Construct a new handler
   */
  constructor(options: InfoHandler.IOptions) {
    // connect the IInspectable to Inspector
    this.inspected.connect(
      options.inspector.onInspectorUpdate,
      options.inspector
    );
  }

  /**
   * A signal emitted when the handler is disposed.
   */
  get disposed(): ISignal<InfoHandler, void> {
    return this._disposed;
  }

  /**
   * A signal emitted when inspector should clear all items with no history.
   */
  get ephemeralCleared(): ISignal<InfoHandler, void> {
    return this._ephemeralCleared;
  }

  /**
   * A signal emitted when an inspector value is generated.
   */
  get inspected(): ISignal<InfoHandler, IInspector.IInspectorUpdate> {
    return this._inspected;
  }

  /**
   * The info panel is always on, regardless if the notebook has focus
   */
  get standby(): boolean {
    return false;
  }
  set standby(value: boolean) {}

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
   * display a transiant_display_data message
   */
  displayTransientMessage(msg: KernelMessage.ITransientDisplayDataMsg): void {
    let title = msg.content.title || '';
    let meta = msg.content.metadata || {};
    let append = (meta['append'] ? meta['append'] : false) as boolean;
    let page = (meta['page'] ? meta['page'] : 'Info') as string;

    // get the widget with the page
    // It is easy to use a CodeCell here but a codecell has prompt areas
    // that we do not really need (css is used to hide them). It is perhaps
    // better to use an input widget and an OutputArea widget directly.
    let widget: CodeCell = this._pages.has(page)
      ? this._pages.get(page)
      : new CodeCell({
          rendermime: new RenderMimeRegistry({ initialFactories }),
          model: new CodeCellModel({})
        });

    // title of existing code cell widget
    let existing_title = widget.model.value.text;
    // if not append
    if (title !== existing_title || !append) {
      widget.model.outputs.clear();
      widget.model.value.text = title;
    }
    // store the widget in _pages so that they can be appended to later on.
    // FIXME: we should get _pages from the inspector itself so there is no need
    // to save them separately. Furthermore, using tabs from inspector allows
    // users to close tabs manually.
    this._pages.set(page, widget);

    if (!msg.content.data) return;

    // now process the display_data
    widget.model.outputs.add({
      output_type: 'display_data',
      data: msg.content.data,
      metadata: meta
    });

    this._inspected.emit({
      content: widget,
      type: page
    });
  }

  private _disposed = new Signal<this, void>(this);
  private _ephemeralCleared = new Signal<InfoHandler, void>(this);
  private _inspected = new Signal<this, IInspector.IInspectorUpdate>(this);
  private _isDisposed = false;
  private _pages = new Map<string, CodeCell>();
}

/**
 * An object that handles transient_display_data sent from a kernel
 */
export class KernelInfoHandler extends InfoHandler
  implements IDisposable, IInspector.IInspectable {
  /**
   * Construct a new inspection handler for a widget.
   */
  constructor(options: InfoHandler.IOptions) {
    super(options);
    // connect the iopub channel of the session to this handler
    options.session.iopubMessage.connect(this.onIopubMessage, this);
  }

  /**
   * Handle ioPub messages from a kernel
   */
  protected onIopubMessage(
    sender: IClientSession,
    msg: KernelMessage.IIOPubMessage
  ): void {
    // displays transient_display_data message. All others are
    // silently ignored.
    if (msg.header.msg_type === 'transient_display_data')
      this.displayTransientMessage(
        msg as KernelMessage.ITransientDisplayDataMsg
      );
  }
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
    rendermime: RenderMimeRegistry;
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

/**
 * A namespace for info inspection handler.
 */
export namespace InfoHandler {
  export interface IOptions {
    /**
     * An inspector that displays the transient_display_data message
     */
    inspector: IInspector;

    /**
     * An optional session with kernel for KernelInfoHandler to automatically
     * display transient_display_data message from its ioPub channel.
     */
    session?: IClientSession;
  }
}
