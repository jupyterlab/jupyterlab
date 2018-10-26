// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React from 'react';

import { VDomRenderer, VDomModel } from '@jupyterlab/apputils';

import {
  ServiceManager,
  Kernel,
  TerminalSession,
  TerminalManager,
  SessionManager
} from '@jupyterlab/services';

import { GroupItem, IconItem, interactiveItem, TextItem } from '..';

/**
 * Half spacing between subitems in a status item.
 */
const HALF_SPACING = 4;

/**
 * A pure functional component for rendering kernel and terminal sessions.
 *
 * @param props: the props for the component.
 *
 * @returns a tsx component for the running sessions.
 */
function RunningSessionsComponent(
  props: RunningSessionsComponent.IProps
): React.ReactElement<RunningSessionsComponent.IProps> {
  return (
    <GroupItem spacing={HALF_SPACING} onClick={props.handleClick}>
      <GroupItem spacing={HALF_SPACING}>
        <TextItem source={props.terminals} />
        <IconItem source={'terminal-item'} offset={{ x: 1, y: 3 }} />
      </GroupItem>
      <GroupItem spacing={HALF_SPACING}>
        <TextItem source={props.kernels} />
        <IconItem source={'kernel-item'} offset={{ x: 0, y: 2 }} />
      </GroupItem>
    </GroupItem>
  );
}

/**
 * A namepsace for RunningSessionsComponents statics.
 */
namespace RunningSessionsComponent {
  /**
   * The props for rendering the RunningSessionsComponent.
   */
  export interface IProps {
    /**
     * A click handler for the component. By defult this is used
     * to activate the running sessions side panel.
     */
    handleClick: () => void;

    /**
     * The number of running kernels.
     */
    kernels: number;

    /**
     * The number of active terminal sessions.
     */
    terminals: number;
  }
}

/**
 * A VDomRenderer for a RunningSessions status item.
 */
export class RunningSessions extends VDomRenderer<RunningSessions.Model> {
  /**
   * Create a new RunningSessions widget.
   */
  constructor(opts: RunningSessions.IOptions) {
    super();
    this._serviceManager = opts.serviceManager;
    this._handleClick = opts.onClick;

    this._serviceManager.sessions.runningChanged.connect(
      this._onKernelsRunningChanged,
      this
    );
    this._serviceManager.terminals.runningChanged.connect(
      this._onTerminalsRunningChanged,
      this
    );

    this.model = new RunningSessions.Model();
    this.addClass(interactiveItem);
  }

  /**
   * Render the running sessions widget.
   */
  render() {
    if (!this.model) {
      return null;
    }
    this.title.caption = `${this.model.terminals} Terminals, ${
      this.model!.kernels
    } Kernels`;
    return (
      <RunningSessionsComponent
        kernels={this.model.kernels}
        terminals={this.model.terminals}
        handleClick={this._handleClick}
      />
    );
  }

  /**
   * Dispose of the status item.
   */
  dispose() {
    super.dispose();

    this._serviceManager.sessions.runningChanged.disconnect(
      this._onKernelsRunningChanged,
      this
    );
    this._serviceManager.terminals.runningChanged.disconnect(
      this._onTerminalsRunningChanged,
      this
    );
  }

  /**
   * Set the number of model kernels when the list changes.
   */
  private _onKernelsRunningChanged(
    manager: SessionManager,
    kernels: Kernel.IModel[]
  ): void {
    this.model!.kernels = kernels.length;
  }

  /**
   * Set the number of model terminal sessions when the list changes.
   */
  private _onTerminalsRunningChanged(
    manager: TerminalManager,
    terminals: TerminalSession.IModel[]
  ): void {
    this.model!.terminals = terminals.length;
  }

  private _handleClick: () => void;
  private _serviceManager: ServiceManager;
}

/**
 * A namespace for RunninSessions statics.
 */
export namespace RunningSessions {
  /**
   * A VDomModel for the RunninSessions status item.
   */
  export class Model extends VDomModel {
    /**
     * The number of active kernels.
     */
    get kernels(): number {
      return this._kernels;
    }
    set kernels(kernels: number) {
      const oldKernels = this._kernels;
      this._kernels = kernels;

      if (oldKernels !== this._kernels) {
        this.stateChanged.emit(void 0);
      }
    }

    /**
     * The number of active terminal sessions.
     */
    get terminals(): number {
      return this._terminals;
    }
    set terminals(terminals: number) {
      const oldTerminals = this._terminals;
      this._terminals = terminals;

      if (oldTerminals !== this._terminals) {
        this.stateChanged.emit(void 0);
      }
    }

    private _terminals: number = 0;
    private _kernels: number = 0;
  }

  /**
   * Options for creating a RunningSessions item.
   */
  export interface IOptions {
    /**
     * The application service manager.
     */
    serviceManager: ServiceManager;

    /**
     * A click handler for the item. By defult this is used
     * to activate the running sessions side panel.
     */
    onClick: () => void;
  }
}
