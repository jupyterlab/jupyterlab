// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { ISignal, Signal } from '@phosphor/signaling';

import { Logger } from './logger';

import { ILogger, ILoggerRegistry, ILoggerRegistryChange } from './tokens';

/**
 * A concrete implementation of ILoggerRegistry.
 */
export class LoggerRegistry implements ILoggerRegistry {
  /**
   * Construct a LoggerRegistry.
   *
   * @param defaultRendermime - Default rendermime to render outputs
   * with when logger is not supplied with one.
   */
  constructor(options: LoggerRegistry.IOptions) {
    this._defaultRendermime = options.defaultRendermime;
    this._maxLength = options.maxLength;
  }

  /**
   * Get the logger for the specified source.
   *
   * @param source - The name of the log source.
   *
   * @returns The logger for the specified source.
   */
  getLogger(source: string): ILogger {
    const loggers = this._loggers;
    let logger = loggers.get(source);
    if (logger) {
      return logger;
    }

    logger = new Logger({ source, maxLength: this.maxLength });
    logger.rendermime = this._defaultRendermime;
    loggers.set(source, logger);

    this._registryChanged.emit('append');

    return logger;
  }

  /**
   * Get all loggers registered.
   *
   * @returns The array containing all registered loggers.
   */
  getLoggers(): ILogger[] {
    return Array.from(this._loggers.values());
  }

  /**
   * A signal emitted when the logger registry changes.
   */
  get registryChanged(): ISignal<this, ILoggerRegistryChange> {
    return this._registryChanged;
  }

  /**
   * The max length for loggers.
   */
  get maxLength(): number {
    return this._maxLength;
  }
  set maxLength(value: number) {
    this._maxLength = value;
    this._loggers.forEach(logger => {
      logger.maxLength = value;
    });
  }

  private _defaultRendermime: IRenderMimeRegistry = null;
  private _loggers = new Map<string, Logger>();
  private _maxLength: number;
  private _registryChanged = new Signal<this, ILoggerRegistryChange>(this);
}

export namespace LoggerRegistry {
  export interface IOptions {
    defaultRendermime: IRenderMimeRegistry;
    maxLength: number;
  }
}
