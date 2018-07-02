import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ArrayExt, StringExt
} from '@phosphor/algorithm';

import {
  ISettingRegistry
} from '@jupyterlab/coreutils';

import {
  CommandRegistry
} from '@phosphor/commands'
import {
  ICommandPalette
} from '@jupyterlab/apputils';

import {
  ReactElementWidget
} from '@jupyterlab/apputils';

import * as React from 'react';

import '../style/index.css';

interface IUserInterfaceProps {
  commandList: string[];
  settingRegistry: ISettingRegistry;
  shortcutPlugin: string;
  categories: Array<string>;
  commandRegistry: CommandRegistry
 }

 interface IUserInterfaceState {
   shortcutList: Object;
   filteredShortcutList: Object[];
   shortcutsFetched: boolean;
   searchQuery: string;
 }

interface IShortcutListProps {
  shortcuts: Object;
  handleUpdate: Function;
  resetShortcut: Function;
  deleteShortcut: Function;
}

interface ITopNavProps {
  resetShortcuts: Function;
  updateSearchQuery: Function;
  openAdvanced: Function;
}

interface IShortcutItemProps {
  command: ShortcutObject;
  handleUpdate: Function;
  resetShortcut: Function;
  deleteShortcut: Function;
}

interface IShortcutItemState {
  value: string;
  displayInput: boolean;
}

const enum MatchType { Label, Category, Split, Default }

class ShortcutObject {
  commandName: string;
  label: string;
  keys: Array<Array<string>>;
  source: string;
  selector: string;
  category: string;
  constructor() {
    this.commandName = ''
    this.label = ''
    this.keys = new Array<Array<string>>()
    this.source = ''
    this.selector = ''
    this.category = ''
  }
}

/** React component for each command shortcut item */
class ShortcutItem extends React.Component<IShortcutItemProps, IShortcutItemState> {
  constructor(props) {
    super(props);
    this.state = {
      value: '',
      displayInput: false
    }
  }

  /** Parse and normalize user input */
  handleInput = (event: any) : void => {
    if (event.key == 'Backspace'){
      this.setState({value: this.state.value.substr(0, 
        this.state.value.lastIndexOf(' ') + 1)});
    } else if (event.key == 'Control'){
      this.setState({value: this.state.value + ' Ctrl'});
    } else if (event.key == 'Meta'){
      this.setState({value: this.state.value + ' Accel'});
    } else if (event.key == 'Alt' || event.key == 'Shift'  
      || event.key == 'Enter' || event.ctrlKey || event.metaKey) {
      this.setState({value: this.state.value + ' ' + event.key});
    } else {
      this.setState({value: this.state.value + ' '});
    }
  }

  /** Update input box's displayed value */
  updateInputValue = (event: any) : void => {
    this.setState({
      value: event.target.value
    });
  }

  /** Toggle display state of input area */
  toggleInput = () : void => {
    this.setState(prevState => ({
      displayInput: !prevState.displayInput,
      value: ''
    }));
  }

  /** Hard-coded categories for displaying shortcuts */
  prettifyCategory = () : string => {
    if(this.props.command.category === 'application') {
      return 'Main Area'
    } else if (this.props.command.category === 'apputils') {
      return 'Application Utilities'
    } else if (this.props.command.category === 'completer') {
      return 'Completer'
    } else if (this.props.command.category === 'console') {
      return 'Console'
    } else if (this.props.command.category === 'docmanager') {
      return 'File Operations'
    } else if (this.props.command.category === 'editmenu') {
      return 'Editing'
    } else if (this.props.command.category === 'filebrowser') {
      return 'File Browser'
    } else if (this.props.command.category === 'help') {
      return 'Help'
    } else if (this.props.command.category === 'imageviewer') {
      return 'Image Viewer'
    } else if (this.props.command.category === 'inspector') {
      return 'Inspector'
    } else if (this.props.command.category === 'kernelmenu') {
      return 'Kernel Operations'
    } else if (this.props.command.category === 'notebook') {
      return 'Notebook Operations'
    } else if (this.props.command.category === 'runmenu') {
      return 'Running'
    } else if (this.props.command.category === 'settingeditor') {
      return 'Settings'
    } else if (this.props.command.category === 'tooltip') {
      return 'Tooltips'
    } else {
      return this.props.command.category[0].toUpperCase() 
      + this.props.command.category.substr(1)
    }
  }

  render() {
    console.log(this.props.command)
    return (
      <div className='jp-cmditem row'>
        <div className='cell'>
          <div className='jp-shortcutitem-category'>{this.prettifyCategory()}</div>
        </div>
        <div className='cell'>
          <div className='jp-label'>{this.props.command.label}</div>
        </div>
        <div className='cell'>
          {this.props.command.keys.filter(key => key[0] !== '').map((key, index) => 
            <button className='jp-shortcut' onClick={() => 
                this.props.deleteShortcut(this.props.command, index, this.props.command.keys.length)
              }
            >
              {this.props.command.keys[index]}
            </button>
          )}
          {this.props.command.keys.filter(key => key[0] !== '').length < 2 &&
            <span className='jp-input-plus' onClick={this.toggleInput}>+</span>
          }
          {(this.state.displayInput ? (
            <div className='cell'>
              <input className='jp-input' 
                value={this.state.value} 
                onChange={this.updateInputValue} 
                onKeyDown={this.handleInput}>
                </input>
              <button className='jp-submit' 
                onClick= {() => {
                    this.props.handleUpdate(this.props.command, this.state.value); 
                    this.toggleInput();
                  }
                }>
                Submit
              </button>
            </div>
          ) : (
            null
            )
          )}
        </div>
        <div className='cell'>
          <div className='jp-source'>{this.props.command.source}</div>
          <a className='jp-reset' onClick={() => 
            this.props.resetShortcut(this.props.command.commandName)
          }>
            reset
          </a>
        </div>
      </div>
    );
  }
}

/**React component for top navigation*/
class TopNav extends React.Component<ITopNavProps,{}> {
  render() {return (
    <div className='jp-shortcuttopnav'>
      <a className='jp-link' 
        onClick={() => this.props.resetShortcuts()
      }>
        Reset All
      </a>
      <div className = 'jp-searchcontainer'>
        <input 
          onChange={(event) => 
            this.props.updateSearchQuery(event)
          } 
          className='jp-search'>
        </input>
      </div>
      <a className='jp-link' onClick={() => this.props.openAdvanced()}>
        Advanced Editor
      </a>
    </div>
  )}
}

/** React component for list of all categories and shortcuts */
class ShortcutList extends React.Component<IShortcutListProps, {}> {
  render() {
    return (
      <div className='jp-shortcutlist'>
        <div className='row table-header'>
          <div className='cell category-cell'>Category</div>
          <div className='cell command-cell'>Command</div>
          <div className='cell shortcut-cell'>Shortcut</div>
          <div className='cell source-cell'>Source</div>
        </div>
        {Object(this.props.shortcuts).map(shortcut => 
          <ShortcutItem key={shortcut.commandName + "_" + shortcut.selector} 
            resetShortcut={this.props.resetShortcut} 
            command={shortcut} 
            handleUpdate={this.props.handleUpdate}
            deleteShortcut={this.props.deleteShortcut}
          />)
        }
      </div>
    );
  }
}

/** Top level react component for widget */
class ShortcutUI extends React.Component<IUserInterfaceProps, IUserInterfaceState> {
  constructor(props) {
    super(props);
  }

  state = {
    shortcutList: undefined,
    filteredShortcutList: undefined,
    shortcutsFetched: false,
    searchQuery: ''
  }

  componentDidMount() {
    this.getInitialState();
  }

  async getShortcutSource(shortcutObjects: Object) {
    this.props.settingRegistry.load(this.props.shortcutPlugin)
    .then(settings => Object.keys(settings.user).forEach(key => {
      shortcutObjects[settings.user[key]['command'] + "_" +  settings.user[key]['selector']].source = 'Custom'
      }))
  }

  /** Fetch list of shortucts and update state */
  getInitialState = () => {
    let shortcutList = this.props.commandList.map(command => { 
      return this.getCommandShortcut(command);
      }
    )
    let shortcutObjects = {}
    Promise.all(shortcutList).then(shortcuts => {
       shortcuts.forEach(shortcut => {
        let key = shortcut.composite['command'] + "_" +  shortcut.composite['selector']
        console.log(shortcutObjects)
        if(Object.keys(shortcutObjects).includes(key)) {
          shortcutObjects[key].keys.push(shortcut.composite['keys'])
        } else {
          let shortcutObject = new ShortcutObject()
          shortcutObject.commandName = shortcut.composite['command']
          shortcutObject.label = this.createLabel(shortcutObject.commandName)
          shortcutObject.category = shortcutObject.commandName.split(':')[0]
          shortcutObject.keys[0] = shortcut.composite['keys']
          shortcutObject.selector = shortcut.composite['selector']
          shortcutObject.source = 'Default'

          shortcutObjects[key] = shortcutObject;
        }
      })

      this.getShortcutSource(shortcutObjects)

      // let commandShortcuts = this.props.categories.map(category => {
      //   return {category: category, 
      //     shortcuts: labeledShortcuts.filter(shortcut => 
      //       shortcut.composite.category === category)
      //   };
      // })
      this.setState({
        shortcutList: shortcutObjects,
        filteredShortcutList: this.matchItems(shortcutObjects, this.state.searchQuery)
        .map(item => {return item.item}),
        shortcutsFetched: true
      })
      this.filterShortcuts()
    })
  }

  updateSearchQuery = (event) => {
    this.setState({searchQuery: event.target.value})
    this.getInitialState();
  }

  filterShortcuts = () => {
    let filteredShortcuts = this.matchItems(this.state.shortcutList, this.state.searchQuery)
    .map(item => {return item.item})
    this.setState({filteredShortcutList: filteredShortcuts})
  }

  /** Reset all shortcuts to their defaults */
  resetShortcuts = () => {
    this.props.settingRegistry.load(this.props.shortcutPlugin)
      .then(settings => Object.keys(settings.user).forEach(key => {
        this.props.settingRegistry.remove(this.props.shortcutPlugin, key);
      }))
      .then(() => this.getInitialState());
  }

  /** Set new shortcut for command, refresh state */
  handleUpdate = (commandObject: ShortcutObject, value: string) => {
    let removeKeybindingPromise = this.props.settingRegistry
    .remove(this.props.shortcutPlugin, commandObject.commandName);
  let setKeybindingPromise = this.props.settingRegistry
    .set(this.props.shortcutPlugin, 
      commandObject.commandName, 
      {
        command: commandObject.commandName, 
        keys: [value], selector: commandObject.selector
      }
    );
  Promise.all([removeKeybindingPromise, setKeybindingPromise]);
  this.getInitialState();
  }

  /** Delete shortcut for command, refresh state */
  deleteShortcut = (commandObject: ShortcutObject, index: number, length: number) => {
    let commandId = commandObject.commandName
    if(length > 1) {
      commandId = commandId + "-" + (index + 1)
    }
    let removeKeybindingPromise = this.props.settingRegistry
      .remove(this.props.shortcutPlugin, commandId);
    let setKeybindingPromise = this.props.settingRegistry
      .set(this.props.shortcutPlugin, 
        commandId, 
        {
          command: commandObject.commandName, 
          keys: [''], selector: commandObject.selector
        }
      );
    Promise.all([removeKeybindingPromise, setKeybindingPromise]);
    this.getInitialState();
  }


  /** Fetch shortcut from SettingRegistry */
  getCommandShortcut = (commandName: string) => {
    return this.props.settingRegistry.get(this.props.shortcutPlugin, commandName)}

  
  resetShortcut = (commandName: string) => {
    this.props.settingRegistry.remove(this.props.shortcutPlugin, commandName)
      .then(() => this.getInitialState());
  }

  /** Generate command label from id */
  createLabel = (commandId: string): string => {
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
  fuzzySearch(item: any, query: string): any | null {
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
  normalizeQuery(text: string): string {
    return text.replace(/\s+/g, '').toLowerCase();
  }

  /** Perform a fuzzy match on an array of command items. */
   matchItems(items: any, query: string): any {
    // Normalize the query text to lower case with no whitespace.
    query = this.normalizeQuery(query);

    // Create the array to hold the scores.
    let scores: Object[] = [];
    // Iterate over the items and match against the query.
    let itemList = Object.keys(items)
    for (let i = 0, n = itemList.length; i < n; ++i) {
        let item = items[itemList[i]]
        console.log(item)

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
  openAdvanced = () => {
    this.props.commandRegistry.execute('settingeditor:open');
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
        />
        <ShortcutList 
          shortcuts={this.state.filteredShortcutList} 
          resetShortcut={this.resetShortcut} 
          handleUpdate={this.handleUpdate}
          deleteShortcut={this.deleteShortcut}
        />
      </div>
    )
  }
}

const plugin: JupyterLabPlugin<void> = {
  id: '@jupyterlab/jupyterlab-shortcutui:plugin',
  requires: [ISettingRegistry, ICommandPalette],
  activate: (app: JupyterLab, 
    settingRegistry: ISettingRegistry, 
    palette: ICommandPalette): void => {

    let commandlist = new Array<string>();
    settingRegistry.load('@jupyterlab/shortcuts-extension:plugin')
      .then(settings => Object.keys(settings.composite).forEach(key => {
        commandlist.push(key); 
        })
      )
      .then(() => {
        let categories: Array<string> = new Array<string>();
        commandlist.forEach(command => { 
          if(categories.indexOf(command.split(':')[0]) === -1) {
            categories.push(command.split(':')[0]);
          }
        });

        let shortcutUI = React.createElement(ShortcutUI, 
          {
            commandList: commandlist, 
            categories: categories, 
            settingRegistry: settingRegistry, 
            shortcutPlugin: '@jupyterlab/shortcuts-extension:plugin',
            commandRegistry: app.commands
          });
        let widget: ReactElementWidget = new ReactElementWidget(shortcutUI);
        widget.id = 'jupyterlab-shortcutui';
        widget.title.label = 'Keyboard Shortcut Settings';
        widget.title.closable = true;
        widget.addClass('jp-shortcutWidget');
        
        /** Add an application command */
        const command: string = 'shortcutui:open';
        app.commands.addCommand(command, {
          label: 'Keyboard Shortcut Settings',
          execute: () => {
            if (!widget.isAttached) {
              /** Attach the widget to the main work area if it's not there */
              app.shell.addToMainArea(widget);
            }
            /** Activate the widget */
            app.shell.activateById(widget.id);
          }
        }); 
        palette.addItem({command, category: 'Settings'});
      })
      
    },
    autoStart: true
};

/** Export the plugin as default */
export default plugin;