/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { PageConfig } from '@jupyterlab/coreutils';
import { Contents, ServerConnection } from '@jupyterlab/services';
import { IStateDB } from '@jupyterlab/statedb';
import { IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';
import { IRecentsManager, RecentDocument } from './tokens';

type RecentsDatabase = {
  [key: string]: RecentDocument[];
  opened: RecentDocument[];
  closed: RecentDocument[];
};

export class RecentsManager implements IRecentsManager, IDisposable {
  constructor(options: RecentsManager.IOptions) {
    this._serverRoot = PageConfig.getOption('serverRoot');
    this._stateDB = options.stateDB;
    this._contentsManager = options.contents;

    this._loadRecents().catch(r => {
      console.error(`Failed to load recent list from state:\n${r}`);
    });
  }

  /**
   * Whether the manager is disposed or not.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * List of recently opened items
   */
  get recentlyOpened(): RecentDocument[] {
    const recents = this._recents.opened || [];
    return recents.filter(r => r.root === this._serverRoot);
  }

  /**
   * List of recently opened items
   */
  get recentlyClosed(): RecentDocument[] {
    const recents = this._recents.closed || [];
    return recents.filter(r => r.root === this._serverRoot);
  }

  /**
   * Signal emitted when the recent list changes.
   */
  get changed(): ISignal<IRecentsManager, void> {
    return this._recentsChanged;
  }

  /**
   * Maximal number of recent items to list.
   */
  get maximalRecentsLength(): number {
    return this._maxRecentsLength;
  }
  set maximalRecentsLength(value: number) {
    this._maxRecentsLength = Math.round(Math.max(1, value));
    let changed = false;
    for (const type of ['opened', 'closed']) {
      if (this._recents[type].length > this._maxRecentsLength) {
        this._recents[type].length = this._maxRecentsLength;
        changed = true;
      }
    }
    if (changed) {
      this._recentsChanged.emit(undefined);
    }
  }

  /**
   * Dispose recent manager resources
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * Add a new path to the recent list.
   *
   * @param path Path
   * @param contentType Content type
   */
  addRecent(
    path: string,
    contentType: string,
    type: 'opened' | 'closed'
  ): void {
    const recent: RecentDocument = {
      root: this._serverRoot,
      path,
      contentType
    };
    const recents = this._recents[type];
    // Check if it's already present; if so remove it
    const existingIndex = recents.findIndex(r => r.path === path);
    if (existingIndex >= 0) {
      recents.splice(existingIndex, 1);
    }
    // Add to the front of the list
    recents.unshift(recent);

    this._setRecents(recents, type);
    this._recentsChanged.emit(undefined);
  }

  /**
   * Clear the recents list
   */
  clearRecents(): void {
    this._setRecents([], 'opened');
    this._setRecents([], 'closed');
    this._recentsChanged.emit(undefined);
  }

  /**
   * Remove a path from both lists (opened and closed)
   *
   * @param path Path to remove
   */
  private _removeRecent(path: string): void {
    let changed = false;
    for (const type of ['opened', 'closed']) {
      const recents = this._recents[type];
      const newRecents = recents.filter(r => path === r.path);
      if (recents.length !== newRecents.length) {
        this._setRecents(newRecents, type as 'opened' | 'closed');
      }
    }
    if (changed) {
      this._recentsChanged.emit(undefined);
    }
  }

  /**
   * Check if the recent item is valid, remove if it from both lists if it is not.
   */
  async validate(recent: RecentDocument): Promise<boolean> {
    const valid = await this._isValid(recent);
    if (!valid) {
      this._removeRecent(recent.path);
    }
    return valid;
  }

  private async _isValid(recent: RecentDocument): Promise<boolean> {
    try {
      await this._contentsManager.get(recent.path, { content: false });
    } catch (e) {
      if ((e as ServerConnection.ResponseError).response?.status === 404) {
        return false;
      }
    }
    return true;
  }

  /**
   * Set the recent list
   * @param recents The new recent list
   */
  private _setRecents(
    recents: RecentDocument[],
    type: 'opened' | 'closed'
  ): void {
    this._recents[type] = recents
      .slice(0, this.maximalRecentsLength)
      .sort((a, b) => {
        if (a.root === b.root) {
          return 0;
        } else {
          return a.root !== this._serverRoot ? 1 : -1;
        }
      });
    this.saveRecents();
  }

  /**
   * Load the recent items from the state.
   */
  private async _loadRecents(): Promise<void> {
    const recents = ((await this._stateDB.fetch(
      Private.stateDBKey
    )) as RecentsDatabase) || {
      opened: [],
      closed: []
    };
    const allRecents = [...recents.opened, ...recents.closed];
    const invalidPaths = new Set(await this._getInvalidPaths(allRecents));

    for (const type of ['opened', 'closed']) {
      this._setRecents(
        recents[type].filter(r => !invalidPaths.has(r.path)),
        type as 'opened' | 'closed'
      );
    }
  }

  /**
   * Get the list of invalid path in recents.
   */
  private async _getInvalidPaths(recents: RecentDocument[]): Promise<string[]> {
    const invalidPathsOrNulls = await Promise.all(
      recents.map(async r => {
        if (await this._isValid(r)) {
          return null;
        } else {
          return r.path;
        }
      })
    );
    return invalidPathsOrNulls.filter(x => typeof x === 'string') as string[];
  }
  /**
   * Save the recent items to the state.
   */
  protected saveRecents(): void {
    clearTimeout(this._saveRoutine);
    // Save _recents 500 ms after the last time saveRecents has been called
    this._saveRoutine = setTimeout(async () => {
      // If there's a previous request pending, wait 500 ms and try again
      if (this._awaitingSaveCompletion) {
        this.saveRecents();
      } else {
        this._awaitingSaveCompletion = true;
        try {
          await this._stateDB.save(Private.stateDBKey, this._recents);
          this._awaitingSaveCompletion = false;
        } catch (e) {
          this._awaitingSaveCompletion = false;
          console.log('Saving recents failed');
          // Try again
          this.saveRecents();
        }
      }
    }, 500);
  }

  private _recentsChanged = new Signal<this, void>(this);
  private _serverRoot: string;
  private _stateDB: IStateDB;
  private _contentsManager: Contents.IManager;
  private _recents: RecentsDatabase = {
    opened: [],
    closed: []
  };
  // Will store a Timemout call that saves recents changes after a delay
  private _saveRoutine: ReturnType<typeof setTimeout> | undefined;
  // Whether there are local changes sent to be recorded without verification
  private _awaitingSaveCompletion = false;

  private _isDisposed = false;

  private _maxRecentsLength = 10;
}

export namespace RecentsManager {
  export interface IOptions {
    stateDB: IStateDB;
    contents: Contents.IManager;
  }
}

namespace Private {
  export const stateDBKey = 'docmanager:recents';
  export const poolKey = 'docmanager:recents';
}
