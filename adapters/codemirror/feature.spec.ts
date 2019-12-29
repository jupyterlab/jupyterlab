import { expect } from 'chai';
import { CodeMirrorAdapter } from './cm_adapter';
import { LSPConnection } from '../../connection';
import {
  IJupyterLabComponentsManager,
  StatusMessage
} from '../jupyterlab/jl_adapter';
import { CodeMirrorLSPFeature } from './feature';
import {
  FeatureTestEnvironment,
  FileEditorFeatureTestEnvironment,
  NotebookFeatureTestEnvironment
} from './testutils';
import * as lsProtocol from 'vscode-languageserver-protocol';
import { nbformat } from '@jupyterlab/coreutils';
import { language_specific_overrides } from '../../magics/defaults';
import { foreign_code_extractors } from '../../extractors/defaults';
import { NotebookModel } from '@jupyterlab/notebook';

describe('Feature', () => {
  let environment: FeatureTestEnvironment;

  afterEach(() => environment.dispose());

  describe('apply_edit()', () => {
    class EditApplyingFeatureForFile extends CodeMirrorLSPFeature {
      do_apply_edit(workspaceEdit: lsProtocol.WorkspaceEdit) {
        return this.apply_edit(workspaceEdit);
      }
    }
    let connection: LSPConnection;

    function init_feature(feature_class: typeof CodeMirrorLSPFeature) {
      let dummy_components_manager: IJupyterLabComponentsManager;

      dummy_components_manager = environment.create_dummy_components();
      let virtual_editor = environment.virtual_editor;

      let feature = new feature_class(
        virtual_editor,
        virtual_editor.virtual_document,
        connection,
        dummy_components_manager,
        new StatusMessage()
      );

      let adapter = new CodeMirrorAdapter(
        virtual_editor,
        virtual_editor.virtual_document,
        dummy_components_manager,
        [feature]
      );

      return { adapter, feature };
    }

    it('applies simple edit in FileEditor', async () => {
      environment = new FileEditorFeatureTestEnvironment();
      connection = environment.create_dummy_connection();

      let { adapter, feature: feature_raw } = init_feature(
        EditApplyingFeatureForFile
      );
      let feature = feature_raw as EditApplyingFeatureForFile;

      let env = environment as FileEditorFeatureTestEnvironment;

      env.ce_editor.model.value.text = 'foo bar';
      await env.virtual_editor.update_documents();
      await adapter.updateAfterChange();

      await feature.do_apply_edit({
        changes: {
          ['file://' + env.path()]: [
            {
              range: {
                start: { line: 0, character: 0 },
                end: { line: 1, character: 0 }
              },
              newText: 'changed bar'
            } as lsProtocol.TextEdit
          ]
        }
      });
      let raw_value = env.ce_editor.doc.getValue();
      expect(raw_value).to.be.equal('changed bar');
      expect(env.ce_editor.model.value.text).to.be.equal('changed bar');
      connection.close();
    });

    it('applies edit in Notebook', async () => {
      environment = new NotebookFeatureTestEnvironment(
        () => 'python',
        () => 'notebook.ipynb',
        () => 'py',
        language_specific_overrides,
        foreign_code_extractors
      );

      connection = environment.create_dummy_connection();
      let env = environment as NotebookFeatureTestEnvironment;

      let { adapter, feature: feature_raw } = init_feature(
        EditApplyingFeatureForFile
      );
      let feature = feature_raw as EditApplyingFeatureForFile;

      let notebook = (env as NotebookFeatureTestEnvironment).notebook;

      function code_cell(
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

      let metadata = {
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

      let test_notebook = {
        cells: [
          code_cell(['def a_function():\n', '    pass']),
          code_cell(['x = a_function()'])
        ],
        metadata: metadata
      } as nbformat.INotebookContent;

      notebook.model = new NotebookModel();
      notebook.model.fromJSON(test_notebook);
      notebook.show();
      // TODO: iterate over every cell to activate the editors
      for (let i = 0; i < notebook.model.cells.length; i++) {
        notebook.activeCellIndex = i;
        notebook.activeCell.show();
      }

      await env.virtual_editor.update_documents();
      try {
        await adapter.updateAfterChange();
      } catch (e) {
        console.warn(e);
      }
      let main_document = env.virtual_editor.virtual_document;

      let old_virtual_source =
        'def a_function():\n    pass\n\n\nx = a_function()\n';
      let new_virtual_source =
        'def a_function_2():\n    pass\n\n\nx = a_function_2()\n';
      expect(main_document.value).to.be.equal(old_virtual_source);

      await feature.do_apply_edit({
        changes: {
          ['file://' + env.path()]: [
            {
              range: {
                start: { line: 0, character: 0 },
                end: { line: 6, character: 10 }
              },
              newText: new_virtual_source
            } as lsProtocol.TextEdit
          ]
        }
      });
      await env.virtual_editor.update_documents();
      try {
        await adapter.updateAfterChange();
      } catch (e) {
        console.warn(e);
      }

      let value = main_document.value;
      expect(value).to.be.equal(new_virtual_source);

      expect(notebook.model.cells.get(0).toJSON()).to.have.property(
        'source',
        'def a_function_2():\n    pass'
      );
      expect(notebook.model.cells.get(1).toJSON()).to.have.property(
        'source',
        'x = a_function_2()'
      );
      connection.close();
    });
  });
});
