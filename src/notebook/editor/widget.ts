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
  loadModeByMIME
} from 'jupyter-js-ui/lib/codemirror';

import {
  Message
} from 'phosphor-messaging';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  ResizeMessage, Widget
} from 'phosphor-widget';

import {
  IEditorModel
} from './model';


/**
 * The class name added to Editor widget instances.
 */
const EDITOR_CLASS = 'jp-Editor';

/**
 * The class name added to CodeMirrorWidget instances.
 */
const CODEMIRROR_CLASS = 'jp-CodeMirror';

/**
 * The class name added to a fixed height editor.
 */
const FIXED_HEIGHT_CLASS = 'jp-mod-fixedHeight';

/**
 * The key code for the up arrow key.
 */
const UP_ARROW = 38;

/**
 * The key code for the down arrow key.
 */
const DOWN_ARROW = 40;

/**
 * Initialize diff match patch.
 */
let diffMatchPatch = new dmp.diff_match_patch();

/**
 * The interface for an editor widget.
 */
export
interface IEditorWidget extends Widget {
  /**
   * The model for the editor widget.
   */
  model: IEditorModel;

  /**
   * Focus the editor.
   */
  focus(): void;
}


/**
 * A widget which hosts a CodeMirror editor.
 */
export
class CodeMirrorWidget extends Widget implements IEditorWidget {
  /**
   * Construct a CodeMirror widget.
   */
  constructor(model: IEditorModel) {
    super();
    this.addClass(EDITOR_CLASS);
    this.addClass(CODEMIRROR_CLASS);
    let editor = CodeMirror(this.node);
    this._editor = editor;
    this._model = model;
    this.updateMimetype(model.mimetype);
    this.updateFilename(model.filename);
    this.updateReadOnly(model.readOnly);
    this.updateTabSize(model.tabSize);
    this.updateLineNumbers(model.lineNumbers);
    this.updateFixedHeight(model.fixedHeight);
    this.updateText(model.text);
    CodeMirror.on(this._editor.getDoc(), 'change', (instance, change) => {
      if (change.origin !== 'setValue') {
        this._model.text = instance.getValue();
      }
    });
    CodeMirror.on(editor, 'keydown', (instance: any, event: KeyboardEvent) => {
      let doc = editor.getDoc();
      let cursor = doc.getCursor();
      let line = cursor.line;
      let ch = cursor.ch;
      if (line === 0 && ch === 0 && event.keyCode === UP_ARROW) {
        this._model.edgeRequested.emit('top');
        return
      }
      let lastLine = doc.lastLine();
      let lastCh = doc.getLineHandle(lastLine).text.length;
      if (line === lastLine && ch === lastCh && event.keyCode === DOWN_ARROW) {
        this._model.edgeRequested.emit('bottom');
        return
      }
    });
    model.stateChanged.connect(this.onModelStateChanged, this);
  }

  /**
   * Get the editor model.
   *
   * #### Notes
   * This is a read-only property.
   */
  get model(): IEditorModel {
    return this._model;
  }

  /**
   * Focus the editor.
   */
  focus(): void {
    this._editor.focus();
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    this._editor = null;
    this._model.dispose();
    this._model = null;
    super.dispose();
  }

  /**
   * Update whether the editor has a fixed maximum height.
   */
  protected updateFixedHeight(fixedHeight: boolean): void {
    this.toggleClass(FIXED_HEIGHT_CLASS, fixedHeight);
  }

  /**
   * Update the text in the widget.
   */
  protected updateText(text: string): void {
    if (!this.isAttached || !this.isVisible) {
      this._needsUpdate = true;
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
        loadModeByMIME(this._editor, info.mime);
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
      loadModeByMIME(this._editor, info.mime);
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
    if (readOnly) {
      this._editor.setOption('readOnly', 'nocursor');
    } else {
      this._editor.setOption('readOnly', false);
    }
  }

  /**
   * Handle afterAttach messages.
   */
  protected onAfterAttach(msg: Message): void {
    if (this._needsUpdate) this.update();
    this._editor.refresh();
  }

  /**
   * A message handler invoked on an `'after-show'` message.
   */
  protected onAfterShow(msg: Message): void {
    if (this._needsUpdate) this.update();
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
    this._needsUpdate = false;
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
    switch (args.name) {
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

  private _editor: CodeMirror.Editor = null;
  private _model: IEditorModel = null;
  private _needsUpdate = false;
}
