// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';
import { Popup, showPopup, TextItem } from '@jupyterlab/statusbar';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { VDomModel, VDomRenderer } from '@jupyterlab/ui-components';
import { Menu } from '@lumino/widgets';
import React from 'react';

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
     * The application language translator.
     */
    translator?: ITranslator;

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
  const translator = props.translator || nullTranslator;
  const trans = translator.load('jupyterlab');
  const description = props.isSpaces
    ? trans.__('Spaces')
    : trans.__('Tab Size');
  return (
    <TextItem
      onClick={props.handleClick}
      source={`${description}: ${props.tabSpace}`}
      title={trans.__('Change Tab indentation…')}
    />
  );
}

/**
 * A VDomRenderer for a tabs vs. spaces status item.
 */
export class TabSpaceStatus extends VDomRenderer<TabSpaceStatus.Model> {
  /**
   * Create a new tab/space status item.
   */
  constructor(options: TabSpaceStatus.IOptions) {
    super(new TabSpaceStatus.Model());
    this._menu = options.menu;
    this.translator = options.translator || nullTranslator;
    this.addClass('jp-mod-highlighted');
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
          translator={this.translator}
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

    menu.aboutToClose.connect(this._menuClosed, this);

    this._popup = showPopup({
      body: menu,
      anchor: this,
      align: 'right'
    });
  }

  private _menuClosed(): void {
    this.removeClass('jp-mod-clicked');
  }

  protected translator: ITranslator;
  private _menu: Menu;
  private _popup: Popup | null = null;
}

/**
 * A namespace for TabSpace statics.
 */
export namespace TabSpaceStatus {
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

    /**
     * Language translator.
     */
    translator?: ITranslator;
  }
}
