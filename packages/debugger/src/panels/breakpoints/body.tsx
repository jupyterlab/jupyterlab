// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/ui-components';
import React, { useEffect, useState } from 'react';
import { IDebugger } from '../../tokens';
import { INotebookTracker } from '@jupyterlab/notebook';
import { ICodeCellModel } from '@jupyterlab/cells';

/**
 * The body for a Breakpoints Panel.
 */
export class BreakpointsBody extends ReactWidget {
  /**
   * Instantiate a new Body for the Breakpoints Panel.
   *
   * @param model The model for the breakpoints.
   * @param notebookTracker The notebook tracker.
   * @param config The debugger configuration.
   */
  constructor(
    model: IDebugger.Model.IBreakpoints,
    config: IDebugger.IConfig,
    notebookTracker?: INotebookTracker
  ) {
    super();
    this._model = model;
    this._notebookTracker = notebookTracker;
    this._config = config;
    this.addClass('jp-DebuggerBreakpoints-body');
  }

  render(): JSX.Element {
    return (
      <BreakpointsComponent
        model={this._model}
        notebookTracker={this._notebookTracker}
        config={this._config}
      />
    );
  }

  private _model: IDebugger.Model.IBreakpoints;
  private _config: IDebugger.IConfig;
  private _notebookTracker: INotebookTracker | undefined;
}

/**
 * A React component to display a list of breakpoints.
 *
 * @param {object} props The component props.
 * @param props.model The model for the breakpoints.
 * @param props.notebookTracker The notebook tracker.
 * @param props.config The debugger configuration.
 * @returns A JSX element.
 */
const BreakpointsComponent = ({
  model,
  notebookTracker,
  config
}: {
  model: IDebugger.Model.IBreakpoints;
  notebookTracker: INotebookTracker | undefined;
  config: IDebugger.IConfig;
}): JSX.Element => {
  const [breakpoints, setBreakpoints] = useState(
    Array.from(model.breakpoints.entries())
  );

  useEffect(() => {
    const updateBreakpoints = (
      _: IDebugger.Model.IBreakpoints,
      updates: IDebugger.IBreakpoint[]
    ): void => {
      setBreakpoints(Array.from(model.breakpoints.entries()));
    };

    const restoreBreakpoints = (_: IDebugger.Model.IBreakpoints): void => {
      setBreakpoints(Array.from(model.breakpoints.entries()));
    };

    model.changed.connect(updateBreakpoints);
    model.restored.connect(restoreBreakpoints);

    return (): void => {
      model.changed.disconnect(updateBreakpoints);
      model.restored.disconnect(restoreBreakpoints);
    };
  });

  return (
    <>
      {breakpoints.map(entry => (
        <BreakpointCellComponent
          key={entry[0]}
          breakpoints={entry[1]}
          model={model}
          notebookTracker={notebookTracker}
          config={config}
        />
      ))}
    </>
  );
};

/**
 * A React Component to display breakpoints grouped by source file.
 *
 * @param {object} props The component props.
 * @param props.breakpoints The list of breakpoints.
 * @param props.model The model for the breakpoints.
 * @param props.notebookTracker The notebook tracker.
 * @param props.config The debugger configuration.
 * @returns A JSX element.
 */
const BreakpointCellComponent = ({
  breakpoints,
  model,
  notebookTracker,
  config
}: {
  breakpoints: IDebugger.IBreakpoint[];
  model: IDebugger.Model.IBreakpoints;
  config: IDebugger.IConfig;
  notebookTracker?: INotebookTracker | undefined;
}): JSX.Element => (
  <>
    {breakpoints
      .sort((a, b) => {
        return (a.line ?? 0) - (b.line ?? 0);
      })
      .map((breakpoint: IDebugger.IBreakpoint, index) => (
        <BreakpointComponent
          key={(breakpoint.source?.path ?? '') + index}
          breakpoint={breakpoint}
          model={model}
          notebookTracker={notebookTracker}
          config={config}
        />
      ))}
  </>
);

/**
 * A React Component to display a single breakpoint.
 *
 * @param {object} props The component props.
 * @param props.breakpoint The breakpoint.
 * @param props.model The model for the breakpoints.
 * @param props.notebookTracker The notebook tracker.
 * @param props.config The debugger configuration.
 * @returns A JSX element.
 */
const BreakpointComponent = ({
  breakpoint,
  model,
  notebookTracker,
  config
}: {
  breakpoint: IDebugger.IBreakpoint;
  model: IDebugger.Model.IBreakpoints;
  config: IDebugger.IConfig;
  notebookTracker: INotebookTracker | undefined;
}): JSX.Element => {
  const resolveExecutionCount = (): number | null => {
    let execCount: number | null = null;

    notebookTracker?.forEach(panel => {
      const kernelName = panel.sessionContext.session?.kernel?.name ?? '';
      panel.content.widgets.forEach((cell, i) => {
        const code = cell.model.sharedModel.getSource();
        const codeId = config.getCodeId(code, kernelName);
        if (codeId && codeId === breakpoint.source?.path) {
          execCount =
            cell.model.type === 'code'
              ? (cell.model as ICodeCellModel).executionCount
              : null;
        }
      });
    });

    return execCount;
  };

  const execCount = resolveExecutionCount();

  console.log(
    '[BreakpointComponent] Resolved execution count for breakpoint:',
    breakpoint,
    '->',
    execCount
  );

  return (
    <div
      className="jp-DebuggerBreakpoint"
      onClick={() => model.clicked.emit(breakpoint)}
      title={breakpoint.source?.path}
    >
      <span className="jp-DebuggerBreakpoint-marker">●</span>
      <span className="jp-DebuggerBreakpoint-source jp-left-truncated">
        {`Cell ${execCount === null ? '[*]' : `[${execCount}]`}`}
      </span>
      <span className="jp-DebuggerBreakpoint-line">{breakpoint.line}</span>
    </div>
  );
};
