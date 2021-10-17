import { JupyterFrontEnd } from '@jupyterlab/application';
import { ICellModel } from '@jupyterlab/cells';
import { CodeEditor } from '@jupyterlab/codeeditor';
import {
  CodeMirrorEditor,
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService
} from '@jupyterlab/codemirror';
import {
  Context,
  IDocumentWidget,
  TextModelFactory
} from '@jupyterlab/docregistry';
import { FileEditor, FileEditorFactory } from '@jupyterlab/fileeditor';
import { ILoggerRegistry } from '@jupyterlab/logconsole';
import * as nbformat from '@jupyterlab/nbformat';
import {
  Notebook,
  NotebookModel,
  NotebookModelFactory,
  NotebookPanel
} from '@jupyterlab/notebook';
import { ServiceManager } from '@jupyterlab/services';
import { Mock, NBTestUtils } from '@jupyterlab/testutils';
import { ITranslator } from '@jupyterlab/translation';
import { Signal } from '@lumino/signaling';

import { WidgetAdapter } from '../adapters/adapter';
import { FileEditorAdapter } from '../adapters/file_editor/file_editor';
import { NotebookAdapter } from '../adapters/notebook/notebook';
import { LSPConnection } from '../connection';
import { DocumentConnectionManager } from '../connection_manager';
import { IForeignCodeExtractorsRegistry } from '../extractors/types';
import { IFeatureSettings } from '../feature';
import { FeatureManager, ILSPExtension } from '../index';
import { LanguageServerManager } from '../manager';
import { ICodeOverridesRegistry } from '../overrides/tokens';
import {
  ILSPFeatureManager,
  ILSPLogConsole,
  ILSPVirtualEditorManager,
  WidgetAdapterConstructor
} from '../tokens';
import { CodeMirrorVirtualEditor } from '../virtual/codemirror_editor';
import { BrowserConsole } from '../virtual/console';
import { VirtualDocument } from '../virtual/document';
import { IVirtualEditor, VirtualEditorManager } from '../virtual/editor';

import {
  CodeMirrorIntegration,
  CodeMirrorIntegrationConstructor
} from './codemirror';
import { EditorAdapter } from './editor_adapter';

import createNotebookPanel = NBTestUtils.createNotebookPanel;
import IEditor = CodeEditor.IEditor;

const DEFAULT_SERVER_ID = 'pylsp';

export interface ITestEnvironment {
  document_options: VirtualDocument.IOptions;

  virtual_editor: CodeMirrorVirtualEditor;

  adapter: WidgetAdapter<any>;
  /**
   * Has to be called after construction!
   */
  init(): void;

  dispose(): void;
}

export class MockLanguageServerManager extends LanguageServerManager {
  async fetchSessions() {
    this._sessions = new Map();
    this._sessions.set(DEFAULT_SERVER_ID, {
      spec: {
        languages: ['python']
      }
    } as any);
    this._sessionsChanged.emit(void 0);
  }
}

export class MockSettings<T> implements IFeatureSettings<T> {
  changed: Signal<IFeatureSettings<T>, void>;

  constructor(private settings: T) {
    this.changed = new Signal(this);
  }

  get composite(): T {
    return this.settings;
  }

  set(setting: keyof T, value: any): void {
    this.settings[setting] = value;
  }
}

export class MockExtension implements ILSPExtension {
  app: JupyterFrontEnd;
  connection_manager: DocumentConnectionManager;
  language_server_manager: LanguageServerManager;
  feature_manager: ILSPFeatureManager;
  editor_type_manager: ILSPVirtualEditorManager;
  foreign_code_extractors: IForeignCodeExtractorsRegistry;
  code_overrides: ICodeOverridesRegistry;
  console: ILSPLogConsole;
  user_console: ILoggerRegistry;
  translator: ITranslator;

  constructor() {
    this.app = null;
    this.feature_manager = new FeatureManager();
    this.editor_type_manager = new VirtualEditorManager();
    this.language_server_manager = new MockLanguageServerManager({
      console: new BrowserConsole()
    });
    this.connection_manager = new DocumentConnectionManager({
      language_server_manager: this.language_server_manager,
      console: new BrowserConsole()
    });
    this.editor_type_manager.registerEditorType({
      implementation: CodeMirrorVirtualEditor,
      name: 'CodeMirrorEditor',
      supports: CodeMirrorEditor
    });
    this.foreign_code_extractors = {};
    this.code_overrides = {};
    this.console = new BrowserConsole();
    this.user_console = null;
  }
}

export abstract class TestEnvironment implements ITestEnvironment {
  virtual_editor: CodeMirrorVirtualEditor;
  protected abstract get_adapter_type(): WidgetAdapterConstructor<any>;
  adapter: WidgetAdapter<any>;
  abstract widget: IDocumentWidget;
  protected extension: ILSPExtension;
  protected abstract get_defaults(): VirtualDocument.IOptions;
  public document_options: VirtualDocument.IOptions;

  constructor(options?: Partial<VirtualDocument.IOptions>) {
    this.document_options = {
      ...this.get_defaults(),
      ...(options || {})
    };
    this.extension = new MockExtension();
    this.init();
  }

  protected abstract create_widget(): IDocumentWidget;

  init() {
    this.widget = this.create_widget();
    let adapter_type = this.get_adapter_type();
    this.adapter = new adapter_type(this.extension, this.widget);
    this.virtual_editor = this.create_virtual_editor();
    // override the virtual editor with a mock/test one
    this.adapter.virtual_editor = this.virtual_editor;
    this.adapter.initialized
      .then(() => {
        // override it again after initialization
        // TODO: rewrite tests to async to only override after initialization
        this.adapter.virtual_editor = this.virtual_editor;
      })
      .catch(console.error);
  }

  create_virtual_editor(): CodeMirrorVirtualEditor {
    return new CodeMirrorVirtualEditor({
      adapter: this.adapter,
      virtual_document: new VirtualDocument(this.document_options)
    });
  }

  dispose(): void {
    this.adapter.dispose();
  }
}

export interface IFeatureTestEnvironment extends ITestEnvironment {
  init_integration<T extends CodeMirrorIntegration>(
    options: IFeatureTestEnvironment.IInitOptions
  ): T;

  dispose_feature(feature: CodeMirrorIntegration): void;
}

export namespace IFeatureTestEnvironment {
  export interface IInitOptions {
    constructor: CodeMirrorIntegrationConstructor;
    id: string;
    register?: boolean;
    document?: VirtualDocument;
    settings?: IFeatureSettings<any>;
  }
}

type TestEnvironmentConstructor = new (...args: any[]) => ITestEnvironment;

function FeatureSupport<TBase extends TestEnvironmentConstructor>(Base: TBase) {
  return class FeatureTestEnvironment
    extends Base
    implements IFeatureTestEnvironment
  {
    _connections: Map<CodeMirrorIntegration, LSPConnection>;

    init() {
      this._connections = new Map();
      super.init();
    }

    get status_message() {
      return this.adapter.status_message;
    }

    public init_integration<T extends CodeMirrorIntegration>(
      options: IFeatureTestEnvironment.IInitOptions
    ): T {
      let connection = this.create_dummy_connection();
      let document = options.document
        ? options.document
        : this.virtual_editor.virtual_document;

      let editor_adapter = this.adapter.connect_adapter(document, connection, [
        {
          id: options.id,
          name: options.id,
          editorIntegrationFactory: new Map([
            ['CodeMirrorEditor', options.constructor]
          ]),
          settings: options.settings
        }
      ]);
      this.virtual_editor.virtual_document = document;
      document.changed.connect(async () => {
        await editor_adapter.updateAfterChange();
      });

      let feature = editor_adapter.features.get(options.id);
      this._connections.set(feature as CodeMirrorIntegration, connection);
      return feature as T;
    }

    public dispose_feature(feature: CodeMirrorIntegration) {
      let connection = this._connections.get(feature);
      connection.close();
      feature.is_registered = false;
    }

    public create_dummy_connection() {
      return new LSPConnection({
        languageId: this.document_options.language,
        serverUri: 'ws://localhost:8080',
        rootUri: 'file:///unit-test',
        serverIdentifier: DEFAULT_SERVER_ID,
        console: new BrowserConsole()
      });
    }

    public dispose() {
      super.dispose();
      for (let connection of this._connections.values()) {
        connection.close();
      }
    }
  };
}

export class FileEditorTestEnvironment extends TestEnvironment {
  protected get_adapter_type() {
    return FileEditorAdapter;
  }
  widget: IDocumentWidget<FileEditor>;

  protected get_defaults(): VirtualDocument.IOptions {
    return {
      language: 'python',
      path: 'dummy.py',
      file_extension: 'py',
      has_lsp_supported_file: true,
      standalone: true,
      foreign_code_extractors: {},
      overrides_registry: {},
      console: new BrowserConsole()
    };
  }

  get ce_editor(): CodeMirrorEditor {
    return this.widget.content.editor as CodeMirrorEditor;
  }

  create_widget(): IDocumentWidget {
    let factory = new FileEditorFactory({
      editorServices: {
        factoryService: new CodeMirrorEditorFactory(),
        mimeTypeService: new CodeMirrorMimeTypeService()
      },
      factoryOptions: {
        name: 'Editor',
        fileTypes: ['*']
      }
    });
    const context = new Context({
      manager: new Mock.ServiceManagerMock(),
      factory: new TextModelFactory(),
      path: this.document_options.path
    });
    return factory.createNew(context);
  }

  dispose(): void {
    super.dispose();
    this.ce_editor.dispose();
  }
}

export class NotebookTestEnvironment extends TestEnvironment {
  public widget: NotebookPanel;
  protected get_adapter_type() {
    return NotebookAdapter;
  }

  get notebook(): Notebook {
    return this.widget.content;
  }

  protected get_defaults(): VirtualDocument.IOptions {
    return {
      language: 'python',
      path: 'notebook.ipynb',
      file_extension: 'py',
      overrides_registry: {},
      foreign_code_extractors: {},
      has_lsp_supported_file: false,
      standalone: true,
      console: new BrowserConsole()
    };
  }

  create_widget(): IDocumentWidget {
    let context = new Context({
      manager: new ServiceManager({ standby: 'never' }),
      factory: new NotebookModelFactory({}),
      path: this.document_options.path
    });
    return createNotebookPanel(context);
  }
}

export class FileEditorFeatureTestEnvironment extends FeatureSupport(
  FileEditorTestEnvironment
) {}
export class NotebookFeatureTestEnvironment extends FeatureSupport(
  NotebookTestEnvironment
) {}

export function code_cell(
  source: string[] | string,
  metadata: Partial<nbformat.ICodeCellMetadata> = { trusted: false }
) {
  return {
    cell_type: 'code',
    source: source,
    metadata: metadata,
    execution_count: null,
    outputs: []
  } as nbformat.ICodeCell;
}

export function set_notebook_content(
  notebook: Notebook,
  cells: nbformat.ICodeCell[],
  metadata = python_notebook_metadata
) {
  let test_notebook = {
    cells: cells,
    metadata: metadata
  } as nbformat.INotebookContent;

  notebook.model = new NotebookModel();
  notebook.model.fromJSON(test_notebook);
}

export const python_notebook_metadata = {
  kernelspec: {
    display_name: 'Python [default]',
    language: 'python',
    name: 'python3'
  },
  language_info: {
    codemirror_mode: {
      name: 'ipython',
      version: 3
    },
    file_extension: '.py',
    mimetype: 'text/x-python',
    name: 'python',
    nbconvert_exporter: 'python',
    pygments_lexer: 'ipython3',
    version: '3.5.2'
  },
  orig_nbformat: 4.1
} as nbformat.INotebookMetadata;

export function showAllCells(notebook: Notebook) {
  notebook.show();
  // iterate over every cell to activate the editors
  for (let i = 0; i < notebook.model.cells.length; i++) {
    notebook.activeCellIndex = i;
    notebook.activeCell.show();
  }
}

export function getCellsJSON(notebook: Notebook): Array<nbformat.ICell> {
  let cells: Array<ICellModel> = [];
  for (let i = 0; i < notebook.model.cells.length; i++) {
    cells.push(notebook.model.cells.get(i));
  }
  return cells.map(cell => cell.toJSON());
}

export async function synchronize_content(
  environment: IFeatureTestEnvironment,
  adapter: EditorAdapter<IVirtualEditor<IEditor>>
) {
  await environment.adapter.update_documents();
  try {
    await adapter.updateAfterChange();
  } catch (e) {
    console.warn(e);
  }
}
