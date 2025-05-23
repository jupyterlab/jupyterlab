// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ServiceManager,
  Session,
  SessionManager,
  Terminal,
  TerminalManager
} from '@jupyterlab/services';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import {
  kernelIcon,
  terminalIcon,
  VDomModel,
  VDomRenderer
} from '@jupyterlab/ui-components';
import React, { KeyboardEvent } from 'react';
import { GroupItem, TextItem } from '@jupyterlab/statusbar';

/**
 * Half spacing between subitems in a status item, in pixels.
 */
const HALF_SPACING = 4;

/**
 * A pure functional component for rendering kernel and terminal sessions.
 *
 * @param props the props for the component.
 *
 * @returns a tsx component for the running sessions.
 */
function RunningSessionsComponent(
  props: RunningSessionsComponent.IProps
): React.ReactElement<RunningSessionsComponent.IProps> {
  const showKernels = props.showKernels ?? true;
  const showTerminals = props.showTerminals ?? props.terminals > 0;
  return (
    <GroupItem
      role="button"
      tabIndex={0}
      spacing={HALF_SPACING}
      onClick={props.handleClick}
      onKeyDown={props.handleKeyDown}
      style={{ cursor: 'pointer' }}
    >
      {showTerminals ? (
        <GroupItem spacing={HALF_SPACING}>
          <TextItem source={props.terminals} />
          <terminalIcon.react verticalAlign="middle" stylesheet="statusBar" />
        </GroupItem>
      ) : null}
      {showKernels ? (
        <GroupItem spacing={HALF_SPACING}>
          <TextItem source={props.sessions} />
          <kernelIcon.react verticalAlign="middle" stylesheet="statusBar" />
        </GroupItem>
      ) : null}
    </GroupItem>
  );
}

/**
 * A namespace for RunningSessionsComponents statics.
 */
namespace RunningSessionsComponent {
  /**
   * The props for rendering the RunningSessionsComponent.
   */
  export interface IProps {
    /**
     * A key down handler for the component. By default this is used
     * to activate the running sessions side panel.
     */
    handleKeyDown: (event: KeyboardEvent<HTMLImageElement>) => void;
    /**
     * A click handler for the component. By default this is used
     * to activate the running sessions side panel.
     */
    handleClick: () => void;

    /**
     * The number of running kernel sessions.
     */
    sessions: number;

    /**
     * The number of active terminal sessions.
     */
    terminals: number;

    /**
     * Whether to show kernels, true by default.
     */
    showKernels?: boolean;

    /**
     * Whether to show terminals.
     *
     * The default is true if one or more terminals are open, false otherwise.
     */
    showTerminals?: boolean;
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
    super(new RunningSessions.Model());
    this._serviceManager = opts.serviceManager;
    this._handleClick = opts.onClick;
    this._handleKeyDown = opts.onKeyDown;
    this.translator = opts.translator || nullTranslator;
    this._showKernels = opts.showKernels;
    this._showTerminals = opts.showTerminals;
    this._trans = this.translator.load('jupyterlab');

    this._serviceManager.sessions.runningChanged.connect(
      this._onSessionsRunningChanged,
      this
    );
    this._serviceManager.terminals.runningChanged.connect(
      this._onTerminalsRunningChanged,
      this
    );

    this.addClass('jp-mod-highlighted');
  }

  /**
   * Render the running sessions widget.
   */
  render(): JSX.Element | null {
    if (!this.model) {
      return null;
    }
    // TODO-TRANS: Should probably be handled differently.
    // This is more localizable friendly: "Terminals: %1 | Kernels: %2"

    // Generate a localized caption for the tooltip
    const caption = this._trans.__(
      '%1 Terminals, %2 Kernel sessions',
      this.model.terminals,
      this.model.sessions
    );

    // Explicitly synchronize the title attribute with the Lumino widget's DOM
    // This ensures the tooltip displays correctly when hovering over the widget
    this.node.title = caption;

    return (
      <RunningSessionsComponent
        sessions={this.model.sessions}
        terminals={this.model.terminals}
        handleClick={this._handleClick}
        handleKeyDown={this._handleKeyDown}
        showKernels={this._showKernels}
        showTerminals={this._showTerminals}
      />
    );
  }

  /**
   * Dispose of the status item.
   */
  dispose(): void {
    super.dispose();

    this._serviceManager.sessions.runningChanged.disconnect(
      this._onSessionsRunningChanged,
      this
    );
    this._serviceManager.terminals.runningChanged.disconnect(
      this._onTerminalsRunningChanged,
      this
    );
  }

  /**
   * Set the number of kernel sessions when the list changes.
   */
  private _onSessionsRunningChanged(
    manager: SessionManager,
    sessions: Session.IModel[]
  ): void {
    this.model!.sessions = sessions.length;
  }

  /**
   * Set the number of terminal sessions when the list changes.
   */
  private _onTerminalsRunningChanged(
    manager: TerminalManager,
    terminals: Terminal.IModel[]
  ): void {
    this.model!.terminals = terminals.length;
  }

  protected translator: ITranslator;
  private _trans: TranslationBundle;
  private _handleClick: () => void;
  private _handleKeyDown: (event: KeyboardEvent<HTMLImageElement>) => void;
  private _serviceManager: ServiceManager.IManager;
  private _showKernels?: boolean;
  private _showTerminals?: boolean;
}

/**
 * A namespace for RunningSessions statics.
 */
export namespace RunningSessions {
  /**
   * A VDomModel for the RunningSessions status item.
   */
  export class Model extends VDomModel {
    /**
     * The number of active kernel sessions.
     */
    get sessions(): number {
      return this._sessions;
    }
    set sessions(sessions: number) {
      const oldSessions = this._sessions;
      this._sessions = sessions;

      if (oldSessions !== this._sessions) {
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
    private _sessions: number = 0;
  }

  /**
   * Options for creating a RunningSessions item.
   */
  export interface IOptions {
    /**
     * The application service manager.
     */
    serviceManager: ServiceManager.IManager;

    /**
     * A click handler for the item. By default this is used
     * to activate the running sessions side panel.
     */
    onClick: () => void;

    /**
     * A key down handler for the item. By default this is used
     * to activate the running sessions side panel.
     */
    onKeyDown: (event: KeyboardEvent<HTMLImageElement>) => void;

    /**
     * The application language translator.
     */
    translator?: ITranslator;

    /**
     * Whether to show kernels, true by default.
     */
    showKernels?: boolean;

    /**
     * Whether to show terminals.
     *
     * The default is true if one or more terminals are open, false otherwise.
     */
    showTerminals?: boolean;
  }
}
