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
   * The dimension of an element.
   */
  export
  interface IDimension {
    /**
     * The width of an element in pixels.  
     */
    width: number;

    /**
     * The height of an element in pixels.
     */
    height: number;
  }

  /**
   * An interface describing editor state coordinates.
   */
  export
  interface ICoordinate {
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
   * A range.
   */
  export
  interface IRange {
    /**
     * The position of the first character in the current range.
     *
     * #### Notes
     * If this position is greater than [end] then the range is considered
     * to be backward.
     */
    start: IPosition;

    /**
     * The position of the last character in the current range.
     *
     * #### Notes
     * If this position is less than [start] then the range is considered
     * to be backward.
     */
    end: IPosition;
  }

  /**
   * A marked range.
   */
  export
  interface IMarkedRange extends IRange {
    /**
     * A class name added to the range.
     */
    className?: string;

    /**
     * A display name added to the range.
     */
    displayName?: string;
  }

  /**
   * A text selection.
   */
  export
  interface ITextSelection extends IMarkedRange {
    /**
     * The uuid of the text selection owner.
     */
    uuid: string;
  }

  /**
   * An interface to manage selections by selection owners.
   * 
   * #### Definitions
   * - a user code that has an associated uuid is called a selection owner, see `CodeEditor.ISelectionOwner`
   * - a selection belongs to a selection owner only if it is associated with the owner by an uuid, see `CodeEditor.ITextSelection`
   * 
   * #### Read access
   * - any user code can observe any selection
   * 
   * #### Write access
   * - if a user code is a selection owner then:
   *   - it can change selections beloging to it
   *   - but it must not change selections beloging to other selection owners
   * - otherwise it must not change any selection
   */
  export
  interface ISelections {

    /**
     * A signal emitted when selections changes.
     */
    readonly changed: ISignal<Selections, ISelections.IChangedArgs>;

    /**
     * The uuids of selection owners.
     */
    readonly uuids: string[];

    /**
     * Returns the primary position of the cursor.
     */
    getCursorPosition(uuid: string): IPosition | null;

    /**
     * Set the primary position of the cursor. This will remove any secondary cursors.
     */
    setCursorPosition(uuid: string, position: IPosition | null): void;

    /**
     * Returns the primary selection.
     */
    getSelection(uuid: string): ITextSelection | null;

    /**
     * Set the primary selection. This will remove any secondary cursors.
     */
    setSelection(uuid: string, selection: ITextSelection | null): void;

    /**
     * Gets the selections for all the cursors in ascending order. 
     */
    getSelections(uuid: string): ITextSelection[];

    /**
     * Sets the selections for all the cursors.
     * Cursors will be removed or added, as necessary.
     */
    setSelections(uuid: string, newSelections: ITextSelection[]): void;
  }

  /**
   * A namespace for `ISelections`.
   */
  export
  namespace ISelections {
    /**
     * An arguments for the selection changed signal.
     */
    export
    interface IChangedArgs {
      /**
       * The uuid of a selection owner.
       */
      readonly uuid: string;
      /**
       * The old selections.
       */
      readonly oldSelections: ITextSelection[];
      /**
       * The new selections.
       */
      readonly newSelections: ITextSelection[];
    }
  }

  /**
   * Default implementation of `ISelections`.
   */
  export
  class Selections implements ISelections {

    /**
     * A signal emitted when selections changes.
     */
    readonly changed: ISignal<Selections, ISelections.IChangedArgs>;

    /**
     * Uuids of all selection owners.
     */
    get uuids(): string[] {
      return Object.keys(this._selections);
    }

    /**
     * Returns the primary position of the cursor.
     */
    getCursorPosition(uuid: string): IPosition | null {
      const selection = this.getSelection(uuid);
      return this.toPosition(selection);
    }

    /**
     * Set the primary position of the cursor. This will remove any secondary cursors.
     */
    setCursorPosition(uuid: string, position: IPosition | null) {
      const selection = this.toSelection(uuid, position);
      this.setSelection(uuid, selection);
    }

    /**
     * Returns the primary selection.
     */
    getSelection(uuid: string): ITextSelection | null {
      const selections = this.getSelections(uuid);
      return selections.length > 0 ? selections[0] : null;
    }

    /**
     * Set the primary selection. This will remove any secondary cursors.
     */
    setSelection(uuid: string, selection: ITextSelection | null) {
      const selections: ITextSelection[] = [];
      if (selection) {
        selections.push(selection);
      }
      this.setSelections(uuid, selections);
    }

    /**
     * Gets the selections for all the cursors in ascending order. 
     */
    getSelections(uuid: string): ITextSelection[] {
      const selections = this._selections[uuid];
      return selections ? selections : [];
    }

    /**
     * Sets the selections for all the cursors.
     * Cursors will be removed or added, as necessary.
     */
    setSelections(uuid: string, newSelections: ITextSelection[]): void {
      const oldSelections = this.getSelections(uuid);
      this.removeSelections(uuid);
      this.sortSelections(newSelections);
      this._selections[uuid] = newSelections;
      this.changed.emit({ uuid, oldSelections, newSelections });
    }

    /**
     * Sorts given selections in ascending order.
     */
    protected sortSelections(selections: ITextSelection[]) {
      selections.sort((selection, selection2) => {
        const result = selection.start.line - selection2.start.line;
        if (result !== 0) {
          return result;
        }
        return selection.start.column - selection2.start.column;
      });
    }

    /**
     * Converts the given position to a selection.
     */
    protected toSelection(uuid: string, position: IPosition | null): ITextSelection | null {
      return position ? { uuid, start: position, end: position } : null;
    }

    /**
     * Converts the given selection to a position.
     */
    protected toPosition(selection: ITextSelection | null): IPosition | null {
      return selection ? selection.start : null;
    }

    /**
     * Removes selections by the given uuid.
     */
    protected removeSelections(uuid: string) {
      delete this._selections[uuid];
    }

    private _selections: {
      [key: string]: ITextSelection[] | null
    } = {};
  }

  defineSignal(Selections.prototype, 'changed');

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
     * 
     * #### Notes
     * It is never `null`, the default mime type is `text/plain`.
     */
    mimeType: string;

    /**
     * The currently selected code.
     */
    readonly selections: ISelections;

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
  }

  /**
   * A selection owner.
   */
  export
  interface ISelectionOwner {
    /**
     * The uuid of this selection owner.
     */
    readonly uuid: string;
    /**
     * Returns the primary position of the cursor.
     */
    getCursorPosition(): IPosition;
    /**
     * Set the primary position of the cursor. This will remove any secondary cursors.
     */
    setCursorPosition(position: IPosition): void;
    /**
     * Returns the primary selection.
     */
    getSelection(): IRange;
    /**
     * Set the primary selection. This will remove any secondary cursors.
     */
    setSelection(selection: IRange): void;
    /**
     * Gets the selections for all the cursors.
     */
    getSelections(): IRange[];
    /**
     * Sets the selections for all the cursors.
     * Cursors will be removed or added, as necessary.
     */
    setSelections(selections: IRange[]): void;
  }

  /**
   * A keydown handler type.
   * 
   * #### Notes
   * Return `true` to prevent the default handling of the event by the
   * editor.
   */
  export
  type KeydownHandler = (instance: IEditor, event: KeyboardEvent) => boolean;

  /**
   * A widget that provides a code editor.
   */
  export
  interface IEditor extends ISelectionOwner, IDisposable {
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
     * The model used by the editor.
     */
    readonly model: IModel;

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
     */
    onKeyDown: KeydownHandler | null;

    /**
     * Brings browser focus to this editor text.
     */
    focus(): void;

    /**
     * Test whether the editor has keyboard focus.
     */
    hasFocus(): boolean;

    /**
     * Repaint editor. 
     */
    refresh(): void;

    /**
     * Sets the size of the editor.
     * 
     * #### Notes
     * Sets null if the size is unknown.
     */
    setSize(size: IDimension | null): void;

    /**
     * Reveals the given position in the editor.
     */
    revealPosition(position: IPosition): void;

    /**
     * Reveals the given selection in the editor.
     */
    revealSelection(selection: IRange): void;

    /**
     * Get the window coordinates given a cursor position.
     */
    getCoordinate(position: IPosition): ICoordinate;
  }

  /**
   * The options used to initialize an editor.
   */
  export
  interface IOptions {
    /**
     * Whether line numbers should be displayed. Defaults to false.
     */
    lineNumbers?: boolean;

    /**
     * Set to false for horizontal scrolling. Defaults to true.
     */
    wordWrap?: boolean;

    /**
     * Whether the editor is read-only. Defaults to false.
     */
    readOnly?: boolean;

    /**
     * Other options.
     */
    [key: string]: any;
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

    readonly selections = new Selections();

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
  readonly uuid = '1';
  /**
   * Construct a new text editor.
   */
  constructor(options: CodeEditor.IOptions, model: CodeEditor.IModel) {
    super({ node: document.createElement('textarea') });
    this._model = model;
    let node = this.node as HTMLTextAreaElement;
    node.readOnly = options.readOnly || false;
    node.wrap = options.wordWrap ? 'hard' : 'soft';
    model.selections.changed.connect(this.onModelSelectionsChanged, this);
    model.valueChanged.connect(this.onModelValueChanged, this);
    this.updateSelections();
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

  get onKeyDown(): CodeEditor.KeydownHandler | null {
    return this._handler;
  }
  set onKeyDown(value: CodeEditor.KeydownHandler | null) {
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
  setSize(dimension: CodeEditor.IDimension | null): void {
    // override css here
  }

  /**
   * Scroll the given cursor position into view.
   */
  revealPosition(pos: CodeEditor.IPosition): void {
    // set node scroll position here.
  }

  /**
   * Scroll the given cursor position into view.
   */
  revealSelection(selection: CodeEditor.IRange): void {
    // set node scroll position here.
  }

  /**
   * Get the window coordinates given a cursor position.
   */
  getCoordinate(position: CodeEditor.IPosition): CodeEditor.ICoordinate {
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

  setCursorPosition(position: CodeEditor.IPosition): void {
    this.setSelection({
      start: position,
      end: position
    });
  }

  getCursorPosition(): CodeEditor.IPosition {
    return this.getSelection().start;
  }

  setSelection(selection: CodeEditor.IRange | null): void {
    const node = this.node as HTMLTextAreaElement;
    if (selection) {
      const start = this.model.getOffsetAt(selection.start);
      const end = this.model.getOffsetAt(selection.end);
      node.setSelectionRange(start, end);
    } else {
      node.setSelectionRange(0, 0);
    }
  }

  getSelection(): CodeEditor.ITextSelection {
    const node = this.node as HTMLTextAreaElement;
    return {
      uuid: this.uuid,
      start: this.model.getPositionAt(node.selectionStart),
      end: this.model.getPositionAt(node.selectionEnd)
    };
  }

  getSelections(): CodeEditor.ITextSelection[] {
    return [this.getSelection()];
  }

  setSelections(selections: CodeEditor.IRange[]): void {
    this.setSelection(selections.length > 0 ? selections[0] : null);
  }

  protected onModelSelectionsChanged(sender: CodeEditor.ISelections, args: CodeEditor.ISelections.IChangedArgs) {
    // display foreign cursors
  }

  private _evtKeydown(event: KeyboardEvent): void {
    let handler = this._handler;
    if (handler) {
      handler(this, event);
    }
  }

  private _evtMouseUp(event: MouseEvent): void {
    this.updateSelections();
  }

  protected updateSelections() {
    this._changeGuard = true;
    const selection = this.getSelection();
    this._model.selections.setSelection(selection.uuid, selection);
    this._changeGuard = false;
  }

  private _evtInput(event: Event): void {
    let node = this.node as HTMLTextAreaElement;
    this._changeGuard = true;
    this.model.value = node.value;
    this._changeGuard = false;
  }

  private _model: CodeEditor.IModel;
  private _handler: CodeEditor.KeydownHandler | null = null;
  private _changeGuard = false;
}
