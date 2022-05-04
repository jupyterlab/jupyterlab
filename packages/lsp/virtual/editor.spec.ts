import { CodeEditor } from '@jupyterlab/codeeditor';
import { PageConfig } from '@jupyterlab/coreutils';
import { expect } from 'chai';

import { DocumentConnectionManager } from '../connection_manager';
import {
  FileEditorTestEnvironment,
  MockLanguageServerManager,
  NotebookTestEnvironment
} from '../editor_integration/testutils';
import { RegExpForeignCodeExtractor } from '../extractors/regexp';
import { IForeignCodeExtractorsRegistry } from '../extractors/types';
import { IRootPosition } from '../positioning';

import { BrowserConsole } from './console';
import { VirtualDocument } from './document';

describe('VirtualEditor', () => {
  let r_line_extractor = new RegExpForeignCodeExtractor({
    language: 'R',
    pattern: '(^|\n)%R (.*)\n?',
    foreign_capture_groups: [2],
    is_standalone: false,
    file_extension: 'R'
  });

  PageConfig.setOption('rootUri', '/home/username/project');
  PageConfig.setOption(
    'virtualDocumentsUri',
    '/home/username/project/.virtual_documents'
  );

  const LANGSERVER_MANAGER = new MockLanguageServerManager({
    console: new BrowserConsole()
  });
  const CONNECTION_MANAGER = new DocumentConnectionManager({
    language_server_manager: LANGSERVER_MANAGER,
    console: new BrowserConsole()
  });

  const DEBUG = false;

  if (DEBUG) {
    console.log(CONNECTION_MANAGER);
  }

  let notebook_env: NotebookTestEnvironment;
  let file_editor_env: FileEditorTestEnvironment;

  const options: Partial<VirtualDocument.IOptions> = {
    foreign_code_extractors: {
      python: [r_line_extractor]
    } as IForeignCodeExtractorsRegistry
  };

  beforeAll(() => {
    notebook_env = new NotebookTestEnvironment(options);
    file_editor_env = new FileEditorTestEnvironment(options);
  });

  describe('#has_lsp_supported', () => {
    it('gets passed on to the virtual document & used for connection uri base', () => {
      const rootUri = PageConfig.getOption('rootUri');
      const virtualDocumentsUri = PageConfig.getOption('virtualDocumentsUri');
      expect(rootUri).to.be.not.equal(virtualDocumentsUri);

      let document = notebook_env.virtual_editor.virtual_document;
      let uris = DocumentConnectionManager.solve_uris(document, 'python');
      expect(uris.base.startsWith(virtualDocumentsUri)).to.be.equal(true);

      document = file_editor_env.virtual_editor.virtual_document;
      uris = DocumentConnectionManager.solve_uris(document, 'python');
      expect(uris.base.startsWith(virtualDocumentsUri)).to.be.equal(false);
    });
  });

  describe('#document_at_root_position()', () => {
    it('returns correct document', () => {
      let ce_editor_for_cell_1 = {} as CodeEditor.IEditor;
      let ce_editor_for_cell_2 = {} as CodeEditor.IEditor;
      let editor = notebook_env.virtual_editor;

      editor.virtual_document.append_code_block({
        value: 'test line in Python 1\n%R test line in R 1',
        ce_editor: ce_editor_for_cell_1
      });
      editor.virtual_document.append_code_block({
        value: 'test line in Python 2\n%R test line in R 2',
        ce_editor: ce_editor_for_cell_2
      });

      // The first (Python) line in the first block
      let root_position = { line: 0, ch: 0 } as IRootPosition;
      let document = editor.document_at_root_position(root_position);
      let virtual_position =
        editor.root_position_to_virtual_position(root_position);
      expect(document).to.equal(editor.virtual_document);
      expect(virtual_position.line).to.equal(0);

      // The second (Python | R) line in the first block - Python fragment
      root_position = { line: 1, ch: 0 } as IRootPosition;
      document = editor.document_at_root_position(root_position);
      virtual_position =
        editor.root_position_to_virtual_position(root_position);
      expect(document).to.equal(editor.virtual_document);
      expect(virtual_position.line).to.equal(1);

      // The second (Python | R) line in the first block - R fragment
      root_position = { line: 1, ch: 3 } as IRootPosition;
      document = editor.document_at_root_position(root_position);
      virtual_position =
        editor.root_position_to_virtual_position(root_position);
      expect(document).to.not.equal(editor.virtual_document);
      expect(virtual_position.line).to.equal(0);

      // The first (Python) line in the second block
      root_position = { line: 2, ch: 0 } as IRootPosition;
      document = editor.document_at_root_position(root_position);
      virtual_position =
        editor.root_position_to_virtual_position(root_position);
      expect(document).to.equal(editor.virtual_document);
      expect(virtual_position.line).to.equal(2 + 2);

      // The second (Python | R) line in the second block - Python fragment
      root_position = { line: 3, ch: 0 } as IRootPosition;
      document = editor.document_at_root_position(root_position);
      virtual_position =
        editor.root_position_to_virtual_position(root_position);
      expect(document).to.equal(editor.virtual_document);
      expect(virtual_position.line).to.equal(2 + 2 + 1);

      // The second (Python | R) line in the second block - R fragment
      root_position = { line: 3, ch: 3 } as IRootPosition;
      document = editor.document_at_root_position(root_position);
      virtual_position =
        editor.root_position_to_virtual_position(root_position);
      expect(document).to.not.equal(editor.virtual_document);
      // 0 + 1 (next line) + 2 (between-block spacing)
      expect(virtual_position.line).to.equal(1 + 2);
    });
  });
});
