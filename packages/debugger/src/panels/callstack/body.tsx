// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/ui-components';
import React, { useEffect, useState } from 'react';
import { IDebugger } from '../../tokens';
import { INotebookTracker } from '@jupyterlab/notebook';
import { ICodeCellModel } from '@jupyterlab/cells';

/**
 * The body for a Callstack Panel.
 */
export class CallstackBody extends ReactWidget {
  /**
   * Instantiate a new Body for the Callstack Panel.
   *
   * @param model The model for the callstack.
   * @param notebookTracker The notebook tracker.
   * @param config The debugger configuration.
   */
  constructor(
    model: IDebugger.Model.ICallstack,
    config: IDebugger.IConfig,
    notebookTracker?: INotebookTracker
  ) {
    super();
    this._model = model;
    this._config = config;
    this._notebookTracker = notebookTracker;
    this.addClass('jp-DebuggerCallstack-body');
  }

  /**
   * Render the FramesComponent.
   */
  render(): JSX.Element {
    return (
      <FramesComponent
        model={this._model}
        config={this._config}
        notebookTracker={this._notebookTracker}
      />
    );
  }

  private _model: IDebugger.Model.ICallstack;
  private _config: IDebugger.IConfig;
  private _notebookTracker: INotebookTracker | undefined;
}

/**
 * A React component to display a list of frames in a callstack.
 *
 * @param {object} props The component props.
 * @param props.model The model for the callstack.
 * @param props.notebookTracker The notebook tracker.
 * @param props.config The debugger configuration.
 * @returns A JSX element.
 */
const FramesComponent = ({
  model,
  config,
  notebookTracker
}: {
  model: IDebugger.Model.ICallstack;
  config: IDebugger.IConfig;
  notebookTracker: INotebookTracker | undefined;
}): JSX.Element => {
  const [frames, setFrames] = useState(model.frames);
  const [selected, setSelected] = useState(model.frame);

  const onSelected = (frame: any): void => {
    setSelected(frame);
    model.frame = frame;
  };

  useEffect(() => {
    const updateFrames = (): void => {
      setSelected(model.frame);
      setFrames(model.frames);
    };
    model.framesChanged.connect(updateFrames);

    return (): void => {
      model.framesChanged.disconnect(updateFrames);
    };
  }, [model]);

  const toExecutionDisplay = (
    frame: IDebugger.IStackFrame,
    notebookTracker?: INotebookTracker,
    config?: IDebugger.IConfig
  ): string => {
    if (!notebookTracker || !config) {
      return frame.source?.path || '';
    }

    let display = frame.source?.path || '';

    notebookTracker.forEach(panel => {
      const kernelName = panel.sessionContext.session?.kernel?.name ?? '';
      panel.content.widgets.forEach(cell => {
        if (cell.model.type !== 'code') return;

        const code = cell.model.sharedModel.getSource();
        const codeId = config.getCodeId(code, kernelName);

        if (codeId && codeId === frame.source?.path) {
          const codeCell = cell.model as ICodeCellModel;
          if (codeCell.executionState === 'running') {
            display = `Cell [*]`;
          } else if (codeCell.executionCount === null) {
            display = `Cell [ ]`;
          } else {
            display = `Cell [${codeCell.executionCount}]`;
          }
        }
      });
    });

    return display;
  };

  return (
    <ul>
      {frames.map(ele => (
        <li
          key={ele.id}
          onClick={(): void => onSelected(ele)}
          className={
            selected?.id === ele.id
              ? 'selected jp-DebuggerCallstackFrame'
              : 'jp-DebuggerCallstackFrame'
          }
        >
          <span className={'jp-DebuggerCallstackFrame-name'}>{ele.name}</span>
          <span
            className={'jp-DebuggerCallstackFrame-location'}
            title={ele.source?.path}
          >
            {toExecutionDisplay(ele, notebookTracker, config)}
          </span>
        </li>
      ))}
    </ul>
  );
};
