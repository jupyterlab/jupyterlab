// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/apputils';

import React, { useEffect, useState } from 'react';

import { Breakpoints } from '.';

import { IDebugger } from '../tokens';

/**
 * The body for a Breakpoints Panel.
 */
export class Body extends ReactWidget {
  /**
   * Instantiate a new Body for the Breakpoints Panel.
   * @param model The model for the breakpoints.
   */
  constructor(model: Breakpoints.Model) {
    super();
    this._model = model;
    this.addClass('jp-DebuggerBreakpoints-body');
  }

  /**
   * Render the BreakpointsComponent.
   */
  render() {
    return <BreakpointsComponent model={this._model} />;
  }

  private _model: Breakpoints.Model;
}

/**
 * A React component to display a list of breakpoints.
 * @param model The model for the breakpoints.
 */
const BreakpointsComponent = ({ model }: { model: Breakpoints.Model }) => {
  const [breakpoints, setBreakpoints] = useState(
    Array.from(model.breakpoints.entries())
  );

  useEffect(() => {
    const updateBreakpoints = (
      _: Breakpoints.Model,
      updates: IDebugger.IBreakpoint[]
    ) => {
      setBreakpoints(Array.from(model.breakpoints.entries()));
    };

    const restoreBreakpoints = (_: Breakpoints.Model) => {
      setBreakpoints(Array.from(model.breakpoints.entries()));
    };

    model.changed.connect(updateBreakpoints);
    model.restored.connect(restoreBreakpoints);

    return () => {
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
 * @param breakpoints The list of breakpoints.
 * @param model The model for the breakpoints.
 */
const BreakpointCellComponent = ({
  breakpoints,
  model
}: {
  breakpoints: IDebugger.IBreakpoint[];
  model: Breakpoints.Model;
}) => {
  return (
    <>
      {breakpoints
        .sort((a, b) => {
          return a.line - b.line;
        })
        .map((breakpoint: IDebugger.IBreakpoint, index) => (
          <BreakpointComponent
            key={breakpoint.source.path + index}
            breakpoint={breakpoint}
            model={model}
          />
        ))}
    </>
  );
};

/**
 * A React Component to display a single breakpoint.
 * @param breakpoints The breakpoint.
 * @param model The model for the breakpoints.
 */
const BreakpointComponent = ({
  breakpoint,
  model
}: {
  breakpoint: IDebugger.IBreakpoint;
  model: Breakpoints.Model;
}) => {
  return (
    <div
      className={`jp-DebuggerBreakpoint`}
      onClick={() => model.clicked.emit(breakpoint)}
      title={breakpoint.source.path}
    >
      <span className={'jp-DebuggerBreakpoint-marker'}>●</span>
      <span className={'jp-DebuggerBreakpoint-source'}>
        {breakpoint.source.path}
      </span>
      <span>{breakpoint.line}</span>
    </div>
  );
};
