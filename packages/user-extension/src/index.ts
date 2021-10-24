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
import { DOMUtils } from '@jupyterlab/apputils';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { INotebookTracker, Notebook } from '@jupyterlab/notebook';
import { YFile, YNotebook } from '@jupyterlab/shared-models';
import { userIcon } from '@jupyterlab/ui-components';
import {
  ICurrentUser,
  IUserMenu,
  IUserPanel,
  RendererUserMenu,
  User,
  UserMenu,
  UserSidePanel,
  UserInfoPanel,
  ShareDocumentPanel
} from '@jupyterlab/user';
import { Menu, MenuBar, Widget, AccordionPanel } from '@lumino/widgets';
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

const userMenuPlugin: JupyterFrontEndPlugin<Menu> = {
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

const userPanelPlugin: JupyterFrontEndPlugin<AccordionPanel> = {
  id: '@jupyterlab/user-extension:userSidePanel',
  autoStart: true,
  requires: [],
  provides: IUserPanel,
  activate: (
    app: JupyterFrontEnd
  ): AccordionPanel => {
    const userPanel = new AccordionPanel({
      renderer: new UserSidePanel.Renderer()
    });
    userPanel.id = DOMUtils.createDomID();
    userPanel.title.icon = userIcon;
    userPanel.addClass('jp-UserSidePanel');
    app.shell.add(userPanel, 'left', { rank: 300 });
    return userPanel;
  }
};

const userSettingsPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/user-extension:userInfo',
  autoStart: true,
  requires: [ICurrentUser, IUserPanel],
  activate: (
    app: JupyterFrontEnd,
    user: User,
    userPanel: AccordionPanel
  ): void => {
    const sharePanel = new UserInfoPanel(user);
    userPanel.addWidget(sharePanel);
  }
};

const shareDocumentPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/user-extension:shareDocument',
  autoStart: true,
  requires: [ICurrentUser, IUserPanel, IEditorTracker, INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    user: User,
    userPanel: AccordionPanel,
    editor: IEditorTracker,
    notebook: INotebookTracker
  ): void => {
    const sharePanel = new ShareDocumentPanel(user);
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
              username: value.user.username,
              color: value.user.color,
              role: value.user.role
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
              collaborator.cursor = { cell: cellIndex, index: pos.index };
            }
          }
          sharePanel.setCollaborator(collaborator);
        });

        const name = tracker.currentWidget ? tracker.currentWidget.context.localPath : "";
        sharePanel.documentName = name;
        sharePanel.scrollToCollaborator = (id: string): void => {
          const collaborator = sharePanel.getCollaborator(id)!;
          console.debug("Move:", collaborator.cursor);
          (tracker.currentWidget?.content as Notebook).activeCellIndex = collaborator.cursor!.cell;
        }
        sharePanel.update();
      };

      model.awareness.on('change', stateChanged);
      stateChanged();
    };

    notebook.currentChanged.connect(collaboratorsChanged);
    editor.currentChanged.connect(collaboratorsChanged);
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  userPlugin,
  userMenuPlugin,
  userSettingsPlugin,
  userPanelPlugin,
  shareDocumentPlugin
];

export default plugins;
