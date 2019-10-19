// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILoggerRegistry,
  ILogger,
  ILoggerChange
} from '@jupyterlab/logconsole';

import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';

import React from 'react';

import { GroupItem, TextItem, interactiveItem } from '@jupyterlab/statusbar';

import { Signal } from '@phosphor/signaling';
import { DefaultIconReact } from '@jupyterlab/ui-components';

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
      <DefaultIconReact name={'list'} top={'2px'} kind={'statusBar'} />
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
    if (this.model === null || this.model.version === 0) {
      this.hide();
      return null;
    }
    this.show();
    let {
      flashEnabled,
      messages,
      source,
      version,
      versionDisplayed,
      versionNotified
    } = this.model;
    // TODO: if the console viewer is displayed initially (with version 0),
    // the very first message triggers a highlight (version is 1,
    // versionNotified is 0 in the check below). Somewhere the version
    // notified is not updated from the display of the first message before we
    // get called here. This is masked right now because of the flashEnabled
    // check.
    if (source !== null && flashEnabled && version > versionNotified) {
      this._flashHighlight();
      this.model.sourceNotified(source, version);
    } else if (source !== null && flashEnabled && version > versionDisplayed) {
      this._showHighlighted();
    } else {
      this._clearHighlight();
    }

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
    this.removeClass('jp-LogConsole-flash');
    requestAnimationFrame(() => {
      this.addClass('jp-LogConsole-flash');
    });
  }

  private _showHighlighted() {
    this.addClass('jp-mod-selected');
  }

  private _clearHighlight() {
    this.removeClass('jp-LogConsole-flash');
    this.removeClass('jp-mod-selected');
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
        this._handleLogRegistryChange,
        this
      );
      this._handleLogRegistryChange();
    }

    /**
     * Number of messages currently in the current source.
     */
    get messages(): number {
      if (this._source === null) {
        return 0;
      }
      const logger = this._loggerRegistry.getLogger(this._source);
      return logger.length;
    }

    /**
     * The number of messages ever stored by the current source.
     */
    get version(): number {
      if (this._source === null) {
        return 0;
      }
      const logger = this._loggerRegistry.getLogger(this._source);
      return logger.version;
    }

    /**
     * The name of the active log source
     */
    get source(): string | null {
      return this._source;
    }

    set source(name: string | null) {
      if (this._source === name) {
        return;
      }

      this._source = name;

      // refresh rendering
      this.stateChanged.emit();
    }

    /**
     * The last source version that was displayed.
     */
    get versionDisplayed(): number {
      if (this._source === null) {
        return 0;
      }
      return this._sourceVersion.get(this.source).lastDisplayed;
    }

    /**
     * The last source version we notified the user about.
     */
    get versionNotified(): number {
      if (this._source === null) {
        return 0;
      }
      return this._sourceVersion.get(this.source).lastNotified;
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
     * Record the last source version displayed to the user.
     *
     * @param source - The name of the log source.
     * @param version - The version of the log that was displayed.
     *
     * #### Notes
     * This will also update the last notified version so that the last
     * notified version is always at least the last displayed version.
     */
    sourceDisplayed(source: string | null, version: number) {
      if (source === null) {
        return;
      }
      const versions = this._sourceVersion.get(source);
      let change = false;
      if (versions.lastDisplayed < version) {
        versions.lastDisplayed = version;
        change = true;
      }
      if (versions.lastNotified < version) {
        versions.lastNotified = version;
        change = true;
      }
      if (change && source === this._source) {
        this.stateChanged.emit();
      }
    }

    /**
     * Record a source version we notified the user about.
     *
     * @param source - The name of the log source.
     * @param version - The version of the log.
     */
    sourceNotified(source: string | null, version: number) {
      if (source === null) {
        return;
      }
      const versions = this._sourceVersion.get(source);
      if (versions.lastNotified < version) {
        versions.lastNotified = version;
        if (source === this._source) {
          this.stateChanged.emit();
        }
      }
    }

    private _handleLogRegistryChange() {
      const loggers = this._loggerRegistry.getLoggers();
      for (let logger of loggers) {
        if (!this._sourceVersion.has(logger.source)) {
          logger.logChanged.connect(this._handleLogChange, this);
          this._sourceVersion.set(logger.source, {
            lastDisplayed: 0,
            lastNotified: 0
          });
        }
      }
    }

    private _handleLogChange({ source }: ILogger, change: ILoggerChange) {
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
     * Keys are source names, value is a list of two numbers. The first
     * represents the version of the messages that was last displayed to the
     * user, the second represents the version that we last notified the user
     * about.
     */
    private _sourceVersion: Map<string, IVersionInfo> = new Map();
  }

  interface IVersionInfo {
    lastDisplayed: number;
    lastNotified: number;
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
