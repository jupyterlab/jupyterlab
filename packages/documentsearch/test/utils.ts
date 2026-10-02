// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ISearchMatch } from '@jupyterlab/documentsearch';
import { SearchProvider } from '@jupyterlab/documentsearch';
import { Widget } from '@lumino/widgets';

/**
 * Search provider which finds the same matches for any query.
 */
export class MatchListProvider extends SearchProvider {
  /**
   * @param matches - Matches found by every query, in document order.
   */
  constructor(protected matches: ISearchMatch[]) {
    super(new Widget());
  }

  get isReadOnly(): boolean {
    return false;
  }

  get currentMatchIndex(): number | null {
    return this._index === -1 ? null : this._index;
  }

  get matchesCount(): number | null {
    return this.matches.length;
  }

  get replaceableMatchesCount(): number | null {
    return this.matches.filter(match => !match.readOnly).length;
  }

  getCurrentMatch(): ISearchMatch | undefined {
    return this.matches[this._index];
  }

  async startQuery(): Promise<void> {
    this._index = 0;
  }

  async endQuery(): Promise<void> {
    this._index = -1;
  }

  async clearHighlight(): Promise<void> {
    this._index = -1;
  }

  async highlightNext(): Promise<ISearchMatch | undefined> {
    this._index = (this._index + 1) % this.matches.length;
    return this.getCurrentMatch();
  }

  async highlightPrevious(): Promise<ISearchMatch | undefined> {
    this._index = (this._index - 1 + this.matches.length) % this.matches.length;
    return this.getCurrentMatch();
  }

  async replaceCurrentMatch(): Promise<boolean> {
    const match = this.getCurrentMatch();
    if (match) {
      this.replaced.push(match.position);
    }
    return !!match;
  }

  async replaceAllMatches(): Promise<boolean> {
    return false;
  }

  /**
   * Positions of the matches passed to `replaceCurrentMatch`.
   */
  readonly replaced: number[] = [];
  private _index = -1;
}
