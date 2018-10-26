import React from 'react';

import { JupyterLabPlugin, JupyterLab } from '@jupyterlab/application';

import { VDomRenderer, VDomModel } from '@jupyterlab/apputils';

import { CodeEditor } from '@jupyterlab/codeeditor';

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

import { JSONObject } from '@phosphor/coreutils';

import { Menu } from '@phosphor/widgets';

import { IStatusContext } from '../context';

/**
 * A namespace for TabSpaceComponent statics.
 */
namespace TabSpaceComponent {
  /**
   * The props for TabSpaceComponent.
   */
  export interface IProps {
    /**
     * The number of spaces to insert on tab.
     */
    tabSpace: number;

    /**
     * Whether to use spaces or tabs.
     */
    isSpaces: boolean;

    /**
     * A click handler for the TabSpace component. By default
     * opens a menu allowing the user to select tabs vs spaces.
     */
    handleClick: () => void;
  }
}

/**
 * A pure functional component for rendering the TabSpace status.
 */
function TabSpaceComponent(
  props: TabSpaceComponent.IProps
): React.ReactElement<TabSpaceComponent.IProps> {
  const description = props.isSpaces ? 'Spaces' : 'Tab Size';
  return (
    <TextItem
      onClick={props.handleClick}
      source={`${description}: ${props.tabSpace}`}
      title={`Change Tab indentation…`}
    />
  );
}

/**
 * A VDomRenderer for a tabs vs. spaces status item.
 */
class TabSpace extends VDomRenderer<TabSpace.Model> {
  /**
   * Create a new tab/space status item.
   */
  constructor(options: TabSpace.IOptions) {
    super();
    this._menu = options.menu;
    this.model = new TabSpace.Model();
    this.addClass(interactiveItem);
  }

  /**
   * Render the TabSpace status item.
   */
  render(): React.ReactElement<TabSpaceComponent.IProps> | null {
    if (!this.model || !this.model.config) {
      return null;
    } else {
      return (
        <TabSpaceComponent
          isSpaces={this.model.config.insertSpaces}
          tabSpace={this.model.config.tabSize}
          handleClick={() => this._handleClick()}
        />
      );
    }
  }

  /**
   * Handle a click on the status item.
   */
  private _handleClick(): void {
    const menu = this._menu;
    if (this._popup) {
      this._popup.dispose();
    }

    menu.aboutToClose.connect(
      this._menuClosed,
      this
    );

    this._popup = showPopup({
      body: menu,
      anchor: this,
      align: 'right'
    });
  }

  private _menuClosed(): void {
    this.removeClass(clickedItem);
  }

  private _menu: Menu;
  private _popup: Popup | null = null;
}

/**
 * A namespace for TabSpace statics.
 */
namespace TabSpace {
  /**
   * A VDomModel for the TabSpace status item.
   */
  export class Model extends VDomModel {
    /**
     * The editor config from the settings system.
     */
    get config(): CodeEditor.IConfig | null {
      return this._config;
    }
    set config(val: CodeEditor.IConfig | null) {
      const oldConfig = this._config;
      this._config = val;
      this._triggerChange(oldConfig, this._config);
    }

    private _triggerChange(
      oldValue: CodeEditor.IConfig | null,
      newValue: CodeEditor.IConfig | null
    ): void {
      const oldSpaces = oldValue && oldValue.insertSpaces;
      const oldSize = oldValue && oldValue.tabSize;
      const newSpaces = newValue && newValue.insertSpaces;
      const newSize = newValue && newValue.tabSize;
      if (oldSpaces !== newSpaces || oldSize !== newSize) {
        this.stateChanged.emit(void 0);
      }
    }

    private _config: CodeEditor.IConfig | null = null;
  }

  /**
   * Options for creating a TabSpace status item.
   */
  export interface IOptions {
    /**
     * A menu to open when clicking on the status item. This should allow
     * the user to make a different selection about tabs/spaces.
     */
    menu: Menu;
  }
}

/**
 * A plugin that provides a status item allowing the user to
 * switch tabs vs spaces and tab widths for text editors.
 */
export const tabSpaceItem: JupyterLabPlugin<void> = {
  id: '@jupyterlab/statusbar:tab-space-item',
  autoStart: true,
  requires: [IStatusBar, IEditorTracker, ISettingRegistry],
  activate: (
    app: JupyterLab,
    statusBar: IStatusBar,
    editorTracker: IEditorTracker,
    settingRegistry: ISettingRegistry
  ) => {
    // Create a menu for switching tabs vs spaces.
    const menu = new Menu({ commands: app.commands });
    const command = 'fileeditor:change-tabs';
    const args: JSONObject = {
      insertSpaces: false,
      size: 4,
      name: 'Indent with Tab'
    };
    menu.addItem({ command, args });
    for (let size of [1, 2, 4, 8]) {
      let args: JSONObject = {
        insertSpaces: true,
        size,
        name: `Spaces: ${size} `
      };
      menu.addItem({ command, args });
    }

    // Create the status item.
    const item = new TabSpace({ menu });

    // Keep a reference to the code editor config from the settings system.
    const updateSettings = (settings: ISettingRegistry.ISettings): void => {
      const cached = settings.get('editorConfig').composite as Partial<
        CodeEditor.IConfig
      >;
      const config: CodeEditor.IConfig = {
        ...CodeEditor.defaultConfig,
        ...cached
      };
      item.model!.config = config;
    };
    Promise.all([
      settingRegistry.load('@jupyterlab/fileeditor-extension:plugin'),
      app.restored
    ]).then(([settings]) => {
      updateSettings(settings);
      settings.changed.connect(updateSettings);
    });

    // Add the status item.
    statusBar.registerStatusItem('tab-space-item', item, {
      align: 'right',
      rank: 1,
      isActive: IStatusContext.delegateActive(app.shell, [
        { tracker: editorTracker }
      ])
    });
  }
};
