// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

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
     * The number of spaces for indentation.
     *
     * `null` means use tab character for indentation.
     */
    tabSpace: number | null;

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
  const description =
    typeof props.tabSpace === 'number'
      ? trans.__('Spaces')
      : trans.__('Tab Indent');
  return (
    <TextItem
      onClick={props.handleClick}
      source={
        typeof props.tabSpace === 'number'
          ? `${description}: ${props.tabSpace}`
          : description
      }
      title={trans.__('Change the indentation…')}
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
  render(): JSX.Element | null {
    if (!this.model?.indentUnit) {
      return null;
    } else {
      const tabSpace =
        this.model.indentUnit === 'Tab'
          ? null
          : parseInt(this.model.indentUnit, 10);
      return (
        <TabSpaceComponent
          tabSpace={tabSpace}
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
    // Update the menu items
    menu.update();
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
     * Code editor indentation unit
     */
    get indentUnit(): string | null {
      return this._indentUnit;
    }
    set indentUnit(v: string | null) {
      if (v !== this._indentUnit) {
        this._indentUnit = v;
        this.stateChanged.emit();
      }
    }

    private _indentUnit: string | null;
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
