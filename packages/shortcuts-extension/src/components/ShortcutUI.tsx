/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ArrayExt, StringExt } from '@lumino/algorithm';
import { JSONExt } from '@lumino/coreutils';
import { ShortcutList } from './ShortcutList';
import { TopNav } from './TopNav';
import { ShortcutRegistry } from '../registry';
import {
  IKeybinding,
  IShortcutRegistry,
  IShortcutsSettingsLayout,
  IShortcutTarget,
  IShortcutUI
} from '../types';
import * as React from 'react';

const enum MatchType {
  Label,
  Category,
  Split,
  Default
}

/** Props for ShortcutUI component */
export interface IShortcutUIProps {
  external: IShortcutUI.IExternalBundle;
  height: number;
  width: number;
}

/** State for ShortcutUI component */
export interface IShortcutUIState {
  shortcutRegistry: IShortcutRegistry | null;
  filteredShortcutList: IShortcutTarget[];
  shortcutsFetched: boolean;
  searchQuery: string;
  showSelectors: boolean;
  currentSort: IShortcutUI.ColumnId;
}

/** Search result data **/
interface ISearchResult {
  matchType: MatchType;
  categoryIndices: number[] | null;
  labelIndices: number[] | null;
  score: number;
  item: IShortcutTarget;
}

/** Normalize the query text for a fuzzy search. */
function normalizeQuery(text: string): string {
  return text.replace(/\s+/g, '').toLowerCase();
}

/** Perform a fuzzy search on a single command item. */
function fuzzySearch(
  item: IShortcutTarget,
  query: string
): ISearchResult | null {
  // Create the source text to be searched.
  const category = item.category.toLowerCase();
  const label = (item['label'] ?? '').toLowerCase();
  const source = `${category} ${label}`;

  // Set up the match score and indices array.
  let score = Infinity;
  let indices: number[] | null = null;

  // The regex for search word boundaries
  const rgx = /\b\w/g;

  // Search the source by word boundary.
  // eslint-disable-next-line
  while (true) {
    // Find the next word boundary in the source.
    const rgxMatch = rgx.exec(source);

    // Break if there is no more source context.
    if (!rgxMatch) {
      break;
    }

    // Run the string match on the relevant substring.
    const match = StringExt.matchSumOfDeltas(source, query, rgxMatch.index);

    // Break if there is no match.
    if (!match) {
      break;
    }

    // Update the match if the score is better.
    if (match && match.score <= score) {
      score = match.score;
      indices = match.indices;
    }
  }

  // Bail if there was no match.
  if (!indices || score === Infinity) {
    return null;
  }

  // Compute the pivot index between category and label text.
  const pivot = category.length + 1;

  // Find the slice index to separate matched indices.
  const j = ArrayExt.lowerBound(indices, pivot, (a, b) => a - b);

  // Extract the matched category and label indices.
  const categoryIndices = indices.slice(0, j);
  const labelIndices = indices.slice(j);

  // Adjust the label indices for the pivot offset.
  for (let i = 0, n = labelIndices.length; i < n; ++i) {
    labelIndices[i] -= pivot;
  }

  // Handle a pure label match.
  if (categoryIndices.length === 0) {
    return {
      matchType: MatchType.Label,
      categoryIndices: null,
      labelIndices,
      score,
      item
    };
  }

  // Handle a pure category match.
  if (labelIndices.length === 0) {
    return {
      matchType: MatchType.Category,
      categoryIndices,
      labelIndices: null,
      score,
      item
    };
  }

  // Handle a split match.
  return {
    matchType: MatchType.Split,
    categoryIndices,
    labelIndices,
    score,
    item
  };
}

/** Perform a fuzzy match on an array of command items. */
function matchItems(items: IShortcutRegistry, query: string): ISearchResult[] {
  // Normalize the query text to lower case with no whitespace.
  query = normalizeQuery(query);

  // Create the array to hold the scores.
  let scores: ISearchResult[] = [];

  // Iterate over the items and match against the query.
  for (const item of items.values()) {
    // If the query is empty, all items are matched by default.
    if (!query) {
      scores.push({
        matchType: MatchType.Default,
        categoryIndices: null,
        labelIndices: null,
        score: 0,
        item
      });
      continue;
    }

    // Run the fuzzy search for the item and query.
    let score = fuzzySearch(item, query);

    // Ignore the item if it is not a match.
    if (!score) {
      continue;
    }

    // Add the score to the results.
    scores.push(score);
  }

  // Return the final array of scores.
  return scores;
}

/** Top level React component for widget */
export class ShortcutUI
  extends React.Component<IShortcutUIProps, IShortcutUIState>
  implements IShortcutUI
{
  constructor(props: IShortcutUIProps) {
    super(props);
    this.state = {
      shortcutRegistry: null,
      filteredShortcutList: new Array<IShortcutTarget>(),
      shortcutsFetched: false,
      searchQuery: '',
      showSelectors: false,
      currentSort: 'category'
    };
  }

  /** Fetch shortcut list on mount */
  componentDidMount(): void {
    this.props.external.actionRequested.connect(this._onActionRequested, this);
    void this._refreshShortcutList();
  }

  componentWillUnmount(): void {
    this.props.external.actionRequested.disconnect(
      this._onActionRequested,
      this
    );
  }

  private async _onActionRequested(
    _: unknown,
    action: IShortcutUI.ActionRequest
  ): Promise<void> {
    if (action.request === 'toggle-selectors') {
      return this.toggleSelectors();
    }
    if (action.request === 'reset-all') {
      await this.resetShortcuts();
    }
  }

  /** Fetch shortcut list from SettingRegistry  */
  private async _refreshShortcutList(): Promise<void> {
    const settings: ISettingRegistry.ISettings<IShortcutsSettingsLayout> =
      await this.props.external.getSettings();
    const shortcutRegistry = new ShortcutRegistry({
      commandRegistry: this.props.external.commandRegistry,
      settings
    });
    this.setState(
      {
        shortcutRegistry: shortcutRegistry,
        filteredShortcutList: this._searchFilterShortcuts(shortcutRegistry),
        shortcutsFetched: true
      },
      () => {
        this.sortShortcuts();
      }
    );
  }

  /** Set the current search query */
  updateSearchQuery = (query: string): void => {
    this.setState(
      {
        searchQuery: query
      },
      () => {
        const registry = this.state.shortcutRegistry;
        this.setState(
          {
            filteredShortcutList: this._searchFilterShortcuts(registry)
          },
          () => {
            this.sortShortcuts();
          }
        );
      }
    );
  };

  /** Filter shortcut list using current search query */
  private _searchFilterShortcuts(
    registry: IShortcutRegistry | null
  ): IShortcutTarget[] {
    if (!registry) {
      return [];
    }
    const filteredShortcuts = matchItems(registry, this.state.searchQuery).map(
      (item: ISearchResult) => {
        return item.item;
      }
    );
    return filteredShortcuts;
  }

  /**
   * Reset all keybindings to their defaults
   */
  resetShortcuts = async (): Promise<void> => {
    const settings = await this.props.external.getSettings();
    await settings.set('shortcuts', []);
    await this._refreshShortcutList();
  };

  /**
   * Reset keybindings for given target to defaults.
   */
  resetKeybindings = async (target: IShortcutTarget): Promise<void> => {
    await this._setKeybinding(target, []);
  };

  /**
   * Replace the given keybinding with a new keybinding as defined by given keys.
   */
  replaceKeybinding = async (
    target: IShortcutTarget,
    keybinding: IKeybinding,
    keys: string[]
  ): Promise<void> => {
    return this._setKeybinding(target, keys, keybinding);
  };

  /**
   * Delete a single keybinding for given shortcut target.
   */
  deleteKeybinding = async (
    target: IShortcutTarget,
    keybinding: IKeybinding
  ): Promise<void> => {
    await this._setKeybinding(target, [], keybinding);
  };

  /**
   * Add a new keybinding.
   */
  addKeybinding = async (
    target: IShortcutTarget,
    keys: string[]
  ): Promise<void> => {
    await this._setKeybinding(target, keys);
  };

  /**
   * Replace the given keybinding with a new keybinding as defined by given keys.
   *
   * If keybinding is not given a new keybinding will be created.
   * If keys are empty (or include a single empty string) the keybinding will be deleted.
   * If keybinding is a default keybinding and the provided keys differ from default, it will be disabled.
   */
  private async _setKeybinding(
    target: IShortcutTarget,
    keys: string[],
    keybinding?: IKeybinding
  ): Promise<void> {
    if (keys.length === 1 && keys[0] == '') {
      keys = [];
    }
    const settings = await this.props.external.getSettings();
    const userShortcuts = settings.user.shortcuts ?? [];
    const newUserShortcuts = [];
    let found = false;
    // Copy over existing user keybindings
    for (let shortcut of userShortcuts) {
      // If this is the query keybinding, update it with new `keys`
      if (
        shortcut.command === target.command &&
        shortcut.selector === target.selector &&
        JSONExt.deepEqual(shortcut.args ?? {}, target.args ?? {}) &&
        keybinding &&
        JSONExt.deepEqual(keybinding.keys, shortcut.keys)
      ) {
        const matchesDefault =
          keybinding &&
          keybinding.isDefault &&
          JSONExt.deepEqual(keybinding.keys, keys);

        // If the new `keys` are empty, do not copy this one over.
        // Also, if the keybinding is a default keybinding and the desired
        // new `keys` are the same as default, it does not need to be added.
        if (keys.length !== 0 && !matchesDefault) {
          newUserShortcuts.push({
            command: shortcut.command,
            selector: shortcut.selector,
            keys: keys
          });
        }
        found = true;
      } else if (
        shortcut.command === target.command &&
        shortcut.selector === target.selector &&
        JSONExt.deepEqual(shortcut.args ?? {}, target.args ?? {}) &&
        !keybinding &&
        keys.length === 0
      ) {
        continue;
      } else {
        newUserShortcuts.push(shortcut);
      }
    }
    if (!found) {
      const requiresChange =
        !keybinding || !JSONExt.deepEqual(keybinding.keys, keys);
      const shouldDisableDefault =
        keybinding && keybinding.isDefault && requiresChange;
      if (shouldDisableDefault) {
        // If the replaced keybinding is the default, disable it.
        newUserShortcuts.push({
          command: target.command,
          selector: target.selector,
          disabled: true,
          keys: keybinding.keys
        });
      }
      if (keys.length !== 0) {
        newUserShortcuts.push({
          command: target.command,
          selector: target.selector,
          keys: keys
        });
      }
    }
    await settings.set('shortcuts', newUserShortcuts as any);
    await this._refreshShortcutList();
  }

  /** Toggles showing command selectors */
  toggleSelectors = (): void => {
    this.setState({ showSelectors: !this.state.showSelectors });
  };

  /**
   * Set the sort order for the shortcuts listing.
   */
  updateSort = (value: IShortcutUI.ColumnId): void => {
    if (value !== this.state.currentSort) {
      this.setState({ currentSort: value }, this.sortShortcuts);
    }
  };

  /**
   * Sort shortcut list using current sort property.
   */
  sortShortcuts(): void {
    const shortcuts: IShortcutTarget[] = this.state.filteredShortcutList;
    let sortCriteria = this.state.currentSort;
    if (sortCriteria === 'command') {
      sortCriteria = 'label';
    }
    const getValue = (target: IShortcutTarget): string => {
      if (sortCriteria === 'source') {
        return target.keybindings.every(k => k.isDefault) ? 'default' : 'other';
      }
      return target[sortCriteria] ?? '';
    };
    shortcuts.sort((a: IShortcutTarget, b: IShortcutTarget) => {
      const compareA: string = getValue(a);
      const compareB: string = getValue(b);
      const compareResult = compareA.localeCompare(compareB);
      if (compareResult) {
        return compareResult;
      } else {
        const aLabel = a['label'] ?? '';
        const bLabel = b['label'] ?? '';
        return aLabel.localeCompare(bLabel);
      }
    });
    this.setState({ filteredShortcutList: shortcuts });
  }

  render(): JSX.Element | null {
    if (!this.state.shortcutsFetched) {
      return null;
    }
    return (
      <div className="jp-Shortcuts-ShortcutUI" id="jp-shortcutui">
        <TopNav
          updateSearchQuery={this.updateSearchQuery}
          resetShortcuts={this.resetShortcuts}
          toggleSelectors={this.toggleSelectors}
          showSelectors={this.state.showSelectors}
          updateSort={this.updateSort}
          currentSort={this.state.currentSort}
          width={this.props.width}
          translator={this.props.external.translator}
        />
        <ShortcutList
          shortcuts={this.state.filteredShortcutList}
          resetKeybindings={this.resetKeybindings}
          addKeybinding={this.addKeybinding}
          replaceKeybinding={this.replaceKeybinding}
          deleteKeybinding={this.deleteKeybinding}
          showSelectors={this.state.showSelectors}
          findConflictsFor={(keys: string[], selector: string) => {
            if (this.state.shortcutRegistry) {
              return this.state.shortcutRegistry.findConflictsFor(
                keys,
                selector
              );
            } else {
              console.error(
                'Cannot search for keybinding conflicts at this time: registry is not ready'
              );
              return [];
            }
          }}
          height={this.props.height}
          external={this.props.external}
        />
      </div>
    );
  }
}
