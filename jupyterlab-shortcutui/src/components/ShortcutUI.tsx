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

import * as React from 'react';

const enum MatchType { Label, Category, Split, Default }

/** Props for ShortcutUI component */
export interface IShortcutUIProps {
  commandList: string[];
  settingRegistry: ISettingRegistry;
  shortcutPlugin: string;
  categories: Array<string>;
  commandRegistry: CommandRegistry
}

/** State for ShortcutUI component */
export interface IShortcutUIState {
  shortcutList: Object;
  filteredShortcutList: Object[];
  shortcutsFetched: boolean;
  searchQuery: string;
  showSelectors: boolean;
  currentFilter: string;
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
    currentFilter: ''
  }

  /** Fetch shortcut list on mount */
  componentDidMount() : void {
    this._getShortcutList();
  }

  /** Flag all custom shortcuts as custom */
  private _getShortcutSource(shortcutObjects: Object) : void {
    this.props.settingRegistry.load(this.props.shortcutPlugin)
    .then(settings => Object.keys(settings.user).forEach(key => {
      shortcutObjects[settings.user[key]['command'] 
      + "_" + settings.user[key]['selector']].source = 'Custom'
    }))
  }

  /** Transform SettingRegistry's shortcut list to list of ShortcutObjects */
  private _getShortcutObjects(shortcuts: any) : Object {
    let shortcutObjects = {}
    shortcuts.forEach(shortcut => {
      let key = shortcut.composite['command'] + "_" +  shortcut.composite['selector']
      if(Object.keys(shortcutObjects).includes(key)) {
        shortcutObjects[key].keys[shortcut.composite['command'] + '-' + '2'] = shortcut.composite['keys']
      } else {
        let shortcutObject = new ShortcutObject()
        shortcutObject.commandName = shortcut.composite['command']
        shortcutObject.label = this.createLabel(shortcutObject.commandName)
        shortcutObject.category = shortcutObject.commandName.split(':')[0]
        shortcutObject.keys[shortcutObject.commandName] = shortcut.composite['keys']
        shortcutObject.selector = shortcut.composite['selector']
        shortcutObject.source = 'Default'

        shortcutObjects[key] = shortcutObject;
      }
    })
    return shortcutObjects
  }

  /** Fetch shortcut list from SettingRegistry  */
  private _getShortcutList() : void {
    let shortcutList = this.props.commandList.map(command => { 
      return this.getCommandShortcut(command);
      }
    )
    Promise.all(shortcutList).then(shortcuts => {
      let shortcutObjects = this._getShortcutObjects(shortcuts)
      this._getShortcutSource(shortcutObjects)

      this.setState({
        shortcutList: shortcutObjects,
        filteredShortcutList: this.searchFilterShortcuts(shortcutObjects),
        shortcutsFetched: true
      })
    })
  }

  /** Set the current seach query */
  updateSearchQuery = (event) : void => {
    this.setState({searchQuery: event.target.value})
    this._getShortcutList();
  }

  /** Filter shortcut list using current search query */
  private searchFilterShortcuts(shortcutObjects: Object) : Object[] {
    console.log(shortcutObjects)
    let filteredShortcuts = this.matchItems(shortcutObjects, this.state.searchQuery)
    .map(item => {return item.item})
    return filteredShortcuts
  }

  /** Reset all shortcuts to their defaults */
  resetShortcuts = () : void => {
    this.props.settingRegistry.load(this.props.shortcutPlugin)
      .then(settings => Object.keys(settings.user).forEach(key => {
        this.props.settingRegistry.remove(this.props.shortcutPlugin, key);
      }))
      .then(() => this._getShortcutList());
  }

  /** Set new shortcut for command, refresh state */
  handleUpdate = (commandObject: ShortcutObject, length: number, value: string) : void => {
    console.log(commandObject)
    console.log(length)
    console.log(value)
    let commandId: string;
    commandId = commandObject.commandName
    if(length > 0) {
      commandId = commandId + '-' + '2'
    }
    this.props.settingRegistry
    .set(this.props.shortcutPlugin, 
      commandId, 
      {
        command: commandObject.commandName, 
        keys: [value], selector: commandObject.selector
      }
    ).then(() => this._getShortcutList())
  }

  /** Delete shortcut for command, refresh state */
  deleteShortcut = (commandId: string, commandName: string, commandSelector: string) : void => {
    let removeKeybindingPromise = this.props.settingRegistry
      .remove(this.props.shortcutPlugin, commandId);
    let setKeybindingPromise = this.props.settingRegistry
      .set(this.props.shortcutPlugin, 
        commandId, 
        {
          command: commandName, 
          keys: [''], 
          selector: commandSelector
        }
      );
    Promise.all([removeKeybindingPromise, setKeybindingPromise]);
    this._getShortcutList();
  }


  /** Fetch shortcut from SettingRegistry */
  private getCommandShortcut(commandName: string) : Promise<Object> {
    return this.props.settingRegistry.get(this.props.shortcutPlugin, commandName)
  }

  /** Reset a specific shortcut to its default settings */
  resetShortcut = (commandName: string) : void => {
    this.props.settingRegistry.remove(this.props.shortcutPlugin, commandName)
      .then(() => this._getShortcutList());
  }

  /** Generate command label from id */
  createLabel (commandId: string): string {
    let commandLabel: string
    let commandLabelArray: string[]
    commandLabel = commandId
      .split(':')[1].replace(/-/g, ' ')
    commandLabelArray = commandLabel.split(' ')
    commandLabelArray = commandLabelArray.map(function(item) {
      return item.charAt(0).toUpperCase() + item.substring(1)
    })
    commandLabel = commandLabelArray.toString().replace(/,/g, ' ')
    return commandLabel
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
  updateFilter = (value: string) : void => {
    this.setState({currentFilter: value}, () => this.filterShorcuts())
  }

  /** Sort shortcut list using current sort property  */
  filterShorcuts() : void {
    let shortcuts = this.state.filteredShortcutList
    let filterCritera = this.state.currentFilter
    if(filterCritera === 'command') {
      filterCritera = 'label'
    }
    shortcuts.sort((a, b) => {
      let compareA = a[filterCritera]
      let compareB = b[filterCritera]
      return (compareA < compareB) ? -1 : (compareA > compareB) ? 1 : 0;
    })
    this.setState({filteredShortcutList: shortcuts})
  }

  render() {
    if (!this.state.shortcutsFetched) {
      return null
    }
    return (
      <div className = 'jp-shortcutui'>
        <div className = 'jp-topwhitespace'></div>
        <TopNav 
          updateSearchQuery={this.updateSearchQuery} 
          resetShortcuts={this.resetShortcuts}
          openAdvanced={this.openAdvanced}
          toggleSelectors={this.toggleSelectors}
          updateFilter={this.updateFilter}
        />
        <ShortcutList 
          shortcuts={this.state.filteredShortcutList} 
          resetShortcut={this.resetShortcut} 
          handleUpdate={this.handleUpdate}
          deleteShortcut={this.deleteShortcut}
          showSelectors={this.state.showSelectors}
        />
      </div>
    )
  }
}