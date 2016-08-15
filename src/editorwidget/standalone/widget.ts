// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISignal
} from 'phosphor/lib/core/signaling';

import {
  IStandalonEditorView
} from './view';

import {
  IStandaloneEditorPresenter
} from './presenter';

import {
  EditorWidget
} from '../widget';

import {
  IEditorView, ITextChange
} from '../view';

/**
  * The class name added to a jupyter code mirror widget.
  */
const EDITOR_CLASS = 'jp-EditorWidget';

/**
 * The class name added to a dirty widget.
 */
const DIRTY_CLASS = 'jp-mod-dirty';

export
interface StandaloneEditorWidget extends EditorWidget, IStandalonEditorView {
}

export
class StandaloneEditorDecorator implements IStandalonEditorView {

  isDisposed:boolean

  constructor(editor:StandaloneEditorWidget) {
    this._editor = editor;
    editor.addClass(EDITOR_CLASS)
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;

    this._editor.dispose();
    this._editor = null;
  }

  setPath(path: string): void {
    this._editor.title.label = path.split('/').pop();
    this._editor.setPath(path);
  }

  setDirty(dirty: boolean): void {
    if (dirty) {
      this._editor.title.className += ` ${DIRTY_CLASS}`;
    } else {
      this._editor.title.className = this._editor.title.className.replace(DIRTY_CLASS, '');
    }
    this._editor.setDirty(dirty);
  }

  get closed(): ISignal<IEditorView, void> {
    return this._editor.closed;
  }

  get contentChanged(): ISignal<IEditorView, ITextChange> {
    return this._editor.contentChanged;
  }

  getValue(): string {
    return this._editor.getValue();
  }

  setValue(value:string) {
    this._editor.setValue(value);
  }

  protected _editor:StandaloneEditorWidget

}