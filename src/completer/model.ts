// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  deepEqual, JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  StringSearch
} from 'phosphor/lib/algorithm/searching';

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  ICompletionRequest, ITextChange
} from '../notebook/cells/editor';


/**
 * A filtered completion menu matching result.
 */
interface ICompletionMatch {
  /**
   * The raw text of a completion match.
   */
  raw: string;

  /**
   * A score which indicates the strength of the match.
   *
   * A lower score is better. Zero is the best possible score.
   */
  score: number;

  /**
   * The highlighted text of a completion match.
   */
  text: string;
}


/**
 * An object describing a completion option injection into text.
 */
export
interface ICompletionPatch {
  /**
   * The patch text.
   */
  text: string;

  /**
   * The position in the text where cursor should be after patch application.
   */
  position: number;
}


/**
 * A completer menu item.
 */
export
interface ICompleterItem {
  /**
   * The highlighted, marked up text of a visible completer item.
   */
  text: string;

  /**
   * The raw text of a visible completer item.
   */
  raw: string;
}


/**
 * A cursor span.
 */
export
interface ICursorSpan extends JSONObject {
  /**
   * The start position of the cursor.
   */
  start: number;

  /**
   * The end position of the cursor.
   */
  end: number;
}


/**
 * The data model backing a code completer widget.
 */
export
interface ICompleterModel extends IDisposable {
  /**
   * A signal emitted when state of the completer menu changes.
   */
  stateChanged: ISignal<ICompleterModel, void>;

  /**
   * The current text change details.
   */
  current: ITextChange;

  /**
   * The cursor details that the API has used to return matching options.
   */
  cursor: ICursorSpan;

  /**
   * The list of visible items in the completer menu.
   */
  items: ICompleterItem[];

  /**
   * The unfiltered list of all available options in a completer menu.
   */
  options: string[];

  /**
   * The original completer request details.
   */
  original: ICompletionRequest;

  /**
   * The query against which items are filtered.
   */
  query: string;

  /**
   * Handle a text change.
   */
  handleTextChange(change: ITextChange): void;

  /**
   * Create a resolved patch between the original state and a patch string.
   */
  createPatch(patch: string): ICompletionPatch;

  /**
   * Reset the state of the model.
   */
  reset(): void;
}


/**
 * An implementation of a completer model.
 */
export
class CompleterModel implements ICompleterModel {
  /**
   * A signal emitted when state of the completer menu changes.
   */
  stateChanged: ISignal<ICompleterModel, void>;

  /**
   * The list of visible items in the completer menu.
   *
   * #### Notes
   * This is a read-only property.
   */
  get items(): ICompleterItem[] {
    return this._filter();
  }

  /**
   * The unfiltered list of all available options in a completer menu.
   */
  get options(): string[] {
    return this._options;
  }
  set options(newValue: string[]) {
    if (deepEqual(newValue, this._options)) {
      return;
    }
    if (newValue && newValue.length) {
      this._options = [];
      this._options.push(...newValue);
    } else {
      this._options = null;
    }
    this.stateChanged.emit(void 0);
  }

  /**
   * The original completion request details.
   */
  get original(): ICompletionRequest {
    return this._original;
  }
  set original(newValue: ICompletionRequest) {
    if (deepEqual(newValue, this._original)) {
      return;
    }
    this._reset();
    this._original = newValue;
    this.stateChanged.emit(void 0);
  }

  /**
   * The current text change details.
   */
  get current(): ITextChange {
    return this._current;
  }
  set current(newValue: ITextChange) {
    if (deepEqual(newValue, this._current)) {
      return;
    }

    // Original request must always be set before a text change. If it isn't
    // the model fails silently.
    if (!this.original) {
      return;
    }

    // Cursor must always be set before a text change. This happens
    // automatically in the completer handler, but since `current` is a public
    // attribute, this defensive check is necessary.
    if (!this._cursor) {
      return;
    }
    this._current = newValue;

    if (!this.current) {
      this.stateChanged.emit(void 0);
      return;
    }

    let original = this._original;
    let current = this._current;
    let originalLine = original.currentValue.split('\n')[original.line];
    let currentLine = current.newValue.split('\n')[current.line];

    // If the text change means that the original start point has been preceded,
    // then the completion is no longer valid and should be reset.
    if (currentLine.length < originalLine.length) {
      this.reset();
      return;
    } else {
      let { start, end } = this._cursor;
      // Clip the front of the current line.
      let query = currentLine.substring(start);
      // Clip the back of the current line.
      let ending = originalLine.substring(end);
      query = query.substring(0, query.lastIndexOf(ending));
      this._query = query;
    }
    this.stateChanged.emit(void 0);
  }


  /**
   * The cursor details that the API has used to return matching options.
   */
  get cursor(): ICursorSpan {
    return this._cursor;
  }
  set cursor(newValue: ICursorSpan) {
    // Original request must always be set before a cursor change. If it isn't
    // the model fails silently.
    if (!this.original) {
      return;
    }
    this._cursor = newValue;
  }

  /**
   * The query against which items are filtered.
   */
  get query(): string {
    return this._query;
  }
  set query(newValue: string) {
    this._query = newValue;
  }

  /**
   * Get whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    clearSignalData(this);
    this._reset();
  }

  /**
   * Handle a text change.
   */
  handleTextChange(change: ITextChange): void {
    let line = change.newValue.split('\n')[change.line];
    // If last character entered is not whitespace, update completion.
    if (line[change.ch - 1] && line[change.ch - 1].match(/\S/)) {
      // If there is currently a completion
      if (this.original) {
        this.current = change;
      }
    } else {
      // If final character is whitespace, reset completion.
      this.reset();
    }
  }

  /**
   * Create a resolved patch between the original state and a patch string.
   *
   * @param patch - The patch string to apply to the original value.
   *
   * @returns A patched text change or null if original value did not exist.
   */
  createPatch(patch: string): ICompletionPatch {
    let original = this._original;
    let cursor = this._cursor;

    if (!original || !cursor) {
      return null;
    }

    let { start, end } = cursor;
    let value = original.currentValue;
    let prefix = value.substring(0, start);
    let suffix = value.substring(end);
    let text = prefix + patch + suffix;
    let position = (prefix + patch).length;

    return { position, text };
  }

  /**
   * Reset the state of the model and emit a state change signal.
   */
  reset() {
    this._reset();
    this.stateChanged.emit(void 0);
  }

  /**
   * Apply the query to the complete options list to return the matching subset.
   */
  private _filter(): ICompleterItem[] {
    let options = this._options || [];
    let query = this._query;
    if (!query) {
      return options.map(option => ({ raw: option, text: option }));
    }
    let results: ICompletionMatch[] = [];
    for (let option of options) {
      let match = StringSearch.sumOfSquares(option, query);
      if (match) {
        results.push({
          raw: option,
          score: match.score,
          text: StringSearch.highlight(option, match.indices)
        });
      }
    }
    return results.sort(Private.scoreCmp)
      .map(result => ({ text: result.text, raw: result.raw }));
  }

  /**
   * Reset the state of the model.
   */
  private _reset(): void {
    this._current = null;
    this._original = null;
    this._options = null;
    this._cursor = null;
    this._query = '';
  }

  private _isDisposed = false;
  private _options: string[] = null;
  private _original: ICompletionRequest = null;
  private _current: ITextChange = null;
  private _query = '';
  private _cursor: ICursorSpan = null;
}


// Define the signals for the `CompleterModel` class.
defineSignal(CompleterModel.prototype, 'stateChanged');


/**
 * A namespace for completer model private data.
 */
namespace Private {
  /**
   * A sort comparison function for item match scores.
   *
   * #### Notes
   * This orders the items first based on score (lower is better), then
   * by locale order of the item text.
   */
  export
  function scoreCmp(a: ICompletionMatch, b: ICompletionMatch): number {
    let delta = a.score - b.score;
    if (delta !== 0) {
      return delta;
    }
    return a.raw.localeCompare(b.raw);
  }
}
