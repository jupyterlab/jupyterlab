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
import { Notebook, NotebookModel } from '@jupyterlab/notebook';
import { ICellModel } from '@jupyterlab/cells';

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

const python_notebook_metadata = {
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

function showAllCells(notebook: Notebook) {
  notebook.show();
  // iterate over every cell to activate the editors
  for (let i = 0; i < notebook.model.cells.length; i++) {
    notebook.activeCellIndex = i;
    notebook.activeCell.show();
  }
}

function getCellsJSON(notebook: Notebook) {
  let cells: Array<ICellModel> = [];
  for (let i = 0; i < notebook.model.cells.length; i++) {
    cells.push(notebook.model.cells.get(i));
  }
  return cells.map(cell => cell.toJSON());
}

const js_fib_code = `function fib(n) {
  return n<2?n:fib(n-1)+fib(n-2);
}

fib(5);

window.location /;`;

const js_fib2_code = `function fib2(n) {
  return n<2?n:fib2(n-1)+fib2(n-2);
}

fib2(5);

window.location /;`;

const js_partial_edits = [
  {
    range: {
      start: {
        line: 0,
        character: 9
      },
      end: {
        line: 0,
        character: 12
      }
    },
    newText: 'fib2'
  },
  {
    range: {
      start: {
        line: 1,
        character: 15
      },
      end: {
        line: 1,
        character: 18
      }
    },
    newText: 'fib2'
  },
  {
    range: {
      start: {
        line: 1,
        character: 24
      },
      end: {
        line: 1,
        character: 27
      }
    },
    newText: 'fib2'
  },
  {
    range: {
      start: {
        line: 4,
        character: 0
      },
      end: {
        line: 4,
        character: 3
      }
    },
    newText: 'fib2'
  }
];

describe('Feature', () => {
  describe('apply_edit()', () => {
    class EditApplyingFeature extends CodeMirrorLSPFeature {
      do_apply_edit(workspaceEdit: lsProtocol.WorkspaceEdit) {
        return this.apply_edit(workspaceEdit);
      }
    }
    let connection: LSPConnection;

    let dummy_components_manager: IJupyterLabComponentsManager;

    function init_feature(
      feature_class: typeof CodeMirrorLSPFeature,
      environment: FeatureTestEnvironment
    ) {
      dummy_components_manager = environment.create_dummy_components();
      let virtual_editor = environment.virtual_editor;

      return new feature_class(
        virtual_editor,
        virtual_editor.virtual_document,
        connection,
        dummy_components_manager,
        new StatusMessage()
      );
    }

    function init_adapter(
      environment: FeatureTestEnvironment,
      feature: CodeMirrorLSPFeature
    ) {
      return new CodeMirrorAdapter(
        environment.virtual_editor,
        environment.virtual_editor.virtual_document,
        dummy_components_manager,
        [feature]
      );
    }

    describe('editing in FileEditor', () => {
      let adapter: CodeMirrorAdapter;
      let feature: EditApplyingFeature;
      let environment: FileEditorFeatureTestEnvironment;

      beforeEach(() => {
        environment = new FileEditorFeatureTestEnvironment();
        connection = environment.create_dummy_connection();

        feature = init_feature(
          EditApplyingFeature,
          environment
        ) as EditApplyingFeature;
        adapter = init_adapter(environment, feature);
      });

      afterEach(() => {
        connection.close();
        environment.dispose();
      });

      it('applies simple edit in FileEditor', async () => {
        environment.ce_editor.model.value.text = 'foo bar';
        await environment.virtual_editor.update_documents();
        await adapter.updateAfterChange();

        await feature.do_apply_edit({
          changes: {
            ['file://' + environment.path()]: [
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
        let raw_value = environment.ce_editor.doc.getValue();
        expect(raw_value).to.be.equal('changed bar');
        expect(environment.ce_editor.model.value.text).to.be.equal(
          'changed bar'
        );
      });

      it('applies partial edits', async () => {
        environment.ce_editor.model.value.text = js_fib_code;
        await environment.virtual_editor.update_documents();
        await adapter.updateAfterChange();

        let result = await feature.do_apply_edit({
          changes: { ['file://' + environment.path()]: js_partial_edits }
        });
        let raw_value = environment.ce_editor.doc.getValue();
        expect(raw_value).to.be.equal(js_fib2_code);
        expect(environment.ce_editor.model.value.text).to.be.equal(
          js_fib2_code
        );

        expect(result.appliedChanges).to.be.equal(js_partial_edits.length);
        expect(result.wasGranular).to.be.equal(true);
        expect(result.modifiedCells).to.be.equal(1);
      });
    });

    describe('editing in Notebook', () => {
      let adapter: CodeMirrorAdapter;
      let feature: EditApplyingFeature;
      let environment: NotebookFeatureTestEnvironment;

      beforeEach(() => {
        environment = new NotebookFeatureTestEnvironment(
          () => 'python',
          () => 'notebook.ipynb',
          () => 'py',
          language_specific_overrides,
          foreign_code_extractors
        );

        connection = environment.create_dummy_connection();

        feature = init_feature(
          EditApplyingFeature,
          environment
        ) as EditApplyingFeature;
        adapter = init_adapter(environment, feature);
      });

      afterEach(() => {
        connection.close();
        environment.dispose();
      });

      async function synchronizeContent() {
        await environment.virtual_editor.update_documents();
        try {
          await adapter.updateAfterChange();
        } catch (e) {
          console.warn(e);
        }
      }

      it('applies edit across cells', async () => {
        let test_notebook = {
          cells: [
            code_cell(['def a_function():\n', '    pass']),
            code_cell(['x = a_function()'])
          ],
          metadata: python_notebook_metadata
        } as nbformat.INotebookContent;

        let notebook = environment.notebook;

        notebook.model = new NotebookModel();
        notebook.model.fromJSON(test_notebook);
        showAllCells(notebook);

        await synchronizeContent();
        let main_document = environment.virtual_editor.virtual_document;

        let old_virtual_source =
          'def a_function():\n    pass\n\n\nx = a_function()\n';
        let new_virtual_source =
          'def a_function_2():\n    pass\n\n\nx = a_function_2()\n';
        expect(main_document.value).to.be.equal(old_virtual_source);

        let result = await feature.do_apply_edit({
          changes: {
            ['file://' + environment.path()]: [
              {
                range: {
                  start: { line: 0, character: 0 },
                  end: { line: 5, character: 0 }
                },
                newText: new_virtual_source
              } as lsProtocol.TextEdit
            ]
          }
        });
        await synchronizeContent();

        let value = main_document.value;
        expect(value).to.be.equal(new_virtual_source);

        let code_cells = getCellsJSON(notebook);

        expect(code_cells[0]).to.have.property(
          'source',
          'def a_function_2():\n    pass'
        );
        expect(code_cells[1]).to.have.property('source', 'x = a_function_2()');

        expect(result.appliedChanges).to.be.equal(null);
        expect(result.wasGranular).to.be.equal(false);
        expect(result.modifiedCells).to.be.equal(2);
      });

      it('handles IPython magics', async () => {
        let test_notebook = {
          cells: [
            code_cell(['x = %ls\n', 'print(x)']),
            code_cell(['%%python\n', 'y = x\n', 'print(x)'])
          ],
          metadata: python_notebook_metadata
        } as nbformat.INotebookContent;

        let notebook = environment.notebook;

        notebook.model = new NotebookModel();
        notebook.model.fromJSON(test_notebook);
        showAllCells(notebook);

        let main_document = environment.virtual_editor.virtual_document;

        let old_virtual_source = `x = get_ipython().run_line_magic("ls", "")
print(x)


get_ipython().run_cell_magic("python", "", """y = x
print(x)""")
`;

        let new_virtual_source = `z = get_ipython().run_line_magic("ls", "")
print(z)


get_ipython().run_cell_magic("python", "", """y = x
print(x)""")
`;

        await synchronizeContent();
        expect(main_document.value).to.be.equal(old_virtual_source);

        await feature.do_apply_edit({
          changes: {
            ['file://' + environment.path()]: [
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
        await synchronizeContent();
        expect(main_document.value).to.be.equal(new_virtual_source);

        let code_cells = getCellsJSON(notebook);

        expect(code_cells[0]).to.have.property('source', 'z = %ls\nprint(z)');
        expect(code_cells[1]).to.have.property(
          'source',
          '%%python\ny = x\nprint(x)'
        );
      });
    });
  });
});
