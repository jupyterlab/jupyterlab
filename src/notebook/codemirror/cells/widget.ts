// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CellEditorWidget
} from '../../cells/editor';

import {
  CodeCellWidget
} from '../../cells/widget';

import {
  CellEditorPresenter, ICellEditorView, ICellEditorPresenter
} from '../../cells/presenter';

import {
  DefaultCellEditorWidgetDecorator
} from '../../cells/decorator';

import {
  CodeMirrorCellEditorWidget
} from './editor';

import {
  CompletableCodeMirrorCellEditorWidget
} from '../completion/editor';


/**
 * A code mirror renderer for a code cell widget.
 */
export
class CodeMirrorCodeCellWidgetRenderer extends CodeCellWidget.Renderer {
  /**
   * Construct a code mirror renderer for a code cell widget.
   */
  constructor(options: CodeMirrorCodeCellWidgetRenderer.IOptions = {}) {
    super();
    this._editorConfiguration = (options.editorConfiguration ||
      CodeMirrorCodeCellWidgetRenderer.defaultEditorConfiguration);
    this._decoratorProvider = (options.decoratorProvider ||
      CellEditorWidget.defaultDecoratorProvider);
    this._presenterProvider = (options.presenterProvider ||
      CellEditorWidget.defaulPresenterProvider);
  }

  /**
   * Construct a completable code mirro cell editor widget.
   */
  createCellEditor(): CellEditorWidget {
    const widget = new CompletableCodeMirrorCellEditorWidget(this._editorConfiguration);
    const decorator = this._decoratorProvider(widget);
    widget.presenter = this._presenterProvider(decorator, widget);
    return widget;
  }

  private _editorConfiguration: CodeMirror.EditorConfiguration = null;
  private _decoratorProvider: (editor: CodeMirrorCellEditorWidget) => ICellEditorView = null;
  private _presenterProvider: (decorator: ICellEditorView, editor: CodeMirrorCellEditorWidget) => ICellEditorPresenter = null;
}


/**
 * A namespace for `CodeMirrorCodeCellWidgetRenderer` statics.
 */
export
namespace CodeMirrorCodeCellWidgetRenderer {
  /**
   * The options used to construct a code mirror code cell widget renderer.
   */
  export
  interface IOptions {
    /**
     * A code mirror editor configuration.
     */
    editorConfiguration?: CodeMirror.EditorConfiguration;

    /**
     * A code mirror editor widget decorator provider.
     */
    decoratorProvider?: (editor: CodeMirrorCellEditorWidget) => ICellEditorView;

    /**
     * A cell editor view presenter provider.
     */
    presenterProvider?: (decorator: ICellEditorView, editor: CodeMirrorCellEditorWidget) => ICellEditorPresenter;
  }

  /**
   * A default code mirror configuration for a cell editor.
   */
  export
  const defaultEditorConfiguration: CodeMirror.EditorConfiguration = {
    // Default value of the theme is set in the parent constructor,
    // but could be overridden here
    indentUnit: 4,
    readOnly: false,
    extraKeys: {
      'Cmd-Right': 'goLineRight',
      'End': 'goLineRight',
      'Cmd-Left': 'goLineLeft',
      'Tab': 'indentMore',
      'Shift-Tab': 'indentLess',
      'Cmd-Alt-[': 'indentAuto',
      'Ctrl-Alt-[': 'indentAuto',
      'Cmd-/': 'toggleComment',
      'Ctrl-/': 'toggleComment',
    }
  };

  /**
   * A default code mirror renderer for a code cell widget.
   */
  export
  const defaultRenderer = new CodeMirrorCodeCellWidgetRenderer();
}
