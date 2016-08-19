// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  EditorWidget
} from '../widget';

import {
  IStandaloneEditorPresenter, IStandaloneEditorView, StandaloneEditorPresenter
} from './presenter';

import {
  DefaultStandaloneEditorWidgetDecorator
} from './decorator';

export * from './view';

/**
 * A standalone editor widget.
 */
export
interface StandaloneEditorWidget extends EditorWidget, IStandaloneEditorView {
  presenter:IStandaloneEditorPresenter
}

/**
 * Utilities for a standalone editor widget.
 */
export
namespace StandaloneEditorWidget {

  /**
   * A default standalone editor widget initializer.
   */
  export
  const defaulEditorInitializer: (editor: StandaloneEditorWidget) => void=(editor)=> {
    const decorator = new DefaultStandaloneEditorWidgetDecorator(editor);
    editor.presenter = new StandaloneEditorPresenter(decorator);
  }

}