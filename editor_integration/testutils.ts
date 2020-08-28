import {
  CodeMirrorEditor,
  CodeMirrorEditorFactory,
  CodeMirrorMimeTypeService
} from '@jupyterlab/codemirror';
import { IVirtualEditor, VirtualEditorManager } from '../virtual/editor';
import { LSPConnection } from '../connection';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { WidgetAdapter } from '../adapters/adapter';
import {
  Notebook,
  NotebookModel,
  NotebookModelFactory,
  NotebookPanel
} from '@jupyterlab/notebook';
import { NBTestUtils } from '@jupyterlab/testutils';
import * as nbformat from '@jupyterlab/nbformat';
import { ICellModel } from '@jupyterlab/cells';
import { VirtualDocument } from '../virtual/document';
import { LanguageServerManager } from '../manager';
import { DocumentConnectionManager } from '../connection_manager';
import {
  CodeMirrorIntegration,
  CodeMirrorIntegrationConstructor
} from './codemirror';
import { EditorAdapter } from './editor_adapter';
import IEditor = CodeEditor.IEditor;
import { CodeMirrorVirtualEditor } from '../virtual/codemirror_editor';
import {
  ILSPFeatureManager,
  ILSPVirtualEditorManager,
  WidgetAdapterConstructor
} from '../tokens';
import { FileEditorAdapter } from '../adapters/file_editor/file_editor';
import { NotebookAdapter } from '../adapters/notebook/notebook';
import {
  Context,
  IDocumentWidget,
  TextModelFactory
} from '@jupyterlab/docregistry';
import createNotebookPanel = NBTestUtils.createNotebookPanel;
import { FileEditor, FileEditorFactory } from '@jupyterlab/fileeditor';
import { ServiceManager } from '@jupyterlab/services';
import { FeatureManager, ILSPExtension } from '../index';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { IFeatureSettings } from '../feature';
import { IForeignCodeExtractorsRegistry } from '../extractors/types';

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
    this._sessions.set('pyls', {
      spec: {
        languages: ['python']
      }
    } as any);
    this._sessionsChanged.emit(void 0);
  }
}

export class MockSettings<T> implements IFeatureSettings<T> {
  constructor(private settings: T) {}
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

  constructor() {
    this.app = null;
    this.feature_manager = new FeatureManager();
    this.editor_type_manager = new VirtualEditorManager();
    this.language_server_manager = new MockLanguageServerManager({});
    this.connection_manager = new DocumentConnectionManager({
      language_server_manager: this.language_server_manager
    });
    this.editor_type_manager.registerEditorType({
      implementation: CodeMirrorVirtualEditor,
      name: 'CodeMirrorEditor',
      supports: CodeMirrorEditor
    });
    this.foreign_code_extractors = {};
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
    this.adapter.virtual_editor = this.virtual_editor;
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
  return class FeatureTestEnvironment extends Base
    implements IFeatureTestEnvironment {
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
        rootUri: 'file:///unit-test'
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
      overrides_registry: {}
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
    return factory.createNew(
      new Context({
        manager: new ServiceManager({ standby: 'never' }),
        factory: new TextModelFactory(),
        path: this.document_options.path
      })
    );
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
      standalone: true
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
  metadata: object = { trusted: false }
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

export function getCellsJSON(notebook: Notebook) {
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
