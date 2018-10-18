/**
 * Default item to change the tab spacing for the active document.
 */
/**
 * Part of Jupyterlab status bar defaults.
 */
import React from 'react';
import { TextItem } from '../component/text';

import {
  JupyterLabPlugin,
  JupyterLab,
  ApplicationShell
} from '@jupyterlab/application';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { VDomRenderer, VDomModel } from '@jupyterlab/apputils';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { ISignal } from '@phosphor/signaling';
import { Cell } from '@jupyterlab/cells';
import { IDisposable } from '@phosphor/disposable';
import { Token } from '@phosphor/coreutils';
import { IDefaultsManager } from './manager';
import { Widget } from '@phosphor/widgets';
import { IStatusContext } from '../contexts';
import { CommandRegistry } from '@phosphor/commands';
import { Menu } from '@phosphor/widgets';

import { JSONObject } from '@phosphor/coreutils';
import { showPopup, Popup } from '../component/hover';
import { interactiveItem, clickedItem } from '../style/statusBar';
import { IConsoleTracker, ConsolePanel } from '@jupyterlab/console';
import { ISettingRegistry } from '@jupyterlab/coreutils';
import { Message } from '@phosphor/messaging';
import { SettingsConnector } from '../util/settings';

namespace TabSpaceComponent {
  export interface IProps {
    tabSpace: number;
    isSpaces: boolean;
    handleClick: () => void;
  }
}

// tslint:disable-next-line:variable-name
const TabSpaceComponent = (
  props: TabSpaceComponent.IProps
): React.ReactElement<TabSpaceComponent.IProps> => {
  const description = props.isSpaces ? 'Spaces' : 'Tab Size';
  return (
    <TextItem
      onClick={props.handleClick}
      source={`${description}: ${props.tabSpace}`}
    />
  );
};

class TabSpace extends VDomRenderer<TabSpace.Model> implements ITabSpace {
  constructor(opts: TabSpace.IOptions) {
    super();

    this._notebookTracker = opts.notebookTracker;
    this._editorTracker = opts.editorTracker;
    this._consoleTracker = opts.consoleTracker;
    this._shell = opts.shell;
    this._settingsProviderData = opts.settingsProviderData;

    this._notebookTracker.activeCellChanged.connect(this._onActiveCellChange);
    this._shell.currentChanged.connect(this._onMainAreaCurrentChange);

    const provider = this._getFocusedSettingProvider(this._shell.currentWidget);
    this.model = new TabSpace.Model(
      provider && this._settingsProviderData[provider].connector
    );

    this.node.title = 'Change tab spacing';

    this.addClass(interactiveItem);
  }

  private _handleClick = () => {
    const provider = this._getFocusedSettingProvider(this._shell.currentWidget);
    if (!provider) {
      return;
    }
    const { menu } = this._settingsProviderData[provider];
    menu.aboutToClose.connect(this._menuClosed);

    if (this._popup) {
      this._popup.dispose();
    }

    this._popup = showPopup({
      body: menu,
      anchor: this,
      align: 'right'
    });

    menu.aboutToClose.connect(this._onClickMenuDispose);
  };

  private _onClickMenuDispose = (sender: Menu) => {
    sender.node.focus();
    this._popup!.dispose();

    sender.aboutToClose.connect(this._onClickMenuDispose);
  };

  private _menuClosed = () => {
    this.removeClass(clickedItem);
  };

  render(): React.ReactElement<TabSpaceComponent.IProps> | null {
    if (this.model === null) {
      return null;
    } else {
      const provider = this._getFocusedSettingProvider(
        this._shell.currentWidget
      );
      const currentValue =
        provider && this._settingsProviderData[provider].connector.currentValue;

      if (!currentValue) {
        return null;
      }

      return (
        <TabSpaceComponent
          isSpaces={currentValue.insertSpaces}
          tabSpace={this.model.tabSpace}
          handleClick={this._handleClick}
        />
      );
    }
  }

  dispose() {
    super.dispose();

    this._notebookTracker.activeCellChanged.disconnect(
      this._onActiveCellChange
    );
    this._shell.currentChanged.disconnect(this._onMainAreaCurrentChange);
  }

  protected onUpdateRequest(msg: Message) {
    const provider = this._getFocusedSettingProvider(this._shell.currentWidget);
    this.model!.settingConnector =
      provider && this._settingsProviderData[provider].connector;

    super.onUpdateRequest(msg);
  }

  private _onActiveCellChange = (_tracker: INotebookTracker, cell: Cell) => {
    let settingsConnector: SettingsConnector<TabSpace.SettingData> | null;
    if (cell !== null) {
      if (cell.model.type === 'code') {
        settingsConnector = this._settingsProviderData['notebookCode']
          .connector;
      } else if (cell.model.type === 'raw') {
        settingsConnector = this._settingsProviderData['notebookRaw'].connector;
      } else {
        settingsConnector = null;
      }
    } else {
      settingsConnector = this._settingsProviderData['notebookMarkdown']
        .connector;
    }

    this.model!.settingConnector = settingsConnector;
  };

  private _getFocusedSettingProvider(
    val: Widget | null
  ): TabSpace.SettingProvider | null {
    if (val === null) {
      return null;
    } else {
      if (this._notebookTracker.has(val)) {
        const activeCell = (val as NotebookPanel).content.activeCell;
        if (activeCell === null) {
          return null;
        } else {
          if (activeCell.model.type === 'code') {
            return 'notebookCode';
          } else if (activeCell.model.type === 'raw') {
            return 'notebookRaw';
          } else {
            return 'notebookMarkdown';
          }
        }
      } else if (this._editorTracker.has(val)) {
        return 'editor';
      } else if (this._consoleTracker.has(val)) {
        const prompt = (val as ConsolePanel).console.promptCell;
        if (prompt !== null) {
          return 'notebookCode';
        } else {
          return null;
        }
      } else {
        return null;
      }
    }
  }

  private _onMainAreaCurrentChange = (
    shell: ApplicationShell,
    change: ApplicationShell.IChangedArgs
  ) => {
    const { newValue } = change;
    const provider = this._getFocusedSettingProvider(newValue);
    this.model!.settingConnector =
      provider && this._settingsProviderData[provider].connector;
  };

  private _notebookTracker: INotebookTracker;
  private _editorTracker: IEditorTracker;
  private _consoleTracker: IConsoleTracker;
  private _shell: ApplicationShell;
  private _settingsProviderData: TabSpace.ISettingProviderData;
  private _popup: Popup | null = null;
}

namespace Private {
  export function initNotebookConnectorAndMenu(
    app: JupyterLab,
    settings: ISettingRegistry,
    pluginId: string,
    settingKey: string,
    commandId: string,
    tracker: INotebookTracker
  ): [SettingsConnector<TabSpace.SettingData>, Menu] {
    const connector = new SettingsConnector<TabSpace.SettingData>({
      registry: settings,
      pluginId,
      settingKey
    });

    app.commands.addCommand(commandId, {
      label: args => args['name'] as string,
      execute: args => {
        connector.currentValue = {
          tabSize: (args['size'] as number) || 4,
          insertSpaces: !!args['insertSpaces']
        };
      },
      isEnabled: IStatusContext.delegateActive(app.shell, [{ tracker }]),
      isToggled: args => {
        const insertSpaces = !!args['insertSpaces'];
        const size = (args['size'] as number) || 4;
        const { currentValue } = connector;
        return (
          !!currentValue &&
          currentValue.insertSpaces === insertSpaces &&
          currentValue.tabSize === size
        );
      }
    });

    const menu = new Menu({ commands: app.commands });

    const args: JSONObject = {
      insertSpaces: false,
      size: 4,
      name: 'Indent with Tab'
    };
    menu.addItem({ command: commandId, args });

    for (let size of [1, 2, 4, 8]) {
      let args: JSONObject = {
        insertSpaces: true,
        size,
        name: `Spaces: ${size}`
      };
      menu.addItem({ command: commandId, args });
    }

    return [connector, menu];
  }
}

namespace TabSpace {
  export class Model extends VDomModel implements ITabSpace.IModel {
    constructor(settingConnector: SettingsConnector<SettingData> | null) {
      super();

      this.settingConnector = settingConnector;
    }

    get settingConnector(): SettingsConnector<SettingData> | null {
      return this._settingConnector;
    }

    set settingConnector(
      settingConnector: SettingsConnector<SettingData> | null
    ) {
      const oldTabSpace = this._tabSpace;
      const oldSettingConnector = this._settingConnector;
      if (oldSettingConnector !== null) {
        oldSettingConnector.changed.disconnect(this._onTabSizeChanged);
      }
      this._settingConnector = settingConnector;

      if (this._settingConnector === null) {
        this._tabSpace = 4;
      } else {
        this._settingConnector.changed.connect(this._onTabSizeChanged);

        this._tabSpace = this._settingConnector.currentValue!.tabSize;
      }

      if (
        (oldSettingConnector === null && this._settingConnector !== null) ||
        (oldSettingConnector !== null && this._settingConnector === null)
      ) {
        this.stateChanged.emit(void 0);
      } else {
        this._triggerChange(oldTabSpace, this._tabSpace);
      }
    }

    get tabSpace() {
      return this._tabSpace;
    }

    private _onTabSizeChanged = () => {
      const oldTabSpace = this._tabSpace;
      const currentValue = this.settingConnector!.currentValue;
      if (currentValue && currentValue.tabSize) {
        this._tabSpace = currentValue.tabSize;
      } else {
        this._tabSpace = 4;
      }

      this._triggerChange(oldTabSpace, this._tabSpace);
    };

    private _triggerChange(oldValue: number, newValue: number): void {
      if (oldValue !== newValue) {
        this.stateChanged.emit(void 0);
      }
    }

    private _tabSpace: number = 4;
    private _settingConnector: SettingsConnector<
      TabSpace.SettingData
    > | null = null;
  }

  export type SettingProvider =
    | 'notebookMarkdown'
    | 'notebookCode'
    | 'notebookRaw'
    | 'editor';

  export type ISettingProviderData = {
    [P in SettingProvider]: {
      connector: SettingsConnector<TabSpace.SettingData>;
      menu: Menu;
    }
  };

  export interface IOptions {
    notebookTracker: INotebookTracker;
    editorTracker: IEditorTracker;
    consoleTracker: IConsoleTracker;
    shell: ApplicationShell;
    commands: CommandRegistry;
    settings: ISettingRegistry;
    settingsProviderData: ISettingProviderData;
  }

  export type SettingData = { tabSize: number; insertSpaces: boolean };
}

export interface ITabSpace extends IDisposable {
  readonly model: ITabSpace.IModel | null;
  readonly modelChanged: ISignal<this, void>;
}

export namespace ITabSpace {
  export interface IModel {
    readonly tabSpace: number;
    readonly settingConnector: SettingsConnector<{
      tabSize: number;
    }> | null;
  }
}

// tslint:disable-next-line:variable-name
export const ITabSpace = new Token<ITabSpace>(
  '@jupyterlab/statusbar:ITabSpace'
);

export const tabSpaceItem: JupyterLabPlugin<ITabSpace> = {
  id: '@jupyterlab/statusbar:tab-space-item',
  autoStart: true,
  provides: ITabSpace,
  requires: [
    IDefaultsManager,
    INotebookTracker,
    IEditorTracker,
    IConsoleTracker,
    ISettingRegistry
  ],
  activate: (
    app: JupyterLab,
    defaultsManager: IDefaultsManager,
    notebookTracker: INotebookTracker,
    editorTracker: IEditorTracker,
    consoleTracker: IConsoleTracker,
    settings: ISettingRegistry
  ) => {
    const [
      notebookMarkdownConnector,
      markdownMenu
    ] = Private.initNotebookConnectorAndMenu(
      app,
      settings,
      '@jupyterlab/notebook-extension:tracker',
      'markdownCellConfig',
      CommandIDs.changeTabsNotebookMarkdown,
      notebookTracker
    );

    const [
      notebookCodeConnector,
      codeMenu
    ] = Private.initNotebookConnectorAndMenu(
      app,
      settings,
      '@jupyterlab/notebook-extension:tracker',
      'codeCellConfig',
      CommandIDs.changeTabsNotebookCode,
      notebookTracker
    );

    const [
      notebookRawConnector,
      rawMenu
    ] = Private.initNotebookConnectorAndMenu(
      app,
      settings,
      '@jupyterlab/notebook-extension:tracker',
      'rawCellConfig',
      CommandIDs.changeTabsNotebookRaw,
      notebookTracker
    );

    const editorConnector = new SettingsConnector<TabSpace.SettingData>({
      registry: settings,
      pluginId: '@jupyterlab/fileeditor-extension:plugin',
      settingKey: 'editorConfig'
    });

    const editorMenu = new Menu({ commands: app.commands });

    editorMenu.addClass('p-Menu');

    const args: JSONObject = {
      insertSpaces: false,
      size: 4,
      name: 'Indent with Tab'
    };
    editorMenu.addItem({ command: CommandIDs.changeTabsEditor, args });

    for (let size of [1, 2, 4, 8]) {
      let args: JSONObject = {
        insertSpaces: true,
        size,
        name: `Spaces: ${size}`
      };
      editorMenu.addItem({ command: CommandIDs.changeTabsEditor, args });
    }

    const settingsProviderData: TabSpace.ISettingProviderData = {
      notebookCode: {
        connector: notebookCodeConnector,
        menu: codeMenu
      },
      notebookMarkdown: {
        connector: notebookMarkdownConnector,
        menu: markdownMenu
      },
      notebookRaw: {
        connector: notebookRawConnector,
        menu: rawMenu
      },
      editor: {
        connector: editorConnector,
        menu: editorMenu
      }
    };

    const item = new TabSpace({
      shell: app.shell,
      notebookTracker,
      editorTracker,
      consoleTracker,
      commands: app.commands,
      settings,
      settingsProviderData
    });

    defaultsManager.addDefaultStatus('tab-space-item', item, {
      align: 'right',
      priority: 1,
      isActive: IStatusContext.delegateActive(app.shell, [
        { tracker: notebookTracker },
        { tracker: editorTracker },
        { tracker: consoleTracker }
      ])
    });

    return item;
  }
};

namespace CommandIDs {
  export const changeTabsNotebookMarkdown = 'notebook:markdown-change-tabs';
  export const changeTabsNotebookCode = 'notebook:code-change-tabs';
  export const changeTabsNotebookRaw = 'notebook:raw-change-tabs';
  export const changeTabsEditor = 'fileeditor:change-tabs';
}
