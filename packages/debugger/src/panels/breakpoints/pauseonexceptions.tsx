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

export class PauseOnExceptionsWidget extends ToolbarButton {
  constructor(props: PauseOnExceptions.IProps) {
    super();
    this.menu = new PauseOnExceptionsMenu({
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
      if (event.event === 'initialized') {
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
    if (exceptionBreakpointFilters) {
      this._props.className = PAUSE_ON_EXCEPTION_BUTTON_CLASS;

      if (session.isPausingOnException()) {
        this._props.className += ' lm-mod-toggled';
      }
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
    this.menu.open(
      this.node.getBoundingClientRect().left,
      this.node.getBoundingClientRect().bottom
    );
  };

  render(): JSX.Element {
    return <ToolbarButtonComponent {...this._props} onClick={this.onclick} />;
  }

  menu: PauseOnExceptionsMenu;
  private _props: PauseOnExceptions.IProps;
}

export class PauseOnExceptionsMenu extends MenuSvg {
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

export namespace PauseOnExceptions {
  export interface IProps extends ToolbarButtonComponent.IProps {
    service: IDebugger;
    commands: Breakpoints.ICommands;
  }
}
