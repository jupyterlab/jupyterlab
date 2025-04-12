// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISessionContext, translateKernelStatuses } from '@jupyterlab/apputils';

import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import React from 'react';
import { ProgressCircle } from '@jupyterlab/statusbar';

import {
  circleIcon,
  LabIcon,
  offlineBoltIcon,
  VDomModel,
  VDomRenderer
} from '@jupyterlab/ui-components';

import { Notebook } from './widget';
import { KernelMessage } from '@jupyterlab/services';
import { Kernel } from '@jupyterlab/services';
import { NotebookPanel } from './panel';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { Widget } from '@lumino/widgets';
import { JSONObject } from '@lumino/coreutils';
import { IChangedArgs } from '@jupyterlab/coreutils';

/**
 * A react functional component for rendering execution indicator.
 */
export function ExecutionIndicatorComponent(
  props: ExecutionIndicatorComponent.IProps
): JSX.Element {
  const translator = props.translator || nullTranslator;
  const kernelStatuses = translateKernelStatuses(translator);
  const trans = translator.load('jupyterlab');

  const state = props.state;
  const showOnToolBar = props.displayOption.showOnToolBar;
  const showProgress = props.displayOption.showProgress;
  const tooltipClass = showOnToolBar ? 'down' : 'up';
  const emptyDiv = <div></div>;

  if (!state) {
    return emptyDiv;
  }

  const kernelStatus = state.kernelStatus;
  const circleIconProps: LabIcon.IProps = {
    alignSelf: 'normal',
    height: '24px'
  };
  const time = state.totalTime;

  const scheduledCellNumber = state.scheduledCellNumber || 0;
  const remainingCellNumber = state.scheduledCell.size || 0;
  const executedCellNumber = scheduledCellNumber - remainingCellNumber;
  let percentage = (100 * executedCellNumber) / scheduledCellNumber;
  let displayClass = showProgress ? '' : 'hidden';
  if (!showProgress && percentage < 100) {
    percentage = 0;
  }

  const progressBar = (percentage: number) => (
    <ProgressCircle
      progress={percentage}
      width={16}
      height={24}
      label={trans.__('Kernel status')}
    />
  );
  const titleFactory = (translatedStatus: string) =>
    trans.__('Kernel status: %1', translatedStatus);

  const reactElement = (
    status: ISessionContext.KernelDisplayStatus,
    circle: JSX.Element,
    popup: JSX.Element[]
  ): JSX.Element => (
    <div
      className={'jp-Notebook-ExecutionIndicator'}
      title={showProgress ? '' : titleFactory(kernelStatuses[status])}
      data-status={status}
    >
      {circle}
      <div
        className={`jp-Notebook-ExecutionIndicator-tooltip ${tooltipClass} ${displayClass}`}
      >
        <span> {titleFactory(kernelStatuses[status])} </span>
        {popup}
      </div>
    </div>
  );

  if (
    state.kernelStatus === 'connecting' ||
    state.kernelStatus === 'disconnected' ||
    state.kernelStatus === 'unknown'
  ) {
    return reactElement(
      kernelStatus,
      <offlineBoltIcon.react {...circleIconProps} />,
      []
    );
  }
  if (
    state.kernelStatus === 'starting' ||
    state.kernelStatus === 'terminating' ||
    state.kernelStatus === 'restarting' ||
    state.kernelStatus === 'initializing'
  ) {
    return reactElement(
      kernelStatus,
      <circleIcon.react {...circleIconProps} />,
      []
    );
  }

  if (state.executionStatus === 'busy') {
    return reactElement('busy', progressBar(percentage), [
      <span key={0}>
        {trans.__(
          `Executed ${executedCellNumber}/${scheduledCellNumber} cells`
        )}
      </span>,
      <span key={1}>
        {trans._n('Elapsed time: %1 second', 'Elapsed time: %1 seconds', time)}
      </span>
    ]);
  } else {
    // No cell is scheduled, fall back to the status of kernel
    const progress = state.kernelStatus === 'busy' ? 0 : 100;
    const popup =
      state.kernelStatus === 'busy' || time === 0
        ? []
        : [
            <span key={0}>
              {trans._n(
                'Executed %1 cell',
                'Executed %1 cells',
                scheduledCellNumber
              )}
            </span>,
            <span key={1}>
              {trans._n(
                'Elapsed time: %1 second',
                'Elapsed time: %1 seconds',
                time
              )}
            </span>
          ];

    return reactElement(state.kernelStatus, progressBar(progress), popup);
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
    state?: ExecutionIndicator.IExecutionState;

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
  constructor(translator?: ITranslator, showProgress: boolean = true) {
    super(new ExecutionIndicator.Model());
    this.translator = translator || nullTranslator;
    this.addClass('jp-mod-highlighted');
  }

  /**
   * Render the execution status item.
   */
  render(): JSX.Element | null {
    if (this.model === null || !this.model.renderFlag) {
      return <div></div>;
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

  private translator: ITranslator;
}

/**
 * A namespace for ExecutionIndicator statics.
 */
export namespace ExecutionIndicator {
  /**
   * Execution state of a notebook.
   */
  export interface IExecutionState {
    /**
     * Execution status of kernel, this status is deducted from the
     * number of scheduled code cells.
     */
    executionStatus: string;

    /**
     * Current status of kernel.
     */
    kernelStatus: ISessionContext.KernelDisplayStatus;

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
     * Set of messages scheduled for executing, `executionStatus` is set
     *  to `idle if the length of this set is 0 and to `busy` otherwise.
     */
    scheduledCell: Set<string>;

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

  /**
   * A VDomModel for the execution status indicator.
   */
  export class Model extends VDomModel {
    constructor() {
      super();
      this._displayOption = { showOnToolBar: true, showProgress: true };
      this._renderFlag = true;
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
            executionStatus: 'idle',
            kernelStatus: 'idle',
            totalTime: 0,
            interval: 0,
            timeout: 0,
            scheduledCell: new Set<string>(),
            scheduledCellNumber: 0,
            needReset: true
          });

          const state = this._notebookExecutionProgress.get(nb);
          const contextStatusChanged = (ctx: ISessionContext) => {
            if (state) {
              state.kernelStatus = ctx.kernelDisplayStatus;
            }
            this.stateChanged.emit(void 0);
          };
          context.statusChanged.connect(contextStatusChanged, this);

          const contextConnectionStatusChanged = (ctx: ISessionContext) => {
            if (state) {
              state.kernelStatus = ctx.kernelDisplayStatus;
            }
            this.stateChanged.emit(void 0);
          };
          context.connectionStatusChanged.connect(
            contextConnectionStatusChanged,
            this
          );

          context.disposed.connect(ctx => {
            ctx.connectionStatusChanged.disconnect(
              contextConnectionStatusChanged,
              this
            );
            ctx.statusChanged.disconnect(contextStatusChanged, this);
          });
          const handleKernelMsg = (
            sender: Kernel.IKernelConnection,
            msg: Kernel.IAnyMessageArgs
          ) => {
            const message = msg.msg;
            const msgId = message.header.msg_id;

            if (message.header.msg_type === 'execute_request') {
              // A cell code is scheduled for executing
              this._cellScheduledCallback(nb, msgId);
            } else if (
              KernelMessage.isStatusMsg(message) &&
              message.content.execution_state === 'idle'
            ) {
              // Idle status message case.
              const parentId = (message.parent_header as KernelMessage.IHeader)
                .msg_id;
              this._cellExecutedCallback(nb, parentId);
            } else if (
              KernelMessage.isStatusMsg(message) &&
              message.content.execution_state === 'restarting'
            ) {
              this._restartHandler(nb);
            } else if (message.header.msg_type === 'execute_input') {
              // A cell code starts executing.
              this._startTimer(nb);
            }
          };
          context.session?.kernel?.anyMessage.connect(handleKernelMsg);
          context.session?.kernel?.disposed.connect(kernel =>
            kernel.anyMessage.disconnect(handleKernelMsg)
          );
          const kernelChangedSlot = (
            _: ISessionContext,
            kernelData: IChangedArgs<
              Kernel.IKernelConnection | null,
              Kernel.IKernelConnection | null,
              'kernel'
            >
          ) => {
            if (state) {
              this._resetTime(state);
              this.stateChanged.emit(void 0);
              if (kernelData.newValue) {
                kernelData.newValue.anyMessage.connect(handleKernelMsg);
              }
            }
          };
          context.kernelChanged.connect(kernelChangedSlot);
          context.disposed.connect(ctx =>
            ctx.kernelChanged.disconnect(kernelChangedSlot)
          );
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
      return this._displayOption;
    }

    /**
     * Set the display options for progress bar and elapsed time.
     *
     * @param options - Options to be used
     */
    set displayOption(options: Private.DisplayOption) {
      this._displayOption = options;
    }

    /**
     * Get the execution state associated with a notebook.
     *
     * @param nb - The notebook used to identify execution
     * state.
     *
     * @returns - The associated execution state.
     */
    executionState(nb: Notebook): IExecutionState | undefined {
      return this._notebookExecutionProgress.get(nb);
    }

    /**
     * Schedule switch to idle status and clearing of the timer.
     *
     * ### Note
     *
     * To keep track of cells executed under 1 second,
     * the execution state is marked as `needReset` 1 second after executing
     * these cells. This `Timeout` will be cleared if there is any cell
     * scheduled after that.
     */
    private _scheduleSwitchToIdle(state: IExecutionState) {
      window.setTimeout(() => {
        state.executionStatus = 'idle';
        clearInterval(state.interval);
        this.stateChanged.emit(void 0);
      }, 150);
      state.timeout = window.setTimeout(() => {
        state.needReset = true;
      }, 1000);
    }

    /**
     * The function is called on kernel's idle status message.
     * It is used to keep track of number of executed
     * cells or Comm custom messages and the status of kernel.
     *
     * @param nb - The notebook which contains the executed code cell.
     * @param msg_id - The id of message.
     */
    private _cellExecutedCallback(nb: Notebook, msg_id: string): void {
      const state = this._notebookExecutionProgress.get(nb);
      if (state && state.scheduledCell.has(msg_id)) {
        state.scheduledCell.delete(msg_id);
        if (state.scheduledCell.size === 0) {
          this._scheduleSwitchToIdle(state);
        }
      }
    }

    /**
     * The function is called on kernel's restarting status message.
     * It is used to clear the state tracking the number of executed
     * cells.
     *
     * @param nb - The notebook which contains the executed code cell.
     */
    private _restartHandler(nb: Notebook): void {
      const state = this._notebookExecutionProgress.get(nb);
      if (state) {
        state.scheduledCell.clear();
        this._scheduleSwitchToIdle(state);
      }
    }

    /**
     * This function is called on kernel's `execute_input` message to start
     * the elapsed time counter.
     *
     * @param  nb - The notebook which contains the scheduled execution request.
     */
    private _startTimer(nb: Notebook) {
      const state = this._notebookExecutionProgress.get(nb);
      if (!state) {
        return;
      }
      if (state.scheduledCell.size > 0) {
        if (state.executionStatus !== 'busy') {
          state.executionStatus = 'busy';
          clearTimeout(state.timeout);
          this.stateChanged.emit(void 0);
          state.interval = window.setInterval(() => {
            this._tick(state);
          }, 1000);
        }
      } else {
        this._resetTime(state);
      }
    }

    /**
     * The function is called on kernel's `execute_request` message or Comm message, it is
     * used to keep track number of scheduled cell or Comm execution message
     * and the status of kernel.
     *
     * @param  nb - The notebook which contains the scheduled code.
     * cell
     * @param  msg_id - The id of message.
     */
    private _cellScheduledCallback(nb: Notebook, msg_id: string): void {
      const state = this._notebookExecutionProgress.get(nb);

      if (state && !state.scheduledCell.has(msg_id)) {
        if (state.needReset) {
          this._resetTime(state);
        }
        state.scheduledCell.add(msg_id);
        state.scheduledCellNumber += 1;
      }
    }

    /**
     * Increment the executed time of input execution state
     * and emit `stateChanged` signal to re-render the indicator.
     *
     * @param  data - the state to be updated.
     */
    private _tick(data: IExecutionState): void {
      data.totalTime += 1;
      this.stateChanged.emit(void 0);
    }

    /**
     * Reset the input execution state.
     *
     * @param  data - the state to be rested.
     */
    private _resetTime(data: IExecutionState): void {
      data.totalTime = 0;
      data.scheduledCellNumber = 0;
      data.executionStatus = 'idle';
      data.scheduledCell = new Set<string>();
      clearTimeout(data.timeout);
      clearInterval(data.interval);
      data.needReset = false;
    }

    get renderFlag(): boolean {
      return this._renderFlag;
    }

    updateRenderOption(options: {
      showOnToolBar: boolean;
      showProgress: boolean;
    }): void {
      if (this.displayOption.showOnToolBar) {
        if (!options.showOnToolBar) {
          this._renderFlag = false;
        } else {
          this._renderFlag = true;
        }
      }
      this.displayOption.showProgress = options.showProgress;
      this.stateChanged.emit(void 0);
    }

    /**
     * The option to show the indicator on status bar or toolbar.
     */
    private _displayOption: Private.DisplayOption;

    /**
     * Current activated notebook.
     */
    private _currentNotebook: Notebook;

    /**
     * A weak map to hold execution status of multiple notebooks.
     */
    private _notebookExecutionProgress = new WeakMap<
      Notebook,
      IExecutionState
    >();

    /**
     * A flag to show or hide the indicator.
     */
    private _renderFlag: boolean;
  }

  export function createExecutionIndicatorItem(
    panel: NotebookPanel,
    translator?: ITranslator,
    loadSettings?: Promise<ISettingRegistry.ISettings>
  ): Widget {
    const toolbarItem = new ExecutionIndicator(translator);
    toolbarItem.model.displayOption = {
      showOnToolBar: true,
      showProgress: true
    };
    toolbarItem.model.attachNotebook({
      content: panel.content,
      context: panel.sessionContext
    });

    if (loadSettings) {
      loadSettings
        .then(settings => {
          const updateSettings = (newSettings: ISettingRegistry.ISettings) => {
            toolbarItem.model.updateRenderOption(getSettingValue(newSettings));
          };
          settings.changed.connect(updateSettings);
          updateSettings(settings);
          toolbarItem.disposed.connect(() => {
            settings.changed.disconnect(updateSettings);
          });
        })
        .catch((reason: Error) => {
          console.error(reason.message);
        });
    }
    return toolbarItem;
  }

  export function getSettingValue(settings: ISettingRegistry.ISettings): {
    showOnToolBar: boolean;
    showProgress: boolean;
  } {
    let showOnToolBar = true;
    let showProgress = true;
    const configValues = settings.get('kernelStatus').composite as JSONObject;
    if (configValues) {
      showOnToolBar = !(configValues.showOnStatusBar as boolean);
      showProgress = configValues.showProgress as boolean;
    }

    return { showOnToolBar, showProgress };
  }
}

/**
 * A namespace for module-private data.
 */
namespace Private {
  export type DisplayOption = {
    /**
     * The option to show the indicator on status bar or toolbar.
     */
    showOnToolBar: boolean;

    /**
     * The option to show the execution progress inside kernel
     * status circle.
     */
    showProgress: boolean;
  };
}
