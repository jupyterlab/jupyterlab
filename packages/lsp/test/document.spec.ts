/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { CodeEditor } from '@jupyterlab/codeeditor';
import {
  CodeExtractorsManager,
  Document,
  ILSPCodeExtractorsManager,
  isWithinRange,
  TextForeignCodeExtractor,
  VirtualDocument
} from '@jupyterlab/lsp';

describe('@jupyterlab/lsp', () => {
  describe('isWithinRange', () => {
    let lineRange: CodeEditor.IRange = {
      start: { line: 1, column: 0 },
      end: { line: 1, column: 10 }
    };
    let longRange: CodeEditor.IRange = {
      start: { line: 0, column: 3 },
      end: { line: 1, column: 0 }
    };
    it('recognizes positions within range in a single-line case', () => {
      expect(isWithinRange({ line: 1, column: 0 }, lineRange)).toEqual(true);
      expect(isWithinRange({ line: 1, column: 5 }, lineRange)).toEqual(true);
      expect(isWithinRange({ line: 1, column: 10 }, lineRange)).toEqual(true);
    });

    it('recognizes positions outside of range in a single-line case', () => {
      expect(isWithinRange({ line: 0, column: 0 }, lineRange)).toEqual(false);
      expect(isWithinRange({ line: 2, column: 0 }, lineRange)).toEqual(false);
    });

    it('recognizes positions within range in multi-line case', () => {
      expect(isWithinRange({ line: 0, column: 3 }, longRange)).toEqual(true);
      expect(isWithinRange({ line: 0, column: 5 }, longRange)).toEqual(true);
      expect(isWithinRange({ line: 1, column: 0 }, longRange)).toEqual(true);
    });

    it('recognizes positions outside of range in multi-line case', () => {
      expect(isWithinRange({ line: 0, column: 0 }, longRange)).toEqual(false);
      expect(isWithinRange({ line: 0, column: 1 }, longRange)).toEqual(false);
      expect(isWithinRange({ line: 0, column: 2 }, longRange)).toEqual(false);
      expect(isWithinRange({ line: 1, column: 1 }, longRange)).toEqual(false);
    });
  });

  describe('VirtualDocument', () => {
    let document: VirtualDocument;
    let extractorManager: ILSPCodeExtractorsManager;
    let markdownCellExtractor: TextForeignCodeExtractor;
    let rawCellExtractor: TextForeignCodeExtractor;
    beforeAll(() => {
      extractorManager = new CodeExtractorsManager();

      markdownCellExtractor = new TextForeignCodeExtractor({
        language: 'markdown',
        isStandalone: false,
        file_extension: 'md',
        cellType: ['markdown']
      });
      extractorManager.register(markdownCellExtractor, null);
      rawCellExtractor = new TextForeignCodeExtractor({
        language: 'text',
        isStandalone: false,
        file_extension: 'txt',
        cellType: ['raw']
      });
      extractorManager.register(rawCellExtractor, null);
    });
    beforeEach(() => {
      document = new VirtualDocument({
        language: 'python',
        path: 'test.ipynb',
        foreignCodeExtractors: extractorManager,
        standalone: false,
        fileExtension: 'py',
        hasLspSupportedFile: false
      });
      let editorCode = {} as Document.IEditor;
      let editorMarkdown = {} as Document.IEditor;
      let editorRaw = {} as Document.IEditor;

      document.appendCodeBlock({
        value: 'test line in Python 1\ntest line in Python 2',
        ceEditor: editorCode,
        type: 'code'
      });
      document.appendCodeBlock({
        value: 'test line in markdown 1\ntest line in markdown 2',
        ceEditor: editorMarkdown,
        type: 'markdown'
      });
      document.appendCodeBlock({
        value: 'test line in raw 1\ntest line in raw 2',
        ceEditor: editorRaw,
        type: 'raw'
      });
    });

    afterEach(() => {
      document.clear();
    });

    describe('#dispose', () => {
      it('should dispose, but does not break methods which can be called from async callbacks', () => {
        expect(document.isDisposed).toEqual(false);
        // appending code block here should work fine
        document.appendCodeBlock({
          value: 'code',
          ceEditor: {} as Document.IEditor,
          type: 'code'
        });
        document.dispose();
        expect(document.isDisposed).toEqual(true);
        // mock console.warn
        console.warn = jest.fn();
        // this one should not raise, but just warn
        document.appendCodeBlock({
          value: 'code',
          ceEditor: {} as Document.IEditor,
          type: 'code'
        });
        expect((console.warn as jest.Mock).mock.calls[0][0]).toEqual(
          'Cannot append code block: document disposed'
        );
      });
      it('should close all foreign documents', () => {
        document.closeAllForeignDocuments = jest.fn();
        document.dispose();
        expect(document.closeAllForeignDocuments).toHaveBeenCalled();
      });
      it('should clear all the maps', () => {
        document.dispose();
        expect(document.foreignDocuments.size).toEqual(0);
        expect(document['sourceLines'].size).toEqual(0);
        expect(document['unusedDocuments'].size).toEqual(0);
        expect(document['unusedStandaloneDocuments'].size).toEqual(0);
        expect(document['virtualLines'].size).toEqual(0);
      });
    });

    describe('#appendCodeBlock', () => {
      it('should set the `virtualLines` map', () => {
        expect(document['virtualLines'].size).toEqual(10);
        document.appendCodeBlock({
          value: 'new line',
          ceEditor: {} as Document.IEditor,
          type: 'code'
        });
        expect(document['virtualLines'].size).toEqual(13);
        expect(document.lastSourceLine).toEqual(7);
        expect(document.lastVirtualLine).toEqual(13);
      });
    });
    describe('#prepareCodeBlock', () => {
      it('should prepare a code block', () => {
        const { lines, foreignDocumentsMap } = document.prepareCodeBlock({
          value: 'new line',
          ceEditor: {} as Document.IEditor,
          type: 'code'
        });
        expect(lines).toEqual(['new line']);
        expect(foreignDocumentsMap.size).toEqual(0);
      });
      it('should prepare a markdown block', () => {
        const { lines, foreignDocumentsMap } = document.prepareCodeBlock({
          value: 'new line',
          ceEditor: {} as Document.IEditor,
          type: 'markdown'
        });
        expect(lines).toEqual(['']);
        expect(foreignDocumentsMap.size).toEqual(1);
      });
      it('should prepare a raw text block', () => {
        const { lines, foreignDocumentsMap } = document.prepareCodeBlock({
          value: 'new line',
          ceEditor: {} as Document.IEditor,
          type: 'raw'
        });
        expect(lines).toEqual(['']);
        expect(foreignDocumentsMap.size).toEqual(1);
      });
    });
    describe('#extractForeignCode', () => {
      it('should prepare a code block', () => {
        const { cellCodeKept, foreignDocumentsMap } =
          document.extractForeignCode(
            {
              value: 'new line',
              ceEditor: {} as Document.IEditor,
              type: 'code'
            },
            { line: 0, column: 0 }
          );
        expect(cellCodeKept).toEqual('new line');
        expect(foreignDocumentsMap.size).toEqual(0);
      });
      it('should prepare a markdown block', () => {
        const { cellCodeKept, foreignDocumentsMap } =
          document.extractForeignCode(
            {
              value: 'new line',
              ceEditor: {} as Document.IEditor,
              type: 'markdown'
            },
            { line: 0, column: 0 }
          );
        expect(cellCodeKept).toEqual('');
        expect(foreignDocumentsMap.size).toEqual(1);
      });
      it('should prepare a raw text block', () => {
        const { cellCodeKept, foreignDocumentsMap } =
          document.extractForeignCode(
            {
              value: 'new line',
              ceEditor: {} as Document.IEditor,
              type: 'raw'
            },
            { line: 0, column: 0 }
          );
        expect(cellCodeKept).toEqual('');
        expect(foreignDocumentsMap.size).toEqual(1);
      });
    });
    describe('#chooseForeignDocument', () => {
      it('should select the foreign document for markdown cell', () => {
        const md: VirtualDocument = document['chooseForeignDocument'](
          markdownCellExtractor
        );
        expect(md.uri).toBe('test.ipynb.python-markdown.md');
      });
      it('should select the foreign document for raw cell', () => {
        const md: VirtualDocument =
          document['chooseForeignDocument'](rawCellExtractor);
        expect(md.uri).toBe('test.ipynb.python-text.txt');
      });
    });
    describe('#openForeign', () => {
      it('should create a new foreign document', () => {
        const doc: VirtualDocument = document['openForeign'](
          'javascript',
          false,
          'js'
        );
        expect(doc.uri).toBe('test.ipynb.python-javascript.js');
        expect(doc.parent).toBe(document);
        expect(document.foreignDocuments.has(doc.virtualId)).toEqual(true);
      });
    });
    describe('#closeForeign', () => {
      it('should emit the `foreignDocumentClosed` signal', () => {
        const cb = jest.fn();
        document.foreignDocumentClosed.connect(cb);
        const md: VirtualDocument = document['chooseForeignDocument'](
          markdownCellExtractor
        );
        document.closeForeign(md);
        expect(cb).toHaveBeenCalled();
      });
      it('should close correctly foreign documents', () => {
        const md: VirtualDocument = document['chooseForeignDocument'](
          markdownCellExtractor
        );
        md.closeAllForeignDocuments = jest.fn();
        document.closeForeign(md);
        expect(document.foreignDocuments.has(md.virtualId)).toEqual(false);
        expect(md.closeAllForeignDocuments).toHaveBeenCalled();
        expect(md.isDisposed).toEqual(true);
      });
    });
    describe('#closeAllForeignDocuments', () => {
      it('should close all foreign documents', () => {
        document.closeAllForeignDocuments();
        expect(document.foreignDocuments.size).toEqual(0);
      });
    });
    describe('#value', () => {
      it('should get the content of the document', () => {
        expect(document.value).toContain(
          'test line in Python 1\ntest line in Python 2'
        );
      });
      it('should get the markdown content of the document', () => {
        const md = document['chooseForeignDocument'](markdownCellExtractor);

        expect(md.value).toContain(
          'test line in markdown 1\ntest line in markdown 2'
        );
      });
    });
    describe('#transformSourceToEditor', () => {
      it('should return the position in editor', () => {
        const position = document.transformSourceToEditor({
          isSource: true,
          ch: 2,
          line: 2
        });
        expect(position).toEqual({ ch: 2, line: 0 });
      });
    });
    describe('#transformVirtualToEditor', () => {
      it('should return the position in editor', () => {
        const position = document.transformVirtualToEditor({
          isVirtual: true,
          ch: 2,
          line: 0
        });
        expect(position).toEqual({ ch: 2, line: 0 });
      });
    });
  });
});
