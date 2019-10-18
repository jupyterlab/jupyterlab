// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILoggerRegistry,
  ILogger,
  ILoggerChange
} from '@jupyterlab/logconsole';

import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';

import React from 'react';

import {
  GroupItem,
  IconItem,
  TextItem,
  interactiveItem
} from '@jupyterlab/statusbar';

import { Signal } from '@phosphor/signaling';

/**
 * A pure functional component for a Log Console status item.
 *
 * @param props - the props for the component.
 *
 * @returns a tsx component for rendering the Log Console status.
 */
function LogConsoleStatusComponent(
  props: LogConsoleStatusComponent.IProps
): React.ReactElement<LogConsoleStatusComponent.IProps> {
  return (
    <GroupItem
      spacing={0}
      onClick={props.handleClick}
      title={`${props.messages} messages in current log`}
    >
      <IconItem source={'jp-LogConsoleIcon'} />
      <TextItem source={props.messages} />
    </GroupItem>
  );
}

/*
 * A namespace for LogConsoleStatusComponent.
 */
namespace LogConsoleStatusComponent {
  /**
   * The props for the LogConsoleStatusComponent.
   */
  export interface IProps {
    /**
     * A click handler for the item. By default
     * Log Console panel is launched.
     */
    handleClick: () => void;

    /**
     * Number of log messages.
     */
    messages: number;
  }
}

/**
 * A VDomRenderer widget for displaying the status of Log Console logs.
 */
export class LogConsoleStatus extends VDomRenderer<LogConsoleStatus.Model> {
  /**
   * Construct the log console status widget.
   *
   * @param options - The status widget initialization options.
   */
  constructor(options: LogConsoleStatus.IOptions) {
    super();
    this._handleClick = options.handleClick;
    this.model = new LogConsoleStatus.Model(options.loggerRegistry);
    this.addClass(interactiveItem);
    this.addClass('jp-LogConsoleStatusItem');
  }

  /**
   * Render the log console status item.
   */
  render() {
    if (this.model === null || !this.model.active) {
      this.hide();
      return null;
    }
    this.show();
    let { source, flashEnabled, sourceUnread, messages } = this.model;
    if (source && flashEnabled && sourceUnread > 0) {
      if (
        this._lastSource === source &&
        this._lastSourceUnread < sourceUnread
      ) {
        // There are new messages to notify the user about
        this._flashHighlight();
      } else {
        this._showHighlighted();
      }
    } else {
      this._clearHighlight();
    }
    this._lastSource = source;
    this._lastSourceUnread = sourceUnread;

    return (
      <LogConsoleStatusComponent
        handleClick={this._handleClick}
        messages={messages}
      />
    );
  }

  private _flashHighlight() {
    this._showHighlighted();

    // To make sure the browser triggers the animation, we remove the class,
    // wait for an animation frame, then add it back
    this.removeClass('hilite');
    requestAnimationFrame(() => {
      this.addClass('hilite');
    });
  }

  private _showHighlighted() {
    this.addClass('hilited');
  }

  private _clearHighlight() {
    this.removeClass('hilite');
    this.removeClass('hilited');
  }

  private _lastSource: string | null = null;
  private _lastSourceUnread: number = 0;
  private _handleClick: () => void;
}

/**
 * A namespace for Log Console log status.
 */
export namespace LogConsoleStatus {
  /**
   * A VDomModel for the LogConsoleStatus item.
   */
  export class Model extends VDomModel {
    /**
     * Create a new LogConsoleStatus model.
     *
     * @param loggerRegistry - The logger registry providing the logs.
     */
    constructor(loggerRegistry: ILoggerRegistry) {
      super();

      this._loggerRegistry = loggerRegistry;
      this._loggerRegistry.registryChanged.connect(
        this._handleLogRegistryChange,
        this
      );
    }

    /**
     * Number of messages in the current source.
     */
    get messages(): number {
      if (this._source) {
        const logger = this._loggerRegistry.getLogger(this._source);
        return logger.length;
      }

      return 0;
    }

    /**
     * Whether the current source is active (has ever had a message).
     */
    get active(): boolean {
      if (this._source) {
        const logger = this._loggerRegistry.getLogger(this._source);
        return logger.active;
      }
      return false;
    }

    /**
     * The name of the active log source
     */
    get source(): string {
      return this._source;
    }

    set source(name: string) {
      if (this._source === name) {
        return;
      }

      this._source = name;

      // refresh rendering
      this.stateChanged.emit();
    }

    /**
     * How many messages the source has emitted since its last clear or view.
     */
    get sourceUnread(): number {
      return this._sourceUnread.get(this.source);
    }

    /**
     * Flag to toggle flashing when new logs added.
     */
    get flashEnabled(): boolean {
      return this._flashEnabled;
    }

    set flashEnabled(enabled: boolean) {
      if (this._flashEnabled === enabled) {
        return;
      }

      this._flashEnabled = enabled;
      this.flashEnabledChanged.emit();

      // refresh rendering
      this.stateChanged.emit();
    }

    /**
     * Mark the logs from the source as displayed.
     *
     * @param source - The name of the log source.
     */
    markSourceLogsViewed(source: string) {
      this._sourceUnread.set(source, 0);
      if (source === this._source) {
        this.stateChanged.emit();
      }
    }

    private _handleLogRegistryChange() {
      const loggers = this._loggerRegistry.getLoggers();
      for (let logger of loggers) {
        if (!this._sourceUnread.has(logger.source)) {
          logger.logChanged.connect(this._handleLogChange, this);
          this._sourceUnread.set(logger.source, logger.length);
        }
      }
    }

    private _handleLogChange({ source }: ILogger, change: ILoggerChange) {
      switch (change) {
        case 'append':
          this._sourceUnread.set(source, this._sourceUnread.get(source) + 1);
          break;
        case 'clear':
          this._sourceUnread.set(source, 0);
          break;
        default:
          break;
      }
      if (source === this._source) {
        this.stateChanged.emit();
      }
    }

    /**
     * A signal emitted when the flash enablement changes.
     */
    public flashEnabledChanged = new Signal<this, void>(this);
    private _flashEnabled: boolean = true;
    private _loggerRegistry: ILoggerRegistry;
    private _source: string = null;
    /**
     * The view status of each source.
     *
     * #### Notes
     * Keys are source names, value is the number of messages logged since the
     * last clear or view
     */
    private _sourceUnread: Map<string, number> = new Map();
  }

  /**
   * Options for creating a new LogConsoleStatus item
   */
  export interface IOptions {
    /**
     * The logger registry providing the logs.
     */
    loggerRegistry: ILoggerRegistry;

    /**
     * A click handler for the item. By default
     * Log Console panel is launched.
     */
    handleClick: () => void;
  }
}
