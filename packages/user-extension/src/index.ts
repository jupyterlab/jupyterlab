// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module user-extension
 */

import {
  IRouter,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IStateDB } from '@jupyterlab/statedb';
import { Dialog } from '@jupyterlab/apputils';
import { caretDownIcon } from '@jupyterlab/ui-components';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { INotebookTracker } from '@jupyterlab/notebook';
import { YFile, YNotebook } from '@jupyterlab/shared-models';
import {
  IUser,
  IUserMenuToken,
  IUserPanelToken,
  IUserToken,
  User,
  UserIcon,
  UserNameInput,
  UserPanel
} from '@jupyterlab/user';
import { Menu, MenuBar, Widget } from '@lumino/widgets';

/**
 * A namespace for command IDs.
 */
export namespace CommandIDs {
  export const rename = 'jupyterlab-auth:rename';
  export const logout = 'jupyterlab-auth:logout';
}

/**
 *
 */
const userPlugin: JupyterFrontEndPlugin<User> = {
  id: '@jupyterlab/user-extension:user',
  autoStart: true,
  requires: [IStateDB],
  provides: IUserToken,
  activate: (app: JupyterFrontEnd, state: IStateDB): User => {
    console.debug('User extension activated.');
    return new User(state);
  }
};

const userMemuPlugin: JupyterFrontEndPlugin<Menu> = {
  id: '@jupyterlab/user-extension:userMenu',
  autoStart: true,
  requires: [IRouter, IUserToken],
  provides: IUserMenuToken,
  activate: (app: JupyterFrontEnd, router: IRouter, user: User): Menu => {
    const { shell, commands } = app;

    const spacer = new Widget();
    spacer.id = 'jp-topbar-spacer';
    spacer.addClass('topbar-spacer');
    shell.add(spacer, 'top', { rank: 1000 });

    const icon = new UserIcon(user);
    icon.id = 'jp-UserIcon';
    // TODO: remove with next lumino release
    icon.node.onclick = (event: MouseEvent) => {
      menu.open(window.innerWidth, 30);
    };

    const menu = new Menu({ commands });
    menu.id = 'jp-UserMenu-dropdown';
    menu.title.icon = caretDownIcon;
    menu.title.className = 'jp-UserMenu-dropdown';

    const menuBar = new MenuBar();
    menuBar.id = 'jp-UserMenu';
    menuBar.node.insertBefore(icon.node, menuBar.node.firstChild);
    menuBar.addMenu(menu);
    // TODO: remove with next lumino release
    menuBar.node.onmousedown = (event: MouseEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      menu.open(window.innerWidth, 30);
    };
    shell.add(menuBar, 'top', { rank: 1002 });

    user.ready.connect((sender, isReady) => {
      commands.addCommand(CommandIDs.rename, {
        label: user.name,
        isEnabled: () => user.anonymous,
        isVisible: () => isReady,
        execute: () => {
          const body = new UserNameInput(user, commands);
          const dialog = new Dialog({
            title: 'Anonymous username',
            body,
            hasClose: false,
            buttons: [
              Dialog.okButton({
                label: 'Send'
              })
            ]
          });
          dialog.launch().then(data => {
            if (data.button.accept) {
              user.rename(data.value as string);
            }
          });
        }
      });
      console.debug('Dialog');
      menu.addItem({ command: CommandIDs.rename });

      menu.addItem({ type: 'separator' });

      commands.addCommand(CommandIDs.logout, {
        label: 'Sign Out',
        isEnabled: () => !user.anonymous,
        execute: () => {
          router.navigate('/logout', { hard: true });
        }
      });
      menu.addItem({ command: CommandIDs.logout });
    });

    return menu;
  }
};

const userPanelPlugin: JupyterFrontEndPlugin<UserPanel> = {
  id: '@jupyterlab/user-extension:userPanel',
  autoStart: true,
  requires: [IUserToken, IEditorTracker, INotebookTracker],
  provides: IUserPanelToken,
  activate: (
    app: JupyterFrontEnd,
    user: User,
    editor: IEditorTracker,
    notebook: INotebookTracker
  ): UserPanel => {
    const userPanel = new UserPanel(user);
    app.shell.add(userPanel, 'left', { rank: 300 });

    const collaboratorsChanged = (
      tracker: IEditorTracker | INotebookTracker
    ) => {
      if (
        tracker.currentWidget === null ||
        tracker.currentWidget.context.contentsModel === null
      ) {
        userPanel.collaborators = [];
        return;
      }

      let model: YNotebook | YFile;
      if (tracker.currentWidget.context.contentsModel.type === 'notebook') {
        model = tracker.currentWidget.context.model.sharedModel as YNotebook;
      } else if (tracker.currentWidget.context.contentsModel.type === 'file') {
        model = tracker.currentWidget.context.model.sharedModel as YFile;
      } else {
        userPanel.collaborators = [];
        return;
      }

      const stateChanged = () => {
        const state = model.awareness.getStates();
        const collaborators: IUser[] = [];
        state.forEach((value, key) => {
          const collaborator: IUser = {
            anonymous: value.user.anonymous,
            name: value.user.name,
            username: value.user.username,
            initials: value.user.initials,
            color: value.user.color,
            email: value.user.email,
            avatar: value.user.avatar
          };

          collaborators.push(collaborator);
        });
        userPanel.collaborators = collaborators;
      };

      model.awareness.on('change', stateChanged);
      stateChanged();
    };

    notebook.currentChanged.connect(collaboratorsChanged);
    editor.currentChanged.connect(collaboratorsChanged);

    return userPanel;
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  userPlugin,
  userMemuPlugin,
  userPanelPlugin
];

export default plugins;
