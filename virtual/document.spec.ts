import { CodeEditor } from '@jupyterlab/codeeditor';
import { expect } from 'chai';

import { ISourcePosition, IVirtualPosition } from '../positioning';
import { foreign_code_extractors } from '../transclusions/ipython-rpy2/extractors';

import { BrowserConsole } from './console';
import { VirtualDocument, is_within_range } from './document';

import Mock = jest.Mock;

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
  let document: VirtualDocument;
  beforeEach(() => {
    document = new VirtualDocument({
      language: 'python',
      path: 'test.ipynb',
      overrides_registry: {},
      foreign_code_extractors: foreign_code_extractors,
      standalone: false,
      file_extension: 'py',
      has_lsp_supported_file: false,
      console: new BrowserConsole()
    });
  });

  describe('#dispose', () => {
    it('disposes, but does not break methods which can be called from async callbacks', () => {
      expect(document.isDisposed).to.equal(false);
      // appending code block here should work fine
      document.append_code_block({
        value: 'code',
        ce_editor: {} as CodeEditor.IEditor
      });
      document.dispose();
      expect(document.isDisposed).to.equal(true);
      // mock console.warn
      console.warn = jest.fn();
      // this one should not raise, but just warn
      document.append_code_block({
        value: 'code',
        ce_editor: {} as CodeEditor.IEditor
      });
      expect((console.warn as Mock).mock.calls[0][0]).to.equal(
        'Cannot append code block: document disposed'
      );
    });
  });

  describe('#extract_foreign_code', () => {
    it('joins non-standalone fragments together', () => {
      let { cell_code_kept, foreign_document_map } =
        document.extract_foreign_code(
          { value: R_LINE_MAGICS, ce_editor: null },
          {
            line: 0,
            column: 0
          }
        );

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
    let ce_editor_for_cell_1 = {} as CodeEditor.IEditor;
    let ce_editor_for_cell_2 = {} as CodeEditor.IEditor;
    let ce_editor_for_cell_3 = {} as CodeEditor.IEditor;
    let ce_editor_for_cell_4 = {} as CodeEditor.IEditor;
    // first block
    document.append_code_block({
      value: 'test line in Python 1\n%R 1st test line in R line magic 1',
      ce_editor: ce_editor_for_cell_1
    });
    // second block
    document.append_code_block({
      value: 'test line in Python 2\n%R 1st test line in R line magic 2',
      ce_editor: ce_editor_for_cell_2
    });
    // third block
    document.append_code_block({
      value:
        'test line in Python 3\n%R -i imported_variable 1st test line in R line magic 3',
      ce_editor: ce_editor_for_cell_2
    });
    // fourth block
    document.append_code_block({
      value: '%%R\n1st test line in R cell magic 1',
      ce_editor: ce_editor_for_cell_3
    });
    // fifth block
    document.append_code_block({
      value: '%%R -i imported_variable\n1st test line in R cell magic 2',
      ce_editor: ce_editor_for_cell_4
    });
  };

  describe('#transform_virtual_to_editor', () => {
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
          'imported_variable <- data.frame(); 1st test line in R line magic 3\n\n\n' +
          // 23456789012345678901234567890123456 - 's' is 36th
          '1st test line in R cell magic 1\n\n\n' +
          'imported_variable <- data.frame(); 1st test line in R cell magic 2\n'
        // 0123456789012345678901234567890123456 - 's' is 36th
      );

      // The first R line (in source); second in the first block;
      // targeting "s" in "1st", "1st" in "1st test line in R line magic" (first virtual line == line 0)
      let virtual_r_1_1 = {
        line: 0,
        ch: 1
      } as IVirtualPosition;

      // For future reference, the code below would be wrong:
      // let source_position = foreign_document.transform_virtual_to_source(virtual_r_1_1);
      // expect(source_position.line).to.equal(1);
      // expect(source_position.ch).to.equal(4);
      // because it checks R source position, rather than checking root source positions.

      let editor_position =
        foreign_document.transform_virtual_to_editor(virtual_r_1_1);
      expect(editor_position.line).to.equal(1);
      expect(editor_position.ch).to.equal(4);

      // The second R line (in source), second in the second block
      // targeting 1 in "1st test line in R line magic 2" (4th virtual line == line 3)
      editor_position = foreign_document.transform_virtual_to_editor({
        line: 3,
        ch: 0
      } as IVirtualPosition);
      // 0th editor line is 'test line in Python 2\n'
      expect(editor_position.line).to.equal(1);
      // 1st editor lines is '%R 1st test line in R line magic 2'
      //                      0123 - 3rd character
      expect(editor_position.ch).to.equal(3);

      // The third R line (in source), second in the third block;
      // targeting "s" in "1st" in "1st test line in R line magic 3" (7th virtual line == line 6)
      editor_position = foreign_document.transform_virtual_to_editor({
        line: 6,
        ch: 36
      } as IVirtualPosition);
      // 0th editor line is 'test line in Python 3\n'
      expect(editor_position.line).to.equal(1);
      // 1st editor line is '%R -i imported_variable 1st test line in R line magic 3'
      //                     01234567890123456789012345 - 25th character
      expect(editor_position.ch).to.equal(25);

      // The fifth R line (in source), second in the fifth block;
      // targeting "s" in "1st" in "1st test line in R cell magic 2" (13th virtual lines == line 12)
      editor_position = foreign_document.transform_virtual_to_editor({
        line: 12,
        ch: 36
      } as IVirtualPosition);
      // 0th editor line is '%%R -i imported_variable\n'
      expect(editor_position.line).to.equal(1);
      // 1st editor line is '1st test line in R cell magic 2'
      //                     01
      expect(editor_position.ch).to.equal(1);
    });
  });
});
