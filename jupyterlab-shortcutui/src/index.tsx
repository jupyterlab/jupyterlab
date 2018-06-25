import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ISettingRegistry
} from '@jupyterlab/coreutils';

import {
  JSONValue
} from '@phosphor/coreutils';

import {
  ICommandPalette
} from '@jupyterlab/apputils';

import {
  ReactElementWidget
} from '@jupyterlab/apputils';

import * as React from 'react';

import '../style/index.css';

interface ShortcutMenuProps {
  categoryList: Array<string>;
}

interface ShortcutMenuItemProps {
  category: string;
}

interface UserInterfaceProps {
  commandList: string[];
  settingRegistry: ISettingRegistry;
  shortcutPlugin: string;
  categories: Array<string>;
 }

interface ShortcutListProps {
  commandList: string[];
  categories: string[]
  settingRegistry: ISettingRegistry;
  shortcutPlugin: string;
}

interface ShortcutCategoryProps {
  category: string;
  commandsinCategory: string[];
  settingRegistry: ISettingRegistry;
  shortcutPlugin: string;
}

interface ShortcutItemProps {
  command: string;
  category: string;
  settingRegistry: ISettingRegistry;
  shortcutPlugin: string;
}

interface ShortcutItemState {
  value: string;
  shortcut: JSONValue;
  shortcutFetched: boolean;
  source: string;
  displayInput: boolean;
}

/* React component for each command shortcut item */
class ShortcutItem extends React.Component<ShortcutItemProps, ShortcutItemState> {
  constructor(props) {
    super(props);
    this.state = {
      value: "",
      shortcutFetched: false,
      shortcut: undefined,
      source: "Default",
      displayInput: false
    }
  }

  componentDidMount() {
    this.getCommandShortcut(this.state.shortcut);
  }

  componentWillReceiveProps() {
    this.getCommandShortcut(this.state.shortcut);
  }

  /* Set new shortcut for command, refresh state */
  handleUpdate = () => {
    let removeKeybindingPromise = this.props.settingRegistry.remove(this.props.shortcutPlugin, this.props.command);
    let setKeybindingPromise = this.props.settingRegistry.set(this.props.shortcutPlugin, this.props.command, {command: this.props.command, keys: [this.state.value], selector: this.props.command['selector']});
    Promise.all([removeKeybindingPromise, setKeybindingPromise]);
    this.setState({
      value:"",
      source: "Custom"
    });
    this.getCommandShortcut(this.state.shortcut);
  }

  /* Parse and normalize user input */
  handleInput = (event) => {
    if (event.key == "Backspace"){
      this.setState({value: this.state.value.substr(0, this.state.value.lastIndexOf(' ') + 1)});
    }
    else if (event.key == "Control"){
      this.setState({value: this.state.value + " Ctrl"});
    }
    else if (event.key == "Meta"){
      this.setState({value: this.state.value + " Accel"});
    }
    else if (event.key == "Alt" || event.key == "Shift" || event.key == "Enter" || event.ctrlKey || event.metaKey) {
      this.setState({value: this.state.value + " " + event.key});
    }
    else {
      this.setState({value: this.state.value + " "});
    }
  }

  /* Update input box's displayed value */
  updateInputValue = (event) => {
    this.setState({
      value: event.target.value
    });
  }

  /* Reset a command's shortcut to default */
  resetKeybinding = () => {
    this.props.settingRegistry.remove(this.props.shortcutPlugin, this.props.command).then(result => {
      this.setState(prevState => ({
        displayInput: !prevState.displayInput,
        source: "Default"
      }));
      this.getCommandShortcut(this.state.shortcut)
    });
  }

  /* Fetch shortcut from SettingRegistry */
  getCommandShortcut = (keyBinding: JSONValue) => {
    this.props.settingRegistry.get(this.props.shortcutPlugin, this.props.command).then(result => {
      if(result != undefined) {
        this.setState({shortcut :result.composite});
      }
    }).then(result => 
      this.setState({shortcutFetched: true}));
  }

  /* Remove a shortcut from a command */
  deleteShortcut = () => {
    let removeShortcutPromise = this.props.settingRegistry.remove(this.props.shortcutPlugin, this.props.command);
    let setShortcutPromise = this.props.settingRegistry.set(this.props.shortcutPlugin, this.props.command, {command: this.props.command, keys: [""], selector: this.props.command['selector']});
    Promise.all([removeShortcutPromise, setShortcutPromise]);
    this.setState({
      value: "",
      source: "Custom"
    });
    this.getCommandShortcut(this.state.shortcut)
  }

  /* Toggle display state of input area */
  toggleInput = () => {
    this.setState(prevState => ({
      displayInput: !prevState.displayInput
    }));
  }

  /* Generate command label from id */
  createLabel = (): string => {
    let commandLabel: string;
    let commandLabelArray: string[]
    commandLabel = this.props.command.split(":")[1].replace(/-/g, " ");
    commandLabelArray = commandLabel.split(" ");
    commandLabelArray = commandLabelArray.map(function(item) {
      return item.charAt(0).toUpperCase() + item.substring(1);
    })
    commandLabel = commandLabelArray.toString().replace(/,/g, " ");
    return commandLabel;
  }

  render() {
    /* Don't render if shortcut is unfetched */
    if(!this.state.shortcutFetched) { 
      return null
    };
    return (
      <div className="jp-cmditem">
        <div className="jp-label-container">
          <div className="jp-label">{this.createLabel()}</div>
        </div>
        <div className="jp-shortcut-container">
          {(this.state.shortcut === undefined || this.state.shortcut['keys'][0] === "" ? (
            null 
            ) : (
            <button className="jp-shortcut" onClick={this.deleteShortcut}>{this.state.shortcut['keys']}</button>
            )
          )}
          <span className="jp-input-plus" onClick={this.toggleInput}>+</span>
          {(this.state.displayInput ? (
            <div className="jp-input-container">
              <input className="jp-input" value={this.state.value} onChange={this.updateInputValue} onKeyDown={this.handleInput}></input>
              <button className="jp-submit" onClick={this.handleUpdate}>Submit</button>
            </div>
          ) : (
            null
            )
          )}
        </div>
        <div className="jp-source-container">
          <div className="jp-source">{this.state.source}</div>
          {(this.state.source === "Custom") ? <a className="jp-reset" onClick={this.resetKeybinding}>reset</a>: null}
        </div>
      </div>
    );
  }
}

/* React component for listing each command category */
class ShortcutCategory extends React.Component<ShortcutCategoryProps, {}> {
  constructor(props) {
    super(props);
  }
  /* Generate array of ShortcutItems in current category */
  getShortcuts = () : Array<JSX.Element> => {
    let shortcutItems: Array<JSX.Element> = new Array<JSX.Element>();
    this.props.commandsinCategory.forEach(command => { 
      shortcutItems.push(<ShortcutItem shortcutPlugin = {this.props.shortcutPlugin} category={this.props.category} key={command} command={command} settingRegistry={this.props.settingRegistry}/>);
    });
    return shortcutItems;
  }

  render() {
    return (
      <div className="jp-shortcut-category">
        <h3 id={this.props.category}>{this.props.category}</h3>
        {this.getShortcuts()}
      </div>
    )
  }
}

/* React component for list of all categories and shortcuts */
class ShortcutList extends React.Component<ShortcutListProps, {}> {
  constructor(props) {
    super(props);
  }

  /* Reset all shortcuts to their defaults */
  resetShortcuts = () => {
    this.props.settingRegistry.load(this.props.shortcutPlugin).then(settings => Object.keys(settings.user).forEach(key => {
      this.props.settingRegistry.remove(this.props.shortcutPlugin, key);
    })).then(settings => this.forceUpdate());
  }

  /* Create list of command categories and their associated commands */
  createCategories = (): Array<JSX.Element> => {
    let shortcutCategories: Array<JSX.Element> = new Array<JSX.Element>();
    /* Add each associated command to category's list */
    this.props.categories.forEach(category => {
      let commandItems: Array<string> = new Array<string>();
      this.props.commandList.forEach(command => {
        if(command.split(":")[0] === category) {
          commandItems.push(command);
        }
      });
      shortcutCategories.push(<ShortcutCategory key={category} category={category} commandsinCategory={commandItems} settingRegistry={this.props.settingRegistry} shortcutPlugin={this.props.shortcutPlugin} />);
    });
    return shortcutCategories;
  }

  render() {
    return (
      <div className="jp-shortcutlist">
        <div className="jp-shortcuttopnav">
          <a className="jp-link" onClick={this.resetShortcuts}>Reset All</a>
          <div className = "jp-searchcontainer">
            <input className="jp-search"></input>
          </div>
          <a className="jp-link">Advanced Editor</a>
        </div>
        <div className="jp-shortcutlistheader">
          <div className="jp-col1">Command</div>
          <div className="jp-col2">Shortcut</div>
          <div className="jp-col3">Source</div>
        </div>
        <div className="jp-shortcutlistmain">
          <div className="jp-shortcutlistcontainer">
            {this.createCategories()}
          </div>
        </div>
      </div>
    );
  }
}

class ShortcutMenuItem extends React.Component<ShortcutMenuItemProps, {}> {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="jp-shortcutmenuitem">
        <a href={'#' + this.props.category} className="jp-shortcutmenulabel">{this.props.category}</a>
      </div>
    )
  }
}

class ShortcutMenu extends React.Component<ShortcutMenuProps, {}> {
  constructor(props) {
    super(props);
  }

  render() {
    let categoryItems: Array<JSX.Element> = new Array<JSX.Element>();
    this.props.categoryList.forEach(cat =>
      categoryItems.push(<ShortcutMenuItem category = {cat} key = {cat}/>)
    )
    return (
      <div className="jp-shortcutmenu">
        <div className="jp-shortcutmenucontainer">
          {categoryItems}
        </div>
      </div>
    )
  }
}

class ShortcutUI extends React.Component<UserInterfaceProps, {}> {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className = "jp-shortcutui">
        <div className = 'jp-topwhitespace'></div>
        <ShortcutMenu categoryList = {this.props.categories} />
        <ShortcutList commandList = {this.props.commandList} categories={this.props.categories} settingRegistry = {this.props.settingRegistry} shortcutPlugin = {this.props.shortcutPlugin}/>
      </div>
    )
  }
}

const plugin: JupyterLabPlugin<void> = {
  id: 'jupyterlab-shortcutui',
  requires: [ISettingRegistry, ICommandPalette],
  activate: (app: JupyterLab, settingRegistry: ISettingRegistry, palette: ICommandPalette): void => {
    let categories: Array<string> = new Array<string>();
    app.commands.listCommands().forEach(command => { 
      if(categories.indexOf(command.split(":")[0]) === -1) {
        categories.push(command.split(":")[0]);
      }
    });
    let shortcutUI = React.createElement(ShortcutUI, {commandList: app.commands.listCommands(), categories: categories, settingRegistry: settingRegistry, shortcutPlugin: '@jupyterlab/shortcuts-extension:plugin'});
    let widget: ReactElementWidget = new ReactElementWidget(shortcutUI);
    widget.id = 'jupyterlab-shortcutui';
    widget.title.label = 'Keyboard Shortcut Settings';
    widget.title.closable = true;
    widget.addClass('jp-shortcutWidget');

    /* Add an application command */
    const command: string = 'shortcutui:open';
    app.commands.addCommand(command, {
      label: 'Keyboard Shortcut Settings',
      execute: () => {
        if (!widget.isAttached) {
          /* Attach the widget to the main work area if it's not there */
          app.shell.addToMainArea(widget);
        }
        /* Activate the widget */
        app.shell.activateById(widget.id);
      }
    }); 

    palette.addItem({command, category: 'AAA'});
    },
    autoStart: true
};


/* Export the plugin as default */
export default plugin;