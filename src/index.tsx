import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ISettingRegistry
} from '@jupyterlab/coreutils';

import {
  ICommandPalette
} from '@jupyterlab/apputils';

import {
  ReactElementWidget
} from '@jupyterlab/apputils';

import {
  ShortcutUI
} from './components/ShortcutUI'

import * as React from 'react';

import '../style/index.css';

/** Object for shortcut items */
export class ShortcutObject {
  commandName: string
  label: string
  keys: Object
  source: string
  selector: string
  category: string
  id: string
  index: number
  hasConflict: boolean
  numberOfShortcuts: number
  constructor() {
    this.commandName = ''
    this.label = ''
    this.keys = {}
    this.source = ''
    this.selector = ''
    this.category = ''
    this.id = ''
    this.numberOfShortcuts = 0
    this.index = 0
    this.hasConflict = false
  }
}
 
const plugin: JupyterLabPlugin<void> = {
  id: '@jupyterlab/jupyterlab-shortcutui:plugin',
  requires: [ISettingRegistry, ICommandPalette],
  activate: (app: JupyterLab, 
    settingRegistry: ISettingRegistry, 
    palette: ICommandPalette): void => {
    let commandlist = new Array<string>();
    /** Load keyboard shortcut settings from registry and create list of command id's */
    settingRegistry.load('@jupyterlab/shortcuts-extension:plugin')
      .then(settings => Object.keys(settings.composite).forEach(key => {
        commandlist.push(key); 
      }))
      /** Create top-level component and associated widget */
      .then(() => {
        let shortcutUI = React.createElement(ShortcutUI, 
          {
            commandList: commandlist, 
            settingRegistry: settingRegistry, 
            shortcutPlugin: '@jupyterlab/shortcuts-extension:plugin',
            commandRegistry: app.commands
          });
        let widget: ReactElementWidget = new ReactElementWidget(shortcutUI);
        widget.id = 'jupyterlab-shortcutui';
        widget.title.label = 'Keyboard Shortcut Settings';
        widget.title.closable = true;
        widget.addClass('jp-shortcutWidget');
        
        /** Add a command to open extension widget */
        const command: string = 'shortcutui:open-ui';
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