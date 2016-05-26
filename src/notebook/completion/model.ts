// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  ISignal, Signal, clearSignalData
} from 'phosphor-signaling';

import {
  ICompletionRequest, ITextChange
} from '../editor/model';


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
 * A completion menu item.
 */
export
interface ICompletionItem {
  /**
   * The highlighted, marked up text of a visible completion item.
   */
  text: string;

  /**
   * The raw text of a visible completion item.
   */
  raw: string;
}


/**
 * The data model backing a code completion widget.
 */
export
interface ICompletionModel extends IDisposable {
  /**
   * A signal emitted when state of the completion menu changes.
   */
  stateChanged: ISignal<ICompletionModel, void>;

  /**
   * The list of visible items in the completion menu.
   */
  items: ICompletionItem[];

  /**
   * The unfiltered list of all available options in a completion menu.
   */
  options: string[];

  /**
   * The original completion request details.
   */
  original: ICompletionRequest;

  /**
   * The current text change details.
   */
  current: ITextChange;

  /**
   * Reset the state of the model.
   */
  reset(): void;
}

/**
 * An implementation of a completion model.
 */
export
class CompletionModel implements ICompletionModel {
  /**
   * Get whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * A signal emitted when state of the completion menu changes.
   */
  get stateChanged(): ISignal<ICompletionModel, void> {
    return Private.stateChangedSignal.bind(this);
  }

  /**
   * The list of visible items in the completion menu.
   *
   * #### Notes
   * This is a read-only property.
   */
  get items(): ICompletionItem[] {
    return this._filter();
  }

  /**
   * The unfiltered list of all available options in a completion menu.
   */
  get options(): string[] {
    return this._options;
  }
  set options(newValue: string[]) {
    let oldValue = this._options;
    if (newValue) {
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
  set original(request: ICompletionRequest) {
    this._original = request;
    this._current = null;
    this.stateChanged.emit(void 0);
  }

  /**
   * The current text change details.
   */
  get current(): ITextChange {
    return this._current;
  }
  set current(newValue: ITextChange) {
    let oldValue = this._current;
    this._current = newValue;

    let original = this._original;
    let current = this._current;
    let originalLine = original.value.split('\n')[original.line];
    let currentLine = current.newValue.split('\n')[current.line];

    // If the text change means that the original starting has been preceded,
    // then the completion is no longer valid and should be reset.
    if (currentLine.length < originalLine.length) {
      this.reset();
    } else {
      this._query = currentLine.replace(originalLine, '');
    }
    this.stateChanged.emit(void 0);
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    clearSignalData(this);
    this._isDisposed = true;
  }

  /**
   * Reset the state of the model.
   */
  reset() {
    this.original = null;
    this.options = null;
    this._query = '';
  }

  /**
   * Apply the query to the complete options list to return the matching subset.
   */
  private _filter(): ICompletionItem[] {
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
        })
      }
    }
    return results.sort((a, b) => {
      return a.score - b.score;
    }).map(result => ({ text: result.text, raw: result.raw }));
  }

  private _isDisposed = false;
  private _options: string[] = null;
  private _original: ICompletionRequest = null;
  private _current: ITextChange = null;
  private _query = '';
}


/**
 * A namespace for completion model private data.
 */
namespace Private {
  /**
   * A signal emitted when state of the completion menu changes.
   */
  export
  const stateChangedSignal = new Signal<ICompletionModel, void>();
}


/**
 * A namespace which holds string searching functionality.
 *
 * #### Notes
 * This functionality comes from phosphor-core and can be removed from this file
 * once newer versions of phosphor libraries are used throughout
 * jupyter-js-notebook.
 */
namespace StringSearch {
  /**
   * The result of a sum-of-squares string search.
   */
  export
  interface ISumOfSquaresResult {
    /**
     * A score which indicates the strength of the match.
     *
     * A lower score is better. Zero is the best possible score.
     */
    score: number;

    /**
     * The indices of the matched characters in the source text.
     *
     * The indices will appear in increasing order.
     */
    indices: number[];
  }

  /**
   * Compute the sum-of-squares match for the given search text.
   *
   * @param sourceText - The text which should be searched.
   *
   * @param queryText - The query text to locate in the source text.
   *
   * @returns The match result object, or `null` if there is no match.
   *
   * #### Complexity
   * Linear on `sourceText`.
   *
   * #### Notes
   * This scoring algorithm uses a sum-of-squares approach to determine
   * the score. In order for there to be a match, all of the characters
   * in `queryText` **must** appear in `sourceText` in order. The index
   * of each matching character is squared and added to the score. This
   * means that early and consecutive character matches are preferred.
   *
   * The character match is performed with strict equality. It is case
   * sensitive and does not ignore whitespace. If those behaviors are
   * required, the text should be transformed before scoring.
   */
  export
  function sumOfSquares(sourceText: string, queryText: string): ISumOfSquaresResult {
    let score = 0;
    let indices = new Array<number>(queryText.length);
    for (let i = 0, j = 0, n = queryText.length; i < n; ++i, ++j) {
      j = sourceText.indexOf(queryText[i], j);
      if (j === -1) {
        return null;
      }
      indices[i] = j;
      score += j * j;
    }
    return { score, indices };
  }

  /**
   * Highlight the matched characters of a source string.
   *
   * @param source - The text which should be highlighted.
   *
   * @param indices - The indices of the matched characters. They must
   *   appear in increasing order and must be in bounds of the source.
   *
   * @returns A string with interpolated `<mark>` tags.
   */
  export
  function highlight(sourceText: string, indices: number[]): string {
    let k = 0;
    let last = 0;
    let result = '';
    let n = indices.length;
    while (k < n) {
      let i = indices[k];
      let j = indices[k];
      while (++k < n && indices[k] === j + 1) {
        j++;
      }
      let head = sourceText.slice(last, i);
      let chunk = sourceText.slice(i, j + 1);
      result += `${head}<mark>${chunk}</mark>`;
      last = j + 1;
    }
    return result + sourceText.slice(last);
  }
}
