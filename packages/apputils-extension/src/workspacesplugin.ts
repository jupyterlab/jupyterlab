// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  IRouter
} from '@jupyterlab/application';

import { showDialog, Dialog, IWindowResolver } from '@jupyterlab/apputils';

import {
  DocumentRegistry,
  ABCWidgetFactory,
  IDocumentWidget,
  DocumentWidget
} from '@jupyterlab/docregistry';

import { FileBrowser, IFileBrowserFactory } from '@jupyterlab/filebrowser';

import { IMainMenu } from '@jupyterlab/mainmenu';

import {
  ContentsManager,
  Workspace,
  WorkspaceManager
} from '@jupyterlab/services';

import { IStateDB } from '@jupyterlab/statedb';

import { nullTranslator, ITranslator } from '@jupyterlab/translation';

import { Widget } from '@lumino/widgets';

namespace CommandIDs {
  export const saveWorkspace = 'workspace-ui:save';

  export const saveWorkspaceAs = 'workspace-ui:save-as';
}

const WORKSPACE_NAME = 'jupyterlab-workspace';
const WORKSPACE_EXT = '.' + WORKSPACE_NAME;
const LAST_SAVE_ID = 'workspace-ui:lastSave';
const ICON_NAME = 'jp-JupyterIcon';

/**
 * The workspace MIME renderer and save plugin.
 */
export const workspacesPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/apputils-extension:workspaces',
  autoStart: true,
  requires: [
    IMainMenu,
    IFileBrowserFactory,
    IWindowResolver,
    IStateDB,
    ITranslator
  ],
  optional: [IRouter],
  activate: (
    app: JupyterFrontEnd,
    menu: IMainMenu,
    fbf: IFileBrowserFactory,
    resolver: IWindowResolver,
    state: IStateDB,
    translator: ITranslator,
    router: IRouter | null
  ): void => {
    const trans = translator.load('jupyterlab');
    const ft: DocumentRegistry.IFileType = {
      name: WORKSPACE_NAME,
      contentType: 'file',
      fileFormat: 'text',
      displayName: trans.__('JupyterLab workspace File'),
      extensions: [WORKSPACE_EXT],
      mimeTypes: ['text/json'],
      iconClass: ICON_NAME
    };
    app.docRegistry.addFileType(ft);

    // The workspace factory creates dummy widgets to load a new workspace.
    const factory = new Private.WorkspaceFactory(
      app.serviceManager.workspaces,
      router,
      state,
      translator
    );
    app.docRegistry.addWidgetFactory(factory);

    app.commands.addCommand(CommandIDs.saveWorkspaceAs, {
      label: trans.__('Save Current Workspace As...'),
      execute: async () => {
        const data = app.serviceManager.workspaces.fetch(resolver.name);
        await Private.saveAs(
          fbf.defaultBrowser,
          app.serviceManager.contents,
          data,
          state,
          translator
        );
      }
    });

    app.commands.addCommand(CommandIDs.saveWorkspace, {
      label: trans.__('Save Current Workspace'),
      execute: async () => {
        const { contents } = app.serviceManager;
        const data = app.serviceManager.workspaces.fetch(resolver.name);
        const lastSave = (await state.fetch(LAST_SAVE_ID)) as string;
        if (lastSave === undefined) {
          await Private.saveAs(
            fbf.defaultBrowser,
            contents,
            data,
            state,
            translator
          );
        } else {
          await Private.save(lastSave, contents, data, state);
        }
      }
    });

    menu.fileMenu.addGroup(
      [
        { command: CommandIDs.saveWorkspaceAs },
        { command: CommandIDs.saveWorkspace }
      ],
      40
    );
  }
};

namespace Private {
  /**
   * Save workspace to a user provided location
   */
  export async function save(
    userPath: string,
    contents: ContentsManager,
    data: Promise<Workspace.IWorkspace>,
    state: IStateDB
  ): Promise<void> {
    let name = userPath.split('/').pop();

    // Add extension if not provided or remove extension from name if it was.
    if (name !== undefined && name.includes('.')) {
      name = name.split('.')[0];
    } else {
      userPath = userPath + WORKSPACE_EXT;
    }

    // Save last save location, for save button to work
    await state.save(LAST_SAVE_ID, userPath);

    const resolvedData = await data;
    resolvedData.metadata.id = `/lab/workspaces/${name}`;
    await contents.save(userPath, {
      type: 'file',
      format: 'text',
      content: JSON.stringify(resolvedData)
    });
  }

  /**
   * Ask user for location, and save workspace.
   * Default location is the current directory in the file browser
   */
  export async function saveAs(
    browser: FileBrowser,
    contents: ContentsManager,
    data: Promise<Workspace.IWorkspace>,
    state: IStateDB,
    translator?: ITranslator
  ): Promise<void> {
    translator = translator || nullTranslator;
    const lastSave = await state.fetch(LAST_SAVE_ID);

    let defaultName;
    if (lastSave === undefined) {
      defaultName = 'new-workspace';
    } else {
      defaultName = (lastSave as string).split('/').pop()?.split('.')[0];
    }

    const defaultPath = browser.model.path + '/' + defaultName + WORKSPACE_EXT;
    const userPath = await getSavePath(defaultPath, translator);

    if (userPath) {
      await save(userPath, contents, data, state);
    }
  }

  /**
   * This widget factory is used to handle double click on workspace
   */
  export class WorkspaceFactory extends ABCWidgetFactory<IDocumentWidget> {
    /**
     * Construct a widget factory that will upload workspace into lab and jump to it
     * @param workspaces - Used to upload the opened workspace into lab
     * @param router - Used to navigate into the opened workspace
     * @param state - Used to save the current workspace file name
     */
    constructor(
      workspaces: WorkspaceManager,
      router: IRouter | null,
      state: IStateDB,
      translator?: ITranslator
    ) {
      translator = translator || nullTranslator;
      const trans = translator.load('jupyterlab');
      super({
        name: trans.__('Workspace loader'),
        fileTypes: [WORKSPACE_NAME],
        defaultFor: [WORKSPACE_NAME],
        readOnly: true
      });
      this.workspaces = workspaces;
      this.router = router;
      this.state = state;
    }

    /**
     * The workspaces API service manager.
     */
    readonly workspaces: WorkspaceManager;

    /**
     * An optional application URL router.
     */
    readonly router: IRouter | null;

    /**
     * The application state database.
     */
    readonly state: IStateDB;

    /**
     * Loads the workspace into load, and jump to it
     * @param context This is used queried to query the workspace content
     */
    protected createNewWidget(
      context: DocumentRegistry.Context
    ): IDocumentWidget {
      // Save workspace description into jupyterlab, and navigate to it when done
      void context.ready.then(async () => {
        const workspaceDesc = (context.model.toJSON() as unknown) as Workspace.IWorkspace;
        const path = context.path;

        const workspaceId = workspaceDesc.metadata.id;
        // Upload workspace content to jupyterlab
        await this.workspaces.save(workspaceId, workspaceDesc);
        // Save last save location, for save button to work
        await this.state.save(LAST_SAVE_ID, path);
        if (this.router) {
          this.router.navigate(workspaceId, { hard: true });
        } else {
          document.location.href = workspaceId;
        }
      });
      return dummyWidget(context);
    }
  }

  /**
   * Returns a dummy widget with disposed content that doesn't render in the UI.
   *
   * @param context - The file context.
   */
  function dummyWidget(context: DocumentRegistry.Context): IDocumentWidget {
    const widget = new DocumentWidget({ content: new Widget(), context });
    widget.content.dispose();
    return widget;
  }

  /**
   * Ask user for a path to save to.
   * @param defaultPath Path already present when the dialog is shown
   */
  async function getSavePath(
    defaultPath: string,
    translator?: ITranslator
  ): Promise<string | null> {
    translator = translator || nullTranslator;
    const trans = translator.load('jupyterlab');
    const saveBtn = Dialog.okButton({ label: trans.__('Save') });
    const result = await showDialog({
      title: trans.__('Save Current Workspace As...'),
      body: new SaveWidget(defaultPath),
      buttons: [Dialog.cancelButton({ label: trans.__('Cancel') }), saveBtn]
    });
    if (result.button.label === trans.__('Save')) {
      return result.value;
    } else {
      return null;
    }
  }

  /**
   * A widget that gets a file path from a user.
   */
  class SaveWidget extends Widget {
    /**
     * Gets a modal node for getting save location. Will have a default to the current opened directory
     * @param path Default location
     */
    constructor(path: string) {
      super({ node: createSaveNode(path) });
    }

    /**
     * Gets the save path entered by the user
     */
    getValue(): string {
      return (this.node as HTMLInputElement).value;
    }
  }

  /**
   * Create the node for a save widget.
   */
  function createSaveNode(path: string): HTMLElement {
    const input = document.createElement('input');
    input.value = path;
    return input;
  }
}
