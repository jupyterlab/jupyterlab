import {
  ISettingRegistry
} from '@jupyterlab/coreutils';
  
import {
  CommandRegistry
} from '@phosphor/commands'

import {
  ArrayExt, StringExt
} from '@phosphor/algorithm';

import {
  ShortcutList
} from './ShortcutList'

import {
  TopNav
} from './TopNav'

import {
  ShortcutObject
} from '../index'

import {
  TopWhitespaceStyle
} from './ShortcutUIStyle'

import * as React from 'react';

const enum MatchType { Label, Category, Split, Default }

/** Props for ShortcutUI component */
export interface IShortcutUIProps {
  commandList: string[];
  settingRegistry: ISettingRegistry;
  shortcutPlugin: string;
  commandRegistry: CommandRegistry
}

/** State for ShortcutUI component */
export interface IShortcutUIState {
  shortcutList: Object;
  filteredShortcutList: Object[];
  shortcutsFetched: boolean;
  searchQuery: string;
  showSelectors: boolean;
  currentSort: string;
  keyBindingsUsed: Object
}

/** Top level React component for widget */
export class ShortcutUI extends React.Component<IShortcutUIProps, IShortcutUIState> {
  constructor(props) {
    super(props);
  }

  state = {
    shortcutList: undefined,
    filteredShortcutList: undefined,
    shortcutsFetched: false,
    searchQuery: '',
    showSelectors: false,
    currentSort: 'category',
    keyBindingsUsed: undefined
  }

  /** Fetch shortcut list on mount */
  componentDidMount() : void {
    this._getShortcutList()
  }

  /** Flag all user-set shortcuts as custom */
  private async _getShortcutSource(shortcutObjects: Object) : Promise<void> {
    let customShortcuts = await this.props.settingRegistry.reload(this.props.shortcutPlugin)
    Object.keys(customShortcuts.user).forEach(key => {
      shortcutObjects[customShortcuts.user[key]['command'] 
      + "_" + customShortcuts.user[key]['selector']].source = 'Custom'
    })
  }

  /** Transform SettingRegistry's shortcut list to list of ShortcutObjects */
  private _getShortcutObjects(shortcuts: Object) : Object {
    shortcuts = shortcuts['composite']
    let shortcutObjects = {}
    Object.keys(shortcuts).forEach(shortcutKey => {
      let key = shortcuts[shortcutKey]['command'] 
                + "_" 
                + shortcuts[shortcutKey]['selector']
      if(Object.keys(shortcutObjects).includes(key)) {
        shortcutObjects[key].keys[shortcutKey] = shortcuts[shortcutKey]['keys']
        shortcutObjects[key].numberOfShortcuts = 2
      } else {
        let shortcutObject = new ShortcutObject()
        shortcutObject.commandName = shortcuts[shortcutKey]['command']
        shortcutObject.label = shortcuts[shortcutKey]['title']
        shortcutObject.category = shortcuts[shortcutKey]['category']
        shortcutObject.keys[shortcutKey] = shortcuts[shortcutKey]['keys']
        shortcutObject.selector = shortcuts[shortcutKey]['selector']
        shortcutObject.source = 'Default'
        shortcutObject.id = shortcutKey
        shortcutObject.numberOfShortcuts = 1
        shortcutObjects[key] = shortcutObject;
      }
    })
    return shortcutObjects
  }

  /** Get list of all shortcut keybindings currently in use */
  /** An object where keys are unique keyBinding_selector and values are shortcut objects */
  private _getKeyBindingsUsed(shortcuts: Object) : Object {
    let keyBindingsUsed: Object = {};
    Object.keys(shortcuts).forEach(shortcut => {
      for (let key of Object.keys(shortcuts[shortcut].keys)) {
        keyBindingsUsed[shortcuts[shortcut]
        .keys[key].join(' ') + '_' + shortcuts[shortcut].selector] = 
        shortcuts[shortcut]
      }
    })
    return keyBindingsUsed
  }

  /** Fetch shortcut list from SettingRegistry  */
  private async _getShortcutList() : Promise<void> {
    let shortcuts = await this.props.settingRegistry.reload(this.props.shortcutPlugin)
    let shortcutObjects = this._getShortcutObjects(shortcuts)
    await this._getShortcutSource(shortcutObjects)

    this.setState(
      {
        shortcutList: shortcutObjects,
        filteredShortcutList: this.searchFilterShortcuts(shortcutObjects),
        shortcutsFetched: true,
      }, 
      () => {
        let keyBindingsUsed = this._getKeyBindingsUsed(shortcutObjects)
        this.setState({keyBindingsUsed: keyBindingsUsed})
        this.sortShortcuts()
      }
    )
  }

  /** Set the current seach query */
  updateSearchQuery = (event) : void => {
    this.setState({searchQuery: event.target.value, currentSort: ''}, 
      () => this.setState(
        {
          filteredShortcutList: this.searchFilterShortcuts(this.state.shortcutList)
        },
        () => {
          if (this.state.searchQuery == '')
            this.sortShortcuts();
        }
      )
    )
  }

  /** Filter shortcut list using current search query */
  private searchFilterShortcuts(shortcutObjects: Object) : Object[] {
    let filteredShortcuts = this.matchItems(shortcutObjects, this.state.searchQuery)
    .map(item => {return item.item})
    return filteredShortcuts
  }

  /** Reset all shortcuts to their defaults */
  resetShortcuts = async () => {
    let settings = await this.props.settingRegistry.reload(this.props.shortcutPlugin)
    for (const key of Object.keys(settings.user)) {
      await this.props.settingRegistry.remove(this.props.shortcutPlugin, key)
    }
    this._getShortcutList()
  }

  /** Set new shortcut for command, refresh state */
  handleUpdate = async (shortcutObject: ShortcutObject, keys: string[]) => {
    if (keys[0] !== '') {
      let commandId: string;
      commandId = shortcutObject.id
      if(shortcutObject.numberOfShortcuts === 1) {
        commandId = commandId + '-' + '2'
      }
      else {
        Object.keys(shortcutObject.keys).forEach(key => {
          if(shortcutObject.keys[key][0] === '') {
            commandId = key
          }
        });
      }
      await this.props.settingRegistry
      .set(this.props.shortcutPlugin, 
        commandId, 
        {
          command: shortcutObject.commandName, 
          keys: keys, 
          selector: shortcutObject.selector,
          title: shortcutObject.label,
          category: shortcutObject.category
        }
      )
      this._getShortcutList()
    }
  }

  /** Delete shortcut for command, refresh state */
  deleteShortcut = async (shortcutObject: ShortcutObject, shortcutId: string) => {
    await this.props.settingRegistry.remove(this.props.shortcutPlugin, shortcutId)
    await this.props.settingRegistry.set(this.props.shortcutPlugin, shortcutId, 
        {
          command: shortcutObject.commandName, 
          keys: [''], 
          selector: shortcutObject.selector,
          title: shortcutObject.label,
          category: shortcutObject.category
        }
      )
    this._getShortcutList()
  }

  /** Reset a specific shortcut to its default settings */
  resetShortcut = async (shortcutObject: ShortcutObject) => {
    if(Object.keys(shortcutObject.keys).length > 1) {
      await this.props.settingRegistry
      .remove(this.props.shortcutPlugin, Object.keys(shortcutObject.keys)[1])
    }
    await this.props.settingRegistry
    .remove(this.props.shortcutPlugin, Object.keys(shortcutObject.keys)[0])
    this._getShortcutList()
  }

  /** Perform a fuzzy search on a single command item. */
  private fuzzySearch(item: any, query: string): any | null {
    // Create the source text to be searched.
    let category = item.category.toLowerCase();
    let label = item['label'].toLowerCase();
    let source = `${category} ${label}`;

    // Set up the match score and indices array.
    let score = Infinity;
    let indices: number[] | null = null;

    // The regex for search word boundaries
    let rgx = /\b\w/g;

    // Search the source by word boundary.
    while (true) {
      // Find the next word boundary in the source.
      let rgxMatch = rgx.exec(source);

      // Break if there is no more source context.
      if (!rgxMatch) {
        break;
      }

      // Run the string match on the relevant substring.
      let match = StringExt.matchSumOfDeltas(source, query, rgxMatch.index);

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
    let pivot = category.length + 1;

    // Find the slice index to separate matched indices.
    let j = ArrayExt.lowerBound(indices, pivot, (a, b) => a - b);

    // Extract the matched category and label indices.
    let categoryIndices = indices.slice(0, j);
    let labelIndices = indices.slice(j);

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
        score, item
      };
    }

    // Handle a pure category match.
    if (labelIndices.length === 0) {
      return {
        matchType: MatchType.Category,
        categoryIndices,
        labelIndices: null,
        score, item
      };
    }

    // Handle a split match.
    return {
      matchType: MatchType.Split,
      categoryIndices,
      labelIndices,
      score, item
    };
  }

  /** Normalize the query text for a fuzzy search. */
  private normalizeQuery(text: string): string {
    return text.replace(/\s+/g, '').toLowerCase();
  }

  /** Perform a fuzzy match on an array of command items. */
  private matchItems(items: any, query: string): any {
    // Normalize the query text to lower case with no whitespace.
    query = this.normalizeQuery(query);

    // Create the array to hold the scores.
    let scores: Object[] = [];
    // Iterate over the items and match against the query.
    let itemList = Object.keys(items)
    for (let i = 0, n = itemList.length; i < n; ++i) {
        let item = items[itemList[i]]

      // If the query is empty, all items are matched by default.
      if (!query) {
        scores.push({
          matchType: MatchType.Default,
          categoryIndices: null,
          labelIndices: null,
          score: 0, item
        });
        continue;
      }

      // Run the fuzzy search for the item and query.
      let score = this.fuzzySearch(item, query);

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

  /** Opens advanced setting registry */
  openAdvanced = () : void => {
    this.props.commandRegistry.execute('settingeditor:open');
  }

  /** Toggles showing command selectors */
  toggleSelectors = () : void => {
    this.setState({showSelectors: !this.state.showSelectors})
  }

  /** Set the current list sort order */
  updateSort = (value: string) : void => {
    if(value !== this.state.currentSort) {
      this.setState({currentSort: value}, this.sortShortcuts)
    }
  }

  /** Sort shortcut list using current sort property  */
  sortShortcuts() : void {
    let shortcuts = this.state.filteredShortcutList
    let filterCritera = this.state.currentSort
    if(filterCritera === 'command') {
      filterCritera = 'label'
    }
    shortcuts.sort((a, b) => {
      let compareA = a[filterCritera]
      let compareB = b[filterCritera]
      if(compareA < compareB) {
        return -1
      } else if(compareA > compareB) {
        return 1
      } else {
        return (a['label'] < b['label']) ? -1 : (a['label'] > b['label']) ? 1 : 0
      }
    })
    this.setState({filteredShortcutList: shortcuts})
  }

  /** Sort shortcut list so that the conflicting shortcut is right below the one currently being set */
  sortConflict = (newShortcut: ShortcutObject, oldShortcut: ShortcutObject): void => {
    let shortcutList = this.state.filteredShortcutList
    oldShortcut.hasConflict = true
    shortcutList = shortcutList.filter(shortcut => shortcut.id !== oldShortcut.id)
    shortcutList.splice(shortcutList.indexOf(newShortcut) + 1, 0, oldShortcut)
    this.setState({filteredShortcutList: shortcutList})
  }

  /** Remove conflict flag from all shortcuts */
  clearConflicts = () : void => {
    let shortcutList = this.state.filteredShortcutList
    shortcutList.forEach(shortcut => {
      shortcut.hasConflict = false
    });
    this.setState({filteredShortcutList: shortcutList})
  }

  render() {
    if (!this.state.shortcutsFetched) {
      return null
    }
    return (
      <div className = 'jp-shortcutui' id = 'jp-shortcutui'>
        <div className = {TopWhitespaceStyle}></div>
        <TopNav 
          updateSearchQuery={this.updateSearchQuery} 
          resetShortcuts={this.resetShortcuts}
          openAdvanced={this.openAdvanced}
          toggleSelectors={this.toggleSelectors}
          showSelectors={this.state.showSelectors}
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
          updateSort={this.updateSort}
          currentSort={this.state.currentSort}
        />
      </div>
    )
  }
}