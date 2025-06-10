// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { YFile } from '@jupyter/ydoc';
import { CodeEditor } from '@jupyterlab/codeeditor';
import {
  CodeMirrorEditor,
  EditorExtensionRegistry,
  EditorLanguageRegistry,
  IEditorExtensionRegistry,
  IEditorLanguageRegistry,
  ybinding
} from '@jupyterlab/codemirror';
import { sleep } from '@jupyterlab/testutils';
import { generate, simulate } from 'simulate-event';

const UP_ARROW = 38;

const DOWN_ARROW = 40;

class LogFileEditor extends CodeMirrorEditor {
  methods: string[] = [];

  protected onKeydown(event: KeyboardEvent): boolean {
    const value = super.onKeydown(event);
    this.methods.push('onKeydown');
    return value;
  }
}

describe('CodeMirrorEditor', () => {
  let editor: LogFileEditor;
  let host: HTMLElement;
  let model: CodeEditor.IModel;
  const TEXT = new Array(100).join('foo bar baz\n');
  let languages: IEditorLanguageRegistry;
  let extensionsRegistry: IEditorExtensionRegistry;

  beforeAll(async () => {
    languages = new EditorLanguageRegistry();
    extensionsRegistry = new EditorExtensionRegistry();
    EditorExtensionRegistry.getDefaultExtensions()
      .filter(ext =>
        [
          'lineNumbers',
          'lineWrap',
          'readOnly',
          'allowMultipleSelections'
        ].includes(ext.name)
      )
      .forEach(ext => {
        extensionsRegistry.addExtension(ext);
      });
    for (const language of EditorLanguageRegistry.getDefaultLanguages().filter(
      spec => spec.name === 'Python'
    )) {
      languages.addLanguage(language);
      await languages.getLanguage(language.name);
    }
  });

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    const sharedModel = new YFile();
    model = new CodeEditor.Model({ sharedModel });
    editor = new LogFileEditor({
      extensionsRegistry,
      host,
      model,
      languages,
      // Binding between the editor and the Yjs model
      extensions: [
        ybinding({
          ytext: sharedModel.ysource,
          undoManager: sharedModel.undoManager ?? undefined
        })
      ]
    });
  });

  afterEach(() => {
    editor.dispose();
    document.body.removeChild(host);
  });

  describe('#constructor()', () => {
    it('should create a CodeMirrorEditor', () => {
      expect(editor).toBeInstanceOf(CodeMirrorEditor);
    });
  });

  describe('#edgeRequested', () => {
    it('should emit a signal when the top edge is requested', () => {
      let edge: CodeEditor.EdgeLocation | null = null;
      const event = generate('keydown', { keyCode: UP_ARROW });
      const listener = (sender: any, args: CodeEditor.EdgeLocation) => {
        edge = args;
      };
      editor.edgeRequested.connect(listener);
      expect(edge).toBeNull();
      editor.editor.contentDOM.dispatchEvent(event);
      expect(edge).toBe('top');
    });

    it('should emit a signal when the bottom edge is requested', () => {
      let edge: CodeEditor.EdgeLocation | null = null;
      const event = generate('keydown', { keyCode: DOWN_ARROW });
      const listener = (sender: any, args: CodeEditor.EdgeLocation) => {
        edge = args;
      };
      editor.edgeRequested.connect(listener);
      expect(edge).toBeNull();
      editor.editor.contentDOM.dispatchEvent(event);
      expect(edge).toBe('bottom');
    });
  });

  describe('#uuid', () => {
    it('should be the unique id of the editor', () => {
      expect(editor.uuid).toBeTruthy();
      const uuid = 'foo';
      editor = new LogFileEditor({
        extensionsRegistry,
        model,
        host,
        uuid,
        languages
      });
      expect(editor.uuid).toBe('foo');
    });
  });

  describe('#editor', () => {
    it('should be the codemirror editor wrapped by the editor', () => {
      const cm = editor.editor;
      expect(cm.state.doc).toBe(editor.doc);
    });
  });

  describe('#lineCount', () => {
    it('should get the number of lines in the editor', () => {
      expect(editor.lineCount).toBe(1);
      editor.model.sharedModel.setSource('foo\nbar\nbaz');
      expect(editor.lineCount).toBe(3);
    });
  });

  describe('#getOption()', () => {
    it('should get whether line numbers should be shown', () => {
      expect(editor.getOption('lineNumbers')).toBe(true);
    });

    it('should get whether horizontally scrolling should be used', () => {
      expect(editor.getOption('lineWrap')).toBe(true);
    });

    it('should get whether the editor is readonly', () => {
      expect(editor.getOption('readOnly')).toBe(false);
    });
  });

  describe('#setOption()', () => {
    it('should set whether line numbers should be shown', () => {
      editor.setOption('lineNumbers', false);
      expect(editor.getOption('lineNumbers')).toBe(false);
    });

    it('should set whether horizontally scrolling should be used', () => {
      editor.setOption('lineWrap', false);
      expect(editor.getOption('lineWrap')).toBe(false);
    });

    it('should set whether the editor is readonly', () => {
      editor.setOption('readOnly', true);
      expect(editor.getOption('readOnly')).toBe(true);
    });
  });

  describe('#model', () => {
    it('should get the model used by the editor', () => {
      expect(editor.model).toBe(model);
    });
  });

  describe('#lineHeight', () => {
    it('should get the text height of a line in the editor', () => {
      expect(editor.lineHeight).toBeGreaterThan(0);
    });
  });

  describe('#charWidth', () => {
    it('should get the character width in the editor', () => {
      expect(editor.charWidth).toBeGreaterThan(0);
    });
  });

  describe('#isDisposed', () => {
    it('should test whether the editor is disposed', () => {
      expect(editor.isDisposed).toBe(false);
      editor.dispose();
      expect(editor.isDisposed).toBe(true);
    });
  });

  describe('#dispose()', () => {
    it('should dispose of the resources used by the editor', () => {
      expect(editor.isDisposed).toBe(false);
      editor.dispose();
      expect(editor.isDisposed).toBe(true);
      editor.dispose();
      expect(editor.isDisposed).toBe(true);
    });
  });

  describe('#getLine()', () => {
    it('should get a line of text', () => {
      model.sharedModel.setSource('foo\nbar');
      expect(editor.getLine(0)).toBe('foo');
      expect(editor.getLine(1)).toBe('bar');
      expect(editor.getLine(2)).toBeUndefined();
    });
  });

  describe('#getOffsetAt()', () => {
    it('should get the offset for a given position', () => {
      model.sharedModel.setSource('foo\nbar');
      let pos = {
        column: 2,
        line: 1
      };
      expect(editor.getOffsetAt(pos)).toBe(6);
      pos = {
        column: 2,
        line: 5
      };
      expect(() => {
        editor.getOffsetAt(pos);
      }).toThrow(RangeError);
    });
  });

  describe('#getPositionAt()', () => {
    it('should get the position for a given offset', () => {
      model.sharedModel.setSource('foo\nbar');
      let pos = editor.getPositionAt(6);
      expect(pos.column).toBe(2);
      expect(pos.line).toBe(1);
      expect(() => {
        pos = editor.getPositionAt(101);
      }).toThrow(RangeError);
    });
  });

  describe('#undo()', () => {
    it('should undo one edit', () => {
      model.sharedModel.setSource('foo');
      editor.undo();
      expect(model.sharedModel.getSource()).toBe('');
    });
  });

  describe('#redo()', () => {
    it('should redo one undone edit', () => {
      model.sharedModel.setSource('foo');
      editor.undo();
      editor.redo();
      expect(model.sharedModel.getSource()).toBe('foo');
    });
  });

  describe('#clearHistory()', () => {
    it('should clear the undo history', () => {
      model.sharedModel.setSource('foo');
      editor.clearHistory();
      editor.undo();
      expect(model.sharedModel.getSource()).toBe('foo');
    });
  });

  describe('#focus()', () => {
    it('should give focus to the editor', () => {
      expect(host.contains(document.activeElement)).toBe(false);
      editor.focus();
      expect(host.contains(document.activeElement)).toBe(true);
    });
  });

  describe('#hasFocus()', () => {
    it('should test whether the editor has focus', () => {
      expect(editor.hasFocus()).toBe(false);
      editor.focus();
      expect(editor.hasFocus()).toBe(true);
    });
  });

  describe('#blur()', () => {
    it('should blur the editor', () => {
      editor.focus();
      expect(host.contains(document.activeElement)).toBe(true);
      editor.blur();
      expect(host.contains(document.activeElement)).toBe(false);
    });
  });

  describe('#handleEvent', () => {
    describe('focus', () => {
      it('should add the focus class to the host', () => {
        simulate(editor.editor.contentDOM, 'focus');
        expect(host.classList.contains('jp-mod-focused')).toBe(true);
      });
    });

    describe('blur', () => {
      it('should remove the focus class from the host', () => {
        simulate(editor.editor.contentDOM, 'focus');
        expect(host.classList.contains('jp-mod-focused')).toBe(true);
        simulate(editor.editor.contentDOM, 'blur');
        expect(host.classList.contains('jp-mod-focused')).toBe(false);
      });
    });
  });

  describe('#revealPosition()', () => {
    it('should reveal the given position in the editor', () => {
      model.sharedModel.setSource(TEXT);
      editor.revealPosition({ line: 50, column: 0 });
      expect(editor).toBeTruthy();
    });
  });

  describe('#revealSelection()', () => {
    it('should reveal the given selection in the editor', () => {
      model.sharedModel.setSource(TEXT);
      const start = { line: 50, column: 0 };
      const end = { line: 52, column: 0 };
      editor.setSelection({ start, end });
      editor.revealSelection(editor.getSelection());
      expect(editor).toBeTruthy();
    });
  });

  describe('#getCursorPosition()', () => {
    it('should get the primary position of the cursor', () => {
      model.sharedModel.setSource(TEXT);
      let pos = editor.getCursorPosition();
      expect(pos.line).toBe(0);
      expect(pos.column).toBe(0);

      editor.setCursorPosition({ line: 12, column: 3 });
      pos = editor.getCursorPosition();
      expect(pos.line).toBe(12);
      expect(pos.column).toBe(3);
    });
  });

  describe('#setCursorPosition()', () => {
    it('should set the primary position of the cursor', () => {
      model.sharedModel.setSource(TEXT);
      editor.setCursorPosition({ line: 12, column: 3 });
      const pos = editor.getCursorPosition();
      expect(pos.line).toBe(12);
      expect(pos.column).toBe(3);
    });
  });

  describe('#getSelection()', () => {
    it('should get the primary selection of the editor', () => {
      const selection = editor.getSelection();
      expect(selection.start.line).toBe(0);
      expect(selection.end.line).toBe(0);
    });
  });

  describe('#setSelection()', () => {
    it('should set the primary selection of the editor', () => {
      model.sharedModel.setSource(TEXT);
      const start = { line: 50, column: 0 };
      const end = { line: 52, column: 0 };
      editor.setSelection({ start, end });
      expect(editor.getSelection().start).toEqual(start);
      expect(editor.getSelection().end).toEqual(end);
    });

    it('should remove any secondary cursors', () => {
      model.sharedModel.setSource(TEXT);
      const range0 = {
        start: { line: 50, column: 0 },
        end: { line: 52, column: 0 }
      };
      const range1 = {
        start: { line: 53, column: 0 },
        end: { line: 54, column: 0 }
      };
      editor.setSelections([range0, range1]);
      editor.setSelection(range1);
      expect(editor.getSelections().length).toBe(1);
    });
  });

  describe('#getSelections()', () => {
    it('should get the selections for all the cursors', () => {
      model.sharedModel.setSource(TEXT);
      const range0 = {
        start: { line: 50, column: 0 },
        end: { line: 52, column: 0 }
      };
      const range1 = {
        start: { line: 53, column: 0 },
        end: { line: 54, column: 0 }
      };
      editor.setSelections([range0, range1]);
      const selections = editor.getSelections();
      expect(selections[0].start.line).toBe(50);
      expect(selections[1].end.line).toBe(54);
    });
  });

  describe('#setSelections()', () => {
    it('should set the selections for all the cursors', async () => {
      model.sharedModel.setSource(TEXT);
      const range0 = {
        start: { line: 50, column: 0 },
        end: { line: 52, column: 0 }
      };
      const range1 = {
        start: { line: 53, column: 0 },
        end: { line: 54, column: 0 }
      };
      editor.setSelections([range0, range1]);
      const selections = editor.getSelections();
      expect(selections[0].start.line).toBe(50);
      expect(selections[1].end.line).toBe(54);
    });

    it('should set a default selection for an empty array', () => {
      model.sharedModel.setSource(TEXT);
      editor.setSelections([]);
      const selection = editor.getSelection();
      expect(selection.start.line).toBe(0);
      expect(selection.end.line).toBe(0);
    });
  });

  describe('#onKeydown()', () => {
    it('should run when there is a keydown event on the editor', () => {
      const event = generate('keydown', { keyCode: UP_ARROW });
      expect(editor.methods).toEqual(expect.not.arrayContaining(['onKeydown']));
      editor.editor.contentDOM.dispatchEvent(event);
      expect(editor.methods).toEqual(expect.arrayContaining(['onKeydown']));
    });
  });

  describe('#getTokenAt()', () => {
    it('should return innermost token', async () => {
      model.mimeType = 'text/x-python';
      model.sharedModel.setSource('foo = "a"\nbar = 1');
      // Needed to have the sharedModel content transferred to the editor document
      await sleep(0.01);
      expect(editor.getTokenAt(1)).toStrictEqual({
        offset: 0,
        type: 'VariableName',
        value: 'foo'
      });

      expect(editor.getTokenAt(11)).toStrictEqual({
        offset: 10,
        type: 'VariableName',
        value: 'bar'
      });
    });
    it('should return preceding token when it is the last token', async () => {
      model.mimeType = 'text/x-python';
      model.sharedModel.setSource('import');
      // Needed to have the sharedModel content transferred to the editor document
      await sleep(0.01);
      expect(editor.getTokenAt(6)).toStrictEqual({
        type: 'import',
        offset: 0,
        value: 'import'
      });
    });
    it('should return token of parent when erronous leaf is found', async () => {
      model.mimeType = 'text/x-python';
      model.sharedModel.setSource('a = "/home');
      // Needed to have the sharedModel content transferred to the editor document
      await sleep(0.01);
      expect(editor.getTokenAt(10)).toStrictEqual({
        offset: 4,
        type: 'String',
        value: '"/home'
      });
    });
  });

  describe('#getTokens()', () => {
    it('should get a list of tokens', async () => {
      model.mimeType = 'text/x-python';
      model.sharedModel.setSource('foo = "a"\nbar = 1');
      // Needed to have the sharedModel content transferred to the editor document
      await sleep(0.01);
      expect(editor.getTokens()).toStrictEqual([
        {
          offset: 0,
          type: 'VariableName',
          value: 'foo'
        },
        {
          offset: 4,
          type: 'AssignOp',
          value: '='
        },
        {
          offset: 6,
          type: 'String',
          value: '"a"'
        },
        {
          offset: 10,
          type: 'VariableName',
          value: 'bar'
        },
        {
          offset: 14,
          type: 'AssignOp',
          value: '='
        },
        {
          offset: 16,
          type: 'Number',
          value: '1'
        }
      ]);
    });
  });

  describe('#replaceSelection()', () => {
    it('should set text in empty editor', () => {
      model.sharedModel.setSource('');
      editor.replaceSelection('text');
      expect(model.sharedModel.source).toBe('text');
      expect(editor.getSelection().end.column).toBe(4);
    });

    it('should replace from start to end of selection', () => {
      model.sharedModel.setSource('axxc');
      const start = { line: 0, column: 1 };
      const end = { line: 0, column: 3 };
      editor.setSelection({ start, end });
      editor.replaceSelection('b');
      expect(model.sharedModel.source).toBe('abc');
    });
  });
});
