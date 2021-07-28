// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISessionContext, VDomModel, VDomRenderer } from '@jupyterlab/apputils';

import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import React from 'react';
import { interactiveItem, ProgressBar } from '@jupyterlab/statusbar';
import { Cell } from '@jupyterlab/cells';
import { NotebookActions } from './actions';
import { NotebookPanel } from './panel';

/**
 * A react functional component for rendering execution indicator.
 */
function ExecutionIndicatorComponent(
  props: ExecutionIndicatorComponent.IProps
): React.ReactElement<ExecutionIndicatorComponent.IProps> {
  const translator = props.translator || nullTranslator;
  const state = props.state;
  const showProgressBar = props.displayOption.showProgressBar;
  const showElapsedTime = props.displayOption.showElapsedTime;
  const progressBarWidth = props.displayOption.progressBarWidth;
  const emptyDiv = <div></div>;

  if (!state) {
    return emptyDiv;
  }
  const time = state.totalTime;
  const scheduledCellNumber = state.scheduledCellNumber || 0;
  const remainingCellNumber = state.scheduledCell.size || 0;
  const trans = translator.load('jupyterlab');
  const executedCellNumber = scheduledCellNumber - remainingCellNumber;
  let percentage = (100 * executedCellNumber) / scheduledCellNumber;
  const progressBar = (
    <div className="jp-Notebook-ExecutionIndicator-progress-bar">
      <ProgressBar
        percentage={percentage}
        content={`${executedCellNumber} / ${scheduledCellNumber}`}
        width={progressBarWidth}
      />
    </div>
  );
  const elapsedTime = <span> {trans.__(`Total time: ${time} seconds`)} </span>;

  if (state.kernelStatus === 'busy') {
    return (
      <div className={'jp-Notebook-ExecutionIndicator'}>
        {showProgressBar ? progressBar : emptyDiv}
        {showElapsedTime ? elapsedTime : emptyDiv}
      </div>
    );
  } else {
    if (time === 0) {
      return emptyDiv;
    } else {
      return (
        <div className={'jp-Notebook-ExecutionIndicator'}>
          {showElapsedTime ? (
            <span>
              {trans.__(
                `Finished ${scheduledCellNumber} cells after ${time} seconds`
              )}
            </span>
          ) : (
            emptyDiv
          )}
        </div>
      );
    }
  }
}

/**
 * A namespace for ExecutionIndicatorComponent statics.
 */
namespace ExecutionIndicatorComponent {
  /**
   * Props for the execution status component.
   */
  export interface IProps {
    /**
     * Display option for progress bar and elapsed time.
     */
    displayOption: Private.DisplayOption;

    /**
     * Execution state of selected notebook.
     */
    state?: Private.IExecutionState;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}

/**
 * A VDomRenderer widget for displaying the execution status.
 */
export class ExecutionIndicator extends VDomRenderer<ExecutionIndicator.Model> {
  /**
   * Construct the kernel status widget.
   */
  constructor(translator?: ITranslator) {
    super(new ExecutionIndicator.Model(translator));
    this.translator = translator || nullTranslator;
    this.addClass(interactiveItem);
  }

  /**
   * Render the execution status item.
   */
  render(): JSX.Element | null {
    if (this.model === null) {
      return null;
    } else {
      const ctx = this.model.sessionContext;

      if (!ctx) {
        return (
          <ExecutionIndicatorComponent
            displayOption={this.model.displayOption}
            state={undefined}
            translator={this.translator}
          />
        );
      }
      return (
        <ExecutionIndicatorComponent
          displayOption={this.model.displayOption}
          state={this.model.executionState(ctx)}
          translator={this.translator}
        />
      );
    }
  }

  translator: ITranslator;
}

/**
 * A namespace for ExecutionIndicator statics.
 */
export namespace ExecutionIndicator {
  /**
   * A VDomModel for the execution status indicator.
   */
  export class Model extends VDomModel {
    constructor(translator?: ITranslator) {
      super();
      translator = translator || nullTranslator;
      this._showProgressBar = true;
      this._showElapsedTime = true;

      NotebookActions.executionScheduled.connect((_, data) => {
        const ctx = (data.notebook.parent as NotebookPanel).sessionContext;
        this._cellScheduledCallback(ctx, data.cell);
      });

      NotebookActions.executed.connect((_, data) => {
        const ctx = (data.notebook.parent as NotebookPanel).sessionContext;
        this._cellExecutedCallback(ctx, data.cell);
      });
    }

    /**
     * Attach a session context to model to keep track of multiple
     * notebooks. If a session context is already attached, only set current
     * activated session context to input.
     *
     * @param sessionContext - The session context to be attached to model
     */
    attachSessionContext(sessionContext: ISessionContext | undefined): void {
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

          sessionContext.kernelChanged.connect(() => {
            const state = this._notebookExecutionProgress.get(sessionContext);
            if (state) {
              this._resetTime(state);
              this.stateChanged.emit(void 0);
            }
          });
        }
      }
    }

    /**
     * The current activated session context in model.
     */
    get sessionContext(): ISessionContext | null {
      return this._currentSessionContext;
    }

    /**
     * The display options for progress bar and elapsed time.
     */
    get displayOption(): Private.DisplayOption {
      return {
        showProgressBar: this._showProgressBar,
        showElapsedTime: this._showElapsedTime,
        progressBarWidth: this._progressBarWidth
      };
    }

    /**
     * Set the display options for progress bar and elapsed time.
     *
     * @param options - Options to be used
     */
    set displayOption(options: Private.DisplayOption) {
      this._showProgressBar = options.showProgressBar;
      this._showElapsedTime = options.showElapsedTime;
      this._progressBarWidth = options.progressBarWidth;
    }

    /**
     * Get the execution state associated with a session context.
     *
     * @param ctx - The session context used to identify execution
     * state
     *
     * @return - The associated execution state.
     */
    public executionState(
      ctx: ISessionContext
    ): Private.IExecutionState | undefined {
      return this._notebookExecutionProgress.get(ctx);
    }

    /**
     * The slot connected to `NotebookActions.executed` signal, it is
     * used to keep track number of executed cell and the status
     * or kernel.
     *
     * @param  context - The session context linked with the executed code
     * cell
     * @param  cell - The executed code cell.
     *
     * ### Note
     *
     * To keep track of cells executed under 1 second,
     * the execution state is marked as `needReset` 1 second after executing
     * these cells. This `Timeout` will be cleared if there is any cell
     * scheduled after that.
     */
    private _cellExecutedCallback(context: ISessionContext, cell: Cell): void {
      const state = this._notebookExecutionProgress.get(context);
      if (state && state.scheduledCell.has(cell)) {
        state.scheduledCell.delete(cell);
        if (state.scheduledCell.size === 0) {
          state.kernelStatus = 'idle';
          clearInterval(state.interval);

          state.timeout = setTimeout(() => {
            state.needReset = true;
          }, 1000);
          this.stateChanged.emit(void 0);
        }
      }
    }

    /**
     * The slot connected to `NotebookActions.executionScheduled` signal, it is
     * used to keep track number of scheduled cell and the status
     * or kernel.
     *
     * @param  context - The session context linked with the scheduled code
     * cell
     * @param  cell - The scheduled code cell.
     */
    private _cellScheduledCallback(context: ISessionContext, cell: Cell): void {
      const state = this._notebookExecutionProgress.get(context);

      if (state && !state.scheduledCell.has(cell)) {
        if (state.needReset) {
          this._resetTime(state);
        }
        state.scheduledCell.add(cell);
        state.scheduledCellNumber += 1;
        if (state.kernelStatus !== 'busy') {
          state.kernelStatus = 'busy';
          clearTimeout(state.timeout);
          state.interval = setInterval(() => {
            this._tick(state);
          }, 1000);
        }
      }
    }

    /**
     * Increment the executed time of input execution state
     * and emit `stateChanged` signal to re-render the indicator.
     *
     * @param  data - the state to be updated.
     */
    private _tick(data: Private.IExecutionState): void {
      data.totalTime += 1;
      this.stateChanged.emit(void 0);
    }

    /**
     * Reset the input execution state.
     *
     * @param  data - the state to be rested.
     */
    private _resetTime(data: Private.IExecutionState): void {
      data.totalTime = 0;
      data.scheduledCellNumber = 0;
      data.needReset = false;
    }

    /**
     * The option to show or hide progress bar.
     */
    private _showProgressBar: boolean;

    /**
     * The option to show or hide elapsed time counter.
     */
    private _showElapsedTime: boolean;

    /**
     * The option to define width of progress bar.
     */
    private _progressBarWidth: number;

    /**
     * Session context of activated notebook.
     */
    private _currentSessionContext: ISessionContext;

    /**
     * A weak map to hold execution status of multiple notebooks.
     */
    private _notebookExecutionProgress = new WeakMap<
      ISessionContext,
      Private.IExecutionState
    >();
  }
}

/**
 * A namespace for module-private data.
 */
namespace Private {
  export interface IExecutionState {
    /**
     * Execution status of kernel, this status is deducted from the
     * number of scheduled code cells.
     */
    kernelStatus: string;

    /**
     * Total execution time.
     */
    totalTime: number;

    /**
     * Id of `setInterval`, it is used to start / stop the elapsed time
     * counter.
     */
    interval: number;

    /**
     * Id of `setTimeout`, it is used to create / clear the state
     * resetting request.
     */
    timeout: number;

    /**
     * Set of code cells scheduled for executing, `kernelStatus` is set
     *  to `idle if the length of this set is 0 and to `busy` otherwise.
     */
    scheduledCell: Set<Cell>;

    /**
     * Total number of cells requested for executing, it is used to compute
     * the execution progress in progress bar.
     */
    scheduledCellNumber: number;

    /**
     * Flag to reset the execution state when a code cell is scheduled for
     * executing.
     */
    needReset: boolean;
  }

  export type DisplayOption = {
    /**
     * The option to show or hide progress bar.
     */
    showProgressBar: boolean;

    /**
     * The option to show or hide elapsed time counter.
     */
    showElapsedTime: boolean;

    /**
     * The option to define width of progress bar.
     */
    progressBarWidth: number;
  };
}
