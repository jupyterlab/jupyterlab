import { expect } from 'chai';
import { TextMarker } from 'codemirror';
import {
  Diagnostics,
  diagnostics_panel,
  message_without_code,
} from './diagnostics';
import {
  code_cell,
  FileEditorFeatureTestEnvironment,
  NotebookFeatureTestEnvironment,
  set_notebook_content,
  showAllCells,
} from '../testutils';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { is_equal } from '../../../positioning';
import { language_specific_overrides } from '../../../magics/defaults';
import { foreign_code_extractors } from '../../../extractors/defaults';
import * as lsProtocol from 'vscode-languageserver-protocol';

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
              end: { line: 0, character: 4 },
            },
            message: 'Undefined symbol',
          },
        ],
      });

      let marks = env.ce_editor.editor.getDoc().getAllMarks();
      expect(marks.length).to.equal(1);
    });
  });

  describe('Notebook integration', () => {
    let env: NotebookFeatureTestEnvironment;

    beforeEach(() => {
      env = new NotebookFeatureTestEnvironment(
        () => 'python',
        () => 'notebook.ipynb',
        () => 'py',
        language_specific_overrides,
        foreign_code_extractors
      );
      feature = env.init_feature(Diagnostics);
    });
    afterEach(() => {
      env.dispose();
      env.dispose_feature(feature);
    });

    it('renders inspections across cells', async () => {
      set_notebook_content(env.notebook, [
        code_cell(['x =1\n', 'test']),
        code_cell(['    ']),
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
              end: { line: 1, character: 5 },
            },
            message: "undefined name 'test'",
            severity: 1,
          },
          {
            source: 'pycodestyle',
            range: {
              start: { line: 0, character: 3 },
              end: { line: 0, character: 5 },
            },
            message: 'E225 missing whitespace around operator',
            code: 'E225',
            severity: 2,
          },
          {
            source: 'pycodestyle',
            range: {
              start: { line: 4, character: 0 },
              end: { line: 4, character: 5 },
            },
            message: 'W391 blank line at end of file',
            code: 'W391',
            severity: 2,
          },
          {
            source: 'pycodestyle',
            range: {
              start: { line: 4, character: 0 },
              end: { line: 4, character: 5 },
            },
            message: 'W293 blank line contains whitespace',
            code: 'W293',
            severity: 2,
          },
          {
            source: 'mypy',
            range: {
              start: { line: 1, character: 0 },
              end: { line: 1, character: 4 },
            },
            message: "Name 'test' is not defined",
            severity: 1,
          },
        ],
      });

      let cm_editors = env.virtual_editor.notebook.widgets.map(
        (cell) => (cell.editor as CodeMirrorEditor).editor
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

    it('Works in foreign documents', async () => {
      set_notebook_content(env.notebook, [
        code_cell(['valid = 0\n', 'code = 1', '# here']),
        code_cell(['%%python\n', 'y = 1\n', 'x']),
      ]);
      showAllCells(env.notebook);
      await env.virtual_editor.update_documents();

      let document = env.virtual_editor.virtual_document;
      expect(document.foreign_documents.size).to.be.equal(1);
      let foreign_document = document.foreign_documents.values().next().value;

      let foreign_feature: Diagnostics = env.init_feature(
        Diagnostics,
        true,
        foreign_document
      );

      let response = {
        uri: foreign_document.uri,
        diagnostics: [
          {
            source: 'pyflakes',
            range: {
              start: { line: 1, character: 0 },
              end: { line: 1, character: 2 },
            },
            message: "undefined name 'x'",
            severity: 1,
          },
        ],
      } as lsProtocol.PublishDiagnosticsParams;

      // test guards against wrongly propagated responses:
      feature.handleDiagnostic(response);
      let cm_editors = env.virtual_editor.notebook.widgets.map(
        (cell) => (cell.editor as CodeMirrorEditor).editor
      );

      let marks_cell_1 = cm_editors[0].getDoc().getAllMarks();
      let marks_cell_2 = cm_editors[1].getDoc().getAllMarks();

      expect(marks_cell_1.length).to.equal(0);
      expect(marks_cell_2.length).to.equal(0);

      // correct propagation
      foreign_feature.handleDiagnostic(response);

      marks_cell_1 = cm_editors[0].getDoc().getAllMarks();
      marks_cell_2 = cm_editors[1].getDoc().getAllMarks();

      expect(marks_cell_1.length).to.equal(0);
      expect(marks_cell_2.length).to.equal(1);

      let mark = marks_cell_2[0];

      let mark_position = mark.find();

      // second line (0th and 1st virtual lines) + 1 line for '%%python\n' => line: 2
      expect(is_equal(mark_position.from, { line: 2, ch: 0 })).to.be.true;
      expect(is_equal(mark_position.to, { line: 2, ch: 1 })).to.be.true;

      // the silenced diagnostic for the %%python magic should be ignored
      feature.handleDiagnostic({
        uri: document.uri,
        diagnostics: [
          {
            source: 'pyflakes',
            range: {
              start: { line: 5, character: 0 },
              end: { line: 5, character: 52 },
            },
            message: "undefined name 'get_ipython'",
            severity: 1,
          },
        ],
      });

      expect(marks_cell_1.length).to.equal(0);
    });
  });
});

describe('message_without_code', () => {
  it('Removes redundant code', () => {
    let message = message_without_code({
      source: 'pycodestyle',
      range: {
        start: { line: 4, character: 0 },
        end: { line: 4, character: 5 },
      },
      message: 'W293 blank line contains whitespace',
      code: 'W293',
      severity: 2,
    });
    expect(message).to.be.equal('blank line contains whitespace');
  });

  it('Keeps messages without code intact', () => {
    let message = message_without_code({
      source: 'pyflakes',
      range: {
        start: { line: 1, character: 0 },
        end: { line: 1, character: 2 },
      },
      // a message starting from "undefined" is particularly tricky as
      // a lazy implementation can have a coercion of undefined "code"
      // to a string "undefined" which would wrongly chop off "undefined" from message
      message: "undefined name 'x'",
      severity: 1,
    });
    expect(message).to.be.equal("undefined name 'x'");
  });
});
