// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  ISignal, clearSignalData, defineSignal
} from 'phosphor/lib/core/signaling';

import {
  Widget
} from 'phosphor/lib/ui/widget';


/**
 * A namespace for code editors.
 */
export
namespace CodeEditor {
  /**
   * A zero-based position in the editor.
   */
  export
  interface ICursorPosition {
    /**
     * The cursor line number.
     */
    line: number;

    /**
     * The cursor column number.
     */
    column: number;
  }

  /**
   * An interface describing editor state coordinates.
   */
  export
  interface ICoords {
    /**
     * The left coordinate value.
     */
    readonly left: number;

    /**
     * The right coordinate value.
     */
    readonly right: number;

    /**
     * The top coordinate value.
     */
    readonly top: number;

    /**
     * The bottom coordinate value.
     */
    readonly bottom: number;
  }

  /**
   * Configuration options for the editor.
   */
  export
  interface IConfiguration extends IDisposable {
    /**
     * A signal emitted when the configuration changes.
     */
    changed: ISignal<IConfiguration, string>;

    /**
     * Whether line numbers should be displayed. Defaults to false.
     */
    lineNumbers: boolean;

    /**
     * Set to false for horizontal scrolling. Defaults to true.
     */
    wordWrap: boolean;

    /**
     * Whether the editor is read-only.  Defaults to false.
     */
    readOnly: boolean;

    /**
     * The number of spaces a tab is considered equal to. Defaults to 4.
     */
    tabSize: number;

    /**
     * Translate tabs to spaces. Defaults to true.
     */
    tabsToSpaces: boolean;

    /**
     * Set to false to stop auto pairing quotes, brackets etc.
     * Defaults to true.
     */
    autoMatchEnabled: boolean;

    /**
     * Set to false to disable highlighting the brackets surrounding the
     * cursor. Defaults to true.
     */
    matchBrackets: boolean;

    /**
     * Set to false to disable scrolling past the end of the buffer.
     * Defaults to false.
     */
    scrollPastEnd: boolean;
  }

  /**
   * An editor model.
   */
  export
  interface IModel extends IDisposable {
    /**
     * A signal emitted when a content of this model changed.
     */
    valueChanged: ISignal<IModel, string>;

    /**
     * A signal emitted when the uri changes.
     */
    uriChanged: ISignal<IModel, string>;

    /**
     * A signal emitted when the mime type changes.
     */
    mimeTypeChanged: ISignal<IModel, string>;

    /**
     * The uri associated with this model.
     */
    uri: string;

    /**
     * A mime type for this model.
     */
    mimeType: string;

    /**
     * The text stored in this model.
     */
    value: string;

    /**
     * Get the number of lines in the model.
     */
    readonly lineCount: number;

    /**
     * Returns the content for the given line number.
     */
    getLine(line: number): string;

    /**
     * Find an offset for the given position.
     */
    getOffsetAt(position: ICursorPosition): number;

    /**
     * Find a position fot the given offset.
     */
    getPositionAt(offset: number): ICursorPosition;
  }

  /**
   * A keydown handler type.
   */
  export
  type KeydownHandler = (instance: IEditor, event: KeyboardEvent) => boolean;

  /**
   * A widget that provides a code editor.
   */
  export
  interface IEditor extends Widget {
    /**
     * A cursor position for this editor.
     */
    position: ICursorPosition;

    /**
     * The configuration used by the editor.
     */
    readonly config: IConfiguration;

    /**
     * The model used by the editor.
     */
    readonly model: IModel;

    /**
     * Handle keydown events for the editor.
     *
     * #### Notes
     * Return `true` to prevent the default handling of the event by the
     * editor.
     */
    onKeyDown: KeydownHandler;

    /**
     * Brings browser focus to this editor text.
     */
    focus(): void;

    /**
     * Test whether the editor has keyboard focus.
     */
    hasFocus(): boolean;

    /**
     * Set the size of the editor in pixels.
     */
    setSize(width: number, height: number): void;

    /**
     * Get the window coordinates given a cursor position.
     */
    getCoords(position: ICursorPosition): ICoords;
  }

  /**
   * The default implementation of the code editor model.
   */
  export
  class Model implements IModel {
    /**
     * A signal emitted when a content of this model changed.
     */
    valueChanged: ISignal<this, string>;

    /**
     * A signal emitted when the uri changes.
     */
    uriChanged: ISignal<this, string>;

    /**
     * A signal emitted when the mimetype changes.
     */
    mimeTypeChanged: ISignal<this, string>;

    /**
     * Whether the model is disposed.
     */
    get isDisposed(): boolean {
      return this._isDisposed;
    }

    /**
     * Dipose of the resources used by the model.
     */
    dispose(): void {
      if (this._isDisposed) {
        return;
      }
      this._isDisposed = true;
      clearSignalData(this);
    }

    /**
     * The uri associated with this model.
     */
    get uri(): string {
      return this._uri;
    }
    set uri(newValue: string) {
      let oldValue = this._uri;
      if (oldValue === newValue) {
        return;
      }
      this._uri = newValue;
      this.uriChanged.emit(newValue);
    }

    /**
     * A mime type for this model.
     */
    get mimeType(): string {
      return this._mimetype;
    }
    set mimeType(newValue: string) {
      let oldValue = this._mimetype;
      if (oldValue === newValue) {
        return;
      }
      this._mimetype = newValue;
      this.mimeTypeChanged.emit(newValue);
    }

    /**
     * The text stored in this model.
     */
    get value(): string {
      return this._value;
    }
    set value(newValue: string) {
      if (this._value === newValue) {
        return;
      }
      this._value = newValue;
      this.valueChanged.emit(newValue);
    }

    /**
     * Get the number of lines in the model.
     */
    get lineCount(): number {
      return this._value.split('\n').length;
    }

    /**
     * Returns the content for the given line number.
     */
    getLine(line: number): string {
      return this._value.split('\n')[line];
    }

    /**
     * Find an offset for the given position.
     */
    getOffsetAt(position: CodeEditor.ICursorPosition): number {
      let lines = this._value.split('\n');
      let before = lines.slice(0, position.line).join('\n').length;
      return before + position.column;
    }

    /**
     * Find a position fot the given offset.
     */
    getPositionAt(offset: number): CodeEditor.ICursorPosition {
      let text = this._value.slice(0, offset);
      let lines = text.split('\n');
      let column = lines[lines.length - 1].length;
      return { line: lines.length - 1, column };
    }

    private _uri = '';
    private _mimetype = '';
    private _value = '';
    private _isDisposed = false;
  }

  /**
   * The default implementation of the code editor configuration.
   */
  export
  class Configuration implements IConfiguration {
    /**
     * A signal emitted when the configuration changes.
     */
    changed: ISignal<IConfiguration, string>;

    /**
     * Whether line numbers should be displayed. Defaults to false.
     */
    get lineNumbers(): boolean {
      return this._lineNumbers;
    }
    set lineNumbers(value: boolean) {
      if (value !== this._lineNumbers) {
        this._lineNumbers = value;
        this.changed.emit('lineNumbers');
      }
    }

    /**
     * Set to false for horizontal scrolling. Defaults to true.
     */
    get wordWrap(): boolean {
      return this._wordWrap;
    }
    set wordWrap(value: boolean) {
      if (value !== this._wordWrap) {
        this._wordWrap = value;
        this.changed.emit('wordWrap');
      }
    }

    /**
     * Whether the editor is read-only.  Defaults to false.
     */
    get readOnly(): boolean {
      return this._readOnly;
    }
    set wordWrap(value: boolean) {
      if (value !== this._readOnly) {
        this._readOnly = value;
        this.changed.emit('readOnly');
      }
    }

    /**
     * The number of spaces a tab is considered equal to. Defaults to 4.
     */
    get tabSize(): number {
      return this._tabSize;
    }
    set tabSize(value: number) {
      if (value !== this._tabSize) {
        this._tabSize = value;
        this.changed.emit('tabSize');
      }
    }

    /**
     * Translate tabs to spaces. Defaults to true.
     */
    get tabsToSpaces(): boolean {
      return this._tabsToSpaces;
    }
    set tabsToSpaces(value: boolean) {
      if (value !== this._tabsToSpaces) {
        this._tabsToSpaces = value;
        this.changed.emit('tabsToSpaces');
      }
    }

    /**
     * Set to false to stop auto pairing quotes, brackets etc.
     * Defaults to true.
     */
    get autoMatchEnabled(): boolean {
      return this._autoMatchEnabled;
    }
    set autoMatchEnabled(value: boolean) {
      if (value !== this._autoMatchEnabled) {
        this._autoMatchEnabled = value;
        this.changed.emit('autoMatchEnabled');
      }
    }

    /**
     * Set to false to disable highlighting the brackets surrounding the
     * cursor. Defaults to true.
     */
    get matchBrackets(): boolean {
      return this._matchBrackets;
    }
    set matchBrackets(value: boolean) {
      if (value !== this._matchBrackets) {
        this._matchBrackets = value;
        this.changed.emit('matchBrackets');
      }
    }

    /**
     * Set to false to disable scrolling past the end of the buffer.
     * Defaults to false.
     */
    get scrollPastEnd(): boolean {
      return this._scrollPastEnd;
    }
    set scrollPastEnd(value: boolean) {
      if (value !== this._scrollPastEnd) {
        this._scrollPastEnd = value;
        this.changed.emit('scrollPastEnd');
      }
    }

    /**
     * Whether the model is disposed.
     */
    get isDisposed(): boolean {
      return this._isDisposed;
    }

    /**
     * Dipose of the resources used by the model.
     */
    dispose(): void {
      if (this._isDisposed) {
        return;
      }
      this._isDisposed = true;
      clearSignalData(this);
    }

    private _isDisposed = false;
    private _lineNumbers = false;
    private _wordWrap = true;
    private _readOnly = false;
    private _tabSize = 4;
    private _tabsToSpaces = true;
    private _autoMatchEnabled = true;
    private _matchBrackets = true;
    private _scrollPastEnd = false;
  }

}

defineSignal(CodeEditor.Editor.prototype, 'valueChanged');
defineSignal(CodeEditor.Editor.prototype, 'uriChanged');
defineSignal(CodeEditor.Editor.prototype, 'mimeTypeChanged');
defineSignal(CodeEditor.Configuration.prototype, 'changed');


/**
 * An implementation of an editor for an html text area.
 */
class TextAreaEditor extends Widget implements CodeEditor.IEditor {
  /**
   * Construct a new text editor.
   */
  constructor(config: CodeEditor.IConfiguration, model: CodeEditor.IModel) {
    super({ node: document.createElement('textarea') });
    this._model = model;
    this._config = config;
    let node = this.node as HTMLTextAreaElement;
    node.readOnly = config.readOnly;
    node.wrap = config.wordWrap ? 'hard' : 'soft';
    model.valueChanged.connect(this.onModelValueChanged, this);
    config.changed.connect(this.onConfigChanged, this);
  }

  get position(): CodeEditor.ICursorPosition {
    let node = this.node as HTMLTextAreaElement;
    return this._model.getPositionAt(node.selectionEnd);
  }

  get config(): CodeEditor.IConfiguration {
    return this._config;
  }

  get model(): CodeEditor.IModel {
    return this._model;
  }

  get onKeyDown(): CodeEditor.KeydownHandler {
    return this._handler;
  }
  set onKeyDown(value: CodeEditor.KeydownHandler) {
    this._handler = value;
  }

  /**
   * Brings browser focus to this editor text.
   */
  focus(): void {
    this.node.focus();
  }

  /**
   * Test whether the editor has keyboard focus.
   */
  hasFocus(): boolean {
    return document.activeElement === this.node;
  }

  /**
   * Set the size of the editor in pixels.
   */
  setSize(width: number, height: number): void {
    // override css here
  }

  /**
   * Get the window coordinates given a cursor position.
   */
  getCoords(position: CodeEditor.ICursorPosition): CodeEditor.ICoords {
    // more css measurements required
    return void 0;
  }

  handleEvent(event: Event): void {
    switch (event.type) {
    case 'keydown':
      this._evtKeydown(event as KeyboardEvent);
      break;
    case 'input':
      this._evtInput(event);
      break;
    }
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('keydown', this);
    this.node.addEventListener('input', this);
  }

  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('keydown', this);
    this.node.removeEventListener('input', this);
  }

  protected onModelValueChanged(sender: CodeEditor.IModel, args: string): void {
    (this.node as HTMLTextAreaElement).value = args;
  }

  protected onConfigChanged(config: CodeEditor.IConfiguration, args: string): void {
    let node = this.node as HTMLTextAreaElement;
    switch (args) {
    case 'readOnly':
      node.readOnly = config.readOnly;
      break;
    case 'wordWrap':
      node.wrap = config.wordWrap ? 'hard' : 'soft';
      break;
    }
  }

  private _evtKeydown(event: KeyboardEvent): void {
    let handler = this._handler;
    if (handler) {
      handler(this, event);
    }
  }

  private _evtInput(event: Event): void {
    let node = this.node as HTMLTextAreaElement;
    this.model.value = node.value;
  }

  private _model: CodeEditor.IModel;
  private _handler: CodeEditor.KeydownHandler = null;
  private _config: CodeEditor.IConfiguration = null;
}
