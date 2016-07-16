// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import {
  CodeMirrorWidget
} from '../../codemirror/widget';

import {
  Message
} from 'phosphor-messaging';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  ICellModel
} from './model';

import {
  JSONObject
} from '../common/json';


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
 * The location of requested edges.
 */
export
type EdgeLocation = 'top' | 'bottom';

/**
 * The class name added to cell editor widget nodes.
 */
const CELL_EDITOR_CLASS = 'jp-CellEditor';


/**
 * The class name addded to the cell after it has been executed.
 */
const CELL_EXECUTED_CLASS = 'jp-ExecutedCell';

/**
 * An interface describing editor state coordinates.
 */
export
interface ICoords extends JSONObject {
  /**
   * The left coordinate value.
   */
  left: number;

  /**
   * The right coordinate value.
   */
  right: number;

  /**
   * The top coordinate value.
   */
  top: number;

  /**
   * The bottom coordinate value.
   */
  bottom: number;
}

/**
 * An interface describing the state of the editor in an event.
 */
export
interface IEditorState extends JSONObject {
  /**
   * The character number of the editor cursor within a line.
   */
  ch: number;

  /**
   * The height of a character in the editor.
   */
  chHeight: number;

  /**
   * The width of a character in the editor.
   */
  chWidth: number;

  /**
   * The line number of the editor cursor.
   */
  line: number;

  /**
   * The coordinate position of the cursor.
   */
  coords: ICoords;

  /**
   * The cursor position of the request, including line breaks.
   */
  position: number;
}


/**
 * An interface describing editor text changes.
 */
export
interface ITextChange extends IEditorState {
  /**
   * The old value of the editor text.
   */
  oldValue: string;

  /**
   * The new value of the editor text.
   */
  newValue: string;
}


/**
 * An interface describing completion requests.
 */
export
interface ICompletionRequest extends IEditorState {
  /**
   * The current value of the editor text.
   */
  currentValue: string;
}


/**
 * A widget for a cell editor.
 */
export
class CellEditorWidget extends CodeMirrorWidget {
  /**
   * Construct a new cell editor widget.
   */
  constructor(options: CodeMirror.EditorConfiguration = {}) {
    super(options);
    this.addClass(CELL_EDITOR_CLASS);

    CodeMirror.on(this.editor.getDoc(), 'change', (instance, change) => {
      this.onDocChange(instance, change);
    });
    CodeMirror.on(this.editor, 'keydown', (instance, evt) => {
      this.onEditorKeydown(instance, evt);
    });
  }

  /**
   * A signal emitted when either the top or bottom edge is requested.
   */
  get edgeRequested(): ISignal<CellEditorWidget, EdgeLocation> {
    return Private.edgeRequestedSignal.bind(this);
  }

  /**
   * A signal emitted when a text change is completed.
   */
  get textChanged(): ISignal<CellEditorWidget, ITextChange> {
    return Private.textChangedSignal.bind(this);
  }

  /**
   * A signal emitted when a tab (text) completion is requested.
   */
  get completionRequested(): ISignal<CellEditorWidget, ICompletionRequest> {
    return Private.completionRequestedSignal.bind(this);
  }

  /**
   * The cell model used by the editor.
   */
  get model(): ICellModel {
    return this._model;
  }
  set model(model: ICellModel) {
    if (!model && !this._model || model === this._model) {
      return;
    }

    let doc = this.editor.getDoc();

    // If the model is being replaced, disconnect the old signal handler.
    if (this._model) {
      this._model.stateChanged.disconnect(this.onModelStateChanged, this);
    }

    if (!model) {
      doc.setValue('');
      this._model = null;
      return;
    }

    this._model = model;
    doc.setValue(this._model.source || '');
    this._model.stateChanged.connect(this.onModelStateChanged, this);
  }

  /**
   * The line numbers state of the editor.
   */
  get lineNumbers(): boolean {
    return this.editor.getOption('lineNumbers');
  }
  set lineNumbers(value: boolean) {
    this.editor.setOption('lineNumbers', value);
  }

  /**
   * Dispose of the resources held by the editor.
   */
  dispose(): void {
    this._model = null;
    super.dispose();
  }

  /**
   * Get the current cursor position of the editor.
   */
  getCursorPosition(): number {
    let doc = this.editor.getDoc();
    let position = doc.getCursor();
    return doc.indexFromPos(position);
  }

  /**
   * Set the current cursor position of the editor.
   */
  setCursorPosition(position: number): void {
    let doc = this.editor.getDoc();
    doc.setCursor(doc.posFromIndex(position));
  }

  /**
   * Handle changes in the model state.
   */
  protected onModelStateChanged(model: ICellModel, args: IChangedArgs<any>): void {
    switch (args.name) {
    case 'source':
      let doc = this.editor.getDoc();
      if (doc.getValue() !== args.newValue) {
        doc.setValue(args.newValue);
      }
      break;
    default:
      break;
    }
  }

  /**
   * Handle change events from the document.
   */
  protected onDocChange(doc: CodeMirror.Doc, change: CodeMirror.EditorChange): void {
    if (change.origin === 'setValue') {
      return;
    }
    let model = this.model;
    let editor = this.editor;
    let oldValue = model.source;
    let newValue = doc.getValue();
    if (oldValue === newValue) {
      return;
    }
    model.source = newValue;

    let cursor = doc.getCursor();
    let line = cursor.line;
    let ch = cursor.ch;
    let chHeight = editor.defaultTextHeight();
    let chWidth = editor.defaultCharWidth();
    let coords = editor.charCoords({ line, ch }, 'page') as ICoords;
    let position = editor.getDoc().indexFromPos({ line, ch });
<<<<<<< HEAD
=======
    this.addClass(CELL_NEWLY_EDITED_CLASS);
    this.removeClass(CELL_EXECUTED_CLASS);
>>>>>>> 77f5e1a... Added a visaul indicator for cells that have been ran
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
      return this.onTabEvent(event, ch, line);
    }

    if (line === 0 && ch === 0 && event.keyCode === UP_ARROW) {
      this.edgeRequested.emit('top');
      return;
    }

    let lastLine = doc.lastLine();
    let lastCh = doc.getLineHandle(lastLine).text.length;
    if (line === lastLine && ch === lastCh && event.keyCode === DOWN_ARROW) {
      this.edgeRequested.emit('bottom');
      return;
    }
  }

  /**
   * Handle a tab key press.
   */
  protected onTabEvent(event: KeyboardEvent, ch: number, line: number): void {
    let editor = this.editor;
    let currentValue = editor.getDoc().getValue();
    let currentLine = currentValue.split('\n')[line];
    let chHeight = editor.defaultTextHeight();
    let chWidth = editor.defaultCharWidth();
    let coords = editor.charCoords({ line, ch }, 'page') as ICoords;
    let position = editor.getDoc().indexFromPos({ line, ch })

    // A completion request signal should only be emitted if the final
    // character of the current line is not whitespace. Otherwise, the
    // default tab action of creating a tab character should be allowed to
    // propagate.
    if (currentLine.match(/\S$/)) {
      let data = {
        line, ch, chHeight, chWidth, coords, position, currentValue
      };
      this.completionRequested.emit(data as ICompletionRequest);
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }

  private _model: ICellModel = null;
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * A signal emitted when either the top or bottom edge is requested.
   */
  export
  const edgeRequestedSignal = new Signal<CellEditorWidget, EdgeLocation>();

  /**
   * A signal emitted when a text change is completed.
   */
  export
  const textChangedSignal = new Signal<CellEditorWidget, ITextChange>();

  /**
   * A signal emitted when a tab (text) completion is requested.
   */
  export
  const completionRequestedSignal = new Signal<CellEditorWidget, ICompletionRequest>();
}
