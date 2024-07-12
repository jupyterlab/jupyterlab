/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { PageConfig } from '@jupyterlab/coreutils';
import { Contents, ServerConnection } from '@jupyterlab/services';
import { IStateDB } from '@jupyterlab/statedb';
import { Debouncer } from '@lumino/polling';
import { ISignal, Signal } from '@lumino/signaling';
import { IRecentsManager, RecentDocument } from './tokens';

/**
 * Manager for recently opened and closed documents.
 */
export class RecentsManager implements IRecentsManager {
  constructor(options: RecentsManager.IOptions) {
    this._saveDebouncer = new Debouncer(this._save.bind(this), 500);
    this._stateDB = options.stateDB;
    this._contentsManager = options.contents;
    this.updateRootDir();

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
    this._saveDebouncer.dispose();
  }

  /**
   * Add a new path to the recent list.
   */
  addRecent(
    document: Omit<RecentDocument, 'root'>,
    event: 'opened' | 'closed'
  ): void {
    const recent: RecentDocument = {
      ...document,
      root: this._serverRoot
    };
    const recents = this._recents[event];
    // Check if it's already present; if so remove it
    const existingIndex = recents.findIndex(r => r.path === document.path);
    if (existingIndex >= 0) {
      recents.splice(existingIndex, 1);
    }
    // Add to the front of the list
    recents.unshift(recent);

    this._setRecents(recents, event);
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
   * Remove the document from recents list.
   */
  removeRecent(document: RecentDocument, event: 'opened' | 'closed'): void {
    this._removeRecent(document.path, [event]);
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

  /**
   * Set server root dir.
   *
   * Note: protected to allow unit-testing.
   */
  protected updateRootDir() {
    this._serverRoot = PageConfig.getOption('serverRoot');
  }

  /**
   * Remove a path from both lists (opened and closed).
   */
  private _removeRecent(path: string, lists = ['opened', 'closed']): void {
    let changed = false;
    for (const type of lists) {
      const recents = this._recents[type];
      const newRecents = recents.filter(r => path !== r.path);
      if (recents.length !== newRecents.length) {
        this._setRecents(newRecents, type as 'opened' | 'closed');
        changed = true;
      }
    }
    if (changed) {
      this._recentsChanged.emit(undefined);
    }
  }

  /**
   * Check if the path of a given recent document exists.
   */
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
    this._saveDebouncer.invoke().catch(console.warn);
  }

  /**
   * Load the recent items from the state.
   */
  private async _loadRecents(): Promise<void> {
    const recents = ((await this._stateDB.fetch(
      Private.stateDBKey
    )) as Private.RecentsDatabase) || {
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
    this._recentsChanged.emit(undefined);
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
  private async _save(): Promise<void> {
    try {
      await this._stateDB.save(Private.stateDBKey, this._recents);
    } catch (e) {
      console.log('Saving recents failed', e);
    }
  }

  private _recentsChanged = new Signal<this, void>(this);
  private _serverRoot: string;
  private _stateDB: IStateDB;
  private _contentsManager: Contents.IManager;
  private _recents: Private.RecentsDatabase = {
    opened: [],
    closed: []
  };
  private _saveDebouncer: Debouncer<void>;
  private _isDisposed = false;
  private _maxRecentsLength = 10;
}

/**
 * Namespace for RecentsManager statics.
 */
export namespace RecentsManager {
  /**
   * Initialization options for RecentsManager.
   */
  export interface IOptions {
    /**
     * State database used to store the recent documents.
     */
    stateDB: IStateDB;
    /**
     * Contents manager used for path validation.
     */
    contents: Contents.IManager;
  }
}

namespace Private {
  /**
   * Key reserved in the state database.
   */
  export const stateDBKey = 'docmanager:recents';
  /**
   * The data structure for the state database value.
   */
  export type RecentsDatabase = {
    [key: string]: RecentDocument[];
    opened: RecentDocument[];
    closed: RecentDocument[];
  };
}
