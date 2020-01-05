import { expect } from 'chai';
import { TextMarker } from 'codemirror';
import { Diagnostics, diagnostics_panel } from './diagnostics';
import {
  code_cell,
  FileEditorFeatureTestEnvironment,
  NotebookFeatureTestEnvironment,
  set_notebook_content,
  showAllCells
} from '../testutils';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';

describe('Diagnostics', () => {
  let feature: Diagnostics;

  describe('FileEditor integration', () => {
    let env: FileEditorFeatureTestEnvironment;

    beforeEach(() => {
      env = new FileEditorFeatureTestEnvironment();
      feature = env.init_feature(Diagnostics);
    });
    afterEach(() => {
      env.dispose();
      env.dispose_feature(feature);
    });

    it('calls parent register()', () => {
      feature.register();
      expect(feature.is_registered).to.equal(true);
    });

    it('renders inspections', async () => {
      env.ce_editor.model.value.text = ' foo \n bar \n baz ';
      await env.virtual_editor.update_documents();

      let markers: TextMarker[];

      markers = env.ce_editor.editor.getDoc().getAllMarks();
      expect(markers.length).to.equal(0);

      feature.handleDiagnostic({
        uri: env.path(),
        diagnostics: [
          {
            range: {
              start: { line: 0, character: 1 },
              end: { line: 0, character: 4 }
            },
            message: 'Undefined symbol'
          }
        ]
      });

      let marks = env.ce_editor.editor.getDoc().getAllMarks();
      expect(marks.length).to.equal(1);
    });
  });

  describe('Notebook integration', () => {
    let env: NotebookFeatureTestEnvironment;

    beforeEach(() => {
      env = new NotebookFeatureTestEnvironment();
      feature = env.init_feature(Diagnostics);
    });
    afterEach(() => {
      env.dispose();
      env.dispose_feature(feature);
    });

    it('renders inspections across cells', async () => {
      set_notebook_content(env.notebook, [
        code_cell(['x =1\n', 'test']),
        code_cell(['    '])
      ]);
      showAllCells(env.notebook);
      await env.virtual_editor.update_documents();

      let document = env.virtual_editor.virtual_document;
      let uri = env.virtual_editor.virtual_document.uri;

      feature.handleDiagnostic({
        uri: uri,
        diagnostics: [
          {
            source: 'pyflakes',
            range: {
              start: { line: 1, character: 0 },
              end: { line: 1, character: 5 }
            },
            message: "undefined name 'test'",
            severity: 1
          },
          {
            source: 'pycodestyle',
            range: {
              start: { line: 0, character: 3 },
              end: { line: 0, character: 5 }
            },
            message: 'E225 missing whitespace around operator',
            code: 'E225',
            severity: 2
          },
          {
            source: 'pycodestyle',
            range: {
              start: { line: 4, character: 0 },
              end: { line: 4, character: 5 }
            },
            message: 'W391 blank line at end of file',
            code: 'W391',
            severity: 2
          },
          {
            source: 'pycodestyle',
            range: {
              start: { line: 4, character: 0 },
              end: { line: 4, character: 5 }
            },
            message: 'W293 blank line contains whitespace',
            code: 'W293',
            severity: 2
          },
          {
            source: 'mypy',
            range: {
              start: { line: 1, character: 0 },
              end: { line: 1, character: 4 }
            },
            message: "Name 'test' is not defined",
            severity: 1
          }
        ]
      });

      let cm_editors = env.virtual_editor.notebook.widgets.map(
        cell => (cell.editor as CodeMirrorEditor).editor
      );
      let marks_cell_1 = cm_editors[0].getDoc().getAllMarks();
      // test from mypy, test from pyflakes, whitespace around operator from pycodestyle
      expect(marks_cell_1.length).to.equal(3);

      // W391 and W293 should get merged into a single diagnostic (same range)
      let marks_cell_2 = cm_editors[1].getDoc().getAllMarks();
      expect(marks_cell_2.length).to.equal(1);

      let mark_cell_2 = marks_cell_2[0];
      let merged_mark_title = (mark_cell_2 as any).title;
      expect(merged_mark_title).to.contain('W391');
      expect(merged_mark_title).to.contain('W293');
      // should be separated by new line
      expect(merged_mark_title).to.contain('\n');

      expect(feature.diagnostics_db.size).to.equal(1);
      expect(feature.diagnostics_db.get(document).length).to.equal(5);

      feature.switchDiagnosticsPanelSource();
      diagnostics_panel.widget.content.update();
      // the panel should contain all 5 diagnostics
      let db = diagnostics_panel.content.model.diagnostics;
      expect(db.size).to.equal(1);
      expect(db.get(document).length).to.equal(5);
    });
  });
});
