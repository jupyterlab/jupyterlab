// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/apputils';
import { ISignal } from '@phosphor/signaling';
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
    <div>
      {breakpoints.map(entry => (
        // Array.from(breakpoints.entries()).map((entry) => (
        <BreakpointCellComponent
          key={entry[0]}
          breakpoints={entry[1]}
          model={model}
        />
      ))}
    </div>
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
    <div>
      {breakpoints
        .sort((a, b) => {
          return a.line - b.line;
        })
        .map((breakpoint: IDebugger.IBreakpoint) => (
          <BreakpointComponent
            key={breakpoint.source.path + breakpoint.line}
            breakpoint={breakpoint}
            breakpointChanged={model.breakpointChanged}
          />
        ))}
    </div>
  );
};

const BreakpointComponent = ({
  breakpoint,
  breakpointChanged
}: {
  breakpoint: IDebugger.IBreakpoint;
  breakpointChanged: ISignal<Breakpoints.Model, IDebugger.IBreakpoint>;
}) => {
  const [active, setActive] = useState(breakpoint.active);
  breakpoint.active = active;

  const setBreakpointEnabled = (state: boolean) => {
    setActive(state);
  };

  useEffect(() => {
    const updateBreakpoints = (
      _: Breakpoints.Model,
      updates: IDebugger.IBreakpoint
    ) => {
      setBreakpointEnabled(updates.active);
    };

    breakpointChanged.connect(updateBreakpoints);

    return () => {
      breakpointChanged.disconnect(updateBreakpoints);
    };
  });

  return (
    <div className={`breakpoint`}>
      <input
        onChange={() => {
          setBreakpointEnabled(!active);
        }}
        type="checkbox"
        checked={active}
      />
      <span>
        {breakpoint.source.path} : {breakpoint.line}
      </span>
    </div>
  );
};
