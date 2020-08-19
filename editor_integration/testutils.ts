import {
  CodeMirrorEditor,
  CodeMirrorEditorFactory, CodeMirrorMimeTypeService
} from '@jupyterlab/codemirror';
import { IVirtualEditor} from '../virtual/editor';
import { LSPConnection } from '../connection';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { StatusMessage, WidgetAdapter } from '../adapters/adapter';
import { Notebook, NotebookModel, NotebookPanel } from '@jupyterlab/notebook';
import { initNotebookContext, NBTestUtils } from '@jupyterlab/testutils';
import { IOverridesRegistry } from '../magics/overrides';
import { IForeignCodeExtractorsRegistry } from '../extractors/types';
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
import { CodeMirrorVirtualEditor } from "../virtual/codemirror_editor";
import { WidgetAdapterConstructor } from "../tokens";
import { FileEditorAdapter } from "../adapters/file_editor/file_editor";
import { NotebookAdapter } from "../adapters/notebook/notebook";
import { Context, IDocumentWidget, TextModelFactory } from "@jupyterlab/docregistry";
import createNotebookPanel = NBTestUtils.createNotebookPanel;
import { FileEditor, FileEditorFactory } from "@jupyterlab/fileeditor";
import { ServiceManager } from "@jupyterlab/services";

interface IFeatureTestEnvironment {
  virtual_editor: CodeMirrorVirtualEditor;

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

export abstract class FeatureTestEnvironment
  implements IFeatureTestEnvironment {
  virtual_editor: CodeMirrorVirtualEditor;
  status_message: StatusMessage;
  private connections: Map<CodeMirrorIntegration, LSPConnection>;
  protected abstract adapter_type: WidgetAdapterConstructor<any>;
  adapter: WidgetAdapter<any>;
  abstract widget: IDocumentWidget;

  protected constructor(
    public language: string,
    public path: string,
    public file_extension: string
  ) {
    this.connections = new Map();
  }

  async init() {
    this.virtual_editor = this.create_virtual_editor();
    this.status_message = new StatusMessage();
  }

  abstract create_virtual_editor(): CodeMirrorVirtualEditor;

  public init_integration<T extends CodeMirrorIntegration>(
    integration_type: CodeMirrorIntegrationConstructor,
    register = true,
    document: VirtualDocument = null
  ): T {
    let connection = this.create_dummy_connection();
    const feature = new integration_type({
      feature: null,
      virtual_editor: this.virtual_editor,
      virtual_document: document
        ? document
        : this.virtual_editor.virtual_document,
      connection: connection,
      status_message: this.status_message,
      settings: null,
      // TODO
      adapter: new this.adapter_type(null, this.widget)
    });
    this.connections.set(feature as CodeMirrorIntegration, connection);

    if (register) {
      feature.register();
    }

    return feature as T;
  }

  public dispose_feature(feature: CodeMirrorIntegration) {
    let connection = this.connections.get(feature);
    connection.close();
    feature.is_registered = false;
  }

  public create_dummy_connection() {
    return new LSPConnection({
      languageId: this.language,
      serverUri: 'ws://localhost:8080',
      rootUri: 'file:///unit-test'
    });
  }

  dispose(): void {
  }
}

export class FileEditorFeatureTestEnvironment extends FeatureTestEnvironment {
  connection_manager: DocumentConnectionManager;
  language_server_manager: LanguageServerManager;
  protected adapter_type = FileEditorAdapter;
  widget: IDocumentWidget<FileEditor>

  constructor(
    language = 'python',
    path = 'dummy.py',
    file_extension = 'py'
  ) {
    super(language, path, file_extension);

    this.language_server_manager = new MockLanguageServerManager({});
    this.connection_manager = new DocumentConnectionManager({
      language_server_manager: this.language_server_manager
    });
  }

  get ce_editor(): CodeMirrorEditor {
    return this.widget.content.editor as CodeMirrorEditor;
  }

  async init(): Promise<void> {
    let factory = new FileEditorFactory({
      editorServices: {
        factoryService: new CodeMirrorEditorFactory(),
        mimeTypeService: new CodeMirrorMimeTypeService()
      },
      factoryOptions: {
        name: 'Editor',
        fileTypes: ['*']
      }
    })
    this.widget = factory.createNew(new Context({
      manager: new ServiceManager({ standby: 'never' }),
      factory: new TextModelFactory(),
      path: this.path
    }));
    await super.init();
  }

  create_virtual_editor(): CodeMirrorVirtualEditor {
    return new CodeMirrorVirtualEditor(
      {
        adapter: this.adapter,
        virtual_document: new VirtualDocument({
          language: this.language,
          file_extension: this.file_extension,
          path: this.path,
          has_lsp_supported_file: true,
          standalone: true,
          foreign_code_extractors: {},
          overrides_registry: {}
        })
      }
    );
  }

  dispose(): void {
    super.dispose();
    this.ce_editor.dispose();
  }
}

export class NotebookFeatureTestEnvironment extends FeatureTestEnvironment {
  public widget: NotebookPanel;
  protected adapter_type = NotebookAdapter;

  get notebook(): Notebook {
    return this.widget.content;
  }

  constructor(
    language = 'python',
    path = 'notebook.ipynb',
    file_extension = 'py',
    public overrides_registry: IOverridesRegistry = {},
    public foreign_code_extractors: IForeignCodeExtractorsRegistry = {}
  ) {
    super(language, path, file_extension);
  }

  async init(): Promise<void> {
    let context = await initNotebookContext();
    this.widget = createNotebookPanel(context);
    await super.init();
  }

  create_virtual_editor(): CodeMirrorVirtualEditor{
    return new CodeMirrorVirtualEditor({
      adapter: this.adapter,
      virtual_document: new VirtualDocument({
        language: this.language,
        file_extension: this.file_extension,
        path: this.path,
        has_lsp_supported_file: true,
        standalone: true,
        foreign_code_extractors: {},
        overrides_registry: {}
      })
    })
  }
}

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
  environment: FeatureTestEnvironment,
  adapter: EditorAdapter<IVirtualEditor<IEditor>>
) {
  await environment.adapter.update_documents();
  try {
    await adapter.updateAfterChange();
  } catch (e) {
    console.warn(e);
  }
}
