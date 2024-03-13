// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import {
  MenuSvg,
  ToolbarButton,
  ToolbarButtonComponent
} from '@jupyterlab/ui-components';
import { IDebugger } from '../../tokens';
import { Breakpoints } from './index';

const PAUSE_ON_EXCEPTION_CLASS = 'jp-debugger-pauseOnExceptions';
const PAUSE_ON_EXCEPTION_BUTTON_CLASS = 'jp-PauseOnExceptions';
const PAUSE_ON_EXCEPTION_MENU_CLASS = 'jp-PauseOnExceptions-menu';

/**
 * A button which display a menu on click, to select the filter.
 */
export class PauseOnExceptionsWidget extends ToolbarButton {
  /**
   * Constructor of the button.
   */
  constructor(props: PauseOnExceptions.IProps) {
    super();
    this._menu = new PauseOnExceptionsMenu({
      service: props.service,
      commands: {
        registry: props.commands.registry,
        pauseOnExceptions: props.commands.pauseOnExceptions
      }
    });

    this.node.className = PAUSE_ON_EXCEPTION_CLASS;

    this._props = props;
    this._props.className = PAUSE_ON_EXCEPTION_BUTTON_CLASS;
    this._props.service.eventMessage.connect((_, event): void => {
      if (event.event === 'initialized' || event.event === 'terminated') {
        this.onChange();
      }
    }, this);
    this._props.enabled = this._props.service.pauseOnExceptionsIsValid();
    this._props.service.pauseOnExceptionChanged.connect(this.onChange, this);
  }

  /**
   * Called when the debugger is initialized or the filter changed.
   */
  onChange() {
    const session = this._props.service.session;
    const exceptionBreakpointFilters = session?.exceptionBreakpointFilters;
    this._props.className = PAUSE_ON_EXCEPTION_BUTTON_CLASS;
    if (this._props.service.session?.isStarted && exceptionBreakpointFilters) {
      this._props.pressed = session.isPausingOnException();
      this._props.enabled = true;
    } else {
      this._props.enabled = false;
    }
    this.update();
  }

  /**
   * open menu on click.
   */
  onclick = () => {
    this._menu.open(
      this.node.getBoundingClientRect().left,
      this.node.getBoundingClientRect().bottom
    );
  };

  render(): JSX.Element {
    return <ToolbarButtonComponent {...this._props} onClick={this.onclick} />;
  }

  private _menu: PauseOnExceptionsMenu;
  private _props: PauseOnExceptions.IProps;
}

/**
 * A menu with all the available filter from the debugger as entries.
 */
export class PauseOnExceptionsMenu extends MenuSvg {
  /**
   * The constructor of the menu.
   */
  constructor(props: PauseOnExceptions.IProps) {
    super({ commands: props.commands.registry });
    this._service = props.service;
    this._command = props.commands.pauseOnExceptions;

    props.service.eventMessage.connect((_, event): void => {
      if (event.event === 'initialized') {
        this._build();
      }
    }, this);

    this._build();
    this.addClass(PAUSE_ON_EXCEPTION_MENU_CLASS);
  }

  private _build(): void {
    this.clearItems();
    const exceptionsBreakpointFilters =
      this._service.session?.exceptionBreakpointFilters ?? [];
    exceptionsBreakpointFilters.map((filter, _) => {
      this.addItem({
        command: this._command,
        args: {
          filter: filter.filter,
          description: filter.description as string
        }
      });
    });
  }

  private _service: IDebugger;
  private _command: string;
}

/**
 * A namespace for the widget.
 */
export namespace PauseOnExceptions {
  /**
   * The properties of the widget and menu.
   */
  export interface IProps extends ToolbarButtonComponent.IProps {
    /**
     * The debugger service linked to the widget.
     */
    service: IDebugger;
    /**
     * The commands registry and the command ID associated to the menu.
     */
    commands: Breakpoints.ICommands;
  }
}
