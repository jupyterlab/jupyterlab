// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ICellEditorWidget
} from '../../cells/editor';

import {
  CodeCellWidget
} from '../../cells/widget';

import {
  CodeMirrorCellEditorWidget
} from './editor';

/**
 * A default code mirror configuration for a cell editor.
 */
export 
const defaultEditorConfiguration: CodeMirror.EditorConfiguration = {
  indentUnit: 4,
  readOnly: false,
  theme: 'default',
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
 * A code mirror renderer for a code cell widget.
 */
export 
class CodeMirrorCodeCellWidgetRenderer extends CodeCellWidget.Renderer {
  /**
   * Construct a code mirror renderer for a code cell widget.
   * @param editorConfiguration a code mirror editor configuration
   * @param editorInitializer a code cell widget initializer
   */
  constructor(options: {
    editorConfiguration?: CodeMirror.EditorConfiguration,
    editorInitializer?: (editor: CodeMirrorCellEditorWidget) => void
  } = {}) {
    super();
    this._editorConfiguration = options.editorConfiguration || this._editorConfiguration
    this._editorInitializer = options.editorInitializer || this._editorInitializer
  }

  /**
   * Construct a code cell widget.
   */
  createCellEditor(): ICellEditorWidget {
    const widget = new CodeMirrorCellEditorWidget(this._editorConfiguration);
    this._editorInitializer(widget);
    return widget;
  }

  private _editorConfiguration: CodeMirror.EditorConfiguration = defaultEditorConfiguration;
  private _editorInitializer: (editor: CodeMirrorCellEditorWidget) => void = editor => { };

}

/**
 * A default code mirror renderer for a code cell widget.
 */
export
const defaultCodeMirrorCodeCellWidgetRenderer = new CodeMirrorCodeCellWidgetRenderer();