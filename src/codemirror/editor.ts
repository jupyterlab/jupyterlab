// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import 'codemirror/mode/meta';

import {
  ISignal, defineSignal
} from 'phosphor/lib/core/signaling';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  AbstractCodeEditor, IPosition, IDimension, IEditorModel, IEditorConfiguration
} from '../codeeditor/editor';

import {
  loadModeByFileName, loadModeByMIME
} from '../codemirror';

/**
 * The class name added to CodeMirrorWidget instances.
 */
const EDITOR_CLASS = 'jp-CodeMirrorWidget';

/**
 * The name of the default CodeMirror theme
 */
export
const DEFAULT_CODEMIRROR_THEME = 'jupyter';

/**
 * CodeMirror editor.
 */
export
class CodeMirrorEditor extends AbstractCodeEditor implements IEditorModel, IEditorConfiguration {

  /**
   * A signal emitted when a uri of this model changed.
   */
  uriChanged: ISignal<IEditorModel, void>;

  /**
   * A signal emitted when a content of this model changed.
   */
  contentChanged: ISignal<IEditorModel, void>;

  /**
   * A signal emitted when a mime type of this model changed.
   */
  mimeTypeChanged: ISignal<IEditorModel, void>;

  /**
   * A signal emitted when this configuration changed.
   */
  configurationChanged: ISignal<IEditorConfiguration, void>;

  /**
   * Construct a CodeMirror editor.
   */
  constructor(widget:Widget, options: CodeMirror.EditorConfiguration = {}) {
    super(widget);
    this.widget.addClass(EDITOR_CLASS);
    options.theme = (options.theme || DEFAULT_CODEMIRROR_THEME);
    this.codeMirrorEditor = CodeMirror(this.widget.node, options);

    const doc = this.codeMirrorEditor.getDoc();
    CodeMirror.on(doc, 'change', (instance, change) => {
      this.onDocChange(instance, change);
    });
  }

  /**
   * An underyling CodeMirror editor.
   */
  get codeMirrorEditor() {
    return this._editor;
  }

  /**
   * Dispose the editor.
   */
  protected _dispose() {
    this.codeMirrorEditor = null;
    super._dispose();
  }

  /**
   * Handle change events from the document.
   */
  protected onDocChange(doc: CodeMirror.Doc, change: CodeMirror.EditorChange) {
    if (change.origin !== 'setValue') {
      this.contentChanged.emit(void 0);
    }
  }
  
  /**
   * A cursor position for this editor.
   */
  getPosition(): IPosition {
    const cursor = this.codeMirrorEditor.getDoc().getCursor();
    return {
        line: cursor.line,
        column: cursor.ch
    };
  }

  setPosition(position: IPosition) {
    this.codeMirrorEditor.getDoc().setCursor({
        line: position.line,
        ch: position.column
    });
  }

  /**
   * Brings browser focus to this editor text.
   */
  focus(): void {
    this.codeMirrorEditor.focus();
  }

  /**
   * Test whether the editor has keyboard focus.
   */
  isFocused(): boolean {
    return this.codeMirrorEditor.hasFocus();
  }

  setSize(size:IDimension): void {
    if (size.width < 0 || size.height < 0) {
      this.codeMirrorEditor.refresh();
    } else {
      this.codeMirrorEditor.setSize(size.width, size.height);
    }
    this._needsRefresh = false;
  }

  refresh(): void {
    if (!this.widget.isVisible) {
      this._needsRefresh = true;
      return;
    }
    if (this._needsRefresh) {
      this.codeMirrorEditor.refresh();
      this._needsRefresh = false;
    }
  }

  /**
   * Returns a model for this editor.
   */
  getModel(): IEditorModel {
    return this;
  }

  /**
   * Get the text stored in this model.
   */
  getValue(): string {
    return this.codeMirrorEditor.getDoc().getValue();
  }

  /**
   * Replace the entire text contained in this model.
   */
  setValue(value: string) {
    this.codeMirrorEditor.getDoc().setValue(value);
  }

  /**
   * A path associated with this editor model.
   */
  get uri(): string {
    return this._uri;
  }

  set uri(uri:string) {
    this._uri = uri;
    loadModeByFileName(this.codeMirrorEditor, this._uri).then((mimeType)=> {
      this.mimeTypeChanged.emit(void 0);
    });
    this.uriChanged.emit(void 0);
  }

  /**
   * A mime type for this editor model.
   */
  get mimeType(): string {
    return this.codeMirrorEditor.getOption('mode');
  }

  set mimeType(mimeType:string) {
    loadModeByMIME(this.codeMirrorEditor, mimeType).then((mimeType)=> {
      this.mimeTypeChanged.emit(void 0);
    });
  }

  /**
   * Get the number of lines in the model.
   */
  getLineCount(): number {
    return this.codeMirrorEditor.getDoc().lineCount();
  }

  /**
   * Returns a last line number.
   */
  getLastLine(): number {
    return this.codeMirrorEditor.getDoc().lastLine();
  }

  /**
   * Returns a content for the given line number.
   */
  getLineContent(line:number): string {
    return this.codeMirrorEditor.getDoc().getLineHandle(line).text;
  }

  /**
   * Find an offset fot the given position.
   */
  getOffsetAt(position: IPosition): number {
    const codeMirrorPosition = this.toCodeMirrorPosition(position);
    return this.codeMirrorEditor.getDoc().indexFromPos(codeMirrorPosition);
  }

  /**
   * Find a position fot the given offset.
   */
  getPositionAt(offset: number): IPosition {
    const position = this.codeMirrorEditor.getDoc().posFromIndex(offset);
    return this.toPosition(position);
  }

  /**
   * Returns a configuration for this editor.
   */
  getConfiguration(): IEditorConfiguration {
    return this;
  }
  
  /**
   * Control the rendering of line numbers.
   */
  get lineNumbers(): boolean {
    return this.codeMirrorEditor.getOption('lineNumbers');
  }

  set lineNumbers(value: boolean) {
    this.codeMirrorEditor.setOption('lineNumbers', value);
    this.configurationChanged.emit(void 0);
  }

  /**
   * Should the editor be read only.
   */
  get readOnly(): boolean {
    return this.codeMirrorEditor.getOption('readOnly') === 'nocursor';
  }

  set readOnly(readOnly:boolean) {
    let option = readOnly ? 'nocursor' : false;
    this.codeMirrorEditor.setOption('readOnly', option);
    this.configurationChanged.emit(void 0);
  }

  /**
   * Convert a code mirror position to an editor position.
   */
  protected toPosition(position: CodeMirror.Position) {
    return {
      line: position.line,
      column: position.ch
    }
  }

  /**
   * Convert an editor position to a code mirror position.
   */
  protected toCodeMirrorPosition(position: IPosition) {
    return {
      line: position.line,
      ch: position.column
    }
  }

  private _uri:string
  private _needsRefresh = true;
  private _editor: CodeMirror.Editor = null;

}

// Define the signals for the `CodeMirrorEditor` class.
defineSignal(CodeMirrorEditor.prototype, 'uriChanged');
defineSignal(CodeMirrorEditor.prototype, 'contentChanged');
defineSignal(CodeMirrorEditor.prototype, 'mimeTypeChanged');
defineSignal(CodeMirrorEditor.prototype, 'configurationChanged');