import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/coreutils';

import { ICommandPalette } from '@jupyterlab/apputils';

import { IMainMenu } from '@jupyterlab/mainmenu';

// import { ShortcutUI } from './components/ShortcutUI';

import { Widget } from '@phosphor/widgets'

// import { Message } from '@phosphor/messaging'

import ShortcutWidget from './ShortcutWidget'

// import * as React from 'react';

import '../style/index.css';

/** Object for shortcut items */
export class ShortcutObject {
  commandName: string;
  label: string;
  keys: {[index: string]: string[]};
  source: string;
  selector: string;
  category: string;
  id: string;
  hasConflict: boolean;
  numberOfShortcuts: number;

  constructor() {
    this.commandName = '';
    this.label = '';
    this.keys = {};
    this.source = '';
    this.selector = '';
    this.category = '';
    this.id = '';
    this.numberOfShortcuts = 0;
    this.hasConflict = false;
  }

  get(sortCriteria: string): string {
    if (sortCriteria === 'label') {
      return this.label
    } else if (sortCriteria === 'selector') {
      return this.selector
    } else if (sortCriteria === 'category') {
      return this.category
    } else if (sortCriteria === 'source') {
      return this.source
    }
  }
}

// class ShortcutWidget extends ReactElementWidget {
//   height: number;
//   width: number;
//   private TOPNAV_HEIGHT: number = 185;
//   private ShortcutListContainer: { [key:string]: any } = undefined;

//   constructor(element: React.ReactElement<any>) {
//     super(element);
//     console.log(element)
//     this.id = 'jupyterlab-shortcutui';
//     this.title.label = 'Keyboard Shortcut Editor';
//     this.title.closable = true;
//     this.addClass('jp-shortcutWidget');

//     if (this.ShortcutListContainer !== undefined) {
//       this.ShortcutListContainer.setAttribute(
//         'style', 
//         "height: "+ (this.height - this.TOPNAV_HEIGHT) + 'px;'
//       )
//     }
//   }

//   protected onAfterShow(msg: Message) {
//     //console.log('attached! node: ', this.node, this.node.childNodes.querySelectorAll('#shortcutListContainer'))
//     super.onAfterShow(msg);
//     if (this.node.childNodes[0] !== undefined) {
//       this.ShortcutListContainer = this.node.childNodes[0].childNodes[2];
//     }
//     this.ShortcutListContainer.setAttribute(
//       'style', 
//       "height: "+ (this.height - this.TOPNAV_HEIGHT) + 'px;'
//     )
//   }

//   protected onResize(msg: Widget.ResizeMessage) {
//     super.onResize(msg);
//     this.height = msg.height;
//     this.width = msg.width;
//     this.ShortcutListContainer = this.node.childNodes[0].childNodes[2];

//     if (this.node.childNodes[0] !== undefined) {
//       this.ShortcutListContainer.setAttribute(
//         'style', 
//         "height: "+ (this.height - this.TOPNAV_HEIGHT) + 'px;'
//       )
//     } else {
//       console.log('nope');
//       console.log(this.height, this.width)
//     }
//   }
// }

const plugin: JupyterLabPlugin<void> = {
  id: '@jupyterlab/jupyterlab-shortcutui:plugin',
  requires: [ISettingRegistry, ICommandPalette, IMainMenu],
  activate: (
    app: JupyterLab,
    settingRegistry: ISettingRegistry,
    palette: ICommandPalette,
    menu: IMainMenu
  ): void => {
    /** Load keyboard shortcut settings from registry and create list of command id's */
    settingRegistry
      .load('@jupyterlab/shortcuts-extension:plugin')
      .then(settings => Object.keys(settings.composite))
      /** Create top-level component and associated widget */
      .then(commandlist => {
        // const shortcutUI = React.createElement(ShortcutUI, {
        //   commandList: commandlist,
        //   settingRegistry: settingRegistry,
        //   shortcutPlugin: '@jupyterlab/shortcuts-extension:plugin',
        //   commandRegistry: app.commands,
        //   height: 0,
        //   width: 0
        // });

        const widget = new ShortcutWidget(
          -1,
          -1,
          commandlist,
          settingRegistry,
          app.commands,
          '@jupyterlab/shortcuts-extension:plugin',
        );

        widget.id = 'jupyterlab-shortcutui';
        widget.title.label = 'Keyboard Shortcut Editor';
        widget.title.closable = true;

        /** Add command to open extension widget */
        const command: string = 'shortcutui:open-ui';
        app.commands.addCommand(command, {
          label: 'Keyboard Shortcut Editor',
          execute: () => {
            if (!widget.isAttached) {
              /** Attach the widget to the main work area if it's not there */
              app.shell.addToMainArea(widget as Widget);
            }
            /** Activate the widget */
            app.shell.activateById(widget.id);
          }
        });

        /** Add command to command palette */
        palette.addItem({ command, category: 'Settings' });

        // OVERRIDES ANOTHER COMMAND <work in progress>
        /** Add command to settings menu */
        menu.settingsMenu.addGroup([{ command: command }], 999);

        /** Add command to help menu */
        menu.helpMenu.addGroup([{ command: command }], 7);


      });
  },
  autoStart: true
};

/** Export the plugin as default */
export default plugin;
