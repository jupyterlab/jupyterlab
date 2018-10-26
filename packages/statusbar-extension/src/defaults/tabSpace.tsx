import React from 'react';

import {
  JupyterLabPlugin,
  JupyterLab,
  ApplicationShell
} from '@jupyterlab/application';

import { VDomRenderer, VDomModel } from '@jupyterlab/apputils';

import { ISettingRegistry } from '@jupyterlab/coreutils';

import { IEditorTracker } from '@jupyterlab/fileeditor';

import {
  IStatusBar,
  interactiveItem,
  clickedItem,
  Popup,
  showPopup,
  TextItem
} from '@jupyterlab/statusbar';

import { CommandRegistry } from '@phosphor/commands';

import { JSONObject } from '@phosphor/coreutils';

import { IDisposable } from '@phosphor/disposable';

import { Message } from '@phosphor/messaging';

import { ISignal } from '@phosphor/signaling';

import { Menu, Widget } from '@phosphor/widgets';

import { IStatusContext } from '../context';

import { SettingsWrapper } from '../settings';

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

    this._editorTracker = opts.editorTracker;
    this._shell = opts.shell;
    this._settingsProviderData = opts.settingsProviderData;

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
    this._shell.currentChanged.disconnect(this._onMainAreaCurrentChange);
  }

  protected onUpdateRequest(msg: Message) {
    const provider = this._getFocusedSettingProvider(this._shell.currentWidget);
    this.model!.settingConnector =
      provider && this._settingsProviderData[provider].connector;

    super.onUpdateRequest(msg);
  }

  private _getFocusedSettingProvider(
    val: Widget | null
  ): TabSpace.SettingProvider | null {
    if (val === null) {
      return null;
    } else {
      if (this._editorTracker.has(val)) {
        return 'editor';
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

  private _editorTracker: IEditorTracker;
  private _shell: ApplicationShell;
  private _settingsProviderData: TabSpace.ISettingProviderData;
  private _popup: Popup | null = null;
}

namespace TabSpace {
  export class Model extends VDomModel implements ITabSpace.IModel {
    constructor(settingConnector: SettingsWrapper<SettingData> | null) {
      super();

      this.settingConnector = settingConnector;
    }

    get settingConnector(): SettingsWrapper<SettingData> | null {
      return this._settingConnector;
    }

    set settingConnector(
      settingConnector: SettingsWrapper<SettingData> | null
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
    private _settingConnector: SettingsWrapper<
      TabSpace.SettingData
    > | null = null;
  }

  export type SettingProvider = 'editor';

  export type ISettingProviderData = {
    [P in SettingProvider]: {
      connector: SettingsWrapper<TabSpace.SettingData>;
      menu: Menu;
    }
  };

  export interface IOptions {
    editorTracker: IEditorTracker;
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
    readonly settingConnector: SettingsWrapper<{
      tabSize: number;
    }> | null;
  }
}

export const tabSpaceItem: JupyterLabPlugin<void> = {
  id: '@jupyterlab/statusbar:tab-space-item',
  autoStart: true,
  requires: [IStatusBar, IEditorTracker, ISettingRegistry],
  activate: (
    app: JupyterLab,
    statusBar: IStatusBar,
    editorTracker: IEditorTracker,
    settings: ISettingRegistry
  ) => {
    const editorConnector = new SettingsWrapper<TabSpace.SettingData>({
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
      editor: {
        connector: editorConnector,
        menu: editorMenu
      }
    };

    const item = new TabSpace({
      shell: app.shell,
      editorTracker,
      commands: app.commands,
      settings,
      settingsProviderData
    });

    statusBar.registerStatusItem('tab-space-item', item, {
      align: 'right',
      rank: 1,
      isActive: IStatusContext.delegateActive(app.shell, [
        { tracker: editorTracker }
      ])
    });
  }
};

/**
 * Command IDs used by the plugin.
 */
namespace CommandIDs {
  export const changeTabsEditor = 'fileeditor:change-tabs';
}
