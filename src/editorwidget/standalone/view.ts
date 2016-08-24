// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IEditorView, IEditorModel
} from '../view';

export * from '../view';

/**
 * A standalone editor used to display the whole document.
 */
export
interface IStandaloneEditorView extends IEditorView {

    /**
     * Marks this editor as dirty.
     */
    setDirty(dirty: boolean): void;

}

/**
 * Utilities for a standalone editor view.
 */
export
namespace IStandaloneEditorView {

  /**
   * Tests whether the given editor view is standalone.
   */
  export
  function is(editorView:any): editorView is IStandaloneEditorView {
    return IEditorView.is(editorView) && editorView.setDirty !== undefined;
  }

}