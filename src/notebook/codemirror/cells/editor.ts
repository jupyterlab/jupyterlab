// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import{
  defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import * as CodeMirror
  from 'codemirror';

import {
  loadModeByMIME
} from '../../../codemirror';

import {
  CodeMirrorEditor
} from '../../../codemirror/editor';

import {
  ICellModel
} from '../../cells/model';

import {
  EdgeLocation, ITextChange, ICompletionRequest, ICoords, AbstractCellEditorWidget
} from '../../cells/editor';


/**
 * The key code for the up arrow key.
 */
const UP_ARROW = 38;

/**
 * The key code for the down arrow key.
 */
const DOWN_ARROW = 40;

/**
 * The key code for the tab key.
 */
const TAB = 9;


/**
 * A code mirror widget for a cell editor.
 */
export
class CodeMirrorCellEditorWidget extends AbstractCellEditorWidget<CodeMirrorEditor> {
  /**
   * Construct a new cell editor widget.
   */
  constructor(options: CodeMirror.EditorConfiguration = {}) {
    super((widget) => {
      return new CodeMirrorEditor(widget, options);
    });

    CodeMirror.on(this.codeMirrorEditor.getDoc(), 'change', (instance, change) => {
      this.onDocChange(instance, change);
    });
    CodeMirror.on(this.codeMirrorEditor, 'keydown', (instance, evt) => {
      this.onEditorKeydown(instance, evt);
    });
  }

  /**
   * Returns an underyling CodeMirror editor.
   */
  get codeMirrorEditor() {
    return this.editor.codeMirrorEditor;
  }

  /**
   * Updates the widget when the associated cell model is changed. 
   */
  protected onCellModelChanged() {
    super.onCellModelChanged();
    if (this.model) {
      this.codeMirrorEditor.getDoc().clearHistory();
    }
  }

  /**
   * Handle change events from the document.
   */
  protected onDocChange(doc: CodeMirror.Doc, change: CodeMirror.EditorChange): void {
    let model = this.model;
    let editor = this.codeMirrorEditor;
    let oldValue = model.source;
    let newValue = doc.getValue();
    let cursor = doc.getCursor();
    let line = cursor.line;
    let ch = cursor.ch;
    let chHeight = editor.defaultTextHeight();
    let chWidth = editor.defaultCharWidth();
    let coords = editor.charCoords({ line, ch }, 'page') as ICoords;
    let position = editor.getDoc().indexFromPos({ line, ch });

    this.textChanged.emit({
      line, ch, chHeight, chWidth, coords, position, oldValue, newValue
    });
  }

  /**
   * Handle keydown events from the editor.
   */
  protected onEditorKeydown(editor: CodeMirror.Editor, event: KeyboardEvent): void {
    let doc = editor.getDoc();
    let cursor = doc.getCursor();
    let line = cursor.line;
    let ch = cursor.ch;

    if (event.keyCode === TAB) {
      // If the tab is modified, ignore it.
      if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
        return;
      }
      return this.onTabEvent(event, ch, line);
    }

    if (line === 0 && ch === 0 && event.keyCode === UP_ARROW) {
        if (!event.shiftKey) {
          this.edgeRequested.emit('top');
        }
        return;
    }

    let lastLine = doc.lastLine();
    let lastCh = doc.getLineHandle(lastLine).text.length;
    if (line === lastLine && ch === lastCh && event.keyCode === DOWN_ARROW) {
      if (!event.shiftKey) {
        this.edgeRequested.emit('bottom');
      }
      return;
    }
  }

  /**
   * Handle a tab key press.
   */
  protected onTabEvent(event: KeyboardEvent, ch: number, line: number): void {
    let editor = this.codeMirrorEditor;
    let doc = editor.getDoc();

    // If there is a text selection, no completion requests should be emitted.
    if (doc.getSelection()) {
      return;
    }

    let currentValue = doc.getValue();
    let currentLine = currentValue.split('\n')[line];
    let chHeight = editor.defaultTextHeight();
    let chWidth = editor.defaultCharWidth();
    let coords = editor.charCoords({ line, ch }, 'page') as ICoords;
    let position = editor.getDoc().indexFromPos({ line, ch });

    // A completion request signal should only be emitted if the current
    // character or a preceding character is not whitespace.
    //
    // Otherwise, the default tab action of creating a tab character should be
    // allowed to propagate.
    if (!currentLine.substring(0, ch).match(/\S/)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    let data = {
      line, ch, chHeight, chWidth, coords, position, currentValue
    };
    this.completionRequested.emit(data as ICompletionRequest);
  }
}