// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import * as CodeMirror
  from 'codemirror';

import {
  CodeMirrorWidget
} from 'phosphor-codemirror';

import {
  Token
} from 'phosphor-di';


/**
 * A handler for creating and manipulating Jupyter editors.
 */
export
interface IEditorHandler {

  /**
   * Create a new IEditor instance.
   */
  createEditor(options?: CodeMirror.EditorConfiguration): CodeMirrorWidget;

  /**
   * Set the editor mode by name.  This will lode the mode file
   * as needed.
   */
  setModeByName(widget: CodeMirrorWidget, mode: string): void;

  /**
   * Set the editor mode by file name.  This will lode the mode file
   * as needed.
   */
  setModeByFileName(widget: CodeMirrorWidget, filename: string): void;

  /**
   * Set the editor mode by mime type.  This will lode the mode file
   * as needed.
   */
  setModeByMIMEType(widget: CodeMirrorWidget, mime: string): void;

  /**
   * A convenience method to get the text from the editor.
   */
  getText(widget: CodeMirrorWidget, text: string): string;

  /**
   * A convenience method to set the text on the editor.
   */
  setText(widget: CodeMirrorWidget, text: string): void;
}


/**
 * The dependency token for the `IEditorHandler` interface.
 */
export
const IEditorHandler = new Token<IEditorHandler>('jupyter-js-plugins.IEditorHandler');
