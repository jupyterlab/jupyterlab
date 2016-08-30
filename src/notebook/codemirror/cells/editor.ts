// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import * as CodeMirror
  from 'codemirror';

import {
  CodeMirrorEditorWidget
} from '../../../codemirror/widget';

import {
  CellEditorWidget, ICellEditorPresenter, EdgeLocation, ICellEditorView
} from '../../cells/editor';

export * from '../../../codemirror/widget';
export * from '../../cells/editor';

/**
 * The key code for the up arrow key.
 */
export
const UP_ARROW = 38;

/**
 * The key code for the down arrow key.
 */
export
const DOWN_ARROW = 40;

/**
 * A code mirror widget for a cell editor.
 */
export
class CodeMirrorCellEditorWidget extends CodeMirrorEditorWidget implements CellEditorWidget {
  
  /**
   * Construct a new cell editor widget.
   */
  constructor(options: CodeMirror.EditorConfiguration = {}) {
    super(options);
    CodeMirror.on(this.editor, 'keydown', (instance, evt) => {
      this.onEditorKeydown(instance, evt);
    });
  }

  /**
   * A presenter associated with this editor cell widget.
   */
  presenter:ICellEditorPresenter

  /**
   * A signal emitted when either the top or bottom edge is requested.
   */
  edgeRequested: ISignal<ICellEditorView, EdgeLocation>;

  /**
   * Disposes this editor cell widget.
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    super.dispose();

    if (this.presenter) {
      this.presenter.dispose();
      this.presenter = null
    }
  }

  setValue(value: string) {
    super.setValue(value);
    this.editor.getDoc().clearHistory();
  }

  /**
   * Handle keydown events from the editor.
   */
  protected onEditorKeydown(editor: CodeMirror.Editor, event: KeyboardEvent): void {
    if (event.shiftKey) {
      return;
    }
    if (event.keyCode === UP_ARROW) {
      this.presenter.onPositionUp(this);
    } else if (event.keyCode === DOWN_ARROW) {
      this.presenter.onPositionDown(this);
    }
  }

}

// Define the signals for the `CodeMirrorCellEditorWidget` class.
defineSignal(CodeMirrorCellEditorWidget.prototype, 'edgeRequested');
