// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  ICellModel,
} from './model';

import {
  CodeEditor
} from '../../codeeditor';

import {
  CodeEditorWidget
} from '../../codeeditor/widget';

import {
  IChangedArgs
} from '../../common/interfaces';

import {
  ObservableString
} from '../../common/observablestring';


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
 * The class name added to cell editor widget nodes.
 */
const CELL_EDITOR_CLASS = 'jp-CellEditor';


/**
 * A code editor widget for a cell editor.
 */
export
class CellEditorWidget extends CodeEditorWidget {
  /**
   * Construct a new cell editor widget.
   */
  constructor(options: CodeEditorWidget.IOptions) {
    super(options);
    this.addClass(CELL_EDITOR_CLASS);

    this.editor.model.value.changed.connect(() => {
      this.onEditorModelChange();
    });
    this.editor.addKeydownHandler((editor, event) => {
      return this.onEditorKeydown(editor, event);
    });
  }

  /**
   * A signal emitted when a tab (text) completion is requested.
   */
  completionRequested: ISignal<this, CellEditorWidget.ICompletionRequest>;

  /**
   * A signal emitted when either the top or bottom edge is requested.
   */
  edgeRequested: ISignal<this, CellEditorWidget.EdgeLocation>;

  /**
   * A signal emitted when a text change is completed.
   */
  textChanged: ISignal<this, CellEditorWidget.ITextChange>;

  /**
   * Handle change events from the editor model.
   */
  protected onEditorModelChange(): void {
    let editor = this.editor;
    let newValue = editor.model.value.text;
    let cursorPosition = editor.getCursorPosition();
    let position = editor.getOffsetAt(cursorPosition);
    let line = cursorPosition.line;
    let ch = cursorPosition.column;
    let coords = editor.getCoordinate(cursorPosition);
    let chHeight = editor.lineHeight;
    let chWidth = editor.charWidth;
    this.textChanged.emit({
      line, ch, chHeight, chWidth, coords, position, newValue
    });
  }

  /**
   * Handle keydown events from the editor.
   */
  protected onEditorKeydown(editor: CodeEditor.IEditor, event: KeyboardEvent): boolean {
    let editorModel = editor.model;
    let cursorPosition = editor.getCursorPosition();
    let line = cursorPosition.line;
    let ch = cursorPosition.column;

    if (event.keyCode === TAB) {
      // If the tab is modified, ignore it.
      if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
        return false;
      }
      this.onTabEvent(event, ch, line);
      return false;
    }

    if (line === 0 && ch === 0 && event.keyCode === UP_ARROW) {
        if (!event.shiftKey) {
          this.edgeRequested.emit('top');
        }
        return false;
    }

    let lastLine = editor.lineCount - 1;
    let lastCh = editor.getLine(lastLine).length;
    if (line === lastLine && ch === lastCh && event.keyCode === DOWN_ARROW) {
      if (!event.shiftKey) {
        this.edgeRequested.emit('bottom');
      }
      return false;
    }
    return false;
  }

  /**
   * Handle a tab key press.
   */
  protected onTabEvent(event: KeyboardEvent, ch: number, line: number): void {
    let editor = this.editor;
    let editorModel = editor.model;

    // If there is a text selection, no completion requests should be emitted.
    const selection = editor.getSelection();
    if (selection.start === selection.end) {
      return;
    }

    let currentValue = editorModel.value.text;
    let currentLine = currentValue.split('\n')[line];
    let chHeight = editor.lineHeight;
    let chWidth = editor.charWidth;
    let coords = editor.getCoordinate({
      line: line,
      column: ch
    });
    let position = editor.getOffsetAt({
      line: line,
      column: ch
    });

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
    this.completionRequested.emit(data as CellEditorWidget.ICompletionRequest);
  }
}

/**
 * The namespace for `CellEditorWidget` statics.
 */
export
namespace CellEditorWidget {
  /**
   * The location of requested edges.
   */
  export type EdgeLocation = 'top' | 'bottom';

  /**
   * An interface describing the state of the editor in an event.
   */
  export
  interface IEditorState extends JSONObject {
    /**
     * The character number of the editor cursor within a line.
     */
    readonly ch: number;

    /**
     * The height of a character in the editor.
     */
    readonly chHeight: number;

    /**
     * The width of a character in the editor.
     */
    readonly chWidth: number;

    /**
     * The line number of the editor cursor.
     */
    readonly line: number;

    /**
     * The coordinate position of the cursor.
     */
    readonly coords: CodeEditor.ICoordinate;

    /**
     * The cursor position of the request, including line breaks.
     */
    readonly position: number;
  }

  /**
   * An interface describing editor text changes.
   */
  export
  interface ITextChange extends IEditorState {
    /**
     * The new value of the editor text.
     */
    readonly newValue: string;
  }

  /**
   * An interface describing completion requests.
   */
  export
  interface ICompletionRequest extends IEditorState {
    /**
     * The current value of the editor text.
     */
    readonly currentValue: string;
  }
}


// Define the signals for the `CellEditorWidget` class.
defineSignal(CellEditorWidget.prototype, 'completionRequested');
defineSignal(CellEditorWidget.prototype, 'edgeRequested');
defineSignal(CellEditorWidget.prototype, 'textChanged');
