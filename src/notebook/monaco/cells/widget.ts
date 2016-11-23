// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  uuid
} from '@jupyterlab/services/lib/utils';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  ICellEditorWidget
} from '../../cells/editor';

import {
  CodeCellWidget
} from '../../cells/widget';

import {
  MonacoCodeEditor
} from '../../../monaco/editor';

import {
  CodeCellEditorWidget
} from '../../cells/editor';


/**
 * A Monaco renderer for a code cell widget.
 */
export
class MonacoCodeCellWidgetRenderer extends CodeCellWidget.Renderer {
  /**
   * Construct a Monaco renderer for a code cell widget.
   * @param editorConfiguration a Monaco editor configuration
   * @param editorInitializer a code cell widget initializer
   */
  constructor(options: MonacoCodeCellWidgetRenderer.IOptions = {}) {
    super();
    this._editorConfiguration = (options.editorConfiguration ||
      MonacoCodeCellWidgetRenderer.defaultEditorConfiguration);
    this._editorInitializer = (options.editorInitializer ||
      (editor => { /* no-op */ }));
  }

  /**
   * Construct a code cell widget.
   */
  createCellEditor(): ICellEditorWidget {
    let configuration = this._editorConfiguration;

    const widget = new CodeCellEditorWidget((host: Widget) => {
      return new MonacoCodeEditor({
        uuid: uuid(),
        domElement: host.node,
        editorOptions: configuration
      });
    });
    this._editorInitializer((widget.editor as MonacoCodeEditor).editor);
    return widget;
  }

  private _editorConfiguration: MonacoCodeEditor.IEditorConstructionOptions = null;
  private _editorInitializer: (editor: monaco.editor.IEditor) => void = null;
}


/**
 * A namespace for `MonacoCodeCellWidgetRenderer` statics.
 */
export
namespace MonacoCodeCellWidgetRenderer {
  /**
   * The options used to construct a Monaco code cell widget renderer.
   */
  export
  interface IOptions {
    /**
     * A Monaco editor configuration.
     */
    editorConfiguration?: MonacoCodeEditor.IEditorConstructionOptions;

    /**
     * A code cell widget initializer function.
     */
    editorInitializer?: (editor: monaco.editor.IEditor) => void;
  }

  /**
   * A default Monaco configuration for a cell editor.
   */
  export
  const defaultEditorConfiguration: MonacoCodeEditor.IEditorConstructionOptions = {
    autoSizing: false,
    lineNumbers: 'off',
    lineNumbersMinChars: 4,
    lineDecorationsWidth: 5,
    scrollbar: {
      horizontal: 'hidden',
      vertical: 'hidden',
      horizontalScrollbarSize: 0,
      handleMouseWheel: false
    },
    contextmenu: false,
    scrollBeyondLastLine: false
  };

  /**
   * A default Monaco renderer for a code cell widget.
   */
  export
  const defaultRenderer = new MonacoCodeCellWidgetRenderer();
}
