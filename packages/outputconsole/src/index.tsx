/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Panel } from '@phosphor/widgets';

import { Token } from '@phosphor/coreutils';

import { ISignal, Signal } from '@phosphor/signaling';

import { nbformat } from '@jupyterlab/coreutils';

import {
  OutputArea,
  OutputAreaModel,
  SimplifiedOutputArea
} from '@jupyterlab/outputarea';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

/* tslint:disable */
/**
 * The Output Logger token.
 */
export const IOutputLogRegistry = new Token<IOutputLogRegistry>(
  '@jupyterlab/outputconsole:IOutputLogRegistry'
);

export interface IOutputLogRegistry {
  getLogger(name: string): ILogger;
}

export interface ILogger {
  log(output: nbformat.IOutput): void;
  clear(): void;
  readonly length: number;
  rendermime: IRenderMimeRegistry;
  /**
   * A signal emitted when the log changes.
   */
  readonly logChanged: ISignal<this, ILoggerChange>;
  readonly source: string;
  readonly outputAreaModel: OutputAreaModel;
}

export class Logger implements ILogger {
  constructor(source: string) {
    this.source = source;
  }

  get length(): number {
    return this._count;
  }

  /**
   * A signal emitted when the log model changes.
   */
  get logChanged(): ISignal<this, ILoggerChange> {
    return this._logChanged;
  }

  log(output: nbformat.IOutput) {
    this.outputAreaModel.add(output);
    this._count++;
    this._logChanged.emit('append');
  }

  clear() {
    this.outputAreaModel.clear(false);
    this._count = 0;
    this._logChanged.emit('clear');
  }

  private _count = 0;
  private _logChanged = new Signal<this, ILoggerChange>(this);
  readonly source: string;
  readonly outputAreaModel = new OutputAreaModel();
  rendermime: IRenderMimeRegistry | null = null;
}

export type ILoggerChange = 'append' | 'clear';

export class OutputLogRegistry implements IOutputLogRegistry {
  getLogger(name: string): ILogger {
    const logs = this._logs;
    if (logs.has(name)) {
      return logs.get(name);
    }
    const logger = new Logger(name);
    logs.set(name, logger);
    return logger;
  }

  _logs = new Map<string, Logger>();
}

/**
 * A List View widget that shows Output Console logs.
 */
export class OutputLoggerView extends Panel {
  /**
   * Construct an OutputConsoleView instance.
   */
  constructor(logger: ILogger) {
    if (logger.rendermime === null) {
      throw new Error(
        `Attempted to display log for ${logger.source}, but it is missing a rendermime.`
      );
    }
    super();

    this.title.closable = true;
    this.title.label = 'Output Console';
    this.title.iconClass = 'fa fa-list lab-output-console-icon';

    this._logger = logger;
    this.node.style.overflowY = 'auto'; // TODO: use CSS class

    this._outputView = new SimplifiedOutputArea({
      rendermime: this._logger.rendermime,
      contentFactory: OutputArea.defaultContentFactory,
      model: logger.outputAreaModel
    });

    this.addWidget(this._outputView);
  }

  get logger(): ILogger {
    return this._logger;
  }

  private _logger: ILogger;
  private _outputView: OutputArea;
}
