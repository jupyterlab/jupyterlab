// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IEditorView
} from '../view';

export
interface IStandalonEditorView extends IEditorView {

  setPath(path: string): void;
  setDirty(dirty: boolean): void;

}