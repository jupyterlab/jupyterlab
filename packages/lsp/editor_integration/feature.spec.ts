import { PageConfig } from '@jupyterlab/coreutils';
import * as nbformat from '@jupyterlab/nbformat';
import { NotebookModel } from '@jupyterlab/notebook';
import { expect } from 'chai';
import * as lsProtocol from 'vscode-languageserver-protocol';

import { foreign_code_extractors } from '../transclusions/ipython/extractors';
import { overrides } from '../transclusions/ipython/overrides';

import { CodeMirrorIntegration } from './codemirror';
import {
  FileEditorFeatureTestEnvironment,
  NotebookFeatureTestEnvironment,
  code_cell,
  getCellsJSON,
  python_notebook_metadata,
  showAllCells
} from './testutils';

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
  PageConfig.setOption('rootUri', 'file://');

  describe('apply_edit()', () => {
    class EditApplyingFeatureCM extends CodeMirrorIntegration {
      do_apply_edit(workspaceEdit: lsProtocol.WorkspaceEdit) {
        return this.apply_edit(workspaceEdit);
      }
    }

    describe('editing in FileEditor', () => {
      let feature: EditApplyingFeatureCM;
      let environment: FileEditorFeatureTestEnvironment;

      beforeEach(() => {
        environment = new FileEditorFeatureTestEnvironment();
        feature = environment.init_integration({
          constructor: EditApplyingFeatureCM,
          id: 'EditApplyingFeature'
        });
      });

      afterEach(() => {
        environment.dispose();
      });

      it('applies simple edit in FileEditor', async () => {
        environment.ce_editor.model.value.text = 'foo bar';
        await environment.adapter.update_documents();

        let outcome = await feature.do_apply_edit({
          changes: {
            ['file:///' + environment.document_options.path]: [
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
        expect(outcome.wasGranular).to.be.equal(false);
        expect(outcome.modifiedCells).to.be.equal(1);
        expect(outcome.appliedChanges).to.be.equal(1);
      });

      it('correctly summarizes empty edit', async () => {
        environment.ce_editor.model.value.text = 'foo bar';
        await environment.adapter.update_documents();

        let outcome = await feature.do_apply_edit({
          changes: {
            ['file:///' + environment.document_options.path]: []
          }
        });
        let raw_value = environment.ce_editor.doc.getValue();
        expect(raw_value).to.be.equal('foo bar');
        expect(environment.ce_editor.model.value.text).to.be.equal('foo bar');
        expect(outcome.wasGranular).to.be.equal(false);
        expect(outcome.appliedChanges).to.be.equal(0);
        expect(outcome.modifiedCells).to.be.equal(0);
      });

      it('applies partial edits', async () => {
        environment.ce_editor.model.value.text = js_fib_code;
        await environment.adapter.update_documents();

        let result = await feature.do_apply_edit({
          changes: {
            ['file:///' + environment.document_options.path]: js_partial_edits
          }
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
      let feature: EditApplyingFeatureCM;
      let environment: NotebookFeatureTestEnvironment;

      beforeEach(() => {
        environment = new NotebookFeatureTestEnvironment({
          overrides_registry: {
            python: {
              cell: overrides.filter(override => override.scope == 'cell'),
              line: overrides.filter(override => override.scope == 'line')
            }
          },
          foreign_code_extractors: foreign_code_extractors
        });

        feature = environment.init_integration({
          constructor: EditApplyingFeatureCM,
          id: 'EditApplyingFeature'
        });
      });

      afterEach(() => {
        environment.dispose();
      });

      async function synchronizeContent() {
        await environment.adapter.update_documents();
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

        let outcome = await feature.do_apply_edit({
          changes: {
            [main_document.document_info.uri]: [
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

        expect(outcome.appliedChanges).to.be.equal(1);
        expect(outcome.wasGranular).to.be.equal(false);
        expect(outcome.modifiedCells).to.be.equal(2);
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
            [main_document.document_info.uri]: [
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
