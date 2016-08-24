// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  EditorWidget
} from '../../editorwidget/widget';

import {
  ICompletableEditorView
} from './view';
  
export * from '../../editorwidget/widget';
export * from './view';

/**
 * A completable editor widget.
 */
export
interface CompletableEditorWidget extends EditorWidget, ICompletableEditorView {
}

/**
 * Utilities for a completable editor widget.
 */
export
namespace CompletableEditorWidget {

  /**
   * Tests whether the given widget is a comletable editor widget.
   */
  export
  function is(widget:Widget|CompletableEditorWidget): widget is CompletableEditorWidget {
    return EditorWidget.is(widget) && ICompletableEditorView.is(widget);
  }

}

