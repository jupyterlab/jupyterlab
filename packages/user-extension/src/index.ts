// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module user-extension
 */

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IStateDB } from '@jupyterlab/statedb';
import { ICommandPalette, WidgetTracker } from '@jupyterlab/apputils';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { INotebookTracker, Notebook } from '@jupyterlab/notebook';
import { YFile, YNotebook } from '@jupyterlab/shared-models';
import {
  ICurrentUser,
  IUserMenu,
  IUserPanel,
  RendererUserMenu,
  SettingsWidget,
  User,
  UserMenu,
  UserSidePanel,
  SharePanel
} from '@jupyterlab/user';
import { Menu, MenuBar, Widget } from '@lumino/widgets';
import * as Y from 'yjs';

/**
 * A namespace for command IDs.
 */
export namespace CommandIDs {
  export const settings = '@jupyterlab/user-extension:settings:open';
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
    user.changed.connect(() => menuBar.update());
    const menu = new UserMenu({ commands, user });
    menuBar.addMenu(menu);
    shell.add(menuBar, 'top', { rank: 1002 });

    menu.addItem({ type: 'separator' });

    return menu;
  }
};

const userSettingsPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/user-extension:userSettings',
  autoStart: true,
  requires: [ICurrentUser, IUserMenu, ICommandPalette, ILayoutRestorer],
  activate: (
    app: JupyterFrontEnd,
    user: User,
    userMenu: Menu,
    palette: ICommandPalette,
    restorer: ILayoutRestorer
  ): void => {
    const { shell, commands } = app;

    let widget: SettingsWidget | null = null;
    const tracker = new WidgetTracker<SettingsWidget>({
      namespace: 'userSettings'
    });

    restorer.restore(tracker, {
      command: CommandIDs.settings,
      name: () => 'userSettings'
    });

    commands.addCommand(CommandIDs.settings, {
      label: 'Settings',
      caption: 'User settings.',
      isVisible: () => true,
      isEnabled: () => true,
      isToggled: () => widget !== null,
      execute: () => {
        if (widget) {
          widget.dispose();
        } else {
          widget = new SettingsWidget(user);
          widget.title.label = 'Settings';

          widget.disposed.connect(() => {
            widget = null;
            commands.notifyCommandChanged();
          });

          shell.add(widget, 'main');
          tracker.add(widget);
          restorer.add(widget, 'userSettings');

          widget.update();
          commands.notifyCommandChanged();
        }
      }
    });

    palette.addItem({ command: CommandIDs.settings, category: 'User' });
    userMenu.addItem({ command: CommandIDs.settings });
  }
};

const userPanelPlugin: JupyterFrontEndPlugin<UserSidePanel> = {
  id: '@jupyterlab/user-extension:userPanel',
  autoStart: true,
  requires: [ICurrentUser, IEditorTracker, INotebookTracker],
  provides: IUserPanel,
  activate: (
    app: JupyterFrontEnd,
    user: User,
    editor: IEditorTracker,
    notebook: INotebookTracker
  ): UserSidePanel => {
    
    

    const userPanel = new UserSidePanel();
    app.shell.add(userPanel, 'left', { rank: 300 });

    const sharePanel = new SharePanel(user);
    userPanel.addWidget(sharePanel);

    const collaboratorsChanged = async (
      tracker: IEditorTracker | INotebookTracker
    ) => {
      await tracker.currentWidget?.context.ready;
      if (
        tracker.currentWidget === null ||
        tracker.currentWidget.context.contentsModel === null
      ) {
        sharePanel.documentName = "";
        //sharePanel.collaborators = [];
        return;
      }

      let model: YNotebook | YFile;
      if (tracker.currentWidget.context.contentsModel.type === 'notebook') {
        model = tracker.currentWidget.context.model.sharedModel as YNotebook;
      } else if (tracker.currentWidget.context.contentsModel.type === 'file') {
        model = tracker.currentWidget.context.model.sharedModel as YFile;
      } else {
        sharePanel.documentName = tracker.currentWidget.context.localPath;
        //sharePanel.collaborators = [];
        return;
      }

      const stateChanged = () => {
        console.debug("CLIENT:",  model.awareness.clientID);
        const state = model.awareness.getStates();

        state.forEach((value, key) => {
          let collaborator = sharePanel.getCollaborator(value.user.id);
          console.debug(collaborator);
          if (!collaborator) {
            collaborator = {
              id: value.user.id,
              anonymous: value.user.anonymous,
              name: value.user.name,
              username: value.user.username,
              initials: value.user.initials,
              color: value.user.color,
              email: value.user.email,
              avatar: value.user.avatar
            };
          }
          
          if (value?.cursor?.head) {
            console.debug("Cursor:", value.cursor);
            const pos = Y.createAbsolutePositionFromRelativePosition(JSON.parse(value.cursor.head), model.ydoc);
            const cell = pos?.type.parent;
            if (pos && cell) {
              console.debug("POS:", cell.toJSON());
              const cellIndex = (model as YNotebook).ycells.toArray().findIndex((item) => {
                console.debug("Cell:", item.toJSON());
                return item === cell;
              });
              console.debug("Scrolling", cellIndex, pos.index);
              collaborator.position = { cell: cellIndex, index: pos.index };
            }
          }
          sharePanel.setCollaborator(collaborator);
        });

        const name = tracker.currentWidget ? tracker.currentWidget.context.localPath : "";
        sharePanel.documentName = name;
        sharePanel.scrollToCollaborator = (id: string): void => {
          const collaborator = sharePanel.getCollaborator(id)!;
          console.debug("Move:", collaborator.position);
          (tracker.currentWidget?.content as Notebook).activeCellIndex = collaborator.position!.cell;
        }
        sharePanel.update();
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
  userSettingsPlugin,
  userPanelPlugin
];

export default plugins;
