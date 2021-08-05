// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISessionContext, VDomModel, VDomRenderer } from '@jupyterlab/apputils';

import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import React from 'react';
import {
  interactiveItem,
  //ProgressBar,
  ProgressCircle
} from '@jupyterlab/statusbar';
import { Cell } from '@jupyterlab/cells';
import { NotebookActions } from './actions';

import { Notebook } from './widget';
import { KernelMessage } from '@jupyterlab/services';

/**
 * A react functional component for rendering execution indicator.
 */
function ExecutionIndicatorComponent(
  props: ExecutionIndicatorComponent.IProps
): React.ReactElement<ExecutionIndicatorComponent.IProps> {
  const translator = props.translator || nullTranslator;
  const state = props.state;
  const showProgressBar = props.displayOption.showProgressBar;
  const showOnToolBar = props.displayOption.showOnToolBar;
  const tooltipClass = showOnToolBar ? 'down' : 'up';
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
  // const progressBar = (
  //   <div className="jp-Notebook-ExecutionIndicator-progress-bar">
  //     <ProgressBar
  //       percentage={percentage}
  //       content={`${executedCellNumber} / ${scheduledCellNumber}`}
  //       width={progressBarWidth}
  //     />
  //   </div>
  // );

  const progressBar = (
    <ProgressCircle progress={percentage} width={16} height={24} />
  );
  if (state.kernelStatus === 'busy') {
    return (
      <div className={'jp-Notebook-ExecutionIndicator'}>
        {showProgressBar ? progressBar : emptyDiv}
        <div
          className={`jp-Notebook-ExecutionIndicator-tooltip ${tooltipClass}`}
        >
          <span>
            {trans.__(
              `Executed ${executedCellNumber}/${scheduledCellNumber} cells`
            )}
          </span>
          <span> {trans.__(`Total time: ${time} seconds`)} </span>
        </div>
      </div>
    );
  } else {
    if (time === 0) {
      return emptyDiv;
    } else {
      return (
        <div className={'jp-Notebook-ExecutionIndicator'}>
          <ProgressCircle progress={100} width={16} height={24} />
          <div
            className={`jp-Notebook-ExecutionIndicator-tooltip ${tooltipClass}`}
          >
            <span> {trans.__(`Executed ${scheduledCellNumber} cells`)} </span>
            <span> {trans.__(`Total time: ${time} seconds`)} </span>
          </div>
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
      const nb = this.model.currentNotebook;

      if (!nb) {
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
          state={this.model.executionState(nb)}
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
        this._cellScheduledCallback(data.notebook, data.cell);
      });

      NotebookActions.executed.connect((_, data) => {
        this._cellExecutedCallback(data.notebook, data.cell);
      });
    }

    /**
     * Attach a notebook with session context to model in order to keep
     * track of multiple notebooks. If a session context is already
     * attached, only set current activated notebook to input.
     *
     * @param data - The  notebook and session context to be attached to model
     */
    attachNotebook(
      data: { content?: Notebook; context?: ISessionContext } | null
    ): void {
      if (data && data.content && data.context) {
        const nb = data.content;
        const context = data.context;
        this._currentNotebook = nb;
        if (!this._notebookExecutionProgress.has(nb)) {
          this._notebookExecutionProgress.set(nb, {
            kernelStatus: 'idle',
            totalTime: 0,
            interval: 0,
            timeout: 0,
            scheduledCell: new Set<Cell | string>(),
            scheduledCellNumber: 0,
            needReset: true
          });

          context.kernelChanged.connect((_, kernelData) => {
            const state = this._notebookExecutionProgress.get(nb);
            if (state) {
              this._resetTime(state);
              this.stateChanged.emit(void 0);
              if (kernelData.newValue) {
                kernelData.newValue.anyMessage.connect((sender, msg) => {
                  const message = msg.msg;
                  const msgId = message.header.msg_id;
                  if (
                    KernelMessage.isCommMsgMsg(message) &&
                    message.content.data['method']
                  ) {
                    const method = message.content.data['method'];
                    if (method !== 'request_state' && method !== 'update') {
                      this._cellScheduledCallback(nb, msgId);
                    }
                  } else if (
                    KernelMessage.isStatusMsg(message) &&
                    message.content.execution_state === 'idle'
                  ) {
                    const parentId = (message.parent_header as KernelMessage.IHeader)
                      .msg_id;
                    this._cellExecutedCallback(nb, parentId);
                  }
                });
              }
            }
          });
        }
      }
    }

    /**
     * The current activated notebook in model.
     */
    get currentNotebook(): Notebook | null {
      return this._currentNotebook;
    }

    /**
     * The display options for progress bar and elapsed time.
     */
    get displayOption(): Private.DisplayOption {
      return {
        showOnToolBar: this._showOnToolBar,
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
      this._showOnToolBar = options.showOnToolBar;
      this._showProgressBar = options.showProgressBar;
      this._showElapsedTime = options.showElapsedTime;
      this._progressBarWidth = options.progressBarWidth;
    }

    /**
     * Get the execution state associated with a notebook.
     *
     * @param nb - The notebook used to identify execution
     * state.
     *
     * @return - The associated execution state.
     */
    public executionState(nb: Notebook): Private.IExecutionState | undefined {
      return this._notebookExecutionProgress.get(nb);
    }

    /**
     * The slot connected to `NotebookActions.executed` signal, it is
     * used to keep track number of executed cell or Comm custom message and the status
     * of kernel.
     *
     * @param  nb - The notebook which contains the executed code
     * cell.
     * @param  cell - The executed code cell or id of comm message.
     *
     * ### Note
     *
     * To keep track of cells executed under 1 second,
     * the execution state is marked as `needReset` 1 second after executing
     * these cells. This `Timeout` will be cleared if there is any cell
     * scheduled after that.
     */
    private _cellExecutedCallback(nb: Notebook, cell: Cell | string): void {
      const state = this._notebookExecutionProgress.get(nb);
      if (state && state.scheduledCell.has(cell)) {

        state.scheduledCell.delete(cell);
        if (state.scheduledCell.size === 0) {
          state.kernelStatus = 'idle';
          clearInterval(state.interval);
          state.timeout = window.setTimeout(() => {
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
     * @param  nb - The notebook which contains the scheduled code or id of comm message.
     * cell
     * @param  cell - The scheduled code cell.
     */
    private _cellScheduledCallback(nb: Notebook, cell: Cell | string): void {
      const state = this._notebookExecutionProgress.get(nb);

      if (state && !state.scheduledCell.has(cell)) {

        if (state.needReset) {
          this._resetTime(state);
        }
        state.scheduledCell.add(cell);
        state.scheduledCellNumber += 1;
        if (state.kernelStatus !== 'busy') {
          state.kernelStatus = 'busy';
          clearTimeout(state.timeout);
          this._tick(state);
          state.interval = window.setInterval(() => {
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

    private _showOnToolBar: boolean;

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
     * Current activated notebook.
     */
    private _currentNotebook: Notebook;

    /**
     * A weak map to hold execution status of multiple notebooks.
     */
    private _notebookExecutionProgress = new WeakMap<
      Notebook,
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
    scheduledCell: Set<Cell | string>;

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
    showOnToolBar: boolean;
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
