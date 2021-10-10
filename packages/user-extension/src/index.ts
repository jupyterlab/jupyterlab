// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module user-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IStateDB } from '@jupyterlab/statedb';
import { Dialog } from '@jupyterlab/apputils';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { INotebookTracker } from '@jupyterlab/notebook';
import { YFile, YNotebook } from '@jupyterlab/shared-models';
import {
  ICurrentUser,
  IUserMenu,
  IUserPanel,
  RendererUserMenu,
  User,
  UserMenu,
  UserNameInput,
  UserPanel
} from '@jupyterlab/user';
import { Menu, MenuBar, Widget } from '@lumino/widgets';

/**
 * A namespace for command IDs.
 */
export namespace CommandIDs {
  export const rename = 'jupyterlab-auth:rename';
}

/**
 *
 */
const userPlugin: JupyterFrontEndPlugin<User> = {
  id: '@jupyterlab/user-extension:user',
  autoStart: true,
  requires: [IStateDB],
  provides: ICurrentUser,
  activate: (app: JupyterFrontEnd, state: IStateDB): User => {
    return new User(state);
  }
};

const userMemuPlugin: JupyterFrontEndPlugin<Menu> = {
  id: '@jupyterlab/user-extension:userMenu',
  autoStart: true,
  requires: [ICurrentUser],
  provides: IUserMenu,
  activate: (app: JupyterFrontEnd, user: User): Menu => {
    const { shell, commands } = app;

    const spacer = new Widget();
    spacer.id = 'jp-topbar-spacer';
    spacer.addClass('topbar-spacer');
    shell.add(spacer, 'top', { rank: 1000 });

    const menuBar = new MenuBar({
      forceItemsPosition: {
        forceX: false,
        forceY: false
      },
      renderer: new RendererUserMenu(user)
    });
    menuBar.id = 'jp-UserMenu';
    const menu = new UserMenu({ commands, user });
    menuBar.addMenu(menu);
    shell.add(menuBar, 'top', { rank: 1002 });

    menu.addItem({ type: 'separator' });

    commands.addCommand(CommandIDs.rename, {
      label: 'Rename',
      isVisible: () => user.anonymous,
      execute: () => {
        const body = new UserNameInput(user, commands);
        const dialog = new Dialog({
          title: 'Anonymous username',
          body,
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
    menu.addItem({ command: 'settingeditor:open' });

    return menu;
  }
};

const userPanelPlugin: JupyterFrontEndPlugin<UserPanel> = {
  id: '@jupyterlab/user-extension:userPanel',
  autoStart: true,
  requires: [ICurrentUser, IEditorTracker, INotebookTracker],
  provides: IUserPanel,
  activate: (
    app: JupyterFrontEnd,
    user: User,
    editor: IEditorTracker,
    notebook: INotebookTracker
  ): UserPanel => {
    const userPanel = new UserPanel(user);
    app.shell.add(userPanel, 'left', { rank: 300 });

    const collaboratorsChanged = async (
      tracker: IEditorTracker | INotebookTracker
    ) => {
      await tracker.currentWidget?.context.ready;
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
        const collaborators: User.User[] = [];
        state.forEach((value, key) => {
          const collaborator: User.User = {
            id: value.user.id,
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
