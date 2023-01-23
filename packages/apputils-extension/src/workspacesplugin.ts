// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IRouter,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Dialog, IWindowResolver, showDialog } from '@jupyterlab/apputils';
import { URLExt } from '@jupyterlab/coreutils';
import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentWidget,
  IDocumentWidget
} from '@jupyterlab/docregistry';
import { IDefaultFileBrowser } from '@jupyterlab/filebrowser';
import { Contents, Workspace, WorkspaceManager } from '@jupyterlab/services';
import { IStateDB } from '@jupyterlab/statedb';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
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
    IDefaultFileBrowser,
    IWindowResolver,
    IStateDB,
    ITranslator,
    JupyterFrontEnd.IPaths
  ],
  optional: [IRouter],
  activate: (
    app: JupyterFrontEnd,
    fileBrowser: IDefaultFileBrowser,
    resolver: IWindowResolver,
    state: IStateDB,
    translator: ITranslator,
    paths: JupyterFrontEnd.IPaths,
    router: IRouter | null
  ): void => {
    // The workspace factory creates dummy widgets to load a new workspace.
    const factory = new Private.WorkspaceFactory({
      workspaces: app.serviceManager.workspaces,
      router,
      state,
      translator,
      paths
    });
    const trans = translator.load('jupyterlab');

    app.docRegistry.addFileType({
      name: WORKSPACE_NAME,
      contentType: 'file',
      fileFormat: 'text',
      displayName: trans.__('JupyterLab workspace File'),
      extensions: [WORKSPACE_EXT],
      mimeTypes: ['text/json'],
      iconClass: ICON_NAME
    });
    app.docRegistry.addWidgetFactory(factory);
    app.commands.addCommand(CommandIDs.saveWorkspaceAs, {
      label: trans.__('Save Current Workspace As…'),
      execute: async () => {
        const data = app.serviceManager.workspaces.fetch(resolver.name);
        await Private.saveAs(
          fileBrowser,
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
          await Private.saveAs(fileBrowser, contents, data, state, translator);
        } else {
          await Private.save(lastSave, contents, data, state);
        }
      }
    });
  }
};

namespace Private {
  /**
   * Save workspace to a user provided location
   */
  export async function save(
    userPath: string,
    contents: Contents.IManager,
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
    resolvedData.metadata.id = `${name}`;
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
    browser: IDefaultFileBrowser,
    contents: Contents.IManager,
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
     * Construct a widget factory that uploads a workspace and navigates to it.
     *
     * @param options - The instantiation options for a `WorkspaceFactory`.
     */
    constructor(options: WorkspaceFactory.IOptions) {
      const trans = (options.translator || nullTranslator).load('jupyterlab');
      super({
        name: 'Workspace loader',
        label: trans.__('Workspace loader'),
        fileTypes: [WORKSPACE_NAME],
        defaultFor: [WORKSPACE_NAME],
        readOnly: true
      });
      this._application = options.paths.urls.app;
      this._router = options.router;
      this._state = options.state;
      this._workspaces = options.workspaces;
    }

    /**
     * Loads the workspace into load, and jump to it
     * @param context This is used queried to query the workspace content
     */
    protected createNewWidget(
      context: DocumentRegistry.Context
    ): IDocumentWidget {
      // Save a file's contents as a workspace and navigate to that workspace.
      void context.ready.then(async () => {
        const file = context.model;
        const workspace = file.toJSON() as unknown as Workspace.IWorkspace;
        const path = context.path;
        const id = workspace.metadata.id;

        // Save the file contents as a workspace.
        await this._workspaces.save(id, workspace);

        // Save last save location for the save command.
        await this._state.save(LAST_SAVE_ID, path);

        // Navigate to new workspace.
        const url = URLExt.join(this._application, 'workspaces', id);
        if (this._router) {
          this._router.navigate(url, { hard: true });
        } else {
          document.location.href = url;
        }
      });
      return dummyWidget(context);
    }

    private _application: string;
    private _router: IRouter | null;
    private _state: IStateDB;
    private _workspaces: WorkspaceManager;
  }

  /**
   * A namespace for `WorkspaceFactory`
   */
  export namespace WorkspaceFactory {
    /**
     * Instantiation options for a `WorkspaceFactory`
     */
    export interface IOptions {
      paths: JupyterFrontEnd.IPaths;
      router: IRouter | null;
      state: IStateDB;
      translator: ITranslator;
      workspaces: WorkspaceManager;
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
      title: trans.__('Save Current Workspace As…'),
      body: new SaveWidget(defaultPath),
      buttons: [Dialog.cancelButton(), saveBtn]
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
