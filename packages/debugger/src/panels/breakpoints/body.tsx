// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/ui-components';
import React, { useEffect, useState } from 'react';
import { IDebugger } from '../../tokens';

/**
 * The body for a Breakpoints Panel.
 */
export class BreakpointsBody extends ReactWidget {
  /**
   * Instantiate a new Body for the Breakpoints Panel.
   *
   * @param model The model for the breakpoints.
   */
  constructor(model: IDebugger.Model.IBreakpoints) {
    super();
    this._model = model;
    this.addClass('jp-DebuggerBreakpoints-body');
  }

  /**
   * Render the BreakpointsComponent.
   */
  render(): JSX.Element {
    return <BreakpointsComponent model={this._model} />;
  }

  private _model: IDebugger.Model.IBreakpoints;
}

/**
 * A React component to display a list of breakpoints.
 *
 * @param {object} props The component props.
 * @param props.model The model for the breakpoints.
 */
const BreakpointsComponent = ({
  model
}: {
  model: IDebugger.Model.IBreakpoints;
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
 */
const BreakpointCellComponent = ({
  breakpoints,
  model
}: {
  breakpoints: IDebugger.IBreakpoint[];
  model: IDebugger.Model.IBreakpoints;
}): JSX.Element => {
  return (
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
          />
        ))}
    </>
  );
};

/**
 * A React Component to display a single breakpoint.
 *
 * @param {object} props The component props.
 * @param props.breakpoint The breakpoint.
 * @param props.model The model for the breakpoints.
 */
const BreakpointComponent = ({
  breakpoint,
  model
}: {
  breakpoint: IDebugger.IBreakpoint;
  model: IDebugger.Model.IBreakpoints;
}): JSX.Element => {
  const moveToEndFirstCharIfSlash = (breakpointSourcePath: string): string => {
    return breakpointSourcePath[0] === '/'
      ? breakpointSourcePath.slice(1) + '/'
      : breakpointSourcePath;
  };
  return (
    <div
      className={'jp-DebuggerBreakpoint'}
      onClick={(): void => model.clicked.emit(breakpoint)}
      title={breakpoint.source?.path}
    >
      <span className={'jp-DebuggerBreakpoint-marker'}>●</span>
      <span className={'jp-DebuggerBreakpoint-source jp-left-truncated'}>
        {moveToEndFirstCharIfSlash(breakpoint.source?.path ?? '')}
      </span>
      <span className={'jp-DebuggerBreakpoint-line'}>{breakpoint.line}</span>
    </div>
  );
};
