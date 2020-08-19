import { expect } from 'chai';
import { RegExpForeignCodeExtractor } from '../extractors/regexp';
import {
  IRootPosition,
} from '../positioning';
import * as CodeMirror from 'codemirror';
import { PageConfig } from '@jupyterlab/coreutils';
import { DocumentConnectionManager } from '../connection_manager';
import { MockLanguageServerManager } from '../editor_integration/testutils';
import { CodeMirrorVirtualEditor } from "./codemirror_editor";

// TODO: implements IVirtualEditor OR rename to test CM
class VirtualEditorImplementation extends CodeMirrorVirtualEditor {
  private cm_editor: CodeMirror.Editor;

  get_cm_editor(position: IRootPosition): CodeMirror.Editor {
    return undefined;
  }

  addEventListener(
    type: string,
    listener: EventListener | EventListenerObject
  ): void {
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
    is_standalone: false,
    file_extension: 'R'
  });

  PageConfig.setOption('rootUri', '/home/username/project');
  PageConfig.setOption(
    'virtualDocumentsUri',
    '/home/username/project/.virtual_documents'
  );

  const LANGSERVER_MANAGER = new MockLanguageServerManager({});
  const CONNECTION_MANAGER = new DocumentConnectionManager({
    language_server_manager: LANGSERVER_MANAGER
  });

  const DEBUG = false;

  if (DEBUG) {
    console.log(CONNECTION_MANAGER);
  }

  let editor = new VirtualEditorImplementation(
    () => 'python',
    () => 'py',
    () => 'test.ipynb',
    {},
    { python: [r_line_extractor] },
    false
  );

  describe('#has_lsp_supported', () => {
    it('gets passed on to the virtual document & used for connection uri base', () => {
      const rootUri = PageConfig.getOption('rootUri');
      const virtualDocumentsUri = PageConfig.getOption('virtualDocumentsUri');
      expect(rootUri).to.be.not.equal(virtualDocumentsUri);

      let document = editor.virtual_document;
      let uris = DocumentConnectionManager.solve_uris(document, 'python');
      expect(uris.base.startsWith(virtualDocumentsUri)).to.be.equal(true);

      let editor_with_plain_file = new VirtualEditorImplementation(
        () => 'python',
        () => 'py',
        () => 'test.ipynb',
        {},
        { python: [r_line_extractor] },
        true
      );
      document = editor_with_plain_file.virtual_document;
      uris = DocumentConnectionManager.solve_uris(document, 'python');
      expect(uris.base.startsWith(virtualDocumentsUri)).to.be.equal(false);
    });
  });

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
