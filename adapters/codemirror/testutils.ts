import {
  CodeMirrorEditor,
  CodeMirrorEditorFactory
} from '@jupyterlab/codemirror';
import { VirtualEditor } from '../../virtual/editor';
import { CodeMirrorLSPFeature } from './feature';
import { LSPConnection } from '../../connection';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { VirtualFileEditor } from '../../virtual/editors/file_editor';
import { FreeTooltip } from '../jupyterlab/components/free_tooltip';
import {
  IJupyterLabComponentsManager,
  StatusMessage
} from '../jupyterlab/jl_adapter';

interface IFeatureTestEnvironment {
  host: HTMLElement;
  ce_editor: CodeMirrorEditor;
  virtual_editor: VirtualEditor;

  dispose(): void;
}

export class FeatureTestEnvironment implements IFeatureTestEnvironment {
  ce_editor: CodeMirrorEditor;
  host: HTMLElement;
  virtual_editor: VirtualEditor;
  private connections: Map<CodeMirrorLSPFeature, LSPConnection>;

  constructor(
    protected language = () => 'python',
    protected path = () => 'dummy.py',
    protected file_extension = () => 'py'
  ) {
    const factoryService = new CodeMirrorEditorFactory();
    this.connections = new Map();

    this.host = document.createElement('div');
    document.body.appendChild(this.host);
    let model = new CodeEditor.Model();

    this.ce_editor = factoryService.newDocumentEditor({
      host: this.host,
      model
    });
    this.virtual_editor = new VirtualFileEditor(
      language,
      file_extension,
      path,
      this.ce_editor.editor
    );
  }

  public init_feature<T extends CodeMirrorLSPFeature>(
    feature_type: typeof CodeMirrorLSPFeature,
    register = true
  ): T {
    let dummy_components_manager = this.create_dummy_components();
    let connection = this.create_dummy_connection();
    const feature = new feature_type(
      this.virtual_editor,
      this.virtual_editor.virtual_document,
      connection,
      dummy_components_manager,
      new StatusMessage()
    );
    this.connections.set(feature, connection);

    if (register) {
      feature.register();
    }

    return feature as T;
  }

  public dispose_feature(feature: CodeMirrorLSPFeature) {
    let connection = this.connections.get(feature);
    connection.close();
    feature.is_registered = false;
  }

  public create_dummy_connection() {
    return new LSPConnection({
      languageId: this.language(),
      serverUri: '',
      documentUri: '/' + this.path,
      rootUri: '/',
      documentText: () => {
        this.virtual_editor.update_documents().catch(console.log);
        return this.virtual_editor.virtual_document.value;
      }
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
      jumper: null
    };
  }

  dispose(): void {
    document.body.removeChild(this.host);
    this.ce_editor.dispose();
  }
}
