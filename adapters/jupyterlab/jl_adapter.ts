import { PathExt } from '@jupyterlab/coreutils';
import * as CodeMirror from 'codemirror';
import { CodeMirrorAdapter } from '../codemirror/cm_adapter';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { CodeJumper } from '@krassowski/jupyterlab_go_to_definition/lib/jumpers/jumper';
import { PositionConverter } from '../../converter';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { IDocumentWidget } from '@jupyterlab/docregistry';

import * as lsProtocol from 'vscode-languageserver-protocol';
import { FreeTooltip } from './components/free_tooltip';
import { Widget } from '@phosphor/widgets';
import { VirtualEditor } from '../../virtual/editor';
import { VirtualDocument } from '../../virtual/document';
import { Signal } from '@phosphor/signaling';
import { IEditorPosition, IRootPosition } from '../../positioning';
import { LSPConnection } from '../../connection';
import { LSPConnector } from './components/completion';
import { CompletionTriggerKind } from '../../lsp';
import { Completion } from '../codemirror/features/completion';
import { Diagnostics } from '../codemirror/features/diagnostics';
import { Highlights } from '../codemirror/features/highlights';
import { Hover } from '../codemirror/features/hover';
import { Signature } from '../codemirror/features/signature';
import { ILSPFeatureConstructor, ILSPFeature } from '../codemirror/feature';
import { JumpToDefinition } from '../codemirror/features/jump_to';
import { ICommandContext } from '../../command_manager';
import { JSONObject } from '@phosphor/coreutils';
import {
  DocumentConnectionManager,
  IDocumentConnectionData
} from '../../connection_manager';
import { Rename } from '../codemirror/features/rename';

export const lsp_features: Array<ILSPFeatureConstructor> = [
  Completion,
  Diagnostics,
  Highlights,
  Hover,
  Signature,
  JumpToDefinition,
  Rename
];

export interface IJupyterLabComponentsManager {
  invoke_completer: (kind: CompletionTriggerKind) => void;
  create_tooltip: (
    markup: lsProtocol.MarkupContent,
    cm_editor: CodeMirror.Editor,
    position: IEditorPosition
  ) => FreeTooltip;
  remove_tooltip: () => void;
  jumper: CodeJumper;
}

export class StatusMessage {
  /**
   * The text message to be shown on the statusbar
   */
  message: string;
  changed: Signal<StatusMessage, string>;

  constructor() {
    this.message = '';
    this.changed = new Signal(this);
  }

  /**
   * Set the text message and (optionally) the timeout to remove it.
   * @param message
   * @param timeout - number of ms to until the message is cleaned;
   *        -1 if the message should stay up indefinitely
   */
  set(message: string, timeout?: number) {
    this.message = message;
    this.changed.emit('');
    if (typeof timeout !== 'undefined' && timeout !== -1) {
      setTimeout(this.cleanup.bind(this), timeout);
    }
  }

  cleanup() {
    this.message = '';
    this.changed.emit('');
  }
}

/**
 * The values should follow the https://microsoft.github.io/language-server-protocol/specification guidelines
 */
const mime_type_language_map: JSONObject = {
  'text/x-rsrc': 'r',
  'text/x-r-source': 'r',
  // currently there are no LSP servers for IPython we are aware of
  'text/x-ipython': 'python'
};

/**
 * Foreign code: low level adapter is not aware of the presence of foreign languages;
 * it operates on the virtual document and must not attempt to infer the language dependencies
 * as this would make the logic of inspections caching impossible to maintain, thus the WidgetAdapter
 * has to handle that, keeping multiple connections and multiple virtual documents.
 */
export abstract class JupyterLabWidgetAdapter
  implements IJupyterLabComponentsManager {
  jumper: CodeJumper;
  protected adapters: Map<VirtualDocument.id_path, CodeMirrorAdapter>;
  private readonly invoke_command: string;
  protected document_connected: Signal<
    JupyterLabWidgetAdapter,
    IDocumentConnectionData
  >;
  protected abstract current_completion_connector: LSPConnector;
  private _tooltip: FreeTooltip;
  public connection_manager: DocumentConnectionManager;
  public status_message: StatusMessage;

  protected constructor(
    protected app: JupyterFrontEnd,
    protected widget: IDocumentWidget,
    protected rendermime_registry: IRenderMimeRegistry,
    invoke: string,
    private server_root: string
  ) {
    this.status_message = new StatusMessage();
    this.widget.context.pathChanged.connect(this.reload_connection.bind(this));
    this.invoke_command = invoke;
    this.document_connected = new Signal(this);
    this.adapters = new Map();
    this.connection_manager = new DocumentConnectionManager();
    this.connection_manager.closed.connect((manger, { virtual_document }) => {
      console.log(
        'LSP: connection closed, disconnecting adapter',
        virtual_document.id_path
      );
      this.disconnect_adapter(virtual_document);
    });
    this.connection_manager.connected.connect((manager, data) => {
      this.on_connected(data).catch(console.warn);
    });

    // register completion connectors
    this.document_connected.connect(() => this.connect_completion());
  }

  abstract virtual_editor: VirtualEditor;
  abstract get document_path(): string;
  abstract get mime_type(): string;
  protected abstract connect_completion(): void;

  get language(): string {
    // the values should follow https://microsoft.github.io/language-server-protocol/specification guidelines
    if (mime_type_language_map.hasOwnProperty(this.mime_type)) {
      return mime_type_language_map[this.mime_type] as string;
    } else {
      let without_parameters = this.mime_type.split(';')[0];
      let [type, subtype] = without_parameters.split('/');
      if (type === 'application' || type === 'text') {
        if (subtype.startsWith('x-')) {
          return subtype.substr(2);
        } else {
          return subtype;
        }
      } else {
        return this.mime_type;
      }
    }
  }

  abstract get language_file_extension(): string;

  get root_path() {
    // TODO: serverRoot may need to be included for Hub or Windows, requires testing.
    // let root = PageConfig.getOption('serverRoot');
    return PathExt.dirname(this.document_path);
  }

  // equivalent to triggering didClose and didOpen, as per syncing specification,
  // but also reloads the connection
  protected reload_connection() {
    // ignore premature calls (before the editor was initialized)
    if (typeof this.virtual_editor === 'undefined') {
      return;
    }

    // disconnect all existing connections
    this.connection_manager.close_all();
    // recreate virtual document using current path and language
    this.virtual_editor.create_virtual_document();
    // reconnect
    this.connect_document(this.virtual_editor.virtual_document).catch(
      console.warn
    );
  }

  abstract find_ce_editor(cm_editor: CodeMirror.Editor): CodeEditor.IEditor;

  invoke_completer(kind: CompletionTriggerKind) {
    this.current_completion_connector.with_trigger_kind(kind, () => {
      return this.app.commands.execute(this.invoke_command);
    });
  }

  protected async on_connected(data: IDocumentConnectionData) {
    let { virtual_document } = data;

    await this.connect_adapter(data.virtual_document, data.connection);
    this.document_connected.emit(data);

    await this.virtual_editor.update_documents().then(() => {
      // refresh the document on the LSP server
      this.document_changed(virtual_document);
      console.log(
        'LSP: virtual document(s) for',
        this.document_path,
        'have been initialized'
      );
    });
  }

  protected async connect_document(virtual_document: VirtualDocument) {
    this.connection_manager.connect_document_signals(virtual_document);
    virtual_document.changed.connect(this.document_changed.bind(this));
    await this.connect(virtual_document).catch(console.warn);

    virtual_document.foreign_document_opened.connect((host, context) => {
      this.connect_document(context.foreign_document).catch(console.warn);
    });
  }

  document_changed(virtual_document: VirtualDocument) {
    // TODO only send the difference, using connection.sendSelectiveChange()
    let connection = this.connection_manager.connections.get(
      virtual_document.id_path
    );
    let adapter = this.adapters.get(virtual_document.id_path);

    if (typeof connection === 'undefined') {
      console.log('LSP: Skipping document update signal: connection not ready');
      return;
    }
    if (typeof adapter === 'undefined') {
      console.log('LSP: Skipping document update signal: adapter not ready');
      return;
    }

    console.log(
      'LSP: virtual document',
      virtual_document.id_path,
      'has changed sending update'
    );
    connection.sendFullTextChange(virtual_document.value);
    // guarantee that the virtual editor won't perform an update of the virtual documents while
    // the changes are recorded...
    // TODO this is not ideal - why it solves the problem of some errors,
    //  it introduces an unnecessary delay. A better way could be to invalidate some of the updates when a new one comes in.
    //  but maybe not every one (then the outdated state could be kept for too long fo a user who writes very quickly)
    //  also we would not want to invalidate the updates for the purpose of autocompletion (the trigger characters)
    this.virtual_editor
      .with_update_lock(async () => {
        await adapter.updateAfterChange();
      })
      .then()
      .catch(console.warn);
  }

  private async connect_adapter(
    virtual_document: VirtualDocument,
    connection: LSPConnection
  ) {
    let adapter = this.create_adapter(virtual_document, connection);
    this.adapters.set(virtual_document.id_path, adapter);
  }

  private disconnect_adapter(virtual_document: VirtualDocument) {
    let adapter = this.adapters.get(virtual_document.id_path);
    this.adapters.delete(virtual_document.id_path);
    if (typeof adapter !== 'undefined') {
      adapter.remove();
    }
  }

  public get_features(virtual_document: VirtualDocument) {
    let adapter = this.adapters.get(virtual_document.id_path);
    return adapter.features;
  }

  private async connect(virtual_document: VirtualDocument) {
    let language = virtual_document.language;
    console.log(
      `LSP: will connect using root path: ${this.root_path} and language: ${language}`
    );

    let options = {
      virtual_document,
      language,
      root_path: this.root_path,
      server_root: this.server_root,
      document_path: this.document_path
    };

    let connection = this.connection_manager.connect(options).catch(() => {
      this.connection_manager
        .retry_to_connect(options, 0.5)
        .catch(console.warn);
    });

    return {
      connection,
      virtual_document
    };
  }

  /**
   * Connect the change signal in order to update all virtual documents after a change.
   *
   * Update to the state of a notebook may be done without a notice on the CodeMirror level,
   * e.g. when a cell is deleted. Therefore a JupyterLab-specific signals are watched instead.
   *
   * While by not using the change event of CodeMirror editors we loose an easy way to send selective,
   * (range) updates this can be still implemented by comparison of before/after states of the
   * virtual documents, which is even more resilient and -obviously - editor-independent.
   */
  connect_contentChanged_signal() {
    this.widget.context.model.contentChanged.connect(
      this.update_documents.bind(this)
    );
  }

  create_adapter(
    virtual_document: VirtualDocument,
    connection: LSPConnection
  ): CodeMirrorAdapter {
    let adapter_features = new Array<ILSPFeature>();
    for (let feature_type of lsp_features) {
      let feature = new feature_type(
        this.virtual_editor,
        virtual_document,
        connection,
        this,
        this.status_message
      );
      adapter_features.push(feature);
    }

    let adapter = new CodeMirrorAdapter(
      this.virtual_editor,
      virtual_document,
      this,
      adapter_features
    );
    console.log('LSP: Adapter for', this.document_path, 'is ready.');
    return adapter;
  }

  update_documents(_slot: any) {
    // update the virtual documents (sending the updates to LSP is out of scope here)
    this.virtual_editor
      .update_documents()
      .then()
      .catch(console.warn);
  }

  get_position_from_context_menu(): IRootPosition {
    // get the first node as it gives the most accurate approximation
    let leaf_node = this.app.contextMenuHitTest(() => true);

    let { left, top } = leaf_node.getBoundingClientRect();

    // @ts-ignore
    let event = this.app._contextMenuEvent;

    // if possible, use more accurate position from the actual event
    // (but this relies on an undocumented and unstable feature)
    if (event !== undefined) {
      left = event.clientX;
      top = event.clientY;
      event.stopPropagation();
    }
    return this.virtual_editor.coordsChar(
      {
        left: left,
        top: top
      },
      'window'
    ) as IRootPosition;
  }

  get_context_from_context_menu(): ICommandContext {
    let root_position = this.get_position_from_context_menu();
    let document = this.virtual_editor.document_at_root_position(root_position);
    let virtual_position = this.virtual_editor.root_position_to_virtual_position(
      root_position
    );
    return {
      document,
      connection: this.connection_manager.connections.get(document.id_path),
      virtual_position,
      root_position,
      features: this.get_features(document),
      editor: this.virtual_editor,
      app: this.app
    };
  }

  public create_tooltip(
    markup: lsProtocol.MarkupContent,
    cm_editor: CodeMirror.Editor,
    position: IEditorPosition
  ): FreeTooltip {
    this.remove_tooltip();
    const bundle =
      markup.kind === 'plaintext'
        ? { 'text/plain': markup.value }
        : { 'text/markdown': markup.value };
    const tooltip = new FreeTooltip({
      anchor: this.widget.content,
      bundle: bundle,
      editor: this.find_ce_editor(cm_editor),
      rendermime: this.rendermime_registry,
      position: PositionConverter.cm_to_ce(position),
      moveToLineEnd: false
    });
    Widget.attach(tooltip, document.body);
    this._tooltip = tooltip;
    return tooltip;
  }

  remove_tooltip() {
    if (this._tooltip !== undefined) {
      this._tooltip.dispose();
    }
  }
}
