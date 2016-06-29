// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel
} from 'jupyter-js-services';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  BaseCellWidget
} from '../cells/widget';

import {
  CellEditorWidget, ITextChange, ICompletionRequest
} from '../cells/editor';

import {
  CompletionWidget
} from './widget';


/**
 * A completion handler for cell widgets.
 */
export
class CellCompletionHandler implements IDisposable {
  /**
   * Construct a new completion handler for a widget.
   */
  constructor(completion: CompletionWidget) {
    this._completion = completion;
    this._completion.selected.connect(this._onCompletionSelected, this);
  }

  /**
   * Get whether the completion handler is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._completion === null;
  }

  /**
   * Dispose of the resources used by the handler.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._completion = null;
    this._kernel = null;
    this._activeCell = null;
  }

  /**
   * The kernel used by the completion handler.
   */
  get kernel(): IKernel {
    return this._kernel;
  }
  set kernel(value: IKernel) {
    this._kernel = value;
  }

  /**
   * The cell widget used by the completion handler.
   */
  get activeCell(): BaseCellWidget {
    return this._activeCell;
  }
  set activeCell(newValue: BaseCellWidget) {
    let editor: CellEditorWidget;
    if (this._activeCell && !this._activeCell.isDisposed) {
      editor = this._activeCell.editor;
      editor.textChanged.disconnect(this._onTextChanged, this);
      editor.completionRequested.disconnect(this._onCompletionRequested, this);
    }
    this._activeCell = newValue;
    if (newValue) {
      editor = newValue.editor;
      editor.textChanged.connect(this._onTextChanged, this);
      editor.completionRequested.connect(this._onCompletionRequested, this);
    }
  }

  /**
   * Handle a text changed signal from an editor.
   */
  private _onTextChanged(editor: CellEditorWidget, change: ITextChange): void {
    this._completion.model.handleTextChange(change);
  }

  /**
   * Handle a completion requested signal from an editor.
   */
  private _onCompletionRequested(editor: CellEditorWidget, change: ICompletionRequest): void {
    if (!this.kernel) {
      return;
    }
    this._completion.model.makeKernelRequest(change, this.kernel);
  }

  /**
   * Handle a completion selected signal from the completion widget.
   */
  private _onCompletionSelected(widget: CompletionWidget, value: string): void {
    if (!this._activeCell) {
      return;
    }
    let patch = this._completion.model.createPatch(value);
    let editor = this._activeCell.editor.editor;
    let doc = editor.getDoc();
    doc.setValue(patch.text);
    doc.setCursor(doc.posFromIndex(patch.position));
  }

  private _kernel: IKernel = null;
  private _activeCell: BaseCellWidget = null;
  private _completion: CompletionWidget = null;
}
