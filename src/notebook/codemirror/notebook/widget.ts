// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  RenderMime
} from '../../../rendermime';

import {
  ICodeCellModel, IMarkdownCellModel, IRawCellModel
} from '../../cells/model';

import {
  CellEditorWidget
} from '../../cells/editor';

import {
  CodeCellWidget, MarkdownCellWidget, RawCellWidget
} from '../../cells/widget';

import {
  Notebook, NotebookRenderer
} from '../../notebook/widget';

import {
  CodeMirrorCodeCellWidgetRenderer
} from '../cells/widget';


/**
 * A namespace for `CodeMirrorNotebookRenderer` statics.
 */
export
namespace CodeMirrorNotebookRenderer {
  /**
   * A default code mirror renderer for a code cell editor.
   */
  export
  const defaultCodeCellRenderer = new CodeMirrorCodeCellWidgetRenderer({
    decoratorProvider: (editor) => {
      editor.editor.setOption('matchBrackets', true);
      editor.editor.setOption('autoCloseBrackets', true);
      return CellEditorWidget.defaultDecoratorProvider(editor);
    }
  });

  /**
   * A default code mirror renderer for a markdown cell editor.
   */
  export
  const defaultMarkdownCellRenderer = new CodeMirrorCodeCellWidgetRenderer({
    decoratorProvider: (editor) => {
      // Turn on line wrapping for markdown cells.
      editor.editor.setOption('lineWrapping', true);
      return CellEditorWidget.defaultDecoratorProvider(editor);
    }
  });

  /**
   * A default code mirror renderer for a raw cell editor.
   */
  export
  const defaultRawCellRenderer = new CodeMirrorCodeCellWidgetRenderer({
    decoratorProvider: (editor) => {
      // Turn on line wrapping for markdown cells.
      editor.editor.setOption('lineWrapping', true);
      return CellEditorWidget.defaultDecoratorProvider(editor);
    }
  });

  /**
   * A default options for code mirror notebook renderer.
   */
  export
  const defaultOptions: NotebookRenderer.IOptions = {
    codeCellRenderer: defaultCodeCellRenderer,
    markdownCellRenderer: defaultMarkdownCellRenderer,
    rawCellRenderer: defaultRawCellRenderer
  };

  /**
   * A default code mirror renderer for a notebook.
   */
  export
  const defaultRenderer = new Notebook.Renderer(defaultOptions);
}
