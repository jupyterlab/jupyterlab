// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import * as CodeMirror
  from 'codemirror';

import {
  getConfigOption
} from 'jupyter-js-utils';

import {
  CodeMirrorWidget
} from 'phosphor-codemirror';

import {
  Container, Token
} from 'phosphor-di';

import {
  IEditorHandler
} from './index';

import './plugin.css';


/**
 * Bundle common modes.
 */
import 'codemirror/mode/css/css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/julia/julia';
import 'codemirror/mode/python/python';
import 'codemirror/mode/r/r';
import 'codemirror/mode/markdown/markdown';
import './codemirror-ipython';


/**
 * Register the plugin contributions.
 *
 * @param container - The di container for type registration.
 *
 * #### Notes
 * This is called automatically when the plugin is loaded.
 */
export
function register(container: Container): void {
  container.register(IEditorHandler, EditorHandler);
}


/**
 * An implemenation of an IEditorHandler.
 */
class EditorHandler implements IEditorHandler {

  /**
   * The dependencies required by the editor handler.
   */
  static requires: Token<any>[] = [];

  /**
   * Create a new editor handler instance.
   */
  static create(): IEditorHandler {
    return new EditorHandler();
  }

  /**
   * Create a new IEditor instance.
   */
  createEditor(options?: CodeMirror.EditorConfiguration): CodeMirrorWidget {
    return new CodeMirrorWidget(options);
  }

  /**
   * A convenience method to get the text from the editor.
   */
  getText(widget: CodeMirrorWidget, text: string): string {
    return widget.editor.getDoc().getValue();
  }

  /**
   * A convenience method to set the text on the editor.
   */
  setText(widget: CodeMirrorWidget, text: string): void {
    widget.editor.getDoc().setValue(text);
  }

  /**
   * Set the editor mode by name.  This will lode the mode file
   * as needed.
   */
  setModeByName(widget: CodeMirrorWidget, mode: string): void {
    let info = CodeMirror.findModeByName(mode);
    if (info) {
      loadCodeMirrorMode(widget.editor, info.mode, info.mime);
    }
  }

  /**
   * Set the editor mode by file name.  This will lode the mode file
   * as needed.
   */
  setModeByFileName(widget: CodeMirrorWidget, filename: string): void {
    let info = CodeMirror.findModeByFileName(filename);
    if (info) {
      loadCodeMirrorMode(widget.editor, info.mode, info.mime);
    }
  }

  /**
   * Set the editor mode by mime type.  This will lode the mode file
   * as needed.
   */
  setModeByMIMEType(widget: CodeMirrorWidget, mime: string): void {
    let info = CodeMirror.findModeByMIME(mime);
    if (info) {
      loadCodeMirrorMode(widget.editor, info.mode, info.mime);
    }
  }
}

/**
 * Load and set a CodeMirror mode.
 *
 * #### Notes
 * This assumes WebPack as the module loader.
 */
function loadCodeMirrorMode(editor: CodeMirror.Editor, mode: string, mime: string): void {
  if (CodeMirror.modes.hasOwnProperty(mode)) {
    editor.setOption('mode', mime);
  } else {
    // Load the full codemirror mode bundle.
    require([`codemirror/mode/${mode}/${mode}.js`], () => {
      editor.setOption('mode', mime);
    });
  }
}
