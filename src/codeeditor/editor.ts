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

import {
  IChangedArgs
} from '../common/interfaces';

import {
  ObservableVector, IObservableVector
} from '../common/observablevector';


/**
 * A namespace for code editors.
 */
export
namespace CodeEditor {
  /**
   * A zero-based position in the editor.
   */
  export
  interface IPosition {
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
   * A text selection.
   */
  export
  interface ITextSelection {
    /**
     * The index to the first character in the current selection.
     *
     * #### Notes
     * If this position is greater than [end] then the selection is considered
     * to be backward.
     */
    start: number;

    /**
     * The index to the last character in the current selection.
     *
     * #### Notes
     * If this position is less than [start] then the selection is considered
     * to be backward.
     */
    end: number;

    /**
     * A class name added to the text selection.
     */
    className?: string;
  }

  /**
   * An editor model owner.
   */
  export
  interface IModelOwner extends IDisposable {

    /**
     * The uuid of the owner.
     */
    readonly uuid: string;

    /**
     * The model used by the owner.
     */
    readonly model: IModel;

    /**
     * The selections for all the cursors.
     * Cursors will be removed or added, as necessary.
     */
    readonly selections: IObservableVector<ITextSelection>;

    /**
     * Set the primary position of the cursor. This will remove any secondary cursors.
     */
    setCursorPosition(position: IPosition | null): void;

    /**
     * Returns the primary position of the cursor.
     */
    getCursorPosition(): IPosition | null;

    /**
     * Set the primary selection. This will remove any secondary cursors.
     */
    setSelection(selection: ITextSelection | null): void;

    /**
     * Returns the primary selection.
     */
    getSelection(): ITextSelection | null;
  }

  /**
   * A default implementation of IModelOwner.
   */
  export
  class ModelOwner implements IModelOwner {

    /**
     * The uuid of the owner.
     */
    readonly uuid: string;

    /**
     * The model used by the owner.
     */
    readonly model: IModel;

    /**
     * The selections for all the cursors.
     * Cursors will be removed or added, as necessary.
     */
    readonly selections = new ObservableVector<CodeEditor.ITextSelection>();

    /**
     * Creates a new instace.
     */
    constructor(options: ModelOwner.IOptions) {
      this.uuid = options.uuid;
      this.model = options.model;
    }

    /**
     * Whether the owner is disposed.
     */
    get isDisposed(): boolean {
      return this._isDisposed;
    }

    /**
     * Dipose of the resources used by the owner.
     */
    dispose(): void {
      if (this._isDisposed) {
        return;
      }
      this._isDisposed = true;
      this.selections.clear();
    }

    /**
     * Returns the primary position of the cursor.
     */
    getCursorPosition(): IPosition | null {
      const selection = this.getSelection();
      return IModel.toPosition(this.model, selection);
    }

    /**
     * Set the primary position of the cursor. This will remove any secondary cursors.
     */
    setCursorPosition(position: IPosition | null) {
      const selection = IModel.toSelection(this.model, position);
      this.setSelection(selection);
    }

    /**
     * Set the primary selection. This will remove any secondary cursors.
     */
    setSelection(selection: ITextSelection | null) {
      this.selections.clear();
      if (selection) {
        this.selections.pushBack(selection);
      }
    }

    /**
     * Returns the primary selection.
     */
    getSelection(): ITextSelection | null {
      const selection = this.selections.front;
      return selection ? selection : null;
    }

    protected _isDisposed = false;
  }

  /**
   * Utilities for ModelOwner.
   */
  export
  namespace ModelOwner {
    /**
     * A constructor options.
     */
    export
    interface IOptions {
      readonly uuid: string;
      readonly model: IModel;
    }
  }

  /**
   * An editor model.
   */
  export
  interface IModel extends IDisposable {
    /**
     * A signal emitted when the value changes.
     */
    valueChanged: ISignal<IModel, IChangedArgs<string>>;

    /**
     * A signal emitted when a property changes.
     */
    mimeTypeChanged: ISignal<IModel, IChangedArgs<string>>;

    /**
     * The text stored in the model.
     */
    value: string;  // TODO: this should be an iobservablestring.

    /**
     * A mime type of the model.
     */
    mimeType: string;

    /**
     * Get the number of lines in the model.
     */
    readonly lineCount: number;

    /**
     * The owners of the current model.
     */
    readonly owners: IObservableVector<IModelOwner>;

    /**
     * Returns the content for the given line number.
     */
    getLine(line: number): string;

    /**
     * Find an offset for the given position.
     */
    getOffsetAt(position: IPosition): number;

    /**
     * Find a position for the given offset.
     */
    getPositionAt(offset: number): IPosition;

    /**
     * Undo one edit (if any undo events are stored).
     */
    undo(): void;

    /**
     * Redo one undone edit.
     */
    redo(): void;

    /**
     * Clear the undo history.
     */
    clearHistory(): void;

    /**
     * Update mime type 
     */
    setMimeTypeFromPath(path: string): void;
  }

  /**
   * IModel utilities.
   */
  export
  namespace IModel {

    /**
     * Converts a position to a selection.
     */
    export
    function toPosition(model: IModel, selection: ITextSelection | null) {
      if (selection) {
        const offset = selection.start;
        return model.getPositionAt(offset);
      }
      return null;
    }

    /**
     * Converts a position to a selection.
     */
    export
    function toSelection(model: IModel, position: IPosition | null) {
      if (position) {
        const offset = model.getOffsetAt(position);
        return {
          start: offset,
          end: offset
        };
      }
      return null;
    }
  }

  /**
   * A keydown handler type.
   */
  export
  type KeydownHandler = (instance: IEditor, event: KeyboardEvent) => boolean;

  /**
   * A code editor.
   */
  export
  interface IEditor extends IModelOwner {

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
     * The height of a line in the editor in pixels.
     */
    readonly lineHeight: number;

    /**
     * The widget of a character in the editor in pixels.
     */
    readonly charWidth: number;

    /**
     * Handle keydown events for the editor.
     *
     * #### Notes
     * Return `true` to prevent the default handling of the event by the
     * editor.
     */
    onKeyDown: KeydownHandler | null;

    /**
     * Brings browser focus to this editor text.
     */
    focus(): void;

    /**
     * Repaint editor. 
     */
    refresh(afterShow?: boolean): void;

    /**
     * Test whether the editor has keyboard focus.
     */
    hasFocus(): boolean;

    /**
     * Set the size of the editor in pixels.
     */
    setSize(width: number, height: number): void;

    /**
     * Scroll the given cursor position into view.
     */
    scrollIntoView(pos: IPosition, margin?: number): void;

    /**
     * Get the window coordinates given a cursor position.
     */
    getCoords(position: IPosition): ICoords;

    /**
     * Get the primary cursor position.
     */
    getCursorPosition(): IPosition;

    /**
     * Set the primary cursor position.
     */
    setCursorPosition(position: IPosition): void;
  }

  /**
   * The options used to initialize an editor.
   */
  export
  class IOptions {
    /**
     * Whether line numbers should be displayed. Defaults to false.
     */
    lineNumbers?: boolean;

    /**
     * Set to false for horizontal scrolling. Defaults to true.
     */
    wordWrap?: boolean;

    /**
     * Whether the editor is read-only.  Defaults to false.
     */
    readOnly?: boolean;
  }

  /**
   * The default implementation of the code editor model.
   */
  export
  class Model implements IModel {
    /**
     * A signal emitted when a content of the model changed.
     */
    valueChanged: ISignal<this, IChangedArgs<string>>;

    /**
     * A signal emitted when a mimetype changes.
     */
    mimeTypeChanged: ISignal<this, IChangedArgs<string>>;

    /**
     * The owners of the current model.
     */
    readonly owners = new ObservableVector<IModelOwner>();

    get isDisposed() {
      return this._isDisposed;
    }

    dispose() {
      if (this.isDisposed) {
        return;
      }
      this._isDisposed = true;
      clearSignalData(this);
      this.owners.clear();
    }

    /**
     * A mime type of the model.
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
      this.mimeTypeChanged.emit({
        name: 'mimeType',
        oldValue,
        newValue
      });
    }

    /**
     * The text stored in the model.
     */
    get value(): string {
      return this._value;
    }
    set value(newValue: string) {
      let oldValue = this._value;
      if (oldValue === newValue) {
        return;
      }
      this._value = newValue;
      this.valueChanged.emit({
        name: 'value',
        oldValue,
        newValue
      });
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
    getOffsetAt(position: CodeEditor.IPosition): number {
      let lines = this._value.split('\n');
      let before = lines.slice(0, position.line).join('\n').length;
      return before + position.column;
    }

    /**
     * Find a position fot the given offset.
     */
    getPositionAt(offset: number): CodeEditor.IPosition {
      let text = this._value.slice(0, offset);
      let lines = text.split('\n');
      let column = lines[lines.length - 1].length;
      return { line: lines.length - 1, column };
    }

    /**
     * Undo one edit (if any undo events are stored).
     */
    undo(): void { /* no-op */ }

    /**
     * Redo one undone edit.
     */
    redo(): void { /* no-op */ }

    /**
     * Clear the undo history.
     */
    clearHistory(): void { /* no-op */ }

    /**
     * Set mime type for given path.
     */
    setMimeTypeFromPath(path: string): void {
      this.mimeType = '';
    }

    private _mimetype = '';
    private _value = '';
    private _isDisposed = false;
  }
}

defineSignal(CodeEditor.Model.prototype, 'valueChanged');
defineSignal(CodeEditor.Model.prototype, 'mimeTypeChanged');


/**
 * An implementation of an editor for an html text area.
 */
class TextAreaEditor extends Widget implements CodeEditor.IEditor {

  readonly selections = new ObservableVector<CodeEditor.ITextSelection>();

  /**
   * Construct a new text editor.
   */
  constructor(options: CodeEditor.IOptions, model: CodeEditor.IModel) {
    super({ node: document.createElement('textarea') });
    this._model = model;
    let node = this.node as HTMLTextAreaElement;
    node.readOnly = options.readOnly || false;
    node.wrap = options.wordWrap ? 'hard' : 'soft';
    model.valueChanged.connect(this.onModelValueChanged, this);
  }

  get uuid(): string {
    return this.id;
  }

  getCursorPosition(): CodeEditor.IPosition {
    const selection = this.getSelection();
    return CodeEditor.IModel.toPosition(this.model, selection);
  }

  setCursorPosition(position: CodeEditor.IPosition | null): void {
    const selection = CodeEditor.IModel.toSelection(this.model, position);
    this.setSelection(selection);
  }

  getSelection(): CodeEditor.ITextSelection {
    const node = this.node as HTMLTextAreaElement;
    return {
      start: node.selectionStart,
      end: node.selectionEnd
    };
  }

  setSelection(selection: CodeEditor.ITextSelection | null): void {
    const node = this.node as HTMLTextAreaElement;
    if (selection) {
        node.setSelectionRange(selection.start, selection.end);
    } else {
        node.setSelectionRange(0, 0);
    }
  }

  get lineNumbers(): boolean {
    return false;
  }
  set lineNumbers(value: boolean) {
    /* no-op*/
  }

  /**
   * Set to false for horizontal scrolling. Defaults to true.
   */
  get wordWrap(): boolean {
    return (this.node as HTMLTextAreaElement).wrap === 'hard';
  }
  set wordWrap(value: boolean) {
    (this.node as HTMLTextAreaElement).wrap = value ? 'hard' : 'soft';
  }

  /**
   * Whether the editor is read-only.  Defaults to false.
   */
  get readOnly(): boolean {
    return (this.node as HTMLTextAreaElement).readOnly;
  }
  set readOnly(value: boolean) {
    (this.node as HTMLTextAreaElement).readOnly = value;
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

  get charWidth(): number {
    // TODO css measurement
    return -1;
  }

  get lineHeight(): number {
    // TODO css measurement
    return -1;
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
   * Repaint the editor.
   */
  refresh(): void { /* no-op */ }

  /**
   * Set the size of the editor in pixels.
   */
  setSize(width: number, height: number): void {
    // override css here
  }

  /**
   * Scroll the given cursor position into view.
   */
  scrollIntoView(pos: CodeEditor.IPosition, margin?: number): void {
    // set node scroll position here.
  }

  /**
   * Get the window coordinates given a cursor position.
   */
  getCoords(position: CodeEditor.IPosition): CodeEditor.ICoords {
    // more css measurements required
    return void 0;
  }

  handleEvent(event: Event): void {
    switch (event.type) {
      case 'keydown':
        this._evtKeydown(event as KeyboardEvent);
        break;
      case 'mouseup':
        this._evtMouseUp(event as MouseEvent);
        break;
      case 'input':
        this._evtInput(event);
        break;
      default:
        break;
    }
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('keydown', this);
    this.node.addEventListener('mouseup', this);
    this.node.addEventListener('input', this);
  }

  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('keydown', this);
    this.node.removeEventListener('mouseup', this);
    this.node.removeEventListener('input', this);
  }

  protected onModelValueChanged(sender: CodeEditor.IModel, args: IChangedArgs<string>): void {
    if (this._changeGuard) {
      return;
    }
    (this.node as HTMLTextAreaElement).value = args.newValue;
  }

  private _evtKeydown(event: KeyboardEvent): void {
    let handler = this._handler;
    if (handler) {
      handler(this, event);
    }
  }

  private _evtMouseUp(event: MouseEvent): void {
    let node = this.node as HTMLTextAreaElement;
    this._changeGuard = true;
    this.selections.clear();
    this.selections.pushBack({
      start: node.selectionStart,
      end: node.selectionEnd
    });
    this._changeGuard = false;
  }

  private _evtInput(event: Event): void {
    let node = this.node as HTMLTextAreaElement;
    this._changeGuard = true;
    this.model.value = node.value;
    this._changeGuard = false;
  }

  private _model: CodeEditor.IModel;
  private _handler: CodeEditor.KeydownHandler = null;
  private _changeGuard = false;
}
