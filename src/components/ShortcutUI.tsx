import { ISettingRegistry } from '@jupyterlab/coreutils';

import { CommandRegistry } from '@phosphor/commands';

import { ArrayExt, StringExt } from '@phosphor/algorithm';

import { ShortcutList } from './ShortcutList';

import { TopNav } from './TopNav';

import { ShortcutObject, ErrorObject, TakenByObject } from '../index';

import {
  TopWhitespaceStyle,
  ShortcutUIStyle
} from '../componentStyle/ShortcutUIStyle';

import * as React from 'react';

const enum MatchType {
  Label,
  Category,
  Split,
  Default
}

/** Props for ShortcutUI component */
export interface IShortcutUIProps {
  commandList: string[];
  settingRegistry: ISettingRegistry;
  shortcutPlugin: string;
  commandRegistry: CommandRegistry;
  height: number;
  width: number;
}

/** State for ShortcutUI component */
export interface IShortcutUIState {
  shortcutList: { [index: string]: ShortcutObject };
  filteredShortcutList: ShortcutObject[];
  shortcutsFetched: boolean;
  searchQuery: string;
  showSelectors: boolean;
  currentSort: string;
  keyBindingsUsed: { [index: string]: TakenByObject };
}

/** Normalize the query text for a fuzzy search. */
function normalizeQuery(text: string): string {
  return text.replace(/\s+/g, '').toLowerCase();
}

/** Perform a fuzzy search on a single command item. */
function fuzzySearch(item: any, query: string): any | null {
  // Create the source text to be searched.
  const category = item.category.toLowerCase();
  const label = item['label'].toLowerCase();
  const source = `${category} ${label}`;

  // Set up the match score and indices array.
  let score = Infinity;
  let indices: number[] | null = null;

  // The regex for search word boundaries
  const rgx = /\b\w/g;

  // Search the source by word boundary.
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
function matchItems(items: any, query: string): any {
  // Normalize the query text to lower case with no whitespace.
  query = normalizeQuery(query);

  // Create the array to hold the scores.
  let scores: Object[] = [];
  // Iterate over the items and match against the query.
  let itemList = Object.keys(items);
  for (let i = 0, n = itemList.length; i < n; ++i) {
    let item = items[itemList[i]];

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

/** Transform SettingRegistry's shortcut list to list of ShortcutObjects */
function getShortcutObjects(
  shortcutsObj: ISettingRegistry.ISettings
): { [index: string]: ShortcutObject } {
  const shortcuts: any = shortcutsObj['composite'];
  let shortcutObjects: { [index: string]: ShortcutObject } = {};
  Object.keys(shortcuts).forEach(shortcutKey => {
    let key =
      shortcuts[shortcutKey]['command'] +
      '_' +
      shortcuts[shortcutKey]['selector'];
    if (Object.keys(shortcutObjects).indexOf(key) !== -1) {
      shortcutObjects[key].keys[shortcutKey] = shortcuts[shortcutKey]['keys'];
      shortcutObjects[key].numberOfShortcuts = 2;
    } else {
      let shortcutObject = new ShortcutObject();
      shortcutObject.commandName = shortcuts[shortcutKey]['command'];
      shortcutObject.label = shortcuts[shortcutKey]['title'];
      shortcutObject.category = shortcuts[shortcutKey]['category'];
      shortcutObject.keys[shortcutKey] = shortcuts[shortcutKey]['keys'];
      shortcutObject.selector = shortcuts[shortcutKey]['selector'];
      shortcutObject.source = 'Default';
      shortcutObject.id = shortcutKey;
      shortcutObject.numberOfShortcuts = 1;
      shortcutObjects[key] = shortcutObject;
    }
  });
  return shortcutObjects;
}

/** Get list of all shortcut keybindings currently in use
 * An object where keys are unique keyBinding_selector and values are shortcut objects **/
function getKeyBindingsUsed(shortcutObjects: {
  [index: string]: ShortcutObject;
}): { [index: string]: TakenByObject } {
  let keyBindingsUsed: { [index: string]: TakenByObject } = {};
  Object.keys(shortcutObjects).forEach((shortcut: string) => {
    Object.keys(shortcutObjects[shortcut].keys).forEach((key: string) => {
      const takenBy = new TakenByObject();
      takenBy.takenByKey = key;
      takenBy.takenByLabel =
        shortcutObjects[shortcut].category +
        ': ' +
        shortcutObjects[shortcut].label;
      takenBy.takenBy = shortcutObjects[shortcut];
      takenBy.id =
        shortcutObjects[shortcut].selector +
        '_' +
        shortcutObjects[shortcut].commandName;

      keyBindingsUsed[
        shortcutObjects[shortcut].keys[key].join(' ') +
          '_' +
          shortcutObjects[shortcut].selector
      ] = takenBy;
    });
  });
  return keyBindingsUsed;
}

/** Top level React component for widget */
export class ShortcutUI extends React.Component<
  IShortcutUIProps,
  IShortcutUIState
> {
  constructor(props: any) {
    super(props);
  }

  state = {
    shortcutList: {},
    filteredShortcutList: new Array<ShortcutObject>(),
    shortcutsFetched: false,
    searchQuery: '',
    showSelectors: false,
    currentSort: 'category',
    keyBindingsUsed: {}
  };

  /** Fetch shortcut list on mount */
  componentDidMount(): void {
    this._getShortcutList();
  }

  /** Flag all user-set shortcuts as custom */
  private async _getShortcutSource(shortcutObjects: {
    [index: string]: ShortcutObject;
  }): Promise<void> {
    const customShortcuts: ISettingRegistry.ISettings = await this.props.settingRegistry.reload(
      this.props.shortcutPlugin
    );
    Object.keys(customShortcuts.user).forEach((key: string) => {
      const userSettings: Object = customShortcuts.user[key];
      const command: string = (userSettings as any)['command'];
      const selector: string = (userSettings as any)['selector'];
      shortcutObjects[command + '_' + selector].source = 'Custom';
    });
  }

  /** Fetch shortcut list from SettingRegistry  */
  private async _getShortcutList(): Promise<void> {
    const shortcuts: ISettingRegistry.ISettings = await this.props.settingRegistry.reload(
      this.props.shortcutPlugin
    );
    const shortcutObjects: {
      [index: string]: ShortcutObject;
    } = getShortcutObjects(shortcuts);
    await this._getShortcutSource(shortcutObjects);
    this.setState(
      {
        shortcutList: shortcutObjects,
        filteredShortcutList: this.searchFilterShortcuts(shortcutObjects),
        shortcutsFetched: true
      },
      () => {
        let keyBindingsUsed = getKeyBindingsUsed(shortcutObjects);
        this.setState({ keyBindingsUsed: keyBindingsUsed });
        this.sortShortcuts();
      }
    );
  }

  /** Set the current seach query */
  updateSearchQuery = (event: MouseEvent): void => {
    this.setState(
      {
        searchQuery: (event.target as any)['value']
      },
      () =>
        this.setState(
          {
            filteredShortcutList: this.searchFilterShortcuts(
              this.state.shortcutList
            )
          },
          () => {
            this.sortShortcuts();
          }
        )
    );
  };

  /** Filter shortcut list using current search query */
  private searchFilterShortcuts(shortcutObjects: Object): ShortcutObject[] {
    const filteredShortcuts = matchItems(
      shortcutObjects,
      this.state.searchQuery
    ).map((item: any) => {
      return item.item;
    });
    return filteredShortcuts;
  }

  /** Reset all shortcuts to their defaults */
  resetShortcuts = async () => {
    const settings = await this.props.settingRegistry.reload(
      this.props.shortcutPlugin
    );
    for (const key of Object.keys(settings.user)) {
      await this.props.settingRegistry.remove(this.props.shortcutPlugin, key);
    }
    this._getShortcutList();
  };

  /** Set new shortcut for command, refresh state */
  handleUpdate = async (shortcutObject: ShortcutObject, keys: string[]) => {
    await this._getShortcutList();

    let shortcut: ShortcutObject = this.state.filteredShortcutList.filter(
      (s: ShortcutObject) =>
        s.commandName === shortcutObject.commandName &&
        s.selector === shortcutObject.selector
    )[0];

    shortcutObject = shortcut;
    let nonEmptyKeys: string[] = Object.keys(shortcutObject.keys);
    nonEmptyKeys = nonEmptyKeys.filter((key: string) => {
      return shortcutObject.keys[key][0] !== '';
    });
    let nonEmptyKey: string = nonEmptyKeys[0];

    let commandId: string = shortcutObject.id;
    if (commandId === nonEmptyKey) {
      if (nonEmptyKey.split('-')[nonEmptyKey.split('-').length - 1] !== '2') {
        /** either command-name or command-name-1 is taken */
        if (commandId.split('-').indexOf('1') !== -1) {
          commandId = shortcutObject.id.replace('-1', '-2');
        } else if (commandId.split('-').indexOf('2') === -1) {
          commandId = shortcutObject.id + '-2';
        }
      } else if (shortcutObject.numberOfShortcuts == 2) {
        /** there are 2 by default, -1 is not taken */
        if (commandId.split('-').indexOf('2') !== -1) {
          commandId = shortcutObject.id.replace('-2', '-1');
        } else if (commandId.split('-').indexOf('1') === -1) {
          commandId = shortcutObject.id + '-1';
        }
      } else {
        /** there is 1 by default, it is not taken */
        commandId = shortcutObject.id;
      }
    }

    await this.props.settingRegistry.set(this.props.shortcutPlugin, commandId, {
      command: shortcutObject.commandName,
      keys: keys,
      selector: shortcutObject.selector,
      title: shortcutObject.label,
      category: shortcutObject.category
    });
    this._getShortcutList();
  };

  /** Delete shortcut for command, refresh state */
  deleteShortcut = async (
    shortcutObject: ShortcutObject,
    shortcutId: string
  ) => {
    await this.props.settingRegistry.remove(
      this.props.shortcutPlugin,
      shortcutId
    );
    await this.props.settingRegistry.set(
      this.props.shortcutPlugin,
      shortcutId,
      {
        command: shortcutObject.commandName,
        keys: [''],
        selector: shortcutObject.selector,
        title: shortcutObject.label,
        category: shortcutObject.category
      }
    );
    this._getShortcutList();
  };

  /** Reset a specific shortcut to its default settings */
  resetShortcut = async (shortcutObject: ShortcutObject) => {
    if (Object.keys(shortcutObject.keys).length > 1) {
      await this.props.settingRegistry.remove(
        this.props.shortcutPlugin,
        Object.keys(shortcutObject.keys)[1]
      );
    }
    await this.props.settingRegistry.remove(
      this.props.shortcutPlugin,
      Object.keys(shortcutObject.keys)[0]
    );
    this._getShortcutList();
  };

  /** Opens advanced setting registry */
  openAdvanced = (): void => {
    this.props.commandRegistry.execute('settingeditor:open');
  };

  /** Toggles showing command selectors */
  toggleSelectors = (): void => {
    this.setState({ showSelectors: !this.state.showSelectors });
  };

  /** Set the current list sort order */
  updateSort = (value: string): void => {
    if (value !== this.state.currentSort) {
      this.setState({ currentSort: value }, this.sortShortcuts);
    }
  };

  /** Sort shortcut list using current sort property  */
  sortShortcuts(): void {
    const shortcuts: ShortcutObject[] = this.state.filteredShortcutList;
    let filterCritera = this.state.currentSort;
    if (filterCritera === 'command') {
      filterCritera = 'label';
    }
    if (filterCritera !== '') {
      shortcuts.sort((a: ShortcutObject, b: ShortcutObject) => {
        const compareA: string = a.get(filterCritera);
        const compareB: string = b.get(filterCritera);
        if (compareA < compareB) {
          return -1;
        } else if (compareA > compareB) {
          return 1;
        } else {
          return a['label'] < b['label'] ? -1 : a['label'] > b['label'] ? 1 : 0;
        }
      });
    }
    this.setState({ filteredShortcutList: shortcuts });
  }

  /** Sort shortcut list so that an error row is right below the one currently being set */
  sortConflict = (
    newShortcut: ShortcutObject,
    takenBy: TakenByObject
  ): void => {
    const shortcutList = this.state.filteredShortcutList;

    if (
      shortcutList.filter(shortcut => shortcut.id === 'error_row').length === 0
    ) {
      const errorRow = new ErrorObject();
      errorRow.takenBy = takenBy;
      errorRow.id = 'error_row';

      shortcutList.splice(shortcutList.indexOf(newShortcut) + 1, 0, errorRow);

      errorRow.hasConflict = true;
      this.setState({ filteredShortcutList: shortcutList });
    }
  };

  /** Remove conflict flag from all shortcuts */
  clearConflicts = (): void => {
    /** Remove error row */
    const shortcutList = this.state.filteredShortcutList.filter(
      shortcut => shortcut.id !== 'error_row'
    );

    shortcutList.forEach((shortcut: ShortcutObject) => {
      shortcut.hasConflict = false;
    });

    this.setState({ filteredShortcutList: shortcutList });
  };

  render() {
    if (!this.state.shortcutsFetched) {
      return null;
    }
    return (
      <div className={ShortcutUIStyle} id="jp-shortcutui">
        <div className={TopWhitespaceStyle} />
        <TopNav
          updateSearchQuery={this.updateSearchQuery}
          resetShortcuts={this.resetShortcuts}
          openAdvanced={this.openAdvanced}
          toggleSelectors={this.toggleSelectors}
          showSelectors={this.state.showSelectors}
          updateSort={this.updateSort}
          currentSort={this.state.currentSort}
          width={this.props.width}
        />
        <ShortcutList
          shortcuts={this.state.filteredShortcutList}
          resetShortcut={this.resetShortcut}
          handleUpdate={this.handleUpdate}
          deleteShortcut={this.deleteShortcut}
          showSelectors={this.state.showSelectors}
          keyBindingsUsed={this.state.keyBindingsUsed}
          sortConflict={this.sortConflict}
          clearConflicts={this.clearConflicts}
          height={this.props.height}
          errorSize={this.props.width < 775 ? 'small' : 'regular'}
        />
      </div>
    );
  }
}
