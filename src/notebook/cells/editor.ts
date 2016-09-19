// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  ISignal, defineSignal
} from 'phosphor/lib/core/signaling';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  ICellModel,
} from './model';

import {
  CodeEditorWidget
} from '../../codeeditor/widget';

import {
  AbstractCodeEditor, CodeEditorProvider
} from '../../codeeditor/editor';

import {
  IChangedArgs
} from '../../common/interfaces';


/**
 * The location of requested edges.
 */
export type EdgeLocation = 'top' | 'bottom';


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
type ICellEditorWidget = AbstractCellEditorWidget<AbstractCodeEditor>;

/**
 * The class name added to cell editor widget nodes.
 */
const CELL_EDITOR_CLASS = 'jp-CellEditor';

/**
 * A base widget for a cell editor.
 */
export
abstract class AbstractCellEditorWidget<E extends AbstractCodeEditor> extends CodeEditorWidget<E> {

  constructor(editorProvider:CodeEditorProvider<E>) {
    super(editorProvider);
    this.addClass(CELL_EDITOR_CLASS);
    this.editor.getModel().contentChanged.connect((model) => {
      this.model.source = model.getValue();
    });
  }

  /**
   * A signal emitted when a tab (text) completion is requested.
   */
  completionRequested: ISignal<AbstractCellEditorWidget<E>, ICompletionRequest>;

  /**
   * A signal emitted when either the top or bottom edge is requested.
   */
  edgeRequested: ISignal<AbstractCellEditorWidget<E>, EdgeLocation>;

  /**
   * A signal emitted when a text change is completed.
   */
  textChanged: ISignal<AbstractCellEditorWidget<E>, ITextChange>;

  /**
   * Dispose of the resources held by the editor.
   */
  dispose(): void {
    this._model = null;
    super.dispose();
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

    // If the model is being replaced, disconnect the old signal handler.
    if (this._model) {
      this._model.stateChanged.disconnect(this.onModelStateChanged, this);
    }
    this._model = model;
    this.onCellModelChanged();
    if (this._model) {
      this._model.stateChanged.connect(this.onModelStateChanged, this);
    }
  }

  /**
   * Updates the widget when the associated cell model is changed. 
   */
  protected onCellModelChanged() {
    const value = this.model ? this.model.source || '' : ''
    this.editor.getModel().setValue(value);
  }

  /**
   * Handle changes in the model state.
   */
  protected onModelStateChanged(model: ICellModel, args: IChangedArgs<any>): void {
    switch (args.name) {
    case 'source':
      let doc = this.editor.getModel();
      if (doc.getValue() !== args.newValue) {
        doc.setValue(args.newValue);
      }
      break;
    default:
      break;
    }
  }

  private _model: ICellModel = null;

}


// Define the signals for the `CodeMirrorCellEditorWidget` class.
defineSignal(AbstractCellEditorWidget.prototype, 'completionRequested');
defineSignal(AbstractCellEditorWidget.prototype, 'edgeRequested');
defineSignal(AbstractCellEditorWidget.prototype, 'textChanged');

