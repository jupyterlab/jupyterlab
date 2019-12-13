import { expect } from 'chai';
import { VirtualEditor } from './editor';
import { RegExpForeignCodeExtractor } from '../extractors/regexp';
import {
  IEditorPosition,
  IRootPosition,
  IVirtualPosition
} from '../positioning';
import * as CodeMirror from 'codemirror';

class VirtualEditorImplementation extends VirtualEditor {
  private cm_editor: CodeMirror.Editor;

  has_lsp_supported_file = true;

  get_cm_editor(position: IRootPosition): CodeMirror.Editor {
    return undefined;
  }

  get_editor_index(position: IVirtualPosition): number {
    return 0;
  }

  transform_editor_to_root(
    cm_editor: CodeMirror.Editor,
    position: IEditorPosition
  ): IRootPosition {
    return undefined;
  }

  addEventListener(
    type: string,
    listener: EventListener | EventListenerObject
  ): void {
    // nothing yet
  }

  protected perform_documents_update(): void {
    // nothing yet
  }

  forEveryBlockEditor(callback: (cm_editor: CodeMirror.Editor) => void): void {
    callback(this.cm_editor);
  }
}

describe('VirtualEditor', () => {
  let r_line_extractor = new RegExpForeignCodeExtractor({
    language: 'R',
    pattern: '(^|\n)%R (.*)\n?',
    extract_to_foreign: '$2',
    keep_in_host: true,
    is_standalone: false,
    file_extension: 'R'
  });

  let editor = new VirtualEditorImplementation(
    () => 'python',
    () => 'py',
    () => 'test.ipynb',
    {},
    { python: [r_line_extractor] }
  );
  describe('#document_at_root_position()', () => {
    it('returns correct document', () => {
      let cm_editor_for_cell_1 = {} as CodeMirror.Editor;
      let cm_editor_for_cell_2 = {} as CodeMirror.Editor;
      editor.virtual_document.append_code_block(
        'test line in Python 1\n%R test line in R 1',
        cm_editor_for_cell_1
      );
      editor.virtual_document.append_code_block(
        'test line in Python 2\n%R test line in R 2',
        cm_editor_for_cell_2
      );

      // The first (Python) line in the first block
      let root_position = { line: 0, ch: 0 } as IRootPosition;
      let document = editor.document_at_root_position(root_position);
      let virtual_position = editor.root_position_to_virtual_position(
        root_position
      );
      expect(document).to.equal(editor.virtual_document);
      expect(virtual_position.line).to.equal(0);

      // The second (Python | R) line in the first block - Python fragment
      root_position = { line: 1, ch: 0 } as IRootPosition;
      document = editor.document_at_root_position(root_position);
      virtual_position = editor.root_position_to_virtual_position(
        root_position
      );
      expect(document).to.equal(editor.virtual_document);
      expect(virtual_position.line).to.equal(1);

      // The second (Python | R) line in the first block - R fragment
      root_position = { line: 1, ch: 3 } as IRootPosition;
      document = editor.document_at_root_position(root_position);
      virtual_position = editor.root_position_to_virtual_position(
        root_position
      );
      expect(document).to.not.equal(editor.virtual_document);
      expect(virtual_position.line).to.equal(0);

      // The first (Python) line in the second block
      root_position = { line: 2, ch: 0 } as IRootPosition;
      document = editor.document_at_root_position(root_position);
      virtual_position = editor.root_position_to_virtual_position(
        root_position
      );
      expect(document).to.equal(editor.virtual_document);
      expect(virtual_position.line).to.equal(2 + 2);

      // The second (Python | R) line in the second block - Python fragment
      root_position = { line: 3, ch: 0 } as IRootPosition;
      document = editor.document_at_root_position(root_position);
      virtual_position = editor.root_position_to_virtual_position(
        root_position
      );
      expect(document).to.equal(editor.virtual_document);
      expect(virtual_position.line).to.equal(2 + 2 + 1);

      // The second (Python | R) line in the second block - R fragment
      root_position = { line: 3, ch: 3 } as IRootPosition;
      document = editor.document_at_root_position(root_position);
      virtual_position = editor.root_position_to_virtual_position(
        root_position
      );
      expect(document).to.not.equal(editor.virtual_document);
      // 0 + 1 (next line) + 2 (between-block spacing)
      expect(virtual_position.line).to.equal(1 + 2);
    });
  });
});
