import {
  CodeMirrorEditor,
  CodeMirrorEditorFactory
} from '@jupyterlab/codemirror';
import { VirtualCodeMirrorEditor } from '../../virtual/editor';
import { LSPConnection } from '../../connection';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { VirtualFileEditor } from '../../virtual/editors/file_editor';
import { FreeTooltip } from '../jupyterlab/components/free_tooltip';
import {
  IJupyterLabComponentsManager,
  StatusMessage
} from '../jupyterlab/jl_adapter';
import { VirtualEditorForNotebook } from '../../virtual/editors/notebook';
import { Notebook, NotebookModel } from '@jupyterlab/notebook';
import { NBTestUtils } from '@jupyterlab/testutils';
import { IOverridesRegistry } from '../../magics/overrides';
import { IForeignCodeExtractorsRegistry } from '../../extractors/types';
import * as nbformat from '@jupyterlab/nbformat';
import { ICellModel } from '@jupyterlab/cells';
import { CodeMirrorAdapter } from './cm_adapter';
import { VirtualDocument } from '../../virtual/document';
import { LanguageServerManager } from '../../manager';
import { DocumentConnectionManager } from '../../connection_manager';
import createNotebook = NBTestUtils.createNotebook;
import { CodeMirrorIntegration, IFeatureSettings, ILSPFeatureConstructor } from "../../editor_integration/codemirror";

interface IFeatureTestEnvironment {
  host: HTMLElement;
  virtual_editor: VirtualCodeMirrorEditor;

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
  host: HTMLElement;
  virtual_editor: VirtualCodeMirrorEditor;
  private connections: Map<CodeMirrorIntegration, LSPConnection>;

  protected constructor(
    public language: () => string,
    public path: () => string,
    public file_extension: () => string
  ) {
    this.connections = new Map();
    this.host = document.createElement('div');
    document.body.appendChild(this.host);
  }

  init() {
    this.virtual_editor = this.create_virtual_editor();
  }

  abstract create_virtual_editor(): VirtualCodeMirrorEditor;

  public init_feature<T extends CodeMirrorIntegration>(
    feature_type: ILSPFeatureConstructor,
    register = true,
    document: VirtualDocument = null
  ): T {
    let dummy_components_manager = this.create_dummy_components();
    let connection = this.create_dummy_connection();
    const feature = new feature_type(
      this.virtual_editor,
      document ? document : this.virtual_editor.virtual_document,
      connection,
      dummy_components_manager,
      new StatusMessage()
    );
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
      languageId: this.language(),
      serverUri: 'ws://localhost:8080',
      rootUri: 'file:///unit-test'
    });
  }

  public create_dummy_components(): IJupyterLabComponentsManager {
    return {
      invoke_completer: () => {
        // nothing yet
      },
      create_tooltip: () => {
        return {} as FreeTooltip;
      },
      remove_tooltip: () => {
        // nothing yet
      },
      jumper: null,
      isDisposed: false,
      dispose: () => {
        // nothing yet
      }
    };
  }

  dispose(): void {
    document.body.removeChild(this.host);
  }
}

export class FileEditorFeatureTestEnvironment extends FeatureTestEnvironment {
  ce_editor: CodeMirrorEditor;
  connection_manager: DocumentConnectionManager;
  language_server_manager: LanguageServerManager;

  constructor(
    language = () => 'python',
    path = () => 'dummy.py',
    file_extension = () => 'py'
  ) {
    super(language, path, file_extension);
    const factoryService = new CodeMirrorEditorFactory();
    let model = new CodeEditor.Model();

    this.ce_editor = factoryService.newDocumentEditor({
      host: this.host,
      model
    });

    this.language_server_manager = new MockLanguageServerManager({});
    this.connection_manager = new DocumentConnectionManager({
      language_server_manager: this.language_server_manager
    });

    this.init();
  }

  create_virtual_editor(): VirtualFileEditor {
    return new VirtualFileEditor(
      this.language,
      this.file_extension,
      this.path,
      this.ce_editor.editor
    );
  }

  dispose(): void {
    super.dispose();
    this.ce_editor.dispose();
  }
}

export class NotebookFeatureTestEnvironment extends FeatureTestEnvironment {
  public notebook: Notebook;
  virtual_editor: VirtualEditorForNotebook;
  public wrapper: HTMLElement;

  constructor(
    language = () => 'python',
    path = () => 'notebook.ipynb',
    file_extension = () => 'py',
    public overrides_registry: IOverridesRegistry = {},
    public foreign_code_extractors: IForeignCodeExtractorsRegistry = {}
  ) {
    super(language, path, file_extension);
    this.notebook = createNotebook();
    this.wrapper = document.createElement('div');
    this.init();
  }

  create_virtual_editor(): VirtualEditorForNotebook {
    return new VirtualEditorForNotebook(
      this.notebook,
      this.wrapper,
      this.language,
      this.file_extension,
      this.overrides_registry,
      this.foreign_code_extractors,
      this.path
    );
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
  adapter: CodeMirrorAdapter
) {
  await environment.virtual_editor.update_documents();
  try {
    await adapter.updateAfterChange();
  } catch (e) {
    console.warn(e);
  }
}

export class DummySettings implements IFeatureSettings {
  get(setting: string): any {
    return null;
  }

  set(setting: string, value: any): void {
    return;
  }
}
