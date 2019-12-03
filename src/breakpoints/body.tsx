// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/apputils';
import React, { useEffect, useState } from 'react';
import { Breakpoints } from '.';
import { IDebugger } from '../tokens';

export class Body extends ReactWidget {
  constructor(model: Breakpoints.Model) {
    super();
    this.model = model;
    this.addClass('jp-DebuggerBreakpoints-body');
  }

  render() {
    return <BreakpointsComponent model={this.model} />;
  }

  readonly model: Breakpoints.Model;
}

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
        .map((breakpoint: IDebugger.IBreakpoint) => (
          <BreakpointComponent
            key={breakpoint.source.path + breakpoint.line}
            breakpoint={breakpoint}
            model={model}
          />
        ))}
    </>
  );
};

const BreakpointComponent = ({
  breakpoint,
  model
}: {
  breakpoint: IDebugger.IBreakpoint;
  model: Breakpoints.Model;
}) => {
  return (
    <div
      className={`breakpoint`}
      onClick={() => model.clicked.emit(breakpoint)}
    >
      <span>
        {breakpoint.source.path} : {breakpoint.line}
      </span>
    </div>
  );
};
