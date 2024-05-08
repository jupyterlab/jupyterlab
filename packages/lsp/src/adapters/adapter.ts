// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import mergeWith from 'lodash.mergewith';

import { Dialog, showDialog } from '@jupyterlab/apputils';
import { DocumentRegistry, IDocumentWidget } from '@jupyterlab/docregistry';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { JSONObject } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';

import { ClientCapabilities, LanguageIdentifier } from '../lsp';
import { IVirtualPosition } from '../positioning';
import {
  Document,
  IDocumentConnectionData,
  ILSPCodeExtractorsManager,
  ILSPDocumentConnectionManager,
  ILSPFeatureManager,
  ISocketConnectionOptions
} from '../tokens';
import { VirtualDocument } from '../virtual/document';
import { EditorAdapter } from './editorAdapter';

type IButton = Dialog.IButton;
const createButton = Dialog.createButton;

/**
 * The values should follow the https://microsoft.github.io/language-server-protocol/specification guidelines
 */
const MIME_TYPE_LANGUAGE_MAP: JSONObject = {
  'text/x-rsrc': 'r',
  'text/x-r-source': 'r',
  // currently there are no LSP servers for IPython we are aware of
  'text/x-ipython': 'python'
};

export interface IEditorChangedData {
  /**
   * The CM editor invoking the change event.
   */
  editor: Document.IEditor;
}

export interface IAdapterOptions {
  /**
   * The LSP document and connection manager instance.
   */
  connectionManager: ILSPDocumentConnectionManager;

  /**
   * The LSP feature manager instance.
   */
  featureManager: ILSPFeatureManager;

  /**
   * The LSP foreign code extractor manager.
   */
  foreignCodeExtractorsManager: ILSPCodeExtractorsManager;

  /**
   * The translator provider.
   */
  translator?: ITranslator;
}

/**
 * Foreign code: low level adapter is not aware of the presence of foreign languages;
 * it operates on the virtual document and must not attempt to infer the language dependencies
 * as this would make the logic of inspections caching impossible to maintain, thus the WidgetAdapter
 * has to handle that, keeping multiple connections and multiple virtual documents.
 */
export abstract class WidgetLSPAdapter<
  T extends IDocumentWidget = IDocumentWidget
> implements IDisposable
{
  // note: it could be using namespace/IOptions pattern,
  // but I do not know how to make it work with the generic type T
  // (other than using 'any' in the IOptions interface)
  constructor(
    public widget: T,
    protected options: IAdapterOptions
  ) {
    this._connectionManager = options.connectionManager;
    this._isConnected = false;
    this._trans = (options.translator || nullTranslator).load('jupyterlab');
    // set up signal connections
    this.widget.context.saveState.connect(this.onSaveState, this);
    this.connectionManager.closed.connect(this.onConnectionClosed, this);
    this.widget.disposed.connect(this.dispose, this);

    this._editorToAdapter = new WeakMap();
    this.editorAdded.connect(this._onEditorAdded, this);
    this.editorRemoved.connect(this._onEditorRemoved, this);
    this._connectionManager.languageServerManager.sessionsChanged.connect(
      this._onLspSessionOrFeatureChanged,
      this
    );
    this.options.featureManager.featureRegistered.connect(
      this._onLspSessionOrFeatureChanged,
      this
    );
  }

  /**
   * Check if the adapter is disposed
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }
  /**
   * Check if the document contains multiple editors
   */
  get hasMultipleEditors(): boolean {
    return this.editors.length > 1;
  }
  /**
   * Get the ID of the internal widget.
   */
  get widgetId(): string {
    return this.widget.id;
  }

  /**
   * Get the language identifier of the document
   */
  get language(): LanguageIdentifier {
    // the values should follow https://microsoft.github.io/language-server-protocol/specification guidelines,
    // see the table in https://microsoft.github.io/language-server-protocol/specification#textDocumentItem
    if (MIME_TYPE_LANGUAGE_MAP.hasOwnProperty(this.mimeType)) {
      return MIME_TYPE_LANGUAGE_MAP[this.mimeType] as string;
    } else {
      let withoutParameters = this.mimeType.split(';')[0];
      let [type, subtype] = withoutParameters.split('/');
      if (type === 'application' || type === 'text') {
        if (subtype.startsWith('x-')) {
          return subtype.substring(2);
        } else {
          return subtype;
        }
      } else {
        return this.mimeType;
      }
    }
  }

  /**
   * Signal emitted when the adapter is connected.
   */
  get adapterConnected(): ISignal<
    WidgetLSPAdapter<T>,
    IDocumentConnectionData
  > {
    return this._adapterConnected;
  }

  /**
   * Signal emitted when the active editor have changed.
   */
  get activeEditorChanged(): ISignal<WidgetLSPAdapter<T>, IEditorChangedData> {
    return this._activeEditorChanged;
  }

  /**
   * Signal emitted when the adapter is disposed.
   */
  get disposed(): ISignal<WidgetLSPAdapter<T>, void> {
    return this._disposed;
  }

  /**
   * Signal emitted when the an editor is changed.
   */
  get editorAdded(): ISignal<WidgetLSPAdapter<T>, IEditorChangedData> {
    return this._editorAdded;
  }

  /**
   * Signal emitted when the an editor is removed.
   */
  get editorRemoved(): ISignal<WidgetLSPAdapter<T>, IEditorChangedData> {
    return this._editorRemoved;
  }

  /**
   * Get the inner HTMLElement of the document widget.
   */
  abstract get wrapperElement(): HTMLElement;

  /**
   * Get current path of the document.
   */
  abstract get documentPath(): string;

  /**
   * Get the mime type of the document.
   */
  abstract get mimeType(): string;

  /**
   * Get the file extension of the document.
   */
  abstract get languageFileExtension(): string | undefined;

  /**
   * Get the activated CM editor.
   */
  abstract get activeEditor(): Document.IEditor | undefined;

  /**
   * Get the list of CM editors in the document, there is only one editor
   * in the case of file editor.
   */
  abstract get editors(): Document.ICodeBlockOptions[];

  /**
   * Promise that resolves once the adapter is initialized
   */
  abstract get ready(): Promise<void>;

  /**
   * The virtual document is connected or not
   */
  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * The LSP document and connection manager instance.
   */
  get connectionManager(): ILSPDocumentConnectionManager {
    return this._connectionManager;
  }

  /**
   * The translator provider.
   */
  get trans(): TranslationBundle {
    return this._trans;
  }

  /**
   * Promise that resolves once the document is updated
   */
  get updateFinished(): Promise<void> {
    return this._updateFinished;
  }

  /**
   * Internal virtual document of the adapter.
   */
  get virtualDocument(): VirtualDocument | null {
    return this._virtualDocument;
  }

  /**
   * Callback on connection closed event.
   */
  onConnectionClosed(
    _: ILSPDocumentConnectionManager,
    { virtualDocument }: IDocumentConnectionData
  ): void {
    if (virtualDocument === this.virtualDocument) {
      this.dispose();
    }
  }

  /**
   * Dispose the adapter.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this.editorAdded.disconnect(this._onEditorAdded, this);
    this.editorRemoved.disconnect(this._onEditorRemoved, this);
    this._connectionManager.languageServerManager.sessionsChanged.disconnect(
      this._onLspSessionOrFeatureChanged,
      this
    );
    this.options.featureManager.featureRegistered.disconnect(
      this._onLspSessionOrFeatureChanged,
      this
    );
    this._isDisposed = true;
    this.disconnect();
    this._virtualDocument = null;
    this._disposed.emit();
    Signal.clearData(this);
  }

  /**
   * Disconnect virtual document from the language server.
   */
  disconnect(): void {
    const uri = this.virtualDocument?.uri;
    const { model } = this.widget.context;
    if (uri) {
      this.connectionManager.unregisterDocument(uri);
    }
    model.contentChanged.disconnect(this._onContentChanged, this);

    // pretend that all editors were removed to trigger the disconnection of even handlers
    // they will be connected again on new connection
    for (let { ceEditor: editor } of this.editors) {
      this._editorRemoved.emit({
        editor: editor
      });
    }

    this.virtualDocument?.dispose();
  }

  /**
   * Update the virtual document.
   */
  updateDocuments(): Promise<void> {
    if (this._isDisposed) {
      console.warn('Cannot update documents: adapter disposed');
      return Promise.reject('Cannot update documents: adapter disposed');
    }
    return this.virtualDocument!.updateManager.updateDocuments(this.editors);
  }

  /**
   * Callback called on the document changed event.
   */
  documentChanged(
    virtualDocument: VirtualDocument,
    document: VirtualDocument,
    isInit = false
  ): void {
    if (this._isDisposed) {
      console.warn('Cannot swap document: adapter disposed');
      return;
    }

    // TODO only send the difference, using connection.sendSelectiveChange()
    let connection = this.connectionManager.connections.get(
      virtualDocument.uri
    );

    if (!connection?.isReady) {
      console.log('Skipping document update signal: connection not ready');
      return;
    }

    connection.sendFullTextChange(
      virtualDocument.value,
      virtualDocument.documentInfo
    );
  }

  /**
   * (re)create virtual document using current path and language
   */
  protected abstract createVirtualDocument(): VirtualDocument;

  /**
   * Get the index of editor from the cursor position in the virtual
   * document.
   * @deprecated This is error-prone and will be removed in JupyterLab 5.0, use `getEditorIndex()` with `virtualDocument.getEditorAtVirtualLine(position)` instead.
   *
   * @param position - the position of cursor in the virtual document.
   * @return - index of the virtual editor
   */
  abstract getEditorIndexAt(position: IVirtualPosition): number;

  /**
   * Get the index of input editor
   *
   * @param ceEditor - instance of the code editor
   */
  abstract getEditorIndex(ceEditor: Document.IEditor): number;

  /**
   * Get the wrapper of input editor.
   *
   * @param ceEditor
   */
  abstract getEditorWrapper(ceEditor: Document.IEditor): HTMLElement;

  // equivalent to triggering didClose and didOpen, as per syncing specification,
  // but also reloads the connection; used during file rename (or when it was moved)
  protected reloadConnection(): void {
    // ignore premature calls (before the editor was initialized)
    if (this.virtualDocument === null) {
      return;
    }

    // disconnect all existing connections (and dispose adapters)
    this.disconnect();

    // recreate virtual document using current path and language
    // as virtual editor assumes it gets the virtual document at init,
    // just dispose virtual editor (which disposes virtual document too)
    // and re-initialize both virtual editor and document
    this.initVirtual();

    // reconnect
    this.connectDocument(this.virtualDocument, true).catch(console.warn);
  }

  /**
   * Callback on document saved event.
   */
  protected onSaveState(
    context: DocumentRegistry.IContext<DocumentRegistry.IModel>,
    state: DocumentRegistry.SaveState
  ): void {
    // ignore premature calls (before the editor was initialized)
    if (this.virtualDocument === null) {
      return;
    }

    if (state === 'completed') {
      // note: must only be send to the appropriate connections as
      // some servers (Julia) break if they receive save notification
      // for a document that was not opened before, see:
      // https://github.com/jupyter-lsp/jupyterlab-lsp/issues/490
      const documentsToSave = [this.virtualDocument];

      for (let virtualDocument of documentsToSave) {
        let connection = this.connectionManager.connections.get(
          virtualDocument.uri
        );
        if (!connection) {
          continue;
        }
        connection.sendSaved(virtualDocument.documentInfo);
        for (let foreign of virtualDocument.foreignDocuments.values()) {
          documentsToSave.push(foreign);
        }
      }
    }
  }

  /**
   * Connect the virtual document with the language server.
   */
  protected async onConnected(data: IDocumentConnectionData): Promise<void> {
    let { virtualDocument } = data;

    this._adapterConnected.emit(data);
    this._isConnected = true;

    try {
      await this.updateDocuments();
    } catch (reason) {
      console.warn('Could not update documents', reason);
      return;
    }

    // refresh the document on the LSP server
    this.documentChanged(virtualDocument, virtualDocument, true);

    data.connection.serverNotifications['$/logTrace'].connect(
      (connection, message) => {
        console.log(
          data.connection.serverIdentifier,
          'trace',
          virtualDocument.uri,
          message
        );
      }
    );

    data.connection.serverNotifications['window/logMessage'].connect(
      (connection, message) => {
        console.log(connection.serverIdentifier + ': ' + message.message);
      }
    );

    data.connection.serverNotifications['window/showMessage'].connect(
      (connection, message) => {
        void showDialog({
          title: this.trans.__('Message from ') + connection.serverIdentifier,
          body: message.message
        });
      }
    );

    data.connection.serverRequests['window/showMessageRequest'].setHandler(
      async params => {
        const actionItems = params.actions;
        const buttons = actionItems
          ? actionItems.map(action => {
              return createButton({
                label: action.title
              });
            })
          : [createButton({ label: this.trans.__('Dismiss') })];
        const result = await showDialog<IButton>({
          title:
            this.trans.__('Message from ') + data.connection.serverIdentifier,
          body: params.message,
          buttons: buttons
        });
        const choice = buttons.indexOf(result.button);
        if (choice === -1) {
          return null;
        }
        if (actionItems) {
          return actionItems[choice];
        }
        return null;
      }
    );
  }

  /**
   * Opens a connection for the document. The connection may or may
   * not be initialized, yet, and depending on when this is called, the client
   * may not be fully connected.
   *
   * @param virtualDocument a VirtualDocument
   * @param sendOpen whether to open the document immediately
   */
  protected async connectDocument(
    virtualDocument: VirtualDocument,
    sendOpen = false
  ): Promise<void> {
    virtualDocument.foreignDocumentOpened.connect(
      this.onForeignDocumentOpened,
      this
    );
    const connectionContext = await this._connect(virtualDocument).catch(
      console.error
    );

    if (connectionContext && connectionContext.connection) {
      virtualDocument.changed.connect(this.documentChanged, this);
      if (sendOpen) {
        connectionContext.connection.sendOpenWhenReady(
          virtualDocument.documentInfo
        );
      }
    }
  }

  /**
   * Create the virtual document using current path and language.
   */
  protected initVirtual(): void {
    this._virtualDocument?.dispose();
    this._virtualDocument = this.createVirtualDocument();
    this._onLspSessionOrFeatureChanged();
  }

  /**
   * Handler for opening a document contained in a parent document. The assumption
   * is that the editor already exists for this, and as such the document
   * should be queued for immediate opening.
   *
   * @param host the VirtualDocument that contains the VirtualDocument in another language
   * @param context information about the foreign VirtualDocument
   */
  protected async onForeignDocumentOpened(
    host: VirtualDocument,
    context: Document.IForeignContext
  ): Promise<void> {
    const { foreignDocument } = context;

    await this.connectDocument(foreignDocument, true);

    foreignDocument.foreignDocumentClosed.connect(
      this._onForeignDocumentClosed,
      this
    );
  }

  /**
   * Signal emitted when the adapter is connected.
   */
  protected _adapterConnected: Signal<
    WidgetLSPAdapter<T>,
    IDocumentConnectionData
  > = new Signal(this);

  /**
   * Signal emitted when the active editor have changed.
   */
  protected _activeEditorChanged: Signal<
    WidgetLSPAdapter<T>,
    IEditorChangedData
  > = new Signal(this);

  /**
   * Signal emitted when an editor is changed.
   */
  protected _editorAdded: Signal<WidgetLSPAdapter<T>, IEditorChangedData> =
    new Signal(this);

  /**
   * Signal emitted when an editor is removed.
   */
  protected _editorRemoved: Signal<WidgetLSPAdapter<T>, IEditorChangedData> =
    new Signal(this);

  /**
   * Signal emitted when the adapter is disposed.
   */
  protected _disposed: Signal<WidgetLSPAdapter<T>, void> = new Signal(this);

  private _isDisposed = false;

  private readonly _connectionManager: ILSPDocumentConnectionManager;
  private readonly _trans: TranslationBundle;

  private _isConnected: boolean;
  private _updateFinished: Promise<void>;
  private _virtualDocument: VirtualDocument | null = null;
  private _editorToAdapter: WeakMap<Document.IEditor, EditorAdapter>;

  private _onEditorAdded(
    sender: WidgetLSPAdapter<T>,
    change: IEditorChangedData
  ): void {
    const { editor } = change;
    const editorAdapter = new EditorAdapter({
      editor: editor,
      widgetAdapter: this,
      extensions: this.options.featureManager.extensionFactories()
    });
    this._editorToAdapter.set(editor, editorAdapter);
  }

  private _onEditorRemoved(
    sender: WidgetLSPAdapter<T>,
    change: IEditorChangedData
  ): void {
    const { editor } = change;
    const adapter = this._editorToAdapter.get(editor);
    adapter?.dispose();
    this._editorToAdapter.delete(editor);
  }

  /**
   * Callback called when a foreign document is closed,
   * the associated signals with this virtual document
   * are disconnected.
   */
  private _onForeignDocumentClosed(
    _: VirtualDocument,
    context: Document.IForeignContext
  ): void {
    const { foreignDocument } = context;
    foreignDocument.foreignDocumentClosed.disconnect(
      this._onForeignDocumentClosed,
      this
    );
    foreignDocument.foreignDocumentOpened.disconnect(
      this.onForeignDocumentOpened,
      this
    );
    foreignDocument.changed.disconnect(this.documentChanged, this);
  }

  /**
   * Detect the capabilities for the document type then
   * open the websocket connection with the language server.
   */
  private async _connect(virtualDocument: VirtualDocument) {
    let language = virtualDocument.language;

    let capabilities: ClientCapabilities = {
      textDocument: {
        synchronization: {
          dynamicRegistration: true,
          willSave: false,
          didSave: true,
          willSaveWaitUntil: false
        }
      },
      workspace: {
        didChangeConfiguration: {
          dynamicRegistration: true
        }
      }
    };
    capabilities = mergeWith(
      capabilities,
      this.options.featureManager.clientCapabilities()
    );

    let options: ISocketConnectionOptions = {
      capabilities,
      virtualDocument,
      language,
      hasLspSupportedFile: virtualDocument.hasLspSupportedFile
    };

    let connection = await this.connectionManager.connect(options);

    if (connection) {
      await this.onConnected({ virtualDocument, connection });

      return {
        connection,
        virtualDocument
      };
    } else {
      return undefined;
    }
  }

  /**
   * Handle content changes and update all virtual documents after a change.
   *
   * #### Notes
   * Update to the state of a notebook may be done without a notice on the
   * CodeMirror level, e.g. when a cell is deleted. Therefore a
   * JupyterLab-specific signal is watched instead.
   *
   * While by not using the change event of CodeMirror editors we lose an easy
   * way to send selective (range) updates this can be still implemented by
   * comparison of before/after states of the virtual documents, which is
   * more resilient and editor-independent.
   */
  private async _onContentChanged(_: unknown) {
    // Update the virtual documents.
    // Sending the updates to LSP is out of scope here.
    const promise = this.updateDocuments();
    if (!promise) {
      console.warn('Could not update documents');
      return;
    }
    this._updateFinished = promise.catch(console.warn);
    await this.updateFinished;
  }

  /**
   * Check if the virtual document should be updated on content
   * changed signal. Returns `true` if two following conditions are
   * are satisfied:
   *  - The LSP feature is enabled.
   *  - The LSP features list is not empty.
   */
  private _shouldUpdateVirtualDocument(): boolean {
    const { languageServerManager } = this.connectionManager;
    return (
      languageServerManager.isEnabled &&
      this.options.featureManager.features.length > 0
    );
  }

  /**
   * Connect the virtual document update handler with the content
   * updated signal.This method is invoked at startup and when
   * the LSP server status changed or when a LSP feature is registered.
   */
  private _onLspSessionOrFeatureChanged(): void {
    if (!this._virtualDocument) {
      return;
    }

    const { model } = this.widget.context;

    if (this._shouldUpdateVirtualDocument()) {
      model.contentChanged.connect(this._onContentChanged, this);
    } else {
      model.contentChanged.disconnect(this._onContentChanged, this);
    }
  }
}
