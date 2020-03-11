import { expect } from 'chai';
import { is_within_range, VirtualDocument } from './document';
import * as CodeMirror from 'codemirror';
import { ISourcePosition, IVirtualPosition } from '../positioning';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { foreign_code_extractors } from '../extractors/defaults';

let R_LINE_MAGICS = `%R df = data.frame()
print("df created")
%R ggplot(df)
print("plotted")
`;

describe('is_within_range', () => {
  let line_range: CodeEditor.IRange = {
    start: { line: 1, column: 0 },
    end: { line: 1, column: 10 }
  };
  let long_range: CodeEditor.IRange = {
    start: { line: 0, column: 3 },
    end: { line: 1, column: 0 }
  };
  it('recognizes positions within range in a single-line case', () => {
    expect(is_within_range({ line: 1, column: 0 }, line_range)).to.equal(true);
    expect(is_within_range({ line: 1, column: 5 }, line_range)).to.equal(true);
    expect(is_within_range({ line: 1, column: 10 }, line_range)).to.equal(true);
  });

  it('recognizes positions outside of range in a single-line case', () => {
    expect(is_within_range({ line: 0, column: 0 }, line_range)).to.equal(false);
    expect(is_within_range({ line: 2, column: 0 }, line_range)).to.equal(false);
  });

  it('recognizes positions within range in multi-line case', () => {
    expect(is_within_range({ line: 0, column: 3 }, long_range)).to.equal(true);
    expect(is_within_range({ line: 0, column: 5 }, long_range)).to.equal(true);
    expect(is_within_range({ line: 1, column: 0 }, long_range)).to.equal(true);
  });

  it('recognizes positions outside of range in multi-line case', () => {
    expect(is_within_range({ line: 0, column: 0 }, long_range)).to.equal(false);
    expect(is_within_range({ line: 0, column: 1 }, long_range)).to.equal(false);
    expect(is_within_range({ line: 0, column: 2 }, long_range)).to.equal(false);
    expect(is_within_range({ line: 1, column: 1 }, long_range)).to.equal(false);
  });
});

describe('VirtualDocument', () => {
  let document = new VirtualDocument(
    'python',
    'test.ipynb',
    {},
    foreign_code_extractors,
    false,
    'py',
    false
  );

  describe('#extract_foreign_code', () => {
    it('joins non-standalone fragments together', () => {
      let {
        cell_code_kept,
        foreign_document_map
      } = document.extract_foreign_code(R_LINE_MAGICS, null, {
        line: 0,
        column: 0
      });

      // note R cell lines are kept in code (keep_in_host=true)
      expect(cell_code_kept).to.equal(R_LINE_MAGICS);
      expect(foreign_document_map.size).to.equal(2);

      let { virtual_document: r_document } = foreign_document_map.get(
        foreign_document_map.keys().next().value
      );
      expect(r_document.language).to.equal('r');
      expect(r_document.value).to.equal('df = data.frame()\n\n\nggplot(df)\n');
    });
  });

  afterEach(() => {
    document.clear();
  });

  let init_document_with_Python_and_R = () => {
    let cm_editor_for_cell_1 = {} as CodeMirror.Editor;
    let cm_editor_for_cell_2 = {} as CodeMirror.Editor;
    let cm_editor_for_cell_3 = {} as CodeMirror.Editor;
    let cm_editor_for_cell_4 = {} as CodeMirror.Editor;
    document.append_code_block(
      'test line in Python 1\n%R 1st test line in R line magic 1',
      cm_editor_for_cell_1
    );
    document.append_code_block(
      'test line in Python 2\n%R 1st test line in R line magic 2',
      cm_editor_for_cell_2
    );
    document.append_code_block(
      '%%R\n1st test line in R cell magic 1',
      cm_editor_for_cell_3
    );
    document.append_code_block(
      '%%R -i imported_variable\n1st test line in R cell magic 2',
      cm_editor_for_cell_4
    );
  };

  describe('transform_virtual_to_editor', () => {
    it('transforms positions for the top level document', () => {
      init_document_with_Python_and_R();
      // The first (Python) line in the first block
      let editor_position = document.transform_virtual_to_editor({
        line: 0,
        ch: 0
      } as IVirtualPosition);
      expect(editor_position.line).to.equal(0);
      expect(editor_position.ch).to.equal(0);

      // The first (Python) line in the second block
      editor_position = document.transform_virtual_to_editor({
        line: 4,
        ch: 0
      } as IVirtualPosition);
      expect(editor_position.line).to.equal(0);
      expect(editor_position.ch).to.equal(0);
    });

    it('transforms positions for the nested foreign documents', () => {
      init_document_with_Python_and_R();
      let foreign_document = document.document_at_source_position({
        line: 1,
        ch: 3
      } as ISourcePosition);
      expect(foreign_document).to.not.equal(document);
      expect(foreign_document.value).to.equal(
        '1st test line in R line magic 1\n\n\n' +
          '1st test line in R line magic 2\n\n\n' +
          '1st test line in R cell magic 1\n\n\n' +
          'imported_variable <- data.frame(); 1st test line in R cell magic 2\n'
      );

      // The second (R) line in the first block ("s" in "1st", "1st" in "1st test line in R line magic")
      let virtual_r_1_1 = {
        line: 0,
        ch: 1
      } as IVirtualPosition;

      // For future reference, the code below would be wrong:
      // let source_position = foreign_document.transform_virtual_to_source(virtual_r_1_1);
      // expect(source_position.line).to.equal(1);
      // expect(source_position.ch).to.equal(4);
      // because it checks R source position, rather than checking root source positions.

      let editor_position = foreign_document.transform_virtual_to_editor(
        virtual_r_1_1
      );
      expect(editor_position.line).to.equal(1);
      expect(editor_position.ch).to.equal(4);

      // The second (R) line in the second block
      editor_position = foreign_document.transform_virtual_to_editor({
        line: 3,
        ch: 0
      } as IVirtualPosition);
      expect(editor_position.line).to.equal(1);
      expect(editor_position.ch).to.equal(3);
    });
  });
});
