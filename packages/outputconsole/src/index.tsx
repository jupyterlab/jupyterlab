/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { StackedPanel } from '@phosphor/widgets';

import { Token } from '@phosphor/coreutils';

import { ISignal, Signal } from '@phosphor/signaling';

import { nbformat } from '@jupyterlab/coreutils';

import {
  OutputArea,
  OutputAreaModel,
  SimplifiedOutputArea
} from '@jupyterlab/outputarea';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { Message } from '@phosphor/messaging';

/* tslint:disable */
/**
 * The Output Logger token.
 */
export const IOutputLogRegistry = new Token<IOutputLogRegistry>(
  '@jupyterlab/outputconsole:IOutputLogRegistry'
);

export interface IOutputLogRegistry {
  getLogger(name: string): ILogger;
  getLoggers(): ILogger[];

  /**
   * A signal emitted when the log registry changes.
   */
  readonly registryChanged: ISignal<this, ILogRegistryChange>;
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

export type ILogRegistryChange = 'append' | 'remove';
export type ILoggerChange = 'append' | 'clear';

export class OutputLogRegistry implements IOutputLogRegistry {
  getLogger(name: string): ILogger {
    const loggers = this._loggers;
    let logger = loggers.get(name);
    if (logger) {
      return logger;
    }

    logger = new Logger(name);
    loggers.set(name, logger);

    this._registryChanged.emit('append');

    return logger;
  }

  getLoggers(): ILogger[] {
    return Array.from(this._loggers.values());
  }

  /**
   * A signal emitted when the log registry changes.
   */
  get registryChanged(): ISignal<this, ILogRegistryChange> {
    return this._registryChanged;
  }

  private _loggers = new Map<string, Logger>();
  private _registryChanged = new Signal<this, ILogRegistryChange>(this);
}

/**
 * A List View widget that shows Output Console logs.
 */
export class OutputLoggerView extends StackedPanel {
  /**
   * Construct an OutputConsoleView instance.
   */
  constructor(outputLogRegistry: IOutputLogRegistry) {
    super();

    this._outputLogRegistry = outputLogRegistry;
    this.node.style.overflowY = 'auto'; // TODO: use CSS class

    outputLogRegistry.registryChanged.connect(
      (sender: IOutputLogRegistry, args: ILogRegistryChange) => {
        const loggers = this._outputLogRegistry.getLoggers();
        for (let logger of loggers) {
          logger.logChanged.connect((sender: ILogger, args: ILoggerChange) => {
            this._updateOutputViews();
          });
        }
      }
    );
  }

  protected onAfterAttach(msg: Message): void {
    this._updateOutputViews();
  }

  get outputLogRegistry(): IOutputLogRegistry {
    return this._outputLogRegistry;
  }

  public showOutputFromSource(source: string) {
    const viewId = `source:${source}`;

    this._outputViews.forEach(
      (outputView: SimplifiedOutputArea, name: string) => {
        if (outputView.id === viewId) {
          outputView.show();
        } else {
          outputView.hide();
        }
      }
    );

    const title = `Log: ${source}`;
    this.title.label = title;
    this.title.caption = title;
  }

  private _updateOutputViews() {
    const loggerIds = new Set<string>();
    const loggers = this._outputLogRegistry.getLoggers();

    for (let logger of loggers) {
      const viewId = `source:${logger.source}`;
      loggerIds.add(viewId);

      // add view for logger if not exist
      // TODO: or rendermime changed
      if (!this._outputViews.has(viewId)) {
        const outputView = new SimplifiedOutputArea({
          rendermime: logger.rendermime,
          contentFactory: OutputArea.defaultContentFactory,
          model: logger.outputAreaModel
        });
        outputView.id = viewId;

        logger.logChanged.connect((sender: ILogger, args: ILoggerChange) => {
          outputView.node.scrollTo({
            left: 0,
            top: outputView.node.scrollHeight,
            behavior: 'smooth'
          });
        });

        this.addWidget(outputView);
        this._outputViews.set(viewId, outputView);
      }
    }

    // remove views that do not have corresponding loggers anymore
    const viewIds = this._outputViews.keys();

    for (let viewId of viewIds) {
      if (!loggerIds.has(viewId)) {
        const outputView = this._outputViews.get(viewId);
        outputView.dispose();
        this._outputViews.delete(viewId);
      }
    }
  }

  private _outputLogRegistry: IOutputLogRegistry;
  private _outputViews = new Map<string, SimplifiedOutputArea>();
}
