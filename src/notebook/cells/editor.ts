// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  ICellEditorView, ICellEditorPresenter, CellEditorPresenter
} from './presenter';

import {
  DefaultCellEditorWidgetDecorator
} from './decorator';

import {
  EditorWidget
} from '../../editorwidget/widget';

export * from './presenter';

/**
 * A cell editor widget.
 */
export
interface CellEditorWidget extends EditorWidget, ICellEditorView {
  presenter:ICellEditorPresenter
}

/**
 * Utilities for a cell editor widget.
 */
export
namespace CellEditorWidget {

  /**
   * Tests whether the given widget is a cell editor widget.
   */
  export
  function is(widget:Widget|CellEditorWidget): widget is CellEditorWidget {
    return EditorWidget.is(widget) &&
      ICellEditorView.is(widget) && 
      ('presenter' in widget);
  }

  /**
   * A default cell editor decorator provider.
   */
  export
  const defaultDecoratorProvider: (editor: CellEditorWidget) => ICellEditorView=(editor)=> {
    return new DefaultCellEditorWidgetDecorator(editor);
  }

  /**
   * A default cell editor presenter provider.
   */
  export
  const defaulPresenterProvider: (view: ICellEditorView) => ICellEditorPresenter=(view)=> {
    return new CellEditorPresenter(view);
  }

}
