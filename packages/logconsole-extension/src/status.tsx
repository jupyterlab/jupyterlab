// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILoggerRegistry,
  ILogger,
  ILoggerChange,
  ILoggerRegistryChange,
  DEFAULT_LOG_ENTRY_LIMIT
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
      title={`${props.logCount} logs in Log Console`}
    >
      <IconItem source={'jp-LogConsoleIcon'} />
      <TextItem source={props.logCount} />
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
     * Number of logs.
     */
    logCount: number;
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

    let flashRequestTimer: number = null;

    this.model.sourceChanged.connect(() => {
      if (
        this.model.source &&
        this.model.flashEnabled &&
        !this.model.isSourceLogsViewed(this.model.source) &&
        this.model.logCount > 0
      ) {
        this._showHighlighted();
      } else {
        this._clearHighlight();
      }
    });

    this.model.flashEnabledChanged.connect(() => {
      if (!this.model.flashEnabled) {
        this._clearHighlight();
      }
    });

    this.model.logChanged.connect(() => {
      if (!this.model.flashEnabled || this.model.logCount === 0) {
        // cancel existing request
        clearTimeout(flashRequestTimer);
        flashRequestTimer = null;
        this._clearHighlight();
        return;
      }

      const wasFlashed = this.hasClass('hilite') || this.hasClass('hilited');
      if (wasFlashed) {
        this._clearHighlight();
        // cancel previous request
        clearTimeout(flashRequestTimer);
        flashRequestTimer = setTimeout(() => {
          this._flashHighlight();
        }, 100);
      } else {
        this._flashHighlight();
      }
    });
  }

  /**
   * Render the log console status item.
   */
  render() {
    if (this.model === null) {
      return null;
    }

    return (
      <LogConsoleStatusComponent
        handleClick={this._handleClick}
        logCount={this.model.logCount}
      />
    );
  }

  private _flashHighlight() {
    this.addClass('hilite');
  }

  private _showHighlighted() {
    this.addClass('hilited');
  }

  private _clearHighlight() {
    this.removeClass('hilite');
    this.removeClass('hilited');
  }

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
        (sender: ILoggerRegistry, args: ILoggerRegistryChange) => {
          const loggers = this._loggerRegistry.getLoggers();
          for (let logger of loggers) {
            if (this._loggersWatched.has(logger.source)) {
              continue;
            }

            logger.logChanged.connect(
              (sender: ILogger, change: ILoggerChange) => {
                if (sender.source === this._source) {
                  this.stateChanged.emit();
                  this.logChanged.emit();
                }

                // mark logger as dirty
                this._loggersWatched.set(sender.source, false);
              }
            );

            // mark logger as viewed
            this._loggersWatched.set(logger.source, true);
          }
        }
      );
    }

    /**
     * Number of logs.
     */
    get logCount(): number {
      if (this._source) {
        const logger = this._loggerRegistry.getLogger(this._source);
        return Math.min(logger.length, this._entryLimit);
      }

      return 0;
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
      this.sourceChanged.emit();

      // refresh rendering
      this.stateChanged.emit();
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
     * Log output entry limit.
     */
    set entryLimit(limit: number) {
      if (limit > 0) {
        this._entryLimit = limit;

        // refresh rendering
        this.stateChanged.emit();
      }
    }

    /**
     * Mark logs from the source as viewed.
     *
     * @param source - The name of the log source.
     */
    markSourceLogsViewed(source: string) {
      this._loggersWatched.set(source, true);
    }

    /**
     * Check if logs from the source are viewed.
     *
     * @param source - The name of the log source.
     *
     * @returns True if logs from source are viewer.
     */
    isSourceLogsViewed(source: string): boolean {
      return (
        !this._loggersWatched.has(source) ||
        this._loggersWatched.get(source) === true
      );
    }

    /**
     * A signal emitted when the log model changes.
     */
    public logChanged = new Signal<this, void>(this);
    /**
     * A signal emitted when the active log source changes.
     */
    public sourceChanged = new Signal<this, void>(this);
    /**
     * A signal emitted when the flash enablement changes.
     */
    public flashEnabledChanged = new Signal<this, void>(this);
    private _flashEnabled: boolean = true;
    private _loggerRegistry: ILoggerRegistry;
    private _source: string = null;
    private _entryLimit: number = DEFAULT_LOG_ENTRY_LIMIT;
    // A map storing keys as source names of the loggers watched
    // and values as whether logs from the source are viewed
    private _loggersWatched: Map<string, boolean> = new Map();
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
