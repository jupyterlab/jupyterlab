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
  IEditor, IEditorFactory
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
import 'codemirror/markdown/markdown';
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
  container.register(IEditorFactory, EditorFactory);
}


/**
 * An implemenation of an IEditorFactory.
 */
class EditorFactory implements IEditorFactory {

  /**
   * The dependencies required by the editor factory.
   */
  static requires: Token<any>[] = [];

  /**
   * Create a new editor factory instance.
   */
  static create(): IEditorFactory {
    return new EditorFactory();
  }

  /**
   * Create a new IEditor instance.
   */
  createEditor(options?: CodeMirror.EditorConfiguration): IEditor {
    return new Editor(options);
  }
}


/**
 * A default implementation of the jupyter editor widget.
 */
class Editor extends CodeMirrorWidget {

  /**
   * Get the text from the editor.
   */
  get text(): string {
    return this.editor.getDoc().getValue();
  }

  /**
   * Set the text on the editor.
   */
  set text(value: string) {
    this.editor.getDoc().setValue(value);
  }

  /**
   * Set the editor mode by name.  This will lode the mode file
   * as needed.
   */
  setModeByName(mode: string): void {
    let info = CodeMirror.findModeByName(mode);
    if (info) {
      this.loadCodeMirrorMode(info.mode, info.mime);
    }
  }

  /**
   * Set the editor mode by file name.  This will lode the mode file
   * as needed.
   */
  setModeByFileName(filename: string): void {
    let info = CodeMirror.findModeByFileName(filename);
    if (info) {
      this.loadCodeMirrorMode(info.mode, info.mime);
    }
  }

  /**
   * Set the editor mode by mime type.  This will lode the mode file
   * as needed.
   */
  setModeByMIMEType(mime: string): void {
    let info = CodeMirror.findModeByMIME(mime);
    if (info) {
      this.loadCodeMirrorMode(info.mode, info.mime);
    }
  }

  /**
   * Load and set a CodeMirror mode.
   *
   * #### Notes
   * This assumes WebPack as the module loader.
   */
  protected loadCodeMirrorMode(mode: string, mime: string): void {
    if (CodeMirror.modes.hasOwnProperty(mode)) {
      this.editor.setOption('mode', mime);
    } else {
      // Load the full codemirror mode bundle.
      require([`codemirror/mode/${mode}/${mode}.js`], () => {
        this.editor.setOption('mode', mime);
      });
    }
  }
}
