// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  EditorWidget
} from '../editorwidget/widget';

import {
  CodeMirrorEditorWidgetFactory
} from './factory';

import 'codemirror/addon/edit/matchbrackets.js';
import 'codemirror/addon/edit/closebrackets.js';
import 'codemirror/addon/comment/comment.js';
import 'codemirror/keymap/vim.js';

/**
 * The provider for a code mirror editor factory.
 */
export
const editorFactoryProvider: JupyterLabPlugin<EditorWidget.Factory> = {
  id: 'jupyter.services.editor.codemirror.factory',
  requires: [ICommandPalette],
  provides: EditorWidget.IFactory,
  activate: activateEditorFactoryProvider
};

/**
 * Activate the code mirror editor factory extension.
 */
function activateEditorFactoryProvider(app: JupyterLab, palette: ICommandPalette): EditorWidget.Factory {
  return new CodeMirrorEditorWidgetFactory(app, palette);
}
