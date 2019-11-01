// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/apputils';
import { ArrayExt } from '@phosphor/algorithm';
import { ISignal } from '@phosphor/signaling';
import React, { useEffect, useState } from 'react';
import { Breakpoints } from '.';

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
  const [breakpoints, setBreakpoints] = useState(model.breakpoints);

  useEffect(() => {
    const updateBreakpoints = (
      _: Breakpoints.Model,
      updates: Breakpoints.IBreakpoint[]
    ) => {
      if (ArrayExt.shallowEqual(breakpoints, updates)) {
        return;
      }
      setBreakpoints(updates);
    };

    model.breakpointsChanged.connect(updateBreakpoints);

    return () => {
      model.breakpointsChanged.disconnect(updateBreakpoints);
    };
  });

  return (
    <div>
      {breakpoints
        .sort((a, b) => {
          return a.line - b.line;
        })
        .map((breakpoint: Breakpoints.IBreakpoint) => (
          <BreakpointComponent
            key={breakpoint.line}
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
  breakpoint: Breakpoints.IBreakpoint;
  breakpointChanged: ISignal<Breakpoints.Model, Breakpoints.IBreakpoint>;
}) => {
  const [active, setActive] = useState(breakpoint.active);
  breakpoint.active = active;

  const setBreakpointEnabled = (state: boolean) => {
    setActive(state);
  };

  useEffect(() => {
    const updateBreakpoints = (
      _: Breakpoints.Model,
      updates: Breakpoints.IBreakpoint
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
