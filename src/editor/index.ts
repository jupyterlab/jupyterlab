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
 * The interface for a jupyter editor widget.
 */
export
interface IEditor extends CodeMirrorWidget {

  /**
   * A convenience property to get/set the text on the editor.
   */
  text: string;

  /**
   * Set the editor mode by name.  This will lode the mode file
   * as needed.
   */
  setModeByName(mode: string): void;

  /**
   * Set the editor mode by file name.  This will lode the mode file
   * as needed.
   */
  setModeByFileName(filename: string): void;

  /**
   * Set the editor mode by mime type.  This will lode the mode file
   * as needed.
   */
  setModeByMIMEType(mime: string): void;
}


/**
 * A factory for creating a Jupyter editor.
 */
export
interface IEditorFactory {

  /**
   * Create a new IEditor instance.
   */
  createEditor(options?: CodeMirror.EditorConfiguration): IEditor;
}


/**
 * The dependency token for the `IEditorFactory` interface.
 */
export
const IEditorFactory = new Token<IEditorFactory>('jupyter-js-plugins.IEditorFactory');
