// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISessionContext, VDomModel, VDomRenderer } from '@jupyterlab/apputils';

import {
  ITranslator,
  nullTranslator
  //TranslationBundle
} from '@jupyterlab/translation';
import React from 'react';
import { interactiveItem } from '@jupyterlab/statusbar';
import { Cell } from '@jupyterlab/cells';
import { NotebookActions } from './actions';
import { NotebookPanel } from './panel';

/**
 * A react functional component for rendering execution time.
 */
function ExecutionTimeComponent(
  props: ExecutionTimeComponent.IProps
): React.ReactElement<ExecutionTimeComponent.IProps> {
  const translator = props.translator || nullTranslator;
  const state = props.state;
  const emptyDiv =  <div className={'jp-Notebook-ExecutionTime'}></div>
  if (!state) {
    return emptyDiv;
  }
  const time = state.totalTime;
  const scheduledCellNumber = state.scheduledCellNumber || 0;
  const remainingCellNumber = state.scheduledCell.size || 0;
  const trans = translator.load('jupyterlab');
  const executedCellNumber = scheduledCellNumber - remainingCellNumber;
  let percentage = (100 * executedCellNumber) / scheduledCellNumber;
  if (state.kernelStatus === 'busy') {
    return (
      <div className={'jp-Notebook-ExecutionTime'}>
        <div className="jp-Notebook-ExecutionTime-progress-bar">
          <div style={{ width: `${percentage}%` }}>
            <p>
              {executedCellNumber} / {scheduledCellNumber}
            </p>
          </div>
        </div>
        <span> {trans.__(`Total time: ${time} seconds`)} </span>
      </div>
    );
  } else {
    if (time === 0) {
      return emptyDiv;
    } else {
      percentage = 100;
      return (
        <div className={'jp-Notebook-ExecutionTime'}>
          <div className="jp-Notebook-ExecutionTime-progress-bar">
            <div style={{ width: `${percentage}%` }}>
              <p>
                {scheduledCellNumber} / {scheduledCellNumber}
              </p>
            </div>
          </div>
          <span> {trans.__(`Total time: ${time} seconds`)} </span>
        </div>
      );
    }
  }
}

/**
 * A namespace for ExecutionTimeComponent statics.
 */
namespace ExecutionTimeComponent {
  /**
   * Props for the kernel status component.
   */
  export interface IProps {
    /**
     * The application language translator.
     */
    translator?: ITranslator;

    state?: Private.ExecutionState;
  }
}

/**
 * A VDomRenderer widget for displaying the status of a kernel.
 */
export class ExecutionTime extends VDomRenderer<ExecutionTime.Model> {
  /**
   * Construct the kernel status widget.
   */
  constructor(opts: ExecutionTime.IOptions, translator?: ITranslator) {
    super(new ExecutionTime.Model(translator));
    this.translator = translator || nullTranslator;
    this.addClass(interactiveItem);
  }

  /**
   * Render the kernel status item.
   */
  render(): JSX.Element | null {
    if (this.model === null) {
      return null;
    } else {
      const ctx = this.model.sessionContext;

      if (!ctx) {
        return (
          <ExecutionTimeComponent
            translator={this.translator}
            state={undefined}
          />
        );
      }
      return (
        <ExecutionTimeComponent
          translator={this.translator}
          state={this.model.executionState(ctx)}
        />
      );
    }
  }

  translator: ITranslator;
}

/**
 * A namespace for ExecutionTime statics.
 */
export namespace ExecutionTime {
  /**
   * A VDomModel for the kernel status indicator.
   */
  export class Model extends VDomModel {
    constructor(translator?: ITranslator) {
      super();
      translator = translator || nullTranslator;
      //   this._trans = translator.load('jupyterlab');
      this._tick = this._tick.bind(this);
      this._resetTime = this._resetTime.bind(this);
    }

    attachSessionContext(sessionContext: ISessionContext | null): void {
      if (sessionContext) {
        this._currentSessionContext = sessionContext;
        if (!this._notebookExecutionProgress.has(sessionContext)) {
          this._notebookExecutionProgress.set(sessionContext, {
            kernelStatus: 'idle',
            totalTime: 0,
            interval: 0,
            timeout: 0,
            scheduledCell: new Set<Cell>(),
            scheduledCellNumber: 0,
            needReset: true
          });
          NotebookActions.executionScheduled.connect((_, data) => {
            const ctx = (data.notebook.parent as NotebookPanel).sessionContext;
            this._cellScheduledCallback(ctx, data.cell);
          });

          NotebookActions.executed.connect((_, data) => {
            const ctx = (data.notebook.parent as NotebookPanel).sessionContext;
            this._cellExecutedCallback(ctx, data.cell);
          });
        }
      }
    }

    get sessionContext(): ISessionContext | null {
      return this._currentSessionContext;
    }

    public executionState(
      ctx: ISessionContext
    ): Private.ExecutionState | undefined {
      return this._notebookExecutionProgress.get(ctx);
    }

    private _cellExecutedCallback = (
      context: ISessionContext,
      cell: Cell
    ): void => {
      const state = this._notebookExecutionProgress.get(context);
      if (state && state.scheduledCell.has(cell)) {
        state.scheduledCell.delete(cell);
        if (state.scheduledCell.size === 0) {
          state.kernelStatus = 'idle';
          clearInterval(state.interval);

          state.timeout = setTimeout(() => {
            state.needReset = true;
          }, 1000);
          console.log(
            'return to idle',
            state.totalTime,
            state.scheduledCellNumber,
            state.timeout,
            context
          );
          this.stateChanged.emit(void 0);
        }
      }
    };

    private _cellScheduledCallback = (
      context: ISessionContext,
      cell: Cell
    ): void => {
      const state = this._notebookExecutionProgress.get(context);

      if (state && !state.scheduledCell.has(cell)) {
        if (state.needReset) {
          this._resetTime(state);
        }
        console.log(
          'set busy',
          state?.totalTime,
          state?.scheduledCellNumber,
          state.kernelStatus
        );
        state.scheduledCell.add(cell);
        state.scheduledCellNumber += 1;
        if (state.kernelStatus !== 'busy') {
          console.log('remove timeout', state.timeout);

          state.kernelStatus = 'busy';
          clearTimeout(state.timeout);
          state.interval = setInterval(() => {
            this._tick(state);
          }, 1000);
        }
      }
    };

    private _tick(data: Private.ExecutionState): void {
      data.totalTime += 1;
      this.stateChanged.emit(void 0);
    }

    private _resetTime(data: Private.ExecutionState): void {
      data.totalTime = 0;
      data.scheduledCellNumber = 0;
      data.needReset = false;
      console.log('reset after idle');
    }

    // private _trans: TranslationBundle;
    private _currentSessionContext: ISessionContext;
    private _notebookExecutionProgress = new WeakMap<
      ISessionContext,
      Private.ExecutionState
    >();
  }

  /**
   * Options for creating a ExecutionTime object.
   */
  export interface IOptions {}
}

namespace Private {
  export type ExecutionState = {
    kernelStatus: string;
    totalTime: number;
    interval: number;
    timeout: number;
    scheduledCell: Set<Cell>;
    scheduledCellNumber: number;
    needReset: boolean;
  };
}
