// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IChangedArgs } from '@jupyterlab/coreutils';
import * as nbformat from '@jupyterlab/nbformat';
import { IOutputAreaModel } from '@jupyterlab/outputarea';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { Token } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { ISignal } from '@lumino/signaling';

/**
 * The Logger Registry token.
 */
export const ILoggerRegistry = new Token<ILoggerRegistry>(
  '@jupyterlab/logconsole:ILoggerRegistry',
  'A service providing a logger infrastructure.'
);

export type ILoggerRegistryChange = 'append';

/**
 * A Logger Registry that registers and provides loggers by source.
 */
export interface ILoggerRegistry extends IDisposable {
  /**
   * Get the logger for the specified source.
   *
   * @param source - The name of the log source.
   *
   * @returns The logger for the specified source.
   */
  getLogger(source: string): ILogger;
  /**
   * Get all loggers registered.
   *
   * @returns The array containing all registered loggers.
   */
  getLoggers(): ILogger[];

  /**
   * A signal emitted when the logger registry changes.
   */
  readonly registryChanged: ISignal<this, ILoggerRegistryChange>;
}

/**
 * Log severity level
 */
export type LogLevel = 'critical' | 'error' | 'warning' | 'info' | 'debug';

/**
 * The base log payload type.
 */
export interface ILogPayloadBase {
  /**
   * Type of log data.
   */
  type: string;

  /**
   * Log level
   */
  level: LogLevel;

  /**
   * Data
   */
  data: any;
}

/**
 * Plain text log payload.
 */
export interface ITextLog extends ILogPayloadBase {
  /**
   * Type of log data.
   */
  type: 'text';
  /**
   * Log data as plain text.
   */
  data: string;
}

/**
 * HTML log payload.
 */
export interface IHtmlLog extends ILogPayloadBase {
  /**
   * Type of log data.
   */
  type: 'html';
  /**
   * Log data as HTML string.
   */
  data: string;
}

/**
 * Notebook kernel output log payload.
 */
export interface IOutputLog extends ILogPayloadBase {
  /**
   * Type of log data.
   */
  type: 'output';
  /**
   * Log data as Notebook kernel output.
   */
  data: nbformat.IOutput;
}

/**
 * Log payload union type.
 */
export type ILogPayload = ITextLog | IHtmlLog | IOutputLog;

export type IContentChange = 'append' | 'clear';

export type IStateChange =
  | IChangedArgs<
      IRenderMimeRegistry | null,
      IRenderMimeRegistry | null,
      'rendermime'
    >
  | IChangedArgs<LogLevel, LogLevel, 'level'>;

export interface ILoggerOutputAreaModel extends IOutputAreaModel {
  /**
   * The maximum number of outputs to store.
   */
  maxLength: number;
}

/**
 * A Logger that manages logs from a particular source.
 */
export interface ILogger extends IDisposable {
  /**
   * Number of outputs logged.
   */
  readonly length: number;
  /**
   * Max number of messages.
   */
  maxLength: number;
  /**
   * Log level.
   */
  level: LogLevel;
  /**
   * Rendermime to use when rendering outputs logged.
   */
  rendermime: IRenderMimeRegistry | null;
  /**
   * A signal emitted when the log model changes.
   */
  readonly contentChanged: ISignal<this, IContentChange>;
  /**
   * A signal emitted when the rendermime changes.
   */
  readonly stateChanged: ISignal<this, IStateChange>;
  /**
   * The name of the log source.
   */
  readonly source: string;
  /**
   * Output Area Model used to manage log storage in memory.
   */
  readonly outputAreaModel: ILoggerOutputAreaModel;
  /**
   * The cumulative number of messages the log has stored.
   */
  readonly version: number;
  /**
   * Log an output to logger.
   *
   * @param log - The output to be logged.
   */
  log(log: ILogPayload): void;
  /**
   * Add a checkpoint in the log.
   */
  checkpoint(): void;
  /**
   * Clear all outputs logged.
   */
  clear(): void;
}
