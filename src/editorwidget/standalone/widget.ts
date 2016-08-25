// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from 'phosphor/lib/ui/widget';

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
   * Tests whether the given widget is a standalone editor widget.
   */
  export
  function is(widget:Widget|StandaloneEditorWidget): widget is StandaloneEditorWidget {
    return IStandaloneEditorView.is(widget) && widget.presenter !== undefined;
  }

  /**
   * A default standalone editor decorator provider.
   */
  export
  const defaultDecoratorProvider: (editor: StandaloneEditorWidget) => IStandaloneEditorView = (editor) => {
    return new DefaultStandaloneEditorWidgetDecorator(editor);
  }

  /**
   * A default standalone editor presenter provider.
   */
  export
  const defaultPresenterProvider: (view: IStandaloneEditorView) => IStandaloneEditorPresenter = (view) => {
    return new StandaloneEditorPresenter(view);
  }

}
