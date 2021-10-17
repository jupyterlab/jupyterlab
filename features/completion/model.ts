// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CompleterModel, CompletionHandler } from '@jupyterlab/completer';
import { StringExt } from '@lumino/algorithm';

import { LazyCompletionItem } from './item';

interface ICompletionMatch<T extends CompletionHandler.ICompletionItem> {
  /**
   * A score which indicates the strength of the match.
   *
   * A lower score is better. Zero is the best possible score.
   */
  score: number;
  item: T;
}

function escapeHTML(text: string) {
  let node = document.createElement('span');
  node.textContent = text;
  return node.innerHTML;
}

/**
 * This will be contributed upstream
 */
export class GenericCompleterModel<
  T extends CompletionHandler.ICompletionItem
> extends CompleterModel {
  public settings: GenericCompleterModel.IOptions;

  constructor(settings: GenericCompleterModel.IOptions = {}) {
    super();
    // TODO: refactor upstream so that it does not block "options"?
    this.settings = { ...GenericCompleterModel.defaultOptions, ...settings };
  }

  completionItems(): T[] {
    let query = this.query;
    this.query = '';
    let unfilteredItems = super.completionItems() as T[];
    this.query = query;

    // always want to sort
    // TODO does this behave strangely with %%<tab> if always sorting?
    return this._sortAndFilter(query, unfilteredItems);
  }

  setCompletionItems(newValue: T[]) {
    super.setCompletionItems(newValue);
  }

  private _markFragment(value: string): string {
    return `<mark>${value}</mark>`;
  }

  protected getFilterText(item: T) {
    return this.getHighlightableLabelRegion(item);
  }

  protected getHighlightableLabelRegion(item: T) {
    // TODO: ideally label and params would be separated so we don't have to do
    //  things like these which are not language-agnostic
    //  (assume that params follow after first opening parenthesis which may not be the case);
    //  the upcoming LSP 3.17 includes CompletionItemLabelDetails
    //  which separates parameters from the label
    // With ICompletionItems, the label may include parameters, so we exclude them from the matcher.
    // e.g. Given label `foo(b, a, r)` and query `bar`,
    // don't count parameters, `b`, `a`, and `r` as matches.
    const index = item.label.indexOf('(');
    return index > -1 ? item.label.substring(0, index) : item.label;
  }

  private _sortAndFilter(query: string, items: T[]): T[] {
    let results: ICompletionMatch<T>[] = [];

    for (let item of items) {
      // See if label matches query string

      let matched: boolean;

      let filterText: string = null;
      let filterMatch: StringExt.IMatchResult;

      let lowerCaseQuery = query.toLowerCase();

      if (query) {
        filterText = this.getFilterText(item);
        if (this.settings.caseSensitive) {
          filterMatch = StringExt.matchSumOfSquares(filterText, query);
        } else {
          filterMatch = StringExt.matchSumOfSquares(
            filterText.toLowerCase(),
            lowerCaseQuery
          );
        }
        matched = !!filterMatch;
        if (!this.settings.includePerfectMatches) {
          matched = matched && filterText != query;
        }
      } else {
        matched = true;
      }

      // Filter non-matching items. Filtering may happen on a criterion different than label.
      if (matched) {
        // If the matches are substrings of label, highlight them
        // in this part of the label that can be highlighted (must be a prefix),
        // which is intended to avoid highlighting matches in function arguments etc.
        let labelMatch: StringExt.IMatchResult;
        if (query) {
          let labelPrefix = escapeHTML(this.getHighlightableLabelRegion(item));
          if (labelPrefix == filterText) {
            labelMatch = filterMatch;
          } else {
            labelMatch = StringExt.matchSumOfSquares(labelPrefix, query);
          }
        }

        let label: string;
        let score: number;

        if (labelMatch) {
          // Highlight label text if there's a match
          // there won't be a match if filter text includes additional keywords
          // for easier search that are not a part of the label
          let marked = StringExt.highlight(
            escapeHTML(item.label),
            labelMatch.indices,
            this._markFragment
          );
          label = marked.join('');
          score = labelMatch.score;
        } else {
          label = escapeHTML(item.label);
          score = 0;
        }
        // preserve getters (allow for lazily retrieved documentation)
        const itemClone = Object.create(
          Object.getPrototypeOf(item),
          Object.getOwnPropertyDescriptors(item)
        );
        itemClone.label = label;
        // If no insertText is present, preserve original label value
        // by setting it as the insertText.
        itemClone.insertText = item.insertText ? item.insertText : item.label;

        results.push({
          item: itemClone,
          score: score
        });
      }
    }

    results.sort(this.compareMatches);

    return results.map(x => x.item);
  }

  protected compareMatches(
    a: ICompletionMatch<T>,
    b: ICompletionMatch<T>
  ): number {
    const delta = a.score - b.score;
    if (delta !== 0) {
      return delta;
    }
    return a.item.insertText?.localeCompare(b.item.insertText ?? '') ?? 0;
  }
}

export namespace GenericCompleterModel {
  export interface IOptions {
    /**
     * Whether matching should be case-sensitive (default = true)
     */
    caseSensitive?: boolean;
    /**
     * Whether perfect matches should be included (default = true)
     */
    includePerfectMatches?: boolean;
  }
  export const defaultOptions: IOptions = {
    caseSensitive: true,
    includePerfectMatches: true
  };
}

export class LSPCompleterModel extends GenericCompleterModel<LazyCompletionItem> {
  protected getFilterText(item: LazyCompletionItem): string {
    if (item.filterText) {
      return item.filterText;
    }
    return super.getFilterText(item);
  }

  protected compareMatches(
    a: ICompletionMatch<LazyCompletionItem>,
    b: ICompletionMatch<LazyCompletionItem>
  ): number {
    const delta = a.score - b.score;
    if (delta !== 0) {
      return delta;
    }
    // solve ties using sortText

    // note: locale compare is case-insensitive
    return a.item.sortText.localeCompare(b.item.sortText);
  }
}
