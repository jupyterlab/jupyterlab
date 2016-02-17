// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import * as CodeMirror
  from 'codemirror';

import 'codemirror/mode/meta';

import 'codemirror/lib/codemirror.css';

import * as dmp
  from 'diff-match-patch';

import {
  Message
} from 'phosphor-messaging';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  ResizeMessage, Widget
} from 'phosphor-widget';


/**
 * The class name added to CodeMirrorWidget instances.
 */
const FILE_BROWSER_CLASS = 'jp-CodeMirrorWidget';


/**
 * The class name added to a fixed height editor.
 */
const FIXED_HEIGHT_CLASS = 'jp-mod-fixedHeight';


/**
 * Initialize diff match patch.
 */
let diffMatchPatch = new dmp.diff_match_patch();


/**
 * An interface required for implementing the editor model
 */
export
interface IEditorModel {
  /**
   * A signal emitted when the editor model state changes.
   */
  stateChanged: ISignal<IEditorModel, IChangedArgs<any>>;

  /**
   * A signal emitted when the editor model is selected.
   */
  selected: ISignal<IEditorModel, void>;

  /**
   * The text in the text editor.
   */
  text: string;

  /**
   * The mimetype of the text.
   *
   * #### Notes
   * The mimetype is used to set the syntax highlighting, for example.
   */
  mimetype: string;

  /**
   * The filename of the editor.
   */
  filename: string;

  /**
   * Whether the text editor has a fixed maximum height.
   *
   * #### Notes
   * If true, the editor has a fixed maximum height.  If false, the editor
   * resizes to fit the content.
   */
  fixedHeight: boolean;

  /**
   * A flag to determine whether to show line numbers.
   */
  lineNumbers: boolean;

  /**
   * A flag to determine whether to allow editing.
   */
  readOnly: boolean;

  /**
   * The number of spaces to insert for each tab.
   */
  tabSize: number;

  /**
   * Whether the contents of the editor are dirty.
   */
  dirty: boolean;

  /**
   * Select the editor model.
   */
  select(): void;
}


/**
 * The interface for an editor widget.
 */
export
interface IEditorWidget extends Widget {
  /**
   * The model for the editor widget.
   */
  model: IEditorModel;
}


/**
 * A widget which hosts a CodeMirror editor.
 */
export
class CodeMirrorWidget extends Widget {

  /**
   * Construct a CodeMirror widget.
   */
  constructor(model: IEditorModel) {
    super();
    this.addClass(FILE_BROWSER_CLASS);
    this._editor = CodeMirror(this.node);
    this.model = model;
    this.model.selected.connect(() => this._editor.focus());
    this._editor.on('change', () => {
      this.model.dirty = true;
    });
  }

  /**
   * Get the editor model.
   */
  get model(): IEditorModel {
    return this._model;
  }

  /**
   * Set the editor model.
   *
   * #### Notes
   * This is a no-op if the value is `null` or the existing model.
   */
  set model(value: IEditorModel) {
    if (value === null || value === this._model) {
      return;
    }
    if (this._model !== null) {
      this._model.stateChanged.disconnect(this.onModelStateChanged, this);
    }
    this._model = value;
    this.updateMimetype(value.mimetype);
    this.updateFilename(value.filename);
    this.updateReadOnly(value.readOnly);
    this.updateTabSize(value.tabSize);
    this.updateLineNumbers(value.lineNumbers);
    this.updateFixedHeight(value.fixedHeight);
    this.updateText(value.text);
    this._editor.on('change', (instance, change) => {
      this._model.text = this._editor.getDoc().getValue();
    });
    value.stateChanged.connect(this.onModelStateChanged, this);
  }

  /**
   * Update whether the editor has a fixed maximum height.
   */
  protected updateFixedHeight(fixedHeight: boolean): void {
    this.toggleClass(FIXED_HEIGHT_CLASS, fixedHeight);
  }

  /**
   * Update the text in the widget.
   *
   * #### Notes
   * This function attempts to restore the cursor to the correct
   * place by using the bitap algorithm to find the corresponding
   * position of the cursor in the new text.
   */
  protected updateText(text: string): void {
    if (!this.isAttached || !this.isVisible) {
      this._dirty = true;
      return;
    }
    this.update();
  }

  /**
   * Set the mode by given the mimetype.
   *
   * #### Notes
   * Valid mimetypes are listed in https://github.com/codemirror/CodeMirror/blob/master/mode/meta.js.
   */
  protected updateMimetype(mimetype: string): void {
    if (CodeMirror.mimeModes.hasOwnProperty(mimetype)) {
      this._editor.setOption('mode', mimetype);
    } else {
      let info = CodeMirror.findModeByMIME(mimetype);
      if (info) {
        this.loadCodeMirrorMode(info.mode, info.mime);
      }
    }
  }

  /**
   * Set the mode by the given filename if the mimetype is not set.
   */
  protected updateFilename(filename: string): void {
    this.title.text = filename;
    if (this._model.mimetype) {
      return;
    }
    let info = CodeMirror.findModeByFileName(filename);
    if (info) {
      this.loadCodeMirrorMode(info.mode, info.mime);
    }
  }

  /**
   * Set the tab size.
   */
  protected updateTabSize(size: number): void {
    this._editor.setOption('tabSize', size);
  }

  /**
   * Update whether line numbers are shown.
   */
  protected updateLineNumbers(lineNumbers: boolean): void {
    this._editor.setOption('lineNumbers', lineNumbers);
  }

  /**
   * Update the read only property of the editor.
   */
  protected updateReadOnly(readOnly: boolean): void {
    this._editor.setOption('readOnly', readOnly);
  }

  /**
   * Handle afterAttach messages.
   */
  protected onAfterAttach(msg: Message): void {
    if (this._dirty) this.update();
    this._editor.refresh();
  }

  /**
   * A message handler invoked on an `'after-show'` message.
   */
  protected onAfterShow(msg: Message): void {
    if (this._dirty) this.update();
    this._editor.refresh();
  }

  /**
   * Handle resize messages.
   */
  protected onResize(msg: ResizeMessage): void {
    if (msg.width < 0 || msg.height < 0) {
      this._editor.refresh();
    } else {
      this._editor.setSize(msg.width, msg.height);
    }
  }

  /**
   * A message handler invoked on an `'update-request'` message.
   */
  protected onUpdateRequest(msg: Message): void {
    this._dirty = false;
    let doc = this._editor.getDoc();
    let oldText = doc.getValue();
    let text = this._model.text;
    if (oldText !== text) {
      // TODO: do something smart with all the selections

      let oldCursor = doc.indexFromPos(doc.getCursor());
      let cursor = 0;
      if (oldCursor === oldText.length) {
        // if the cursor was at the end, keep it at the end
        cursor = text.length;
      } else {
        let fragment = oldText.substr(oldCursor, 10);
        cursor = diffMatchPatch.match_main(text, fragment, oldCursor);
      }

      doc.setValue(text);
      doc.setCursor(doc.posFromIndex(cursor));
    }
  }

  /**
   * Change handler for model updates.
   */
  protected onModelStateChanged(sender: IEditorModel, args: IChangedArgs<any>) {
    switch(args.name) {
    case 'fixedHeight':
      this.updateFixedHeight(args.newValue as boolean);
      break;
    case 'text':
      this.updateText(args.newValue as string);
      break;
    case 'filename':
      this.updateFilename(args.newValue as string);
      break;
    case 'mimetype':
      this.updateMimetype(args.newValue as string);
      break;
    case 'lineNumbers':
      this.updateLineNumbers(args.newValue as boolean);
      break;
    case 'readOnly':
      this.updateReadOnly(args.newValue as boolean);
      break;
    case 'tabSize':
      this.updateTabSize(args.newValue as number);
      break;
    }
  }

  /**
   * Load and set a CodeMirror mode.
   *
   * #### Notes
   * This assumes WebPack as the module loader.
   * It can be overriden by subclasses.
   */
  protected loadCodeMirrorMode(mode: string, mimetype: string): void {
    let editor = this._editor;
    if (CodeMirror.modes.hasOwnProperty(mode)) {
      editor.setOption('mode', mimetype);
    } else {
      // We statically require common modes so that the bundler
      // picks them up automatically.
      switch(mode) {
      case 'python':
        require('codemirror/mode/python/python');
        editor.setOption('mode', mimetype);
        break;
      case 'javascript':
      case 'typescript':
        require('codemirror/mode/javascript/javascript');
        editor.setOption('mode', mimetype);
        break;
      case 'css':
        require('codemirror/mode/css/css');
        editor.setOption('mode', mimetype);
        break;
      case 'julia':
        require('codemirror/mode/julia/julia');
        editor.setOption('mode', mimetype);
        break;
      case 'r':
        require('codemirror/mode/r/r');
        editor.setOption('mode', mimetype);
        break;
      case 'markdown':
        require('codemirror/mode/markdown/markdown');
        editor.setOption('mode', mimetype);
        break;
      case 'gfm':
        require('codemirror/mode/gfm/gfm');
        editor.setOption('mode', mimetype);
        break;
      default:
        // Load the remaining mode bundle asynchronously.
        require([`codemirror/mode/${mode}/${mode}.js`], () => {
          editor.setOption('mode', mimetype);
        });
        break;
      }
    }
  }

  private _editor: CodeMirror.Editor = null;
  private _model: IEditorModel = null;
  private _dirty = false;
}
