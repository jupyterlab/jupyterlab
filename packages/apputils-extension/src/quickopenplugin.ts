// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  DefaultQuickOpenProvider,
  ICommandPalette,
  IQuickOpenProvider,
  ModalCommandPalette
} from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { IDefaultFileBrowser } from '@jupyterlab/filebrowser';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { CommandRegistry } from '@lumino/commands';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { Message } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';
import { CommandPalette } from '@lumino/widgets';

/**
 * Options for creating a QuickOpenWidget.
 */
export interface IQuickOpenOptions {
  defaultBrowser: IDefaultFileBrowser;
  settings: ReadonlyPartialJSONObject;
  provider: IQuickOpenProvider;
  commandPaletteOptions: CommandPalette.IOptions;
}

/**
 * Shows files nested under directories in the root notebooks directory configured on the server.
 */
export class QuickOpenWidget extends CommandPalette {
  /**
   * Create a new QuickOpenWidget.
   */
  constructor(options: IQuickOpenOptions) {
    super(options.commandPaletteOptions);

    this.id = 'jupyterlab-quickopen';
    this.title.iconClass = 'jp-SideBar-tabIcon jp-SearchIcon';
    this.title.caption = 'Quick Open';

    this._settings = options.settings;
    this._fileBrowser = options.defaultBrowser;
    this._provider = options.provider;
  }

  /** Signal when a selected path is activated. */
  get pathSelected(): ISignal<this, string> {
    return this._pathSelected;
  }

  /** Current extension settings */
  set settings(settings: ReadonlyPartialJSONObject) {
    this._settings = settings;
  }

  /**
   * Dispose of tracked disposables and clean up commands.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    // Clean up all tracked disposables
    this._disposables.forEach(disposable => disposable.dispose());
    this._disposables.length = 0;

    super.dispose();
  }

  /**
   * Refreshes the widget with the paths of files on the server.
   */
  protected async onActivateRequest(msg: Message): Promise<void> {
    super.onActivateRequest(msg);

    // Fetch the current contents from the server
    const path = this._settings.relativeSearch
      ? this._fileBrowser.model.path
      : '';
    const depth = this._settings.depth as number;
    const response = await this._provider.fetchContents({
      path,
      excludes: this._settings.excludes as string[],
      depth: depth
    });

    // Clean up previous commands and remove all paths from the view
    this._disposables.forEach(disposable => disposable.dispose());
    this._disposables.length = 0;
    this.clearItems();

    for (const category in response.contents) {
      for (const fn of response.contents[category]) {
        // Creates commands that are relative file paths on the server
        const command = `${category}/${fn}`;
        if (!this.commands.hasCommand(command)) {
          const disposable = this.commands.addCommand(command, {
            label: fn,
            execute: () => {
              this._pathSelected.emit(command);
            }
          });
          this._disposables.push(disposable);
        }
        // Make the file visible under its parent directory heading
        this.addItem({ command, category });
      }
    }
  }

  private _pathSelected = new Signal<this, string>(this);
  private _settings: ReadonlyPartialJSONObject;
  private _fileBrowser: IDefaultFileBrowser;
  private _provider: IQuickOpenProvider;
  private _disposables: IDisposable[] = [];
}

/**
 * The main quickopen plugin.
 */
const quickopenPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/apputils-extension:quickopen',
  description: 'Provides a quick open file dialog',
  autoStart: true,
  requires: [
    IDocumentManager,
    ISettingRegistry,
    IDefaultFileBrowser,
    IQuickOpenProvider
  ],
  optional: [ICommandPalette, ITranslator],
  activate: async (
    app: JupyterFrontEnd,
    docManager: IDocumentManager,
    settingRegistry: ISettingRegistry,
    defaultFileBrowser: IDefaultFileBrowser,
    provider: IQuickOpenProvider,
    palette: ICommandPalette | null,
    translator: ITranslator | null
  ) => {
    const trans = (translator ?? nullTranslator).load('jupyterlab');
    const commands: CommandRegistry = new CommandRegistry();
    const settings: ISettingRegistry.ISettings = await settingRegistry.load(
      quickopenPlugin.id
    );
    const widget: QuickOpenWidget = new QuickOpenWidget({
      defaultBrowser: defaultFileBrowser,
      settings: settings.composite,
      provider,
      commandPaletteOptions: {
        commands
      }
    });

    widget.pathSelected.connect((_sender: QuickOpenWidget, path: string) => {
      docManager.openOrReveal(PathExt.normalize(path));
    });

    settings.changed.connect((settings: ISettingRegistry.ISettings) => {
      widget.settings = settings.composite;
    });

    const modalPalette = new ModalCommandPalette({ commandPalette: widget });
    modalPalette.attach();

    const command = 'apputils:quickopen';
    app.commands.addCommand(command, {
      label: trans.__('Show the Quick Open'),
      execute: () => {
        modalPalette.activate();
      },
      describedBy: {
        args: {
          type: 'object',
          properties: {}
        }
      }
    });

    if (palette) {
      palette.addItem({ command, category: trans.__('File Operations') });
    }
  }
};

/**
 * Plugin that provides the default quick open provider
 */
const quickopenProviderPlugin: JupyterFrontEndPlugin<IQuickOpenProvider> = {
  id: '@jupyterlab/apputils-extension:quickopen-provider',
  description: 'Provides the quick open provider',
  autoStart: true,
  provides: IQuickOpenProvider,
  activate: (app: JupyterFrontEnd): IQuickOpenProvider => {
    return new DefaultQuickOpenProvider();
  }
};

export { quickopenPlugin, quickopenProviderPlugin };
