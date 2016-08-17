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
interface IStandalonEditorView extends IEditorView {

    /**
     * Marks this editor as dirty.
     */
    setDirty(dirty: boolean): void;

}