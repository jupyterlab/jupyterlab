// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DatastoreExt } from '@jupyterlab/datastore';

import { JSONObject } from '@phosphor/coreutils';

import { Datastore } from '@phosphor/datastore';

import { IDisposable } from '@phosphor/disposable';

import { ISignal, Signal } from '@phosphor/signaling';

import { CodeEditorData, ICodeEditorData } from './data';

/**
 * A namespace for code editors.
 *
 * #### Notes
 * - A code editor is a set of common assumptions which hold for all concrete editors.
 * - Changes in implementations of the code editor should only be caused by changes in concrete editors.
 * - Common JLab services which are based on the code editor should belong to `IEditorServices`.
 */
export namespace CodeEditor {
  /**
   * A zero-based position in the editor.
   */
  export interface IPosition extends JSONObject {
    /**
     * The cursor line number.
     */
    readonly line: number;

    /**
     * The cursor column number.
     */
    readonly column: number;
  }

  /**
   * The dimension of an element.
   */
  export interface IDimension {
    /**
     * The width of an element in pixels.
     */
    readonly width: number;

    /**
     * The height of an element in pixels.
     */
    readonly height: number;
  }

  /**
   * An interface describing editor state coordinates.
   */
  export interface ICoordinate extends JSONObject, ClientRect {}

  /**
   * A range.
   */
  export interface IRange extends JSONObject {
    /**
     * The position of the first character in the current range.
     *
     * #### Notes
     * If this position is greater than [end] then the range is considered
     * to be backward.
     */
    readonly start: IPosition;

    /**
     * The position of the last character in the current range.
     *
     * #### Notes
     * If this position is less than [start] then the range is considered
     * to be backward.
     */
    readonly end: IPosition;
  }

  /**
   * A selection style.
   */
  export interface ISelectionStyle extends JSONObject {
    /**
     * A class name added to a selection.
     */
    className: string;

    /**
     * A display name added to a selection.
     */
    displayName: string;

    /**
     * A color for UI elements.
     */
    color: string;
  }

  /**
   * The default selection style.
   */
  export const defaultSelectionStyle: ISelectionStyle = {
    className: '',
    displayName: '',
    color: '#2196F3'
  };

  /**
   * A text selection.
   */
  export interface ITextSelection extends IRange {
    /**
     * The uuid of the text selection owner.
     */
    readonly uuid: string;

    /**
     * The style of this selection.
     */
    readonly style: ISelectionStyle;
  }

  /**
   * An interface for a text token, such as a word, keyword, or variable.
   */
  export interface IToken {
    /**
     * The value of the token.
     */
    value: string;

    /**
     * The offset of the token in the code editor.
     */
    offset: number;

    /**
     * An optional type for the token.
     */
    type?: string;
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
   *   - it can change selections belonging to it
   *   - but it must not change selections belonging to other selection owners
   * - otherwise it must not change any selection
   */

  /**
   * An editor model.
   */
  export interface IModel extends IDisposable {
    /**
     * The text stored in the model.
     */
    value: string;

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
    readonly selections: { [id: string]: ITextSelection[] };

    /**
     * The location in the datastore in which this codeeditor keeps its data.
     */
    readonly data: ICodeEditorData.DataLocation;
  }

  /**
   * The default implementation of the editor model.
   */
  export class Model implements IModel {
    /**
     * Construct a new Model.
     */
    constructor(options?: Model.IOptions) {
      options = options || {};

      if (options.data) {
        this.data = options.data;
      } else {
        const datastore = (this._datastore = CodeEditorData.createStore());
        this.data = {
          datastore,
          record: {
            schema: CodeEditorData.SCHEMA,
            record: 'data'
          }
        };
      }
      const { datastore, record } = this.data;
      if (!DatastoreExt.getRecord(datastore, record)) {
        this.isPrepopulated = false;
        // Initialize the record if it hasn't been.
        DatastoreExt.withTransaction(datastore, () => {
          DatastoreExt.updateRecord(datastore, record, {
            mimeType: options.mimeType || 'text/plain',
            text: { index: 0, remove: 0, text: options.value || '' }
          });
        });
      } else {
        this.isPrepopulated = true;
        // Possibly override any data existing in the record with options
        // provided by the user.
        if (options.value) {
          this.value = options.value;
        }
        if (options.mimeType) {
          this.mimeType = options.mimeType;
        }
        if (!this.mimeType) {
          this.mimeType = 'text/plain';
        }
      }
    }

    /**
     * The record in the datastore in which this codeeditor keeps its data.
     */
    readonly data: ICodeEditorData.DataLocation;

    readonly isPrepopulated: boolean;

    /**
     * Get the value of the model.
     */
    get value(): string {
      return DatastoreExt.getField(this.data.datastore, {
        ...this.data.record,
        field: 'text'
      });
    }
    set value(value: string) {
      const current = this.value;
      DatastoreExt.withTransaction(this.data.datastore, () => {
        DatastoreExt.updateField(
          this.data.datastore,
          { ...this.data.record, field: 'text' },
          {
            index: 0,
            remove: current.length,
            text: value
          }
        );
      });
    }

    /**
     * Get the selections for the model.
     */
    get selections(): { [id: string]: ITextSelection[] } {
      return DatastoreExt.getField(this.data.datastore, {
        ...this.data.record,
        field: 'selections'
      });
    }

    /**
     * A mime type of the model.
     */
    get mimeType(): string {
      return DatastoreExt.getField(this.data.datastore, {
        ...this.data.record,
        field: 'mimeType'
      });
    }
    set mimeType(newValue: string) {
      const oldValue = this.mimeType;
      if (oldValue === newValue) {
        return;
      }
      const { datastore, record } = this.data;
      DatastoreExt.withTransaction(datastore, () => {
        DatastoreExt.updateField(
          datastore,
          { ...record, field: 'mimeType' },
          newValue
        );
      });
    }

    /**
     * Whether the model is disposed.
     */
    get isDisposed(): boolean {
      return this._isDisposed;
    }

    /**
     * Dispose of the resources used by the model.
     */
    dispose(): void {
      if (this._isDisposed) {
        return;
      }
      if (this._datastore) {
        this._datastore.dispose();
        this._datastore = null;
      }
      this._isDisposed = true;
      Signal.clearData(this);
    }

    private _isDisposed = false;
    private _datastore: Datastore | null = null;
  }

  /**
   * A selection owner.
   */
  export interface ISelectionOwner {
    /**
     * The uuid of this selection owner.
     */
    uuid: string;

    /**
     * Returns the primary position of the cursor, never `null`.
     */
    getCursorPosition(): IPosition;

    /**
     * Set the primary position of the cursor.
     *
     * @param position - The new primary position.
     *
     * #### Notes
     * This will remove any secondary cursors.
     */
    setCursorPosition(position: IPosition): void;

    /**
     * Returns the primary selection, never `null`.
     */
    getSelection(): IRange;

    /**
     * Set the primary selection.
     *
     * @param selection - The desired selection range.
     *
     * #### Notes
     * This will remove any secondary cursors.
     */
    setSelection(selection: IRange): void;

    /**
     * Gets the selections for all the cursors, never `null` or empty.
     */
    getSelections(): IRange[];

    /**
     * Sets the selections for all the cursors.
     *
     * @param selections - The new selections.
     *
     * #### Notes
     * Cursors will be removed or added, as necessary.
     * Passing an empty array resets a cursor position to the start of a
     * document.
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
  export type KeydownHandler = (
    instance: IEditor,
    event: KeyboardEvent
  ) => boolean;

  /**
   * The location of requested edges.
   */
  export type EdgeLocation = 'top' | 'topLine' | 'bottom';

  /**
   * A widget that provides a code editor.
   */
  export interface IEditor extends ISelectionOwner, IDisposable {
    /**
     * A signal emitted when either the top or bottom edge is requested.
     */
    readonly edgeRequested: ISignal<IEditor, EdgeLocation>;

    /**
     * The default selection style for the editor.
     */
    selectionStyle: CodeEditor.ISelectionStyle;

    /**
     * The DOM node that hosts the editor.
     */
    readonly host: HTMLElement;

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
     * Get the number of lines in the eidtor.
     */
    readonly lineCount: number;

    /**
     * Get a config option for the editor.
     */
    getOption<K extends keyof IConfig>(option: K): IConfig[K];

    /**
     * Set a config option for the editor.
     */
    setOption<K extends keyof IConfig>(option: K, value: IConfig[K]): void;

    /**
     * Returns the content for the given line number.
     *
     * @param line - The line of interest.
     *
     * @returns The value of the line.
     *
     * #### Notes
     * Lines are 0-based, and accessing a line out of range returns
     * `undefined`.
     */
    getLine(line: number): string | undefined;

    /**
     * Find an offset for the given position.
     *
     * @param position - The position of interest.
     *
     * @returns The offset at the position, clamped to the extent of the
     * editor contents.
     */
    getOffsetAt(position: IPosition): number;

    /**
     * Find a position for the given offset.
     *
     * @param offset - The offset of interest.
     *
     * @returns The position at the offset, clamped to the extent of the
     * editor contents.
     */
    getPositionAt(offset: number): IPosition | undefined;

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
     * Brings browser focus to this editor text.
     */
    focus(): void;

    /**
     * Test whether the editor has keyboard focus.
     */
    hasFocus(): boolean;

    /**
     * Explicitly blur the editor.
     */
    blur(): void;

    /**
     * Repaint the editor.
     *
     * #### Notes
     * A repainted editor should fit to its host node.
     */
    refresh(): void;

    /**
     * Resize the editor to fit its host node.
     */
    resizeToFit(): void;

    /**
     * Add a keydown handler to the editor.
     *
     * @param handler - A keydown handler.
     *
     * @returns A disposable that can be used to remove the handler.
     */
    addKeydownHandler(handler: KeydownHandler): IDisposable;

    /**
     * Set the size of the editor.
     *
     * @param size - The desired size.
     *
     * #### Notes
     * Use `null` if the size is unknown.
     */
    setSize(size: IDimension | null): void;

    /**
     * Reveals the given position in the editor.
     *
     * @param position - The desired position to reveal.
     */
    revealPosition(position: IPosition): void;

    /**
     * Reveals the given selection in the editor.
     *
     * @param position - The desired selection to reveal.
     */
    revealSelection(selection: IRange): void;

    /**
     * Get the window coordinates given a cursor position.
     *
     * @param position - The desired position.
     *
     * @returns The coordinates of the position.
     */
    getCoordinateForPosition(position: IPosition): ICoordinate;

    /**
     * Get the cursor position given window coordinates.
     *
     * @param coordinate - The desired coordinate.
     *
     * @returns The position of the coordinates, or null if not
     *   contained in the editor.
     */
    getPositionForCoordinate(coordinate: ICoordinate): IPosition | null;

    /**
     * Inserts a new line at the cursor position and indents it.
     */
    newIndentedLine(): void;

    /**
     * Gets the token at a given position.
     */
    getTokenForPosition(position: IPosition): IToken;

    /**
     * Gets the list of tokens for the editor model.
     */
    getTokens(): IToken[];
  }

  /**
   * A factory used to create a code editor.
   */
  export type Factory = (options: IOptions) => CodeEditor.IEditor;

  /**
   * The configuration options for an editor.
   */
  export interface IConfig {
    /**
     * User preferred font family for text editors.
     */
    fontFamily: string | null;

    /**
     * User preferred size in pixel of the font used in text editors.
     */
    fontSize: number | null;

    /**
     * User preferred text line height, as a multiplier of font size.
     */
    lineHeight: number | null;

    /**
     * Whether line numbers should be displayed.
     */
    lineNumbers: boolean;

    /**
     * Control the line wrapping of the editor. Possible values are:
     * - "off", lines will never wrap.
     * - "on", lines will wrap at the viewport border.
     * - "wordWrapColumn", lines will wrap at `wordWrapColumn`.
     * - "bounded", lines will wrap at minimum between viewport width and wordWrapColumn.
     */
    lineWrap: 'off' | 'on' | 'wordWrapColumn' | 'bounded';

    /**
     * Whether the editor is read-only.
     */
    readOnly: boolean;

    /**
     * The number of spaces a tab is equal to.
     */
    tabSize: number;

    /**
     * Whether to insert spaces when pressing Tab.
     */
    insertSpaces: boolean;

    /**
     * Whether to highlight matching brackets when one of them is selected.
     */
    matchBrackets: boolean;

    /**
     * Whether to automatically close brackets after opening them.
     */
    autoClosingBrackets: boolean;

    /**
     * The column where to break text line.
     */
    wordWrapColumn: number;

    /**
     * Column index at which rulers should be added.
     */
    rulers: Array<number>;

    /**
     * Wheter to allow code folding
     */
    codeFolding: boolean;
  }

  /**
   * The default configuration options for an editor.
   */
  export let defaultConfig: IConfig = {
    fontFamily: null,
    fontSize: null,
    lineHeight: null,
    lineNumbers: false,
    lineWrap: 'on',
    wordWrapColumn: 80,
    readOnly: false,
    tabSize: 4,
    insertSpaces: true,
    matchBrackets: true,
    autoClosingBrackets: true,
    rulers: [],
    codeFolding: false
  };

  /**
   * The options used to initialize an editor.
   */
  export interface IOptions {
    /**
     * The host widget used by the editor.
     */
    host: HTMLElement;

    /**
     * The model used by the editor.
     */
    model: IModel;

    /**
     * The desired uuid for the editor.
     */
    uuid?: string;

    /**
     * The default selection style for the editor.
     */
    selectionStyle?: Partial<CodeEditor.ISelectionStyle>;

    /**
     * The configuration options for the editor.
     */
    config?: Partial<IConfig>;
  }

  export namespace Model {
    export interface IOptions {
      /**
       * The initial value of the model.
       */
      value?: string;

      /**
       * The mimetype of the model.
       */
      mimeType?: string;

      /**
       * A location in an existing datastore in which to store the model.
       */
      data?: ICodeEditorData.DataLocation;
    }
  }
}
