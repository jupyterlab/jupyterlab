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

interface ShortcutListProps {
  commandList: string[];
  settingRegistry: ISettingRegistry;
  shortcutPlugin: string;
}

 interface ShortcutListItemProps {
   key: string;
   command: string;
   settingRegistry: ISettingRegistry;
   shortcutPlugin: string;
 }

 interface ShortcutListItemState {
   value: string;
   keyBinding: JSONValue;
   keyBindingFetched: boolean;
   source: string;
 }

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
  categoryList: Array<string>;
 }

class ShortcutListItem extends React.Component<ShortcutListItemProps, ShortcutListItemState> {
  constructor(props) {
    super(props);
    this.state = {
      value: "",
      keyBindingFetched: false,
      keyBinding: undefined,
      source: "Default"
    }
  }

  componentDidMount() {
    this.getCommandKeybinding(this.state.keyBinding);
  }

  componentWillReceiveProps() {
    this.getCommandKeybinding(this.state.keyBinding);
  }

  handleUpdate = () => {
    let removeKeybindingPromise = this.props.settingRegistry.remove(this.props.shortcutPlugin, this.props.command);
    let setKeybindingPromise = this.props.settingRegistry.set(this.props.shortcutPlugin, this.props.command, {command: this.props.command, keys: [this.state.value], selector: this.props.command['selector']});
    Promise.all([removeKeybindingPromise, setKeybindingPromise]);
    this.setState({
      value:"",
      source: "Custom"
    });
    this.getCommandKeybinding(this.state.keyBinding);
  }

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

  updateInputValue = (event) => {
    this.setState({
      value: event.target.value
    });
  }

  resetKeybinding = () => {
    this.props.settingRegistry.remove(this.props.shortcutPlugin, this.props.command).then(result => {
      this.setState({source: "Default"});
      this.getCommandKeybinding(this.state.keyBinding)
    });
  }

  getCommandKeybinding = (keyBinding: JSONValue) => {
    this.props.settingRegistry.get(this.props.shortcutPlugin, this.props.command).then(result => {
      if(result != undefined) {
        this.setState({keyBinding :result.composite});
      }
    }).then(result => 
      this.setState({keyBindingFetched: true}));
  }

  deleteShortcut = () => {
    let removeKeybindingPromise = this.props.settingRegistry.remove(this.props.shortcutPlugin, this.props.command);
    let setKeybindingPromise = this.props.settingRegistry.set(this.props.shortcutPlugin, this.props.command, {command: this.props.command, keys: [""], selector: this.props.command['selector']});
    Promise.all([removeKeybindingPromise, setKeybindingPromise]);
    this.setState({
      value: "",
      source: "Custom"
    });
    this.getCommandKeybinding(this.state.keyBinding)
  }

  render() {
    let commandLabel: string;
    let commandLabelArray: string[]
    commandLabel = this.props.command.split(":")[1].replace(/-/g, " ");
    commandLabelArray = commandLabel.split(" ");
    commandLabelArray = commandLabelArray.map(function(item) {
      return item.charAt(0).toUpperCase() + item.substring(1);
    })
    commandLabel = commandLabelArray.toString().replace(/,/g, " ");
    if(!this.state.keyBindingFetched) { 
      return null
    };
    return (
      <div className="jp-cmditem">
        <div className="jp-cmdlabelcontainer">
          <div className="jp-cmdlabel">{commandLabel}</div>
        </div>
        <div className="jp-cmdbindingcontainer">
          {(this.state.keyBinding === undefined || this.state.keyBinding['keys'][0] === "" ? null : <button className="jp-shortcut" onClick={this.deleteShortcut}>{this.state.keyBinding['keys']}</button>)}
          <input className="jp-input" value={this.state.value} onChange={this.updateInputValue} onKeyDown={this.handleInput}></input>
          <button className="jp-submit" onClick={this.handleUpdate}>Submit</button>
          {(this.state.source === "Custom") ? <button className="jp-button" onClick={this.resetKeybinding}>Reset</button>: null}
        </div>
        <div className="jp-cmdsourcecontainer">
          <div className="jp-cmdsource">{this.state.source}</div>
        </div>
      </div>
    );
  }
}

class ShortcutList extends React.Component<ShortcutListProps, {}> {
  constructor(props) {
    super(props);
  }

  resetKeybindings = () => {
    this.props.settingRegistry.load(this.props.shortcutPlugin).then(settings => Object.keys(settings.user).forEach(key => {
      this.props.settingRegistry.remove(this.props.shortcutPlugin, key);
    })).then(settings => this.forceUpdate());
  }

  render() {
    let commandItems: Array<JSX.Element> = new Array<JSX.Element>();
    this.props.commandList.forEach(command => 
      commandItems.push(<ShortcutListItem shortcutPlugin = {this.props.shortcutPlugin} key={command} command={command} settingRegistry={this.props.settingRegistry}/>)
      );
    return (
      <div className="jp-shortcutlist">
        <div className="jp-shortcuttopnav">
          <a className="jp-link" onClick={this.resetKeybindings}>Reset All</a>
          <div className = 'jp-searchcontainer'>
            <input className="jp-search"></input>
          </div>
          <a className="jp-link">Advanced Editor</a>
        </div>
        <div className="jp-shortcutlistheader">
          <div className="jp-col1">Command</div>
          <div className="jp-col2">Shortcut</div>
          <div className='jp-col3'>Source</div>
        </div>
        <div className="jp-shortcutlistmain">
          <div className="jp-shortcutlistcontainer">
            {commandItems}
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
        <a href="#" className="jp-shortcutmenulabel">{this.props.category}</a>
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
        <ShortcutMenu categoryList = {this.props.categoryList} />
        <ShortcutList commandList = {this.props.commandList} settingRegistry = {this.props.settingRegistry} shortcutPlugin = {this.props.shortcutPlugin}/>
      </div>
    )
  }
}

const plugin: JupyterLabPlugin<void> = {
  id: '@jupyterlab/jupyterlab-shortcutui:plugin',
  requires: [ISettingRegistry, ICommandPalette],
  activate: (app: JupyterLab, settingRegistry: ISettingRegistry, palette: ICommandPalette): void => {
    let categories = ['abcde','bcdef','cdefg','defgh','efghi'];

    let shortcutUI = React.createElement(ShortcutUI, {commandList: app.commands.listCommands(), settingRegistry: settingRegistry, 
        shortcutPlugin: '@jupyterlab/shortcuts-extension:plugin', categoryList: categories})

    let widget: ReactElementWidget = new ReactElementWidget(shortcutUI);

    widget.id = 'jupyterlab-shortcutui';
    widget.title.label = 'Keyboard Shortcut Settings';
    widget.title.closable = true;
    widget.addClass('jp-shortcutWidget');

    // Add an application command
    const command: string = 'shortcutui:open';
    app.commands.addCommand(command, {
      label: 'Keyboard Shortcut Settings',
      execute: () => {
        if (!widget.isAttached) {
          // Attach the widget to the main work area if it's not there
          app.shell.addToMainArea(widget);
        }
        // Activate the widget
        app.shell.activateById(widget.id);
      }
    }); 

    palette.addItem({command, category: 'AAA'});
    },
    autoStart: true
};


/**
 * Export the plugin as default.
 */
export default plugin;